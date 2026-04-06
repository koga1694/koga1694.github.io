---
title: "아키텍처"
description: "시스템 구조, 기술 스택, 그리고 각 모듈이 어떻게 연결되는지"
order: 2
---

## 전체 구조 한눈에 보기

DoItYourself는 하나의 **데스크톱 앱** 안에서 모든 것이 돌아간다. 외부 서버, Docker, 클라우드 계정 없이도 완전히 동작한다.

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron Desktop App                       │
│                                                              │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  Setup Wizard  │  │  Dashboard    │  │  Chat          │  │
│  │  (초기 설정)    │  │  (프로젝트)   │  │  Workspace     │  │
│  └───────┬────────┘  └──────┬────────┘  └──────┬─────────┘  │
│          └─────────────────┬┴───────────────────┘            │
│                            ↓ IPC 통신 (30채널)                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                      Core Engine                         │ │
│  │                                                          │ │
│  │  [Discord Bot] ──────┐                                   │ │
│  │  [Telegram Bot] ─────┼──→ [AI Engine] → [Workspace]     │ │
│  │  [Chat Handler] ─────┘         ↓              ↓         │ │
│  │                        [Deploy: Vercel/Netlify]          │ │
│  │                        [Preview Server + Tunnel]         │ │
│  │                        [GitHub Integration]              │ │
│  │                        [Security: safeStorage]           │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Electron 앱은 크게 두 부분으로 나뉜다.

- **렌더러 프로세스**: React로 만든 UI (Setup Wizard, 대시보드, 채팅 워크스페이스, 설정 페이지)
- **메인 프로세스**: Node.js로 돌아가는 실제 로직 (Discord/Telegram 봇, AI 엔진, 파일 시스템)

이 둘은 **IPC(Inter-Process Communication)** 라는 메시지 전달 방식으로 통신한다. 마치 프론트엔드와 백엔드가 API로 통신하는 것처럼. 초기 12개 채널에서 현재 **30개**로 확장됐다.

---

## 기술 스택

| 레이어 | 기술 | 선택 이유 |
|---|---|---|
| **데스크톱 앱** | Electron v28 | Node.js가 기본 내장. `.exe` 설치 파일로 배포 가능 |
| **UI** | React 18 + Vite | Electron 내장 웹뷰에서 그대로 동작 |
| **Discord 봇** | discord.js v14 | 가장 성숙한 Discord 봇 라이브러리 |
| **Telegram 봇** | telegraf | Telegram 봇 표준 프레임워크 |
| **데이터베이스** | SQLite (Prisma ORM) | 로컬 파일 하나로 동작. 서버 불필요 |
| **AI 엔진** | Gemini / Claude / Codex | 사용자가 이미 쓰는 서비스 선택 |
| **미리보기** | Express + Puppeteer | 로컬 서버로 결과물 서빙 + 스크린샷 |
| **외부 공개 URL** | ngrok / cloudflared | 로컬 서버를 외부에서 접근 가능하게 터널링 |
| **GitHub 연동** | Octokit (GitHub API) | 자동 레포 생성 + GitHub Pages 배포 |
| **키 보안** | Electron safeStorage | OS 수준 암호화 (Electron 내장 API) |
| **원클릭 배포** | npx vercel / netlify-cli | 설치 없이 서브프로세스로 실행 |
| **언어** | TypeScript | 두 프로세스 모두 타입 안전하게 |
| **테스트** | Vitest | 286개 테스트 (25개 파일) |
| **CI/CD** | GitHub Actions | 태그 푸시 → 3플랫폼 자동 빌드 |

---

## 모듈 구조

소스 코드는 크게 4개 영역으로 나뉜다.

```
src/
├── shared/              # 두 프로세스가 함께 쓰는 공통 코드
│   ├── types.ts         # 타입 계약 (가장 중요한 파일, IPC 30채널)
│   └── i18n/            # ko.ts + en.ts (한국어/영어 UI 문자열)
│
├── main/                # Electron 메인 프로세스
│   ├── index.ts         # 앱 시작점, 부트스트랩 순서
│   ├── ipc.ts           # UI ↔ 백엔드 통신 채널 30개
│   ├── chatHandler.ts   # 인앱 채팅 IPC + 스트리밍
│   ├── preload.ts       # 보안 브릿지 (IPC 노출)
│   └── tray.ts          # 시스템 트레이 아이콘
│
├── core/                # 핵심 비즈니스 로직
│   ├── engine/          # AI 엔진 추상화 (Gemini/Claude/Codex)
│   ├── bot/             # Discord 봇 + 슬래시 커맨드 + 버튼 인터랙션
│   ├── telegram/        # Telegram 봇 (/start /new /projects /templates)
│   ├── workspace/       # 프로젝트 파일 관리 + Git 버전관리
│   ├── preview/         # 미리보기 서버 + 터널 + 스크린샷
│   ├── deploy/          # Vercel + Netlify 원클릭 배포
│   ├── github/          # GitHub 레포 생성 + Pages 배포
│   ├── security/        # keychain.ts — OS 수준 API 키 암호화
│   └── db/              # Prisma 레포지토리 (Project/Session/Settings/ChatMessage)
│
└── renderer/            # React UI (Electron 렌더러)
    ├── pages/
    │   ├── Setup.tsx           # 5단계 초기 설정 마법사
    │   ├── Projects.tsx        # 프로젝트 목록 + 템플릿 갤러리
    │   ├── ProjectDetail.tsx   # 프로젝트 상세 (미리보기 + Git 히스토리)
    │   ├── Settings.tsx        # AI 엔진, API 키, MCP, 봇 제어
    │   └── ChatWorkspace.tsx   # 인앱 채팅 (Claude Desktop 유사 분할 뷰)
    └── hooks/
        ├── useIPC.ts        # IPC 통신 훅
        └── useChatStream.ts # 채팅 스트리밍 상태 + 세션 이어하기
```

