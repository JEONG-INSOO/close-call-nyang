import { formatShareText, type ShareResult } from './shareText';

export { formatShareText, type ShareResult } from './shareText';

/** Call directly in the press handler, before any unrelated await/user activation loss. */
export async function shareScore(score: number): Promise<ShareResult> {
  const text = formatShareText(score);
  try {
    if (typeof window === 'undefined' || !window.isSecureContext ||
        typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return { status: 'manual', text };
    }
    await navigator.clipboard.writeText(text);
    return { status: 'copied', text };
  } catch {
    return { status: 'manual', text };
  }
}
