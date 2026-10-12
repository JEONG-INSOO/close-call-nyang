import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validatePublicPage } from './public-pages.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const approval = JSON.parse(await read('store/policy-supplement-approval.json'));
const textAd = JSON.parse(await read('store/mock-ad-publication.json'));
const html = (await read('web-static/privacy/index.html')).replace(/\r\n/g, '\n');

function beforeTextAdPublication() {
  let previous = html;
  for (const disclosure of Object.values(textAd.disclosures)) {
    previous = previous.replace(`<p>${disclosure.current}</p>`, `<p>${disclosure.previous}</p>`);
  }
  return previous.replace(`<time datetime="${textAd.updateDate}">${textAd.updateDate}</time>`,
    `<time datetime="${textAd.previousDate}">${textAd.previousDate}</time>`);
}

test('public text-ad contract permits only the requested local promotion and preserves prior policy', () => {
  assert.equal(textAd.schemaVersion, 1);
  assert.equal(textAd.evidenceSource, 'user_request');
  assert.equal(textAd.approvedAt, '2026-10-12');
  assert.equal(textAd.publicTextAdEnabled, true);
  assert.equal(textAd.externalAdSdkEnabled, false);
  assert.equal(textAd.advertisingTrackingEnabled, false);
  assert.equal(textAd.appReviewSubmissionApproved, false);
  assert.equal(textAd.previousDate, approval.approvedAt);
  assert.equal(textAd.updateDate, textAd.approvedAt);
  for (const [locale, language] of [['ko-KR', 'ko'], ['en-US', 'en']]) {
    const disclosure = textAd.disclosures[locale];
    assert.match(disclosure.current, /DEXCONSULTING/);
    assert.equal(html.split(`<p>${disclosure.current}</p>`).length - 1, 1);
    assert.equal(html.includes(`<p>${disclosure.previous}</p>`), false);
    assert.ok(html.split(`<section id="${language}" lang="${language}"`)[1]?.split('</section>')[0].includes(disclosure.current));
  }
});

test('policy publication contract is explicit and does not authorize App Review', () => {
  assert.equal(approval.schemaVersion, 1);
  assert.equal(approval.approvedAt, '2026-10-01');
  assert.equal(approval.evidenceSource, 'user_confirmation');
  assert.equal(approval.deploymentApproved, true);
  assert.equal(approval.finalReviewSubmissionApproved, false);
  assert.deepEqual(Object.keys(approval.policySupplement).sort(), ['en-US', 'ko-KR']);
});

test('each approved paragraph appears exactly once in its language section', () => {
  for (const [locale, language] of [['ko-KR', 'ko'], ['en-US', 'en']]) {
    const paragraph = approval.policySupplement[locale];
    assert.equal(typeof paragraph, 'string');
    assert.ok(paragraph.length > 100);
    assert.equal(html.split(`<p>${paragraph}</p>`).length - 1, 1);
    const section = html.split(`<section id="${language}" lang="${language}"`)[1]?.split('</section>')[0];
    assert.ok(section?.includes(`<p>${paragraph}</p>`));
  }
  assert.equal(html.split(`<time datetime="${textAd.updateDate}">${textAd.updateDate}</time>`).length - 1, 1);
});

test('only the approved paragraphs and update date differ from the original policy', () => {
  let baseline = beforeTextAdPublication();
  for (const paragraph of Object.values(approval.policySupplement)) {
    baseline = baseline.replace(`    <p>${paragraph}</p>\n`, '');
  }
  baseline = baseline.replace('<time datetime="2026-10-01">2026-10-01</time>', '<time datetime="2026-09-30">2026-09-30</time>');
  assert.equal(createHash('sha256').update(baseline, 'utf8').digest('hex'), approval.baselinePrivacySha256);
});

test('supplement preserves bilingual safety, contact, deletion and retention', () => {
  validatePublicPage(html, 'privacy');
  assert.match(html, /7일/);
  assert.match(html, /90 days/);
  assert.match(html, /온라인 프로필과 기록 삭제/);
  assert.match(html, /Delete online profile and records/);
  assert.match(html, /mailto:mocca3232@naver\.com/);
});
