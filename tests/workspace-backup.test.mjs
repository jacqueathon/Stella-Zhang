import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, storageKey} from '../dist/core.mjs';
import {profiles} from '../dist/data.mjs';
import {exportWorkspace, readWorkspaceBackup, restoreWorkspaceBackup} from '../dist/workspace-backup.mjs';

const [alex, maya] = profiles;
const exportedAt = '2026-11-19T21:30:00.000Z';
const fixture = () => ({
  ...initialState(alex),
  profile: {...alex, name: 'Demo Student', initials: 'DS', skills: ['Writing'], resume: 'Synthetic experience'},
  leads: {'company:Test employer': {type: 'company', stage: 'Waiting', savedAt: exportedAt, notes: 'Check later'}},
  meetings: [{id: 'idea-1', person: 'Synthetic contact', topic: 'Ask about writing', date: '', status: 'Idea only'}],
  drafts: {'test-contact': {connection: 'Synthetic connection note', followup: 'Synthetic follow-up'}},
  tasks: [{id: 'task-1', title: 'Synthetic task', due: '2026-11-21', priority: 'High', completed: true, createdAt: exportedAt}],
  onboarded: true,
});

test('round-trips every supported workspace field through the current export format', () => {
  const state = fixture();
  const backup = readWorkspaceBackup(exportWorkspace(state, exportedAt), alex);
  assert.deepEqual(backup, {state, exportedAt});
});

test('restores a legacy export without tasks and preserves the other progress', () => {
  const {tasks, ...legacy} = fixture();
  assert.deepEqual(readWorkspaceBackup(exportWorkspace(legacy, exportedAt), alex).state, {...legacy, tasks: []});
});

test('rejects a backup for another demo profile before any storage write', () => {
  const backupFile = exportWorkspace(fixture(), exportedAt);
  assert.throws(() => readWorkspaceBackup(backupFile, maya), /different demo profile/);
  const backup = readWorkspaceBackup(backupFile, alex);
  const storage = {setItem: () => assert.fail('A stale profile must not write to storage')};
  assert.throws(() => restoreWorkspaceBackup(storage, maya.id, backup), /active demo profile changed/);
});

test('rejects an invalid workspace rather than silently importing partial progress', () => {
  const state = fixture();
  const exportWith = changes => exportWorkspace({...state, ...changes}, exportedAt);
  for (const bad of [
    '{bad json',
    JSON.stringify({product: 'Unrelated', exportedAt, state}),
    exportWorkspace(state, 'invalid timestamp'),
    exportWith({profile: {...state.profile, skills: [3]}}),
    exportWith({leads: {'test-lead': {stage: 'Invalid', type: 'job', savedAt: exportedAt}}}),
    exportWith({meetings: [null]}),
    exportWith({drafts: {'test-contact': {connection: {text: 'invalid type'}}}}),
    exportWith({tasks: [state.tasks[0], state.tasks[0]]}),
  ]) {
    assert.throws(() => readWorkspaceBackup(bad, alex), /valid Hydra Stack progress backup/);
  }
});

test('rejects reserved map keys and derives fixed persona metadata from the selected demo profile', () => {
  const state = fixture();
  state.drafts = JSON.parse('{"__proto__":{"connection":"reserved key"}}');
  assert.throws(() => readWorkspaceBackup(exportWorkspace(state, exportedAt), alex), /valid Hydra Stack progress backup/);
  const modified = fixture();
  modified.profile.colour = 'unexpected value';
  modified.profile.fictional = false;
  const {profile} = readWorkspaceBackup(exportWorkspace(modified, exportedAt), alex).state;
  assert.equal(profile.colour, alex.colour);
  assert.equal(profile.fictional, true);
});

test('writes the replacement to the active storage key only and leaves other saved profiles intact', () => {
  const state = fixture();
  const backup = readWorkspaceBackup(exportWorkspace(state, exportedAt), alex);
  const values = new Map([
    [storageKey(alex.id), JSON.stringify(initialState(alex))],
    [storageKey(maya.id), JSON.stringify(initialState(maya))],
  ]);
  const otherProfile = values.get(storageKey(maya.id));
  const writes = [];
  const storage = {setItem(key, value) { writes.push(key); values.set(key, value); }};
  assert.deepEqual(restoreWorkspaceBackup(storage, alex.id, backup), state);
  assert.deepEqual(JSON.parse(values.get(storageKey(alex.id))), state);
  assert.equal(values.get(storageKey(maya.id)), otherProfile);
  assert.deepEqual(writes, [storageKey(alex.id)]);
});

