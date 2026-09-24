import type { ExpoConfig } from 'expo/config';

// Expo evaluates this file before Metro's TypeScript module resolver.
// Keep identifiers self-contained; tests check them against the shared constants.
const config: ExpoConfig = {
  name: '우당탕탕 냥대리',
  slug: 'close-call-nyang',
  owner: 'insoojeong',
  extra: {
    eas: { projectId: '315e87a2-f405-4f65-ae45-c91f1d2c59bf' },
  },
  version: '1.0.0',
  icon: './assets/branding/icon.png',
  orientation: 'landscape',
  userInterfaceStyle: 'light',
  platforms: ['ios', 'web'],
  ios: {
    bundleIdentifier: 'com.mocca.closecallnyang',
    appleTeamId: 'S9RLQ8474U',
    config: { usesNonExemptEncryption: false },
    supportsTablet: false,
    buildNumber: '1',
  },
  web: {
    favicon: './assets/branding/favicon.png',
    bundler: 'metro',
    output: 'single',
  },
  ...(process.env.GITHUB_PAGES === 'true'
    ? { experiments: { baseUrl: '/close-call-nyang' } }
    : {}),
  plugins: [
    'expo-asset',
    'expo-status-bar',
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    ['expo-screen-orientation', { initialOrientation: 'LANDSCAPE' }],
  ],
};

export default config;
