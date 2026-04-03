---
title: "의사결정 로그"
description: "기술 선택의 이유, 막혔던 것들, 그리고 해결 방법"
order: 4
---

개발하면서 "왜 이렇게 했지?" 싶을 만한 선택들을 기록한다.

---

## SQLite에서 Prisma enum을 쓸 수 없다

**상황**: Prisma ORM을 쓸 때 `enum` 타입을 정의하면 코드가 깔끔해진다. 예를 들어 `ProjectStatus`를 enum으로 만들면 `CREATING | ACTIVE | DEPLOYED` 같은 값만 허용된다는 것이 타입 시스템에서 보장된다.

**문제**: SQLite가 enum 타입을 지원하지 않는다. Prisma로 스키마를 작성할 때 `enum`을 쓰면 SQLite에서는 오류가 난다.

**해결**: 모든 enum 필드를 `String`으로 바꾸고, 허용 값을 주석으로 명시했다.

```prisma
model Project {
  // String이지만 실제로는 ProjectStatus enum 값만 들어가야 함
  // 허용값: CREATING | ACTIVE | BUILDING | PREVIEW | DEPLOYED | ARCHIVED
  status String @default("CREATING")
}
```

타입 안전성은 TypeScript 코드 레벨에서만 보장된다. DB 레벨에서는 강제되지 않는다는 트레이드오프가 있다. 하지만 외부 서버 없이 로컬에서 돌리려면 SQLite가 최선이었으므로, 이 트레이드오프를 감수했다.

---

## ngrok 패키지 버전 혼란

**상황**: 처음에 `package.json`에 `ngrok@^5.0.0`을 넣었다.

**문제**: npm에 `ngrok@5.0.0`이라는 패키지가 없었다. 예전 `ngrok` 패키지(v4까지)와 새 공식 패키지(`@ngrok/ngrok`)가 별도 패키지명으로 분리됐는데, 이걸 모르고 잘못된 버전을 지정한 것.

**해결**: `@ngrok/ngrok@^1.7.0`으로 변경. 이 패키지는 ngrok의 공식 Node.js SDK로, API도 완전히 다르다.

```typescript
// @ngrok/ngrok의 사용 방식
import ngrok from '@ngrok/ngrok'
const listener = await ngrok.forward({ addr: 3456, authtoken_from_env: true })
const url = listener.url()
// 종료 시
await ngrok.disconnect(url)
```

---

## ClaudeEngine 스텁 → 실제 구현 교체

**상황**: Phase 2에서 bot-engineer가 `ClaudeEngine`을 구현해야 했는데, `@anthropic-ai/claude-agent-sdk`의 API가 아직 확정되지 않은 상태였다.

**결정**: 일단 스텁(빈 구현체)으로 만들고, 나중에 교체하기로 했다. 인터페이스만 맞추면 되기 때문에 다른 모듈에 영향이 없다.

스텁은 `AIEngine` 인터페이스를 구현하되 `query()`가 바로 `done` 이벤트를 반환하는 방식으로 만들었다. 덕분에 UI 개발과 봇 로직 개발은 실제 AI 없이도 진행할 수 있었다.

**교체**: 빌드 완성 후 `@anthropic-ai/sdk v0.80.0`으로 교체. Anthropic의 기본 API로 스트리밍을 구현했다. 멀티턴은 대화 히스토리를 인메모리 Map에 저장하는 방식으로 구현.

이 교체 작업이 다른 모듈에 전혀 영향을 주지 않은 것은 `AIEngine` 인터페이스 덕분이다. 인터페이스만 맞추면 내부 구현은 마음대로 바꿀 수 있다.

---

## 모든 외부 명령 실행에 `execFile` 사용

**상황**: 앱이 내부적으로 git 명령, npm 명령, 프로젝트 템플릿 생성 스크립트 등을 실행한다.

**문제**: Node.js에서 외부 명령을 실행할 때 명령어를 문자열로 만들어서 쉘에 전달하면, 사용자 입력이 포함된 문자열에 악의적인 코드가 끼어들 수 있다 — 이것을 **쉘 인젝션**이라고 한다.

예를 들어 `git commit -m "사용자입력"` 같은 패턴에서 사용자 입력에 `"; rm -rf ~; echo "`이 포함되면 파일이 삭제될 수 있다.

