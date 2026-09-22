import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { ApiFailure } from '../api-error.ts';
import { bearer, createAuthService } from '../auth.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const ISSUER = 'https://project.supabase.co/auth/v1';
function admin(getUser: (token: string) => Promise<unknown>, deleteUser = async (_id: string, _soft: boolean): Promise<unknown> => ({ error: null })) {
  return { auth: { getUser, admin: { deleteUser } } } as unknown as SupabaseClient;
}

Deno.test('normal authentication explicitly calls trusted getUser with the supplied bearer', async () => {
  const tokens: string[] = [];
  const service = createAuthService(admin(async token => { tokens.push(token); return { data: { user: { id: USER } }, error: null }; }), ISSUER);
  assert.equal(await service.authenticate('test-not-a-decoded-jwt'), USER);
  assert.deepEqual(tokens, ['test-not-a-decoded-jwt']);
});

Deno.test('getUser invalid sessions are unauthorized; outages and upstream throttling remain retryable', async () => {
  for (const status of [401, 403, 429, 503]) {
    const service = createAuthService(admin(async () => ({ data: { user: null }, error: { status, message: 'private-server-error' } })), ISSUER);
    await assert.rejects(service.authenticate('token'), error => error instanceof ApiFailure && error.code === (status === 429 || status >= 500 ? 'UNAVAILABLE' : 'UNAUTHORIZED'));
  }
  const failed = createAuthService(admin(async () => { throw new TypeError('network-token-secret'); }), ISSUER);
  await assert.rejects(failed.authenticate('token'), error => error instanceof ApiFailure && error.code === 'UNAVAILABLE' && !error.message.includes('secret'));
});

Deno.test('bearer parsing rejects empty, combined and oversized credentials', () => {
  assert.equal(bearer(new Request('https://example.com')), null);
  assert.equal(bearer(new Request('https://example.com', { headers: { authorization: 'bearer token' } })), 'token');
  for (const authorization of ['Basic token', 'Bearer', 'Bearer one,two', 'Bearer two tokens', `Bearer ${'a'.repeat(17000)}`]) {
    assert.throws(() => bearer(new Request('https://example.com', { headers: { authorization } })), ApiFailure);
  }
});

Deno.test('deletion fallback verifies real ES256 signatures plus issuer, audience, expiry, role and subject', async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  const jwk = { ...await exportJWK(pair.publicKey), kid: 'deletion-test', alg: 'ES256' };
  const service = createAuthService(admin(async () => ({ data: { user: null }, error: { status: 401 } })), ISSUER, createLocalJWKSet({ keys: [jwk] }));
  async function token(options: { issuer?: string; audience?: string; role?: string; subject?: string; expires?: number; missingExpiry?: boolean } = {}) {
    let value = new SignJWT({ role: options.role ?? 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'deletion-test' }).setIssuer(options.issuer ?? ISSUER)
      .setAudience(options.audience ?? 'authenticated').setSubject(options.subject ?? USER).setIssuedAt();
    if (!options.missingExpiry) value = value.setExpirationTime(options.expires ?? Math.floor(Date.now() / 1000) + 300);
    return await value.sign(pair.privateKey);
  }
  assert.equal(await service.verifyDeletionToken(await token()), USER);
  for (const bad of [
    await token({ issuer: 'https://other.supabase.co/auth/v1' }), await token({ audience: 'service_role' }),
    await token({ role: 'service_role' }), await token({ subject: 'not-a-uuid' }),
    await token({ expires: 1 }), await token({ missingExpiry: true }), 'not-a-jwt',
  ]) {
    await assert.rejects(service.verifyDeletionToken(bad), error => error instanceof ApiFailure && error.code === 'UNAUTHORIZED');
  }
  const attacker = await generateKeyPair('ES256');
  const forged = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'ES256', kid: 'deletion-test' })
    .setIssuer(ISSUER).setAudience('authenticated').setSubject(USER).setIssuedAt().setExpirationTime('5m').sign(attacker.privateKey);
  await assert.rejects(service.verifyDeletionToken(forged), error => error instanceof ApiFailure && error.code === 'UNAUTHORIZED');
});

Deno.test('legacy symmetric deletion tokens are deliberately unsupported rather than decoded or trusted', async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  const service = createAuthService(admin(async () => ({})), ISSUER,
    createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'test' }] }));
  const token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER).setAudience('authenticated').setSubject(USER).setIssuedAt().setExpirationTime('5m')
    .sign(new TextEncoder().encode('unit-test-only-not-an-actual-project-secret'));
  await assert.rejects(service.verifyDeletionToken(token), error => error instanceof ApiFailure && error.code === 'UNAUTHORIZED');
});

Deno.test('hard Auth deletion only targets its verified subject and tolerates already-deleted users', async () => {
  const calls: unknown[][] = [];
  const service = createAuthService(admin(async () => ({}), async (...args) => { calls.push(args); return { error: null }; }), ISSUER);
  await service.deleteUser(USER);
  assert.deepEqual(calls, [[USER, false]]);
  const missing = createAuthService(admin(async () => ({}), async () => ({ error: { status: 404, code: 'user_not_found' } })), ISSUER);
  await missing.deleteUser(USER);
  const unavailable = createAuthService(admin(async () => ({}), async () => ({ error: { status: 503 } })), ISSUER);
  await assert.rejects(unavailable.deleteUser(USER), error => error instanceof ApiFailure && error.code === 'UNAVAILABLE');
});
