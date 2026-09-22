import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChunkAck, LeaderboardEntry, PlayerProfile, SubmitResult } from '../../../src/online/contracts.ts';
import { ApiFailure } from '../_shared/api-error.ts';
import { bearer, createAuthService, type AuthService } from '../_shared/auth.ts';
import { BALANCE } from '../_shared/game/balance.ts';
import { createInitialState, transition } from '../_shared/game/engine.ts';
import { acceptedNickname } from '../_shared/nickname-blocklist.ts';
import { createRateLimiter, type LimitScope } from '../_shared/rate-limit.ts';
import { createRepository, type RankingRepository } from '../_shared/repository.ts';
import { digestSpans, objectWithKeys, proofChunk, readJson, rulesVersion, uuid } from '../_shared/validation.ts';
import { ProofValidationError, verifyChunk } from '../_shared/verifyProof.ts';

export interface ServerDependencies {
  admin: SupabaseClient;
  allowedOrigins: readonly string[];
  rulesVersion: string;
  authIssuer?: string;
  rateLimitSalt?: string;
  /** Dependency seams are server-local only, never selected by request data. */
  repository?: RankingRepository;
  auth?: AuthService;
}

function profile(value: PlayerProfile | null) {
  return value === null ? null : { publicId: value.publicId, nickname: value.nickname, updatedAt: value.updatedAt };
}
function entry(value: LeaderboardEntry): LeaderboardEntry {
  return { publicId: value.publicId, nickname: value.nickname, score: value.score, rank: value.rank, achievedAt: value.achievedAt, isMe: value.isMe };
}
function ack(value: ChunkAck): ChunkAck {
  return { acceptedSeq: value.acceptedSeq, totalTicks: value.totalTicks, terminal: value.terminal, expiresAt: value.expiresAt };
}
function receipt(value: SubmitResult): SubmitResult {
  return { runId: value.runId, score: value.score, bestScore: value.bestScore, rank: value.rank, improved: value.improved };
}

