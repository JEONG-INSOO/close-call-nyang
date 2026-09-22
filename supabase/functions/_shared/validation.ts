import type { InputSpan, ProofChunk } from '../../../src/online/contracts.ts';
import { ApiFailure } from './api-error.ts';

export const MAX_BODY_BYTES = 64 * 1024;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function objectWithKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) {
    throw new ApiFailure('INVALID_INPUT');
  }
  return value as Record<string, unknown>;
}

export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new ApiFailure('INVALID_INPUT');
  return value.toLowerCase();
}

export function rulesVersion(value: unknown): string {
  if (typeof value !== 'string' || !/^nyang-v1-[a-f0-9]{16}$/.test(value)) throw new ApiFailure('INVALID_INPUT');
  return value;
}

/** Enforce the cap on received bytes, never only the untrusted Content-Length header. */
export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiFailure('INVALID_INPUT');
  }
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new ApiFailure('INVALID_INPUT');
  }
  if (!request.body) throw new ApiFailure('INVALID_INPUT');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiFailure('INVALID_INPUT');
      }
      chunks.push(value);
    }
    if (declared !== null && Number(declared) !== total) throw new ApiFailure('INVALID_INPUT');
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure('INVALID_INPUT');
  } finally { reader.releaseLock(); }
}

export function proofChunk(value: unknown): ProofChunk {
  const body = objectWithKeys(value, ['runId', 'seq', 'spans']);
  if (!Number.isInteger(body.seq) || (body.seq as number) < 0 || (body.seq as number) > 0x7fffffff ||
      !Array.isArray(body.spans) || body.spans.length < 1 || body.spans.length > 1200) throw new ApiFailure('INVALID_INPUT');
  const spans: InputSpan[] = [];
  let ticks = 0;
  for (const value of body.spans) {
    const span = objectWithKeys(value, ['direction', 'ticks']);
    if ((span.direction !== -1 && span.direction !== 0 && span.direction !== 1) ||
        !Number.isInteger(span.ticks) || (span.ticks as number) < 1) throw new ApiFailure('INVALID_INPUT');
    ticks += span.ticks as number;
    if (ticks > 1200) throw new ApiFailure('INVALID_INPUT');
    const previous = spans.at(-1);
    if (previous?.direction === span.direction) previous.ticks += span.ticks as number;
    else spans.push({ direction: span.direction, ticks: span.ticks as number });
  }
  return { runId: uuid(body.runId), seq: body.seq as number, spans };
}

export async function digestSpans(spans: readonly InputSpan[]): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(spans)));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
