import {createHash,randomBytes} from 'node:crypto';
const digest=v=>createHash('sha256').update(String(v)).digest('hex');
const phonePattern=/^\+[1-9]\d{7,14}$/;
const maskPhone=v=>v.slice(0,4)+'•••'+v.slice(-3);
export function createParticipantFlow(db,issueJoinTicket=null,issueRedirectLink=null){
 db.exec(`CREATE TABLE IF NOT EXISTS referral_code_prefixes (campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),prefix TEXT NOT NULL UNIQUE CHECK(length(prefix)=3 AND prefix GLOB '[A-Z][A-Z][A-Z]'));
 CREATE TABLE IF NOT EXISTS referral_code_counters (campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),last_issued INTEGER NOT NULL DEFAULT -1 CHECK(last_issued>=-1));
 CREATE TABLE IF NOT EXISTS participants (
 id INTEGER PRIMARY KEY,
 campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
 ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id),
 name TEXT NOT NULL,
 phone TEXT NOT NULL,
 phone_hash TEXT NOT NULL,
 consent INTEGER NOT NULL CHECK(consent=1),
 status TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','joined','attended','enrolled')),
 registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(campaign_id,phone_hash)
 );
 CREATE INDEX IF NOT EXISTS idx_participants_ambassador ON participants(ambassador_id);
 CREATE TABLE IF NOT EXISTS referral_link_visits (
   id INTEGER PRIMARY KEY,
   ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id),
   visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE INDEX IF NOT EXISTS idx_referral_link_visits_ambassador ON referral_link_visits(ambassador_id);`);
 // Configure campaign prefixes once. Never rewrite previously issued referral URLs.
 db.prepare("INSERT OR IGNORE INTO referral_code_prefixes(campaign_id,prefix) SELECT id,'LTP' FROM campaigns WHERE slug='linktutor-2026-11-28'").run();
 const participantColumns=db.prepare('PRAGMA table_info(participants)').all().map(x=>x.name);
 if(!participantColumns.includes('display_code'))db.exec('ALTER TABLE participants ADD COLUMN display_code TEXT');
 if(!participantColumns.includes('real_name'))db.exec('ALTER TABLE participants ADD COLUMN real_name TEXT');
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_display_code ON participants(campaign_id,display_code) WHERE display_code IS NOT NULL');
 // Backfill in historical registration order, without changing original referral attribution.
 const historical=db.prepare('SELECT p.id,p.campaign_id,a.code FROM participants p JOIN ambassadors a ON a.id=p.ambassador_id WHERE p.display_code IS NULL ORDER BY p.id').all();
 for(const r of historical){
   const n=db.prepare('SELECT COUNT(*) AS n FROM participants WHERE campaign_id=? AND ambassador_id=(SELECT id FROM ambassadors WHERE code=?) AND id<=?').get(r.campaign_id,r.code,r.id).n;
   db.prepare('UPDATE participants SET display_code=? WHERE id=? AND display_code IS NULL').run('Amb_'+r.code+'_'+String(n).padStart(3,'0'),r.id);
 }
 if(!participantColumns.includes('join_clicked_at'))db.exec('ALTER TABLE participants ADD COLUMN join_clicked_at TEXT');
 if(!participantColumns.includes('joined_at'))db.exec('ALTER TABLE participants ADD COLUMN joined_at TEXT');
 if(!participantColumns.includes('attended_at'))db.exec('ALTER TABLE participants ADD COLUMN attended_at TEXT');
 // Reconstruct confirmed milestones from their own organizer audit records.
 // A paid enrollment is NEVER evidence of joining a group or attending a session.
 db.exec(`UPDATE participants SET joined_at=COALESCE(
   (SELECT MIN(recorded_at) FROM audit WHERE action='participant.joined' AND ref=CAST(participants.id AS TEXT)),
   CASE WHEN status='joined' THEN registered_at END
 ) WHERE joined_at IS NULL AND (status='joined' OR EXISTS (
   SELECT 1 FROM audit WHERE action='participant.joined' AND ref=CAST(participants.id AS TEXT)
 ));
 UPDATE participants SET attended_at=COALESCE(
   (SELECT MIN(recorded_at) FROM audit WHERE action='participant.attended' AND ref=CAST(participants.id AS TEXT)),
   CASE WHEN status='attended' THEN registered_at END
 ) WHERE attended_at IS NULL AND (status='attended' OR EXISTS (
   SELECT 1 FROM audit WHERE action='participant.attended' AND ref=CAST(participants.id AS TEXT)
 ));`);
 const columns=db.prepare('PRAGMA table_info(ambassadors)').all().map(x=>x.name);
 if(!columns.includes('access_hash'))db.exec('ALTER TABLE ambassadors ADD COLUMN access_hash TEXT');
 // Every opportunity reserves NNN0 for the owner's personal ambassador identity.
 // Beneficiary allocation is intended; financial disbursement requires separate evidence.
 db.exec(`CREATE TABLE IF NOT EXISTS opportunity_referral_numbering(campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),prefix TEXT NOT NULL UNIQUE,next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>=1));`);
 db.exec(`CREATE TABLE IF NOT EXISTS campaign_zero_ambassadors(
 campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),
 ambassador_id INTEGER NOT NULL UNIQUE REFERENCES ambassadors(id),
 code TEXT NOT NULL UNIQUE,
 owner_name TEXT NOT NULL,
 owner_email TEXT NOT NULL,
 allocation_purpose TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
 );`);
 function ensureCampaignZeroAmbassador(campaignSlug,code){
   if(!/^[a-z][a-z0-9]{1,19}0$/.test(code))throw Error('Invalid zero code');
   const c=db.prepare('SELECT id FROM campaigns WHERE slug=?').get(campaignSlug);
   if(!c)throw Error('Campaign not found');
   db.prepare('INSERT OR IGNORE INTO opportunity_referral_numbering(campaign_id,prefix,next_number) VALUES(?,?,1)').run(c.id,code.slice(0,-1));
   const old=db.prepare('SELECT ambassador_id,code FROM campaign_zero_ambassadors WHERE campaign_id=?').get(c.id);
   if(old){
     if(old.code!==code)throw Error('Zero code immutable');
     return {code,ambassadorId:old.ambassador_id,inviteUrl:'/r/'+code,duplicate:true};
   }
   const oldSource=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='official_campaign_referrals'").get()
       ? db.prepare('SELECT ambassador_id,code FROM official_campaign_referrals WHERE campaign_id=?').get(c.id) : null;
   const ownerName='Chadi Atwi',ownerEmail='chadiatwi@gmail.com';
   db.exec('BEGIN IMMEDIATE');
   try {
     let id;
     if(oldSource){
       id=oldSource.ambassador_id;
       const usage=db.prepare('SELECT (SELECT COUNT(*) FROM participants WHERE ambassador_id=?) AS registrants,(SELECT COUNT(*) FROM referral_link_visits WHERE ambassador_id=?) AS clicks').get(id,id);
       if(oldSource.code!==code && (usage.registrants||usage.clicks))throw Error('Legacy code has attribution; manual migration required');
       if(db.prepare('SELECT id FROM ambassadors WHERE code=? AND id<>?').get(code,id))throw Error('Code already claimed');
       db.prepare('UPDATE ambassadors SET code=?,name=? WHERE id=?').run(code,ownerName,id);
       db.prepare('DELETE FROM official_campaign_referrals WHERE campaign_id=?').run(c.id);
     }else{
       const taken=db.prepare('SELECT id FROM ambassadors WHERE code=?').get(code);
       if(taken)throw Error('Code already claimed');
       id=Number(db.prepare("INSERT INTO ambassadors(campaign_id,name,code,status) VALUES(?,?,?,'approved')").run(c.id,ownerName,code).lastInsertRowid);
     }
     db.prepare('INSERT INTO campaign_zero_ambassadors(campaign_id,ambassador_id,code,owner_name,owner_email,allocation_purpose) VALUES(?,?,?,?,?,?)').run(c.id,id,code,ownerName,ownerEmail,'social-development-and-people-in-need');
     db.prepare("INSERT INTO audit(action,ref) VALUES('campaign.zero.assigned',?)").run(String(c.id));
     db.exec('COMMIT');
     return {code,ambassadorId:id,inviteUrl:'/r/'+code,duplicate:false};
   }catch(e){db.exec('ROLLBACK');throw e}
 }
 const getAmbassador=code=>db.prepare("SELECT a.id,a.name,a.campaign_id FROM ambassadors a JOIN campaigns c ON a.campaign_id=c.id WHERE a.code=? AND a.status='approved' AND c.active=1").get(code);
 // A link visit is not a registration, a unique person, or a paid subscription.
 function activeReferral(code){return Boolean(getAmbassador(String(code||'')));}
 function recordVisit(code){
   const ambassador=getAmbassador(String(code||''));
   if(!ambassador)return false;
   db.prepare('INSERT INTO referral_link_visits(ambassador_id) VALUES(?)').run(ambassador.id);
   return true;
 }
 function register(input){
   if(!input || input.consent!==true)throw Error('Consent required');
   const name=String(input.name||'').trim().replace(/\s+/g,' ')||'WhatsApp participant';
   const supplied=String(input.phone||'').replace(/[\s().-]/g,'');
   const phone=supplied.startsWith('+')?supplied:(supplied.startsWith('00')?'+'+supplied.slice(2):'+'+supplied);
   if(name.length<2||name.length>120||!phonePattern.test(phone))throw Error('Enter a valid WhatsApp number');
   const ambassador=getAmbassador(String(input.code||''));
   if(!ambassador)throw Error('Invalid invitation');
   const phoneHash=digest(phone);
   const result=db.prepare('INSERT OR IGNORE INTO participants(campaign_id,ambassador_id,name,phone,phone_hash,consent) VALUES(?,?,?,?,?,1)')
     .run(ambassador.campaign_id,ambassador.id,name,phone,phoneHash);
   if(result.changes){const id=Number(result.lastInsertRowid);const n=db.prepare('SELECT COUNT(*) AS n FROM participants WHERE campaign_id=? AND ambassador_id=? AND id<=?').get(ambassador.campaign_id,ambassador.id,id).n;db.prepare('UPDATE participants SET display_code=? WHERE id=?').run('Amb_'+String(input.code)+'_'+String(n).padStart(3,'0'),id);}
   if(result.changes)db.prepare("INSERT INTO audit(action,ref) VALUES('participant.registered',?)").run(String(result.lastInsertRowid));
   if(issueJoinTicket||issueRedirectLink){
     const row=db.prepare('SELECT id,name,ambassador_id FROM participants WHERE campaign_id=? AND phone_hash=?').get(ambassador.campaign_id,phoneHash);
     if(row)return {received:true,duplicate:!result.changes,joinTicket:issueJoinTicket?issueJoinTicket(row.id):undefined,redirectPath:issueRedirectLink?issueRedirectLink(row.id):undefined};
   }
   return {received:true}; // no exposure of another ambassador's existing lead
 }
 function issueAmbassador(input){
   const name=String(input?.name||'').trim();
   if(name.length<2||name.length>120)throw Error('Valid ambassador name required');
   const token=randomBytes(32).toString('base64url');
   const campaignId=Number(input.campaignId||1);
   const oppsMode=process.env.A1_OPPS_DIRECT_REFERRAL==='1';
   const settings=oppsMode?db.prepare('SELECT prefix,next_number FROM opportunity_referral_numbering WHERE campaign_id=?').get(campaignId):null;
   const prefix=settings?.prefix||db.prepare('SELECT prefix FROM referral_code_prefixes WHERE campaign_id=?').get(campaignId)?.prefix;
   if(!prefix)throw Error('Campaign referral prefix is not configured');
   db.prepare('INSERT OR IGNORE INTO referral_code_counters(campaign_id,last_issued) VALUES(?,-1)').run(campaignId);
   let code;
   if(settings){
     let code;
     for(let n=0;n<100000;n++){
       const next=db.prepare('UPDATE opportunity_referral_numbering SET next_number=next_number+1 WHERE campaign_id=? RETURNING next_number-1 AS number').get(campaignId);
       const candidate=prefix+String(next.number);
       if(!db.prepare('SELECT 1 FROM ambassadors WHERE code=?').get(candidate)){code=candidate;break}
     }
     if(!code)throw Error('Unable to allocate campaign referral code');
     const row=db.prepare("INSERT INTO ambassadors(campaign_id,name,code,status,access_hash) VALUES(?,?,?,'approved',?)").run(campaignId,name,code,digest(token));
     db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.created',?)").run(String(row.lastInsertRowid));
     return {id:Number(row.lastInsertRowid),name,inviteUrl:'/r/'+code,accessToken:token};
   }
   // Monotonic database-backed counter. Skip any older matching codes without changing them.
   for(let n=0;n<100000;n++){
     const next=db.prepare('UPDATE referral_code_counters SET last_issued=last_issued+1 WHERE campaign_id=? RETURNING last_issued AS number').get(campaignId);
     if(!next||!Number.isSafeInteger(next.number))throw Error('Referral number allocation failed');
     const candidate=prefix+String(next.number).padStart(4,'0');
     if(!db.prepare('SELECT 1 FROM ambassadors WHERE code=?').get(candidate)){code=candidate;break}
   }
   if(!code)throw Error('Unable to allocate a unique referral code');
   const row=db.prepare("INSERT INTO ambassadors(campaign_id,name,code,status,access_hash) VALUES(?,?,?,'approved',?)").run(campaignId,name,code,digest(token));
   db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.created',?)").run(String(row.lastInsertRowid));
   return {id:Number(row.lastInsertRowid),name,inviteUrl:'/r/'+code,accessToken:token};
 }
 function adminAmbassadors(){
   return db.prepare('SELECT a.id,a.name,a.code,a.status,COUNT(p.id) AS registered FROM ambassadors a LEFT JOIN participants p ON p.ambassador_id=a.id GROUP BY a.id ORDER BY a.id DESC').all();
 }
 function setAmbassadorStatus(input){
   const id=Number(input?.id),status=String(input?.status||'');
   if(!Number.isSafeInteger(id)||id<1||!['approved','pending','suspended'].includes(status))throw Error('Invalid ambassador status');
   const row=db.prepare('SELECT id,status FROM ambassadors WHERE id=?').get(id);
   if(!row)throw Error('Ambassador not found');
   if(row.status===status)return {updated:false};
   db.prepare('UPDATE ambassadors SET status=? WHERE id=?').run(status,id);
   db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)').run('ambassador.'+status,id);
   return {updated:true};
 }
 function ambassadorByToken(token){
   if(!token||String(token).length<30||String(token).length>128)return null;
   return db.prepare("SELECT id,name,code,campaign_id FROM ambassadors WHERE access_hash=? AND status='approved'").get(digest(token))||null;
 }
 function ownOverviewById(id){
   const amb=db.prepare("SELECT id,name,code FROM ambassadors WHERE id=? AND status='approved'").get(id);
   if(!amb)return null;
   const participants=db.prepare('SELECT id,name,registered_at,status,CASE WHEN join_clicked_at IS NOT NULL THEN 1 ELSE 0 END AS clickedWhatsApp,CASE WHEN joined_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedJoin,CASE WHEN attended_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedAttendance FROM participants WHERE ambassador_id=? ORDER BY id DESC LIMIT 100').all(amb.id);
   return {name:amb.name,inviteUrl:'/r/'+amb.code,linkVisits:db.prepare('SELECT COUNT(*) AS n FROM referral_link_visits WHERE ambassador_id=?').get(amb.id).n,count:db.prepare('SELECT COUNT(*) AS n FROM participants WHERE ambassador_id=?').get(amb.id).n,participants};
 }
 function ownOverview(token){const amb=ambassadorByToken(token);return amb?ownOverviewById(amb.id):null;}
 function ownerOverview(){
   return db.prepare('SELECT p.id,p.name,p.real_name,p.display_code,p.phone,p.status,p.registered_at,a.code AS ambassador_code,CASE WHEN p.join_clicked_at IS NOT NULL THEN 1 ELSE 0 END AS clickedWhatsApp,CASE WHEN p.joined_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedJoin,CASE WHEN p.attended_at IS NOT NULL THEN 1 ELSE 0 END AS confirmedAttendance,a.name AS ambassador FROM participants p JOIN ambassadors a ON a.id=p.ambassador_id ORDER BY p.id DESC LIMIT 200').all();
 }
 function updateStatus(id,status){
   if(status==='enrolled')throw Error('Paid enrollment requires verified payment');
   if(!['joined','attended'].includes(status))throw Error('Invalid status');
   const row=db.prepare('SELECT id,status,joined_at,attended_at FROM participants WHERE id=?').get(id);
   if(!row)throw Error('Participant not found');
   const column=status==='joined'?'joined_at':'attended_at'; // strictly whitelisted
   if(row[column])return {updated:false};
   db.exec('BEGIN IMMEDIATE');
   try{
     const newStatus=row.status==='enrolled'?'enrolled':status==='attended'?'attended':row.status==='attended'?'attended':'joined';
     db.prepare('UPDATE participants SET '+column+'=CURRENT_TIMESTAMP,status=? WHERE id=?').run(newStatus,id);
     db.prepare("INSERT INTO audit(action,ref) VALUES(?,?)").run('participant.'+status,String(id));
     db.exec('COMMIT');
     return {updated:true};
   }catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {register,recordVisit,activeReferral,issueAmbassador,ensureCampaignZeroAmbassador,adminAmbassadors,setAmbassadorStatus,ambassadorByToken,ownOverview,ownOverviewById,ownerOverview,updateStatus,maskPhone};
}
