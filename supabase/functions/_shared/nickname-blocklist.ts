import { validateNickname } from '../../../src/online/nickname.ts';
import { ApiFailure } from './api-error.ts';

// A deliberately small launch list, not a claim of exhaustive moderation.
// Reports and operator hide/ban actions remain necessary for contextual abuse.
const BLOCKED = ['시발', '씨발', '병신', '개새끼', 'fuck', 'shit', 'nigger'];

export function acceptedNickname(value: unknown): string {
  if (typeof value !== 'string') throw new ApiFailure('INVALID_INPUT');
  const normalized = validateNickname(value);
  if (!normalized.ok) throw new ApiFailure('NICKNAME_REJECTED');
  const compact = normalized.value.replaceAll(' ', '').toLowerCase();
  if (BLOCKED.some(word => compact.includes(word))) throw new ApiFailure('NICKNAME_REJECTED');
  return normalized.value;
}
