import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommercialFlow} from '../src/commercial.js';
import {createAmbassadorOnboarding} from '../src/onboarding.js';
import {createOpportunityCatalog} from '../src/opportunities.js';

test('personal campaign zero migrates unused legacy code and is eligible for normal commission workflow',()=>{
 const dir=mkdtempSync(join(tmpdir(),'opps-zero-'));const store=createStore(join(dir,'db.sqlite'));
 try{
  const flow=createParticipantFlow(store.db);
  store.db.exec('CREATE TABLE IF NOT EXISTS official_campaign_referrals(campaign_id INTEGER PRIMARY KEY,ambassador_id INTEGER UNIQUE,code TEXT UNIQUE,created_at TEXT)');
  const legacy=store.db.prepare("INSERT INTO ambassadors(campaign_id,name,code,status) VALUES(1,'Legacy Direct','a1ltp0000','approved')").run();
  store.db.prepare('INSERT INTO official_campaign_referrals(campaign_id,ambassador_id,code) VALUES(1,?,?)').run(Number(legacy.lastInsertRowid),'a1ltp0000');
  const out=flow.ensureCampaignZeroAmbassador('linktutor-2026-11-28','ltp0');
  assert.equal(out.ambassadorId,Number(legacy.lastInsertRowid));assert.equal(out.inviteUrl,'/r/ltp0');
  assert.equal(flow.ensureCampaignZeroAmbassador('linktutor-2026-11-28','ltp0').duplicate,true);
  assert.throws(()=>flow.ensureCampaignZeroAmbassador('linktutor-2026-11-28','abc0'),/Zero code immutable/);
  const owner=store.db.prepare('SELECT * FROM campaign_zero_ambassadors').get();
  assert.equal(owner.owner_name,'Chadi Atwi');assert.equal(owner.owner_email,'chadiatwi@gmail.com');
  const prev=process.env.A1_OPPS_DIRECT_REFERRAL;
  process.env.A1_OPPS_DIRECT_REFERRAL='1';
  const other=flow.issueAmbassador({name:'Another Ambassador',campaignId:1});
  if(prev===undefined)delete process.env.A1_OPPS_DIRECT_REFERRAL;else process.env.A1_OPPS_DIRECT_REFERRAL=prev;
  assert.equal(other.inviteUrl,'/r/ltp1');
  assert.equal(flow.register({code:'ltp0',name:'Synthetic Visitor',phone:'+96170123456',consent:true}).received,true);
  const id=store.db.prepare('SELECT id FROM participants').get().id;
  const flowSales=createCommercialFlow(store.db);
  const sale=flowSales.verifySale({participantId:id,paymentRef:'documented-test-pay',evidenceRef:'documented-test-proof',saleCents:4000,commissionCents:3000});
  flowSales.approveSale(sale.id);
  assert.equal(flowSales.payCommission({id:sale.id,payoutRef:'test-settlement-01'}).duplicate,false);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});

test('each new opportunity receives separate owner zero and independent sequential links',()=>{
 const dir=mkdtempSync(join(tmpdir(),'opps-multi-'));const store=createStore(join(dir,'db.sqlite'));
 try{
  const flow=createParticipantFlow(store.db);
  createAmbassadorOnboarding(store.db,{issueAmbassador:flow.issueAmbassador});
  createCommercialFlow(store.db);
  const catalog=createOpportunityCatalog(store.db);
  const org=catalog.addOrganization({name:'Sample Future Organizer',code:'future-organization'});
  const opp=catalog.add({slug:'sample-2027',title:'Sample New Opportunity',eventDate:'2027-04-01',organizationId:org.id,referralPrefix:'smp'});
  assert.equal(opp.ownerReferralCode,'smp0');
  const prev=process.env.A1_OPPS_DIRECT_REFERRAL;process.env.A1_OPPS_DIRECT_REFERRAL='1';
  const x=flow.issueAmbassador({name:'External One',campaignId:opp.id});
  if(prev===undefined)delete process.env.A1_OPPS_DIRECT_REFERRAL;else process.env.A1_OPPS_DIRECT_REFERRAL=prev;
  assert.equal(x.inviteUrl,'/r/smp1');
  const scoped=catalog.report(opp.id);
  assert.equal(scoped.ambassadors.length,2);
  assert.ok(scoped.ambassadors.every(a=>a.code.startsWith('smp')));
  assert.equal(catalog.report(1).ambassadors.some(a=>a.code.startsWith('smp')),false);
  assert.equal(catalog.list().find(o=>o.id===opp.id).registration_status,'draft');
  assert.equal(store.db.prepare('SELECT owner_email FROM campaign_zero_ambassadors WHERE campaign_id=?').get(opp.id).owner_email,'chadiatwi@gmail.com');
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});



test('legacy LinkTutor admin summary excludes other campaigns, their people and their financial totals',()=>{
 const dir=mkdtempSync(join(tmpdir(),'opps-scope-'));const store=createStore(join(dir,'db.sqlite'));
 try{
  const flow=createParticipantFlow(store.db);
  createAmbassadorOnboarding(store.db,{issueAmbassador:flow.issueAmbassador});
  createCommercialFlow(store.db);
  const catalog=createOpportunityCatalog(store.db);
  const org=catalog.addOrganization({name:'Independent Second Org',code:'independent-second'});
  const second=catalog.add({slug:'second-isolation-2027',title:'Second Isolated Campaign',eventDate:'2027-08-01',organizationId:org.id,referralPrefix:'iso'});
  store.db.prepare('UPDATE campaigns SET active=1 WHERE id=?').run(second.id); // simulated campaign activation in isolated test database only
  flow.register({code:'iso0',name:'Second Campaign Participant',phone:'+96170123457',consent:true});
  const original=flow.issueAmbassador({name:'LTP Public Ambassador',campaignId:1});
  flow.register({code:original.inviteUrl.slice(3),name:'LTP Participant',phone:'+96170123458',consent:true});
  const sales=store.db.prepare("SELECT p.id,p.name FROM participants p").all();
  const secondParticipant=sales.find(p=>p.name==='Second Campaign Participant');
  const commercial=createCommercialFlow(store.db);
  const sale=commercial.verifySale({participantId:secondParticipant.id,paymentRef:'second-payment-proof',evidenceRef:'second-payment-evidence',saleCents:4000,commissionCents:3000});
  const ltp=catalog.legacyLtpAdminView();
  assert.equal(ltp.participants.length,1);
  assert.equal(ltp.participants[0].name,'LTP Participant');
  assert.ok(ltp.ambassadors.every(a=>a.code.startsWith('LTP')));
  assert.equal(ltp.sales.length,0);
  assert.equal(ltp.totals.totalCommissionCents,0);
  assert.equal(catalog.report(second.id).ambassadors.some(a=>a.code==='iso0'),true);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});

