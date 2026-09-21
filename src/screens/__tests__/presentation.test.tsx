import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CountdownOverlay } from '../../components/CountdownOverlay';
import { GameHud } from '../../components/GameHud';
import { PauseOverlay } from '../../components/PauseOverlay';
import type { WorkEvent } from '../../game/types';
import { ko } from '../../i18n/ko';
import { palette } from '../../theme/tokens';
import { ResultScreen } from '../ResultScreen';
import { TitleScreen } from '../TitleScreen';

describe('screen presentation contracts', () => {
  it('offers one functional start action and no unfinished settings or character button', async () => {
    const start = jest.fn();
    await render(<TitleScreen bestScore={125.9} onStart={start} onSettings={jest.fn()} />);
    expect(screen.getByRole('header', { name: ko.title })).toBeOnTheScreen();
    expect(screen.getByLabelText(`${ko.bestLabel} 125%`)).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: ko.settings })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.start }));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('shows uncapped results and functioning retry/home without unfinished share or ad entries', async () => {
    const retry = jest.fn(); const home = jest.fn();
    await render(<ResultScreen score={128.9} bestScore={90} canRevive={false}
      onRetry={retry} onHome={home} onShare={jest.fn()} onRevive={jest.fn()} />);
    expect(screen.getByLabelText(`${ko.scoreLabel} 128%`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`${ko.bestLabel} 128%`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
    expect(screen.queryByRole('button', { name: ko.share })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.retry }));
    await fireEvent.press(screen.getByRole('button', { name: ko.home }));
    expect(retry).toHaveBeenCalledTimes(1); expect(home).toHaveBeenCalledTimes(1);
  });

  it('exposes revival only when a caller explicitly provides availability', async () => {
    const revive = jest.fn();
    await render(<ResultScreen score={15} bestScore={200} canRevive={true}
      onRetry={jest.fn()} onHome={jest.fn()} onShare={jest.fn()} onRevive={revive} />);
    await fireEvent.press(screen.getByRole('button', { name: ko.revive }));
    expect(revive).toHaveBeenCalledTimes(1);
  });

  it.each([99, 100, 101, 10000])('uses only the score color for the 100%% milestone (%s)', async score => {
    const pause = jest.fn();
    await render(<GameHud score={score} event={null} onPause={pause} canPause={true} />);
    expect(screen.getByLabelText(`${ko.scoreLabel} ${score}%`)).toBeOnTheScreen();
    expect(screen.getByTestId('game-score')).toHaveStyle({ color: score >= 100 ? palette.scoreSuccess : palette.ink });
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(ko.bestLabel)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.pause }));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it.each(['warning', 'active'] as const)('announces the event phase and push direction (%s)', async phase => {
    const event: WorkEvent = { id: 'bossCall', direction: -1, phase, remainingSeconds: 0.6, strength: 1 };
    await render(<GameHud score={64} event={event} onPause={jest.fn()} canPause={true} />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByLabelText(`${phase === 'warning' ? ko.eventWarning : ko.eventActive} · ${ko.eventBossCall}, ${ko.directionLeft}`)).toBeOnTheScreen();
    expect(screen.getByText('←', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps the pause button at least 44pt and disables an unavailable pause', async () => {
    const pause = jest.fn();
    await render(<GameHud score={0} event={null} onPause={pause} canPause={false} />);
    const button = screen.getByRole('button', { name: ko.pause });
    const style = StyleSheet.flatten(button.props.style);
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(pause).not.toHaveBeenCalled();
  });

  it('renders countdown values only from the engine-supplied seconds', async () => {
    jest.useFakeTimers();
    try {
      const view = await render(<CountdownOverlay seconds={2.1} />);
      expect(screen.getByText('3')).toBeOnTheScreen();
      await act(() => jest.advanceTimersByTime(10000));
      expect(screen.getByText('3')).toBeOnTheScreen();
      await view.rerender(<CountdownOverlay seconds={1.9} />);
      expect(screen.getByText('2')).toBeOnTheScreen();
      await view.rerender(<CountdownOverlay seconds={0.1} />);
      expect(screen.getByText('1')).toBeOnTheScreen();
    } finally { jest.useRealTimers(); }
  });

  it('provides resume/home and hides settings unless the callback is supplied', async () => {
    const resume = jest.fn(); const home = jest.fn(); const settings = jest.fn();
    const view = await render(<PauseOverlay onResume={resume} onHome={home} />);
    expect(screen.queryByRole('button', { name: ko.settings })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ko.resume }));
    await fireEvent.press(screen.getByRole('button', { name: ko.home }));
    expect(resume).toHaveBeenCalledTimes(1); expect(home).toHaveBeenCalledTimes(1);
    await view.rerender(<PauseOverlay onResume={resume} onHome={home} onSettings={settings} />);
    await fireEvent.press(screen.getByRole('button', { name: ko.settings }));
    expect(settings).toHaveBeenCalledTimes(1);
  });
});
