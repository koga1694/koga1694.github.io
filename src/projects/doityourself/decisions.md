---
title: "의사결정 로그"
description: "기술 선택의 이유, 막혔던 것들, 그리고 해결 방법"
order: 4
---

개발하면서 "왜 이렇게 했지?" 싶을 만한 선택들을 기록한다.

---

## SQLite에서 Prisma enum을 쓸 수 없다

**상황**: Prisma ORM을 쓸 때 `enum` 타입을 정의하면 코드가 깔끔해진다. 예를 들어 `ProjectStatus`를 enum으로 만들면 `CREATING | ACTIVE | DEPLOYED` 같은 값만 허용된다는 것이 타입 시스템에서 보장된다.

**문제**: SQLite가 enum 타입을 지원하지 않는다.

**해결**: 모든 enum 필드를 `String`으로 바꾸고, 허용 값을 주석으로 명시했다.

```prisma
model Project {
  // 허용값: CREATING | ACTIVE | BUILDING | PREVIEW | DEPLOYED | ARCHIVED
  status String @default("CREATING")
}
```

타입 안전성은 TypeScript 코드 레벨에서만 보장된다. DB 레벨에서는 강제되지 않는다는 트레이드오프가 있다. 하지만 외부 서버 없이 로컬에서 돌리려면 SQLite가 최선이었으므로, 이 트레이드오프를 감수했다.

---

## ngrok 패키지 버전 혼란

**상황**: 처음에 `package.json`에 `ngrok@^5.0.0`을 넣었다.

**문제**: npm에 `ngrok@5.0.0`이 없었다. 예전 `ngrok` 패키지(v4까지)와 새 공식 패키지(`@ngrok/ngrok`)가 별도 패키지명으로 분리됐는데, 이걸 모르고 잘못된 버전을 지정한 것.

**해결**: `@ngrok/ngrok@^1.7.0`으로 변경.

---

## ClaudeEngine 스텁 → 실제 구현 교체

**상황**: Phase 2에서 bot-engineer가 `ClaudeEngine`을 구현해야 했는데, `@anthropic-ai/claude-agent-sdk`의 API가 아직 확정되지 않은 상태였다.

**결정**: 일단 스텁(빈 구현체)으로 만들고, 나중에 교체하기로 했다. `AIEngine` 인터페이스만 맞추면 내부 구현은 마음대로 바꿀 수 있기 때문이다.

스텁은 `query()`가 바로 `done` 이벤트를 반환하는 방식으로 만들었다. 덕분에 UI 개발과 봇 로직 개발은 실제 AI 없이도 진행할 수 있었다.

**교체**: 빌드 완성 후 `@anthropic-ai/sdk v0.80.0`으로 교체. 이 교체 작업이 다른 모듈에 전혀 영향을 주지 않은 것은 `AIEngine` 인터페이스 덕분이다.

---

## 외부 명령 실행 보안

**문제**: Node.js에서 외부 명령을 문자열로 만들어 쉘에 전달하면, 사용자 입력이 포함된 경우 악의적인 코드가 끼어들 수 있다 — **쉘 인젝션**.

예를 들어 커밋 메시지에 `; rm -rf ~/`이 포함되면 파일이 삭제될 수 있다.

**해결**: `child_process.execFile`을 사용한다. 명령어와 인자를 **배열로 분리**해서 전달하면 쉘을 거치지 않아서 인젝션이 불가능하다.

```
명령어 + 인자 분리:
  명령: 'git'
  인자: ['commit', '-m', message]
  → message에 무엇이 들어오든 그냥 인자로 전달됨. 쉘 해석 없음.
```

도구를 비개발자에게 배포하는 앱이기 때문에, 보안에 더 신경썼다.

---

## IPC 스텁 패턴

**상황**: Phase 1에서 architect가 UI를 만들기 전에 IPC 채널을 미리 등록해야 했다. 그런데 Phase 1 시점에는 실제 서비스 로직이 아직 없다.

**해결**: 모든 채널을 등록하되, `null` 또는 빈 배열을 반환하는 스텁으로 구현. Phase 4에서 실제 구현으로 교체.

이 패턴 덕분에 3명의 에이전트가 서로를 기다리지 않고 병렬로 작업할 수 있었다.

