/** A visible window may briefly blur while Safari adjusts browser chrome. */
export const WEB_BLUR_GRACE_MS = 500;

export function subscribeWebForeground(callback: (foreground: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last: boolean | null = null;
  let blurred = false;
  let pageHidden = false;
  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const publish = (foreground: boolean) => {
    if (last === foreground) return;
    last = foreground;
    callback(foreground);
  };
  const hidden = () => pageHidden || document.visibilityState === 'hidden';
  const blur = () => {
    blurred = true;
    if (hidden()) { clearTimer(); publish(false); return; }
    // Repeated blur events must not postpone a genuine departure indefinitely.
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (hidden() || (blurred && !document.hasFocus())) publish(false);
    }, WEB_BLUR_GRACE_MS);
  };
  const focus = () => {
    blurred = false;
    clearTimer();
    publish(!hidden());
  };
  const visibility = () => {
    clearTimer();
    if (hidden()) { publish(false); return; }
    blurred = false;
    publish(true);
  };
  const pagehide = () => { pageHidden = true; clearTimer(); publish(false); };
  const pageshow = () => { pageHidden = false; visibility(); };
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  document.addEventListener('visibilitychange', visibility);
  visibility();
  return () => {
    clearTimer();
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', focus);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
    document.removeEventListener('visibilitychange', visibility);
  };
}
