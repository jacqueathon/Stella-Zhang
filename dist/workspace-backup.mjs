import {storageKey} from './core.mjs';
import {normalizeTasks, taskPriorities, validDueDate} from './tasks.mjs';

const product = 'Hydra Stack demo';
export const maxBackupBytes = 10 * 1024 * 1024;

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string';
const identifier = value => text(value) && value.trim() !== '' && !Object.hasOwn(Object.prototype, value) && value !== 'prototype';
const profileFields = ['name', 'initials', 'degree', 'university', 'focus', 'graduation', 'location', 'experience', 'goal', 'availability', 'resume'];
const leadTypes = ['job', 'person', 'company', 'event'];
const leadStages = ['Saved', 'In progress', 'Waiting', 'Completed'];
const meetingStatuses = ['Idea only', 'Ready to ask', 'Invitation sent by me', 'Confirmed by both parties', 'Completed'];

function invalid() {
  return new Error('This file is not a valid Hydra Stack progress backup.');
}

function timestamp(value) {
  return text(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function readMap(value, readEntry) {
  if (!record(value)) throw invalid();
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (!identifier(key) || !record(entry)) throw invalid();
    return [key, readEntry(entry)];
  }));
}

function readLead({type, stage, savedAt, notes, referral}) {
  if (!leadTypes.includes(type) || !leadStages.includes(stage) || !timestamp(savedAt) ||
      (notes !== undefined && !text(notes)) || (referral !== undefined && !text(referral))) throw invalid();
  return {type, stage, savedAt, ...(notes === undefined ? {} : {notes}), ...(referral === undefined ? {} : {referral})};
}

function readDraft({connection, followup}) {
  if ((connection === undefined && followup === undefined) ||
      (connection !== undefined && !text(connection)) || (followup !== undefined && !text(followup))) throw invalid();
  return {...(connection === undefined ? {} : {connection}), ...(followup === undefined ? {} : {followup})};
}

function readMeetings(value) {
  if (!Array.isArray(value)) throw invalid();
  const seen = new Set();
  return value.map(meeting => {
    if (!record(meeting)) throw invalid();
    const {id, person, topic, date, status} = meeting;
    if (!identifier(id) || seen.has(id) || !text(person) || !text(topic) ||
        !text(date) || !validDueDate(date) || !meetingStatuses.includes(status)) throw invalid();
    seen.add(id);
    return {id, person, topic, date, status};
  });
}

function readTasks(value) {
  // Exports from before the to-do list did not include tasks.
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(task => record(task) && identifier(task.id) &&
      text(task.title) && task.title.length <= 160 && text(task.due) && validDueDate(task.due) &&
      taskPriorities.includes(task.priority) && typeof task.completed === 'boolean' && text(task.createdAt))) throw invalid();
  const tasks = normalizeTasks(value);
  if (tasks.length !== value.length) throw invalid();
  return tasks;
}

export function exportWorkspace(state, exportedAt = new Date().toISOString()) {
  return JSON.stringify({product, exportedAt, state}, null, 2);
}

export function readWorkspaceBackup(json, demoProfile) {
  let backup;
  try {
    backup = JSON.parse(json);
  } catch {
    throw invalid();
  }
  if (!record(backup) || backup.product !== product || !timestamp(backup.exportedAt) || !record(backup.state)) throw invalid();
  const {profile, leads, meetings, drafts, tasks, onboarded} = backup.state;
  if (!record(profile) || !text(profile.id)) throw invalid();
  if (profile.id !== demoProfile.id) {
    throw new Error('This backup belongs to a different demo profile. Switch to that profile to restore it.');
  }
  if (!profileFields.every(field => text(profile[field])) || !profile.name.trim() ||
      !Array.isArray(profile.skills) || !profile.skills.every(text) || typeof onboarded !== 'boolean') throw invalid();

  const restoredProfile = {...demoProfile, skills: profile.skills};
  for (const field of profileFields) restoredProfile[field] = profile[field];
  return {
    exportedAt: backup.exportedAt,
    state: {
      profile: restoredProfile,
      leads: readMap(leads, readLead),
      meetings: readMeetings(meetings),
      drafts: readMap(drafts, readDraft),
      tasks: readTasks(tasks),
      onboarded,
    },
  };
}

export function restoreWorkspaceBackup(storage, activeId, backup) {
  if (backup.state.profile.id !== activeId) throw new Error('The active demo profile changed. Choose the backup again.');
  // A failed setItem leaves storage untouched. The caller updates memory only after this returns.
  storage.setItem(storageKey(activeId), JSON.stringify(backup.state));
  return backup.state;
}