---

## DI 없이 서비스 전달

**선택지**: 싱글턴 전역변수 / DI 컨테이너 / 함수 파라미터 직접 전달

**결정**: 함수 파라미터로 직접 전달. 앱 규모가 작고 복잡한 의존성 그래프가 없어서 DI 컨테이너가 과도하다고 판단.

```typescript
const services = { projectRepo, aiEngine, workspaceManager, discordClient, previewServer }
registerIPC(services)
```

---

## keytar → Electron safeStorage

**초기 설계**: `keytar` 패키지를 사용해서 OS 키체인에 API 키를 저장하려 했다.

**문제**: `keytar`는 네이티브 모듈이라 Electron 버전과 Node.js 버전 조합에 따라 ABI가 맞지 않아 재컴파일이 필요할 수 있다. 배포 시 빌드 환경에 따라 깨지는 경우가 생겼다.

**해결**: `electron.safeStorage`로 교체. Electron에 내장된 API라 별도 패키지 불필요. macOS는 Keychain, Windows는 DPAPI, Linux는 libsecret을 자동으로 사용한다. `isEncryptionAvailable()`이 `false`인 환경에서는 SQLite 평문 폴백.

---

## Telegram: getter 함수 패턴

**상황**: Telegram 봇 핸들러에 AI 엔진 인스턴스를 직접 전달했다.

**문제**: 사용자가 Settings에서 AI 엔진을 Gemini → Claude로 변경해도 Telegram 봇은 구버전 Gemini 엔진을 계속 사용한다. 함수는 `registerHandlers(bot, services.aiEngine)` 호출 시점의 값을 캡처(클로저)하기 때문이다.

```typescript
// 잘못된 방식 — 호출 시점 엔진을 캡처
registerHandlers(bot, services.aiEngine)

// 올바른 방식 — 매번 현재 엔진을 가져옴
registerHandlers(bot, () => services.aiEngine)
```

이 패턴을 "getter 함수 패턴"이라고 부른다. Discord 봇은 `let aiEngine` 변수 직접 변이 방식으로 해결했지만, Telegram은 별도 모듈 구조라 getter 패턴이 더 적합했다.

---

## `process.env` 스프레드 순서

**상황**: Claude 엔진을 spawn할 때 API 키를 환경변수로 전달했다.

**버그**: `{ ANTHROPIC_API_KEY: this.apiKey, ...process.env }` 순서로 작성하면, 시스템에 이미 `ANTHROPIC_API_KEY`가 설정되어 있을 경우 spread가 덮어씌워버린다. 사용자가 설정한 API 키 대신 시스템 환경변수의 키가 사용되는 것.

**해결**: API 키를 항상 **뒤에** 배치한다.

```typescript
// 올바른 순서 — 사용자 설정이 시스템 환경변수를 덮어쓴다
{ ...process.env, ANTHROPIC_API_KEY: this.apiKey }
```

소리 없이 잘못 동작하는 버그라서 찾기 특히 어려웠다.

---

## server.close() hang 방지

**상황**: Preview 서버를 `stop()`할 때 `server.close(callback)`을 호출하면 callback이 영원히 호출되지 않아 앱이 멈추는 현상이 있었다.

**이유**: Node.js의 `server.close()`는 새 연결을 거부하지만, 이미 열려 있는 keep-alive 연결이 닫힐 때까지 기다린다. 브라우저에서 미리보기 iframe이 keep-alive로 연결되어 있으면 영원히 닫히지 않는다.

**해결**: Node.js 18.2+에서 추가된 `server.closeAllConnections()`를 먼저 호출한다.

```typescript
server.closeAllConnections?.()  // 모든 연결 강제 종료
server.close(callback)          // 이제 즉시 닫힌다
```

---

## engineReplacePromise 직렬화

**상황**: 사용자가 설정에서 AI 엔진을 빠르게 두 번 바꾸면 두 엔진 교체 작업이 동시에 실행됐다.

**문제**: 엔진 교체는 비동기 작업인데, 첫 번째 교체가 완료되기 전에 두 번째 교체가 시작되면 race condition이 발생한다. 잘못된 엔진이 활성화되거나 dispose가 두 번 호출될 수 있다.

