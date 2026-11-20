import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createAmbassadorOnboarding} from '../src/onboarding.js';
import {createOpportunityCatalog} from '../src/opportunities.js';

function setup(){
 const dir=mkdtempSync(join(tmpdir(),'a1-opps-catalog-'));const store=createStore(join(dir,'db.sqlite'));
 const participants=createParticipantFlow(store.db);
 const onboarding=createAmbassadorOnboarding(store.db,{issueAmbassador:participants.issueAmbassador});
 const catalog=createOpportunityCatalog(store.db);
 return {db:store.db,participants,onboarding,catalog,dir,close(){store.db.close();rmSync(dir,{recursive:true,force:true})}};
}
test('one catalog supports separate organizers, opportunities and commercial terms with audit',()=>{
 const w=setup();
 try{
  const first=w.catalog.list();assert.equal(first.length,1);assert.equal(first[0].organizer,'LinkTutor Pro');assert.equal(first[0].a1_fee_cents,1000);
  const second=w.catalog.addOrganization({code:'second-partner',name:'Second Test Partner'});assert.equal(second.status,'draft');
  const newOpp=w.catalog.add({slug:'future-course-2027',title:'Future Training Course',eventDate:'2027-01-15',organizationId:second.id,brandName:'Partner Name',referralPrefix:'fut'});
  assert.equal(newOpp.status,'draft');assert.equal(w.catalog.list().length,2);
  const result=w.catalog.setTerms({campaignId:newOpp.id,grossCents:4000,mode:'percent',value:2500,reason:'Draft 25 percent revenue allocation'});
  assert.equal(result.a1FeeCents,1000);assert.equal(result.ambassadorCents,3000);
  assert.equal(w.db.prepare('SELECT COUNT(*) n FROM opportunity_terms_audit WHERE campaign_id=?').get(newOpp.id).n,1);
  assert.notEqual(w.db.prepare('SELECT prefix FROM referral_code_prefixes WHERE campaign_id=1').get().prefix,newOpp.prefix);
  assert.throws(()=>w.catalog.add({slug:'future-course-2027',title:'Duplicate',eventDate:'2027-01-15',organizationId:second.id,referralPrefix:'oth'}),/UNIQUE/);
  assert.equal(w.catalog.list().length,2);
  assert.throws(()=>w.catalog.setTerms({campaignId:newOpp.id,grossCents:4000,mode:'fixed',value:5000,reason:'Overpayment invalid'}),/Invalid/);
 }finally{w.close()}
});
test('verified ambassador account can receive another opportunity scoped referral code without duplicate',()=>{
 const w=setup();
 try{
  const s=w.catalog.addOrganization({code:'third-partner',name:'Third Partner'});
  const campaign=w.catalog.add({slug:'third-2027-event',title:'Third Opportunity',eventDate:'2027-03-01',organizationId:s.id,referralPrefix:'thr'});
  // Synthetic account, not a real user's data.
  const acc=w.db.prepare("INSERT INTO ambassador_accounts(campaign_id,name_ar,name_en,email,country,phone,password_salt,password_hash,terms_version,email_verified_at,identity_name,identity_email,identity_phone) VALUES(1,'','Synthetic Ambassador','synthetic@example.test','LB','+96170123567','salt','hash','ltp-legal-v1',CURRENT_TIMESTAMP,'name1','email1','phone1')").run();
  const first=w.catalog.grantAmbassador({accountId:Number(acc.lastInsertRowid),campaignId:campaign.id},w.participants.issueAmbassador);
  assert.equal(first.duplicate,false);assert.match(first.inviteUrl,/^\/r\//);
  const repeat=w.catalog.grantAmbassador({accountId:Number(acc.lastInsertRowid),campaignId:campaign.id},w.participants.issueAmbassador);
  assert.equal(repeat.duplicate,true);assert.equal(repeat.ambassadorId,first.ambassadorId);
  assert.equal(w.db.prepare('SELECT COUNT(*) n FROM ambassadors WHERE campaign_id=?').get(campaign.id).n,2); // reserved owner zero plus approved external ambassador
  assert.equal(w.catalog.list().find(x=>x.slug==='third-2027-event').registration_status,'draft');
 }finally{w.close()}
});


test('draft-status changes affect only the selected campaign and never publish public registrations',()=>{
 const w=setup();
 try{
  const org=w.catalog.addOrganization({code:'status-org',name:'Status Test Organizer'});
  const a=w.catalog.add({slug:'status-one-2027',title:'Test Campaign One',eventDate:'2027-02-01',organizationId:org.id,referralPrefix:'sto'});
  const b=w.catalog.add({slug:'status-two-2027',title:'Test Campaign Two',eventDate:'2027-02-02',organizationId:org.id,referralPrefix:'stt'});
  assert.equal(w.catalog.setDraftStatus({campaignId:a.id,status:'closed'}).registrationOpen,false);
  let rows=w.catalog.list();
  assert.equal(rows.find(x=>x.id===a.id).registration_status,'closed');
  assert.equal(rows.find(x=>x.id===b.id).registration_status,'draft');
  assert.equal(rows.find(x=>x.id===1).registration_status,'draft');
  assert.equal(rows.find(x=>x.id===a.id).active,0);
  assert.throws(()=>w.catalog.setDraftStatus({campaignId:b.id,status:'ready'}),/Only draft/);
  assert.throws(()=>w.catalog.setDraftStatus({campaignId:999,status:'closed'}),/not found/);
  assert.equal(w.catalog.setDraftStatus({campaignId:a.id,status:'draft'}).registrationOpen,false);
  assert.equal(w.db.prepare("SELECT COUNT(*) n FROM audit WHERE action='opportunity.draft_status'").get().n,2);
 }finally{w.close()}
});
