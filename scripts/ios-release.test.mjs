import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateRelease, validateUploadKey, validateProfile, exportOptions, validatePinnedArchive, ARCHIVE_SOURCE, BUNDLE, TEAM } from './ios-release.mjs';

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
test('rejects substituted, expired, failed or differently sourced compiled artifacts',()=>{
  const run={id:41012370017,head_sha:ARCHIVE_SOURCE,head_branch:'main',event:'workflow_dispatch',conclusion:'success'};
  const artifact={id:12958302479,name:'unsigned-ios-101',expired:false,workflow_run:{head_sha:ARCHIVE_SOURCE},digest:'sha256:f9d368f02cacb158b15b81fa3a570b7ac123d2253060412e098d6f56a88c135a'};
  assert.equal(validatePinnedArchive(run,artifact),ARCHIVE_SOURCE);
  for(const patch of [{head_sha:'other'},{head_branch:'untrusted'},{conclusion:'failure'},{event:'pull_request'}]) assert.throws(()=>validatePinnedArchive({...run,...patch},artifact));
  for(const patch of [{id:1},{digest:'wrong'},{expired:true},{workflow_run:{head_sha:'other'}}]) assert.throws(()=>validatePinnedArchive(run,{...artifact,...patch}));
});
test('upload validation needs only the Apple upload key and rejects an unsuitable RSA key',()=>{
  const key=generateKeyPairSync('ec',{namedCurve:'prime256v1',privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const upload={APP_STORE_CONNECT_PRIVATE_KEY:key.privateKey,APP_STORE_CONNECT_KEY_ID:'A123456789',APP_STORE_CONNECT_ISSUER_ID:'a0000000-0000-4000-8000-000000000001'};
  assert.doesNotThrow(()=>validateUploadKey(upload));
  assert.throws(()=>validateUploadKey({...upload,APP_STORE_CONNECT_PRIVATE_KEY:''}),/Missing/);
  const rsa=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  assert.throws(()=>validateUploadKey({...upload,APP_STORE_CONNECT_PRIVATE_KEY:rsa.privateKey}),/P-256/);
});
