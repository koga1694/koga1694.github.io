---
title: "개발 과정"
description: "4-Phase 에이전트 파이프라인으로 앱 전체를 빌드한 과정"
order: 3
---

## AI 에이전트 팀으로 앱을 만들다

DoItYourself 자체가 AI를 이용해 소프트웨어를 만드는 도구인데, 이 앱을 만드는 과정에서도 AI 에이전트들을 활용했다. 4명의 전문 에이전트가 역할을 나눠서 병렬로 작업하는 파이프라인을 설계했다.

---

## 4개의 에이전트, 4개의 역할

| 에이전트 | 역할 | 담당 영역 |
|---|---|---|
| **architect** | 시니어 아키텍트 | 기반 설계, 타입 계약, 최종 통합 |
| **bot-engineer** | 코어 파이프라인 | Discord/Telegram 봇 + AI 엔진 + 워크스페이스 |
| **dashboard-engineer** | 프론트엔드 | React 대시보드 + Setup Wizard + 인앱 채팅 |
| **infra-engineer** | 인프라 + QA | 미리보기 서버 + GitHub 연동 + 통합 테스트 |

에이전트들은 서로 직접 대화하지 않는다. 대신 `_workspace/` 폴더에 문서를 주고받는 방식으로 협업했다.

---

## Phase 1: Foundation (architect 단독)

**목적**: 나머지 에이전트들이 병렬로 작업할 수 있는 "공통 기반"을 먼저 만든다.

architect가 혼자 다음을 만들었다:

1. **`package.json`**: Phase 2 에이전트들이 쓸 모든 의존성을 미리 포함. 나중에 `npm install`을 따로 실행하지 않아도 되도록.

2. **`src/shared/types.ts`**: 가장 중요한 파일. 모든 에이전트가 이 타입들을 import해서 쓴다. `AIEngine` 인터페이스, IPC 채널 상수, `StreamEvent` 타입 등이 정의됨.

3. **Prisma 스키마**: SQLite 데이터베이스 구조 (Project, Session, Settings 테이블).

4. **IPC 스텁**: `src/main/ipc.ts`에 12개 IPC 채널을 등록하되, 실제 로직은 빈 상태(`null` 반환)로 두었다. dashboard-engineer가 UI에서 IPC를 호출해도 에러가 나지 않게 하기 위해서.

5. **계약서**: `_workspace/01_architect_contracts.md`에 타입 정의, IPC 채널 목록, DB 스키마를 정리해서 저장. Phase 2 에이전트들이 이 문서를 읽고 작업 시작.

---

## Phase 2: 병렬 개발 (3명 동시)

architect가 기반을 만든 후, 3명의 에이전트가 **동시에** 작업했다. 서로의 코드를 기다리지 않고 병렬로.

### bot-engineer (16개 파일)

AI 엔진 추상화 레이어와 Discord 봇의 핵심 로직을 구현했다.

- `AIEngine` 인터페이스 구현 — Gemini, Claude, Codex 세 가지 엔진
- 이벤트 번역기 (`translator.ts`) — 기술 이벤트 → 한국어 메시지
- Discord 메시지 핸들러 — 스레드 생성, AI 요청, 실시간 진행상황 업데이트
- 워크스페이스 관리자 + 4종 프로젝트 템플릿

이 중 ClaudeEngine은 당시 `@anthropic-ai/claude-agent-sdk` API가 확정되지 않아서 스텁(빈 구현체)으로 처리하고 나중에 교체했다.

### dashboard-engineer (13개 파일)

React UI 전체를 구현했다.

- **Setup Wizard** (5단계): 가장 중요한 화면. 기술 용어를 전혀 쓰지 않고 비개발자도 쉽게 따라할 수 있게 설계.
  - 1단계: 환영 ("코딩 몰라도 돼요!")
  - 2단계: AI 엔진 선택 (Gemini 무료 옵션을 금색 버튼으로 강조)
  - 3단계: Discord 봇 설정
  - 4단계: 환경 자동 확인
  - 5단계: 완료 ("Discord에서 '할 일 앱 만들어줘'라고 말해보세요!")
- 프로젝트 목록 페이지 (카드 그리드)
- 프로젝트 상세 페이지 (미리보기 iframe + 배포 버튼)
- 설정 페이지 (AI 엔진 전환, API 키 관리)

`useIPC()` 훅을 만들어서 모든 IPC 통신이 이 훅을 통하도록 했다.

### infra-engineer (6개 파일)

미리보기 서비스와 GitHub 연동을 구현했다.

