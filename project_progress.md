# BuildAI 프로젝트 진행 상황 기록

이 파일은 **BuildAI** (Daily 업무 일지 관리 비서 - 'Build-Day' + 'AI') 개발 프로젝트의 진행 현황과 설계 규칙을 추적하기 위한 문서입니다.
작업 세션이 초기화되거나 다른 에이전트/AI가 프로젝트를 보더라도 바로 이어서 작업할 수 있도록 매 단계마다 파일 단위로 상세하게 업데이트합니다.

## 세션 이어받기 규칙
1. 모든 작업 이력, 진행률, 완료/미완료 항목은 이 파일에 한국어로 기록한다.
2. 수정이 발생할 때마다 파일 단위로 즉시 갱신한다.
3. 다음 에이전트는 이 파일과 프로젝트 트리만 읽어도 현재 단계와 다음 작업을 이어갈 수 있어야 한다.
4. 사용자는 최소 조작만 수행하고, 파일 생성/수정/빌드/패키징은 에이전트가 주도한다.

---

## 📌 기본 규칙 및 에이전트 작업 원칙
1. **에이전트 단독 수행**: 사용자는 코드를 직접 수정하지 않으며 복사-붙여넣기 수준의 최소 조작만 수행합니다. 에이전트가 파일 생성, 수정, 삭제, 빌드, 패키징 명령을 스스로 판단하고 실행합니다.
2. **진행 상황 실시간 기록**: 수정 사항이 생길 때마다 이 `project_progress.md` 파일에 작업 이력, 진행률, 완료 목록, 미진한 사항 등을 기록합니다.
3. **단계별 출력 준수**: 매 단계마다 생성된 파일 목록, 프로젝트 트리, 주요 코드 설명, 실행/빌드 방법을 명시합니다.
4. **실행 가능한 구현**: 플레이스홀더(placeholder) 코드를 지양하고, 실제 실행 가능한 수준으로 구체적인 소스 코드를 전체 작성합니다.
5. **완전 오프라인 독립 실행**: 최종 결과물은 인터넷 연결이 전혀 없고 추가 설치 파일이 필요 없는 단일 `.exe` 실행 파일이어야 합니다.

---

## 🛠️ 기술 스택 및 배포 조건
* **Frontend**: React + TypeScript + Vite
* **Desktop Framework**: Tauri v2
* **Database**: SQLite (로컬에 파일로 자동 생성, `rusqlite` bundled 사용)
* **Local AI Engine**: llama.cpp (임베디드 런타임 형태로 최종 패키징 포함)
* **Local LLM Model**: GGUF 형식 모델 (Qwen 2.5/3- Instruct 또는 Gemma 2/3 등 경량 GGUF)
* **사용 금지 기술**: Java, Spring, Maven, Gradle, Ollama 의존성, Python 런타임 의존성
* **최종 배포 파일**: 추가 런타임 설치나 네트워크 다운로드 없이 더블클릭만으로 실행되는 Windows용 `.exe` 파일

---

## 📈 진행률 및 상태 요약

* **현재 단계**: 2단계 구현 완료
* **전체 진행률**: 50%
* **완료된 작업**:
  * [x] Tauri v2 + React + TypeScript 프로젝트 스캐폴딩 및 `main.rs` 빌드 에러 해결
  * [x] npm 의존성 설치 및 빌드 환경(Cargo & Rust 환경) 검증 완료
  * [x] 프로젝트 초기 폴더 구조 정의 및 생성 완료
  * [x] **SQLite DB 자동 생성 및 로컬 경로 관리 설계**: `AppData/Local/BuildAI/config.json`을 통해 설정된 `buildai.db` 경로를 동적으로 로드 및 최초 생성 자동화
  * [x] **기본 업무 일지 CRUD 기능 및 타임라인 UI 구현**: Rust backend에서 SQLite 연동을 담당하는 Tauri command(`get_logs`, `create_log`, `update_log`, `delete_log`, `get_db_path`, `set_db_folder`) 완성
  * [x] **UI & UX 퍼블리싱**: Glassmorphism 다크 모드, 실시간 검색, 날짜 범위 필터링, 저장 폴더 변경 기능, 반응형 타임라인 레이아웃 구현
  * [x] **AI Convert 기능 구현**: 작성 중인 내용을 사내 업무일지 문체로 정리하는 `convert_log_content` 커맨드 추가
  * [x] **llama.cpp 연동 우선 구조 구현**: 번들된 `llama-cli.exe`와 GGUF 모델이 있으면 실제 로컬 LLM 호출, 없으면 네트워크 없이 규칙 기반 오프라인 변환으로 자동 대체
  * [x] **프론트엔드 Convert UI 추가**: `AI Convert` 버튼, 변환 중 상태, 변환 엔진 표시, 오류 안내 연결
  * [x] **검증 완료**: `npm run build`, `cargo check` 통과
