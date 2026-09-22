import { createHash, webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream } from 'node:stream/web';
import type { ApiError, ApiErrorCode, InputSpan, ProofChunk } from '../contracts';

// Runtime require exercises the real pure server parser without importing Deno/SDK
// types into the Expo TypeScript graph. Full auth/repository handlers run in Deno.
const { proofChunk, objectWithKeys, uuid, rulesVersion, readJson, digestSpans } =
  require('../../../supabase/functions/_shared/validation.ts') as {
    proofChunk(value: unknown): ProofChunk;
    objectWithKeys(value: unknown, keys: readonly string[]): Record<string, unknown>;
    uuid(value: unknown): string; rulesVersion(value: unknown): string;
    readJson(request: Request): Promise<unknown>; digestSpans(spans: InputSpan[]): Promise<string>;
  };
const { acceptedNickname } = require('../../../supabase/functions/_shared/nickname-blocklist.ts') as {
  acceptedNickname(value: unknown): string;
};
const { ApiFailure, databaseFailure } = require('../../../supabase/functions/_shared/api-error.ts') as {
  ApiFailure: new (code: ApiErrorCode, details?: { expectedSeq?: number; retryAfterSeconds?: number }) =>
    Error & { status: number; toJSON(): ApiError };
  databaseFailure(error: { message?: string; details?: string }): Error & { status: number; toJSON(): ApiError };
};
const RUN_ID = 'aa000000-0000-4000-8000-000000000001';
const original = new Map<string, PropertyDescriptor | undefined>();
beforeAll(() => {
  for (const [name, value] of Object.entries({ TextDecoder, TextEncoder, crypto: webcrypto })) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
});
afterAll(() => {
  for (const [name, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

function request(bytes: Uint8Array, headers: Record<string, string> = {}, batchSize = 997): Request {
  // Real byte stream, only the HTTP Request envelope is a boundary fake in Jest.
  const entries = { 'content-type': 'application/json; charset=utf-8', ...headers };
  let offset = 0;
  return { headers: { get: (name: string) => entries[name as keyof typeof entries] ?? null },
    body: new ReadableStream<Uint8Array>({ pull(controller) {
      if (offset === bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset += Math.min(batchSize, bytes.length - offset)));
    } }),
  } as unknown as Request;
}
const encode = (value: string) => new TextEncoder().encode(value);

describe('real backend shape contract', () => {
  it('normalizes identifiers and accepts only the current version format', () => {
    expect(uuid(RUN_ID.toUpperCase())).toBe(RUN_ID);
    expect(rulesVersion('nyang-v1-0123456789abcdef')).toBe('nyang-v1-0123456789abcdef');
    for (const bad of [null, 1, '', 'user-id', RUN_ID + '/other']) expect(() => uuid(bad)).toThrow();
    for (const bad of ['', 'v1', 'nyang-v1-'+ 'f'.repeat(17)]) expect(() => rulesVersion(bad)).toThrow();
  });
  it('rejects extra client identity, score, elapsed, or action properties', () => {
    const base = { runId: RUN_ID, seq: 0, spans: [{ direction: 0, ticks: 1 }] };
    for (const key of ['user_id', 'score', 'elapsedSeconds', 'revive', 'action']) {
      expect(() => proofChunk({ ...base, [key]: 100 })).toThrow();
    }
    expect(() => objectWithKeys({ nickname: '냥대리', user_id: RUN_ID }, ['nickname'])).toThrow();
  });
  it('canonicalizes same-direction spans without mutating the caller and gives the same digest', async () => {
    const spans = Object.freeze([Object.freeze({ direction: -1, ticks: 3 }), Object.freeze({ direction: -1, ticks: 7 }),
      Object.freeze({ direction: 0, ticks: 5 })]);
    const actual = proofChunk({ runId: RUN_ID, seq: 0, spans });
    expect(actual.spans).toEqual([{ direction: -1, ticks: 10 }, { direction: 0, ticks: 5 }]);
    expect(spans[0].ticks).toBe(3);
    const digest = await digestSpans(actual.spans);
    expect(digest).toBe(createHash('sha256').update(JSON.stringify(actual.spans)).digest('hex'));
    expect(digest).toBe(await digestSpans(proofChunk({ ...actual }).spans));
  });
  it('bounds per-request replay while not declaring a total game score limit', () => {
    expect(proofChunk({ runId: RUN_ID, seq: 9000, spans: [{ direction: 1, ticks: 1200 }] }).spans[0].ticks).toBe(1200);
    for (const spans of [[], [{ direction: 0, ticks: 1201 }], [{ direction: 0, ticks: 600 }, { direction: 1, ticks: 601 }],
      [{ direction: 2, ticks: 1 }], [{ direction: '0', ticks: 1 }], [{ direction: 0, ticks: 0 }],
      [{ direction: 0, ticks: 0.1 }], [{ direction: 0, ticks: NaN }], [{ direction: 0, ticks: Infinity }],
      [{ direction: 0, ticks: 1, score: 999 }]]) {
      expect(() => proofChunk({ runId: RUN_ID, seq: 0, spans })).toThrow();
    }
    for (const seq of [-1, 0.5, NaN, Infinity, '0', 0x80000000]) {
      expect(() => proofChunk({ runId: RUN_ID, seq, spans: [{ direction: 0, ticks: 1 }] })).toThrow();
    }
  });
  it('server moderation is case/space insensitive and duplicate ordinary names remain valid', () => {
    expect(acceptedNickname('  냥  대리 ')).toBe('냥 대리');
    expect(acceptedNickname('냥대리')).toBe(acceptedNickname('냥대리'));
    for (const name of ['F u C k', '씨 발', 'bad@e.com']) expect(() => acceptedNickname(name)).toThrow();
  });
});

describe('bounded byte-body and safe error contract', () => {
  it('reads split UTF-8 chunks with or without Content-Length', async () => {
    const bytes = encode(JSON.stringify({ nickname: '냥대리' }));
    await expect(readJson(request(bytes, {}, 1))).resolves.toEqual({ nickname: '냥대리' });
    await expect(readJson(request(bytes, { 'content-length': String(bytes.length) }))).resolves.toEqual({ nickname: '냥대리' });
  });
  it('enforces actual bytes even for absent or lying size headers', async () => {
    const large = encode(JSON.stringify({ nickname: '냥'.repeat(23000) }));
    const variants: Record<string, string>[] = [{}, { 'content-length': '1' }, { 'content-length': String(large.length) }];
    for (const headers of variants) {
      await expect(readJson(request(large, headers))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    }
  });
  it('rejects malformed JSON, malformed UTF-8, size mismatch and unsupported body types', async () => {
    for (const req of [request(encode('{')), request(new Uint8Array([0xc0, 0xaf])),
      request(encode('{}'), { 'content-length': '3' }), request(encode('{}'), { 'content-length': '-1' }),
      request(encode('{}'), { 'content-type': 'text/plain' })]) {
      await expect(readJson(req)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    }
  });
  it.each<[ApiErrorCode, number]>([
    ['INVALID_INPUT',400], ['UNAUTHORIZED',401], ['FORBIDDEN',403], ['RATE_LIMITED',429],
    ['NICKNAME_REJECTED',422], ['PROFILE_REQUIRED',409], ['EXPIRED',410], ['OUT_OF_ORDER',409],
    ['PROOF_REJECTED',422], ['RULES_MISMATCH',409], ['NOT_FINISHED',409], ['UNAVAILABLE',503],
  ])('maps %s to %i without serializing error internals', (code, status) => {
    const error = new ApiFailure(code);
    expect(error.status).toBe(status);
    expect(Object.keys(error.toJSON()).sort()).toEqual(['code', 'message']);
    expect(error.toJSON().code).toBe(code);
  });
  it('does not echo database diagnostics, secrets or arbitrary JSON details', () => {
    const secret = 'private database diagnostic';
    expect(JSON.stringify(databaseFailure({ message: secret, details: secret }))).not.toContain(secret);
    expect(databaseFailure({ message: secret }).status).toBe(503);
    expect(databaseFailure({ message: 'OUT_OF_ORDER', details: JSON.stringify({ expectedSeq: 2, secret }) }).toJSON())
      .toEqual({ code: 'OUT_OF_ORDER', message: '기록 순서를 확인해 주세요.', expectedSeq: 2 });
  });
});
