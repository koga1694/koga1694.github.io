---
title: "작업 이력"
description: "언제 무엇을 만들었는지 타임라인"
order: 5
---

## 2026-04-06 — v1.1.4: 버그 제로 달성 (30-pass 감사, 63개 수정)

Phase 2/3 기능 확장 후 더 집중적인 버그 감사를 진행했다. 총 30회 반복 사이클.

**최종 상태**: 286개 테스트 통과, TypeScript 클린, `npm run build` + `npm run package` 성공, **버그 제로**.

**주요 수정 항목들:**

**Prisma 패키징**: 앱을 배포용으로 패키징하면 Prisma의 native 바이너리가 asar 아카이브 안에서 로드되지 않는 문제. `electron-builder.yml`에 `asarUnpack` 설정과 `prisma/schema.prisma`에 `binaryTargets` 명시로 해결. 처음 실행 시 DB 디렉토리(`~/DoItYourself/`)가 없어서 초기화 실패하는 문제도 `mkdirSync`로 해결.

**ChatHandler 크로스-프로젝트 버그**: 단일 `AbortController`를 모든 프로젝트가 공유 → 프로젝트 A 채팅 취소 시 프로젝트 B도 같이 취소. `Map<projectId, AbortController>`로 교체.

**스트림 이벤트 projectId 누출**: 여러 프로젝트가 동시에 채팅 중일 때 다른 프로젝트의 스트림 이벤트가 섞이는 문제. 모든 스트림 이벤트에 `projectId` 포함 + 렌더러 측 필터링으로 해결.

**engineReplacePromise 직렬화**: AI 엔진 교체 요청이 빠르게 두 번 오면 race condition 발생. boolean 플래그 → Promise 체인으로 직렬화.

**Preview 보안 취약점**: `.env`, `.git`, `node_modules`, `.prisma` 파일이 외부 URL로 직접 접근 가능 → Express 미들웨어로 차단(403).

**Telegram 메모리 누수**: `chatProjects` Map에 저장된 채팅 ID가 무한 증가. `MAX_CHAT_PROJECTS = 1000` 상한 + LRU 삭제로 해결.

**abort 시 isStreaming 고착**: AI를 취소한 후 채팅 입력창이 영구 비활성화되는 버그. 취소 시 렌더러에 `{ type: 'aborted' }` 이벤트를 push해서 상태 정상화.

**중첩 setState 버그**: React의 `setState` 콜백 안에서 다른 `setState`를 호출하는 패턴이 예측 불가능한 동작을 일으킴. `useRef`로 값을 캡처한 후 flat하게 setState를 호출하도록 변경.

---

## 2026-04-06 — v1.1.0: 인앱 채팅 워크스페이스

Discord/Telegram 봇 없이도 대시보드 내에서 직접 AI와 채팅할 수 있는 기능 추가.

**구현 내용**: 신규 파일 6개 + 수정 9개

- `prisma/schema.prisma` — ChatMessage 모델 추가
- `src/shared/types.ts` — CHAT_SEND/STOP/HISTORY/STREAM/NEW_SESSION IPC 5개 추가
- `src/main/chatHandler.ts` — fire-and-forget 스트리밍, event.sender push 패턴
- `src/core/db/repositories/ChatMessageRepository.ts` — 메시지 DB 영속화
- `src/renderer/pages/ChatWorkspace.tsx` — 분할 뷰 (좌:채팅, 우:미리보기/파일)
- `src/renderer/hooks/useChatStream.ts` — 스트리밍 상태 관리, 세션 이어하기

**핵심 설계**: CHAT_STREAM은 다른 IPC와 달리 메인 프로세스에서 렌더러로 일방적으로 push한다. AI 스트리밍을 요청-응답 방식으로 처리할 수 없기 때문이다.

---

## 2026-04-06 — v1.1.2: GitHub Actions 자동 릴리즈 + Windows 인스톨러

태그를 push하면 Linux(AppImage), Windows(NSIS), macOS 세 플랫폼을 자동으로 빌드해서 GitHub Release에 업로드하는 CI/CD 구성.

**발견한 트릭들:**
- `GITHUB_TOKEN`으로 Release 업로드를 하려면 워크플로우에 `permissions: contents: write`를 명시해야 한다 (기본은 read-only)
- WSL2에서는 Windows 빌드 불가능(Wine 없음) → GitHub Actions `windows-latest` runner 사용
- Snap 배포는 별도 `SNAPCRAFT_TOKEN` secret이 필요 → 일단 AppImage만 유지

**결과**: `DoItYourself-Setup-1.1.2.exe` Windows 인스톨러 생성 완료.