- Express 정적 파일 서버 (포트 동적 할당) — 만들어진 프로젝트를 로컬에서 서빙
- Puppeteer 스크린샷 — 완성된 결과물을 1280×720으로 캡처해서 Discord에 전송
- ngrok 터널 (cloudflared 폴백) — 로컬 서버를 외부 URL로 공개
- GitHub 연동 — 레포 생성, git 자동화, GitHub Pages 활성화

---

## Phase 3: 통합 QA (infra-engineer)

3명이 병렬로 만든 코드가 서로 잘 맞는지 확인하는 단계. **생산자 코드와 소비자 코드를 동시에** 보는 방식으로 검증했다.

**결과: CRITICAL 0건, WARNING 0건**. Phase 4로 진행.

---

## Phase 4: 최종 통합 (architect)

QA를 통과한 코드를 실제로 연결하는 마지막 단계.

`npm run build` 성공으로 v1.0 완성. 이후 즉시 후속 작업:

1. **ClaudeEngine 실제 구현**: `@anthropic-ai/sdk v0.80.0`으로 교체
2. **UI ↔ IPC 연결**: 봇 제어, 프로젝트 삭제, 미리보기 버튼 추가

---

## 1차 코드 리뷰 + 테스트 체계 구축 (2026-04-04)

빌드 완성 후 처음으로 전체 코드를 통독하며 버그를 찾았다.

**Critical 버그들:**

- **aiEngine 참조 분리**: Discord `messageCreate` 핸들러가 엔진 인스턴스를 직접 캡처 → 엔진을 바꿔도 봇이 구버전 엔진을 계속 사용. `let aiEngine = services.aiEngine` 패턴으로 수정. `SETTINGS_SET`에서 직접 변이하면 클로저가 항상 최신 엔진을 참조.
- **API 키 암호화 미적용**: `SettingsRepository`에 `KeychainService`가 주입되지 않아 `enc:xxxxx` 암호화 원문이 AI 엔진에 전달됨.
- **Puppeteer 브라우저 미종료**: 스크린샷 실패 시 `browser.close()` 없이 종료 → try-finally로 수정.

**Vitest 테스트 체계 신규 구축**: 12개 파일, 엔진·DB·워크스페이스·봇 핸들러·i18n 커버.

---

## 5-패스 반복 감사: 21개 버그 수정 (2026-04-05)

Phase 2/3 기능 추가 후 전체 코드를 처음부터 다시 읽으면서 버그를 찾는 감사를 5번 반복했다.

**왜 반복 감사인가?** 1차에서 발견한 버그를 수정하면 2차에서 그 수정으로 인한 새로운 버그나 놓쳤던 것들이 보인다. 5차까지 하니 비로소 "더 이상 찾을 게 없다"는 상태에 도달했다.

**각 패스의 핵심 발견:**

- **2차** — **Stale Engine Capture**: Telegram이 엔진 인스턴스를 직접 캡처. `() => services.aiEngine` getter 패턴으로 수정. `process.env` 스프레드 순서 역전으로 사용자 API 키가 시스템 환경변수에 **무음으로** 덮어씌워지는 버그
- **3차** — HTTP keep-alive 연결로 `server.close()` hang. `closeAllConnections()` 먼저 호출 필요 (Node.js 18.2+)
- **5차** — `handleButton` 핵심 경로 테스트 커버리지 공백 → `button.test.ts` 신규 작성

**최종**: 201개 테스트, 버그 제로 선언.

---

## Phase 2/3 기능 확장 (2026-04-05)

에이전트 3개를 병렬로 실행해서 대규모 기능 확장을 한 번에 진행했다.

**추가된 기능들:**

**Telegram 봇** — `/start`, `/new`, `/projects`, `/templates` 커맨드 + 인라인 버튼 + QR 공유 + 롤백. Discord와 완전히 다른 API임에도 동일한 AI 엔진 레이어를 공유한다.

**원클릭 배포 (Vercel, Netlify)** — `npx vercel` / `npx netlify-cli`를 서브프로세스로 실행. CLI를 npx로 실행하면 사용자가 별도 설치할 필요가 없다는 점이 이 패턴의 장점.

**Git 버전관리 + 롤백** — 프로젝트 생성 시 `git init`, AI 완료 시마다 `git commit`. Discord/Telegram에서 "이전으로 되돌려줘" → `reset --hard`. 대시보드 History 탭에서 타임라인 시각화.

