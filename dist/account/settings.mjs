export function publicSettings(url, key) {
  const origin = new URL(url);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if (!(origin.protocol === 'https:' || (local && origin.protocol === 'http:')) ||
      origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Expected a Supabase project origin.');
  }
  let legacyAnon = false;
  if (typeof key === 'string' && key.split('.').length === 3) {
    try {
      const payload = key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      legacyAnon = JSON.parse(atob(payload)).role === 'anon';
    } catch { /* Invalid public key. */ }
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) && !legacyAnon) {
    throw new Error('Expected a publishable key or a legacy anon key.');
  }
  return { url: origin.origin, key };
}
