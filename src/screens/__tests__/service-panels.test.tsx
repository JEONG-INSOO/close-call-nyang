import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking, Platform } from 'react-native';
import { PUBLIC_LINKS } from '../../config/publicLinks';
import { CHARACTERS } from '../../characters/catalog';
import { ko } from '../../i18n/ko';
import type { Settings } from '../../services/preferences';
import { CharacterSelectPanel } from '../CharacterSelectPanel';
import { MockAdScreen } from '../MockAdScreen';
import { ResultScreen } from '../ResultScreen';
import { SettingsPanel } from '../SettingsPanel';

jest.mock('react-native-svg', () => {
  const svg = jest.requireActual('react-native-reanimated/src/mock-svg');
  return { ...svg, default: svg.Svg };
});

const settings: Settings = Object.freeze({ musicEnabled: true, sfxEnabled: true, hapticsEnabled: true, reduceMotion: false });

describe('Settings public document links (mocked OS browser)', () => {
  beforeEach(() => { jest.spyOn(Linking, 'openURL').mockReset().mockResolvedValue(undefined); });
  afterEach(() => { jest.restoreAllMocks(); });
  const props = { settings, onChange: jest.fn(), onClose: jest.fn() };
  const panel = (visible = true, extra = {}) => <SafeAreaProvider><SettingsPanel {...props} visible={visible} {...extra} /></SafeAreaProvider>;

  it.each([undefined, '성실한 냥대리'])('exposes both links without opening anything on render, nickname=%s', async nickname => {
    await render(panel(true, { nickname }));
    expect(screen.getByRole('link', { name: ko.privacyPolicy })).toBeEnabled();
    expect(screen.getByRole('link', { name: ko.supportPage })).toBeEnabled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    expect(Linking.openURL).toHaveBeenLastCalledWith(PUBLIC_LINKS.privacy);
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(Linking.openURL).toHaveBeenLastCalledWith(PUBLIC_LINKS.support);
    expect(Linking.openURL).toHaveBeenCalledTimes(2);
  });

  it('locks both links until the OS call finishes', async () => {
    let resolve!: () => void;
    jest.mocked(Linking.openURL).mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
    await render(panel());
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    expect(screen.getByTestId('settings-support')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('settings-support'));
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(screen.getByTestId('settings-support')).toBeEnabled();
  });

  it('shows a safe independent error and permits retry without clearing online errors', async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('private-session-secret'));
    await render(panel(true, { onlineError: ko.deleteOnlineRetry }));
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(screen.getByTestId('settings-link-error')).toHaveTextContent(ko.publicPageUnavailable);
    expect(screen.getByText(ko.deleteOnlineRetry)).toBeOnTheScreen();
    expect(screen.queryByText('private-session-secret')).toBeNull();
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(screen.queryByTestId('settings-link-error')).toBeNull();
    expect(screen.getByText(ko.deleteOnlineRetry)).toBeOnTheScreen();
    expect(Linking.openURL).toHaveBeenCalledTimes(2);
  });

  it('clears errors on close and ignores old completion while a reopened panel is opening a new link', async () => {
    let rejectOld!: (cause: Error) => void; let resolveNew!: () => void;
    jest.mocked(Linking.openURL)
      .mockReturnValueOnce(new Promise((_done, reject) => { rejectOld = reject; }))
      .mockReturnValueOnce(new Promise<void>(done => { resolveNew = done; }));
    const view = await render(panel());
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    await view.rerender(panel(false)); await view.rerender(panel());
    expect(screen.getByTestId('settings-support')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('settings-support'));
    await act(async () => rejectOld(new Error('stale')));
    expect(screen.queryByTestId('settings-link-error')).toBeNull();
    expect(screen.getByTestId('settings-privacy')).toBeDisabled();
    await act(async () => resolveNew());
    expect(screen.getByTestId('settings-privacy')).toBeEnabled();
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('offline'));
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(screen.getByTestId('settings-link-error')).toBeOnTheScreen();
    await view.rerender(panel(false)); await view.rerender(panel());
    expect(screen.queryByTestId('settings-link-error')).toBeNull();
  });

  it('does not open a link during parent deletion or an in-flight local deletion', async () => {
    const view = await render(panel(true, { deleting: true }));
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    expect(screen.getByTestId('settings-support')).toBeDisabled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    let resolve!: (result: boolean) => void;
    const remove = jest.fn(() => new Promise<boolean>(done => { resolve = done; }));
    await view.rerender(panel(true, { onDeleteProfile: remove }));
    await fireEvent.press(screen.getByTestId('settings-delete-online'));
    await fireEvent.press(screen.getByTestId('confirm-delete-online'));
    expect(screen.getByTestId('settings-privacy')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('settings-support'));
    expect(Linking.openURL).not.toHaveBeenCalled();
    await act(async () => resolve(false));
    expect(screen.getByTestId('settings-privacy')).toBeEnabled();
    expect(screen.getByText(ko.deleteOnlineRetry)).toBeOnTheScreen();
  });
});

