import { readFile, writeFile, readdir, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createPrivateKey } from 'node:crypto';

export const TEAM = 'S9RLQ8474U';
export const BUNDLE = 'com.mocca.closecallnyang';
export const ARCHIVE_SOURCE = 'd8d85f77d723f072a041c7b8d80c8f92b8c96caf';
export function validatePinnedArchive(run, artifact) {
  if(run.id!==41012370017||run.head_sha!==ARCHIVE_SOURCE||run.head_branch!=='main'||run.event!=='workflow_dispatch'||run.conclusion!=='success'||
    artifact.id!==12958302479||artifact.expired||artifact.name!=='unsigned-ios-101'||artifact.workflow_run?.head_sha!==ARCHIVE_SOURCE||
    artifact.digest!=='sha256:f9d368f02cacb158b15b81fa3a570b7ac123d2253060412e098d6f56a88c135a') throw new Error('Expected immutable successful app archive');
  return ARCHIVE_SOURCE;
}
export const signingNames = ['APPLE_SIGNING_CERTIFICATE_P12', 'APPLE_SIGNING_CERTIFICATE_PASSWORD',
  'APPLE_PROVISIONING_PROFILE', 'APP_STORE_CONNECT_PRIVATE_KEY', 'APP_STORE_CONNECT_KEY_ID', 'APP_STORE_CONNECT_ISSUER_ID'];

export function validateRelease(env, requireSigning = false) {
  if (!['unsigned-archive','app-store'].includes(env.RELEASE_MODE)) throw new Error('Invalid release mode');
  if (!/^[1-9]\d{0,3}$/.test(env.IOS_BUILD_NUMBER ?? '')) throw new Error('Invalid build number');
  if (env.EXPO_PUBLIC_SUPABASE_URL !== 'https://fgojrxmpxpzdiwsktjsx.supabase.co' ||
      !/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '')) throw new Error('Production public configuration missing');
  if (env.EXPO_PUBLIC_ENABLE_MOCK_AD !== 'true' || env.EXPO_PUBLIC_REPLAY_DIAGNOSTICS !== 'false') throw new Error('Release feature flags differ');
  if (requireSigning) {
    if (env.RELEASE_MODE !== 'app-store') throw new Error('Signing requires app-store mode');
    for (const name of signingNames) if (!env[name]) throw new Error(`Missing ${name}`);
    if (!/^[A-Z0-9]{10}$/.test(env.APP_STORE_CONNECT_KEY_ID) ||
        !/^[a-f0-9-]{36}$/i.test(env.APP_STORE_CONNECT_ISSUER_ID)) throw new Error('Invalid Apple API identifiers');
    const key = createPrivateKey(env.APP_STORE_CONNECT_PRIVATE_KEY);
    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error('Expected Apple P-256 key');
  }
  return { mode:env.RELEASE_MODE, buildNumber:env.IOS_BUILD_NUMBER };
}

