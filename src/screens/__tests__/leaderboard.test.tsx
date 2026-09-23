import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ko } from '../../i18n/ko';
import { BLOCKED_PLAYERS_KEY } from '../../online/blockedPlayers';
import type { LeaderboardEntry, LeaderboardResponse, PlayerProfile, ReportReason } from '../../online/contracts';
import type { RankingApi } from '../../online/types';
import { LeaderboardScreen } from '../LeaderboardScreen';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const profile: PlayerProfile = { publicId: id(900), nickname: '내 냥대리', updatedAt: '2026-09-22T00:00:00.000Z' };
function entry(n: number, rank: number, score: number, name = '같은 이름'): LeaderboardEntry {
  return { publicId: id(n), nickname: name, rank, score, achievedAt: '2026-09-22T00:00:00.000Z', isMe: n === 900 };
}
function response(entries: LeaderboardEntry[] = [entry(1, 1, 200), entry(2, 1, 200), entry(3, 3, 180)], me: LeaderboardEntry | null = entry(900, 150, 12, profile.nickname)): LeaderboardResponse {
  return { entries, me, rulesVersion: 'nyang-v1-fixture-only', fetchedAt: '2026-09-22T01:02:03.000Z' };
}
function fakeApi(): jest.Mocked<RankingApi> {
  return { getProfile: jest.fn(), saveNickname: jest.fn(), deleteProfile: jest.fn(), getLeaderboard: jest.fn(async () => response()),
    startRun: jest.fn(), sendChunk: jest.fn(), finalizeRun: jest.fn(), reportNickname: jest.fn(async (_publicId: string, _reason: ReportReason) => undefined) };
}
const shell = (content: React.ReactNode) => <SafeAreaProvider>{content}</SafeAreaProvider>;

beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

