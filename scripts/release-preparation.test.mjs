import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brandingAssets, renderBranding, verifyBranding, validateSvg } from './render-branding.mjs';
import { verifyWeb, verifyFavicon } from './verify-web.mjs';
import { generateFaviconAsync } from '@expo/image-utils';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('accepts Expo ICO conversion but rejects truncated or transparent frames', async () => {
  const ico = await generateFaviconAsync(await readFile(brandingAssets[1].destination));
  assert.equal(await verifyFavicon(ico), 'ICO with opaque 48px frame');
  await assert.rejects(verifyFavicon(ico.subarray(0, ico.length - 1)), /Truncated/);
  const transparent = Buffer.from(ico);
  transparent[transparent.readUInt32LE(18) + 43] = 0;
  await assert.rejects(verifyFavicon(transparent), /transparency/);
});
test('approved bilingual metadata respects Apple limits and is bound to explicit copy approval', async () => {
  const approval = JSON.parse(await read('store/listing-approval.json'));
  assert.equal(approval.evidenceSource, 'user_confirmation');
  assert.equal(approval.finalReviewSubmissionApproved, false);
  assert.equal(approval.privacyAnswersApproved, false);
  for (const locale of ['ko-KR', 'en-US']) {
  const draft = JSON.parse(await read(`store/${locale}/metadata.json`));
  assert.equal(draft.name, '우당탕탕 냥대리');
  assert.equal(draft.locale, locale);
  assert.equal(draft.status, 'user_approved');
  assert.ok(draft.name.length <= 30 && draft.subtitle.length <= 30);
  assert.ok(draft.promotionalText.length <= 170 && draft.description.length <= 4000);
  assert.ok(Buffer.byteLength(draft.keywords.join(','), 'utf8') <= 100);
  assert.match(draft.description, /Top 30/);
  assert.doesNotMatch(draft.description, /Top 100|광고 시청|무료 게임/);
  assert.equal(draft.madeForKids, false);
  const copy = Object.fromEntries(approval.fields.map(field => [field, draft[field]]));
  assert.equal(createHash('sha256').update(JSON.stringify(copy), 'utf8').digest('hex'), approval.locales[locale]);
  if (locale === 'en-US') assert.match(draft.description, /game interface is in Korean/);
  }
  const input = JSON.parse(await read('store/release-inputs.json'));
  assert.equal(input.schemaVersion, 1);
  assert.equal(input.supportEmail, 'mocca3232@naver.com');
  assert.equal(input.copyrightHolder, '2026 Insoo Jeong');
  assert.equal(input.price, 'free');
  assert.equal(input.territories, 'worldwide_except_eu_china_vietnam');
  assert.deepEqual([...input.excludedTerritories].sort(), ['AUT', 'BEL', 'BGR', 'CHN', 'CYP', 'CZE', 'DEU', 'DNK', 'ESP', 'EST', 'FIN', 'FRA', 'GRC', 'HRV', 'HUN', 'IRL', 'ITA', 'LTU', 'LUX', 'LVA', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'SWE', 'VNM']);
  assert.equal(new Set(input.excludedTerritories).size, 29);
  assert.equal(input.appleTeamId, 'S9RLQ8474U');
  assert.equal(input.ascAppId, '6815771701');
  const eas = JSON.parse(await read('eas.json'));
  assert.equal(eas.submit.production.ios.ascAppId, input.ascAppId);
});
test('privacy publication approval is separate and bilingual policy includes the approved supplement', async () => {
  const approval = JSON.parse(await read('store/privacy-approval.json'));
  assert.equal(approval.schemaVersion, 1);
  assert.equal(approval.evidenceSource, 'user_confirmation');
  assert.equal(approval.ascAppId, '6815771701');
  assert.equal(approval.privacyPublicationApproved, true);
  assert.equal(approval.publicationTermsConfirmation.confirmedAt, '2026-10-01');
  assert.equal(approval.publicationTermsConfirmation.answer, '동의하고 개인정보 공개표 게시 (추천)');
  assert.equal(approval.policyPublicationApproved, true);
  assert.equal(approval.finalReviewSubmissionApproved, false);
  assert.deepEqual(approval.dataTypes, ['USER_ID', 'GAMEPLAY_CONTENT', 'PRODUCT_INTERACTION', 'OTHER_USER_CONTENT', 'COARSE_LOCATION', 'PERFORMANCE_DATA', 'OTHER_DIAGNOSTIC_DATA']);
  assert.deepEqual(approval.purposes, ['APP_FUNCTIONALITY']);
  assert.equal(approval.linkedToUser, true);
  assert.equal(approval.usedForTracking, false);
  const policy = await read('web-static/privacy/index.html');
  for (const text of Object.values(approval.policySupplement)) assert.ok(policy.includes(text));
  assert.ok(policy.includes(`<time datetime="${approval.approvedAt}">${approval.approvedAt}</time>`));
  assert.match(policy, /7일/);
  assert.match(policy, /90 days/);
});
test('Connect evidence distinguishes confirmed asset permission, saved rights and pending compliance', async () => {
  const checkpoint = JSON.parse(await read('store/connect-checkpoint.json'));
  const field = name => checkpoint.checks.find(check => check.field === name);
  assert.equal(checkpoint.ascAppId, '6815771701');
  assert.equal(checkpoint.euReleaseDeferral.request, 'EU 보류하고 다른거 진행');
  assert.equal(checkpoint.euReleaseDeferral.selectedTerritoryCount, 148);
  assert.equal(checkpoint.euReleaseDeferral.savedAndReloadVerified, true);
  assert.equal(checkpoint.euReleaseDeferral.allExcludedRowsUnavailable, true);
  assert.equal(checkpoint.euReleaseDeferral.traderStatusChanged, false);
  assert.equal(checkpoint.euReleaseDeferral.dsaDeclarationStillPending, true);
  assert.equal(field('requestedAvailability').expected, 'worldwide_except_eu_china_vietnam');
  assert.equal(field('requestedAvailability').status, 'passed');
  assert.match(field('requestedAvailability').observed, /^146 territories/);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.answer, '1');
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.evidenceSource, 'user_confirmation');
  assert.deepEqual(checkpoint.chinaVietnamReleaseDeferral.excludedTerritories, ['CHN', 'VNM']);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.selectedTerritoryCount, 146);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.savedAndReloadVerified, true);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.bothExcludedRowsUnavailable, true);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.euExcludedRowsStillUnavailable, 27);
  assert.equal(checkpoint.chinaVietnamReleaseDeferral.permitGranted, false);
  assert.equal(field('reviewNotesSaved').observed, true);
  assert.equal(field('koreaCompliance').status, 'passed');
  assert.equal(field('koreaCompliance').observed, true);
  assert.equal(checkpoint.koreaContactApproval.evidenceSource, 'user_confirmation');
  assert.equal(checkpoint.koreaContactApproval.publicEmailApproved, true);
  assert.equal(checkpoint.koreaContactApproval.hasValidBrn, false);
  assert.equal(checkpoint.koreaContactApproval.brnNoSelected, true);
  assert.equal(checkpoint.koreaContactApproval.verificationStage, 'active');
  assert.equal(checkpoint.koreaContactApproval.emailVerificationReportedByUser, true);
  assert.equal(checkpoint.koreaContactApproval.emailVerificationCompleted, true);
  assert.equal(checkpoint.koreaContactApproval.finalConfirmationCompleted, true);
  assert.equal(checkpoint.koreaContactApproval.finalContactReviewRequired, false);
  assert.equal(checkpoint.koreaContactApproval.savedDisplayEmailMatchesApproved, true);
  assert.equal(checkpoint.koreaContactApproval.privateCodeOrRegistrationDataRecorded, false);
  assert.equal(field('chinaVietnamPermits').status, 'not_run');
  assert.equal(field('contentRightsSaved').status, 'passed');
  assert.equal(field('contentRightsSaved').observed, true);
  assert.match(field('contentRightsSaved').source, /User answer 1/);
  assert.match(field('contentRightsSaved').source, /USES_THIRD_PARTY_CONTENT/);
  assert.match(field('contentRightsSaved').source, /not an independent legal clearance/);
  assert.equal(field('euTraderDeclaration').status, 'not_run');
  assert.equal(field('euTraderDeclaration').observed, false);
  assert.equal(checkpoint.commercialIntentEvidence.evidenceSource, 'user_confirmation');
  assert.equal(checkpoint.commercialIntentEvidence.answer, '1');
  assert.equal(checkpoint.commercialIntentEvidence.publicContactPublicationApproved, false);
  assert.equal(checkpoint.commercialIntentEvidence.finalDsaSubmissionApproved, false);
  assert.equal(checkpoint.dsaPublicContactApproval.answer, '2');
  assert.equal(checkpoint.dsaPublicContactApproval.publicContactPublicationApproved, true);
  assert.equal(checkpoint.dsaPublicContactApproval.finalDsaSubmissionApproved, false);
  assert.equal(checkpoint.dsaPublicContactApproval.rawContactValuesRecorded, false);
  assert.equal(checkpoint.dsaPublicContactApproval.finalContactReviewRequired, true);
  assert.equal(checkpoint.dsaPublicContactApproval.emailCodeEntryReportedByUser, true);
  assert.equal(checkpoint.dsaPublicContactApproval.verificationStage, 'name_document_required');
  assert.equal(checkpoint.dsaPublicContactApproval.documentUploaded, false);
  assert.equal(checkpoint.dsaSupportInquiry.status, 'submitted_awaiting_reply');
  assert.equal(checkpoint.dsaSupportInquiry.sendApproval.answer, '1');
  assert.equal(checkpoint.dsaSupportInquiry.sendApproval.evidenceSource, 'user_confirmation');
  assert.equal(checkpoint.dsaSupportInquiry.sent, true);
  assert.equal(checkpoint.dsaSupportInquiry.receiptConfirmed, true);
  assert.equal(checkpoint.dsaSupportInquiry.replyReceived, false);
  assert.equal(checkpoint.dsaSupportInquiry.documentUploaded, false);
  assert.equal(checkpoint.dsaSupportInquiry.rawAccountOrIdentityDataRecorded, false);
  assert.equal(field('reviewReady').observed, true);
  assert.equal(field('appReviewSubmitted').status, 'passed');
  assert.equal(checkpoint.reviewSubmitted, true);
  assert.equal(checkpoint.publicReleaseCompleted, false);
});

