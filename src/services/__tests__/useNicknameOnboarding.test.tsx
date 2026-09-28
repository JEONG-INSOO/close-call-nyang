import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NICKNAME_ONBOARDING_KEY } from '../nicknameOnboarding';
import { useNicknameOnboarding } from '../useNicknameOnboarding';

beforeEach(async () => { await AsyncStorage.clear(); jest.restoreAllMocks(); });

it('keeps a choice made before a delayed read and writes only once', async () => {
  let finishRead!: (value: string | null) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  const write = jest.spyOn(AsyncStorage, 'setItem');
  const hook = await renderHook(() => useNicknameOnboarding());
  expect(hook.result.current.status).toBe('loading');
  await act(() => { hook.result.current.markHandled(); hook.result.current.markHandled(); });
  expect(hook.result.current.handled).toBe(true);
  await act(async () => { finishRead(null); await Promise.resolve(); });
  expect(hook.result.current).toMatchObject({ handled: true, status: 'ready' });
  expect(write).toHaveBeenCalledTimes(1);
  expect(JSON.parse((await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY))!)).toEqual({ schemaVersion: 1, handled: true });
  await hook.unmount();
});

it('keeps the choice in memory after write failure and restores a successful choice on remount', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage full'));
  const first = await renderHook(() => useNicknameOnboarding());
  await act(async () => { first.result.current.markHandled(); await Promise.resolve(); });
  expect(first.result.current).toMatchObject({ handled: true, status: 'memoryOnly' });
  await first.unmount();
  const second = await renderHook(() => useNicknameOnboarding());
  expect(second.result.current).toMatchObject({ handled: false, status: 'ready' });
  await act(async () => { second.result.current.markHandled(); await Promise.resolve(); });
  await second.unmount();
  const third = await renderHook(() => useNicknameOnboarding());
  expect(third.result.current).toMatchObject({ handled: true, status: 'ready' });
  await third.unmount();
});

it('ignores a read that finishes after unmount', async () => {
  let finishRead!: (value: string | null) => void;
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  const hook = await renderHook(() => useNicknameOnboarding());
  await hook.unmount();
  await act(async () => { finishRead(null); await Promise.resolve(); });
  expect(await AsyncStorage.getItem(NICKNAME_ONBOARDING_KEY)).toBeNull();
});
