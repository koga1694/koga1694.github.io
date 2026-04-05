---
title: "작업 이력"
description: "언제 무엇을 만들었는지 타임라인"
order: 5
---

## 2026-04-05 — 테스트 품질 전수 감사: 유령 테스트 제거 (201 → 215개)

215개 테스트가 됐지만 숫자보다 **질**이 중요했다. 전수 감사를 해보니 소스를 전혀 import하지 않고 로직을 테스트 내부에서 재정의하는 "유령 테스트(ghost test)"가 여러 개 발견됐다.

**유령 테스트란?** 실제 소스 코드와 완전히 분리된 테스트. 테스트가 통과해도 소스 버그를 잡지 못하며, 소스를 어떻게 수정해도 테스트는 계속 통과한다.

**발견된 유령 테스트들:**

- **`index.test.ts` (2개)**: `app.on('window-all-closed', () => app.quit())`을 테스트 내부에서 직접 정의하고 실행 → 실제 `index.ts`는 import조차 하지 않음. → 실제 `index.ts` import + `app.on` 등록 확인, `before-quit` isQuitting 가드 검증으로 교체 (2→7 테스트)
- **`preload.test.ts` (5개)**: `contextBridge.exposeInMainWorld`를 검증하지 않고 그냥 함수를 직접 호출 → `preload.ts` import 후 `vi.hoisted()`로 contextBridge 캡처 패턴 확립, invoke/on/removeAllListeners/disposer 정확성 검증 (5→14 테스트)
- **`template.test.ts` (4개)**: JavaScript 기본 `String.prototype.split()`만 테스트하는 코드 → `MARKETPLACE_TEMPLATES` 8개 데이터 무결성(고유 id, 필수 필드 존재)으로 대체

**교훈**: 테스트 커버리지 숫자보다 "이 테스트가 실제 소스를 실행하는가?"가 훨씬 중요하다. 특히 Electron의 `contextBridge`, `ipcMain`처럼 mock이 복잡한 레이어일수록 유령 테스트가 숨어 있기 쉽다.

---

## 2026-04-05 — Phase 2/3 완료: Telegram · 배포 · 마켓플레이스 · MCP · Git 버전관리

1차 코드 완성 후 가장 큰 기능 확장을 한 번에 진행했다. 에이전트 3개(bot-engineer, dashboard-engineer, infra-engineer)를 병렬로 실행해서 구현했다.

**추가된 기능들:**

**Telegram 봇** — Discord에 이어 Telegram도 지원. `telegraf` 프레임워크 사용. `/start`, `/new`, `/projects`, `/templates` 커맨드 + 인라인 버튼. Discord와 완전히 다른 API임에도 동일한 AI 엔진 레이어를 공유.

**중요한 버그 (Stale Engine Capture)**: Telegram 핸들러에 AI 엔진 인스턴스를 직접 전달했을 때, Settings에서 엔진을 바꿔도 Telegram 봇은 구버전 엔진을 계속 사용하는 문제. 해결책은 인스턴스가 아닌 **getter 함수**를 전달하는 것: `registerHandlers(bot, () => services.aiEngine)`. 함수가 호출될 때마다 현재 엔진을 가져오므로 항상 최신 엔진을 사용한다.

**원클릭 배포 (Vercel, Netlify)** — `npx vercel` / `npx netlify-cli`를 서브프로세스로 실행. 설정에서 토큰 입력, 프로젝트 상세에서 버튼 클릭 한 번으로 배포 완료. CLI를 npx로 실행하면 사용자가 별도 설치할 필요가 없다는 점이 이 패턴의 장점.

**Git 버전관리 + 롤백** — 프로젝트 생성 시 `git init`, AI가 코드를 완성할 때마다 `git commit`. Discord/Telegram에서 "이전으로 되돌려줘"라고 하면 직전 커밋으로 `reset --hard`. 대시보드의 History 탭에서 타임라인 시각화. hash injection 방지를 위해 `/^[0-9a-f]{4,40}$/` 정규식 검증 필수.

**MCP 플러그인 시스템** — Claude Agent SDK의 `mcpServers` 옵션 연동. 설정에서 MCP 서버 이름/커맨드/인자를 추가하면 Claude가 외부 DB, API 등을 직접 사용할 수 있다. `mcpServersJson TEXT` 컬럼에 JSON 직렬화해서 저장 (SQLite가 JSON 배열을 네이티브 지원 안 해서).

**커뮤니티 마켓플레이스** — Discord `/marketplace` 슬래시 커맨드로 8개 프리셋 템플릿 선택. 선택하면 자동으로 프로젝트를 생성하고 타입별 프롬프트 가이드를 전송.

