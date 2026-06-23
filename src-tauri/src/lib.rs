use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;
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

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub config_dir: PathBuf,
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
            delete_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
