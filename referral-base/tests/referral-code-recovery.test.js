import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync,backup} from 'node:sqlite';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommercialFlow} from '../src/commercial.js';

const temp=()=>mkdtempSync(join(tmpdir(),'a1-referral-recover-'));

test('real ambassador referral links are LTP0000, LTP0001 and cannot be repeated across reopen',()=>{
 const dir=temp(),path=join(dir,'db.sqlite');let store;
 try{
  store=createStore(path);
  let flow=createParticipantFlow(store.db);
  const first=flow.issueAmbassador({name:'First Test'}),second=flow.issueAmbassador({name:'Second Test'});
  assert.equal(first.inviteUrl,'/r/LTP0000');assert.equal(second.inviteUrl,'/r/LTP0001');
  assert.notEqual(first.accessToken,second.accessToken);
  assert.equal(flow.recordVisit('LTP0000'),true);
  assert.equal(flow.register({code:'LTP0000',name:'Visitor First',phone:'+96170123456',consent:true}).received,true);
  store.db.close();store=null;
  store=createStore(path);flow=createParticipantFlow(store.db);
  const third=flow.issueAmbassador({name:'Third Test'});
  assert.equal(third.inviteUrl,'/r/LTP0002');
  assert.equal(flow.adminAmbassadors().find(a=>a.code==='LTP0000').registered,1);
  assert.equal(flow.ownOverview(third.accessToken).count,0);
  assert.equal(flow.recordVisit('LTP9999'),false);
 }finally{try{store?.db.close()}catch{}rmSync(dir,{recursive:true,force:true})}
});

test('an isolated SQLite online backup restores attribution, commission records and audit intact',async()=>{
 const dir=temp(),source=join(dir,'source.sqlite'),snapshot=join(dir,'snapshot.sqlite'),restored=join(dir,'restored.sqlite');let store,sourceRead,restoreRead;
 try{
  store=createStore(source);const flow=createParticipantFlow(store.db);const commercial=createCommercialFlow(store.db);
  const ambassador=flow.issueAmbassador({name:'Backup Owner'});
  flow.register({code:ambassador.inviteUrl.slice(3),name:'Backed Up Visitor',phone:'+96170123456',consent:true});
  const personId=store.db.prepare('SELECT id FROM participants LIMIT 1').get().id;
  const sale=commercial.verifySale({participantId:personId,paymentRef:'BACKUP-PAY-001',evidenceRef:'BACKUP-RECEIPT-001',saleCents:9000,commissionCents:1800});
  commercial.approveSale(sale.id);
  store.db.prepare("INSERT INTO audit(action,ref) VALUES('backup.test','verified')").run();
  const before={ambassadors:store.db.prepare('SELECT count(*) AS n FROM ambassadors').get().n,participants:store.db.prepare('SELECT count(*) AS n FROM participants').get().n,audit:store.db.prepare('SELECT count(*) AS n FROM audit').get().n,sales:store.db.prepare('SELECT count(*) AS n FROM participant_sales').get().n};
  await backup(store.db,snapshot);
  sourceRead=new DatabaseSync(snapshot,{readOnly:true});assert.equal(sourceRead.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(sourceRead.prepare('SELECT count(*) AS n FROM ambassadors').get().n,before.ambassadors);
  assert.equal(sourceRead.prepare('SELECT count(*) AS n FROM participants').get().n,before.participants);
  assert.equal(sourceRead.prepare('SELECT count(*) AS n FROM audit').get().n,before.audit);
  assert.equal(sourceRead.prepare('SELECT count(*) AS n FROM participant_sales').get().n,before.sales);
  sourceRead.close();sourceRead=null;store.db.close();store=null;
  // Restore to a NEW path only: never overwrite an active production database.
  const original=new DatabaseSync(snapshot,{readOnly:true});const recovery=new DatabaseSync(restored);
  try{original.backup ? await original.backup(restored) : await backup(original,restored)}finally{original.close();recovery.close()}
  restoreRead=new DatabaseSync(restored,{readOnly:true});
  assert.equal(restoreRead.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(restoreRead.prepare('SELECT p.name AS person,a.code AS inviter FROM participants p JOIN ambassadors a ON a.id=p.ambassador_id').get().inviter,'LTP0000');
  assert.equal(restoreRead.prepare('SELECT status FROM participant_sales WHERE payment_ref=?').get('BACKUP-PAY-001').status,'approved');
  const audit=restoreRead.prepare('SELECT action,ref FROM audit WHERE action=?').get('backup.test');
  assert.equal(audit.action,'backup.test');assert.equal(audit.ref,'verified');
 }finally{try{restoreRead?.close()}catch{}try{sourceRead?.close()}catch{}try{store?.db.close()}catch{}rmSync(dir,{recursive:true,force:true})}
});
