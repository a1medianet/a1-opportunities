import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommercialFlow} from '../src/commercial.js';

function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'a1-ref-milestones-'));
 const store=createStore(join(dir,'test.sqlite'));
 const commercial=createCommercialFlow(store.db);
 const flow=createParticipantFlow(store.db,id=>commercial.issueJoinTicket(id));
 const close=()=>{store.db.close();rmSync(dir,{recursive:true,force:true})};
 return {store,commercial,flow,close};
}

test('paid subscription alone is NOT confirmation of group membership or attendance',()=>{
 const f=fixture();
 try {
  const amb=f.flow.issueAmbassador({name:'Strict Milestones Partner'});
  f.flow.register({code:amb.inviteUrl.slice(3),name:'Buyer Without Attendance',phone:'+999123456770',consent:true});
  const person=f.flow.ownerOverview().find(x=>x.name==='Buyer Without Attendance');
  const sale=f.commercial.verifySale({participantId:person.id,paymentRef:'MILESTONE-PAYMENT-001',evidenceRef:'MILESTONE-RECEIPT-001',saleCents:15000,commissionCents:2000});
  assert.equal(f.flow.ownerOverview().find(x=>x.id===person.id).status,'enrolled');
  assert.equal(f.flow.ownerOverview().find(x=>x.id===person.id).confirmedJoin,0);
  assert.equal(f.flow.ownerOverview().find(x=>x.id===person.id).confirmedAttendance,0);
  const summary=()=>f.commercial.ownSummary(amb.id).summary;
  assert.equal(summary().subscriptions,1);
  assert.equal(summary().confirmedJoin,0);
  assert.equal(summary().attended,0);
  assert.equal(f.flow.updateStatus(person.id,'joined').updated,true);
  assert.equal(f.flow.updateStatus(person.id,'joined').updated,false);
  assert.equal(summary().confirmedJoin,1);
  assert.equal(summary().attended,0);
  assert.equal(f.flow.ownerOverview().find(x=>x.id===person.id).status,'enrolled');
  assert.equal(f.flow.updateStatus(person.id,'attended').updated,true);
  assert.equal(summary().attended,1);
  assert.equal(f.commercial.reverseSale({id:sale.id,reason:'Refund for milestone test'}).duplicate,false);
  assert.equal(f.flow.ownerOverview().find(x=>x.id===person.id).status,'attended');
  assert.equal(summary().subscriptions,0);
  assert.equal(summary().attended,1);
  assert.equal(summary().confirmedJoin,1);
 } finally {f.close()}
});

test('attendance confirmed directly does not prove WhatsApp membership',()=>{
 const f=fixture();
 try{
  const amb=f.flow.issueAmbassador({name:'Independent Events Partner'});
  f.flow.register({code:amb.inviteUrl.slice(3),name:'Zoom Direct Visitor',phone:'+999123456771',consent:true});
  const id=f.flow.ownerOverview().find(x=>x.name==='Zoom Direct Visitor').id;
  assert.equal(f.flow.updateStatus(id,'attended').updated,true);
  const get=()=>f.commercial.ownSummary(amb.id).summary;
  assert.equal(get().attended,1);
  assert.equal(get().confirmedJoin,0);
  assert.equal(f.flow.updateStatus(id,'joined').updated,true);
  assert.equal(get().attended,1);
  assert.equal(get().confirmedJoin,1);
  assert.equal(f.flow.ownerOverview().find(x=>x.id===id).status,'attended');
 }finally{f.close()}
});

test('existing attendance audit is migrated without changing participant attribution',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a1-ref-legacy-milestones-'));
 const store=createStore(join(dir,'legacy.sqlite'),{seedTestData:true});
 try{
  const db=store.db;
  db.exec("CREATE TABLE participants (id INTEGER PRIMARY KEY,campaign_id INTEGER NOT NULL,ambassador_id INTEGER NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,phone_hash TEXT NOT NULL,consent INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'registered',registered_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(campaign_id,phone_hash))");
  const ambassador=db.prepare('SELECT id FROM ambassadors ORDER BY id LIMIT 1').get().id;
  const row=db.prepare("INSERT INTO participants(campaign_id,ambassador_id,name,phone,phone_hash,consent,status) VALUES(1,?,'Historic Buyer','+999123456772','legacy-hash',1,'enrolled')").run(ambassador);
  const id=Number(row.lastInsertRowid);
  db.prepare("INSERT INTO audit(action,ref) VALUES('participant.attended',?)").run(String(id));
  const flow=createParticipantFlow(db);
  const migrated=flow.ownerOverview().find(p=>p.id===id);
  assert.equal(migrated.ambassador,'Demo Ambassador — A');
  assert.equal(migrated.confirmedAttendance,1);
  assert.equal(migrated.confirmedJoin,0);
  assert.equal(migrated.status,'enrolled');
  createParticipantFlow(db); // migration replay is safe
  assert.equal(flow.ownerOverview().find(p=>p.id===id).confirmedJoin,0);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});
