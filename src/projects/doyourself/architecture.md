---
title: "아키텍처"
description: "시스템 구조, 기술 스택, 그리고 각 모듈이 어떻게 연결되는지"
order: 2
---

## 전체 구조 한눈에 보기

DoYourself는 하나의 **데스크톱 앱** 안에서 모든 것이 돌아간다. 외부 서버, Docker, 클라우드 계정 없이도 완전히 동작한다.

```
┌─────────────────────────────────────────────────────┐
│                Electron Desktop App                  │
│                                                      │
│  ┌────────────────┐       ┌──────────────────────┐  │
│  │  Setup Wizard  │       │    Web Dashboard      │  │
│  │  (초기 설정)    │       │   (프로젝트 관리)      │  │
│  └────────┬───────┘       └──────────┬────────────┘  │
│           └────────────┬─────────────┘               │
│                        ↓ IPC 통신                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │                 Core Engine                     │  │
│  │                                                 │  │
│  │  [Discord Bot] → [AI Engine] → [Workspace]      │  │
│  │                                 ↓               │  │
│  │                 [Preview Server + Tunnel]        │  │
│  │                                 ↓               │  │
│  │                 [GitHub Integration]             │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Electron 앱은 크게 두 부분으로 나뉜다.

- **렌더러 프로세스**: React로 만든 UI (Setup Wizard, 대시보드, 설정 페이지)
- **메인 프로세스**: Node.js로 돌아가는 실제 로직 (Discord 봇, AI 엔진, 파일 시스템)

이 둘은 **IPC(Inter-Process Communication)** 라는 메시지 전달 방식으로 통신한다. 마치 프론트엔드와 백엔드가 API로 통신하는 것처럼.

---

## 기술 스택

| 레이어 | 기술 | 선택 이유 |
|---|---|---|
| **데스크톱 앱** | Electron v28 | Node.js가 기본 내장. `.exe` 설치 파일로 배포 가능 |
| **UI** | React 18 + Vite | Electron 내장 웹뷰에서 그대로 동작 |
| **Discord 봇** | discord.js v14 | 가장 성숙한 Discord 봇 라이브러리 |
| **데이터베이스** | SQLite (Prisma ORM) | 로컬 파일 하나로 동작. 서버 불필요 |
| **AI 엔진** | Gemini / Claude / Codex | 사용자가 이미 쓰는 서비스 선택 |
| **미리보기** | Express + Puppeteer | 로컬 서버로 결과물 서빙 + 스크린샷 |
| **외부 공개 URL** | ngrok / cloudflared | 로컬 서버를 외부에서 접근 가능하게 터널링 |
| **GitHub 연동** | Octokit (GitHub API) | 자동 레포 생성 + GitHub Pages 배포 |
| **키 보안** | keytar (OS keychain) | API 키를 운영체제 수준 암호화로 저장 |
| **언어** | TypeScript | 두 프로세스 모두 타입 안전하게 |

---

## 모듈 구조

소스 코드는 크게 4개 영역으로 나뉜다.

```
src/
├── shared/          # 두 프로세스가 함께 쓰는 공통 코드
│   ├── types.ts     # 타입 계약 (가장 중요한 파일)
│   └── i18n/ko.ts   # 한국어 UI 문자열
│
├── main/            # Electron 메인 프로세스
│   ├── index.ts     # 앱 시작점, 부트스트랩 순서
│   ├── ipc.ts       # UI ↔ 백엔드 통신 채널 12개
│   ├── preload.ts   # 보안 브릿지 (IPC 노출)
│   └── tray.ts      # 시스템 트레이 아이콘
│
├── core/            # 핵심 비즈니스 로직
│   ├── engine/      # AI 엔진 추상화
│   ├── bot/         # Discord 봇
│   ├── workspace/   # 프로젝트 파일 관리
│   ├── preview/     # 미리보기 서버 + 터널
│   └── github/      # GitHub 연동
│
└── renderer/        # React UI (Electron 렌더러)
    ├── pages/
    │   ├── Setup.tsx        # 5단계 초기 설정 마법사
    │   ├── Projects.tsx     # 프로젝트 목록
    │   ├── ProjectDetail.tsx # 프로젝트 상세 (미리보기)
    │   └── Settings.tsx     # 설정 페이지
    └── hooks/useIPC.ts      # IPC 통신 훅
