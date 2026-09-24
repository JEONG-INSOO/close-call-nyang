import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ko } from '../../i18n/ko';
import type { PlayerProfile } from '../../online/contracts';
import type { Settings } from '../../services/preferences';
import { NicknamePanel } from '../NicknamePanel';
import { SettingsPanel } from '../SettingsPanel';
import { TitleScreen } from '../TitleScreen';
import { ResultScreen } from '../ResultScreen';
import { PendingRankingPanel } from '../PendingRankingPanel';

const profile: PlayerProfile = { publicId: '11111111-1111-4111-8111-111111111111', nickname: '냥대리', updatedAt: '2026-09-22T00:00:00.000Z' };
const settings: Settings = { musicEnabled: true, sfxEnabled: true, hapticsEnabled: true, reduceMotion: false };
const shell = (content: React.ReactNode) => <SafeAreaProvider>{content}</SafeAreaProvider>;

describe('nickname participation and deletion panels', () => {
  it('explains public guest identity without creating a session merely by opening', async () => {
    const save = jest.fn(async () => true);
    await render(shell(<NicknamePanel visible profile={null} onSave={save} onClose={jest.fn()} />));
    expect(screen.getByText(ko.nicknamePublicNotice)).toBeOnTheScreen();
    expect(screen.getByText(ko.guestIdentityNotice)).toBeOnTheScreen();
    expect(save).not.toHaveBeenCalled();
  });

  it('normalizes a valid duplicate nickname and closes only after confirmed save', async () => {
    const close = jest.fn(); let resolve!: (saved: boolean) => void;
    const save = jest.fn(() => new Promise<boolean>(done => { resolve = done; }));
    await render(shell(<NicknamePanel visible profile={profile} onSave={save} onClose={close} />));
    await fireEvent.changeText(screen.getByTestId('nickname-input'), '  냥대리  ');
    await fireEvent.press(screen.getByTestId('nickname-save'));
    expect(save).toHaveBeenCalledWith('냥대리');
    expect(screen.getByTestId('nickname-save')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('nickname-save'));
    expect(save).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled();
    await act(async () => resolve(true));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the old public name and draft when saving is rejected', async () => {
    const save = jest.fn(async () => false); const close = jest.fn();
    const view = await render(shell(<NicknamePanel visible profile={profile} onSave={save} onClose={close} />));
    await fireEvent.changeText(screen.getByTestId('nickname-input'), '새 이름');
    await fireEvent.press(screen.getByTestId('nickname-save'));
    await view.rerender(shell(<NicknamePanel visible profile={profile} onSave={save} onClose={close} error="사용할 수 없는 닉네임이에요." />));
    expect(screen.getByTestId('nickname-input')).toHaveProp('value', '새 이름');
    expect(screen.getByText('사용할 수 없는 닉네임이에요.')).toBeOnTheScreen();
    expect(profile.nickname).toBe('냥대리'); expect(close).not.toHaveBeenCalled();
  });

  it('never calls save for invalid characters and never displays raw thrown secrets', async () => {
    const save = jest.fn(async () => { throw new Error('secret-token'); });
    await render(shell(<NicknamePanel visible profile={null} onSave={save} onClose={jest.fn()} />));
    await fireEvent.changeText(screen.getByTestId('nickname-input'), 'test@example.com');
    await fireEvent.press(screen.getByTestId('nickname-save')); expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('nickname-input'), '새 냥대리');
    await fireEvent.press(screen.getByTestId('nickname-save'));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('secret-token')).toBeNull(); expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByTestId('nickname-input')).toHaveProp('value', '새 냥대리');
  });

  it('disables unconfigured participation while allowing panel close', async () => {
    const save = jest.fn(); const close = jest.fn();
    await render(shell(<NicknamePanel visible profile={null} disabled onSave={save} onClose={close} error={ko.rankUnavailable} />));
    expect(screen.getByTestId('nickname-save')).toBeDisabled();
    expect(screen.getByTestId('nickname-input')).toHaveProp('editable', false);
    await fireEvent.press(screen.getByTestId('nickname-panel-close')); expect(close).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('ignores an old save response after closing and reopening the editor', async () => {
    let resolve!: (saved: boolean) => void; const close = jest.fn();
    const save = jest.fn(() => new Promise<boolean>(done => { resolve = done; }));
    const props = { profile, onSave: save, onClose: close };
    const view = await render(shell(<NicknamePanel {...props} visible />));
    await fireEvent.press(screen.getByTestId('nickname-save'));
    await view.rerender(shell(<NicknamePanel {...props} visible={false} />));
    await view.rerender(shell(<NicknamePanel {...props} visible />));
    await fireEvent.changeText(screen.getByTestId('nickname-input'), '다음 이름');
    await act(async () => resolve(true));
    expect(close).not.toHaveBeenCalled(); expect(screen.getByTestId('nickname-input')).toHaveProp('value', '다음 이름');
  });

  it('requires an explicit destructive confirmation and explains retained local data', async () => {
    const remove = jest.fn(async () => true); const change = jest.fn();
    await render(shell(<SettingsPanel visible settings={settings} onChange={change} onClose={jest.fn()}
      nickname={profile.nickname} onEditNickname={jest.fn()} onDeleteProfile={remove} />));
    await fireEvent.press(screen.getByTestId('settings-delete-online'));
    expect(remove).not.toHaveBeenCalled(); expect(screen.getByText(ko.deleteOnlineDescription)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: ko.cancel }));
    expect(screen.queryByTestId('delete-online-confirmation')).toBeNull();
    await fireEvent.press(screen.getByTestId('settings-delete-online'));
    await fireEvent.press(screen.getByTestId('confirm-delete-online'));
    expect(remove).toHaveBeenCalledTimes(1); expect(change).not.toHaveBeenCalled();
    expect(screen.queryByTestId('delete-online-confirmation')).toBeNull();
  });

  it('retains deletion confirmation on failure and disables duplicate calls while pending', async () => {
    let resolve!: (saved: boolean) => void;
    const remove = jest.fn(() => new Promise<boolean>(done => { resolve = done; }));
    await render(shell(<SettingsPanel visible settings={settings} onChange={jest.fn()} onClose={jest.fn()} onDeleteProfile={remove} />));
    await fireEvent.press(screen.getByTestId('settings-delete-online'));
    await fireEvent.press(screen.getByTestId('confirm-delete-online'));
    expect(screen.getByTestId('confirm-delete-online')).toBeDisabled();
    expect(screen.getByTestId('settings-panel-close')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('confirm-delete-online')); expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => resolve(false));
    expect(screen.getByTestId('delete-online-confirmation')).toBeOnTheScreen();
    expect(screen.getByText(ko.deleteOnlineRetry)).toBeOnTheScreen();
    expect(screen.getByTestId('confirm-delete-online')).toBeEnabled();
  });

  it('shows offline profile guidance even when no nickname exists', async () => {
    await render(shell(<SettingsPanel visible settings={settings} onChange={jest.fn()} onClose={jest.fn()}
      onEditNickname={jest.fn()} onlineError={ko.rankUnavailable} />));
    expect(screen.getByText(ko.rankUnavailable)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ko.nicknameSet })).toBeEnabled();
    expect(screen.queryByTestId('settings-delete-online')).toBeNull();
  });
});

