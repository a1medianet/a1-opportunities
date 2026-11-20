import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommercialFlow} from '../src/commercial.js';

test('WhatsApp click is not confirmed group joining and payment is controlled by organizer',()=>{
 const dir=mkdtempSync(join(tmpdir(),'referral-sale-')),store=createStore(join(dir,'sale.sqlite'));
 try {
  const commercial=createCommercialFlow(store.db);
  const flow=createParticipantFlow(store.db,id=>commercial.issueJoinTicket(id));
  const a=flow.issueAmbassador({name:'Ambassador Finance A'});
  const b=flow.issueAmbassador({name:'Ambassador Finance B'});
  const first=flow.register({code:a.inviteUrl.slice(3),name:'First Visitor',phone:'+999112233445',consent:true});
  const second=flow.register({code:b.inviteUrl.slice(3),name:'Second Visitor',phone:'+999112233446',consent:true});
  assert.equal(commercial.ownerSummary().perAmbassador.find(x=>x.id===a.id).clickedWhatsApp,0);
  assert.equal(commercial.markJoinLinkClick(first.joinTicket).recorded,true);
  assert.equal(commercial.markJoinLinkClick(first.joinTicket).recorded,true);
  assert.equal(commercial.ownerSummary().perAmbassador.find(x=>x.id===a.id).clickedWhatsApp,1);
  assert.equal(commercial.ownerSummary().perAmbassador.find(x=>x.id===a.id).confirmedJoin,0);
  const id=flow.ownerOverview().find(x=>x.name==='First Visitor').id;
  assert.equal(commercial.verifySale({participantId:id,paymentRef:'PAY-0001',evidenceRef:'RECEIPT-0001',saleCents:12000,commissionCents:1500}).duplicate,false);
  const identical=commercial.verifySale({participantId:id,paymentRef:'PAY-0001',evidenceRef:'RECEIPT-0001',saleCents:12000,commissionCents:1500});
  assert.equal(identical.duplicate,true);
  assert.throws(()=>commercial.verifySale({participantId:id,paymentRef:'PAY-0002',evidenceRef:'RECEIPT-0002',saleCents:12000,commissionCents:1500}),/Conflicting/);
  assert.throws(()=>commercial.payCommission({id:1,payoutRef:'TRANSFER-1'}),/approved/);
  assert.equal(commercial.approveSale(1).duplicate,false);
  assert.equal(commercial.approveSale(1).duplicate,true);
  assert.equal(commercial.payCommission({id:1,payoutRef:'TRANSFER-1'}).duplicate,false);
  assert.equal(commercial.payCommission({id:1,payoutRef:'TRANSFER-1'}).duplicate,true);
  assert.throws(()=>commercial.payCommission({id:1,payoutRef:'TRANSFER-2'}),/Conflicting/);
  const ownA=commercial.ownSummary(a.id),ownB=commercial.ownSummary(b.id);
  assert.equal(ownA.summary.subscriptions,1);
  assert.equal(ownA.summary.paidCents,1500);
  assert.equal(ownB.summary.subscriptions,0);
  assert.equal(ownB.summary.paidCents,0);
  assert.equal(commercial.reverseSale({id:1,reason:'Confirmed refund recorded'}).recoveryRequired,true);
  assert.equal(commercial.reverseSale({id:1,reason:'Confirmed refund recorded'}).duplicate,true);
  assert.equal(commercial.ownerSummary().totals.totalCommissionCents,0);
  assert.equal(commercial.ownerSummary().totals.recoveryOutstandingCents,1500);
  assert.equal(flow.ownerOverview().find(p=>p.id===id).status,'registered');
  assert.equal(commercial.ownSummary(a.id).summary.subscriptions,0);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='commission.paid_reversal_requires_recovery'").get().n,1);
  assert.equal(commercial.markJoinLinkClick(second.joinTicket).recorded,true);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});