---

## 핵심 설계: 타입 계약 (`types.ts`)

이 프로젝트의 가장 중요한 파일은 `src/shared/types.ts`다. 모든 모듈이 이 파일에서 타입을 import한다. 마치 팀원들이 공통으로 합의한 "계약서" 같은 역할.

특히 **IPC 채널**은 상수로 정의해서 실수를 방지했다. 초기 12개에서 지금은 30개로 늘었다:

```typescript
export const IPC = {
  // 설정 (2), 프로젝트 (4), 미리보기 (2), GitHub (1)
  // 봇 (3), Telegram (3), 워크스페이스 (2), 세션 (2)
  // 배포 (2), env (1), QR (1), git (2)
  // 인앱 채팅 (5) - v1.1.0 추가
  CHAT_SEND: 'chat:send',
  CHAT_STOP: 'chat:stop',
  CHAT_HISTORY: 'chat:history',
  CHAT_STREAM: 'chat:stream',    // push 방식 (webContents.send)
  CHAT_NEW_SESSION: 'chat:new-session',
} as const
```

**CHAT_STREAM의 특수성**: 다른 30개 채널은 렌더러가 요청하고 메인이 응답하는 방식(ipcMain.handle)인데, CHAT_STREAM만 메인이 렌더러에 일방적으로 push한다. AI 스트리밍 이벤트를 실시간으로 전달하기 위해서.

---

## AI 엔진 추상화 (Strategy 패턴)

세 가지 AI 엔진(Gemini, Claude, Codex)을 **같은 인터페이스**로 추상화했다.

```typescript
interface AIEngine {
  readonly name: AIEngineName

  query(prompt: string, workspacePath: string, systemPrompt?: string): AsyncIterable<StreamEvent>
  resumeSession(sessionId: string, prompt: string, workspacePath: string): AsyncIterable<StreamEvent>

  getLastSessionId(): string | null
  dispose(): void
}
```

**엔진별 구현 방식:**
- **Gemini**: `npx @google/gemini-cli -p "prompt"` 서브프로세스 spawn + stdout 스트리밍
- **Claude**: `@anthropic-ai/claude-agent-sdk`의 `query()` API (실제 파일 편집/Bash 실행 가능)
- **Codex**: `npx @openai/codex` 서브프로세스 spawn + stdout 스트리밍

---

## 인앱 채팅 워크스페이스 (v1.1.0)

기존 Discord/Telegram 봇 외에, 앱 내부에서 직접 AI와 채팅할 수 있는 기능을 v1.1.0에서 추가했다.

```
ProjectDetail 페이지
  → "AI 채팅" 버튼
  → /projects/:id/chat (ChatWorkspace)
       ┌──────────────────┬──────────────────┐
       │   채팅 영역        │   미리보기 / 파일  │
       │ [사용자 메시지]    │  [iframe 미리보기] │
       │ [AI 스트리밍↓]    │  [파일 목록]      │
       │ [입력창]          │                  │
       └──────────────────┴──────────────────┘
```

**핵심 설계 포인트:**
- **세션 이어하기**: DB에 저장된 `engineSessionId`로 이전 대화 맥락 유지
- **프로젝트별 독립 취소**: `Map<projectId, AbortController>` — 여러 프로젝트 동시 채팅 지원
- **미리보기 자동 새로고침**: AI 완료 시 iframe key 변경으로 결과물 즉시 반영

---

## 부트스트랩 순서

```
DB 디렉토리 생성 (첫 실행 시 필요)
    ↓
DB 초기화 (Prisma)
    ↓
Settings 로드 → AI Engine 생성 → WorkspaceManager
    ↓
Discord Bot + Telegram Bot 초기화 (토큰 있는 경우)
    ↓
PreviewServer 초기화
    ↓
IPC 핸들러 등록 (30채널)
```

---

## 데이터베이스 구조

| 테이블 | 설명 |
|---|---|
| **Project** | Discord/Telegram/대시보드에서 생성된 프로젝트. 이름, 타입, 상태, 스레드 ID, 워크스페이스 경로, 배포 URL |
| **Session** | AI와의 대화 세션. 엔진 세션 ID, 대화 횟수, 비용 |
| **Settings** | 앱 전체 설정 싱글턴. AI 엔진, API 키들, MCP 서버 목록(JSON), 언어 |
| **ChatMessage** | 인앱 채팅 메시지. 역할(user/assistant), 내용, 도구 이벤트(JSON) |

---

## 보안

**API 키 저장**: Electron의 `safeStorage` API로 OS 수준 암호화. macOS는 Keychain, Windows는 DPAPI, Linux는 libsecret을 사용한다. DB 파일을 직접 열어도 키가 평문으로 보이지 않는다.

**미리보기 서버 접근 제어**: 워크스페이스를 서빙할 때 `.env`, `.git`, `node_modules`, `.prisma` 경로를 미들웨어로 차단(403)한다. 없으면 GitHub 토큰이 담긴 `.git/config`가 외부에 노출될 수 있다.

**외부 명령 실행**: 모든 서브프로세스는 `child_process.execFile`을 사용한다. 명령어와 인자를 분리해서 배열로 전달하기 때문에 쉘 인젝션이 불가능하다.