export function createHandler(deps: ServerDependencies): (request: Request) => Promise<Response> {
  const repository = deps.repository ?? createRepository(deps.admin);
  const auth = deps.auth ?? createAuthService(deps.admin, deps.authIssuer ?? '');
  const limit = createRateLimiter(repository, deps.rateLimitSalt ?? '');
  const origins = new Set(deps.allowedOrigins);

  return async request => {
    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'Vary': 'Origin, Authorization', 'X-Content-Type-Options': 'nosniff',
    });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
    try {
      const origin = request.headers.get('origin');
      if (origin !== null && !origins.has(origin)) throw new ApiFailure('FORBIDDEN');
      if (origin !== null) headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
      headers.set('Access-Control-Expose-Headers', 'Retry-After');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

      const url = new URL(request.url);
      const match = /^\/(?:functions\/v1\/)?leaderboard-api(\/[^?]*)$/.exec(url.pathname);
      if (!match) throw new ApiFailure('INVALID_INPUT');
      const path = match[1];
      const route = `${request.method} ${path}`;
      const scopes: Record<string, LimitScope> = {
        'GET /leaderboard': 'read', 'GET /profile': 'read', 'POST /profile': 'profile',
        'DELETE /profile': 'deletion', 'POST /runs': 'start', 'POST /runs/chunks': 'chunk',
        'POST /runs/finalize': 'finalize', 'POST /reports': 'report',
      };
      if (!Object.hasOwn(scopes, route)) throw new ApiFailure('INVALID_INPUT');
      if (path !== '/leaderboard' && [...url.searchParams].length !== 0) throw new ApiFailure('INVALID_INPUT');
      if (request.method === 'DELETE' && request.body !== null) {
        await request.body.cancel();
        throw new ApiFailure('INVALID_INPUT');
      }
      const token = bearer(request);
      let userId: string | null = null;
      let deletionRetry = false;
      if (token !== null) {
        try { userId = await auth.authenticate(token); }
        catch (error) {
          if (route !== 'DELETE /profile' || !(error instanceof ApiFailure) || error.code !== 'UNAUTHORIZED') throw error;
          userId = await auth.verifyDeletionToken(token);
          // A valid signature alone never starts deletion after getUser has failed.
          if (!(await repository.getDeletionStatus(userId))) throw new ApiFailure('UNAUTHORIZED');
          deletionRetry = true;
        }
      }
      if (userId === null && route !== 'GET /leaderboard') throw new ApiFailure('UNAUTHORIZED');
      await limit(request, userId, scopes[route]);

      if (route === 'GET /leaderboard') {
        if ([...url.searchParams.keys()].some(key => key !== 'rulesVersion') || url.searchParams.getAll('rulesVersion').length !== 1) {
          throw new ApiFailure('INVALID_INPUT');
        }
        const version = rulesVersion(url.searchParams.get('rulesVersion'));
        if (version !== deps.rulesVersion) throw new ApiFailure('RULES_MISMATCH');
        const board = await repository.getBoard(userId, version);
        // The personalized object must never enter a shared/CDN cache.
        headers.set('Cache-Control', 'private, max-age=30');
        return json({ entries: board.entries.slice(0, 100).map(entry), me: board.me === null ? null : entry(board.me), rulesVersion: board.rulesVersion, fetchedAt: board.fetchedAt });
      }
      const subject = userId!;
      if (route === 'GET /profile') return json(profile(await repository.getProfile(subject)));
      if (route === 'DELETE /profile') {
        // Recheck/obtain the receipt transactionally before touching Auth.
        const status = await repository.deletePlayerData(subject);
        if (status.status !== 'complete') {
          await auth.deleteUser(subject);
          await repository.completeDeletion(subject);
        }
        return json({ deleted: true });
      }
      // This invariant makes it impossible to extend the fallback to another route accidentally.
      if (deletionRetry) throw new ApiFailure('UNAUTHORIZED');
      const value = await readJson(request);
      if (route === 'POST /profile') {
        const body = objectWithKeys(value, ['nickname']);
        return json(profile(await repository.upsertProfile(subject, acceptedNickname(body.nickname))));
      }
      if (route === 'POST /runs') {
        const body = objectWithKeys(value, ['rulesVersion']);
        const version = rulesVersion(body.rulesVersion);
        if (version !== deps.rulesVersion) throw new ApiFailure('RULES_MISMATCH');
        const random = crypto.getRandomValues(new Uint32Array(2));
        const seed = random[0] || 1;
        const engineRunId = (random[1] & 0x7fffffff) || 1;
        const flags = { mockAdsEnabled: false };
        let state = transition(createInitialState(), { type: 'START', seed, runId: engineRunId }, flags).state;
        for (let tick = 0; tick < 360; tick += 1) {
          state = transition(state, { type: 'TICK', dt: BALANCE.fixedDt, input: { left: false, right: false } }, flags).state;
        }
        if (state.screen !== 'playing' || !state.run || state.run.protectionSeconds !== 0 || state.run.reviveUsed) throw new ApiFailure('UNAVAILABLE');
        const run = await repository.startRun(subject, version, state, seed, engineRunId);
        return json({ runId: run.runId, engineRunId: run.engineRunId, seed: run.seed, rulesVersion: run.rulesVersion, issuedAt: run.issuedAt, expiresAt: run.expiresAt });
      }
      if (route === 'POST /runs/chunks') {
        const chunk = proofChunk(value);
        const checkpoint = await repository.getRun(subject, chunk.runId);
        if (checkpoint.userId !== subject || checkpoint.runId !== chunk.runId) throw new ApiFailure('FORBIDDEN');
        if (checkpoint.rulesVersion !== deps.rulesVersion) throw new ApiFailure('RULES_MISMATCH');
        const digest = await digestSpans(chunk.spans);
        if (chunk.seq === checkpoint.acceptedSeq && digest === checkpoint.lastDigest) {
          // SQL rechecks ownership/expiry and returns the original acknowledgement without extending TTL.
          return json(ack(await repository.commitChunk(subject, chunk.runId, chunk.seq, digest, checkpoint.state, 0, checkpoint.status !== 'active')));
        }
        if (chunk.seq !== checkpoint.acceptedSeq + 1) throw new ApiFailure('OUT_OF_ORDER', { expectedSeq: checkpoint.acceptedSeq + 1 });
        if (checkpoint.status !== 'active') throw new ApiFailure('PROOF_REJECTED');
        const verified = verifyChunk(checkpoint.state, chunk.spans);
        return json(ack(await repository.commitChunk(subject, chunk.runId, chunk.seq, digest, verified.state, verified.ticks, verified.terminal)));
      }
      if (route === 'POST /runs/finalize') {
        const body = objectWithKeys(value, ['runId']);
        return json(receipt(await repository.finalizeRun(subject, uuid(body.runId))));
      }
      const body = objectWithKeys(value, ['targetPublicId', 'reason']);
      if (body.reason !== 'inappropriate' && body.reason !== 'impersonation' && body.reason !== 'other') throw new ApiFailure('INVALID_INPUT');
      await repository.report(subject, uuid(body.targetPublicId), body.reason);
      return json({ reported: true });
    } catch (error) {
      const safe = error instanceof ApiFailure ? error : error instanceof ProofValidationError
        ? new ApiFailure('PROOF_REJECTED') : new ApiFailure('UNAVAILABLE');
      headers.set('Cache-Control', 'no-store');
      if (safe.details.retryAfterSeconds !== undefined) headers.set('Retry-After', String(safe.details.retryAfterSeconds));
      return json(safe.toJSON(), safe.status);
    }
  };
}
