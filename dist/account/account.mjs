import { projectUrl, publicKey } from './config.mjs';
import { publicSettings } from './settings.mjs';

const byId = id => document.getElementById(id);
const status = message => { byId('status').textContent = message; };
const login = byId('login');
const workspace = byId('workspace');
const sections = ['credentials', 'verify', 'recovery', 'account'];
const fields = 'career_goal,next_step,revision';
let client, makeClient, session, revision, expiryTimer, dataClient, dataToken;
let generation = 0;
let closing = false;
let creating = false;

function show(section, message) {
  for (const id of sections) byId(id).hidden = id !== section;
  status(message);
}

function workspaceBusy(busy) {
  for (const control of workspace.elements) control.disabled = busy;
}

function clearPrivate() {
  generation++;
  clearTimeout(expiryTimer);
  session = null;
  dataClient = dataToken = null;
  revision = undefined; // A successful empty read alone permits an insert.
  workspace.reset();
  workspace.hidden = true;
  byId('reload').hidden = true;
  byId('identity').textContent = '';
  login.reset();
  byId('recovery').reset();
  workspaceBusy(false);
}

function signedOut(message = 'Sign in to access your saved career goal and next step.') {
  clearPrivate();
  closing = false;
  show('credentials', message);
  loginBusy(false);
}

function loginBusy(busy) {
  for (const control of [...login.elements, byId('mode'), byId('reset')]) control.disabled = busy;
}

function setExpiry() {
  clearTimeout(expiryTimer);
  const delay = session.expires_at * 1000 - Date.now();
  expiryTimer = setTimeout(() => signedOut('Your session expired. Sign in again.'), Math.max(0, delay));
}

function authChanged(event, next) {
  if (!next || event === 'SIGNED_OUT') {
    signedOut(closing || session ? 'Signed out.' : undefined);
    return;
  }
  if (closing) return;
  if (!(next.expires_at * 1000 > Date.now())) {
    signedOut('Your session expired. Sign in again.');
    return;
  }
  if (next.user.id === session?.user.id) {
    session = next;
    setExpiry();
    return;
  }
  clearPrivate();
  session = next;
  setExpiry();
  byId('identity').textContent = next.user.email;
  byId('logout').disabled = false;
  show('account', 'Loading your workspace…');
  // Leave the SDK auth callback synchronously, without taking another auth lock.
  const ticket = generation;
  setTimeout(() => { if (ticket === generation) loadWorkspace(); }, 0);
}

function table(token) {
  // Capture the access token before dispatch. An old write cannot acquire a
  // newly signed-in user's JWT, including on the first insert with a DB default.
  if (token !== dataToken) {
    dataClient = makeClient({ accessToken: async () => token });
    dataToken = token;
  }
  return dataClient.from('customer_workspaces');
}

function rejectSession() {
  clearPrivate();
  closing = true;
  byId('logout').disabled = false;
  show('account', 'The service rejected this session. Sign out and sign in again.');
}

async function loadWorkspace() {
  const ticket = ++generation;
  const { access_token: token, user } = session;
  // Replace a loaded draft and its revision only after the read succeeds.
  workspaceBusy(true);
  byId('reload').hidden = true;
  status('Loading your workspace…');
  try {
    const { data, error, status: code } = await table(token).select(fields).eq('owner_id', user.id).maybeSingle();
    if (ticket !== generation) return;
    if (code === 401) {
      if (token === session.access_token) return rejectSession();
      byId('reload').hidden = false;
      status(workspace.hidden ? 'Session refreshed. Choose Reload saved workspace to retry.' :
        'Session refreshed. Your draft is here. Choose Save workspace to keep it or Reload saved workspace to retry.');
      return;
    }
    if (error) throw error;
    revision = data?.revision ?? null;
    for (const name of ['career_goal', 'next_step']) workspace.elements[name].value = data?.[name] ?? '';
    workspace.hidden = false;
    status(data ? 'Your saved workspace.' : 'Your workspace is empty. Add your first goal and next step.');
  } catch {
    if (ticket !== generation) return;
    byId('reload').hidden = false;
    status(workspace.hidden ? 'Could not load your workspace. Retry to enable editing.' :
      'Could not load your workspace. Your draft is here. Retry loading the saved copy.');
  } finally {
    if (ticket === generation) workspaceBusy(false);
  }
}

