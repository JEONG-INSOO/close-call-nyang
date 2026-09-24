import { ApiFailure } from './api-error.ts';
import type { RankingRepository } from './repository.ts';

const LIMITS = {
  read: [60, 60], profile: [3600, 5], start: [60, 30], chunk: [60, 120],
  report: [86400, 10], finalize: [60, 30], deletion: [60, 10],
} as const;
export type LimitScope = keyof typeof LIMITS;

export function createRateLimiter(repository: RankingRepository, salt: string) {
  if (salt.length < 32) throw new Error('A server-only rate limit salt of at least 32 characters is required.');
  const key = crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return async (request: Request, userId: string | null, scope: LimitScope): Promise<void> => {
    let identity = userId ? `user:${userId}` : '';
    if (!identity) {
      // Supabase's Cloudflare Gateway supplies cf-connecting-ip for the requester.
      // X-Forwarded-For is client-controlled and may fan out requests into forged buckets.
      // If the trusted Gateway header is absent, use one conservative shared guest bucket.
      const ip = request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const hashed = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(`${day}:${ip}`));
      identity = `guest:${Array.from(new Uint8Array(hashed), byte => byte.toString(16).padStart(2, '0')).join('')}`;
    }
    const [window, maximum] = LIMITS[scope];
    const result = await repository.limit(`${scope}:${identity}`, window, maximum);
    if (!result.allowed) {
      const retryAfterSeconds = Number.isFinite(result.retryAfterSeconds)
        ? Math.max(1, Math.ceil(result.retryAfterSeconds)) : window;
      throw new ApiFailure('RATE_LIMITED', { retryAfterSeconds });
    }
  };
}