export function validateProfile(profile, now = Date.now()) {
  if (!Array.isArray(profile.TeamIdentifier) || profile.TeamIdentifier.length !== 1 || profile.TeamIdentifier[0] !== TEAM ||
      profile.Entitlements?.['application-identifier'] !== `${TEAM}.${BUNDLE}` ||
      profile.Entitlements?.['com.apple.developer.team-identifier'] !== TEAM) throw new Error('Profile team or app does not match');
  if (profile.Entitlements?.['get-task-allow'] !== false || profile.ProvisionedDevices || profile.ProvisionsAllDevices) throw new Error('App Store distribution profile required');
  if (!Number.isFinite(Date.parse(profile.ExpirationDate)) || Date.parse(profile.ExpirationDate) <= now) throw new Error('Profile expired');
  if (!/^[A-F0-9-]{36}$/i.test(profile.UUID ?? '') || !profile.DeveloperCertificates?.length) throw new Error('Profile identity missing');
  return profile.UUID;
}
const xml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function exportOptions(profile, fingerprint) {
  validateProfile(profile);
  if (!/^[A-F0-9]{40}$/i.test(fingerprint) || !profile.DeveloperCertificates.some(cert =>
    createHash('sha1').update(Buffer.from(cert,'base64')).digest('hex').toUpperCase() === fingerprint.toUpperCase())) throw new Error('Signing certificate does not belong to profile');
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>teamID</key><string>${TEAM}</string><key>signingStyle</key><string>manual</string><key>signingCertificate</key><string>${xml(fingerprint)}</string><key>provisioningProfiles</key><dict><key>${BUNDLE}</key><string>${xml(profile.UUID)}</string></dict><key>manageAppVersionAndBuildNumber</key><false/></dict></plist>`;
}

async function main(command) {
  const env = process.env;
  if (command === 'preflight') { console.log(JSON.stringify(validateRelease(env))); return; }
  if (command === 'verify-pinned-archive') {
    const get=async path=>{
      const response=await fetch(`https://api.github.com/repos/JEONG-INSOO/close-call-nyang/${path}`,{
        headers:{Authorization:`Bearer ${env.GH_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('Expected accessible pinned archive');return response.json();
    };
    const source=validatePinnedArchive(await get('actions/runs/41012370017'),await get('actions/artifacts/12958302479'));
    await appendFile(env.GITHUB_ENV,`ARCHIVE_SOURCE_SHA=${source}\n`);
    console.log('Pinned successful main archive ID, digest and source verified.');return;
  }
  const temp = env.RUNNER_TEMP;
  if (!temp || process.platform !== 'darwin') throw new Error('This command runs only on a hosted Mac');
  const root = resolve(temp,'nyang-build');
  if (command === 'credentials') {
    validateRelease(env, true);
    const dir = resolve(temp,'nyang-signing');
    await writeFile(resolve(dir,'certificate.p12'),Buffer.from(env.APPLE_SIGNING_CERTIFICATE_P12,'base64'),{mode:0o600});
    await writeFile(resolve(dir,'profile.mobileprovision'),Buffer.from(env.APPLE_PROVISIONING_PROFILE,'base64'),{mode:0o600});
    await writeFile(resolve(dir,`AuthKey_${env.APP_STORE_CONNECT_KEY_ID}.p8`),env.APP_STORE_CONNECT_PRIVATE_KEY,{mode:0o600});
  } else if (command === 'project') {
    const projects = (await readdir('ios')).filter(x=>x.endsWith('.xcodeproj'));
    if(projects.length!==1)throw new Error('Expected exactly one app project');
    const name=projects[0].replace(/\.xcodeproj$/,'');
    if(!/^[A-Za-z0-9_-]+$/.test(name))throw new Error('Unexpected project name');
    const workspace=`ios/${name}.xcworkspace`;
    await writeFile(resolve(root,'project.json'),JSON.stringify({name,workspace,project:`ios/${projects[0]}`}));
    console.log(name);
  } else if (command === 'export-options') {
    const profile = JSON.parse(await readFile(resolve(temp,'nyang-signing/profile.json'),'utf8'));
    await writeFile(resolve(root,'ExportOptions.plist'),exportOptions(profile,env.SIGNING_FINGERPRINT));
    console.log(validateProfile(profile));
  } else if (command === 'receipt') {
    await writeFile(resolve(root,'receipt.json'),JSON.stringify({sourceCommit:env.ARCHIVE_SOURCE_SHA??env.GITHUB_SHA,workflowCommit:env.GITHUB_SHA,version:'1.0.1',
      buildNumber:env.IOS_BUILD_NUMBER,mode:env.RELEASE_MODE,team:TEAM,bundle:BUNDLE,
      appleUploadCompleted:env.RELEASE_MODE==='app-store',reviewSubmitted:false,observedAt:new Date().toISOString()},null,2));
  } else throw new Error('Unknown command');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main(process.argv[2]).catch(error=>{
  // Crypto parsers can include private input in their errors; print fixed context only.
  const safe = /^Missing |^Invalid |^Production |^Release |^Expected |^Profile |^App Store |^Signing |^This command|^Unknown|^Unexpected/.test(error.message);
  console.error(safe ? error.message : 'iOS release validation failed'); process.exitCode=1;
});
