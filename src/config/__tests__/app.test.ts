import expoConfig from '../../../app.config';
import { APP_NAME, APP_SLUG, IOS_BUNDLE_ID, getFeatureFlags } from '../app';

describe('getFeatureFlags', () => {
  it.each([
    [false, 'true', false],
    [false, 'false', false],
    [false, undefined, false],
    [true, 'true', true],
    [true, 'false', false],
    [true, undefined, false],
    [true, 'TRUE', false],
    [true, ' true ', false],
    [true, '', false],
  ] as const)('development=%s, flag=%s yields mockAdsEnabled=%s', (isDev, flag, expected) => {
    expect(getFeatureFlags(isDev, flag)).toEqual({ mockAdsEnabled: expected });
  });
});

describe('Expo configuration', () => {
  it('matches the shared identity and landscape iPhone/web target', () => {
    expect(expoConfig.name).toBe(APP_NAME);
    expect(expoConfig.slug).toBe(APP_SLUG);
    expect(expoConfig.ios?.bundleIdentifier).toBe(IOS_BUNDLE_ID);
    expect(expoConfig.orientation).toBe('landscape');
    expect(expoConfig.platforms).toEqual(['ios', 'web']);
    expect(expoConfig.ios?.supportsTablet).toBe(false);
    expect(expoConfig.web?.output).toBe('single');
  });

  it('disables recording and background audio permissions', () => {
    expect(expoConfig.plugins).toContainEqual([
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ]);
  });
});
