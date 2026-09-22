import { normalizeNickname, validateNickname } from '../nickname';

describe('shared nickname shape, not authoritative moderation', () => {
  it('normalizes composed Hangul, trims and collapses internal whitespace', () => {
    expect(normalizeNickname('  냥   대리  ')).toBe('냥 대리');
    expect(validateNickname('  냥   대리  ')).toEqual({ ok: true, value: '냥 대리' });
    expect(validateNickname('김\u00a0\u00a0대리')).toEqual({ ok: true, value: '김 대리' });
  });
  it.each(['냥냥', '냥대리 2', 'Office CAT', 'abc123', '가'.repeat(12), 'AB'])('accepts %s', value => {
    expect(validateNickname(value)).toEqual({ ok: true, value });
  });
  it.each(['', '   ', '가', '가'.repeat(13), 'abc@def.com', 'https://a.co', '냥_대리', '냥-대리',
    '고양이🐈', 'ㄱㄴ', '猫猫', '김\u200b대리', '김\ud800대리', '김\u202e대리', '김\n대리', '김\t대리', '김\0대리'])('rejects unsupported name %j', value => {
    expect(validateNickname(value).ok).toBe(false);
  });
  it('guards malformed runtime values without coercing them', () => {
    for (const value of [null, undefined, 123, {}, ['냥대리']]) {
      expect(validateNickname(value as unknown as string).ok).toBe(false);
    }
  });
  it('does not impose uniqueness or replace server-side moderation', () => {
    expect(validateNickname('냥대리')).toEqual(validateNickname('냥대리'));
    expect(validateNickname('admin').ok).toBe(true); // Server alone owns its reject list.
  });
});