test('the My progress restore flow previews, cancels, rolls back on storage failure and retries', async t => {
  const handlers = new Map();
  const app = {};
  const main = {};
  const error = {textContent: ''};
  const focusTarget = {focus() {}};
  const dialog = {
    open: false,
    html: '',
    set innerHTML(value) { this.html = value; error.textContent = ''; },
    get innerHTML() { return this.html; },
    showModal() { this.open = true; },
    close() { this.open = false; },
    querySelector(selector) { return selector === '#restoreError' ? error : focusTarget; },
  };
  const toast = {classList: {add() {}, remove() {}}};
  const elements = {'#app': app, '#main': main, '#modal': dialog, '#toast': toast};
  const document = {
    querySelector: selector => elements[selector],
    addEventListener(event, fn) {
      handlers.set(event, [...(handlers.get(event) ?? []), fn]);
    },
  };
  const starting = {...initialState(alex), onboarded: true, leads: {
    'company:Starting lead': {type: 'company', stage: 'Saved', savedAt: exportedAt},
  }};
  const key = storageKey(alex.id);
  const otherKey = storageKey(maya.id);
  const stored = new Map([[key, JSON.stringify(starting)], [otherKey, JSON.stringify(initialState(maya))]]);
  const writes = [];
  let unavailable = false;
  const storage = {
    getItem: key => stored.get(key),
    setItem(key, value) {
      if (unavailable) throw new DOMException('Storage full', 'QuotaExceededError');
      writes.push(key);
      stored.set(key, value);
    },
  };
  const globals = {document, localStorage: storage, window: {scrollTo() {}}, fetch: async () => ({ok: false})};
  const descriptors = Object.fromEntries(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, {configurable: true, value});
  t.after(() => {
    for (const [name, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  t.mock.timers.enable({apis: ['setTimeout']});
  await import('../dist/app.mjs');
  const click = (action, data = {}) => handlers.get('click')[0]({target: {closest: () => ({dataset: {action, ...data}})}});
  const select = async (workspace, fileName = 'synthetic.json') => {
    const contents = exportWorkspace(workspace, exportedAt);
    const input = {
      id: 'backupFile', dataset: {}, isConnected: true, matches: () => false,
      files: [{name: fileName, size: Buffer.byteLength(contents), text: async () => contents}],
    };
    for (const handler of handlers.get('change')) await handler({target: input});
  };

  await click('choose', {id: alex.id});
  await click('nav', {view: 'progress'});
  assert.match(main.innerHTML, /Restore backup/);
  await click('restore');
  await select(initialState(maya));
  assert.match(error.textContent, /different demo profile/);
  assert.deepEqual(writes, []);

  await select(fixture());
  assert.match(dialog.innerHTML, /Replace this demo workspace/);
  assert.match(dialog.innerHTML, /Tasks: 1/);
  assert.deepEqual(writes, []);
  await click('close');
  assert.deepEqual(JSON.parse(stored.get(key)), starting);

  await click('restore');
  await select(fixture());
  unavailable = true;
  await click('confirm-restore');
  assert.match(error.textContent, /current progress is still available/);
  assert.deepEqual(JSON.parse(stored.get(key)), starting);
  assert.match(main.innerHTML, /Starting lead/);
  assert.doesNotMatch(main.innerHTML, /Test employer/);
  assert.equal(dialog.open, true);
  assert.deepEqual(writes, []);

  unavailable = false;
  await click('confirm-restore');
  assert.equal(dialog.open, false);
  assert.match(main.innerHTML, /Test employer/);
  assert.match(toast.textContent, /Workspace restored/);
  assert.deepEqual(JSON.parse(stored.get(key)), fixture());
  assert.deepEqual(JSON.parse(stored.get(otherKey)), initialState(maya));
  assert.deepEqual(writes, [key]);
});