describe('simulated shared leaderboard UI (not hosted evidence)', () => {
  it('preserves tied server ranks and duplicate names, including own rank outside the top 30', async () => {
    const api = fakeApi();
    await render(shell(<LeaderboardScreen api={api} myProfile={profile} onClose={jest.fn()} />));
    expect(screen.getAllByText('같은 이름')).toHaveLength(3);
    expect(within(screen.getByTestId(`rank-row-${id(1)}`)).getByText('1')).toBeOnTheScreen();
    expect(within(screen.getByTestId(`rank-row-${id(2)}`)).getByText('1')).toBeOnTheScreen();
    expect(within(screen.getByTestId(`rank-row-${id(3)}`)).getByText('3')).toBeOnTheScreen();
    expect(screen.getByTestId(`my-rank-${profile.publicId}`)).toHaveTextContent('150내 냥대리 · 나12%');
    expect(screen.getByTestId('leaderboard-updated')).toBeOnTheScreen();
    expect(api.getProfile).not.toHaveBeenCalled();
  });

  it('shows loading without fabricated scores, then an honest empty board', async () => {
    let resolve!: (value: LeaderboardResponse) => void; const api = fakeApi();
    api.getLeaderboard.mockReturnValue(new Promise(done => { resolve = done; }));
    await render(shell(<LeaderboardScreen api={api} myProfile={null} onClose={jest.fn()} />));
    expect(screen.getByText(ko.rankLoading)).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/^rank-row-/)).toHaveLength(0);
    await act(async () => resolve(response([], null)));
    expect(screen.getByText(ko.rankEmpty)).toBeOnTheScreen(); expect(screen.getByText(ko.rankNoMine)).toBeOnTheScreen();
  });

  it('does not load or show fake scores when unconfigured or closed', async () => {
    const api = fakeApi();
    const view = await render(shell(<LeaderboardScreen api={null} myProfile={null} onClose={jest.fn()} />));
    expect(screen.getByText(ko.rankUnavailable)).toBeOnTheScreen(); expect(screen.queryByTestId('leaderboard-empty')).toBeNull();
    await view.rerender(shell(<LeaderboardScreen visible={false} api={api} myProfile={null} onClose={jest.fn()} />));
    expect(api.getLeaderboard).not.toHaveBeenCalled(); expect(screen.queryByTestId('leaderboard-panel')).toBeNull();
  });

  it('shows safe errors, throttles retries, and recovers on explicit refresh', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi(); api.getLeaderboard.mockRejectedValueOnce(new Error('private-session-token'));
      await render(shell(<LeaderboardScreen api={api} myProfile={null} onClose={jest.fn()} />));
      expect(screen.getByTestId('leaderboard-error')).toBeOnTheScreen();
      expect(screen.queryByText('private-session-token')).toBeNull();
      await fireEvent.press(screen.getByTestId('leaderboard-refresh')); expect(api.getLeaderboard).toHaveBeenCalledTimes(1);
      await act(() => jest.advanceTimersByTime(3000));
      await fireEvent.press(screen.getByRole('button', { name: ko.rankRetry }));
      expect(api.getLeaderboard).toHaveBeenCalledTimes(2); expect(screen.queryByTestId('leaderboard-error')).toBeNull();
    } finally { jest.useRealTimers(); }
  });

  it('ignores old responses after identity changes and clears the prior own rank', async () => {
    let resolve!: (value: LeaderboardResponse) => void; const api = fakeApi();
    api.getLeaderboard.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValueOnce(response([], null));
    const view = await render(shell(<LeaderboardScreen api={api} myProfile={profile} onClose={jest.fn()} />));
    await view.rerender(shell(<LeaderboardScreen api={api} myProfile={null} onClose={jest.fn()} />));
    await act(async () => resolve(response()));
    expect(screen.queryByTestId(`my-rank-${profile.publicId}`)).toBeNull(); expect(screen.getByText(ko.rankEmpty)).toBeOnTheScreen();
  });

  it('reports the stable public ID and chosen reason without promising automatic removal', async () => {
    const api = fakeApi();
    await render(shell(<LeaderboardScreen api={api} myProfile={profile} onClose={jest.fn()} />));
    await fireEvent.press(screen.getByTestId(`rank-menu-${id(2)}`));
    await fireEvent.press(screen.getByTestId('nickname-report'));
    await fireEvent.press(screen.getByTestId('report-reason-impersonation'));
    expect(api.reportNickname).toHaveBeenCalledWith(id(2), 'impersonation');
    expect(screen.getByText(ko.reportNotice)).toBeOnTheScreen();
    expect(screen.getByTestId(`rank-row-${id(2)}`)).toBeOnTheScreen();
  });

  it('hides locally without renumbering tied ranks and stays hidden after a rename', async () => {
    const api = fakeApi();
    const props = { api, myProfile: profile, onClose: jest.fn() };
    const view = await render(shell(<LeaderboardScreen {...props} />));
    await fireEvent.press(screen.getByTestId(`rank-menu-${id(2)}`)); await fireEvent.press(screen.getByTestId('hide-player'));
    expect(screen.queryByTestId(`rank-row-${id(2)}`)).toBeNull();
    expect(within(screen.getByTestId(`rank-row-${id(3)}`)).getByText('3')).toBeOnTheScreen();
    expect(JSON.parse((await AsyncStorage.getItem(BLOCKED_PLAYERS_KEY))!)).toContain(id(2));
    await view.unmount();
    api.getLeaderboard.mockResolvedValue(response([entry(2, 1, 250, '바뀐 이름'), entry(3, 2, 180)]));
    await render(shell(<LeaderboardScreen {...props} />));
    expect(screen.queryByText('바뀐 이름')).toBeNull();
    expect(within(screen.getByTestId(`rank-row-${id(3)}`)).getByText('2')).toBeOnTheScreen();
  });

  it('supports guest local hiding but requires nickname participation before reporting', async () => {
    const api = fakeApi();
    await render(shell(<LeaderboardScreen api={api} myProfile={null} onClose={jest.fn()} />));
    await fireEvent.press(screen.getByTestId(`rank-menu-${id(1)}`));
    expect(screen.getByTestId('nickname-report')).toBeDisabled(); expect(screen.getByTestId('hide-player')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('nickname-report')); expect(api.reportNickname).not.toHaveBeenCalled();
  });

  it('keeps an existing board visible with its last-loaded time when refresh fails', async () => {
    jest.useFakeTimers();
    try {
      const api = fakeApi();
      await render(shell(<LeaderboardScreen api={api} myProfile={profile} onClose={jest.fn()} />));
      api.getLeaderboard.mockRejectedValueOnce(new Error('offline'));
      await act(() => jest.advanceTimersByTime(3000)); await fireEvent.press(screen.getByTestId('leaderboard-refresh'));
      expect(screen.getByTestId('leaderboard-error')).toBeOnTheScreen();
      expect(screen.getByTestId('leaderboard-updated')).toBeOnTheScreen();
      expect(screen.getByTestId(`rank-row-${id(1)}`)).toBeOnTheScreen();
    } finally { jest.useRealTimers(); }
  });
});