**멀티유저 지원** — `Project` DB 모델에 `discordUserId`, `discordGuildId`, `telegramChatId` 필드 추가. `/projects` 커맨드가 각 사용자의 프로젝트만 필터링해서 표시.

**최종 상태**: 186 tests passed, TypeScript 클린, 빌드 성공.

---

## 2026-04-05 — 5-패스 반복 감사: 21개 버그 수정 + 버그 제로 달성

Phase 2/3 기능 추가 후 전체 코드를 처음부터 다시 읽으면서 버그를 찾는 감사를 5번 반복했다. "버그가 없어질 때까지 반복"이 이 방법론의 핵심.

**왜 반복 감사인가?** 1차에서 발견한 버그를 수정하면 2차에서 그 수정으로 인한 새로운 버그나 놓쳤던 것들이 보인다. 5차까지 하니 비로소 "더 이상 찾을 게 없다"는 상태에 도달했다.

**각 패스의 핵심 발견:**

- **1차** — `msg.errors` 직접 접근으로 크래시 (Claude SDK 타입 불일치), Telegram 중복 콜백 처리, 비-텍스트 채널에서 스레드 생성 크래시
- **2차** — **Stale Engine Capture**: Telegram이 getter 패턴 없이 엔진 인스턴스를 직접 캡처. `process.env` 스프레드 순서 역전으로 사용자 API 키가 시스템 환경변수에 **무음으로** 덮어씌워지는 버그 (`{ ...process.env, ANTHROPIC_API_KEY: key }` → 올바른 순서)
- **3차** — HTTP keep-alive 연결로 `server.close()` hang (Node.js 18.2+에서 `closeAllConnections()` 먼저 호출 필요), GitHub `--force-with-lease` tracking branch 없이는 의미 없음
- **4차** — 테스트 시그니처 불일치: 구현 변경 후 테스트 업데이트 누락 (테스트는 통과하지만 구현과 실제 달라진 상태)
- **5차** — `handleButton` 핵심 경로 테스트 커버리지 공백 → `button.test.ts` 13개 테스트 신규 작성

**최종 상태**: 201 tests passed (21개 파일), 버그 제로 선언.

---

## 2026-04-05 — 2~5차 반복 감사: 버그 제로 달성

4번의 감사 사이클을 돌면서 1차에서 발견하지 못한 버그들을 추가로 56개 수정했다.

**수정한 주요 버그들:**

- **preload 보안**: `on()`/`removeAllListeners()`에 채널 화이트리스트 미적용 → IPC 채널 무제한 접근 가능했던 것 수정. `on()`이 이제 disposer 함수를 반환하도록 변경해서 리스너 누수도 차단.
- **AI 프롬프트 버그**: `message = await thread.send(...)` 재할당으로 AI가 사용자 원본 메시지 대신 봇 응답을 다시 처리하던 문제. `const userPrompt = message.content`로 선캡처.
- **세션 추적 버그**: `existingSession`이 있어도 항상 새 세션을 생성 → `existingSession ?? createSession()` 패턴으로 수정. turnCount/비용이 제대로 누적되지 않던 문제 해결.
- **stderr 데드락**: Gemini/Codex 자식 프로세스가 stderr를 파이프로 연결하지만 소비하지 않아, 64KB 버퍼가 차면 프로세스 전체가 멈추는 버그. `proc.stderr?.resume()`으로 해결.
- **PreviewServer.stop() 타이밍**: `this.server = null`을 `close()` 콜백 이전에 설정해서 두 번째 `stop()` 호출이 조기 resolve되던 문제. 참조를 먼저 캡처하고 null 처리하는 순서로 수정.
- **spawn 에러 이벤트**: `proc.on('error')` 리스너 없으면 Node.js가 unhandled EventEmitter error로 프로세스를 종료. `proc.on('error', () => {})` 추가.
- **UTC 월 경계 버그**: `getMonthlyCostKrw()`가 로컬 midnight 기준으로 월 시작을 계산 → UTC 기준으로 수정. 한국 시간(UTC+9)에서 월 경계 주변에 비용이 잘못 집계되던 문제.
- **Windows 경로 구분자**: `path.join().replace(workspacePath, '')` 방식이 Windows에서 경로 구분자 불일치로 잘못 동작 → `path.relative()`로 교체.

**테스트 정비:**
- `vi.mock()` 팩토리에서 참조하는 변수는 `vi.hoisted()`로 선언해야 한다는 것을 이번에 제대로 정리. Vitest가 `vi.mock()` 호출을 파일 최상단으로 호이스팅하기 때문에, 그 위에 선언한 `const`도 초기화되지 않은 상태로 팩토리가 실행됨.
- 5차 감사에서 tray, github 모듈, claude 엔진, keychain, embed, progress — 모두 클린 판정.

