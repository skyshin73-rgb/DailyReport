# DailyReport - 사내 보안용 로컬 AI 기반 업무 일지 관리 비서

## 프로젝트 개요

**DailyReport**는 사내 폐쇄망 환경에서 보안을 유지하면서 로컬 AI 기술을 활용한 업무 일지 관리 애플리케이션입니다. 외부 인터넷 통신 없이 로컬 PC에서 완전히 독립적으로 동작합니다.

## 주요 특징

✅ **완전한 로컬 환경**: 외부 인터넷 통신 불필요  
✅ **로컬 AI 통합**: Ollama (Llama3 8B / Gemma 2B) 연동  
✅ **임베디드 데이터베이스**: SQLite 또는 H2 사용  
✅ **사용자 친화적 UI**: 타임라인 형식의 업무 일지 관리  
✅ **강력한 검색/필터링**: 날짜별, 키워드별 검색 기능  
✅ **독립형 실행 가능**: .exe 패키징 가능한 구조  

## 기술 스택

| 계층 | 기술 |
|------|------|
| **백엔드** | Java 17 + Spring Boot 3.3.0 |
| **프런트엔드** | HTML5 + CSS3 + Vanilla JavaScript |
| **데이터베이스** | SQLite 3.44.0 (임베디드) |
| **빌드도구** | Maven 3.8.0+ |
| **AI 연동** | Ollama Local API |
| **JPA/ORM** | Spring Data JPA + Hibernate |

## 프로젝트 구조

```
DailyReport/
├── pom.xml                          # Maven 설정파일
├── .gitignore
├── README.md
├── src/
│   ├── main/
│   │   ├── java/com/dailyreport/
│   │   │   ├── DailyReportApplication.java         # 메인 앱 클래스
│   │   │   ├── controller/
│   │   │   │   ├── ReportController.java           # 일지 관리 API
│   │   │   │   └── OllamaController.java           # AI 생성 API
│   │   │   ├── service/
│   │   │   │   ├── ReportService.java              # 일지 비즈니스 로직
│   │   │   │   └── OllamaService.java              # Ollama 통신 로직
│   │   │   ├── repository/
│   │   │   │   └── ReportRepository.java           # DB 쿼리 인터페이스
│   │   │   ├── model/
│   │   │   │   ├── Report.java                     # 업무 일지 엔티티
│   │   │   │   ├── OllamaRequest.java              # AI 요청 모델
│   │   │   │   └── OllamaResponse.java             # AI 응답 모델
│   │   │   ├── config/
│   │   │   │   ├── DatabaseConfig.java             # DB 설정
│   │   │   │   └── AppConfig.java                  # 앱 설정
│   │   │   └── util/
│   │   │       └── DateUtil.java                   # 날짜 유틸
│   │   ├── resources/
│   │   │   ├── application.properties              # 앱 설정
│   │   │   ├── schema.sql                          # DB 스키마
│   │   │   └── static/
│   │   │       ├── index.html                      # 메인 페이지
│   │   │       ├── css/style.css                   # 스타일시트
│   │   │       └── js/app.js                       # 프런트엔드 로직
│   └── test/
│       └── java/com/dailyreport/                   # 단위테스트
└── target/                          # 빌드 출력 디렉토리
```

## 설치 및 실행 가이드

### 사전 요구사항

- **Java 17** 이상 설치
- **Maven 3.8.0** 이상 설치
- **Ollama** 설치 및 모델 다운로드 (선택)

### 1단계: 프로젝트 빌드

```bash
# 프로젝트 디렉토리로 이동
cd /workspaces/DailyReport

# Maven을 사용하여 프로젝트 빌드
mvn clean package
```

빌드 완료 후 `target/daily-report-1.0.0.jar` 파일이 생성됩니다.

### 2단계: 애플리케이션 실행

```bash
# JAR 파일 실행
java -jar target/daily-report-1.0.0.jar

# 또는 Maven으로 직접 실행
mvn spring-boot:run
```

### 3단계: 웹 브라우저에서 접속

```
http://localhost:8080
```

## 주요 API 엔드포인트

### 업무 일지 관리

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `GET` | `/api/reports` | 모든 일지 조회 |
| `GET` | `/api/reports/{id}` | 특정 일지 조회 |
| `GET` | `/api/reports/date/{reportDate}` | 날짜별 일지 조회 |
| `GET` | `/api/reports/search?keyword=...` | 키워드 검색 |
| `POST` | `/api/reports` | 새 일지 작성 |
| `PUT` | `/api/reports/{id}` | 일지 수정 |
| `DELETE` | `/api/reports/{id}` | 일지 삭제 |

### AI 통합 (Ollama)

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| `GET` | `/api/ollama/status` | Ollama 연결 상태 확인 |
| `POST` | `/api/ollama/generate` | AI 요약 생성 |
| `POST` | `/api/ollama/config` | Ollama 설정 변경 |

## 데이터베이스 스키마

### daily_reports 테이블

```sql
CREATE TABLE daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_date VARCHAR(10) NOT NULL,
    ai_summary TEXT,
    ai_processed BOOLEAN DEFAULT 0
);
```

## 로컬 Ollama 설정

### Ollama 설치 및 실행

1. **Ollama 다운로드**: https://ollama.ai
2. **모델 다운로드**:
   ```bash
   ollama pull llama2
   # 또는
   ollama pull gemma:2b
   ```
3. **Ollama 서버 실행**:
   ```bash
   ollama serve
   ```
   기본 API 주소: `http://localhost:11434`

### 애플리케이션 설정 (application.properties)

```properties
# Ollama 연결 설정
ollama.api.url=http://localhost:11434
ollama.api.model=llama2
```

## 향후 계획 (2단계 이상)

- ✅ 1단계: 기본 환경 및 로컬 환경 구축
- 🔄 2단계: AI 요약 기능 고도화
- 🔄 3단계: 사용자 인증 및 권한 관리
- 🔄 4단계: 고급 분석 및 리포팅 기능
- 🔄 5단계: 독립형 .exe 패키징 (GraalVM, Launch4j 사용)
- 🔄 6단계: 사내 배포 및 최적화

## 문제 해결

### 포트 8080이 이미 사용 중인 경우

```bash
# 다른 포트로 실행
java -jar target/daily-report-1.0.0.jar --server.port=8081
```

### Ollama 연결 실패

1. Ollama가 실행 중인지 확인: `http://localhost:11434/api/tags`
2. 방화벽 설정 확인
3. application.properties에서 `ollama.api.url` 확인

### 데이터베이스 파일 위치

기본 저장 경로: `./user-data/daily_reports.db`

사용자 정의 경로를 설정하려면 `application.properties` 수정:
```properties
app.data-path=/your/custom/path
```

## 보안 주의사항

⚠️ **폐쇄망 환경 사용 필수**:
- 인터넷 연결이 차단된 사내망에서만 사용
- Ollama API는 `localhost:11434`에서만 응답하도록 설정
- 데이터는 SQLite 로컬 파일로만 저장
- 민감한 데이터는 적절히 암호화 처리 권장

## 라이선스

Internal Use Only - 사내 전용 프로그램

## 개발자 정보

**프롬프트 엔지니어링 기반 개발**: GitHub Copilot with Claude Haiku 4.5  
**개발 환경**: VS Code Codespace (Ubuntu 24.04.4 LTS)

---

**Last Updated**: 2024-06-17  
**Version**: 1.0.0 - Alpha