/* ============================================
   Daily Report Application - Frontend Logic
   ============================================ */

const API_BASE_URL = '/api';
const REPORTS_API = `${API_BASE_URL}/reports`;
const OLLAMA_API = `${API_BASE_URL}/ollama`;
const RAG_API = `${API_BASE_URL}/rag`;
const UPLOAD_API = `${REPORTS_API}/upload`;

// State Management
let allReports = [];
let currentFilter = {
    date: '',
    keyword: ''
};
let selectedFiles = [];

// DOM Elements
const reportForm = document.getElementById('reportForm');
const reportDateInput = document.getElementById('reportDate');
const reportDateFilter = document.getElementById('reportDateFilter');
const keywordSearch = document.getElementById('keywordSearch');
const filterBtn = document.getElementById('filterBtn');
const resetBtn = document.getElementById('resetBtn');
const reportsList = document.getElementById('reportsList');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const ollamaStatus = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const closeBtn = document.querySelector('.close');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const reportContent = document.getElementById('reportContent');
const aiQuestionInput = document.getElementById('aiQuestion');
const askAiBtn = document.getElementById('askAiBtn');
const ragResult = document.getElementById('ragResult');
const dropZone = document.getElementById('dropZone');
const chooseFilesBtn = document.getElementById('chooseFilesBtn');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const clearUploadBtn = document.getElementById('clearUploadBtn');
const uploadPreview = document.getElementById('uploadPreview');

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    reportDateInput.value = today;

    // Event Listeners
    reportForm.addEventListener('submit', handleReportSubmit);
    filterBtn.addEventListener('click', handleFilter);
    resetBtn.addEventListener('click', handleReset);
    editForm.addEventListener('submit', handleEditSubmit);
    closeBtn.addEventListener('click', closeModal);
    convertBtn.addEventListener('click', handleConvert);
    clearBtn.addEventListener('click', () => reportContent.value = '');
    askAiBtn.addEventListener('click', handleAskAi);
    chooseFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileInput);
    uploadBtn.addEventListener('click', uploadSelectedFiles);
    clearUploadBtn.addEventListener('click', clearSelectedFiles);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Initial Load
    checkOllamaStatus();
    loadAllReports();

    // Auto-refresh every 30 seconds
    setInterval(loadAllReports, 30000);
});

// ============================================
// API Functions
// ============================================

/**
 * Check Ollama API Status
 */
async function checkOllamaStatus() {
    try {
        const response = await fetch(`${OLLAMA_API}/status`);
        const data = await response.json();

        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');

        if (data.available) {
            indicator.classList.add('connected');
            text.textContent = `✓ Ollama 연결됨 (${data.model})`;
        } else {
            indicator.classList.remove('connected');
            text.textContent = '✗ Ollama 미연결 (로컬 AI 기능 이용 불가)';
        }
    } catch (error) {
        console.error('Ollama status check failed:', error);
        const text = document.getElementById('statusText');
        text.textContent = '✗ 상태 확인 실패';
    }
}

/**
 * Load all reports from server
 */
async function loadAllReports() {
    try {
        const response = await fetch(REPORTS_API);
        const data = await response.json();
        allReports = data;
        renderReports(allReports);
    } catch (error) {
        console.error('Failed to load reports:', error);
        showMessage('리포트 로드 실패', 'error');
    }
}

/**
 * Load reports by date
 */
