import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceStore} from '../dist/workspace-store.mjs';
import {initialState,storageKey} from '../dist/core.mjs';
import {saveTask} from '../dist/tasks.mjs';

const profile=id=>({id,name:id,skills:[]});
const createdAt='2026-11-25T00:00:00.000Z';
const task=(title,id)=>({title,priority:'Medium',id,due:'',completed:false,createdAt});
const add=(title,id)=>next=>{next.tasks=saveTask(next.tasks,task(title,id),id,createdAt);};

function setup(){
  const before={...initialState(profile('aster')),leads:{role:{notes:'Old note',stage:'Waiting'}},drafts:{person:{connection:'Draft'}}};
  const legacy=new Map([[storageKey('aster'),JSON.stringify(before)]]);
  const records=new Map(), queues=new Map();
  const locks={request(id,run){
    const completion=(queues.get(id)??Promise.resolve()).then(run);
    queues.set(id,completion.catch(()=>{}));
    return completion;
  }};
  let rejectWrite=false;
  const transact=async(id,update)=>{
    const prior=structuredClone(records.get(id));
    const next=update?.(prior);
    if(!next)return prior;
    if(rejectWrite)throw Error('Transaction aborted');
    records.set(id,structuredClone(next));
    return next;
  };
  const client=(options,lockProvider=locks)=>createWorkspaceStore(profile,()=>({
    getItem:key=>legacy.get(key)??null,
    setItem:()=>assert.fail('legacy data is read-only')
  }),lockProvider,transact,options);
  return {before,legacy,records,locks,client,rejectWrites:()=>{rejectWrite=true;}};
}

test('a stale legacy snapshot and cached tab cannot undo transactional writes',async()=>{
  const {before,client,records}=setup();
  const a=client(), b=client();
  assert.deepEqual(await a.read('aster'),before);
  assert.deepEqual(await b.read('aster'),before);
  const note=b.write('aster',next=>{next.leads.role.notes='New note';});
  await Promise.all([note,b.write('aster',add('First B','b1')),a.write('aster',add('From lead A','a')),b.write('aster',add('Second B','b2'))]);
  assert.deepEqual(await a.read('aster'),{...before,leads:{role:{...before.leads.role,notes:'New note'}},
    tasks:[task('First B','b1'),task('From lead A','a'),task('Second B','b2')]});
  assert.equal(records.get('aster').revision,4);
  assert.deepEqual(await a.read('birch'),initialState(profile('birch')));
});

test('loading legacy data and a rejected or read-only mutation do not write',async()=>{
  const {before,client,records}=setup();
  const store=client({onSessionOnly:()=>assert.fail('unexpected warning')});
  await assert.rejects(store.write('aster',add('   ','bad')),/between 1 and 160 characters/);
  assert.equal(await store.write('aster',()=>false),false);
  assert.deepEqual(await store.read('aster'),before);
  assert.equal(records.size,0);
});

test('aborted write stays session-only based on the latest committed profile',async()=>{
  const {client,rejectWrites,records}=setup();
  const warnings=[], commits=[];
  const a=client({onSessionOnly:id=>warnings.push(id),onCommit:id=>commits.push(id)}), b=client();
  await a.read('aster');
  await b.write('aster',add('Already durable','b'));
  await a.write('birch',add('Separate durable profile','ba'));
  rejectWrites();
  await a.write('aster',add('In memory','a'));
  await a.write('aster',add('Also in memory','a2'));
  assert.deepEqual((await a.read('aster')).tasks,[task('Already durable','b'),task('In memory','a'),task('Also in memory','a2')]);
  assert.deepEqual((await b.read('aster')).tasks,[task('Already durable','b')]);
  assert.deepEqual(records.get('birch').state.tasks,[task('Separate durable profile','ba')]);
  assert.deepEqual(warnings,['aster']);
  assert.deepEqual(commits,['birch']);
  assert.equal(a.isSessionOnly('birch'),false);
});

test('missing or rejected Web Locks keep multiple writes in the same session',async()=>{
  for(const unavailable of [null,{request:()=>Promise.reject(Error('lock unavailable'))}]){
    const {client,records}=setup();
    const store=client(undefined,unavailable);
    await Promise.all([store.write('aster',add('Session one','a')),store.write('aster',add('Session two','b'))]);
    assert.deepEqual((await store.read('aster')).tasks,[task('Session one','a'),task('Session two','b')]);
    assert.equal(records.size,0);
    assert.equal(store.isSessionOnly('aster'),true);
  }
});

test('unreadable legacy data is never replaced and session fallback uses the last good read',async()=>{
  const {legacy,records,client}=setup();
  const store=client();
  const before=await store.read('aster');
  legacy.set(storageKey('aster'),'{corrupt');
  await store.write('aster',add('Session only','a'));
  assert.equal(legacy.get(storageKey('aster')),'{corrupt');
  assert.equal(records.size,0);
  assert.deepEqual(await store.read('aster'),{...before,tasks:[task('Session only','a')]});
});