* **미진한 사항 / 진행 예정**:
  * [ ] 대량 과거 일지 파일 드래그앤드롭 업로드 기능 (3단계)
  * [ ] SQLite 데이터 기반 로컬 RAG 검색 기능 구현 (4단계)
  * [ ] llama.cpp / SQLite / GGUF 모델 패키징 및 최종 exe 빌드 (5단계)

---

## 📂 프로젝트 구조 (Project Tree)

```text
BuildAI/
├── .vscode/               # VS Code 설정
├── assets/                # 리소스 폴더
│   └── models/            # GGUF AI 모델 파일 위치 (예: qwen3.gguf)
├── docs/                  # 관련 문서
├── release/               # 빌드 릴리즈 출력 폴더
├── src/                   # React Frontend 소스 코드
│   ├── assets/            # 프론트엔드 정적 파일
│   ├── components/        # React 공통 컴포넌트
│   ├── database/          # SQLite 및 DB 관련 프론트엔드 연동부/IPC 서비스
│   ├── ai/                # 로컬 AI 연동 래퍼 서비스
│   ├── pages/             # 메인 화면 구성 및 레이아웃
│   ├── services/          # 비즈니스 로직 및 API 대행 서비스 (ipc.ts 추가)
│   ├── App.css            # 글로벌 스타일링 (다크 테마 디자인 시스템 완성)
│   ├── App.tsx            # 메인 앱 엔트리 컴포넌트 (타임라인, 일지 작성 폼 완성)
│   ├── main.tsx           # React 엔트리 포인트
│   └── vite-env.d.ts
├── src-tauri/             # Tauri Backend (Rust) 소스 코드
│   ├── src/
│   │   ├── main.rs        # Tauri 앱 시작점 및 커맨드 등록
│   │   └── lib.rs         # SQLite 연동, 마이그레이션, DB 폴더 변경 기능 구현
│   ├── Cargo.toml         # Rust 종속성 설정 (rusqlite, chrono, rfd 추가)
│   ├── tauri.conf.json    # Tauri 애플리케이션 설정
│   └── capabilities/      # 보안 및 권한 설정
├── package.json           # npm 종속성 설정
├── tsconfig.json          # TypeScript 설정
└── project_progress.md    # [현재 파일] 프로젝트 진행 상황 기록
```

---

## 🚀 실행 및 빌드 방법 (개발환경)

### 1. 개발 서버 실행
로컬 개발 환경에서 Frontend Dev Server와 Tauri 구동을 동시 실행합니다:
```bash
npm run tauri dev
```

### 2. 빌드
Windows 실행 파일로 빌드합니다:
```bash
npm run tauri build
```
*(주의: 5단계에서 최종 번들링에 llama.cpp와 SQLite 바이너리, GGUF 모델을 포함시키는 빌드 스크립트를 추가 구성할 예정입니다.)*

---

## 2단계 구현 기록

### 구현 내용
* 사용자가 작성 중인 업무 메모를 버튼 하나로 정중한 보고형 문장으로 바꾸는 `AI Convert` 기능을 추가했다.
* Rust 백엔드에 `convert_log_content` 커맨드를 넣어, 우선적으로 번들된 `llama.cpp` 실행 파일과 GGUF 모델을 찾고 호출하도록 구성했다.
* 개발 중이거나 모델이 아직 포함되지 않은 상태에서도 끊기지 않도록, 외부 네트워크 없이 동작하는 규칙 기반 오프라인 변환기를 대체 경로로 넣었다.
* 프론트엔드에는 변환 버튼, 변환 중 상태, 변환 엔진 표기, 오류/성공 알림을 연결했다.

### 변경된 파일
* [src-tauri/src/lib.rs](src-tauri/src/lib.rs)
* [src/services/ipc.ts](src/services/ipc.ts)
* [src/App.tsx](src/App.tsx)
* [src/App.css](src/App.css)

### 생성된 파일
* 신규 생성 파일은 없음

### 프로젝트 트리 변화
* `src/services/ipc.ts`에 AI 변환 IPC 래퍼가 추가됨
* `src/App.tsx`에 `AI Convert` UI와 상태 관리가 추가됨
* `src-tauri/src/lib.rs`에 로컬 AI 변환 커맨드 및 llama.cpp 호출 우선 로직이 추가됨

### 주요 코드 설명
* `convert_log_content`: 제목과 본문을 받아 정리된 업무일지 문체로 변환한다.
* `try_llama_convert`: 번들 리소스 경로에서 `llama-cli.exe`와 GGUF 모델을 찾고, 있으면 실제 로컬 LLM을 호출한다.
* `deterministic_business_convert`: 모델이 없을 때도 결과를 반환하기 위한 오프라인 대체 정리기다.
* `handleConvert`: 프론트에서 변환 결과를 에디터에 즉시 반영한다.

### 실행 방법
```bash
npm run tauri dev
```

### 빌드 방법
```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

### 다음 단계로 남은 것
* 3단계: 대량 과거 일지 업로드
* 4단계: SQLite 기반 로컬 RAG 검색
* 5단계: llama.cpp / GGUF / SQLite 포함 최종 패키징
