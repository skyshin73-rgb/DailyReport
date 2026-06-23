import { useState, useEffect, useRef } from 'react';
import {
  getDbPath,
  setDbFolder,
  getLogs,
  createLog,
  updateLog,
  deleteLog,
  convertLogContent,
  askAboutLogs,
  DailyLog
} from './services/ipc';
import { buildImportEntry, ImportEntry } from './services/importer';
import type { RagLogHit } from './services/ipc';
import './App.css';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
  engine?: string;
  context?: RagLogHit[];
}

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
  const [isConverting, setIsConverting] = useState(false);
  const [convertEngine, setConvertEngine] = useState('');
  const [isRagPanelOpen, setIsRagPanelOpen] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '업무일지에서 필요한 내용을 찾아드릴게요. 질문을 입력하면 관련 일지를 모아 답변합니다.',
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const [importEntries, setImportEntries] = useState<ImportEntry[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingImports, setIsSavingImports] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
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

  const queueImportFiles = async (files: File[]) => {
    if (files.length === 0) {
      showError('가져올 파일이 없습니다.');
      return;
    }

    setIsImporting(true);
    try {
      const parsed = await Promise.all(
        files.map(async (file) => {
          const content = await file.text();
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
          return buildImportEntry(file.name, content, relativePath);
        })
      );

      setImportEntries((prev) => [...parsed, ...prev]);
      showSuccess(`${parsed.length}개 파일을 불러왔습니다. 날짜가 없는 항목은 아래에서 확인해 주세요.`);
    } catch (err: any) {
      showError('파일 읽기에 실패했습니다: ' + err.toString());
    } finally {
      setIsImporting(false);
    }
  };

  const handleFilePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await queueImportFiles(files);
  };

  const handleFolderPickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await queueImportFiles(files);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openFolderPicker = () => {
    folderInputRef.current?.click();
  };

  const updateImportEntry = (id: string, patch: Partial<ImportEntry>) => {
    setImportEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, errorMessage: '' } : item))
    );
  };

  const removeImportEntry = (id: string) => {
    setImportEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const persistImportEntry = async (entry: ImportEntry) => {
    const created = await createLog(entry.date, entry.title.trim() || '과거 일지', entry.content);
    setLogs((prev) => [created, ...prev]);
    setSelectedLog(created);
    setIsCreating(false);
    return created;
  };

  const saveImportEntry = async (entry: ImportEntry) => {
    if (!entry.date) {
      updateImportEntry(entry.id, {
        errorMessage: '날짜를 먼저 확인해 주세요.',
      });
      return;
    }

    updateImportEntry(entry.id, { saving: true, errorMessage: '' });
    try {
      await persistImportEntry(entry);
      removeImportEntry(entry.id);
      showSuccess(`"${entry.fileName}" 저장 완료`);
    } catch (err: any) {
      updateImportEntry(entry.id, {
        errorMessage: '저장 실패: ' + err.toString(),
        saving: false,
      });
      showError('일지 저장 실패: ' + err.toString());
    }
  };

  const saveAllReadyImports = async () => {
    const readyEntries = importEntries.filter((entry) => entry.date && !entry.saving && !entry.saved);
    if (readyEntries.length === 0) {
      showError('저장할 항목이 없습니다. 날짜가 비어 있는 파일은 아래에서 확인해 주세요.');
      return;
    }

    setIsSavingImports(true);
    try {
      for (const entry of readyEntries) {
        await saveImportEntry(entry);
      }
    } finally {
      setIsSavingImports(false);
    }
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

  const sampleQuestions = [
    '지난달 A프로젝트 이슈 뭐 있었어?',
    '6월에 고객 불량 대응한 내용 알려줘',
    '이번 주에 마무리한 업무를 요약해줘',
  ];

  const askQuestion = async (questionText?: string) => {
    const question = (questionText ?? aiQuestion).trim();
    if (!question) {
      showError('질문을 입력해 주세요.');
      return;
    }

    setIsAsking(true);
    setAiQuestion('');
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    try {
      const result = await askAboutLogs(question);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          engine: result.engine,
          context: result.context,
        },
      ]);
      showSuccess(
        result.engine === 'llama.cpp'
          ? '로컬 LLM으로 답변을 생성했습니다.'
          : '관련 일지를 기반으로 오프라인 RAG 요약을 생성했습니다.'
      );
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '질문을 처리하지 못했습니다. 다시 시도해 주세요.',
        },
      ]);
      showError('질문 처리 실패: ' + err.toString());
    } finally {
      setIsAsking(false);
    }
  };

  const handleConvert = async () => {
    if (!editorContent.trim()) {
      showError('AI Convert를 실행할 내용을 입력해 주세요.');
      return;
    }

    setIsConverting(true);
    setConvertEngine('');
    try {
      const result = await convertLogContent(editorTitle, editorContent);
      setEditorContent(result.converted);
      setConvertEngine(result.engine);
      showSuccess(
        result.engine === 'llama.cpp'
          ? '로컬 LLM으로 업무일지 문체를 정리했습니다.'
          : '번들된 LLM 모델이 없어 오프라인 정리 엔진으로 업무일지 문체를 정리했습니다.'
      );
    } catch (err: any) {
      showError('AI Convert 실패: ' + err.toString());
    } finally {
      setIsConverting(false);
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

  const sortedImportEntries = [...importEntries].sort((a, b) => {
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return b.fileName.localeCompare(a.fileName, 'ko');
  });
  const readyImportCount = importEntries.filter((entry) => entry.date && !entry.saving).length;
  const missingDateCount = importEntries.filter((entry) => !entry.date).length;

  return (
    <div className="app-container">
      {/* Top Navigation / Search Header */}
      <header className="app-header">
        <div className="brand">
          <span className="logo-icon">📝</span>
          <h1>BuildAI</h1>
          <span className="badge">4단계</span>
        </div>
        
        <div className="filter-bar">
          <button
            type="button"
            className="rag-toggle-btn"
            onClick={() => setIsRagPanelOpen((prev) => !prev)}
            title="업무일지에서 AI에게 질문"
          >
            {isRagPanelOpen ? 'AI 패널 닫기' : 'AI에게 물어보기'}
          </button>
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
          {isRagPanelOpen && (
            <section className="rag-panel">
              <div className="rag-header">
                <div>
                  <h2>AI에게 물어보기</h2>
                  <p>SQLite 업무일지에서 관련 내용을 찾아 로컬 LLM으로 답합니다.</p>
                </div>
                <div className="rag-actions">
                  <button type="button" className="rag-sample-btn" onClick={() => askQuestion(sampleQuestions[0])}>
                    예시 1
                  </button>
                  <button type="button" className="rag-sample-btn" onClick={() => askQuestion(sampleQuestions[1])}>
                    예시 2
                  </button>
                  <button type="button" className="rag-sample-btn" onClick={() => askQuestion(sampleQuestions[2])}>
                    예시 3
                  </button>
                </div>
              </div>

              <div className="rag-thread">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rag-message ${message.role}`}>
                    <div className="rag-message-label">
                      {message.role === 'user' ? '질문' : message.engine ? `답변 · ${message.engine}` : '답변'}
                    </div>
                    <div className="rag-message-body">{message.content}</div>
                    {message.context && message.context.length > 0 && (
                      <div className="rag-context-list">
                        {message.context.slice(0, 4).map((hit) => (
                          <div key={hit.id} className="rag-context-item">
                            <span className="rag-context-date">{hit.date}</span>
                            <span className="rag-context-title">{hit.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rag-compose">
                <textarea
                  className="rag-input"
                  placeholder="예: 지난달 A프로젝트 이슈 뭐 있었어?"
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      askQuestion();
                    }
                  }}
                />
                <button type="button" className="rag-send-btn" onClick={() => askQuestion()} disabled={isAsking}>
                  {isAsking ? '검색 중...' : '질문'}
                </button>
              </div>
            </section>
          )}

          <section
            className={`import-panel ${dragActive ? 'active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={async (event) => {
              event.preventDefault();
              setDragActive(false);
              await queueImportFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <div className="import-header">
              <div>
                <h2>과거 일지 업로드</h2>
                <p>txt 파일을 끌어 놓거나 폴더를 선택하면 날짜를 추출해서 저장 대기열에 넣습니다.</p>
              </div>
              <div className="import-actions">
                <button type="button" className="import-btn" onClick={openFilePicker} disabled={isImporting}>
                  {isImporting ? '불러오는 중...' : '파일 선택'}
                </button>
                <button type="button" className="import-btn" onClick={openFolderPicker} disabled={isImporting}>
                  폴더 선택
                </button>
                <button
                  type="button"
                  className="import-primary-btn"
                  onClick={saveAllReadyImports}
                  disabled={isSavingImports || readyImportCount === 0}
                >
                  {isSavingImports ? '저장 중...' : `자동 저장 ${readyImportCount}`}
                </button>
              </div>
            </div>

            <div className={`drop-zone ${dragActive ? 'active' : ''}`}>
              <span>여기에 txt 파일을 드래그 앤 드롭하세요</span>
              <span className="drop-zone-subtext">파일명 또는 본문에서 날짜를 자동 추출합니다</span>
            </div>

            <div className="import-summary">
              <span>대기 {importEntries.length}</span>
              <span>날짜 확인 필요 {missingDateCount}</span>
              <span>자동 저장 가능 {readyImportCount}</span>
            </div>

            {importEntries.length > 0 && (
              <div className="import-list">
                {sortedImportEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`import-row ${entry.saving ? 'saving' : ''} ${entry.errorMessage ? 'error' : ''}`}
                  >
                    <div className="import-row-head">
                      <div className="import-file-info">
                        <div className="import-file-name">{entry.fileName}</div>
                        <div className="import-file-path">{entry.relativePath}</div>
                      </div>
                      <div className={`import-date-pill ${entry.date ? 'ready' : 'missing'}`}>
                        {entry.date || '날짜 확인 필요'}
                      </div>
                    </div>

                    <div className="import-row-body">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(event) => updateImportEntry(entry.id, { date: event.target.value })}
                        className="import-date-input"
                      />
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(event) => updateImportEntry(entry.id, { title: event.target.value })}
                        className="import-title-input"
                        placeholder="제목"
                      />
                    </div>

                    <div className="import-snippet">{entry.snippet}</div>

                    {entry.errorMessage && <div className="import-error">{entry.errorMessage}</div>}

                    <div className="import-row-actions">
                      <button
                        type="button"
                        className="import-ghost-btn"
                        onClick={() => saveImportEntry(entry)}
                        disabled={entry.saving}
                      >
                        {entry.saving ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        className="import-ghost-btn"
                        onClick={() => removeImportEntry(entry.id)}
                        disabled={entry.saving}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,text/plain"
              className="hidden-file-input"
              onChange={handleFilePickerChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept=".txt,text/plain"
              className="hidden-file-input"
              onChange={handleFolderPickerChange}
            />
          </section>

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
                <button
                  type="button"
                  className="convert-btn"
                  onClick={handleConvert}
                  disabled={isConverting}
                  title="작성 내용을 사내 업무일지 형식으로 정리"
                >
                  {isConverting ? '변환 중...' : 'AI Convert'}
                </button>
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
              {convertEngine && (
                <>
                  <span>AI Convert 엔진: {convertEngine}</span>
                  <span className="separator">•</span>
                </>
              )}
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