test('App Review receipt is separate from draft, EAS upload, approval, public release and DSA clearance', async () => {
  const checkpoint = JSON.parse(await read('store/connect-checkpoint.json'));
  const state = JSON.parse(await read('store/release-state.json'));
  const authorization = checkpoint.reviewSubmissionAuthorization;
  assert.equal(authorization.evidenceSource, 'user_request');
  assert.equal(authorization.userRequest, '앱심사 제출까지 가자');
  assert.equal(authorization.reviewSubmissionApproved, true);
  assert.equal(authorization.publicReleaseApproved, false);
  assert.equal(authorization.dsaFinalDeclarationApproved, false);
  assert.equal(checkpoint.state, 'waiting_for_review');
  assert.equal(checkpoint.appReviewSubmission.submittedItemCount, 1);
  assert.equal(checkpoint.appReviewSubmission.ascAppId, authorization.ascAppId);
  assert.equal(checkpoint.appReviewSubmission.storeVersion, '1.0');
  assert.equal(checkpoint.appReviewSubmission.buildNumber, '6');
  assert.equal(state.reviewStatus, 'waiting_for_review');
  assert.equal(state.appReviewSubmission.status, 'WAITING_FOR_REVIEW');
  assert.equal(state.appReviewSubmission.id, checkpoint.appReviewSubmission.id);
  assert.notEqual(state.appReviewSubmission.id, state.submissionId);
  assert.equal(state.releaseMode, 'manual');
  assert.equal(state.appReviewSubmission.reviewApproved, false);
  assert.equal(state.appReviewSubmission.publicReleaseCompleted, false);
  assert.equal(checkpoint.checks.find(c => c.field === 'euTraderDeclaration').status, 'not_run');
  assert.equal(checkpoint.checks.find(c => c.field === 'policySupplementPublicDeployment').status, 'passed');
  assert.equal(state.nativeQa, 'pending');
  assert.equal(state.leaderboardQa, 'pending');
});

