import { invoke } from '@tauri-apps/api/core';

export interface DailyLog {
  id: number;
  date: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ConvertResult {
  converted: string;
  engine: string;
  prompt: string;
}

export interface RagLogHit {
  id: number;
  date: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  score: number;
}

export interface RagResult {
  answer: string;
  engine: string;
  prompt: string;
  context: RagLogHit[];
}

/**
 * 현재 SQLite 데이터베이스 파일 경로를 조회합니다.
 */
export async function getDbPath(): Promise<string> {
  return await invoke<string>('get_db_path');
}

/**
 * 데이터베이스 파일을 저장할 폴더를 새로 설정하고 기존 데이터를 복사/연동합니다.
 */
export async function setDbFolder(): Promise<string> {
  return await invoke<string>('set_db_folder');
}

/**
 * 필터 조건에 부합하는 일지 목록을 최신순으로 가져옵니다.
 */
export async function getLogs(
  query?: string,
  startDate?: string,
  endDate?: string
): Promise<DailyLog[]> {
  return await invoke<DailyLog[]>('get_logs', {
    query: query || null,
    startDate: startDate || null,
    endDate: endDate || null,
  });
}

/**
 * 새 일지를 생성하고 데이터베이스에 저장합니다.
 */
export async function createLog(
  date: string,
  title: string,
  content: string
): Promise<DailyLog> {
  return await invoke<DailyLog>('create_log', {
    date,
    title,
    content,
  });
}

/**
 * 기존 일지를 수정하여 업데이트합니다.
 */
export async function updateLog(
  id: number,
  date: string,
  title: string,
  content: string
): Promise<DailyLog> {
  return await invoke<DailyLog>('update_log', {
    id,
    date,
    title,
    content,
  });
}

/**
 * 일지를 삭제합니다.
 */
export async function deleteLog(id: number): Promise<void> {
  return await invoke<void>('delete_log', { id });
}

/**
 * 작성 중인 업무 내용을 로컬 AI 엔진으로 업무일지 문체에 맞게 변환합니다.
 */
export async function convertLogContent(
  title: string,
  content: string
): Promise<ConvertResult> {
  return await invoke<ConvertResult>('convert_log_content', {
    title: title || null,
    content,
  });
}

/**
 * SQLite에서 관련 업무일지를 찾고 로컬 LLM 또는 오프라인 요약으로 답변을 생성합니다.
 */
export async function askAboutLogs(question: string): Promise<RagResult> {
  return await invoke<RagResult>('ask_about_logs', {
    question,
  });
}
