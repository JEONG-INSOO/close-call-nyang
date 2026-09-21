import { render, screen } from '@testing-library/react-native';

import App from '../../App';
import { ko } from '../i18n/ko';

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('../services/audio', () => {
  const api = { unlock: jest.fn(), setPlaying: jest.fn(), cue: jest.fn() };
  return { useGameAudio: () => api };
});

describe('App title', () => {
  it('offers one start action with settings and characters, but no title ad/share button', async () => {
    await render(<App />);

    expect(screen.getByRole('header', { name: ko.title })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: ko.start })).toHaveLength(1);
    expect(screen.queryByText(ko.foundationStatus)).toBeNull();
    expect(screen.getByRole('button', { name: ko.settings })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ko.characters })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ko.share })).toBeNull();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
  });
});
