use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;
use serde::{Serialize, Deserialize};
use rusqlite::{Connection, params};
use chrono::Utc;
use tauri::{Manager, State};

#[derive(Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub db_path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DailyLog {
    pub id: i64,
    pub date: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct ConvertResult {
    pub converted: String,
    pub engine: String,
    pub prompt: String,
}

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub config_dir: PathBuf,
}

fn normalize_input_lines(content: &str) -> Vec<String> {
    content
        .lines()
        .map(|line| {
            line.trim()
                .trim_start_matches(['-', '*', '•', '·'])
                .trim()
                .to_string()
        })
        .filter(|line| !line.is_empty())
        .collect()
}

fn split_sentences(content: &str) -> Vec<String> {
    let normalized = content
        .replace("\r\n", "\n")
        .replace(['.', '!', '?'], "\n");

    normalize_input_lines(&normalized)
}

fn classify_business_lines(lines: &[String]) -> (Vec<String>, Vec<String>, Vec<String>) {
    let mut completed = Vec::new();
    let mut issues = Vec::new();
    let mut next_steps = Vec::new();

    for line in lines {
        let lower = line.to_lowercase();
        if lower.contains("이슈")
            || lower.contains("문제")
            || lower.contains("오류")
            || lower.contains("불량")
            || lower.contains("장애")
            || lower.contains("지연")
            || lower.contains("리스크")
        {
            issues.push(line.clone());
        } else if lower.contains("예정")
            || lower.contains("내일")
            || lower.contains("추후")
            || lower.contains("다음")
            || lower.contains("계획")
            || lower.contains("진행 예정")
        {
            next_steps.push(line.clone());
        } else {
            completed.push(line.clone());
        }
    }

    if completed.is_empty() && !lines.is_empty() {
        completed.push(lines[0].clone());
    }

    (completed, issues, next_steps)
}

fn bulletize(lines: &[String]) -> String {
    if lines.is_empty() {
        "- 특이 사항 없음".to_string()
    } else {
        lines
            .iter()
            .map(|line| format!("- {}", line))
            .collect::<Vec<String>>()
            .join("\n")
    }
}

fn deterministic_business_convert(title: Option<&str>, content: &str) -> String {
    let mut lines = normalize_input_lines(content);
    if lines.is_empty() {
        lines = split_sentences(content);
    }

    let (completed, issues, next_steps) = classify_business_lines(&lines);
    let title_text = title
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or("업무 진행 사항");

    format!(
        "[업무일지]\n\n1. 업무 개요\n- {}\n\n2. 금일 진행 사항\n{}\n\n3. 주요 이슈 및 확인 사항\n{}\n\n4. 향후 계획\n{}\n\n5. 비고\n- 상기 내용은 금일 업무 진행 내용을 기준으로 정리하였습니다.",
        title_text,
        bulletize(&completed),
        bulletize(&issues),
        bulletize(&next_steps)
    )
}

fn find_first_existing(paths: Vec<PathBuf>) -> Option<PathBuf> {
    paths.into_iter().find(|path| path.exists())
}

fn build_convert_prompt(title: Option<&str>, content: &str) -> String {
    let title_text = title.unwrap_or("").trim();
    let title_line = if title_text.is_empty() {
        "".to_string()
    } else {
        format!("제목: {}\n", title_text)
    };

    format!(
        "아래 내용을 사내 업무일지 형식으로 정리해줘.\n\
        조건:\n\
        - 한국어로 작성\n\
        - 비즈니스 문체와 정중한 보고 형식 유지\n\
        - 핵심 업무, 이슈, 향후 계획을 구분\n\
        - 원문에 없는 사실은 추가하지 않음\n\n\
        {}원문:\n{}",
        title_line,
        content.trim()
    )
}