**해결**: boolean 플래그 대신 Promise 체인으로 직렬화한다.

```typescript
let engineReplacePromise: Promise<void> | null = null

engineReplacePromise = (engineReplacePromise ?? Promise.resolve())
  .then(() => doReplace())
  .finally(() => { engineReplacePromise = null })
//                  ^ finally 안에서만 null 리셋해야 한다
//                    밖에서 하면 다음 교체 전에 null이 되어 직렬화가 깨진다
```

---

## Prisma 패키징 문제

**상황**: 개발 환경에서는 잘 동작하던 앱이, `npm run package`로 패키징한 후 배포하면 "Cannot find module 'prisma/client/default'" 에러로 시작이 안 됐다.

**이유**: Electron 앱은 기본적으로 모든 파일을 `asar` 아카이브로 압축한다. Prisma는 native `.node` 바이너리 파일을 사용하는데, asar 내부에서는 이 바이너리를 실행할 수 없다.

**해결**: `electron-builder.yml`에 `asarUnpack` 설정으로 해당 파일들을 asar 밖에 두도록 지정.

```yaml
asarUnpack:
  - "node_modules/.prisma/**/*"
  - "node_modules/@prisma/engines/**/*"
```

추가로 `prisma/schema.prisma`에 `binaryTargets`를 명시해서 각 OS에 맞는 바이너리가 포함되도록 해야 한다:

```prisma
binaryTargets = ["native", "windows", "debian-openssl-3.0.x"]
```

그리고 첫 실행 시 DB 파일이 저장될 디렉토리(`~/DoItYourself/`)가 없어서 Prisma가 초기화에 실패하는 문제도 있었다. `mkdirSync(dbDir, { recursive: true })`로 PrismaClient 생성 전에 디렉토리를 먼저 만든다.

---

## CHAT_STREAM: push 방식 IPC

**상황**: 인앱 채팅 기능을 구현할 때, AI 스트리밍 이벤트를 렌더러에 어떻게 전달할지 결정해야 했다.

**기존 방식** (30개 채널 중 29개): 렌더러가 `invoke(IPC.xxx)`로 요청하고 메인이 응답하는 단방향 요청-응답.

**문제**: 스트리밍은 이벤트가 수십 개씩 순서대로 오는 것인데, 요청-응답 방식으로는 한 번의 호출에 하나의 응답만 받을 수 있다.

**해결**: `event.sender.send(IPC.CHAT_STREAM, event)` — 메인 프로세스가 렌더러에 일방적으로 push. 렌더러는 `window.electronAPI.on(IPC.CHAT_STREAM, handler)`로 수신한다. WebSocket의 서버 push와 같은 개념이다.

이 방식의 주의점: `sender.isDestroyed()` 체크가 필수. 렌더러가 닫힌 상태에서 push하면 크래시.

---

## GitHub force-push 조건부 적용

**상황**: GitHub Sync에서 push가 실패할 때 자동으로 `--force-with-lease`로 재시도하도록 구현했다.

**문제**: 네트워크 에러나 인증 실패도 "push 실패"인데, 이 경우에도 force-push를 시도하면 의미 없는 재시도이거나, 운이 나쁘면 원격 브랜치를 덮어쓸 수 있다.

**해결**: stderr에 `non-fast-forward` 또는 `fetch first`가 포함된 경우에만 force-push 재시도. 다른 에러는 그대로 re-throw.

---

## Discord PartialGroupDMChannel 타입 에러

**상황**: Discord 메시지 핸들러에서 `message.channel.send()`를 호출했더니 TypeScript 에러가 났다.

**이유**: Discord.js에서 `message.channel`의 타입은 `TextChannel | NewsChannel | PartialGroupDMChannel | ...` 여러 가지다. `PartialGroupDMChannel`에는 `.send()` 메서드가 없다.

**해결**: 타입 가드로 `.send()`가 있는 채널인지 먼저 확인.

```typescript
if (!('send' in channel)) return  // send 메서드가 없으면 무시
const textChannel = channel as TextChannel
await textChannel.send(embed)
```

타입 시스템이 실제 런타임 에러를 사전에 잡아준 케이스다.
