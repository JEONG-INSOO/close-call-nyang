import type { SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { ApiFailure } from './api-error.ts';
import { UUID } from './validation.ts';

export interface AuthService {
  authenticate(token: string): Promise<string>;
  verifyDeletionToken(token: string): Promise<string>;
  deleteUser(userId: string): Promise<void>;
}

export function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header === null) return null;
  const match = /^Bearer ([^\s,]+)$/i.exec(header);
  if (!match || match[1].length > 16384) throw new ApiFailure('UNAUTHORIZED');
  return match[1];
}

export function createAuthService(admin: SupabaseClient, issuer: string, keys?: JWTVerifyGetKey): AuthService {
  const jwks = keys ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return {
    async authenticate(token) {
      try {
        const { data, error } = await admin.auth.getUser(token);
        if (error) throw new ApiFailure(error.status && error.status < 500 && error.status !== 429 ? 'UNAUTHORIZED' : 'UNAVAILABLE');
        if (!data.user || !UUID.test(data.user.id)) throw new ApiFailure('UNAUTHORIZED');
        return data.user.id.toLowerCase();
      } catch (error) {
        if (error instanceof ApiFailure) throw error;
        throw new ApiFailure('UNAVAILABLE');
      }
    },
    async verifyDeletionToken(token) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer, audience: 'authenticated', algorithms: ['ES256', 'RS256'],
          requiredClaims: ['sub', 'exp', 'iat'],
        });
        if (payload.role !== 'authenticated' || typeof payload.sub !== 'string' || !UUID.test(payload.sub)) {
          throw new ApiFailure('UNAUTHORIZED');
        }
        return payload.sub.toLowerCase();
      } catch (error) {
        if (error instanceof ApiFailure) throw error;
        const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
        if (error instanceof TypeError || code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JOSE_GENERIC') {
          throw new ApiFailure('UNAVAILABLE');
        }
        throw new ApiFailure('UNAUTHORIZED');
      }
    },
    async deleteUser(userId) {
      try {
        const { error } = await admin.auth.admin.deleteUser(userId, false);
        if (error && error.status !== 404 && error.code !== 'user_not_found') throw new ApiFailure('UNAVAILABLE');
      } catch (error) {
        if (error instanceof ApiFailure) throw error;
        throw new ApiFailure('UNAVAILABLE');
      }
    },
  };
}
