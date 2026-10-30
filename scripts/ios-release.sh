#!/bin/bash
set -euo pipefail
set +x
umask 077

node scripts/ios-release.mjs preflight
build_dir="$RUNNER_TEMP/nyang-build"
signing_dir="$RUNNER_TEMP/nyang-signing"
mkdir -p "$build_dir"
keychain_path=''
installed_profile=''
cleanup() {
  if [[ -n "$keychain_path" ]]; then security delete-keychain "$keychain_path" >/dev/null 2>&1 || true; fi
  if [[ -n "$installed_profile" ]]; then rm -f -- "$installed_profile"; fi
  if [[ -d "$signing_dir" ]]; then rm -f -- "$signing_dir/certificate.p12" "$signing_dir/profile.mobileprovision" "$signing_dir/profile.plist" "$signing_dir/profile.json" "$signing_dir"/AuthKey_*.p8; fi
}
trap cleanup EXIT
validate_archive() {
  python3 - "$build_dir" <<'PY'
import os, pathlib, plistlib, sys
apps = list((pathlib.Path(sys.argv[1]) / 'Game.xcarchive/Products/Applications').glob('*.app'))
if len(apps) != 1: raise SystemExit('Expected exactly one archived application')
with (apps[0] / 'Info.plist').open('rb') as stream: info = plistlib.load(stream)
if (info.get('CFBundleIdentifier'), info.get('CFBundleShortVersionString'), info.get('CFBundleVersion')) != ('com.mocca.closecallnyang', '1.0.1', os.environ['IOS_BUILD_NUMBER']):
    raise SystemExit('Archived app identity or version mismatch')
PY
}

if [[ "$RELEASE_MODE" == 'app-store' ]]; then
  mkdir -p "$signing_dir"
  node scripts/ios-release.mjs credentials
fi

if [[ "$RELEASE_MODE" == 'app-store' ]]; then
  keychain_path="$signing_dir/signing.keychain-db"
  keychain_password=$(openssl rand -hex 32)
  security create-keychain -p "$keychain_password" "$keychain_path"
  security set-keychain-settings -lut 21600 "$keychain_path"
  security unlock-keychain -p "$keychain_password" "$keychain_path"
  security import "$signing_dir/certificate.p12" -P "$APPLE_SIGNING_CERTIFICATE_PASSWORD" -t cert -f pkcs12 -k "$keychain_path" >/dev/null
  unset APPLE_SIGNING_CERTIFICATE_P12 APPLE_SIGNING_CERTIFICATE_PASSWORD APPLE_PROVISIONING_PROFILE APP_STORE_CONNECT_PRIVATE_KEY
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain_path" >/dev/null
  security list-keychains -d user -s "$keychain_path" "$HOME/Library/Keychains/login.keychain-db"
  SIGNING_FINGERPRINT=$(security find-identity -v -p codesigning "$keychain_path" | sed -nE 's/^[[:space:]]*[0-9]+\) ([A-F0-9]{40}) .*/\1/p')
  export SIGNING_FINGERPRINT
  security cms -D -i "$signing_dir/profile.mobileprovision" > "$signing_dir/profile.plist"
  python3 - "$signing_dir" <<'PY'
import base64, datetime, json, pathlib, plistlib, sys
root = pathlib.Path(sys.argv[1])
with (root / 'profile.plist').open('rb') as stream: profile = plistlib.load(stream)
def encode(value):
    if isinstance(value, bytes): return base64.b64encode(value).decode('ascii')
    if isinstance(value, datetime.datetime): return value.isoformat() + 'Z'
    raise TypeError('Unsupported profile value')
(root / 'profile.json').write_text(json.dumps(profile, default=encode))
PY
  profile_uuid=$(node scripts/ios-release.mjs export-options)
  profile_dir="$HOME/Library/MobileDevice/Provisioning Profiles"
  mkdir -p "$profile_dir"
  profile_destination="$profile_dir/$profile_uuid.mobileprovision"
  test ! -e "$profile_destination"
  installed_profile="$profile_destination"
  cp "$signing_dir/profile.mobileprovision" "$installed_profile"
  # Reuse only the pinned compiled game; GitHub has already verified its origin.
  python3 - "$build_dir" "$signing_dir" <<'PY'
