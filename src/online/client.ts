import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { OnlineApiError } from './types';

export const ONLINE_SESSION_KEY = 'close-call-nyang.online.session.v1';
export const ONLINE_DELETION_KEY = 'close-call-nyang.online.deletion.v1';
export interface OnlineIdentity { userId: string; accessToken: string }
export interface OnlineConfig { url: string; publishableKey: string }
const listeners = new Set<(identity: OnlineIdentity | null) => void>();
let client: SupabaseClient | null = null;
let signup: Promise<void> | null = null;
let deletion: OnlineIdentity | null | undefined;
let deletionRead: Promise<OnlineIdentity | null> | null = null;
let foreground = true;
let clientGeneration = 0;
let authWrites: Promise<void> = Promise.resolve();
let clearing: Promise<void> | null = null;
let authSubscription: { unsubscribe(): void } | null = null;

const storage = {
  async getItem(key: string): Promise<string | null> {
    return Platform.OS === 'web' && typeof localStorage !== 'undefined' ? localStorage.getItem(key) : AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    else await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.removeItem(key);
    else await AsyncStorage.removeItem(key);
  },
};

/** Expo replaces these literal public env accesses at bundle time. No service key is accepted. */
export function getOnlineConfig(): OnlineConfig | null {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !publishableKey || !publishableKey.startsWith('sb_publishable_')) return null;
  try {
    const parsed = new URL(rawUrl);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) return null;
    return { url: parsed.origin, publishableKey };
  } catch { return null; }
}

function announce(identity: OnlineIdentity | null): void { for (const listener of listeners) listener(identity); }

/** Includes a race because some fetch adapters do not promptly reject on abort. */
export async function withOnlineDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, milliseconds: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new OnlineApiError('UNAVAILABLE')); }, milliseconds);
  });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}

export function getOnlineClient(): SupabaseClient | null {
  if (clearing) return null;
  if (client) return client;
  const config = getOnlineConfig();
  if (!config) return null;
  const generation = ++clientGeneration;
  const write = (operation: () => Promise<void>): Promise<void> => {
    const next = authWrites.catch(() => undefined).then(async () => { if (generation === clientGeneration) await operation(); });
    authWrites = next;
    return next;
  };
  const guardedStorage = {
    async getItem(key: string) { await authWrites.catch(() => undefined); return generation === clientGeneration ? storage.getItem(key) : null; },
    setItem: (key: string, value: string) => write(() => storage.setItem(key, value)),
    removeItem: (key: string) => write(() => storage.removeItem(key)),
  };
  client = createClient(config.url, config.publishableKey, {
    auth: { storage: guardedStorage, storageKey: ONLINE_SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => withOnlineDeadline(signal => fetch(input, { ...init, signal }), 8_000) },
  });
  const current = client;
  authSubscription = current.auth.onAuthStateChange((_event, session) => {
    // Keep auth callbacks synchronous and avoid re-entering SDK auth methods here.
    if (generation === clientGeneration) announce(deletion ?? (session ? { userId: session.user.id, accessToken: session.access_token } : null));
  }).data.subscription;
  if (!foreground || deletion) current.auth.stopAutoRefresh();
  return client;
}

export async function getPendingDeletion(): Promise<OnlineIdentity | null> {
  if (deletion !== undefined) return deletion;
  if (!deletionRead) deletionRead = (async () => {
    const saved = await storage.getItem(ONLINE_DELETION_KEY);
    if (!saved) return (deletion = null);
    try {
      const value = JSON.parse(saved) as Partial<OnlineIdentity>;
      if (typeof value.userId !== 'string' || !value.userId || typeof value.accessToken !== 'string' || !value.accessToken || value.accessToken.length > 16_384) throw new Error('invalid');
      deletion = { userId: value.userId, accessToken: value.accessToken };
      getOnlineClient()?.auth.stopAutoRefresh();
      return deletion;
    } catch { throw new OnlineApiError('UNAVAILABLE'); }
  })().catch(error => { deletionRead = null; throw error; });
  return deletionRead;
}

