import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialState, storageKey} from '../dist/core.mjs';
import {createProfileStore} from '../dist/profile-store.mjs';

const start = id => initialState({id,skills:[]});
const scope = 'demo';
const ts = '2026-11-25T00:00:00.000Z';
const task = (id) => ({id,title:id,createdAt:ts,due:'',completed:false,priority:'High'});

function setup() {
  const data = new Map();
  const storage = {
    getItem: key => data.get(key),
    setItem: (key,value) => data.set(key,value)
  };
  const tails = new Map();
  const locks = {
    request(key,action){
      const next = (tails.get(key) ?? Promise.resolve()).then(action);
      tails.set(key,next.catch(()=>{}));
      return next;
    }
  };
  return {storage,locks};
}

test('two profile writers serialize narrow changes and never use a cached workspace as their write base', async()=>{
  const {storage,locks}=setup();
  const first=createProfileStore(start,()=>storage,locks);
  const second=createProfileStore(start,()=>storage,locks);
  await first.update(scope,latest=>{
    latest.leads={gone:{stage:'Waiting',referral:'Advice received',notes:'old'},kept:{notes:'old'}};
  });
  const stale=first.read(scope);
  await second.update(scope,latest=>{latest.leads.kept.notes='new';latest.tasks.push(task('first'));});
  await Promise.all([
    first.update(scope,latest=>{delete latest.leads.gone;}),
    second.update(scope,latest=>{latest.tasks.push(task('second'));})
  ]);
  assert.ok(stale.leads.gone);
  assert.deepEqual(first.read(scope).leads,{kept:{notes:'new'}});
  assert.deepEqual(first.read(scope).tasks,[task('first'),task('second')]);
});

test('unavailable locking or storage keeps changes in memory without an uncoordinated write', async()=>{
  const {storage,locks}=setup();
  const online=createProfileStore(start,()=>storage,locks);
  await online.update(scope,latest=>{latest.tasks.push(task('persisted'));});
  const noLock=createProfileStore(start,()=>storage,undefined);
  const noLockResult=await noLock.update(scope,latest=>{latest.tasks.push(task('session only'));});
  assert.equal(noLockResult.durable,false);
  assert.deepEqual(noLock.read(scope).tasks,[task('persisted'),task('session only')]);
  assert.deepEqual(online.read(scope).tasks,[task('persisted')]);
  const failedWrite=createProfileStore(start,()=>({...storage,setItem(){throw Error();}}),locks);
  assert.equal((await failedWrite.update(scope,latest=>{latest.tasks=[];})).durable,false);
  assert.deepEqual(failedWrite.read(scope).tasks,[]);
  assert.deepEqual(online.read(scope).tasks,[task('persisted')]);
});

test('a stale no-op does not write or affect another profile; an explicit save can create a fresh record', async()=>{
  const {storage,locks}=setup();
  const store=createProfileStore(start,()=>storage,locks);
  await store.update('other',latest=>{latest.leads.gone={notes:'other profile'};});
  const result=await store.update(scope,()=>false);
  assert.equal(result.result,false);
  assert.equal(storage.getItem(storageKey(scope)),undefined);
  await store.update(scope,latest=>{latest.leads.gone={stage:'Saved'};});
  assert.deepEqual(store.read(scope).leads.gone,{stage:'Saved'});
  assert.deepEqual(store.read('other').leads.gone,{notes:'other profile'});
});

test('cancelling a queued write aborts the lock request without writing or entering session-only mode', async()=>{
  const {storage,locks}=setup();
  const reader=createProfileStore(start,()=>storage,locks);
  await reader.update(scope,latest=>{latest.leads.keep={stage:'Waiting',notes:'retain'};});
  const before=storage.getItem(storageKey(scope));
  const controller=new AbortController();
  const waitForLock={
    request(key,{signal}){
      assert.equal(key,storageKey(scope));
      assert.equal(signal,controller.signal);
      return new Promise((_,reject)=>{
        signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
      });
    }
  };
  let applied=false;
  const writer=createProfileStore(start,()=>storage,waitForLock);
  const removal=writer.update(scope,latest=>{applied=true;delete latest.leads.keep;},controller.signal);
  controller.abort();
  await assert.rejects(removal,{name:'AbortError'});
  assert.equal(applied,false);
  assert.equal(storage.getItem(storageKey(scope)),before);
  assert.equal(writer.isSessionOnly(scope),false);
});

test('an aborted write cannot apply if a lock callback arrives late or locking is unavailable', async()=>{
  const {storage}=setup();
  const controller=new AbortController();
  let release;
  const lateLock={request(key,options,callback){
    return new Promise(resolve=>{release=()=>resolve(Promise.resolve().then(callback));});
  }};
  const writer=createProfileStore(start,()=>storage,lateLock);
  const unavailable=createProfileStore(start,()=>storage,undefined);
  let applied=false;
  const change=()=>{applied=true;};
  const removal=writer.update(scope,change,controller.signal);
  controller.abort();
  release();
  await assert.rejects(removal,{name:'AbortError'});
  await assert.rejects(unavailable.update(scope,change,controller.signal),{name:'AbortError'});
  assert.equal(applied,false);
  assert.equal(storage.getItem(storageKey(scope)),undefined);
  assert.equal(writer.isSessionOnly(scope),false);
});

test('publishes the first session-only write by profile before the mutation result is delivered', async()=>{
  const noticeIds=[];
  let storageAttempts=0;
  const unavailableStorage=()=>({
    getItem:()=>null,
    setItem(){
      storageAttempts++;
      throw new DOMException('Synthetic quota failure','QuotaExceededError');
    }
  });
  let releaseNotification;
  const locks={
    request(_key,callback){
      const result=callback();
      return new Promise(resolve=>{releaseNotification=()=>resolve(result);});
    }
  };
  const store=createProfileStore(start,unavailableStorage,locks,id=>{
    assert.equal(store.isSessionOnly(id),true);
    noticeIds.push(id);
  });

  const first=store.update(scope,latest=>{latest.tasks.push(task('session task'));});
  assert.deepEqual(noticeIds,[scope]);
  assert.equal(store.read(scope).tasks[0].title,'session task');
  releaseNotification();
  assert.equal((await first).durable,false);

  const second=store.update(scope,latest=>{latest.tasks.push(task('second task'));});
  releaseNotification();
  await second;
  assert.deepEqual(noticeIds,[scope]);

  const other=store.update('other',latest=>{latest.tasks.push(task('other task'));});
  releaseNotification();
  await other;
  assert.deepEqual(noticeIds,[scope,'other']);
  assert.equal(storageAttempts,2);
});
