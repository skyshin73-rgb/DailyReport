import { useState, useEffect } from 'react';
import {
  getDbPath,
  setDbFolder,
  getLogs,
  createLog,
  updateLog,
  deleteLog,
  DailyLog
} from './services/ipc';
import './App.css';

function App() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dbPath, setDbPath] = useState('');
  
  // Editor state
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editorDate, setEditorDate] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const path = await getDbPath();
        setDbPath(path);
        const initialLogs = await getLogs();
        setLogs(initialLogs);
        
        // Auto-select first log if exists
        if (initialLogs.length > 0) {
          selectLogItem(initialLogs[0]);
        } else {
          startNewLog();
        }
      } catch (err: any) {
        setErrorMsg('초기화 중 오류가 발생했습니다: ' + err.toString());
      }
    }
    init();
  }, []);

  // Filter logs when search terms change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 150); // Small debounce

    return () => clearTimeout(timer);
  }, [searchQuery, startDate, endDate]);

  const loadLogs = async () => {
    try {
      const filtered = await getLogs(searchQuery, startDate, endDate);
      setLogs(filtered);
    } catch (err: any) {
      showError('일지 목록을 가져오는 데 실패했습니다: ' + err.toString());
    }
  };

  const selectLogItem = (log: DailyLog) => {
    setSelectedLog(log);
    setIsCreating(false);
    setEditorDate(log.date);
    setEditorTitle(log.title);
    setEditorContent(log.content);
    setErrorMsg('');
  };

  const startNewLog = () => {
    setSelectedLog(null);
    setIsCreating(true);
    setEditorDate(getTodayString());
    setEditorTitle('');
    setEditorContent('');
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorDate) {
      showError('날짜를 입력해 주세요.');
      return;
    }
    if (!editorTitle.trim()) {
      showError('제목을 입력해 주세요.');
      return;
    }
    if (!editorContent.trim()) {
      showError('내용을 입력해 주세요.');
      return;
    }

    try {
      if (isCreating) {
        const newLog = await createLog(editorDate, editorTitle, editorContent);
        showSuccess('성공적으로 저장되었습니다.');
        setLogs(prev => [newLog, ...prev]);
        setSelectedLog(newLog);
        setIsCreating(false);
      } else if (selectedLog) {
        const updated = await updateLog(selectedLog.id, editorDate, editorTitle, editorContent);
        showSuccess('성공적으로 수정되었습니다.');
        setLogs(prev => prev.map(log => log.id === updated.id ? updated : log));
        setSelectedLog(updated);
      }
    } catch (err: any) {
      showError('저장 실패: ' + err.toString());
    }
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    if (!window.confirm('정말로 이 일지를 삭제하시겠습니까?')) return;

    try {
      await deleteLog(selectedLog.id);
      showSuccess('성공적으로 삭제되었습니다.');
      const updatedLogs = logs.filter(log => log.id !== selectedLog.id);
      setLogs(updatedLogs);
      
      if (updatedLogs.length > 0) {
        selectLogItem(updatedLogs[0]);
      } else {
        startNewLog();
      }
    } catch (err: any) {
      showError('삭제 실패: ' + err.toString());
    }
  };

  const handleDbFolderChange = async () => {
    try {
      const newPath = await setDbFolder();
      setDbPath(newPath);
      showSuccess('데이터베이스 저장 폴더가 성공적으로 변경되었습니다.');
      const reloadedLogs = await getLogs(searchQuery, startDate, endDate);
      setLogs(reloadedLogs);
      if (reloadedLogs.length > 0) {
        selectLogItem(reloadedLogs[0]);
      } else {
        startNewLog();
      }
    } catch (err: any) {
      if (err !== '폴더 선택이 취소되었습니다.') {
        showError('폴더 변경 실패: ' + err.toString());
      }
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Helper to format ISO strings to localized read format
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation / Search Header */}
      <header className="app-header">
        <div className="brand">
          <span className="logo-icon">📝</span>
          <h1>BuildAI</h1>
          <span className="badge">1단계</span>
        </div>
        
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          <div className="date-filters">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-picker"
              title="시작일"
            />
            <span className="date-separator">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-picker"
              title="종료일"
            />
            {(startDate || endDate) && (
              <button
                className="reset-date-btn"
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="main-content">
        
        {/* Left Sidebar: Timeline & List */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>업무 일지 타임라인</h2>
            <button className="new-log-btn" onClick={startNewLog}>
              <span>+</span> 새 일지 작성
            </button>
          </div>

          <div className="timeline-container">
            {logs.length === 0 ? (
              <div className="empty-state">
                <p>일지가 없습니다.</p>
                <p className="subtext">새로운 일지를 작성해 보세요.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {logs.map((log) => {
                  const isSelected = selectedLog?.id === log.id && !isCreating;
                  return (
                    <div
                      key={log.id}
                      className={`timeline-item ${isSelected ? 'active' : ''}`}
                      onClick={() => selectLogItem(log)}
                    >
                      <div className="item-meta">
                        <span className="item-date">{log.date}</span>
                        <span className="item-time">{formatTime(log.created_at)}</span>
                      </div>
                      <div className="item-title">{log.title}</div>
                      <div className="item-preview">{log.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Settings Area */}
          <div className="sidebar-footer">
            <div className="db-info">
              <span className="info-label">DB 위치:</span>
              <span className="info-path" title={dbPath}>{dbPath || '불러오는 중...'}</span>
            </div>
            <button className="change-db-btn" onClick={handleDbFolderChange}>
              저장 폴더 변경
            </button>
          </div>
        </aside>

        {/* Right Pane: Detail View & Editor */}
        <main className="editor-pane">
          <form onSubmit={handleSave} className="editor-form">
            <div className="editor-header">
              <div className="editor-title-row">
                <input
                  type="date"
                  value={editorDate}
                  onChange={(e) => setEditorDate(e.target.value)}
                  className="editor-date-input"
                  required
                />
                <input
                  type="text"
                  placeholder="제목을 입력하세요..."
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="editor-title-input"
                  required
                />
              </div>
              <div className="editor-actions">
                {!isCreating && selectedLog && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={handleDelete}
                  >
                    삭제
                  </button>
                )}
                <button type="submit" className="save-btn">
                  저장
                </button>
              </div>
            </div>

            {/* Notifications */}
            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <div className="editor-body">
              <textarea
                placeholder="오늘 진행한 업무 내용을 상세히 입력하세요..."
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="editor-textarea"
                required
              />
            </div>

            <div className="editor-meta-footer">
              {!isCreating && selectedLog && (
                <>
                  <span>최초 생성: {new Date(selectedLog.created_at).toLocaleString()}</span>
                  <span className="separator">•</span>
                  <span>최종 수정: {new Date(selectedLog.updated_at).toLocaleString()}</span>
                </>
              )}
              {isCreating && (
                <span>새로운 업무 일지를 작성 중입니다.</span>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default App;
