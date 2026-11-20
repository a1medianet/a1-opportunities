import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
test('one learner cannot accrue a second commission from another payment reference',()=>{
 const d=mkdtempSync(join(tmpdir(),'a1-referral-claude-')),s=createStore(join(d,'review.sqlite'),{seedTestData:true});
 try{
   const {code}=s.adminOverview().ambassadors[0];
   const lead=s.register({code,name:'Review Person',email:'review-unique@example.test',consent:true});
   s.recordPayment({leadId:lead.id,externalId:'REVIEW-E1',paymentRef:'REVIEW-P1',proofNote:'verified by reviewer',amountCents:10000});
   assert.throws(()=>s.recordPayment({leadId:lead.id,externalId:'REVIEW-E2',paymentRef:'REVIEW-P2',proofNote:'second claim',amountCents:10000}),/already recorded/);
   assert.equal(s.adminOverview().commissions.length,1);
   s.refund('REVIEW-E1');
   assert.equal(s.stats(code).paidEnrollments,0);
 }finally{s.db.close();rmSync(d,{recursive:true,force:true})}
});
