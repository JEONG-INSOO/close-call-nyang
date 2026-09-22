import { createClient } from '@supabase/supabase-js';
import { RULES_VERSION } from '../_shared/game/rulesVersion.ts';
import { createHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const salt = Deno.env.get('RANKING_RATE_LIMIT_SALT');
const staging = Deno.env.get('RANKING_ENVIRONMENT') === 'staging';
const origins = (Deno.env.get('RANKING_ALLOWED_ORIGINS') ?? 'https://jeong-insoo.github.io')
  .split(',').map(value => value.trim()).filter(Boolean);
const validOrigins = origins.every(value => {
  try {
    const parsed = new URL(value);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    return value === parsed.origin &&
      (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && local && staging)) && (!local || staging);
  } catch { return false; }
});

if (!url || !serviceKey || !salt || salt.length < 32 || !validOrigins || origins.length === 0) {
  // Configuration errors must not disclose missing secret names or their values to clients.
  Deno.serve(() => Response.json({ code: 'UNAVAILABLE', message: '일시적으로 연결할 수 없습니다.' }, {
    status: 503, headers: { 'Cache-Control': 'no-store' },
  }));
} else {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  Deno.serve(createHandler({
    admin, allowedOrigins: origins, rulesVersion: RULES_VERSION,
    authIssuer: `${url.replace(/\/$/, '')}/auth/v1`, rateLimitSalt: salt,
  }));
}
