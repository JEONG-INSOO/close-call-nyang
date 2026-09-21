import { render, screen } from '@testing-library/react-native';

import App from '../../App';
import { ko } from '../i18n/ko';

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 5 }, lockAsync: jest.fn(() => Promise.resolve()),
}));

describe('App title', () => {
  it('offers one start action and hides unfinished services', async () => {
    await render(<App />);

    expect(screen.getByRole('header', { name: ko.title })).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: ko.start })).toHaveLength(1);
    expect(screen.queryByText(ko.foundationStatus)).toBeNull();
    expect(screen.queryByRole('button', { name: ko.settings })).toBeNull();
    expect(screen.queryByRole('button', { name: ko.share })).toBeNull();
    expect(screen.queryByRole('button', { name: ko.revive })).toBeNull();
  });
});
