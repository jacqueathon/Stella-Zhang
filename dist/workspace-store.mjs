import {initialState, storageKey} from './core.mjs';
import {normalizeTasks} from './tasks.mjs';

export function createWorkspaceDatabase(indexedDB) {
  const storeName = 'profiles';
  let connection;

  function open() {
    connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('hydra-stack-demo-workspaces', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
    }).catch(error => { connection = undefined; throw error; });
    return connection;
  }

  return async function transact(id, update) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = update
        ? db.transaction(storeName, 'readwrite', {durability: 'strict'})
        : db.transaction(storeName);
      const profiles = transaction.objectStore(storeName);
      const request = profiles.get(id);
      let record, error;
      request.onsuccess = () => {
        try {
          record = request.result;
          const next = update?.(record);
          if (next) {
            record = next;
            profiles.put(next, id);
          }
        } catch (cause) {
          error = cause;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(record);
      transaction.onabort = () => reject(error ?? transaction.error ?? new Error('Workspace storage was interrupted.'));
    });
  };
}

export function createWorkspaceStore(findProfile, storage, locks, transact, {onSessionOnly, onCommit} = {}) {
  const memory = new Map();
  const committed = new Map();

  function decode(id, saved) {
    const defaults = initialState(findProfile(id));
    if (saved?.profile?.id !== id || !saved.leads || typeof saved.leads !== 'object') {
      throw new Error('The stored profile could not be read.');
    }
    const profile = {...defaults.profile, ...saved.profile};
    if (!Array.isArray(profile.skills)) profile.skills = [];
    return {...defaults, ...saved, profile, tasks: normalizeTasks(saved.tasks),
      meetings: Array.isArray(saved.meetings) ? saved.meetings : [], drafts: saved.drafts || {}};
  }

  function legacy(id) {
    const raw = storage().getItem(storageKey(id));
    return raw === null ? initialState(findProfile(id)) : decode(id, JSON.parse(raw));
  }

  function remember(id, record) {
    const previousRevision = committed.get(id)?.revision ?? -1;
    if (record && (record.revision > previousRevision || (record.revision === 0 && previousRevision === 0))) {
      committed.set(id, record);
    }
  }

  function snapshot(id) {
    if (memory.has(id)) return memory.get(id);
    if (committed.has(id)) return committed.get(id).state;
    try {
      return legacy(id);
    } catch {
      return initialState(findProfile(id));
    }
  }

  async function read(id) {
    if (!memory.has(id)) {
      try {
        const record = await transact(id);
        remember(id, record ?? {revision: 0, state: legacy(id)});
      } catch {
        // Keep the last successfully read workspace available if storage fails.
      }
    }
    return snapshot(id);
  }

  function keepForSession(id, next) {
    const firstFailure = !memory.has(id);
    memory.set(id, next);
    if (firstFailure) onSessionOnly?.(id);
    return true;
  }

  async function applyInSession(id, change) {
    const latest = await read(id);
    const next = structuredClone(memory.get(id) ?? latest);
    if (change(next) === false) return false;
    return keepForSession(id, next);
  }

  async function apply(id, change) {
    if (memory.has(id)) return applyInSession(id, change);
    let next, latest, changed, mutationError;
    let record;
    try {
      record = await transact(id, stored => {
        // Local Storage supplies the legacy profile only until the first commit.
        latest = stored ?? {revision: 0, state: legacy(id)};
        next = structuredClone(latest.state);
        try {
          changed = change(next) !== false;
        } catch (error) {
          mutationError = error;
          throw error;
        }
        if (changed) return {revision: latest.revision + 1, state: next};
      });
    } catch {
      if (mutationError) throw mutationError;
      if (changed === false) return false;
      if (changed) return keepForSession(id, next);
      return applyInSession(id, change);
    }
    remember(id, record ?? latest);
    if (changed) onCommit?.(id);
    return changed;
  }

  async function write(id, change) {
    if (!locks) return applyInSession(id, change);
    let entered = false;
    try {
      return await locks.request(storageKey(id), () => {
        entered = true;
        return apply(id, change);
      });
    } catch (error) {
      if (entered) throw error;
      return applyInSession(id, change);
    }
  }

  return {read, snapshot, write, isSessionOnly: id => memory.has(id)};
}
