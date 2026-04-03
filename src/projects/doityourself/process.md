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
| **bot-engineer** | 코어 파이프라인 | Discord 봇 + AI 엔진 + 워크스페이스 |
| **dashboard-engineer** | 프론트엔드 | React 대시보드 + Setup Wizard |
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

`useIPC()` 훅을 만들어서 모든 IPC 통신이 이 훅을 통하도록 했다. `window.electronAPI.invoke`를 직접 호출하면 오타가 생길 수 있어서.

### infra-engineer (6개 파일)

미리보기 서비스와 GitHub 연동을 구현했다.

- Express 정적 파일 서버 (포트 3456) — 만들어진 프로젝트를 로컬에서 서빙
- Puppeteer 스크린샷 — 완성된 결과물을 1280×720으로 캡처해서 Discord에 전송
- ngrok 터널 (cloudflared 폴백) — 로컬 서버를 외부 URL로 공개
- GitHub 연동 — 레포 생성, git 자동화, GitHub Pages 활성화

---

## Phase 3: 통합 QA (infra-engineer)

3명이 병렬로 만든 코드가 서로 잘 맞는지 확인하는 단계. 한 모듈만 봐서는 경계면(boundary) 버그가 안 보이기 때문에, **생산자 코드와 소비자 코드를 동시에** 보는 방식으로 검증했다.

검증 항목:

1. TypeScript 전체 컴파일 (`tsc --noEmit`) — 에러 0개
2. AI Engine 인터페이스 ↔ 3개 구현체 시그니처 일치 여부
3. IPC 채널 — main에서 등록한 12개 채널이 renderer에서 올바르게 호출되는지
4. Prisma 스키마 ↔ Repository 클래스 — 필드명, 타입 일치 여부
5. 워크스페이스 경로 흐름 — 워크스페이스 매니저 → 봇 → DB → 미리보기 서버까지 동일한 경로를 쓰는지
6. 봇 ↔ 엔진 — 메시지 핸들러가 엔진을 올바른 인자로 호출하는지

결과: **CRITICAL 0건, WARNING 0건**. Phase 4로 진행.

---

## Phase 4: 최종 통합 (architect)

QA를 통과한 코드를 실제로 연결하는 마지막 단계.

architect가 `src/main/ipc.ts`의 12개 빈 스텁을 실제 서비스 모듈 호출로 교체했다. `registerIPC(services)` 패턴 — 부트스트랩에서 생성한 서비스 인스턴스를 함수 파라미터로 전달받아서 사용.

```
npx tsc -p tsconfig.main.json --noEmit — 에러 0개
npx tsc --noEmit — 에러 0개
npm run build:main — 성공
npm run build:renderer — 성공 (40 modules, 569ms)
```

---

## 후속 작업

빌드가 완성된 후 두 가지를 추가로 처리했다.

1. **ClaudeEngine 실제 구현**: `@anthropic-ai/sdk v0.80.0`으로 교체. API key 방식과 OAuth 방식 모두 지원. 멀티턴은 인메모리 대화 히스토리 Map으로 구현.

2. **IPC 채널 UI 연결**: QA 리포트에서 7개 채널이 렌더러에서 호출되지 않는다고 나왔는데, 실제로는 UI에 해당 기능이 없었던 것. 봇 제어(시작/중지/상태), 프로젝트 삭제, 미리보기 URL/스크린샷 버튼을 각 페이지에 추가했다.

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