**최종 상태**: 108 tests passed, TypeScript 클린, `npm run build` 성공.

---

## 2026-04-04 — 1차 코드 리뷰: 17개 버그 수정 + Vitest 테스트 체계 구축

처음으로 전체 코드를 통독하며 버그를 찾아 수정했다.

**Critical 버그들:**

- **aiEngine 참조 분리 문제**: Discord `messageCreate` 핸들러의 클로저가 엔진 인스턴스를 직접 캡처하고 있어서, Settings에서 AI 엔진을 바꿔도 이미 실행 중인 봇은 구버전 엔진을 계속 쓰는 문제. `let services = { aiEngine, ... }` 공유 컨테이너를 만들고 핸들러가 `services.aiEngine`을 참조하도록 변경. 이제 `SETTINGS_SET`에서 `services.aiEngine = createEngine(...)` 직접 변이하면 Discord 봇이 자동으로 새 엔진을 씀.
- **API 키 암호화 미적용**: `SettingsRepository`에 `KeychainService`가 주입되지 않아 Discord 메시지 핸들러에서 복호화된 API 키 대신 `enc:xxxxx` 원문이 AI 엔진에 전달되던 문제.
- **Puppeteer 브라우저 미종료**: 스크린샷 실패 시 `browser.close()` 호출 없이 종료. `try-finally`로 수정.

**테스트 체계 신규 구축:**
- Vitest 설치 및 설정 (`vitest.config.ts`)
- 테스트 파일 12개 작성 — 엔진, DB 레포지토리, workspace 매니저, GitHub 동기화, 스크린샷, 메시지 핸들러, i18n

---

## 2026-04-03 — 후속 작업: ClaudeEngine 실제 구현 + UI 연결

### 수행 내용
- `ClaudeEngine` — `@anthropic-ai/sdk v0.80.0`으로 실제 구현 교체
  - API key 방식: Anthropic 스트리밍 API (`claude-opus-4-5`)
  - 멀티턴: 인메모리 대화 히스토리 Map으로 구현
- `Settings.tsx` — Discord 봇 제어 섹션 추가 (시작/중지/상태 버튼)
- `Projects.tsx` — 프로젝트 삭제 버튼 추가
- `ProjectDetail.tsx` — 미리보기 URL 갱신 + 스크린샷 버튼 추가

### 에러 / 이슈
없음 (TypeScript 컴파일 에러 0개)

### 향후 참고사항
- `PROJECTS_CREATE`는 Discord 봇이 담당하므로 UI에서 직접 호출할 필요 없음
- Claude OAuth 흐름 완성 시 `ANTHROPIC_API_KEY`를 OAuth 토큰으로 교체하면 됨

---

## 2026-04-03 — 전체 빌드 완료 (v1.0 초기 구현)

4-Phase 에이전트 파이프라인으로 전체 앱을 처음부터 구현 완료.

- Phase 1: architect (기반 구조, 16개 파일)
- Phase 2: bot-engineer + dashboard-engineer + infra-engineer 병렬 (35개 파일)
- Phase 3: infra-engineer 통합 QA (CRITICAL 0건, WARNING 0건)
- Phase 4: architect 최종 통합 (`npm run build` 성공)

**생성된 파일 총계**: ~51개 소스 파일 + 6개 `_workspace` 문서

---

## 2026-04-03 — Phase 4: 최종 부트스트랩 통합 (architect)

### 수행 내용
- `src/main/index.ts` — 스켈레톤을 실제 부트스트랩 시퀀스로 교체
  - DB → Settings → AI Engine → WorkspaceManager → Discord Bot → PreviewServer → IPC 등록 순서
  - `app.on('before-quit')` cleanup 추가
- `src/main/ipc.ts` — 12개 IPC 채널 스텁을 실제 서비스 모듈 호출로 교체
  - `registerIPC(services)` 패턴 — 서비스 인스턴스를 파라미터로 전달
  - `settings:set` 시 AI Engine 자동 재생성
  - `preview:get-url`에 URL 캐싱

### 빌드 검증
- `tsc --noEmit` — 에러 0개 (두 tsconfig 모두)
- `npm run build:main` — 성공
- `npm run build:renderer` — 성공 (40 modules, 569ms)

---

## 2026-04-03 — Phase 3: 통합 QA (infra-engineer)

### 수행 내용
각 모듈의 경계면(boundary)을 교차 검증. 생산자 코드와 소비자 코드를 동시에 읽는 방식으로 확인.

