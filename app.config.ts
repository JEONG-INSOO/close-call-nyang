import type { ExpoConfig } from 'expo/config';

// Expo evaluates this file before Metro's TypeScript module resolver.
// Keep identifiers self-contained; tests check them against the shared constants.
const config: ExpoConfig = {
  name: '아슬아슬 냥대리',
  slug: 'close-call-nyang',
  version: '1.0.0',
  orientation: 'landscape',
  userInterfaceStyle: 'light',
  platforms: ['ios', 'web'],
  ios: {
    bundleIdentifier: 'com.mocca.closecallnyang',
    supportsTablet: false,
    buildNumber: '1',
  },
  web: {
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
