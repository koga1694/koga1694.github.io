---
title: "작업 이력"
description: "언제 무엇을 만들었는지 타임라인"
order: 5
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