export async function getOnlineIdentity(): Promise<OnlineIdentity | null> {
  const pending = await getPendingDeletion();
  if (pending) return pending;
  const current = getOnlineClient();
  if (!current) return null;
  const { data, error } = await current.auth.getSession();
  if (error) throw new OnlineApiError('UNAVAILABLE');
  return data.session ? { userId: data.session.user.id, accessToken: data.session.access_token } : null;
}

/** The only anonymous signup entry point; callers invoke this on explicit nickname save. */
export async function ensureGuestSession(): Promise<void> {
  if (await getPendingDeletion()) throw new OnlineApiError('UNAVAILABLE');
  if (signup) return withOnlineDeadline(() => signup!, 10_000);
  return withOnlineDeadline(signal => {
    const operation = (async () => {
      if (await getOnlineIdentity()) return;
      if (signal.aborted || await getPendingDeletion()) throw new OnlineApiError('UNAVAILABLE');
      const current = getOnlineClient();
      if (!current) throw new OnlineApiError('UNAVAILABLE');
      const generation = clientGeneration;
      const { data, error } = await current.auth.signInAnonymously();
      if (error || !data.session || generation !== clientGeneration) throw new OnlineApiError('UNAVAILABLE');
    })();
    signup = operation;
    // Keep single-flight ownership until the underlying SDK operation settles, not just our UI deadline.
    void operation.finally(() => { if (signup === operation) signup = null; }).catch(() => undefined);
    return operation;
  }, 10_000);
}

export async function refreshOnlineIdentity(expectedUserId: string): Promise<OnlineIdentity> {
  if (await getPendingDeletion()) throw new OnlineApiError('UNAUTHORIZED', 401);
  const current = getOnlineClient();
  if (!current) throw new OnlineApiError('UNAUTHORIZED', 401);
  const { data, error } = await current.auth.refreshSession();
  if (error || !data.session || data.session.user.id !== expectedUserId) throw new OnlineApiError('UNAUTHORIZED', 401);
  return { userId: data.session.user.id, accessToken: data.session.access_token };
}

/** Auth-only retry credentials, never included in proofs/public profiles or logs. */
export async function preserveDeletionIdentity(identity: OnlineIdentity): Promise<void> {
  const pending = await getPendingDeletion();
  if (pending && pending.userId !== identity.userId) throw new OnlineApiError('UNAUTHORIZED', 401);
  if (pending) return;
  // Persist before the destructive request so restart/lost response can retry the same identity.
  await storage.setItem(ONLINE_DELETION_KEY, JSON.stringify(identity));
  deletion = identity;
  getOnlineClient()?.auth.stopAutoRefresh();
}

/** Only called after confirmed server deletion; never touches preferences/collection/proofs. */
export function clearOnlineSession(): Promise<void> {
  if (clearing) return clearing;
  clearing = (async () => {
  // Removing these exact auth keys is local-only, even after the server has deleted Auth.
  clientGeneration += 1;
  client?.auth.stopAutoRefresh();
  authSubscription?.unsubscribe();
  authSubscription = null;
  client = null;
  await authWrites.catch(() => undefined);
  await storage.removeItem(ONLINE_SESSION_KEY);
  await storage.removeItem(`${ONLINE_SESSION_KEY}-code-verifier`);
  await storage.removeItem(ONLINE_DELETION_KEY);
  deletion = null;
  deletionRead = null;
  announce(null);
  })().finally(() => { clearing = null; });
  return clearing;
}

export function subscribeOnlineIdentity(listener: (identity: OnlineIdentity | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function startOnlineSessionLifecycle(): () => void {
  if (!getOnlineClient()) return () => undefined;
  const update = (active: boolean) => {
    foreground = active;
    if (active && !deletion) client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  };
  update(Platform.OS === 'web' ? typeof document === 'undefined' || document.visibilityState !== 'hidden' : AppState.currentState === 'active');
  const sub = AppState.addEventListener('change', state => update(state === 'active'));
  const visibility = () => update(document.visibilityState !== 'hidden');
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
  void getPendingDeletion().then(pending => { if (pending || !foreground) client?.auth.stopAutoRefresh(); }).catch(() => client?.auth.stopAutoRefresh());
  return () => {
    sub.remove();
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility);
    client?.auth.stopAutoRefresh();
  };
}
