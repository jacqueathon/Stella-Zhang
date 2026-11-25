import {storageKey} from './core.mjs';
import {normalizeTasks} from './tasks.mjs';

export function createProfileStore(defaultState, getStorage, locks, onSessionOnly) {
  const lastRead = new Map();
  const sessionOnly = new Map();

  function readStored(id) {
    const initial = defaultState(id);
    const stored = JSON.parse(getStorage().getItem(storageKey(id)) ?? 'null');
    if (!stored) return initial;
    if (stored.profile?.id !== id || !stored.leads || typeof stored.leads !== 'object') {
      throw new Error('Invalid stored profile');
    }
    const profile = {...initial.profile, ...stored.profile};
    if (!Array.isArray(profile.skills)) profile.skills = [];
    return {
      ...initial, ...stored, profile,
      meetings: Array.isArray(stored.meetings) ? stored.meetings : [],
      tasks: normalizeTasks(stored.tasks),
      drafts: stored.drafts || {}
    };
  }

  function read(id) {
    if (sessionOnly.has(id)) return sessionOnly.get(id);
    try {
      const state = readStored(id);
      lastRead.set(id, state);
      return state;
    } catch {
      return lastRead.get(id) ?? defaultState(id);
    }
  }

  function apply(id, change, locked) {
    let durable = locked && !sessionOnly.has(id);
    let latest;
    if (durable) {
      try {
        latest = readStored(id);
      } catch {
        durable = false;
      }
    }
    latest ??= read(id);
    const state = structuredClone(latest);
    const result = change(state);
    // Returning false means no mutation (for example, a lead another tab removed).
    if (result === false) return {state: latest, result, durable};

    if (durable) {
      try {
        getStorage().setItem(storageKey(id), JSON.stringify(state));
        lastRead.set(id, state);
      } catch {
        durable = false;
      }
    }
    if (!durable) {
      const firstSessionOnlyWrite = !sessionOnly.has(id);
      sessionOnly.set(id, state);
      if (firstSessionOnlyWrite) onSessionOnly?.(id);
    }
    return {state, result, durable};
  }

  async function update(id, change, signal) {
    signal?.throwIfAborted();
    // All writers share the same profile lock. Without it, keep changes in memory
    // so the tab cannot overwrite concurrent durable writes.
    let entered = false;
    if (locks) {
      try {
        const commit = () => {
          signal?.throwIfAborted();
          entered = true;
          return apply(id, change, true);
        };
        const key = storageKey(id);
        return await (signal ? locks.request(key, {signal}, commit) : locks.request(key, commit));
      } catch (error) {
        if (entered || signal?.aborted) throw error;
      }
    }
    signal?.throwIfAborted();
    return apply(id, change, false);
  }

  return {read, update, isSessionOnly: id => sessionOnly.has(id)};
}
