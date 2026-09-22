export type NicknameValidation = { ok: true; value: string } | { ok: false; reason: string };

/** Shape normalization shared with the server; authoritative moderation stays server-only. */
export function normalizeNickname(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validateNickname(value: string): NicknameValidation {
  if (typeof value !== 'string') return { ok: false, reason: '닉네임은 글자로 입력해 주세요.' };
  // Check before whitespace normalization, so newlines/tabs never become valid names.
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    return { ok: false, reason: '닉네임에 제어 문자를 사용할 수 없어요.' };
  }
  const normalized = normalizeNickname(value);
  const length = [...normalized].length;
  if (length < 2 || length > 12) return { ok: false, reason: '닉네임은 2~12글자로 입력해 주세요.' };
  if (!/^[가-힣A-Za-z0-9]+(?: [가-힣A-Za-z0-9]+)*$/u.test(normalized)) {
    return { ok: false, reason: '한글, 영문, 숫자와 글자 사이 공백만 사용할 수 있어요.' };
  }
  return { ok: true, value: normalized };
}
