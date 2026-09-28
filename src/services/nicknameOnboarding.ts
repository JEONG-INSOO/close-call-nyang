import AsyncStorage from '@react-native-async-storage/async-storage';

export const NICKNAME_ONBOARDING_KEY = 'close-call-nyang.nickname-onboarding.v1';

export interface NicknameOnboardingRecord { schemaVersion: 1; handled: boolean }
export interface NicknameOnboardingLoad { handled: boolean; status: 'ready' | 'memoryOnly' }

export function parseNicknameOnboarding(raw: string | null): boolean {
  if (raw === null) return false;
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
      'schemaVersion' in value && value.schemaVersion === 1 &&
      'handled' in value && typeof value.handled === 'boolean' ? value.handled : false;
  } catch { return false; }
}

export async function loadNicknameOnboarding(): Promise<NicknameOnboardingLoad> {
  try {
    return { handled: parseNicknameOnboarding(await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY)), status: 'ready' };
  } catch { return { handled: false, status: 'memoryOnly' }; }
}

export async function saveNicknameOnboardingHandled(): Promise<boolean> {
  try {
    const value: NicknameOnboardingRecord = { schemaVersion: 1, handled: true };
    await AsyncStorage.setItem(NICKNAME_ONBOARDING_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}