fn try_llama_convert(app: &tauri::AppHandle, prompt: &str) -> Result<Option<String>, String> {
    let resource_dir = match app.path().resource_dir() {
        Ok(path) => path,
        Err(_) => return Ok(None),
    };

    let llama_exe = find_first_existing(vec![
        resource_dir.join("ai").join("llama-cli.exe"),
        resource_dir.join("llama.cpp").join("llama-cli.exe"),
        resource_dir.join("llama-cli.exe"),
    ]);

    let model_path = find_first_existing(vec![
        resource_dir.join("models").join("qwen3.gguf"),
        resource_dir.join("models").join("qwen3-0.6b-instruct.gguf"),
        resource_dir.join("models").join("qwen3-1.7b-instruct.gguf"),
        resource_dir.join("models").join("gemma-3-1b.gguf"),
    ]);

    let (llama_exe, model_path) = match (llama_exe, model_path) {
        (Some(exe), Some(model)) => (exe, model),
        _ => return Ok(None),
    };

    let output = Command::new(llama_exe)
        .arg("-m")
        .arg(model_path)
        .arg("-p")
        .arg(prompt)
        .arg("-n")
        .arg("768")
        .arg("--temp")
        .arg("0.2")
        .output()
        .map_err(|e| format!("llama.cpp 실행 실패: {}", e))?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        Ok(None)
    } else {
        Ok(Some(stdout))
    }
}

fn init_db(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
fn get_db_path(state: State<'_, DbState>) -> Result<String, String> {
    let guard = state.conn.lock().unwrap();
    if let Some(_) = &*guard {
        // Read path from config.json
        let config_file = state.config_dir.join("config.json");
        if let Ok(content) = fs::read_to_string(config_file) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                return Ok(config.db_path);
            }
        }
    }
    Err("데이터베이스가 연결되어 있지 않거나 경로를 읽을 수 없습니다.".to_string())
}

#[tauri::command]
fn set_db_folder(_app: tauri::AppHandle, state: State<'_, DbState>) -> Result<String, String> {
    // Open RFD Folder selection dialog
    let dialog = rfd::FileDialog::new()
        .set_title("데이터베이스 저장 폴더 선택");
    
    if let Some(folder_path) = dialog.pick_folder() {
        let new_db_path = folder_path.join("buildai.db");
        let new_db_path_str = new_db_path.to_string_lossy().to_string();

        let mut guard = state.conn.lock().unwrap();
        
        // Find current config path
        let config_file = state.config_dir.join("config.json");
        let current_db_path_str = if let Ok(content) = fs::read_to_string(&config_file) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                config.db_path
            } else {
                "".to_string()
            }
        } else {
            "".to_string()
        };

        if current_db_path_str == new_db_path_str {
            return Ok(current_db_path_str);
        }

        // Close current connection
        *guard = None;

        // If target file doesn't exist but old db exists, copy it
        if !new_db_path.exists() && !current_db_path_str.is_empty() {
            let old_path = Path::new(&current_db_path_str);
            if old_path.exists() {
                if let Err(e) = fs::copy(old_path, &new_db_path) {
                    return Err(format!("기존 데이터베이스 파일을 복사하는 데 실패했습니다: {}", e));
                }
            }
        }

        // Open new connection
        let conn = Connection::open(&new_db_path)
            .map_err(|e| format!("새 데이터베이스 파일을 여는 데 실패했습니다: {}", e))?;
        
        // Init tables
        init_db(&conn).map_err(|e| format!("데이터베이스 스키마 생성 실패: {}", e))?;

        // Update config.json
        let new_config = AppConfig {
            db_path: new_db_path_str.clone(),
        };
        let config_json = serde_json::to_string_pretty(&new_config)
            .map_err(|e| format!("설정 인코딩 실패: {}", e))?;
        
        fs::write(&config_file, config_json)
            .map_err(|e| format!("설정 파일 쓰기 실패: {}", e))?;

        // Store connection
        *guard = Some(conn);

        Ok(new_db_path_str)
    } else {
        Err("폴더 선택이 취소되었습니다.".to_string())
    }
}