---

## 2026-04-05~06 — 테스트 품질 전수 감사: 유령 테스트 제거

215개 테스트가 됐지만 숫자보다 **질**이 중요했다. 전수 감사를 해보니 소스를 전혀 import하지 않고 로직을 테스트 내부에서 재정의하는 "유령 테스트(ghost test)"가 여러 개 발견됐다.

**유령 테스트란?** 실제 소스 코드와 완전히 분리된 테스트. 테스트가 통과해도 소스 버그를 잡지 못하며, 소스를 어떻게 수정해도 테스트는 계속 통과한다.

**발견된 유령 테스트들:**

- **`index.test.ts`**: `app.on('window-all-closed', ...)` 을 테스트 내부에서 직접 정의하고 실행. `index.ts`를 import조차 안 함 → 실제 import + 등록 확인으로 교체
- **`preload.test.ts`**: `contextBridge.exposeInMainWorld`를 검증하지 않고 함수를 직접 호출 → `preload.ts` import 후 `vi.hoisted()`로 contextBridge 캡처
- **`template.test.ts`**: JavaScript 기본 `String.prototype.split()`만 테스트 → `MARKETPLACE_TEMPLATES` 데이터 무결성 검증으로 대체

**교훈**: 테스트 커버리지 숫자보다 "이 테스트가 실제 소스를 실행하는가?"가 훨씬 중요하다. Electron의 `contextBridge`, `ipcMain`처럼 mock이 복잡한 레이어일수록 유령 테스트가 숨어 있기 쉽다.

---

## 2026-04-05 — Phase 2/3 완료: Telegram · 배포 · 마켓플레이스 · MCP · Git 버전관리

1차 코드 완성 후 가장 큰 기능 확장을 한 번에 진행했다. 에이전트 3개(bot-engineer, dashboard-engineer, infra-engineer)를 병렬로 실행해서 구현했다.

**추가된 기능들:**

**Telegram 봇** — Discord에 이어 Telegram도 지원. `telegraf` 프레임워크 사용. `/start`, `/new`, `/projects`, `/templates` 커맨드 + 인라인 버튼. Discord와 완전히 다른 API임에도 동일한 AI 엔진 레이어를 공유.

**중요한 버그 (Stale Engine Capture)**: Telegram 핸들러에 AI 엔진 인스턴스를 직접 전달했을 때, Settings에서 엔진을 바꿔도 Telegram 봇은 구버전 엔진을 계속 사용하는 문제. 해결책은 인스턴스가 아닌 **getter 함수**를 전달하는 것: `registerHandlers(bot, () => services.aiEngine)`.

**원클릭 배포 (Vercel, Netlify)** — `npx vercel` / `npx netlify-cli`를 서브프로세스로 실행. CLI를 npx로 실행하면 사용자가 별도 설치할 필요가 없다는 점이 이 패턴의 장점.

**Git 버전관리 + 롤백** — 프로젝트 생성 시 `git init`, AI가 코드를 완성할 때마다 `git commit`. Discord/Telegram에서 "이전으로 되돌려줘"라고 하면 직전 커밋으로 `reset --hard`. 대시보드의 History 탭에서 타임라인 시각화.

**MCP 플러그인 시스템** — Claude Agent SDK의 `mcpServers` 옵션 연동. 설정에서 MCP 서버 이름/커맨드/인자를 추가하면 Claude가 외부 DB, API 등을 직접 사용할 수 있다.

**커뮤니티 마켓플레이스** — Discord `/marketplace` 슬래시 커맨드로 8개 프리셋 템플릿 선택.

**멀티유저 지원** — `discordUserId`, `telegramChatId` 기반으로 각 사용자의 프로젝트를 격리. `/projects` 커맨드가 자신의 프로젝트만 필터링.

**최종 상태**: 186개 테스트 통과, TypeScript 클린, 빌드 성공.

---

## 2026-04-05 — 5-패스 반복 감사: 21개 버그 수정 + 버그 제로 달성

Phase 2/3 기능 추가 후 전체 코드를 처음부터 다시 읽으면서 버그를 찾는 감사를 5번 반복했다. "버그가 없어질 때까지 반복"이 이 방법론의 핵심.

**각 패스의 핵심 발견:**

