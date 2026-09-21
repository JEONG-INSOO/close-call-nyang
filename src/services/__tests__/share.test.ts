import { Share } from 'react-native';
import { formatShareText, shareScore } from '../share';
import { shareScore as shareWebScore } from '../share.web';
import { PUBLIC_WEB_URL } from '../../config/app';

afterEach(() => jest.restoreAllMocks());

describe('score sharing', () => {
  it.each([[-1, 0], [NaN, 0], [Infinity, 0], [101.9, 101], [200, 200]])('formats %s without capping at100', (score, expected) => {
    expect(formatShareText(score)).toBe(`아슬아슬 냥대리 프로젝트 성공률 ${expected}%!\n${PUBLIC_WEB_URL}`);
  });
  it('uses the native share sheet and distinguishes dismissal from success', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValueOnce({ action: Share.sharedAction })
      .mockResolvedValueOnce({ action: Share.dismissedAction });
    expect((await shareScore(120)).status).toBe('shared');
    expect(share).toHaveBeenCalledWith({ message: formatShareText(120) });
    expect((await shareScore(120)).status).toBe('cancelled');
  });
  it('silently handles native cancellation but offers manual text for failure', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(Object.assign(new Error('cancel'), { name: 'AbortError' }))
      .mockRejectedValueOnce(new Error('unavailable'));
    expect((await shareScore(1)).status).toBe('cancelled');
    expect(await shareScore(2)).toEqual({ status: 'manual', text: formatShareText(2) });
  });
  it('copies only after clipboard success and never claims copy on rejection or insecure context', async () => {
    const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const writeText = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
    try {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText } } });
      const pending = shareWebScore(7);
      expect(writeText).toHaveBeenCalledWith(formatShareText(7)); // In the direct user gesture turn.
      expect((await pending).status).toBe('copied');
      expect((await shareWebScore(8)).status).toBe('manual');
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: false } });
      expect((await shareWebScore(9)).status).toBe('manual');
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
      expect((await shareWebScore(10)).status).toBe('manual');
      expect(writeText).toHaveBeenCalledTimes(2);
    } finally {
      if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow);
      else Reflect.deleteProperty(globalThis, 'window');
      if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator);
      else Reflect.deleteProperty(globalThis, 'navigator');
    }
  });
});