#[tauri::command]
fn get_logs(
    state: State<'_, DbState>,
    query: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>
) -> Result<Vec<DailyLog>, String> {
    let guard = state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("데이터베이스가 연결되어 있지 않습니다.")?;

    let mut sql = "SELECT id, date, title, content, created_at, updated_at FROM logs WHERE 1=1".to_string();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(q) = query {
        if !q.trim().is_empty() {
            sql.push_str(" AND (title LIKE ? OR content LIKE ?)");
            let like_query = format!("%{}%", q);
            params_vec.push(like_query.clone());
            params_vec.push(like_query);
        }
    }

    if let Some(s_date) = start_date {
        if !s_date.trim().is_empty() {
            sql.push_str(" AND date >= ?");
            params_vec.push(s_date);
        }
    }

    if let Some(e_date) = end_date {
        if !e_date.trim().is_empty() {
            sql.push_str(" AND date <= ?");
            params_vec.push(e_date);
        }
    }

    sql.push_str(" ORDER BY date DESC, created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    // Bind parameters dynamically
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        Ok(DailyLog {
            id: row.get(0)?,
            date: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut logs = Vec::new();
    for row in rows {
        logs.push(row.map_err(|e| e.to_string())?);
    }

    Ok(logs)
}

#[tauri::command]
fn create_log(
    state: State<'_, DbState>,
    date: String,
    title: String,
    content: String
) -> Result<DailyLog, String> {
    let guard = state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("데이터베이스가 연결되어 있지 않습니다.")?;

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO logs (date, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![date, title, content, now, now],
    ).map_err(|e| format!("일지 추가 실패: {}", e))?;

    let id = conn.last_insert_rowid();

    let mut stmt = conn.prepare("SELECT id, date, title, content, created_at, updated_at FROM logs WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let log = stmt.query_row(params![id], |row| {
        Ok(DailyLog {
            id: row.get(0)?,
            date: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(log)
}

#[tauri::command]
fn update_log(
    state: State<'_, DbState>,
    id: i64,
    date: String,
    title: String,
    content: String
) -> Result<DailyLog, String> {
    let guard = state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("데이터베이스가 연결되어 있지 않습니다.")?;

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE logs SET date = ?1, title = ?2, content = ?3, updated_at = ?4 WHERE id = ?5",
        params![date, title, content, now, id],
    ).map_err(|e| format!("일지 수정 실패: {}", e))?;

    let mut stmt = conn.prepare("SELECT id, date, title, content, created_at, updated_at FROM logs WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let log = stmt.query_row(params![id], |row| {
        Ok(DailyLog {
            id: row.get(0)?,
            date: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(log)
}

#[tauri::command]
fn delete_log(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let guard = state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("데이터베이스가 연결되어 있지 않습니다.")?;

    conn.execute("DELETE FROM logs WHERE id = ?1", params![id])
        .map_err(|e| format!("일지 삭제 실패: {}", e))?;

    Ok(())
}

#[tauri::command]
fn convert_log_content(
    app: tauri::AppHandle,
    title: Option<String>,
    content: String,
) -> Result<ConvertResult, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("변환할 업무 내용을 입력해 주세요.".to_string());
    }

    let prompt = build_convert_prompt(title.as_deref(), trimmed);

    match try_llama_convert(&app, &prompt)? {
        Some(converted) => Ok(ConvertResult {
            converted,
            engine: "llama.cpp".to_string(),
            prompt,
        }),
        None => Ok(ConvertResult {
            converted: deterministic_business_convert(title.as_deref(), trimmed),
            engine: "offline-rule-converter".to_string(),
            prompt,
        }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Determine local app data dir
            let app_local_data = app.path().app_local_data_dir()?;
            
            // Create config dir if not exists
            if !app_local_data.exists() {
                fs::create_dir_all(&app_local_data)?;
            }

            let config_file = app_local_data.join("config.json");
            let mut db_path = app_local_data.join("buildai.db");

            if config_file.exists() {
                if let Ok(content) = fs::read_to_string(&config_file) {
                    if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                        db_path = PathBuf::from(config.db_path);
                    }
                }
            } else {
                let initial_config = AppConfig {
                    db_path: db_path.to_string_lossy().to_string(),
                };
                if let Ok(config_json) = serde_json::to_string_pretty(&initial_config) {
                    let _ = fs::write(&config_file, config_json);
                }
            }

            // Ensure parent directory of db_path exists
            if let Some(parent) = db_path.parent() {
                if !parent.exists() {
                    let _ = fs::create_dir_all(parent);
                }
            }

            // Open SQLite connection
            let conn = Connection::open(&db_path)?;

            // Initialize DB tables
            init_db(&conn)?;

            // Manage DbState state
            app.manage(DbState {
                conn: Mutex::new(Some(conn)),
                config_dir: app_local_data,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_db_path,
            set_db_folder,
            get_logs,
            create_log,
            update_log,
            delete_log,
            convert_log_content
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
