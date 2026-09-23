import expoConfig from '../../../app.config';
import { APP_NAME, APP_SLUG, IOS_BUNDLE_ID, PUBLIC_WEB_URL, getFeatureFlags } from '../app';

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
  const originalGithubPages = process.env.GITHUB_PAGES;
  afterEach(() => {
    if (originalGithubPages === undefined) delete process.env.GITHUB_PAGES;
    else process.env.GITHUB_PAGES = originalGithubPages;
  });

  function configWithBaseFlag(flag: string | undefined) {
    if (flag === undefined) delete process.env.GITHUB_PAGES;
    else process.env.GITHUB_PAGES = flag;
    let config: typeof expoConfig | undefined;
    jest.isolateModules(() => { config = require('../../../app.config').default; });
    return config!;
  }

  it('exports the Pages subpath only for the explicit production export flag', () => {
    expect(configWithBaseFlag('true').experiments?.baseUrl).toBe('/close-call-nyang');
  });

  it.each([undefined, 'false', 'TRUE', ' true ', '1', ''])('leaves native/dev base unset for %s', flag => {
    expect(configWithBaseFlag(flag).experiments?.baseUrl).toBeUndefined();
  });

  it('matches the shared identity and landscape iPhone/web target', () => {
    expect(expoConfig.name).toBe(APP_NAME);
    expect(expoConfig.slug).toBe(APP_SLUG);
    expect(expoConfig.ios?.bundleIdentifier).toBe(IOS_BUNDLE_ID);
    expect(expoConfig.orientation).toBe('landscape');
    expect(expoConfig.platforms).toEqual(['ios', 'web']);
    expect(expoConfig.ios?.supportsTablet).toBe(false);
    expect(expoConfig.web?.output).toBe('single');
  });

  it('renames the display title without migrating the app or public URL identity', () => {
    expect(APP_NAME).toBe('우당탕탕 냥대리');
    expect(APP_SLUG).toBe('close-call-nyang');
    expect(IOS_BUNDLE_ID).toBe('com.mocca.closecallnyang');
    expect(PUBLIC_WEB_URL).toBe('https://jeong-insoo.github.io/close-call-nyang/');
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