**MCP 플러그인 시스템** — Claude Agent SDK의 `mcpServers` 옵션 연동. 설정에서 MCP 서버를 추가하면 Claude가 외부 DB, API 등을 직접 사용할 수 있다.

**커뮤니티 마켓플레이스** — Discord `/marketplace` 슬래시 커맨드로 8개 프리셋 템플릿 선택.

**멀티유저 지원** — `discordUserId`/`telegramChatId` 기반으로 각 사용자의 프로젝트를 격리.

**최종 상태**: 186개 테스트 통과, TypeScript 클린, 빌드 성공.

---

## 30-패스 반복 감사: 버그 제로 달성 (2026-04-06)

Phase 2/3 기능 확장 후 더 집중적인 버그 감사를 진행했다. 총 30회 반복 사이클에서 **63개 버그**를 수정했다.

**주요 발견 카테고리:**

**Prisma 패키징 문제**: 앱을 패키징(.exe, AppImage)해서 배포하면 Prisma의 native `.node` 바이너리를 asar 아카이브 안에서 로드할 수 없었다. `electron-builder.yml`에 `asarUnpack` 설정을 추가하고, `prisma/schema.prisma`에 대상 OS의 `binaryTargets`를 명시하는 것으로 해결. 처음 실행 시 DB 디렉토리가 없어서 Prisma 초기화가 실패하는 문제도 발견 — `mkdirSync`로 해결.

**ChatHandler 크로스-프로젝트 버그**: 단일 `AbortController`를 모든 프로젝트가 공유하던 설계 → 프로젝트 A의 채팅을 취소하면 프로젝트 B의 채팅도 같이 취소됨. `Map<projectId, AbortController>`로 교체.

**engineReplacePromise 직렬화**: AI 엔진 교체 중 다시 교체 요청이 오면 두 엔진이 동시에 초기화되는 race condition. boolean 플래그 → `Promise` 체인 직렬화로 해결.

**Preview 보안 취약점**: `.env`, `.git`, `node_modules`, `.prisma` 파일이 외부 URL로 직접 접근 가능했던 것. Express 미들웨어로 차단.

**Telegram 메모리 누수**: `chatProjects` Map에 저장된 채팅 ID가 무한 증가 → `MAX_CHAT_PROJECTS = 1000` 상한 + LRU 삭제 패턴으로 해결.

**테스트**: 282개 → 286개 통과.

---

## 인앱 채팅 워크스페이스 (v1.1.0) (2026-04-06)

30-패스 감사와 함께, Discord/Telegram 봇 없이도 대시보드 내에서 직접 AI와 채팅할 수 있는 기능을 추가했다.

Claude Desktop의 분할 뷰(왼쪽: 채팅, 오른쪽: 결과물 미리보기)를 참고해서 설계. AI가 코드를 생성하면 오른쪽 미리보기가 자동으로 새로고침된다.

**새 패턴 도입**: CHAT_STREAM은 다른 IPC와 달리 메인 프로세스에서 렌더러로 일방적으로 이벤트를 push하는 방식이다. 스트리밍이기 때문에 요청-응답 방식으로는 구현이 불가능하다.

---

## GitHub Actions 자동 릴리즈 (2026-04-06)

태그를 push하면 Linux(AppImage), Windows(NSIS 인스톨러), macOS 세 플랫폼을 자동으로 빌드해서 GitHub Release에 업로드하는 CI/CD 파이프라인을 구성했다.

**발견한 트릭들:**
- `GITHUB_TOKEN`은 기본적으로 read-only. Release 업로드를 하려면 워크플로우에 `permissions: contents: write`를 명시해야 한다.
- WSL2 환경에서는 Windows 빌드가 불가능(Wine 없음). GitHub Actions의 Windows runner(`windows-latest`)를 사용해야 한다.

---

## 문서 흐름 (에이전트 협업 방식)

```
Phase 1: architect
  → 01_architect_contracts.md 생성

Phase 2: (3명이 이 문서를 읽고 시작)
  bot-engineer      → 02_bot_engineer_status.md
  dashboard-engineer → 02_dashboard_engineer_status.md
  infra-engineer    → 02_infra_engineer_impl.md

Phase 3: infra-engineer
  → 03_qa_report.md (CRITICAL/WARNING/INFO 분류)

Phase 4: architect
  → 03_qa_report.md를 읽고 통합
  → 04_build_result.md 생성
```

에이전트들은 이 문서들을 통해서만 소통했다. 직접적인 코드 의존성 없이 병렬 작업이 가능했던 이유다.