describe('local service panels', () => {
  it('does not mount a hidden settings or character modal', async () => {
    await render(<SafeAreaProvider>
      <SettingsPanel visible={false} settings={settings} onChange={jest.fn()} onClose={jest.fn()} />
      <CharacterSelectPanel visible={false} collection={{ completedRuns: 0, selectedCharacter: 'rookie' }} onSelect={jest.fn()} onClose={jest.fn()} />
    </SafeAreaProvider>);
    expect(screen.queryByTestId('settings-panel')).toBeNull();
    expect(screen.queryByTestId('character-panel')).toBeNull();
  });

  it('provides four independent accessible settings and no development advertisement toggle', async () => {
    const change = jest.fn(); const close = jest.fn();
    await render(<SafeAreaProvider><SettingsPanel visible settings={settings} onChange={change} onClose={close} /></SafeAreaProvider>);
    expect(screen.getAllByRole('switch')).toHaveLength(4);
    const rows: [keyof Settings, string][] = [
      ['musicEnabled', ko.music], ['sfxEnabled', ko.sfx], ['hapticsEnabled', ko.haptics], ['reduceMotion', ko.reduceMotion],
    ];
    for (const [key, label] of rows) {
      const toggle = screen.getByRole('switch', { name: label });
      expect(toggle.props.value).toBe(settings[key]);
      await fireEvent(toggle, 'valueChange', !settings[key]);
      expect(change).toHaveBeenLastCalledWith({ [key]: !settings[key] });
    }
    expect(settings.musicEnabled).toBe(true);
    expect(screen.queryByText(ko.mockAdTitle)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.close }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-panel-scroll')).toBeOnTheScreen();
  });

  it.each([0, 1, 9, 10])('renders three original previews and enforces collection eligibility (%s)', async completedRuns => {
    const select = jest.fn();
    await render(<SafeAreaProvider><CharacterSelectPanel visible collection={{ completedRuns, selectedCharacter: 'rookie' }}
      onSelect={select} onClose={jest.fn()} /></SafeAreaProvider>);
    for (const character of CHARACTERS) {
      expect(screen.getByTestId(`character-preview-${character.id}`, { includeHiddenElements: true })).toBeOnTheScreen();
      const button = screen.getByRole('button', { name: `${ko[character.nameKey]} ${ko.characterSelectAction}` });
      const unlocked = completedRuns >= character.requiredCompletions;
      if (unlocked) expect(button).toBeEnabled(); else expect(button).toBeDisabled();
      await fireEvent.press(button);
      if (unlocked) expect(select).toHaveBeenCalledWith(character.id);
      else expect(select).not.toHaveBeenCalledWith(character.id);
    }
    expect(screen.getByTestId('select-rookie').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('character-panel-scroll')).toBeOnTheScreen();
  });

  it('shows exact 1/10 completion requirements without changing selection automatically', async () => {
    const select = jest.fn(); const close = jest.fn();
    await render(<SafeAreaProvider><CharacterSelectPanel visible collection={{ completedRuns: 9, selectedCharacter: 'diligent' }}
      onSelect={select} onClose={close} /></SafeAreaProvider>);
    expect(screen.getByTestId('character-progress-diligent')).toHaveTextContent('100% 달성 1/1회');
    expect(screen.getByTestId('character-progress-veteran')).toHaveTextContent('100% 달성 9/10회');
    expect(screen.getByTestId('select-diligent').props.accessibilityState).toMatchObject({ selected: true });
    expect(select).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ko.close }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('exposes the selected character as a pressed web button while preserving native selection', async () => {
    const previous = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    try {
      const view = await render(<SafeAreaProvider><CharacterSelectPanel visible
        collection={{ completedRuns: 1, selectedCharacter: 'diligent' }} onSelect={jest.fn()} onClose={jest.fn()} /></SafeAreaProvider>);
      expect(screen.getByTestId('select-rookie').props['aria-pressed']).toBe(false);
      expect(screen.getByTestId('select-diligent').props['aria-pressed']).toBe(true);
      expect(screen.getByTestId('select-diligent').props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('select-veteran')).toBeDisabled();
      expect(screen.getByTestId('select-veteran').props['aria-pressed']).toBe(false);
      await view.unmount();
    } finally { Object.defineProperty(Platform, 'OS', previous); }
  });

  it('shows the unlocked name on result without reopening character/settings panels', async () => {
    await render(<ResultScreen score={115} bestScore={115} canRevive={false}
      onRetry={jest.fn()} onHome={jest.fn()} onRevive={jest.fn()} newlyUnlocked={['diligent']} />);
    expect(screen.getByTestId('character-unlock-notice')).toHaveTextContent(`${ko.characterUnlocked}: ${ko.characterDiligent}`);
    expect(screen.queryByRole('button', { name: ko.characterSelect })).toBeNull();
    expect(screen.queryByRole('button', { name: ko.settings })).toBeNull();
  });

  it('shows no award notice if the result has no newly unlocked characters', async () => {
    await render(<ResultScreen score={100} bestScore={100} canRevive={false}
      onRetry={jest.fn()} onHome={jest.fn()} onRevive={jest.fn()} />);
    expect(screen.queryByTestId('character-unlock-notice')).toBeNull();
  });

  it('uses ceil(engine seconds), has no local reward timer, and always permits cancelling', async () => {
    jest.useFakeTimers();
    try {
      const cancel = jest.fn();
      const view = await render(<MockAdScreen secondsRemaining={4.2} onCancel={cancel} />);
      expect(screen.getByRole('header', { name: ko.mockAdTitle })).toBeOnTheScreen();
      expect(screen.getByTestId('mock-ad-seconds')).toHaveTextContent('남은 시간 5초');
      await act(() => jest.advanceTimersByTime(10000));
      expect(screen.getByTestId('mock-ad-seconds')).toHaveTextContent('남은 시간 5초');
      await fireEvent.press(screen.getByRole('button', { name: ko.mockAdCancel }));
      expect(cancel).toHaveBeenCalledTimes(1);
      await view.rerender(<MockAdScreen secondsRemaining={0} onCancel={cancel} />);
      expect(screen.getByTestId('mock-ad-seconds')).toHaveTextContent('남은 시간 0초');
      expect(screen.getByRole('button', { name: ko.mockAdCancel })).toBeEnabled();
      await view.rerender(<MockAdScreen secondsRemaining={1.01} onCancel={cancel} />);
      expect(screen.getByTestId('mock-ad-seconds')).toHaveTextContent('남은 시간 2초');
    } finally { jest.useRealTimers(); }
  });
});
