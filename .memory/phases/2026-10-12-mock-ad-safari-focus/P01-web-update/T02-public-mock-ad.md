# Task: T02 공개 텍스트 광고 부활

## Status: done

## Goal
명시적 true 플래그로 DEXCONSULTING 5초 광고와 일어서기를 공개하되 정상 기록과 해금을 보존한다.

## Implementation
- `src/config/app.ts` :: `getFeatureFlags(isDev:boolean,enableMockAd:string|undefined):FeatureFlags` modify, exact 'true'면 dev/production 모두 enabled. false/대문자/공백/미설정은 false. 기존 API 인수 유지.
- `src/services/rewardedAds.ts`/config·rewardedAds tests modify: provider mock/disabled만, live SDK 없음. 주석과 테스트의 production 차단 전제를 교정.
- `src/i18n/ko.ts`, `src/screens/MockAdScreen.tsx` modify: DEXCONSULTING/덱스컨설팅을 의도적인 두 줄로 중앙 정렬하고 텍스트 가상 광고 표시. 한국어 회사명 마지막 글자만 줄바꿈되는 것을 방지한다.
- `App.tsx` modify: ranked eligible `!__DEV__`; beginAttempt(true); observeAttempt는 !run.reviveUsed 때만. 로컬 score 저장 유지.
- `src/online/useRankedGame.ts` modify: terminal tick 기록 직후 activeRecording detach; revived tick도 detach만 하고 완료된 전송 session.freeze 금지. 최초 실패 proof의 재시도를 보존한다.
- config/service/character-collection/settings-and-ad/useRankedGame tests modify: 공개 opt-in 버튼, 5초/닫기/1회 유지, 광고 사용 전 해금과 랭킹 정상, 부활 뒤 추가 해금/온라인 tick 차단, 정상 판으로 retry 시 다시 eligible.
- 전체 회귀에서 확인한 `src/game/__tests__/regression.test.ts` modify: 옛 production true 차단 기대를 미설정/false/malformed 차단으로 교정하고 공개 true에서도 REQUEST/CANCEL 반복으로 보상을 얻지 못함을 추가한다. 엔진 코드는 수정하지 않는다.
- `eas.json`, `.github/workflows/deploy-pages.yml`, `.env.example` modify: MOCK_AD true, diagnostics false. 기존 .env 비밀/로컬 설정 수정 금지. EAS 설정 변경은 새 IPA 업로드가 아님.
- `scripts/eas-config.test.mjs`, `scripts/inspect-public-env.mjs`/test modify: mock 입력 exact true 허용, malformed/diagnostics true 여전히 거절. 민감정보 경계 유지.
- `e2e/game.spec.ts`, `e2e/result-layout.spec.ts` modify: retry/home/ad 버튼 3행, 광고 닫기와 완료 후 단1회 부활 회귀. `scripts/export-online-fixture.mjs`는 기존 mock true를 활용해 온라인 경계 재검증.
- `e2e/online.spec.ts` modify: 실제 정상 tick/최초 결과 업로드 검사는 유지하면서 이전 광고 버튼0개/결과2행 기대를 공개 opt-in의 버튼/3행으로 갱신한다.
- `web-static/privacy/index.html`, `store/mock-ad-publication.json` new contract, `scripts/policy-supplement.test.mjs`, `scripts/release-preparation.test.mjs` modify: 기존 승인 문단 보존하면서 한영 가상 광고가 공개됨/SDK·추적없음 표현과 2026-10-12 날짜 변경만 허용. 과거 방침 baseline 검사는 새 명시 변경을 역변환한 뒤 종전 hash로 검사한다. 새 계약은 schemaVersion1, approvedAt string, evidenceSource user_request, previousDate/updateDate string, disclosures locale별 {previous:string,current:string}. Apple 수집표/소개/심사 설문 원격 저장 안 함.
- `docs/development.md`, `docs/learning-notes/2026-10-12-public-mock-ad.md` modify/new: 새 gate·정상/부활 기록 구분·새 빌드 필요.

## Acceptance Criteria
- [x] 광고 버튼/5초/취소/정지/한번 보상, 정상 해금·최초 랭킹·부활 제외·대기 업로드 회귀
- [x] Jest50스위트716개, typecheck/ranked8, release11, tools67, public27, 3번들, 전체 Chromium55pass/11skip/0fail(5.3분)
- [x] 공개 문서의 기존 승인 baseline 유지·SDK/서버 규칙 변경 없음. iPhone Safari/설치된 IPA는 미검증·미변경

## Validation
- `npm.cmd run typecheck`, `npm.cmd run test:ci`, `npm.cmd run ranked:check`
- `npm.cmd run test:release`, `npm.cmd run test:ranking-tools`
- `node --test scripts/verify-web.test.mjs scripts/policy-supplement.test.mjs`
- `npm.cmd run web:export -- --output-dir output/public-links-web` (MOCK_AD true, Supabase public env 빈 local-only QA), `node scripts/verify-web.mjs --dist output/public-links-web`
- `npm.cmd run fixtures:build`, `npm.cmd run online-fixtures:build`
- `npx.cmd playwright test` (PLAYWRIGHT_WEB_DIR=output/public-links-web, 기존 사용자 dist 보존)
- `git diff --check`

## Learning
완료 소스 커밋: `0786111a72148ea1c9eb4624ebea59f1ba0d7210` (정상 main push 완료). 공식 배포 확인은 T03이다.

기능 제공과 점수 공정성은 서로 다른 플래그다. 마지막 tick의 proof와 부활 뒤 로컬 진행 분리. 질문: 광고를 켜기만 해도 정상 랭킹이 꺼지던 이유? 최초 실패 업로드를 freeze하면? 환경변수 수정만으로 설치된 IPA가 바뀌는가?

## Commit Message
```text
feat(ads): enable DexConsulting text revival while preserving normal rankings

Plan: 2026-10-12-mock-ad-safari-focus
Phase: P01-web-update
Task: T02-public-mock-ad
```