test('app config points at original opaque source-matched branding', async () => {
  const config = await read('app.config.ts');
  assert.match(config, /icon: '\.\/assets\/branding\/icon.png'/);
  assert.match(config, /favicon: '\.\/assets\/branding\/favicon.png'/);
  assert.equal(brandingAssets[0].kind, 'png');
  assert.match(brandingAssets[0].source, /diligent-app-icon-source\.png$/);
  assert.equal(brandingAssets[1].kind, 'svg');
  assert.match(brandingAssets[1].source, /icon\.svg$/);
  assert.deepEqual(await verifyBranding(), []);
  assert.throws(() => validateSvg('<svg viewBox="0 0 1024 1024"><image href="remote"/></svg>'));
  assert.throws(() => validateSvg('<svg viewBox="0 0 1024 1024" onload="bad"/>'));
});
test('branding check detects stale pixels and never repairs files implicitly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-branding-'));
  try {
    const assets = brandingAssets.map(asset => ({ ...asset, destination: join(dir, `${asset.width}.png`) }));
    await renderBranding(assets);
    assert.deepEqual(await verifyBranding(assets), []);
    await writeFile(assets[0].destination, await readFile(assets[1].destination));
    const before = await stat(assets[0].destination);
    assert.ok((await verifyBranding(assets)).length >= 1);
    assert.equal((await stat(assets[0].destination)).mtimeMs, before.mtimeMs);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('app icon renderer rejects a source too small for the iOS icon', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-icon-source-'));
  try {
    const assets = brandingAssets.map(asset => ({ ...asset, destination: join(dir, `${asset.width}.png`) }));
    assets[0].source = brandingAssets[1].destination;
    await assert.rejects(renderBranding(assets), /square PNG at least 1024px/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('web verifier requires real policies alongside base path, scripts and favicon', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nyang-web-release-'));
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '<html><link rel="icon" href="/close-call-nyang/favicon.png"><script src="/close-call-nyang/app.js"></script></html>');
    await writeFile(join(dir, 'app.js'), 'console.log("release fixture")');
    await writeFile(join(dir, 'favicon.png'), await readFile(brandingAssets[1].destination));
    await assert.rejects(verifyWeb(dir), /ENOENT/);
    for (const name of ['support', 'privacy']) {
      await mkdir(join(dir, name));
      await writeFile(join(dir, name, 'index.html'), await read(`web-static/${name}/index.html`));
    }
    const report = await verifyWeb(dir);
    assert.equal(report.status, 'passed');
    assert.match(report.policyPages.privacy, /bilingual/);
    await writeFile(join(dir, 'app.js'), '<html>fallback</html>');
    await assert.rejects(verifyWeb(dir), /HTML fallback/);
    await writeFile(join(dir, 'app.js'), 'const x="/close-call-nyang/assets/missing.png"');
    await assert.rejects(verifyWeb(dir));
    await writeFile(join(dir, 'index.html'), '<html><script src="/app.js"></script></html>');
    await assert.rejects(verifyWeb(dir), /base path/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