import os, pathlib, plistlib, json, shutil, sys
root, signing = map(pathlib.Path, sys.argv[1:])
receipt = json.loads((root / 'receipt.json').read_text())
if receipt.get('sourceCommit') != os.environ['ARCHIVE_SOURCE_SHA'] or receipt.get('mode') != 'unsigned-archive' or receipt.get('buildNumber') != '101':
    raise SystemExit('Unexpected compiled archive receipt')
apps = list((root / 'Game.xcarchive/Products/Applications').glob('*.app'))
if len(apps) != 1: raise SystemExit('Expected one compiled app')
app = apps[0]
info_path = app / 'Info.plist'
with info_path.open('rb') as stream: info = plistlib.load(stream)
if (info.get('CFBundleIdentifier'), info.get('CFBundleShortVersionString'), info.get('CFBundleVersion')) != ('com.mocca.closecallnyang', '1.0.1', '101'):
    raise SystemExit('Unexpected compiled app identity')
info['CFBundleVersion'] = os.environ['IOS_BUILD_NUMBER']
with info_path.open('wb') as stream: plistlib.dump(info, stream)
for candidate in app.rglob('Info.plist'):
    try:
        with candidate.open('rb') as stream: bundle = plistlib.load(stream)
    except (ValueError, plistlib.InvalidFileException): continue
    executable = bundle.get('CFBundleExecutable')
    if executable:
        if pathlib.Path(executable).name != executable: raise SystemExit('Unexpected executable path')
        binary = candidate.parent / executable
        if binary.is_file(): binary.chmod(0o755)
for binary in app.rglob('*.dylib'): binary.chmod(0o755)
with (signing / 'profile.plist').open('rb') as stream: profile = plistlib.load(stream)
with (signing / 'entitlements.plist').open('wb') as stream: plistlib.dump(profile['Entitlements'], stream)
(root / 'ipa-staging/Payload').mkdir(parents=True, exist_ok=True)
shutil.copytree(app, root / 'ipa-staging/Payload' / app.name, symlinks=True)
PY
  validate_archive
  mkdir -p "$build_dir/export"
  ipa_path="$build_dir/export/Nyang.ipa"
  (cd "$build_dir/ipa-staging" && /usr/bin/zip --symlinks -q -r "$ipa_path" Payload)
  FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_OPT_OUT_USAGE=1 FASTLANE_DISABLE_COLORS=1 \
    fastlane run resign ipa:"$ipa_path" signing_identity:"$SIGNING_FINGERPRINT" \
      provisioning_profile:"$signing_dir/profile.mobileprovision" entitlements:"$signing_dir/entitlements.plist" \
      bundle_version:"$IOS_BUILD_NUMBER" keychain_path:"$keychain_path"
  # The freshly signed payload is verified before sending it to Apple.
  mkdir -p "$build_dir/signed-check"
  /usr/bin/ditto -x -k "$ipa_path" "$build_dir/signed-check"
  signed_apps=("$build_dir/signed-check/Payload/"*.app)
  test "${#signed_apps[@]}" -eq 1
  codesign --verify --deep --strict "${signed_apps[0]}"
  ipa_files=("$build_dir/export/"*.ipa)
  test "${#ipa_files[@]}" -eq 1 && test -f "${ipa_files[0]}"
  API_PRIVATE_KEYS_DIR="$signing_dir" xcrun altool --upload-app --type ios --file "${ipa_files[0]}" --apiKey "$APP_STORE_CONNECT_KEY_ID" --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
else
  project_name=$(node scripts/ios-release.mjs project)
  archive_args=(-workspace "ios/$project_name.xcworkspace" -scheme "$project_name" -configuration Release
    -destination 'generic/platform=iOS' -archivePath "$build_dir/Game.xcarchive")
  xcodebuild "${archive_args[@]}" archive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=''
  validate_archive
fi
node scripts/ios-release.mjs receipt
