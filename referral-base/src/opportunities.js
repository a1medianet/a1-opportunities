import {randomBytes} from 'node:crypto';

const validSlug=s=>/^[a-z0-9][a-z0-9-]{2,79}$/.test(s);
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const slugValue=v=>String(v??'').trim().toLowerCase();
const short=v=>String(v??'').trim();
const fail=msg=>{throw Error(msg)};
const prefix=()=>Array.from(randomBytes(3),b=>String.fromCharCode(65+b%26)).join('');

export function createOpportunityCatalog(db){
 db.exec(`CREATE TABLE IF NOT EXISTS opportunity_organizations(
 id INTEGER PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','suspended')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE TABLE IF NOT EXISTS opportunity_profiles(
 campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),
 organization_id INTEGER NOT NULL REFERENCES opportunity_organizations(id),
 description TEXT NOT NULL DEFAULT '',
 organizer_url TEXT NOT NULL DEFAULT '',
 brand_name TEXT NOT NULL DEFAULT '',
 gross_cents INTEGER NOT NULL DEFAULT 0 CHECK(gross_cents>=0),
 a1_fee_mode TEXT NOT NULL DEFAULT 'fixed' CHECK(a1_fee_mode IN ('fixed','percent')),
 a1_fee_value INTEGER NOT NULL DEFAULT 0 CHECK(a1_fee_value>=0),
 terms_version INTEGER NOT NULL DEFAULT 1,
 registration_status TEXT NOT NULL DEFAULT 'draft' CHECK(registration_status IN ('draft','ready','closed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE TABLE IF NOT EXISTS opportunity_terms_audit(
 id INTEGER PRIMARY KEY,
 campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
 gross_cents INTEGER NOT NULL,
 a1_fee_mode TEXT NOT NULL,
 a1_fee_value INTEGER NOT NULL,
 a1_fee_cents INTEGER NOT NULL,
 version INTEGER NOT NULL,
 reason TEXT NOT NULL,
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE TABLE IF NOT EXISTS opportunity_ambassador_memberships(
 account_id INTEGER NOT NULL REFERENCES ambassador_accounts(id),
 campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
 ambassador_id INTEGER NOT NULL UNIQUE REFERENCES ambassadors(id),
 accepted_terms_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(account_id,campaign_id)
 );`);
 // Ownership registry only. No fabricated approval of any organizer.
 const prior=db.prepare("SELECT id FROM opportunity_organizations WHERE code='linktutor-pro'").get();
 if(!prior)db.prepare("INSERT INTO opportunity_organizations(code,name,status) VALUES('linktutor-pro','LinkTutor Pro','draft')").run();
 const org=db.prepare("SELECT id FROM opportunity_organizations WHERE code='linktutor-pro'").get();
 const existing=db.prepare("SELECT id FROM campaigns WHERE slug='linktutor-2026-11-28'").get();
 if(existing)db.prepare("INSERT OR IGNORE INTO opportunity_profiles(campaign_id,organization_id,brand_name,gross_cents,a1_fee_mode,a1_fee_value) VALUES(?,?,?,?,?,?)").run(existing.id,org.id,'LinkTutor Pro',4000,'fixed',1000);
 function list(){
  return db.prepare(`SELECT c.id,c.slug,c.title,c.event_date,c.active,o.name organizer,o.status organizer_status,
   p.brand_name,p.description,p.organizer_url,p.gross_cents,p.a1_fee_mode,p.a1_fee_value,p.terms_version,p.registration_status,n.prefix AS referral_prefix,z.code AS owner_referral_code
   FROM campaigns c JOIN opportunity_profiles p ON p.campaign_id=c.id
   JOIN opportunity_organizations o ON o.id=p.organization_id LEFT JOIN opportunity_referral_numbering n ON n.campaign_id=c.id LEFT JOIN campaign_zero_ambassadors z ON z.campaign_id=c.id ORDER BY c.event_date,c.id`).all().map(x=>({...x,a1_fee_cents:x.a1_fee_mode==='percent'?Math.round(x.gross_cents*x.a1_fee_value/10000):x.a1_fee_value}));
 }
 function organizations(){return db.prepare('SELECT id,code,name,status FROM opportunity_organizations ORDER BY id').all();}
 function report(campaignId){
  const id=Number(campaignId);
  if(!Number.isSafeInteger(id)||id<1)fail('Invalid campaign ID');
  const campaign=db.prepare('SELECT campaign_id FROM opportunity_profiles WHERE campaign_id=?').get(id);
  if(!campaign)fail('Campaign not found');
  const ambassadors=db.prepare(`SELECT a.id,a.name,a.code,
   (SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id) AS visits,
   (SELECT COUNT(*) FROM participants p WHERE p.ambassador_id=a.id) AS registrations,
   (SELECT COUNT(*) FROM participants p JOIN participant_sales s ON s.participant_id=p.id WHERE p.ambassador_id=a.id AND s.status<>'reversed') AS verified_sales,
   COALESCE((SELECT SUM(s.commission_cents) FROM participants p JOIN participant_sales s ON s.participant_id=p.id WHERE p.ambassador_id=a.id AND s.status IN ('verified','approved','paid')),0) AS tracked_commission_cents,
   COALESCE((SELECT SUM(s.commission_cents) FROM participants p JOIN participant_sales s ON s.participant_id=p.id WHERE p.ambassador_id=a.id AND s.status='paid'),0) AS recorded_paid_cents
   FROM ambassadors a WHERE a.campaign_id=? ORDER BY a.id`).all(id);
  return {campaignId:id,ambassadors};
 }
 function legacyLtpAdminView(){
  const c=db.prepare("SELECT id FROM campaigns WHERE slug='linktutor-2026-11-28'").get();
  if(!c)return {participants:[],ambassadors:[],totals:{},perAmbassador:[],sales:[]};
  const cid=c.id;
  const ambassadors=db.prepare(`SELECT a.id,a.name,a.code,a.status,
    COUNT(p.id) AS registered FROM ambassadors a LEFT JOIN participants p ON p.ambassador_id=a.id
    WHERE a.campaign_id=? GROUP BY a.id ORDER BY a.id DESC`).all(cid);
  const participants=db.prepare(`SELECT p.id,p.name,p.real_name,p.display_code,p.phone,p.status,p.registered_at,
    CASE WHEN p.join_clicked_at IS NOT NULL THEN 1 ELSE 0 END AS clickedWhatsApp,
    CASE WHEN p.joined_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedJoin,
    CASE WHEN p.attended_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedAttendance,
    a.name AS ambassador,a.code AS ambassador_code,a.code AS referralCode
    FROM participants p JOIN ambassadors a ON a.id=p.ambassador_id
    WHERE a.campaign_id=? ORDER BY p.id DESC`).all(cid);
  const sales=db.prepare(`SELECT s.id,s.participant_id,s.payment_ref,s.evidence_ref,s.sale_cents,s.commission_cents,
    s.currency,s.status,s.payout_ref,s.verified_at,s.paid_at,p.name AS participant,a.name AS ambassador
    FROM participant_sales s JOIN participants p ON p.id=s.participant_id
    JOIN ambassadors a ON a.id=p.ambassador_id
    WHERE a.campaign_id=? ORDER BY s.id DESC LIMIT 200`).all(cid);
  const totals=db.prepare(`SELECT COUNT(CASE WHEN s.status<>'reversed' THEN 1 END) AS verifiedSubscriptions,
    COALESCE(SUM(CASE WHEN s.status IN ('verified','approved','paid') THEN s.commission_cents ELSE 0 END),0) AS totalCommissionCents,
    COALESCE(SUM(CASE WHEN s.status='paid' THEN s.commission_cents ELSE 0 END),0) AS paidCommissionCents,
    COALESCE(SUM(CASE WHEN s.status='reversed' AND s.paid_at IS NOT NULL THEN s.commission_cents ELSE 0 END),0) AS recoveryOutstandingCents
    FROM participant_sales s JOIN participants p ON p.id=s.participant_id JOIN ambassadors a ON a.id=p.ambassador_id WHERE a.campaign_id=?`).get(cid);
  const perAmbassador=db.prepare(`SELECT a.id,a.name,
    (SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id) AS linkVisits,
    COUNT(DISTINCT p.id) AS registered,
    COUNT(DISTINCT CASE WHEN p.join_clicked_at IS NOT NULL THEN p.id END) AS clickedWhatsApp,
    COUNT(DISTINCT CASE WHEN p.joined_at IS NOT NULL THEN p.id END) AS confirmedJoin,
    COUNT(DISTINCT CASE WHEN p.attended_at IS NOT NULL THEN p.id END) AS attended,
    COUNT(DISTINCT CASE WHEN s.status<>'reversed' THEN s.id END) AS verifiedSubscriptions,
    COALESCE(SUM(CASE WHEN s.status IN ('verified','approved','paid') THEN s.commission_cents ELSE 0 END),0) AS commissionCents,
    COALESCE(SUM(CASE WHEN s.status='paid' THEN s.commission_cents ELSE 0 END),0) AS paidCents
    FROM ambassadors a LEFT JOIN participants p ON p.ambassador_id=a.id LEFT JOIN participant_sales s ON s.participant_id=p.id
    WHERE a.campaign_id=? GROUP BY a.id ORDER BY a.id DESC`).all(cid);
  return {participants,ambassadors,totals,perAmbassador,sales};
 }
 function updateDraft(input){
  const campaignId=Number(input?.campaignId);
  const title=short(input?.title),eventDate=short(input?.eventDate),brandName=short(input?.brandName);
  const description=short(input?.description),organizerUrl=short(input?.organizerUrl);
  if(!Number.isSafeInteger(campaignId)||campaignId<1||title.length<3||title.length>180
    || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    || Number.isNaN(Date.parse(eventDate+'T00:00:00Z'))
    || brandName.length>120||description.length>2000||organizerUrl.length>500)
    fail('Invalid draft campaign details');
  if(organizerUrl){
    let u;try{u=new URL(organizerUrl)}catch{fail('Organizer URL must be HTTPS')}
    if(u.protocol!=='https:'||u.username||u.password||u.hash)fail('Organizer URL must be HTTPS');
  }
  const current=db.prepare('SELECT registration_status FROM opportunity_profiles WHERE campaign_id=?').get(campaignId);
  if(!current)fail('Campaign not found');
  if(current.registration_status==='ready')fail('Approved campaign changes require separate review');
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE campaigns SET title=?,event_date=? WHERE id=?').run(title,eventDate,campaignId);
   db.prepare('UPDATE opportunity_profiles SET brand_name=?,description=?,organizer_url=? WHERE campaign_id=?')
      .run(brandName,description,organizerUrl,campaignId);
   db.prepare("INSERT INTO audit(action,ref) VALUES('opportunity.draft_updated',?)").run(String(campaignId));
   db.exec('COMMIT');
   return {campaignId,title,eventDate,brandName,description,organizerUrl,status:current.registration_status};
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function setDraftStatus(input){
  const id=Number(input?.campaignId),status=String(input?.status||'');
  if(!Number.isSafeInteger(id)||id<1||!['draft','closed'].includes(status))fail('Only draft/closed campaign states are allowed during staging');
  const current=db.prepare('SELECT campaign_id,registration_status FROM opportunity_profiles WHERE campaign_id=?').get(id);
  if(!current)fail('Campaign not found');
  if(current.registration_status==='ready')fail('Do not change an approved live campaign from this draft-only control');
  db.exec('BEGIN IMMEDIATE');
  try {
   db.prepare('UPDATE opportunity_profiles SET registration_status=? WHERE campaign_id=?').run(status,id);
   // Preserve old referral links; enrollment is gated independently.
   db.prepare("INSERT INTO audit(action,ref) VALUES('opportunity.draft_status',?)").run(String(id)+':'+status);
   db.exec('COMMIT');
   return {campaignId:id,status,registrationOpen:false};
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function addOrganization(input){
  const name=short(input?.name),slug=slugValue(input?.code);
  if(!validSlug(slug)||name.length<3||name.length>120)fail('Invalid organizer name or code');
  const res=db.prepare("INSERT INTO opportunity_organizations(code,name,status) VALUES(?,?,'draft')").run(slug,name);
  return {id:Number(res.lastInsertRowid),code:slug,name,status:'draft'};
 }
 function add(input){
  const slug=slugValue(input?.slug),title=short(input?.title),date=short(input?.eventDate),org=Number(input?.organizationId),brand=short(input?.brandName),refPrefix=slugValue(input?.referralPrefix);
  if(!validSlug(slug)||title.length<3||title.length>180||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isSafeInteger(org)||org<1||brand.length>120||!/^[a-z][a-z0-9]{1,9}$/.test(refPrefix))fail('Invalid opportunity data');
  if(!db.prepare('SELECT id FROM opportunity_organizations WHERE id=?').get(org))fail('Organizer not found');
  db.exec('BEGIN IMMEDIATE');
  try{
    const r=db.prepare('INSERT INTO campaigns(slug,title,event_date,commission_cents,active) VALUES(?,?,?,0,0)').run(slug,title,date);
    const id=Number(r.lastInsertRowid);
    db.prepare("INSERT INTO opportunity_profiles(campaign_id,organization_id,brand_name) VALUES(?,?,?)").run(id,org,brand);
    const p=prefix();
    db.prepare('INSERT INTO referral_code_prefixes(campaign_id,prefix) VALUES(?,?)').run(id,p);
    db.prepare('INSERT INTO opportunity_referral_numbering(campaign_id,prefix,next_number) VALUES(?,?,1)').run(id,refPrefix);
    const ownerCode=refPrefix+'0';
    const personal=db.prepare("INSERT INTO ambassadors(campaign_id,name,code,status) VALUES(?,'Chadi Atwi',?,'approved')").run(id,ownerCode);
    db.prepare('INSERT INTO campaign_zero_ambassadors(campaign_id,ambassador_id,code,owner_name,owner_email,allocation_purpose) VALUES(?,?,?,?,?,?)').run(id,Number(personal.lastInsertRowid),ownerCode,'Chadi Atwi','chadiatwi@gmail.com','social-development-and-people-in-need');
    db.prepare("INSERT INTO audit(action,ref) VALUES('opportunity.created',?)").run(String(id));
    db.exec('COMMIT');
    return {id,slug,status:'draft',referralPrefix:refPrefix,ownerReferralCode:ownerCode};
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function setTerms(input){
  const id=Number(input?.campaignId),gross=Number(input?.grossCents),mode=String(input?.mode||''),value=Number(input?.value),reason=short(input?.reason);
  if(!Number.isSafeInteger(id)||id<1||!money(gross)||!money(value)||!['fixed','percent'].includes(mode)||(mode==='fixed'&&value>gross)||(mode==='percent'&&value>10000)||reason.length<8||reason.length>500)fail('Invalid audited commercial terms');
  const previous=db.prepare('SELECT * FROM opportunity_profiles WHERE campaign_id=?').get(id);
  if(!previous)fail('Opportunity not found');
  const fee=mode==='fixed'?value:Math.round(gross*value/10000);
  db.exec('BEGIN IMMEDIATE');
  try{
   const next=previous.terms_version+1;
   db.prepare('UPDATE opportunity_profiles SET gross_cents=?,a1_fee_mode=?,a1_fee_value=?,terms_version=? WHERE campaign_id=?').run(gross,mode,value,next,id);
   db.prepare('INSERT INTO opportunity_terms_audit(campaign_id,gross_cents,a1_fee_mode,a1_fee_value,a1_fee_cents,version,reason) VALUES(?,?,?,?,?,?,?)').run(id,gross,mode,value,fee,next,reason);
   db.prepare("INSERT INTO audit(action,ref) VALUES('opportunity.terms.changed',?)").run(String(id));
   db.exec('COMMIT');return {campaignId:id,grossCents:gross,a1FeeCents:fee,ambassadorCents:gross-fee,version:next};
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 function grantAmbassador(input,createInvite){
  const accountId=Number(input?.accountId),campaignId=Number(input?.campaignId);
  if(!Number.isSafeInteger(accountId)||accountId<1||!Number.isSafeInteger(campaignId)||campaignId<1||typeof createInvite!=='function')fail('Invalid membership');
  const account=db.prepare('SELECT id,name_en,email_verified_at,ambassador_id FROM ambassador_accounts WHERE id=?').get(accountId);
  const camp=db.prepare('SELECT campaign_id FROM opportunity_profiles WHERE campaign_id=?').get(campaignId);
  if(!account?.email_verified_at||!camp)fail('Verified account and opportunity are required');
  const old=db.prepare('SELECT ambassador_id FROM opportunity_ambassador_memberships WHERE account_id=? AND campaign_id=?').get(accountId,campaignId);
  if(old)return {duplicate:true,ambassadorId:old.ambassador_id};
  db.exec('SAVEPOINT grant_ambassador');
  try{
   const granted=createInvite({name:account.name_en,campaignId});
   db.prepare('INSERT INTO opportunity_ambassador_memberships(account_id,campaign_id,ambassador_id) VALUES(?,?,?)').run(accountId,campaignId,granted.id);
   db.prepare("INSERT INTO audit(action,ref) VALUES('opportunity.ambassador.granted',?)").run(String(granted.id));
   db.exec('RELEASE SAVEPOINT grant_ambassador');
   return {duplicate:false,ambassadorId:granted.id,inviteUrl:granted.inviteUrl};
  }catch(e){db.exec('ROLLBACK TO SAVEPOINT grant_ambassador');db.exec('RELEASE SAVEPOINT grant_ambassador');throw e}
 }
 return {list,organizations,report,legacyLtpAdminView,updateDraft,setDraftStatus,addOrganization,add,setTerms,grantAmbassador};
}


