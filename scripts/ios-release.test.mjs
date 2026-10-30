import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateRelease, validateProfile, exportOptions, BUNDLE, TEAM } from './ios-release.mjs';

const env={RELEASE_MODE:'unsigned-archive',IOS_BUILD_NUMBER:'101',
  EXPO_PUBLIC_SUPABASE_URL:'https://fgojrxmpxpzdiwsktjsx.supabase.co',EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture123',
  EXPO_PUBLIC_ENABLE_MOCK_AD:'true',EXPO_PUBLIC_REPLAY_DIAGNOSTICS:'false'};
const profile={TeamIdentifier:[TEAM],UUID:'A0000000-0000-4000-8000-000000000001',ExpirationDate:'2099-01-01T00:00:00Z',
  Entitlements:{'application-identifier':`${TEAM}.${BUNDLE}`,'com.apple.developer.team-identifier':TEAM,'get-task-allow':false},
  DeveloperCertificates:[Buffer.from('fixture-only-cert').toString('base64')]};
test('unsigned compile requires production settings but no Apple or Expo credentials',()=>{
  assert.deepEqual(validateRelease(env),{mode:'unsigned-archive',buildNumber:'101'});
  for(const n of ['0','01','1.2','-1','10000','7\n'])assert.throws(()=>validateRelease({...env,IOS_BUILD_NUMBER:n}),/Invalid build/);
  assert.throws(()=>validateRelease({...env,EXPO_PUBLIC_SUPABASE_URL:'https://wrong.invalid'}),/Production/);
  assert.throws(()=>validateRelease({...env,EXPO_PUBLIC_REPLAY_DIAGNOSTICS:'true'}),/feature flags/);
  assert.throws(()=>validateRelease({...env,RELEASE_MODE:'app-store'},true),/Missing APPLE_SIGNING/);
});
test('profile must be unexpired App Store distribution for this exact team and bundle',()=>{
  assert.equal(validateProfile(profile),profile.UUID);
  for(const patch of [{TeamIdentifier:['OTHER']},{ProvisionedDevices:['phone']},{ProvisionsAllDevices:true},{ExpirationDate:'2000-01-01'},
    {Entitlements:{...profile.Entitlements,'get-task-allow':true}},
    {Entitlements:{...profile.Entitlements,'application-identifier':`${TEAM}.other.app`}}])assert.throws(()=>validateProfile({...profile,...patch}));
});
test('export uses only a certificate present in the selected profile and preserves build number',()=>{
  const fingerprint=createHash('sha1').update('fixture-only-cert').digest('hex').toUpperCase();
  const xml=exportOptions(profile,fingerprint);
  assert.match(xml,/app-store-connect/);assert.match(xml,/<key>manageAppVersionAndBuildNumber<\/key><false\/>/);
  assert.throws(()=>exportOptions(profile,'0'.repeat(40)),/certificate/);
});
test('workflow is dispatch-only, main-only and does not use EAS, Expo tokens or credential artifacts',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/ios-app-store.yml',import.meta.url),'utf8');
  assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/\n  (push|pull_request):/);
  assert.match(workflow,/github.ref == 'refs\/heads\/main'/);assert.match(workflow,/runs-on: macos-26/);
  assert.doesNotMatch(workflow,/EXPO_TOKEN|eas (build|submit)|write-all|\.p8\s*$/m);
  assert.match(workflow,/persist-credentials: false/);
  assert.doesNotMatch(workflow,/path:.*nyang-signing/);
});
