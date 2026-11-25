import assert from 'node:assert/strict';
import test from 'node:test';
import {filterMeetings} from '../dist/meetings.mjs';

const meetings = [
  {id:'a', status:'Idea only'},
  {id:'b', status:'Completed'},
  {id:'c', status:'Ready to ask'},
  {id:'d', status:'Invitation sent by me'},
  {id:'e', status:'Confirmed by both parties'},
  {id:'f', status:'Completed'}
];

test('All preserves order and the Active and Completed subsets partition all five statuses', () => {
  for (const [filter, expected] of [
    ['all', ['a','b','c','d','e','f']],
    ['active', ['a','c','d','e']],
    ['completed', ['b','f']]
  ]) {
    const {counts, visible} = filterMeetings(meetings, filter);
    assert.deepEqual(counts, {all:6,active:4,completed:2});
    assert.deepEqual(visible.map(meeting=>meeting.id), expected);
  }
});

test('empty lists and new plans produce accurate counts for every selection', () => {
  for (const filter of ['all','active','completed']){
    assert.deepEqual(filterMeetings([], filter), {counts:{all:0,active:0,completed:0},visible:[]});
  }
  const plan = {id:'new',status:'Idea only'};
  assert.deepEqual(filterMeetings([plan], 'active'), {counts:{all:1,active:1,completed:0},visible:[plan]});
  const finished = {...plan,status:'Completed'};
  assert.deepEqual(filterMeetings([finished], 'completed'), {counts:{all:1,active:0,completed:1},visible:[finished]});
});

test('status edits use the new partition without changing original plans or another profile', () => {
  const edited = meetings.map(plan=>plan.id==='a' ? {...plan,status:'Completed'} :
    plan.id==='b' ? {...plan,status:'Ready to ask'} : plan);
  assert.deepEqual(filterMeetings(edited, 'completed').visible.map(plan=>plan.id), ['a','f']);
  assert.deepEqual(filterMeetings(edited, 'active').visible.map(plan=>plan.id), ['b','c','d','e']);
  assert.equal(filterMeetings(meetings, 'active').visible[0].id, 'a');
  assert.equal(filterMeetings([{id:'legacy'}], 'active').visible.length, 1);
});