- TypeScript 전체 컴파일 검증 — 에러 0개
- AI Engine 인터페이스 ↔ 3개 구현체 시그니처 일치 확인
- IPC 채널 계약: 12개 채널 main 등록 + renderer 호출 확인
- Prisma 스키마 ↔ Repository 클래스: 필드 전수 비교 통과
- Workspace 경로 흐름: manager → bot → DB → preview 연결 확인
- Bot ↔ Engine: query/resumeSession 호출 인자 일치 확인

### 결과
CRITICAL 0건, WARNING 0건. Phase 4 진행.

---

## 2026-04-03 — Phase 2: React 대시보드 + Setup Wizard (dashboard-engineer)

### 수행 내용
- `vite.config.ts` — `@shared` alias 설정, `src/renderer` root
- React 앱 구조 — HashRouter, 4개 라우트
- **`Setup.tsx`** (5단계 Setup Wizard) — 가장 신경 쓴 화면
  - Gemini 무료 옵션을 금색 버튼으로 최상단 강조
  - 기술 용어 없는 한국어 UI
- `Projects.tsx` — 카드 그리드 레이아웃
- `ProjectDetail.tsx` — 미리보기 iframe + 공유/배포 버튼
- `Settings.tsx` — AI 엔진 전환, API 키, 예산 슬라이더, 봇 제어
- `useIPC.ts` — 모든 IPC 통신을 단일 훅으로 추상화

### 에러 / 이슈
- `tsconfig.json`에 `jsx`, `baseUrl` 설정 누락 → 추가하여 해결
- `src/shared`를 `include`에 추가해야 `@shared` path alias가 tsc에서 동작

---

## 2026-04-03 — Phase 2: AI Engine + Discord Bot + Workspace (bot-engineer)

### 수행 내용
- `AIEngine` 인터페이스 정의 (`interface.ts`)
- 이벤트 번역기 (`translator.ts`) — StreamEvent → 한국어 진행 메시지
- GeminiEngine, ClaudeEngine(스텁), CodexEngine 구현
- `createEngine()` 팩토리 함수
- WorkspaceManager + 4종 프로젝트 템플릿 (web-app, static-site, python, game)
- Discord 메시지 핸들러 — 스레드 생성, AI 요청, 진행상황 실시간 업데이트
- Discord 임베드 빌더 3종 (진행중/완료/에러)
- ProgressUpdater — Discord API 과도 호출 방지를 위한 500ms 디바운스

### 에러 / 이슈
- `@anthropic-ai/claude-agent-sdk` API 미확정 → ClaudeEngine 스텁으로 처리
- Discord `PartialGroupDMChannel`에 `.send()` 없음 → `'send' in channel` 타입 가드로 해결

---

## 2026-04-03 — Phase 2: Preview + GitHub 서비스 (infra-engineer)

### 수행 내용
- `PreviewServer` — Express 정적 파일 서버 (port 3456)
- `Screenshot` — Puppeteer 1280×720 캡처
- `Tunnel` — `@ngrok/ngrok` forward + cloudflared 폴백
- `GitHubClient` — Octokit 레포 생성 래퍼
- `GitSync` — git init/add/commit/push 자동화 (`execFile` 사용)
- `GitHubPages` — GitHub Pages 활성화

### 에러 / 이슈
- `@ngrok/ngrok` API가 예전 `ngrok` 패키지와 다름 → `ngrok.forward({ addr })` 패턴으로 변경

---

## 2026-04-03 — Phase 1: Foundation (architect)

### 수행 내용
- `_workspace/` 디렉토리 생성 (에이전트 간 문서 공유 공간)
- `package.json` — Phase 2 에이전트들이 쓸 모든 의존성 포함
- TypeScript 설정 2개 (renderer용, main/core용)
- `electron-builder.yml` — Windows NSIS 인스톨러 설정
- `prisma/schema.prisma` — SQLite (Project, Session, Settings)
- **`src/shared/types.ts`** — 타입 계약 (가장 중요한 파일)
- `src/shared/i18n/ko.ts` — 한국어 UI 문자열
- DB 레포지토리 3개 (Project, Session, Settings)
- Electron 메인 프로세스 + preload + tray + IPC 스텁 12개
- `_workspace/01_architect_contracts.md` — Phase 2 에이전트들을 위한 계약서

### 에러 / 이슈
- `ngrok@^5.0.0` 패키지 없음 → `@ngrok/ngrok@^1.7.0`으로 변경
- SQLite에서 Prisma enum 미지원 → 모든 enum을 String 필드로 변환
- `SettingsRepository` import 경로 오류 → 경로 수정