workspace.onsubmit = async event => {
  event.preventDefault();
  if (!session || revision === undefined || workspace.hidden) return;
  const ticket = generation;
  const { access_token: token, user } = session;
  const values = Object.fromEntries(new FormData(workspace));
  workspaceBusy(true);
  byId('reload').hidden = true;
  status('Saving…');
  try {
    const records = table(token);
    const request = revision === null ? records.insert(values) :
      records.update(values).eq('owner_id', user.id).eq('revision', revision);
    const { data, error, status: code } = await request.select('revision').maybeSingle();
    if (ticket !== generation) return;
    if (code === 401) {
      if (token === session.access_token) return rejectSession();
      status('Session refreshed. Your draft is here. Choose Save workspace to retry.');
      return;
    }
    if (error || !data) throw new Error('Unconfirmed write');
    revision = data.revision;
    status('Workspace saved.');
  } catch {
    if (ticket !== generation) return;
    byId('reload').hidden = false;
    status('Save unconfirmed. Your draft is here. Retry, or reload the saved copy to resolve a conflict.');
  } finally {
    if (ticket === generation) workspaceBusy(false);
  }
};
byId('reload').onclick = () => {
  if (workspace.hidden || window.confirm('Replace this draft with the saved workspace once it loads?')) loadWorkspace();
};
byId('logout').onclick = async () => {
  clearPrivate();
  closing = true;
  byId('logout').disabled = true;
  show('account', 'Signing out…');
  const ticket = generation;
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (ticket === generation) signedOut('Signed out.');
  } catch {
    if (!session && !closing && generation === ticket + 1) {
      status('Signed out on this device. The service could not confirm session revocation.');
      return;
    }
    if (ticket !== generation) return;
    byId('logout').disabled = false;
    status('Sign-out could not be confirmed. Retry sign out.');
  }
};
byId('mode').onclick = () => {
  creating = !creating;
  byId('submit-login').textContent = creating ? 'Sign up' : 'Sign in';
  byId('mode').textContent = creating ? 'Use existing account' : 'Create an account';
  login.elements.password.autocomplete = creating ? 'new-password' : 'current-password';
  login.elements.password.minLength = creating ? 8 : 1;
  login.elements.password.value = '';
  status(creating ? 'Create your customer account.' : 'Sign in to your account.');
  login.elements.email.focus();
};

const callbackUrl = new URL('./', import.meta.url).href;
async function credentialsAction(action) {
  const ticket = generation;
  const { email, password } = Object.fromEntries(new FormData(login));
  loginBusy(true);
  status('Contacting the account service…');
  try {
    if (action === 'reset') {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl });
      if (error) throw error;
      if (ticket === generation) status('If eligible, you will receive a password reset email.');
    } else if (action === 'signup') {
      const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl } });
      if (error) throw error;
      if (ticket === generation) status('Check your email to confirm your account, then sign in.');
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch {
    if (ticket === generation) status('Request unsuccessful. Check your details and connection, then retry.');
  } finally {
    if (ticket === generation) { login.elements.password.value = ''; loginBusy(false); }
  }
}
login.onsubmit = e => { e.preventDefault(); credentialsAction(creating ? 'signup' : 'signin'); };
byId('reset').onclick = () => { if (login.elements.email.reportValidity()) credentialsAction('reset'); };

function emailLink(type, hash) {
  // This client's link session is memory-only and isolated from an existing
  // customer's persisted session. No workspace requests run on this path.
  const temporary = makeClient({ auth: { persistSession: false, autoRefreshToken: false,
    detectSessionInUrl: false, storageKey: 'hydra-email-' + crypto.randomUUID() } });
  const finish = message => {
    show(null, message);
    const link = document.createElement('a');
    link.href = callbackUrl;
    link.textContent = 'Return to account';
    byId('status').after(link);
  };
  show('verify', type === 'recovery' ? 'Continue to reset your password.' : 'Continue to confirm your email.');
  byId('verify').onsubmit = async event => {
    event.preventDefault();
    show(null, 'Checking your email link…');
    try {
      const { data, error } = await temporary.auth.verifyOtp({ type, token_hash: hash });
      if (error || !data.session) throw new Error();
      hash = null;
      if (type === 'email') return finish('Email confirmed. You can sign in.');
      show('recovery', 'Choose a new password.');
      byId('recovery').elements.password.focus();
    } catch { finish('This email link could not be verified. Request a fresh link.'); }
  };
  byId('recovery').onsubmit = async event => {
    event.preventDefault();
    const form = byId('recovery');
    const password = form.elements.password.value;
    form.reset();
    show(null, 'Updating password…');
    try {
      const { error } = await temporary.auth.updateUser({ password });
      if (error) throw error;
      finish('Password updated. You can sign in with your new password.');
    } catch { show('recovery', 'Update failed. Retry or request a new link if it expired.'); }
  };
}

async function start() {
  const fragment = new URLSearchParams(location.hash.slice(1));
  const hasLink = Boolean(location.hash || location.search);
  if (hasLink) history.replaceState(null, '', location.pathname);
  try {
    const { url, key } = publicSettings(projectUrl, publicKey);
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./supabase.js', import.meta.url);
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    makeClient = options => window.supabase.createClient(url, key, {
      ...options,
      global: { fetch: (input, init = {}) => {
        const timeout = AbortSignal.timeout(15000);
        const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        return fetch(input, { ...init, signal });
      } }
    });
    if (hasLink) {
      const type = fragment.get('type'), hash = fragment.get('token_hash');
      if (['email', 'recovery'].includes(type) && hash) return emailLink(type, hash);
      show(null, 'Invalid email link. Return to the account page and request a fresh link.');
      const link = document.createElement('a');
      link.href = callbackUrl; link.textContent = 'Return to account'; byId('status').after(link);
      return;
    }
    client = makeClient({ auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true } });
    client.auth.onAuthStateChange(authChanged);
  } catch { show(null, 'Customer accounts are unavailable here. You can still explore the demo profiles.'); }
}
// A mail link can also land in the already-open account tab.
window.addEventListener('hashchange', () => { if (location.hash) location.reload(); });
window.addEventListener('pagehide', () => { clearPrivate(); show(null, 'Checking session…'); });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
start();
