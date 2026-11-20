import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';

test('new client installation has no fictitious ambassadors, preserves new ones after restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a1-ref-no-demo-'));
 const dbPath=join(dir,'client.sqlite');
 let first;
 try {
  first=createStore(dbPath);
  assert.deepEqual(first.adminOverview().ambassadors,[]);
  const flow=createParticipantFlow(first.db);
  const account=flow.issueAmbassador({name:'Inviter For Acceptance'});
  assert.ok(account.inviteUrl.startsWith('/r/'));
  assert.equal(first.adminOverview().ambassadors.length,1);
  first.db.close();first=null;
  const again=createStore(dbPath);
  assert.equal(again.adminOverview().ambassadors.length,1);
  assert.equal(again.adminOverview().ambassadors[0].name,'Inviter For Acceptance');
  again.db.close();
 }finally{
  try{first?.db.close()}catch{}
  rmSync(dir,{recursive:true,force:true});
 }
});