async function loadReportsByDate(date) {
    try {
        const response = await fetch(`${REPORTS_API}/date/${date}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load reports by date:', error);
        showMessage('날짜별 리포트 로드 실패', 'error');
        return [];
    }
}

/**
 * Search reports
 */
async function searchReports(keyword, reportDate = '') {
    try {
        let url = `${REPORTS_API}/search?keyword=${encodeURIComponent(keyword)}`;
        if (reportDate) {
            url += `&reportDate=${reportDate}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to search reports:', error);
        showMessage('검색 실패', 'error');
        return [];
    }
}

/**
 * Create new report
 */
async function createReport(title, content, reportDate) {
    try {
        const response = await fetch(REPORTS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                reportDate: reportDate
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✓ 업무 일지가 저장되었습니다!', 'success');
            reportForm.reset();
            const today = new Date().toISOString().split('T')[0];
            reportDateInput.value = today;
            loadAllReports();
            return data.data;
        } else {
            showMessage(`❌ 저장 실패: ${data.message}`, 'error');
            return null;
        }
    } catch (error) {
        console.error('Failed to create report:', error);
        showMessage('❌ 저장 중 오류가 발생했습니다', 'error');
        return null;
    }
}

/**
 * Update report
 */
async function updateReport(id, title, content) {
    try {
        const response = await fetch(`${REPORTS_API}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✓ 업무 일지가 수정되었습니다!', 'success');
            closeModal();
            loadAllReports();
            return data.data;
        } else {
            showMessage(`❌ 수정 실패: ${data.message}`, 'error');
            return null;
        }
    } catch (error) {
        console.error('Failed to update report:', error);
        showMessage('❌ 수정 중 오류가 발생했습니다', 'error');
        return null;
    }
}

/**
 * Delete report
 */
async function deleteReport(id) {
    if (!confirm('정말로 이 업무 일지를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`${REPORTS_API}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✓ 업무 일지가 삭제되었습니다!', 'success');
            loadAllReports();
        } else {
            showMessage(`❌ 삭제 실패: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Failed to delete report:', error);
        showMessage('❌ 삭제 중 오류가 발생했습니다', 'error');
    }
}

/**
 * 텍스트를 비즈니스 형식으로 정제 (AI)
 */
async function convertText(rawText) {
    try {
        const response = await fetch(`${API_BASE_URL}/convert/business-format`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: rawText
            })
        });

        const data = await response.json();

        if (data.success) {
            return data.convertedText;
        } else {
            console.error('AI conversion failed:', data.error);
            showMessage(`❌ 정제 실패: ${data.error}`, 'error');
            return null;
        }
    } catch (error) {
        console.error('Failed to convert text:', error);
        showMessage('❌ 텍스트 정제 중 오류가 발생했습니다', 'error');
        return null;
    }
}

/**
 * Handle convert button click
 */
async function handleConvert(e) {
    e.preventDefault();

    const text = reportContent.value.trim();

    if (!text) {
        showMessage('❌ 정제할 내용을 입력해주세요', 'error');
        return;
    }

    // 처리 중 표시
    convertBtn.disabled = true;
    const originalBtnText = convertBtn.innerHTML;
    convertBtn.innerHTML = '⏳ 정제 중...';

    try {
        const convertedText = await convertText(text);

        if (convertedText) {
            reportContent.value = convertedText;
            showMessage('✅ AI가 텍스트를 정제했습니다!', 'success');
        }
    } catch (error) {
        console.error('Convert error:', error);
        showMessage('❌ 정제 중 오류가 발생했습니다', 'error');
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalBtnText;
    }
}

/**
 * Ask AI using local RAG search
 */
async function askAI(question) {
    try {
        const response = await fetch(`${RAG_API}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();
        if (data.success) {
            return data.answer;
        }

        throw new Error(data.error || 'AI 질의 실패');
    } catch (error) {
        console.error('Ask AI failed:', error);
        showMessage('❌ AI 질문 처리 중 오류가 발생했습니다', 'error');
        return null;
    }
}

/**
 * Handle ask AI click
 */
async function handleAskAi(e) {
    e.preventDefault();
    const question = aiQuestionInput.value.trim();

    if (!question) {
        showMessage('❌ 질문을 입력해주세요', 'error');
        return;
    }

    askAiBtn.disabled = true;
    const originalText = askAiBtn.innerHTML;
    askAiBtn.innerHTML = '⏳ 조회 중...';
    ragResult.classList.remove('hidden');
    ragResult.textContent = 'AI가 관련 일지를 검색 중입니다...';

    try {
        const answer = await askAI(question);
        if (answer) {
            ragResult.textContent = answer;
            showMessage('✅ AI 답변이 생성되었습니다', 'success');
        } else {
            ragResult.textContent = '관련 정보가 없습니다. 다른 질문을 시도해보세요.';
        }
    } finally {
        askAiBtn.disabled = false;
        askAiBtn.innerHTML = originalText;
    }
}

/**
 * Add files to selection
 */
function addFiles(files) {
    const fileArray = Array.from(files).filter(file => file.type === 'text/plain' || file.name.endsWith('.txt'));
    selectedFiles = selectedFiles.concat(fileArray);
    updateUploadPreview();
}

/**
 * Handle file input change
 */
function handleFileInput(event) {
    addFiles(event.target.files);
    fileInput.value = '';
}

/**
 * Upload selected files to backend
 */
async function uploadSelectedFiles() {
    if (!selectedFiles.length) {
        showMessage('❌ 업로드할 파일을 선택해주세요', 'error');
        return;
    }

    uploadBtn.disabled = true;
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '⏳ 업로드 중...';

    const formData = new FormData();
    selectedFiles.forEach((file, idx) => formData.append('files', file));

    try {
        const response = await fetch(UPLOAD_API, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showMessage(`✅ ${data.processedCount}개 파일 업로드 완료`, 'success');
            clearSelectedFiles();
            loadAllReports();
        } else {
            showMessage(`❌ 업로드 실패: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showMessage('❌ 파일 업로드 중 오류가 발생했습니다', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
}

/**
 * Clear selected files
 */
function clearSelectedFiles() {
    selectedFiles = [];
    updateUploadPreview();
}

/**
 * Update upload preview UI
 */
function updateUploadPreview() {
    uploadPreview.innerHTML = '';
    if (!selectedFiles.length) {
        uploadPreview.innerHTML = '<p class="loading-message">선택된 파일이 없습니다.</p>';
        return;
    }

    selectedFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item';
        item.innerHTML = `<span>${escapeHtml(file.name)} (${Math.round(file.size / 1024)}KB)</span>`;
        uploadPreview.appendChild(item);
    });
}

/**
 * Handle drag over event
 */
function handleDragOver(event) {
    event.preventDefault();
    dropZone.classList.add('dragover');
}

/**
 * Handle drag leave event
 */
function handleDragLeave() {
    dropZone.classList.remove('dragover');
}

/**
 * Handle file drop event
 */
function handleDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    addFiles(files);
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle form submission
 */
function handleReportSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('reportTitle').value.trim();
    const content = document.getElementById('reportContent').value.trim();
    const reportDate = document.getElementById('reportDate').value;

    if (!title) {
        showMessage('❌ 제목을 입력해주세요', 'error');
        return;
    }

    createReport(title, content, reportDate);
}

/**
 * Handle filter button click
 */
async function handleFilter() {
    const date = reportDateFilter.value;
    const keyword = keywordSearch.value.trim();

    currentFilter = { date, keyword };

    if (!date && !keyword) {
        loadAllReports();
        return;
    }

    try {
        let results = [];

        if (date && keyword) {
            results = await searchReports(keyword, date);
        } else if (date) {
            results = await loadReportsByDate(date);
        } else if (keyword) {
            results = await searchReports(keyword);
        }

        renderReports(results);

        if (results.length === 0) {
            showMessage('📭 검색 결과가 없습니다', 'info');
        }
    } catch (error) {
        console.error('Filter error:', error);
        showMessage('❌ 필터링 중 오류가 발생했습니다', 'error');
    }
}

/**
 * Handle reset button click
 */
function handleReset() {
    reportDateFilter.value = '';
    keywordSearch.value = '';
    currentFilter = { date: '', keyword: '' };
    loadAllReports();
    showMessage('🔄 필터가 초기화되었습니다', 'info');
}

/**
 * Handle edit form submission
 */
function handleEditSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editReportId').value;
    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();

    if (!title) {
        showMessage('❌ 제목을 입력해주세요', 'error');
        return;
    }

    updateReport(id, title, content);
}

// ============================================
// UI Functions
// ============================================

/**
 * Render reports list
 */
function renderReports(reports) {
    reportsList.innerHTML = '';

    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<p class="loading-message">📭 업무 일지가 없습니다</p>';
        return;
    }

    reports.forEach(report => {
        const card = createReportCard(report);
        reportsList.appendChild(card);
    });
}

/**
 * Create report card element
 */
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const formattedDate = formatDate(report.createdAt);
    const contentPreview = report.content ? report.content.substring(0, 150) : '(내용 없음)';
    const aiStatus = report.aiProcessed ? 
        '<span class="ai-status processed">✓ AI 처리됨</span>' : 
        '<span class="ai-status pending">⏳ 미처리</span>';

    card.innerHTML = `
        <div class="report-header">
            <h3 class="report-title">${escapeHtml(report.title)}</h3>
            <span class="report-date">${report.reportDate}</span>
        </div>
        <div class="report-content">${escapeHtml(contentPreview)}${report.content && report.content.length > 150 ? '...' : ''}</div>
        <div class="report-meta">
            <div>
                <span class="creation-time">📅 ${formattedDate}</span>
                ${aiStatus}
            </div>
            <div class="report-actions">
                <button class="btn btn-primary btn-sm" onclick="openEditModal(${report.id}, '${escapeHtml(report.title)}', '${escapeHtml(report.content || '')}')">✏️ 수정</button>
                <button class="btn btn-danger btn-sm" onclick="deleteReport(${report.id})">🗑️ 삭제</button>
            </div>
        </div>
    `;

    return card;
}

/**
 * Open edit modal
 */
function openEditModal(id, title, content) {
    document.getElementById('editReportId').value = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editContent').value = content;
    editModal.classList.add('active');
}

/**
 * Close modal
 */
function closeModal() {
    editModal.classList.remove('active');
    editForm.reset();
}

/**
 * Show message notification
 */
function showMessage(message, type = 'info') {
    // Create a simple alert-style notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        z-index: 9999;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Format date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Intl.DateTimeFormat('ko-KR', options).format(date);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Close modal when clicking outside
// ============================================
window.addEventListener('click', function(event) {
    if (event.target === editModal) {
        closeModal();
    }
});

// Add animation styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// Auto-check Ollama status periodically
// ============================================
setInterval(checkOllamaStatus, 10000);
