import test from 'node:test';
import assert from 'node:assert/strict';
import {groupProgress} from '../dist/progress.mjs';

const records = {
  j: {type:'job', title:'Budget Fellow', company:'Cloud Finch'},
  p: {type:'person', name:'Mira Vale', title:'Research Lead', company:'Cloud Finch'},
  c: {type:'company', title:'Beacon Lab', company:'Company insight'},
  e: {type:'event', title:'Spring Forum', company:'Forum Hosts'}
};
const leads = {
  j:{stage:'Saved'}, p:{stage:'In progress',notes:'Ask about NEXT quarter.'},
  c:{stage:'Waiting',notes:'Send a sample.'}, e:{stage:'Completed'}
};
const groups = (query, saved=leads) => groupProgress(saved, id=>records[id], query);
const ids = query => [...groups(query).values()].flat().map(entry=>entry.id);

test('searches individual visible fields and saved notes, case-insensitively', () => {
  for (const [term, matches] of [
    [' BUDGET ',['j']], ['ira v',['p']], ['RESEARCH LEAD',['p']],
    ['Cloud finch',['j','p']], ['company',['c']], ['EVENT',['e']],
    ['next QUARTER',['p']], ['Spring',['e']], ['unmatched',[]]
  ]) assert.deepEqual(ids(term),matches);
});

test('stage counts and original order return when search is cleared', () => {
  const saved={...leads,p:{...leads.p,stage:'Saved'},stale:{stage:'Saved'}};
  const result=groups('finch',saved);
  assert.deepEqual([...result.keys()],['Saved','In progress','Waiting','Completed']);
  assert.deepEqual([...result.values()].map(list=>list.length),[2,0,0,0]);
  assert.deepEqual(result.get('Saved').map(row=>row.id),['j','p']);
  assert.deepEqual([...groups('   ',saved).values()].map(list=>list.length),[2,0,1,1]);
});

test('matches literal text, ignores unrelated fields, and only reads the supplied profile', () => {
  const saved={j:{stage:'Saved',notes:'Literal <&">',referral:'private marker'}};
  const before=structuredClone(saved);
  assert.equal(groups('<&">',saved).get('Saved').length,1);
  assert.equal(groups('private marker',saved).get('Saved').length,0);
  assert.equal(groups('next quarter',saved).get('In progress').length,0);
  assert.deepEqual(saved,before);
});