- **1차** — `msg.errors` 직접 접근으로 크래시 (Claude SDK 타입 불일치), Telegram 중복 콜백 처리, 비-텍스트 채널에서 스레드 생성 크래시
- **2차** — **Stale Engine Capture**: Telegram getter 패턴 누락. `process.env` 스프레드 순서 역전으로 사용자 API 키가 시스템 환경변수에 **무음으로** 덮어씌워지는 버그
- **3차** — HTTP keep-alive 연결로 `server.close()` hang, GitHub force-push 조건 미설정
- **4차** — 테스트 시그니처 불일치: 구현 변경 후 테스트 업데이트 누락
- **5차** — `handleButton` 핵심 경로 테스트 커버리지 공백 → `button.test.ts` 13개 테스트 신규 작성

**최종 상태**: 201개 테스트 통과 (21개 파일), 버그 제로 선언.

---

## 2026-04-05 — 1차 코드 리뷰 후속: 추가 버그 수정 (108→188개 테스트)

4번의 감사 사이클을 돌면서 추가 버그 56개를 수정했다.

**주요 버그들:**

- **preload 보안**: `on()`/`removeAllListeners()`에 채널 화이트리스트 미적용 → IPC 채널 무제한 접근 가능
- **AI 프롬프트 버그**: `message = await thread.send(...)` 재할당으로 AI가 사용자 원본 메시지 대신 봇 응답을 다시 처리
- **세션 추적 버그**: `existingSession`이 있어도 항상 새 세션 생성 → turnCount/비용 누적 안 됨
- **stderr 데드락**: Gemini/Codex 자식 프로세스가 stderr를 소비하지 않아 64KB 버퍼가 차면 프로세스 전체 멈춤. `proc.stderr?.resume()`으로 해결
- **UTC 월 경계 버그**: 비용 집계가 로컬 midnight 기준 → UTC 기준으로 수정
- **Windows 경로 구분자**: `path.join().replace()` 방식이 Windows에서 구분자 불일치 → `path.relative()`로 교체

**Vitest 핵심 교훈**: `vi.mock()` 팩토리에서 참조하는 변수는 `vi.hoisted()`로 선언해야 한다. Vitest가 `vi.mock()` 호출을 파일 최상단으로 호이스팅하기 때문에, 그 위에 선언한 `const`도 초기화되지 않은 상태로 팩토리가 실행된다.

---

## 2026-04-04 — 1차 코드 리뷰: 17개 버그 수정 + Vitest 테스트 체계 구축

처음으로 전체 코드를 통독하며 버그를 찾아 수정했다.

**Critical 버그들:**

- **aiEngine 참조 분리 문제**: Discord `messageCreate` 핸들러의 클로저가 엔진 인스턴스를 직접 캡처 → Settings에서 엔진을 바꿔도 봇이 구버전 엔진을 계속 사용. `let services = { aiEngine, ... }` 공유 컨테이너를 만들고 핸들러가 `services.aiEngine`을 참조하도록 변경.
- **API 키 암호화 미적용**: `SettingsRepository`에 `KeychainService`가 주입되지 않아 `enc:xxxxx` 암호화 원문이 AI 엔진에 전달됨.
- **Puppeteer 브라우저 미종료**: 스크린샷 실패 시 `browser.close()` 없이 종료 → try-finally로 수정.

**테스트 체계 신규 구축:**
- Vitest 설치 및 설정 (`vitest.config.ts`)
- 테스트 파일 12개 작성 — 엔진, DB 레포지토리, workspace, GitHub 동기화, 스크린샷, 메시지 핸들러, i18n

---

## 2026-04-03 — 후속 작업: ClaudeEngine 실제 구현 + UI 연결

- `ClaudeEngine` — `@anthropic-ai/sdk v0.80.0`으로 실제 구현 교체
  - API key 방식: Anthropic 스트리밍 API (`claude-opus-4-5`)
  - 멀티턴: 인메모리 대화 히스토리 Map으로 구현
- `Settings.tsx` — Discord 봇 제어 섹션 추가 (시작/중지/상태 버튼)
- `Projects.tsx` — 프로젝트 삭제 버튼 추가
- `ProjectDetail.tsx` — 미리보기 URL 갱신 + 스크린샷 버튼 추가

---

## 2026-04-03 — 전체 빌드 완료 (v1.0 초기 구현)

4-Phase 에이전트 파이프라인으로 전체 앱을 처음부터 구현 완료.

- Phase 1: architect (기반 구조, 16개 파일)
- Phase 2: bot-engineer + dashboard-engineer + infra-engineer 병렬 (35개 파일)
- Phase 3: infra-engineer 통합 QA (CRITICAL 0건, WARNING 0건)
- Phase 4: architect 최종 통합 (`npm run build` 성공)

**생성된 파일 총계**: ~51개 소스 파일 + 6개 `_workspace` 문서
