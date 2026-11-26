import assert from 'node:assert/strict';
import {test} from 'node:test';
import {leadTaskTitle, saveTask, taskTitleLimit} from '../dist/tasks.mjs';
import {leadTaskForm} from '../dist/tasks-view.mjs';

test('lead task titles retain the identity with a next step or a follow-up default', () => {
  for (const identity of ['Analyst role', 'Mira Vale', 'Quartz Orchard', 'Research meetup']) {
    assert.equal(leadTaskTitle(identity, '  '), `Follow up on ${identity}`);
    assert.equal(leadTaskTitle(identity, 'Ask\n about the work'), `${identity} — Ask about the work`);
  }
});

test('long title suggestions fit the same validation as other tasks and retain part of the note', () => {
  const identity = 'Very long lead '.repeat(30);
  const note = 'Ask about the project '.repeat(20);
  const title = leadTaskTitle(identity, note);
  assert.ok(title.length <= taskTitleLimit);
  assert.match(title, /^Very long lead.* — Ask about the project.*…$/u);
  assert.equal(saveTask([], {title, due:'', priority:'Medium'}, 'new')[0].title, title);
  assert.doesNotMatch(leadTaskTitle('x'.repeat(145)+'😀and more', ''), /[\uD800-\uDBFF]…$/u);
});

test('lead title form escapes saved content and exposes editable task controls', () => {
  const title = leadTaskTitle('Role <b>', '" onfocus="alert(1)');
  const html = leadTaskForm('Role <b>', title);
  assert.match(html, /id="leadTaskForm"/);
  assert.match(html, /name="due" type="date"/);
  assert.match(html, /name="priority"/);
  assert.match(html, /Role &lt;b&gt; — &quot; onfocus=&quot;alert\(1\)/);
  assert.doesNotMatch(html, /<b>|" onfocus="/);
});
