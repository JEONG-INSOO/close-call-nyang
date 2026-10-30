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

# The preceding workflow step generated these sources without signing secrets.
project_name=$(node scripts/ios-release.mjs project)
workspace="ios/$project_name.xcworkspace"
scheme="$project_name"
archive_args=(-workspace "$workspace" -scheme "$scheme" -configuration Release
  -destination 'generic/platform=iOS' -archivePath "$build_dir/Game.xcarchive")

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
  export PROFILE_UUID="$profile_uuid"
  # Set signing on the application target only, so CocoaPods targets do not inherit a profile.
  ruby - "$project_name" <<'RUBY'
require 'xcodeproj'
project = Xcodeproj::Project.open("ios/#{ARGV[0]}.xcodeproj")
apps = project.targets.select { |t| t.product_type == 'com.apple.product-type.application' }
raise 'Expected one application target' unless apps.length == 1
apps.first.build_configurations.each do |configuration|
  configuration.build_settings['CODE_SIGN_STYLE'] = 'Manual'
  configuration.build_settings['DEVELOPMENT_TEAM'] = 'S9RLQ8474U'
  configuration.build_settings['CODE_SIGN_IDENTITY'] = ENV.fetch('SIGNING_FINGERPRINT')
  configuration.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ENV.fetch('PROFILE_UUID')
end
project.save
RUBY
  xcodebuild "${archive_args[@]}" archive
  validate_archive
  xcodebuild -exportArchive -archivePath "$build_dir/Game.xcarchive" -exportOptionsPlist "$build_dir/ExportOptions.plist" -exportPath "$build_dir/export"
  ipa_files=("$build_dir/export/"*.ipa)
  test "${#ipa_files[@]}" -eq 1 && test -f "${ipa_files[0]}"
  API_PRIVATE_KEYS_DIR="$signing_dir" xcrun altool --upload-app --type ios --file "${ipa_files[0]}" --apiKey "$APP_STORE_CONNECT_KEY_ID" --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
else
  xcodebuild "${archive_args[@]}" archive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=''
  validate_archive
fi
node scripts/ios-release.mjs receipt
