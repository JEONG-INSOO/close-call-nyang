export const APP_NAME = '우당탕탕 냥대리';
export const APP_SLUG = 'close-call-nyang';
export const IOS_BUNDLE_ID = 'com.mocca.closecallnyang';
export const PUBLIC_WEB_URL = 'https://jeong-insoo.github.io/close-call-nyang/';

export type FeatureFlags = Readonly<{ mockAdsEnabled: boolean }>;

export function getFeatureFlags(
  isDev: boolean,
  enableMockAd: string | undefined,
): FeatureFlags {
  return { mockAdsEnabled: isDev && enableMockAd === 'true' };
}