```

---

## 핵심 설계: 타입 계약 (`types.ts`)

이 프로젝트의 가장 중요한 파일은 `src/shared/types.ts`다. 모든 모듈이 이 파일에서 타입을 import한다. 마치 팀원들이 공통으로 합의한 "계약서" 같은 역할.

특히 **IPC 채널**은 상수로 정의해서 실수를 방지했다:

```typescript
// UI에서 "settings:get" 같은 문자열을 직접 쓰면 오타가 생길 수 있다.
// 상수로 정의하면 타입 시스템이 오타를 잡아준다.
export const IPC = {
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  PROJECTS_LIST: 'projects:list',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_GET: 'projects:get',
  PROJECTS_DELETE: 'projects:delete',
  PREVIEW_GET_URL: 'preview:get-url',
  PREVIEW_SCREENSHOT: 'preview:screenshot',
  GITHUB_DEPLOY: 'github:deploy',
  BOT_START: 'bot:start',
  BOT_STOP: 'bot:stop',
  BOT_STATUS: 'bot:status',
} as const
```

---

## AI 엔진 추상화 (Strategy 패턴)

세 가지 AI 엔진(Gemini, Claude, Codex)을 **같은 인터페이스**로 추상화했다.

```typescript
interface AIEngine {
  readonly name: AIEngineName      // "gemini" | "claude" | "codex"
  
  // 새 프롬프트 요청 → 스트리밍으로 이벤트 반환
  query(prompt: string, workspacePath: string, systemPrompt?: string): AsyncIterable<StreamEvent>
  
  // 기존 대화 이어서 계속 (멀티턴)
  resumeSession(sessionId: string, prompt: string, workspacePath: string): AsyncIterable<StreamEvent>
  
  getLastSessionId(): string | null
  dispose(): void
}
```

`AsyncIterable<StreamEvent>`는 "이벤트가 들어올 때마다 하나씩 전달해주는 스트림"이다. AI가 코드를 짜는 동안 실시간으로 진행 상황을 받아서 Discord에 업데이트할 수 있다.

사용자가 설정에서 AI 엔진을 바꿔도, Discord 봇 코드나 UI 코드는 **전혀 수정할 필요가 없다**. `createEngine(settings)` 팩토리 함수가 설정에 맞는 엔진 인스턴스를 만들어 줄 뿐.

---

## 이벤트 번역기 (`translator.ts`)

AI 엔진이 내뱉는 기술적인 이벤트들을 사용자 친화적인 한국어로 변환하는 모듈이다.

| AI 내부 이벤트 | 사용자에게 보이는 메시지 |
|---|---|
| `npm install` 실행 | "필요한 도구를 설치하고 있어요..." |
| 파일 편집 (`Write` 도구) | "✏️ style.css 파일을 수정하고 있어요..." |
| 파일 읽기 (`Read`, `Grep`) | *(사용자에게 표시 안 함 — 내부 작업)* |
| 에러 발생 + 수정 중 | "⚠️ 문제를 발견했어요. 고치고 있어요!" |
| 완료 | "✅ 완성됐어요!" |

이 번역기 덕분에 사용자는 "npm이 뭔지" 몰라도 된다.

---

## Discord 봇 플로우

사용자가 Discord에 메시지를 보내면 다음 순서로 처리된다:

```
1. 메시지 수신
   ↓
2. Discord 스레드 생성 (프로젝트별 대화 공간)
   ↓
3. 메시지 키워드로 프로젝트 타입 감지
   (game/웹/python/사이트 등)
   ↓
4. DB에 프로젝트 레코드 생성
   + 워크스페이스 디렉토리 생성
   ↓
5. AI 엔진에 요청 (시스템 프롬프트 포함)
   ↓
6. 스트리밍 이벤트 수신 → 번역 → Discord 임베드 업데이트
   (500ms 디바운스로 Discord API 과도 호출 방지)
   ↓
7. 완료 시 완성 임베드 + 스크린샷 첨부
```

스레드 안에서 이어서 말하면 `resumeSession()`으로 이전 대화 맥락을 유지한다.

---

## 부트스트랩 순서

앱이 시작될 때 서비스들이 순서대로 초기화된다. 순서가 중요하다 — 나중에 올라오는 서비스가 앞서 올라온 서비스에 의존하기 때문이다.

```
DB 초기화 (Prisma)
    ↓
Settings 로드 (DB에서)
    ↓
AI Engine 생성 (설정 기반)
    ↓
WorkspaceManager 초기화
    ↓
Discord Bot 초기화 (토큰이 있는 경우)
    ↓
PreviewServer 초기화
    ↓
IPC 핸들러 등록 (모든 서비스를 파라미터로 전달)
```

---

## 데이터베이스 구조

SQLite 파일 하나에 세 개의 테이블이 있다.

**Project** — Discord에서 생성된 프로젝트 정보
- 프로젝트명, 타입(웹앱/게임 등), 상태, Discord 스레드 ID, 워크스페이스 경로, 배포 URL 등

**Session** — AI와의 대화 세션
- 어떤 프로젝트의 세션인지, AI 엔진 세션 ID, 대화 횟수, 비용 등

**Settings** — 앱 전체 설정 (1개 행만 존재하는 싱글턴)
- AI 엔진 선택, API 키들, Discord 토큰, GitHub 토큰, 언어 설정 등
