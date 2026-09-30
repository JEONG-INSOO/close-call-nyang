import metadata from '../../../store/ko-KR/metadata.json';
import { PUBLIC_WEB_URL } from '../app';
import { PUBLIC_LINKS } from '../publicLinks';

describe('public document URL contract', () => {
  it('uses exact official HTTPS subpaths with no account data or query', () => {
    expect(PUBLIC_LINKS).toEqual({ privacy: `${PUBLIC_WEB_URL}privacy/`, support: `${PUBLIC_WEB_URL}support/` });
    for (const value of Object.values(PUBLIC_LINKS)) {
      const url = new URL(value);
      expect(url.protocol).toBe('https:');
      expect(url.search + url.hash + url.username + url.password).toBe('');
    }
  });
  it('agrees with the store listing rather than the old public GitHub issue tracker', () => {
    expect(PUBLIC_LINKS.privacy).toBe(metadata.privacyPolicyUrl);
    expect(PUBLIC_LINKS.support).toBe(metadata.supportUrl);
  });
});
