import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../dist/core.mjs';
import {profiles} from '../dist/data.mjs';
import {normalizeTasks,saveTask,toggleTask,deleteTask,selectTasks,taskCounts,localDay,validDueDate} from '../dist/tasks.mjs';
import {taskPage,taskRows,taskWidget,taskEditForm} from '../dist/tasks-view.mjs';

const add = (tasks, id, changes = {}) => saveTask(tasks, {title:id, due:'', priority:'Medium', ...changes}, id, '2026-11-11T18:00:00Z');

test('tasks survive JSON persistence without leaking into another profile', () => {
  const a = initialState(profiles[0]), b = initialState(profiles[1]);
  a.tasks = add(a.tasks, 'proposal', {due:'2026-11-15', priority:'High'});
  a.tasks = toggleTask(a.tasks, 'proposal');
  assert.deepEqual(b.tasks, []);
  assert.deepEqual(normalizeTasks(JSON.parse(JSON.stringify(a)).tasks), a.tasks);
  assert.deepEqual(initialState(profiles[0]).tasks, []);
});

test('legacy and malformed stored tasks recover without creating unusable rows', () => {
  assert.deepEqual(normalizeTasks(undefined), []);
  assert.deepEqual(normalizeTasks({}), []);
  const tasks = normalizeTasks([null, {id:'empty',title:' '}, {id:'a',title:' A ',priority:'urgent',due:'2026-02-30',completed:'false'}, {id:'a',title:'duplicate'}]);
  assert.deepEqual(tasks, [{id:'a',title:'A',priority:'Medium',due:'',completed:false,createdAt:''}]);
});

test('add, edit, complete, reopen and delete preserve other tasks and completion on edit', () => {
  const original = add(add([], 'a'), 'b');
  const done = toggleTask(original, 'a');
  const edited = saveTask(done, {title:' Revised ',due:'2026-12-01',priority:'High'}, 'a', 'later');
  assert.equal(edited[0].title, 'Revised');
  assert.equal(edited[0].completed, true);
  assert.equal(edited[0].createdAt, original[0].createdAt);
  assert.deepEqual(edited[1], original[1]);
  assert.equal(original[0].completed, false);
  assert.equal(toggleTask(edited, 'a')[0].completed, false);
  assert.deepEqual(deleteTask(edited, 'a'), [original[1]]);
});

test('blank titles, oversized input, invalid priorities and impossible dates are rejected', () => {
  for (const changes of [{title:'   '},{title:'x'.repeat(161)},{priority:'Urgent'},{due:'2026-02-30'},{due:'not-a-date'}]) {
    assert.throws(() => add([], 'a', changes));
  }
  assert.equal(validDueDate('2028-02-29'), true);
  assert.equal(validDueDate('2026-02-29'), false);
  assert.equal(validDueDate(''), true);
});

test('due dates use the local calendar, including just before midnight', () => {
  assert.equal(localDay(new Date(2026, 10, 11, 23, 59)), '2026-11-11');
  assert.equal(localDay(new Date(2026, 10, 12, 0, 1)), '2026-11-12');
});

test('filters, search and counts distinguish overdue, today and completed', () => {
  let tasks = add(add(add([], 'Proposal', {due:'2026-11-10'}), 'Homework', {due:'2026-11-11'}), 'Interview', {due:'2026-11-11'});
  tasks = toggleTask(tasks, 'Interview');
  assert.deepEqual(taskCounts(tasks, '2026-11-11'), {open:2,today:1,overdue:1,completed:1});
  assert.deepEqual(selectTasks(tasks, 'today', '', '2026-11-11').map(t=>t.id), ['Homework']);
  assert.deepEqual(selectTasks(tasks, 'completed').map(t=>t.id), ['Interview']);
  assert.deepEqual(selectTasks(tasks, 'all', ' PROPOSAL ').map(t=>t.id), ['Proposal']);
});

test('pending tasks sort by date then priority, with undated and completed tasks last', () => {
  let tasks = [];
  for (const [id, changes] of [['undated',{}],['low',{due:'2026-11-12',priority:'Low'}],['high',{due:'2026-11-12',priority:'High'}],['earlier',{due:'2026-11-10'}],['done',{due:'2026-11-01'}]]) tasks=add(tasks,id,changes);
  tasks = toggleTask(tasks, 'done');
  assert.deepEqual(selectTasks(tasks, 'all').map(t=>t.id), ['earlier','high','low','undated','done']);
});

test('task text is escaped in rows, edit forms, search and dashboard previews', () => {
  const tasks = add([], 'unsafe', {title:'<img src=x onerror="alert(1)">'});
  for (const html of [taskRows(tasks),taskEditForm(tasks[0]),taskWidget(tasks),taskPage(tasks,'all','" autofocus><img>')]) {
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;/);
  }
});

test('empty views, completed previews and unavailable-storage notices are explicit', () => {
  assert.match(taskPage([], 'open', ''), /first task/);
  assert.match(taskPage([], 'today', ''), /Nothing due today/);
  assert.match(taskPage([], 'completed', ''), /completed tasks will appear/);
  assert.match(taskPage([], 'open', '', false), /Session only/);
  assert.doesNotMatch(taskPage([], 'open', '', false), /Saved automatically/);
  assert.match(taskWidget(toggleTask(add([], 'a'), 'a')), /All caught up/);
});
