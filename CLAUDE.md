# CLAUDE.md

## gstack

Use the /browse skill from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

### Available skills

/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade

## 상태관리 원칙

- 클라이언트 사이드 서버 데이터는 TanStack Query(`useQuery`/`useMutation`)로 관리한다
- 서버 컴포넌트는 직접 SSR fetch 후 `initialData` 패턴으로 TanStack Query에 연결한다 (`useUserSlots`, `useExerciseVideos` 참고)
- 전역 UI 상태는 Zustand, 로컬 UI 상태(열림/닫힘 등)는 `useState`
- `supabase` 클라이언트는 모듈 레벨에서 한 번만 생성한다 (`lib/hooks/query-hooks.ts` 참고)

## 기능 구현 전 필수 절차

기능 추가 또는 수정 요청을 받으면 코드를 작성하기 전에 반드시 다음 순서를 따른다:

1. **아키텍처 및 전략 설명**: 구현 방식, 파일 구조, 데이터 흐름, 관련 기술 선택 이유를 먼저 설명한다
2. **사용자 동의 대기**: 설명 후 사용자의 명시적 동의("진행해줘", "ok", "좋아" 등)를 받은 후에만 코드를 작성한다
3. 동의 없이 먼저 코드를 작성하지 않는다

## 새 기능 추가 시

- 데이터 페칭/뮤테이션 훅은 `lib/hooks/query-hooks.ts`에 추가한다
- `useState + useEffect`로 직접 fetch하는 패턴은 사용하지 않는다
- `window.confirm()` 대신 인라인 확인 UI를 쓴다
- 에러 발생 시 반드시 사용자에게 화면으로 피드백을 제공한다


## main 브랜치에 PR시
- PR 전에 빌드, 테스트 코드, e2e 테스트 후 완료후 main 브랜치와 merge 하는 PR 을 작성한다.
- PR 본문에 "Generated with Claude Code" 문구를 포함하지 않는다.