**해결**: Node.js의 `child_process.execFile`을 사용. 명령어와 인자를 분리해서 배열로 전달하면 쉘을 거치지 않아서 인젝션이 불가능하다.

```typescript
// 안전한 방식 — 명령어와 인자를 분리
execFile('git', ['commit', '-m', message])
// message가 뭐든 그냥 인자로 전달됨. 쉘 해석이 없음.
```

도구를 비개발자에게 배포하는 앱이기 때문에, 보안에 더 신경썼다.

---

## PreviewServer 단일 포트

**상황**: 여러 프로젝트를 동시에 미리볼 수 있어야 하는가?

**결정**: 일단 단일 포트(3456)로 구현. 한 번에 하나의 프로젝트만 서빙한다.

**트레이드오프**: 동시에 여러 프로젝트를 열어두면 마지막에 미리보기를 요청한 프로젝트가 서빙된다. 초기 버전에서는 이 정도로 충분하다고 판단. 여러 프로젝트를 동시에 활발히 작업하는 경우가 드물기도 하고.

**향후 개선**: 프로젝트별로 포트를 동적으로 할당하거나, URL 경로로 프로젝트를 구분하는 방식으로 개선할 수 있다.

---

## IPC 스텁 패턴

**상황**: Phase 1에서 architect가 UI(렌더러 프로세스)를 만들기 전에 IPC 채널을 미리 등록해야 했다.

**이유**: dashboard-engineer가 UI를 만들 때 IPC를 호출하면, 메인 프로세스에 해당 채널이 등록되어 있어야 에러가 안 난다. 그런데 Phase 1 시점에는 실제 서비스 로직(봇, 엔진 등)이 아직 없다.

**해결**: 모든 채널을 등록하되, `null` 또는 빈 배열을 반환하는 스텁으로 구현.

```typescript
// Phase 1 스텁 — 채널만 등록, 실제 데이터 없음
ipcMain.handle('projects:list', async () => [])
ipcMain.handle('bot:status', async () => false)

// Phase 4에서 실제 구현으로 교체
ipcMain.handle('projects:list', async () => projectRepo.findAll())
ipcMain.handle('bot:status', async () => discordClient?.isReady() ?? false)
```

이 패턴 덕분에 3명의 에이전트가 서로를 기다리지 않고 병렬로 작업할 수 있었다.

---

## DI 없이 서비스 전달

**상황**: IPC 핸들러들이 여러 서비스(봇, AI 엔진, 워크스페이스 매니저 등)를 사용해야 한다. 어떻게 전달할까?

**선택지**:
1. 싱글턴 패턴 — 전역 변수에 저장
2. DI(Dependency Injection) 컨테이너 — 복잡하지만 테스트 용이
3. 함수 파라미터로 직접 전달

**결정**: 함수 파라미터로 직접 전달. 앱 규모가 작고, 복잡한 의존성 그래프가 없어서 DI 컨테이너가 과도하다고 판단.

```typescript
// 부트스트랩에서 서비스를 만들고 ipc.ts에 전달
const services = { projectRepo, aiEngine, workspaceManager, discordClient, previewServer }
registerIPC(services)

// ipc.ts에서 파라미터로 받아서 사용
export function registerIPC(services: Services) {
  ipcMain.handle('projects:list', () => services.projectRepo.findAll())
  ipcMain.handle('bot:start', () => services.discordClient.login())
}
```

---

## Discord PartialGroupDMChannel 타입 에러

**상황**: Discord 메시지 핸들러에서 `message.channel.send()`를 호출했더니 TypeScript 에러가 났다.

**이유**: Discord.js에서 `message.channel`의 타입은 `TextChannel | NewsChannel | PartialGroupDMChannel | ...` 여러 가지다. 그런데 `PartialGroupDMChannel`에는 `.send()` 메서드가 없다.

**해결**: 타입 가드로 `.send()`가 있는 채널인지 먼저 확인.

```typescript
if (!('send' in channel)) return  // send 메서드가 없으면 무시
const textChannel = channel as TextChannel
await textChannel.send(embed)
```

타입 시스템이 실제 런타임 에러를 사전에 잡아준 케이스다.
