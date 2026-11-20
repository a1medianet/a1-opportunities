import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommercialFlow} from '../src/commercial.js';
function setup(){
 const dir=mkdtempSync(join(tmpdir(),'a1-referral-operations-'));
 const store=createStore(join(dir,'operations.sqlite'));
 const commercial=createCommercialFlow(store.db);
 const participant=createParticipantFlow(store.db,id=>commercial.issueJoinTicket(id));
 return {dir,store,commercial,participant,close(){store.db.close();rmSync(dir,{recursive:true,force:true})}};
}
test('one permanent invitation: visit count is separate from registrations; disabling preserves records',()=>{
 const app=setup();
 try {
  const person=app.participant.issueAmbassador({name:'Partner Test'});
  const code=person.inviteUrl.slice(3);
  assert.equal(app.participant.recordVisit('not-found'),false);
  assert.equal(app.participant.recordVisit(code),true);
  assert.equal(app.participant.recordVisit(code),true);
  assert.equal(app.participant.ownOverview(person.accessToken).linkVisits,2);
  assert.equal(app.participant.ownOverview(person.accessToken).count,0);
  const signed=app.participant.register({code,name:'Person Test',phone:'+999123456782',consent:true});
  assert.equal(signed.received,true);
  assert.equal(app.participant.ownOverview(person.accessToken).count,1);
  const suspended=app.participant.setAmbassadorStatus({id:person.id,status:'suspended'});
  assert.equal(suspended.updated,true);
  assert.equal(app.participant.recordVisit(code),false);
  assert.equal(app.participant.ambassadorByToken(person.accessToken),null);
  assert.equal(app.participant.adminAmbassadors().find(x=>x.id===person.id).registered,1);
  assert.equal(app.participant.setAmbassadorStatus({id:person.id,status:'suspended'}).updated,false);
  assert.equal(app.participant.setAmbassadorStatus({id:person.id,status:'approved'}).updated,true);
  assert.equal(app.participant.recordVisit(code),true);
  assert.equal(app.participant.ownOverview(person.accessToken).count,1);
  assert.equal(app.participant.ownOverview(person.accessToken).linkVisits,3);
 }finally{app.close()}
});
test('an invited person has a verified, approved, paid, then reversed commission ledger',()=>{
 const app=setup();
 try{
  const ambassador=app.participant.issueAmbassador({name:'Commission Test'});
  const code=ambassador.inviteUrl.slice(3);
  app.participant.register({code,name:'Paying Person',phone:'+999123456781',consent:true});
  const participant=app.participant.ownerOverview().find(x=>x.name==='Paying Person');
  assert.ok(participant);
  const details={participantId:participant.id,paymentRef:'TEST-PAY-REF-2026',evidenceRef:'TEST-DOC-REF-2026',saleCents:20000,commissionCents:4000};
  const verified=app.commercial.verifySale(details);
  assert.equal(verified.duplicate,false);
  assert.equal(app.commercial.verifySale(details).duplicate,true);
  const get=()=>app.commercial.ownSummary(ambassador.id).summary;
  assert.equal(get().pendingApprovalCents,4000);
  assert.equal(get().approvedUnpaidCents,0);
  app.commercial.approveSale(verified.id);
  assert.equal(get().pendingApprovalCents,0);
  assert.equal(get().approvedUnpaidCents,4000);
  app.commercial.payCommission({id:verified.id,payoutRef:'TEST-PAYOUT-REF-01'});
  assert.equal(get().approvedUnpaidCents,0);
  assert.equal(get().paidCents,4000);
  assert.equal(app.commercial.reverseSale({id:verified.id,reason:'Test refund for reversal'}).recoveryRequired,true);
  assert.equal(get().paidCents,0);
  assert.equal(get().recoveryOutstandingCents,4000);
 }finally{app.close()}
});
