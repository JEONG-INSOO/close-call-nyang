import AsyncStorage from '@react-native-async-storage/async-storage';
import { NICKNAME_ONBOARDING_KEY, loadNicknameOnboarding, parseNicknameOnboarding,
  saveNicknameOnboardingHandled } from '../nicknameOnboarding';

beforeEach(async () => { await AsyncStorage.clear(); jest.restoreAllMocks(); });

it('accepts only the versioned boolean record and leaves other stored data alone', async () => {
  expect(parseNicknameOnboarding(null)).toBe(false);
  expect(parseNicknameOnboarding('{broken')).toBe(false);
  expect(parseNicknameOnboarding(JSON.stringify({ schemaVersion: 2, handled: true }))).toBe(false);
  expect(parseNicknameOnboarding(JSON.stringify({ schemaVersion: 1, handled: 'true' }))).toBe(false);
  expect(parseNicknameOnboarding(JSON.stringify({ schemaVersion: 1, handled: false }))).toBe(false);
  await AsyncStorage.setItem('unrelated-preferences', 'keep');
  expect(await loadNicknameOnboarding()).toEqual({ handled: false, status: 'ready' });
  expect(await saveNicknameOnboardingHandled()).toBe(true);
  expect(await loadNicknameOnboarding()).toEqual({ handled: true, status: 'ready' });
  expect(await AsyncStorage.getItem('unrelated-preferences')).toBe('keep');
  expect(await AsyncStorage.getAllKeys()).toContain(NICKNAME_ONBOARDING_KEY);
});

it('contains read and write failures without overwriting unread storage', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read failed'));
  expect(await loadNicknameOnboarding()).toEqual({ handled: false, status: 'memoryOnly' });
  expect(await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY)).toBeNull();
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('write failed'));
  expect(await saveNicknameOnboardingHandled()).toBe(false);
});