describe('ranking entry and result presentation', () => {
  it('keeps offline start usable with optional nickname and ranking actions', async () => {
    const start = jest.fn(); const nickname = jest.fn(); const ranking = jest.fn();
    await render(<TitleScreen bestScore={101} onStart={start} onSettings={jest.fn()}
      onNickname={nickname} onLeaderboard={ranking} onlineNotice={ko.rankUnavailable} />);
    await fireEvent.press(screen.getByTestId('start-button'));
    await fireEvent.press(screen.getByTestId('title-nickname'));
    await fireEvent.press(screen.getByTestId('title-leaderboard'));
    expect(start).toHaveBeenCalledTimes(1); expect(nickname).toHaveBeenCalledTimes(1); expect(ranking).toHaveBeenCalledTimes(1);
  });

  it.each([3, null])('shows only confirmed success without receipt details for rank %s', async (rank) => {
    const retry = jest.fn();
    const props = { score: 101, bestScore: 145, canRevive: false, onRetry: jest.fn(), onHome: jest.fn(), onShare: jest.fn(), onRevive: jest.fn() };
    const view = await render(<ResultScreen {...props} submissionState="pending" onRetrySubmission={retry} />);
    expect(screen.getByText(ko.rankingPending)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('retry-ranking-submission')); expect(retry).toHaveBeenCalledTimes(1);
    await view.rerender(<ResultScreen {...props} submissionState="submitted" receipt={{ runId: 'server-run', score: 101, bestScore: 120, rank, improved: false }} />);
    expect(screen.getByText('랭킹등록완료!')).toBeOnTheScreen();
    expect(screen.getByTestId('ranking-submission-status')).toHaveTextContent(/^랭킹등록완료!$/);
    expect(screen.queryByTestId('ranking-receipt')).toBeNull();
    expect(screen.queryByText(/검증된 성공률|온라인 최고 기록|3위/)).toBeNull();
    expect(screen.queryByTestId('retry-ranking-submission')).toBeNull();
    expect(screen.getByTestId('result-score')).toHaveTextContent('101%');
    expect(screen.getByTestId('result-best')).toHaveTextContent('145%');
  });

  it.each(['submitted', 'recording', 'local', 'unranked'] as const)('does not announce success without a receipt in %s state', async (submissionState) => {
    await render(<ResultScreen score={10} bestScore={20} canRevive={false} onRetry={jest.fn()}
      onHome={jest.fn()} onShare={jest.fn()} onRevive={jest.fn()} submissionState={submissionState} receipt={null} />);
    expect(screen.queryByText('랭킹등록완료!')).toBeNull();
    expect(screen.getByText(submissionState === 'recording' ? ko.rankingPending : ko.rankingLocal)).toBeOnTheScreen();
  });

  it('offers three explicit pending-upload choices without silently discarding', async () => {
    const retry = jest.fn(); const local = jest.fn(); const discard = jest.fn();
    await render(shell(<PendingRankingPanel visible onRetry={retry} onStartLocal={local} onDiscardAndStart={discard} onClose={jest.fn()} />));
    expect(discard).not.toHaveBeenCalled(); expect(screen.getByText(ko.pendingDiscardNotice)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pending-ranking-local'));
    expect(local).toHaveBeenCalledTimes(1); expect(discard).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('pending-ranking-retry'));
    await fireEvent.press(screen.getByTestId('pending-ranking-discard'));
    expect(retry).toHaveBeenCalledTimes(1); expect(discard).toHaveBeenCalledTimes(1);
  });
});
