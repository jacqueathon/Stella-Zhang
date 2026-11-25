import assert from 'node:assert/strict';
import test from 'node:test';
import {filterContacts} from '../dist/contacts.mjs';

const contacts = [
  {id:'mira', name:'Mira Vale', company:'Cloud Finch', city:'Irvine'},
  {id:'ezra', name:'Ezra Lane', company:'Cloud Finch', city:'Ontario'},
  {id:'nora', name:'Nora Gray', company:'Quartz Lab', city:'Riverside'}
];
const summarize = (...args) => {
  const {savedCount, visible} = filterContacts(contacts, ...args);
  return {savedCount, ids:visible.map(person => person.id)};
};

test('off retains suggestion order and counts only saved contacts in the list', () => {
  assert.deepEqual(summarize({aJob:{type:'job'}}, '', false), {
    savedCount:0, ids:['mira','ezra','nora']
  });
  assert.deepEqual(summarize({nora:{type:'person'}, mira:{type:'person'}}, '', false), {
    savedCount:2, ids:['mira','ezra','nora']
  });
});

test('Saved only composes with case-insensitive name, company and location search', () => {
  const saved = {nora:{type:'person'}, mira:{type:'person'}};
  assert.deepEqual(summarize(saved, 'cloud FINCH', true), {savedCount:2, ids:['mira']});
  assert.deepEqual(summarize(saved, 'ONTARIO', true), {savedCount:2, ids:[]});
  assert.deepEqual(summarize(saved, 'nora', true), {savedCount:2, ids:['nora']});
  assert.deepEqual(summarize(saved, 'ONTARIO', false), {savedCount:2, ids:['ezra']});
});

test('updated leads take effect without mutating suggestions or another profile', () => {
  const a = {mira:{type:'person'}, nora:{type:'person'}};
  const b = {ezra:{type:'person'}};
  const start = structuredClone(contacts);
  assert.deepEqual(summarize(a, '', true), {savedCount:2, ids:['mira','nora']});
  delete a.mira;
  assert.deepEqual(summarize(a, 'mira', true), {savedCount:1, ids:[]});
  delete a.nora;
  assert.deepEqual(summarize(a, '', true), {savedCount:0, ids:[]});
  assert.deepEqual(summarize(b, '', true), {savedCount:1, ids:['ezra']});
  assert.deepEqual(contacts, start);
});
