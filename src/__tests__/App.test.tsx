import { render, screen } from '@testing-library/react-native';

import App from '../../App';
import { ko } from '../i18n/ko';

describe('App foundation', () => {
  it('renders the Korean title and an honest readiness message', async () => {
    await render(<App />);

    expect(screen.getByRole('header', { name: ko.title })).toBeOnTheScreen();
    expect(screen.getByText(ko.foundationStatus)).toBeOnTheScreen();
    expect(screen.queryByText(ko.start)).toBeNull();
  });
});
