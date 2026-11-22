import {createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const emailPattern=/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern=/^\+[1-9]\d{7,14}$/;
const isLatinName=v=>/^[\p{Script=Latin}\p{M}\s.'\-]{4,120}$/u.test(v)&&v.trim().split(/\s+/).length>=2;
const makeToken=()=>randomBytes(32).toString('base64url');
// Normalized identity keys are unique for the present single-company LinkTutor deployment.
// When multi-tenant company IDs are added, scope these unique indexes by company_id.
const identityName=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const identityEmail=v=>String(v||'').trim().normalize('NFKC').toLowerCase();
const identityPhone=v=>{const cleaned=String(v||'').replace(/[() .\-\s]/g,'');return /^\+?[1-9]\d{7,14}$/.test(cleaned)?'+'+cleaned.replace(/^\+/,''):cleaned;};
function httpError(message,status=400){const e=new Error(message);e.status=status;return e;}
export function createAmbassadorOnboarding(db,{issueAmbassador}){
 db.exec(`CREATE TABLE IF NOT EXISTS ambassador_accounts(
 id INTEGER PRIMARY KEY,
 campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
 ambassador_id INTEGER UNIQUE REFERENCES ambassadors(id),
 name_ar TEXT NOT NULL,
 name_en TEXT NOT NULL,
 email TEXT NOT NULL,
 country TEXT NOT NULL,
 phone TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 terms_version TEXT NOT NULL,
 email_verified_at TEXT,
 verification_hash TEXT UNIQUE,
 verification_expires_at INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(campaign_id,email)
 );
 CREATE TABLE IF NOT EXISTS ambassador_sessions(
 token_hash TEXT PRIMARY KEY,
 account_id INTEGER NOT NULL REFERENCES ambassador_accounts(id),
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE INDEX IF NOT EXISTS idx_ambassador_sessions_account ON ambassador_sessions(account_id);
 CREATE TABLE IF NOT EXISTS ambassador_password_resets (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES ambassador_accounts(id),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );
 CREATE INDEX IF NOT EXISTS idx_ambassador_password_resets_account ON ambassador_password_resets(account_id);
 `);
 // Data-preserving migration. Unique hashes prevent concurrent duplicate signups.
 const existingColumns=new Set(db.prepare('PRAGMA table_info(ambassador_accounts)').all().map(row=>row.name));
 for(const column of ['identity_name','identity_email','identity_phone'])if(!existingColumns.has(column))db.exec('ALTER TABLE ambassador_accounts ADD COLUMN '+column+' TEXT');
 const previous=db.prepare('SELECT id,name_en,email,phone FROM ambassador_accounts').all();
 db.exec('BEGIN IMMEDIATE');
 try{
  const backfill=db.prepare('UPDATE ambassador_accounts SET identity_name=?,identity_email=?,identity_phone=? WHERE id=?');
  for(const account of previous)backfill.run(digest(identityName(account.name_en)),digest(identityEmail(account.email)),digest(identityPhone(account.phone)),account.id);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_identity_name ON ambassador_accounts(identity_name); CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_identity_email ON ambassador_accounts(identity_email); CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_identity_phone ON ambassador_accounts(identity_phone);');
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw new Error('Ambassador identity migration requires review; possible previously duplicated accounts. '+String(error.message));}
 db.exec(`CREATE TABLE IF NOT EXISTS ambassador_email_changes (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES ambassador_accounts(id),
  proposed_email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 ); CREATE INDEX IF NOT EXISTS idx_ambassador_email_changes_account ON ambassador_email_changes(account_id);`);
 const publicCampaigns=()=>db.prepare("SELECT id,slug,title,event_date FROM campaigns WHERE active=1 ORDER BY event_date ASC").all();
 async function signup(input,{claimInvitation}={}){
   const fullName=String(input?.name||'').trim().replace(/\s+/g,' ');
   const email=String(input?.email||'').trim().toLowerCase();
   const country=String(input?.country||'').toUpperCase();
   const phone=identityPhone(input?.phone);
   const password=String(input?.password||'');
   const slug=String(input?.campaign||'').trim();
   if(!isLatinName(fullName))throw httpError('Please enter your full name in English (at least two words).');
   if(email.length>254||!emailPattern.test(email))throw httpError('Enter a valid email address.');
   if(!/^[A-Z]{2}$/.test(country))throw httpError('Select a valid country.');
   if(!phonePattern.test(phone))throw httpError('Enter the country code and WhatsApp number, with or without + (e.g. 961...).');
   if(password.length<12||password.length>128||!/\d/.test(password)||!/[a-zA-Z]/.test(password))throw httpError('Use at least 12 characters, including letters and a number.');
   if(input?.agree!==true||!(/^ltp-legal-v[1-9]\d*$/.test(String(input?.termsVersion||''))||input?.termsVersion==='2026-11-17-v1'))throw httpError('Please accept the program terms and privacy notice.');
   const campaign=db.prepare("SELECT id,slug FROM campaigns WHERE slug=? AND active=1").get(slug);
   if(!campaign)throw httpError('Registration is unavailable for this program.',404);
   const nameKey=digest(identityName(fullName)),emailKey=digest(identityEmail(email)),phoneKey=digest(identityPhone(phone));
   // Any one matching identity field blocks a second ambassador link.
   if(db.prepare('SELECT id FROM ambassador_accounts WHERE identity_name=? OR identity_email=? OR identity_phone=? LIMIT 1').get(nameKey,emailKey,phoneKey))
     throw httpError('An ambassador account may already exist. Sign in or contact the organizer.',409);
   const salt=randomBytes(16).toString('hex');
   const derived=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
   const activationToken=makeToken();
   const expire=Date.now()+24*60*60*1000;
   let result;
   db.exec('SAVEPOINT ambassador_signup');
   try{
    if(claimInvitation)claimInvitation({email,campaign:slug});
    result=db.prepare('INSERT INTO ambassador_accounts(campaign_id,name_ar,name_en,email,country,phone,password_salt,password_hash,terms_version,verification_hash,verification_expires_at,identity_name,identity_email,identity_phone) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(campaign.id,'',fullName,email,country,phone,salt,derived.toString('hex'),input.termsVersion,digest(activationToken),expire,nameKey,emailKey,phoneKey);
    db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.application_created',?)").run(String(result.lastInsertRowid));
    db.exec('RELEASE SAVEPOINT ambassador_signup');
   }catch(error){
    db.exec('ROLLBACK TO SAVEPOINT ambassador_signup');
    db.exec('RELEASE SAVEPOINT ambassador_signup');
    if(String(error.message).includes('UNIQUE'))throw httpError('An ambassador account may already exist. Sign in or contact the organizer.',409);
    throw error;
   }
   return {accepted:true,activationToken,email}; // token MUST be delivered only in private approved channel
 }
 function activate(token){
   if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{43}$/.test(token))throw httpError('Invalid activation link.');
   const record=db.prepare('SELECT * FROM ambassador_accounts WHERE verification_hash=?').get(digest(token));
   if(!record||record.email_verified_at||Number(record.verification_expires_at)<Date.now())throw httpError('Activation link is invalid or expired.',410);
   db.exec('BEGIN IMMEDIATE');
   try{
     const inviter=issueAmbassador({name:record.name_en,campaignId:record.campaign_id});
     db.prepare("UPDATE ambassador_accounts SET email_verified_at=CURRENT_TIMESTAMP,ambassador_id=?,verification_hash=NULL,verification_expires_at=NULL WHERE id=?").run(inviter.id,record.id);
     db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.email_verified',?)").run(String(record.id));
     db.exec('COMMIT');
     return {activated:true,inviteUrl:inviter.inviteUrl};
   }catch(e){db.exec('ROLLBACK');throw e;}
 }
 async function attachExistingAmbassador({code,email},sendInvitation,baseUrl){
   const normalizedEmail=identityEmail(email),refCode=String(code||'').trim();
   if(!emailPattern.test(normalizedEmail)||normalizedEmail.length>254||!refCode||refCode.length>50)throw httpError('Valid ambassador code and email required.');
   if(typeof sendInvitation!=='function'||!/^https:\/\//.test(String(baseUrl||'')))throw httpError('Verified invitation email service is required.',503);
   const ambassador=db.prepare("SELECT id,campaign_id,name,status FROM ambassadors WHERE code=?").get(refCode);
   if(!ambassador||ambassador.status!=='approved')throw httpError('Approved ambassador was not found.',404);
   const existing=db.prepare('SELECT * FROM ambassador_accounts WHERE ambassador_id=?').get(ambassador.id);
   if(existing&&(existing.email!==normalizedEmail||existing.email_verified_at))throw httpError('Existing ambassador account needs a separate ownership review.',409);
   const emailKey=digest(normalizedEmail),nameKey=digest(identityName(ambassador.name));
   if(db.prepare('SELECT id FROM ambassador_accounts WHERE (identity_email=? OR identity_name=?) AND ambassador_id IS NOT ? LIMIT 1').get(emailKey,nameKey,ambassador.id))throw httpError('Account identity already assigned to another ambassador.',409);
   const rawToken=makeToken(),hash=digest(rawToken),expiry=Date.now()+24*60*60*1000;
   db.exec('BEGIN IMMEDIATE');
   try{
    let accountId=existing?.id;
    if(!existing){
      const salt=randomBytes(16).toString('hex');
      const unknownSecret=makeToken()+makeToken();
      const derived=await scrypt(unknownSecret,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
      const inserted=db.prepare('INSERT INTO ambassador_accounts(campaign_id,ambassador_id,name_ar,name_en,email,country,phone,password_salt,password_hash,terms_version,identity_name,identity_email,identity_phone) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
       .run(ambassador.campaign_id,ambassador.id,'',ambassador.name,normalizedEmail,'LB','',salt,derived.toString('hex'),'owner-linked-invitation',nameKey,emailKey,null);
      accountId=Number(inserted.lastInsertRowid);
    }
    db.prepare('DELETE FROM ambassador_password_resets WHERE account_id=?').run(accountId);
    db.prepare('INSERT INTO ambassador_password_resets(token_hash,account_id,expires_at) VALUES(?,?,?)').run(hash,accountId,expiry);
    db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.existing_login_invited',?)").run(String(accountId));
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error}
   await sendInvitation(normalizedEmail,String(baseUrl).replace(/\/$/,'')+'/ambassador/reset?token='+encodeURIComponent(rawToken));
   return {linked:true,inviteSent:true,email:normalizedEmail,code:refCode,expiresAt:new Date(expiry).toISOString(),emailVerified:false};
 }
 async function login({email,password,campaign}){
   const normalized=String(email||'').trim().toLowerCase();
   // Returning ambassadors may sign in even when registration to their campaign is closed.
   // A single email must resolve to exactly one approved verified account; never cross-select campaigns.
   const matches=campaign
     ? db.prepare('SELECT a.*,i.status FROM ambassador_accounts a JOIN campaigns c ON c.id=a.campaign_id LEFT JOIN ambassadors i ON i.id=a.ambassador_id WHERE a.email=? AND c.slug=?').all(normalized,String(campaign))
     : db.prepare('SELECT a.*,i.status FROM ambassador_accounts a JOIN campaigns c ON c.id=a.campaign_id LEFT JOIN ambassadors i ON i.id=a.ambassador_id WHERE a.email=?').all(normalized);
   const record=matches.length===1?matches[0]:null;
   if(!record||!record.email_verified_at||record.status!=='approved')throw httpError('Email, password or account status is invalid.',401);
   const calculated=await scrypt(String(password||''),record.password_salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
   if(!timingSafeEqual(calculated,Buffer.from(record.password_hash,'hex')))throw httpError('Email, password or account status is invalid.',401);
   const token=makeToken();const expires=Date.now()+8*60*60*1000;
   db.prepare('INSERT INTO ambassador_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').run(digest(token),record.id,expires);
   return {token,expires};
 }
 function session(token){
   if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{43}$/.test(token))return null;
   return db.prepare("SELECT a.id,a.ambassador_id,a.name_en,a.email,a.country,a.phone,a.campaign_id FROM ambassador_sessions s JOIN ambassador_accounts a ON s.account_id=a.id JOIN ambassadors i ON i.id=a.ambassador_id WHERE s.token_hash=? AND s.expires_at>? AND i.status='approved' AND a.email_verified_at IS NOT NULL").get(digest(token),Date.now())||null;
 }
 function editPhone(sessionToken,phoneInput){
  const current=session(sessionToken);
  if(!current)throw httpError('Sign-in required.',401);
  const phone=identityPhone(phoneInput);
  if(!phonePattern.test(phone))throw httpError('Enter WhatsApp with country code, with or without + (961...).');
  const phoneHash=digest(phone);
  db.exec('BEGIN IMMEDIATE');
  try{
    if(db.prepare('SELECT id FROM ambassador_accounts WHERE identity_phone=? AND id<>?').get(phoneHash,current.id))
      throw httpError('This WhatsApp number is already associated with an account.',409);
    db.prepare('UPDATE ambassador_accounts SET phone=?,identity_phone=? WHERE id=?').run(phone,phoneHash,current.id);
    db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.phone_updated',?)").run(String(current.id));
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');if(String(e.message).includes('UNIQUE'))throw httpError('This WhatsApp number is already associated with an account.',409);throw e}
  return {updated:true,phone};
 }
 async function requestEmailChange(sessionToken,newEmailInput,password,sendLink,baseUrl){
  const current=session(sessionToken);
  if(!current)throw httpError('Sign-in required.',401);
  const proposed=identityEmail(newEmailInput);
  if(proposed.length>254||!emailPattern.test(proposed))throw httpError('Enter a valid email address.');
  if(proposed===current.email)throw httpError('This email is already assigned to your account.');
  if(typeof sendLink!=='function')throw httpError('Verified email delivery is required.',503);
  const account=db.prepare('SELECT password_salt,password_hash FROM ambassador_accounts WHERE id=?').get(current.id);
  const derived=await scrypt(String(password||''),account.password_salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
  if(!timingSafeEqual(derived,Buffer.from(account.password_hash,'hex')))throw httpError('Account password was not accepted.',403);
  const key=digest(proposed);
  if(db.prepare('SELECT id FROM ambassador_accounts WHERE identity_email=? AND id<>?').get(key,current.id))throw httpError('Email address is already registered.',409);
  const raw=makeToken(),hash=digest(raw);
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('DELETE FROM ambassador_email_changes WHERE account_id=?').run(current.id);
   db.prepare('INSERT INTO ambassador_email_changes(token_hash,account_id,proposed_email,expires_at) VALUES(?,?,?,?)').run(hash,current.id,proposed,Date.now()+24*60*60*1000);
   db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.email_change_requested',?)").run(String(current.id));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  try{await sendLink(proposed,baseUrl+'/ambassador?email-change='+encodeURIComponent(raw))}
  catch(e){db.prepare('DELETE FROM ambassador_email_changes WHERE token_hash=?').run(hash);throw e}
  return {pending:true};
 }
 function confirmEmailChange(token){
  if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))throw httpError('Invalid email confirmation link.',410);
  db.exec('BEGIN IMMEDIATE');
  try{
   const request=db.prepare('SELECT * FROM ambassador_email_changes WHERE token_hash=? AND expires_at>=?').get(digest(token),Date.now());
   if(!request)throw httpError('Email confirmation link has expired.',410);
   const key=digest(identityEmail(request.proposed_email));
   if(db.prepare('SELECT id FROM ambassador_accounts WHERE identity_email=? AND id<>?').get(key,request.account_id))throw httpError('Email is already linked to another ambassador.',409);
   db.prepare('UPDATE ambassador_accounts SET email=?,identity_email=?,email_verified_at=CURRENT_TIMESTAMP WHERE id=?').run(request.proposed_email,key,request.account_id);
   db.prepare('DELETE FROM ambassador_email_changes WHERE account_id=?').run(request.account_id);
   db.prepare('DELETE FROM ambassador_sessions WHERE account_id=?').run(request.account_id);
   db.prepare('DELETE FROM ambassador_password_resets WHERE account_id=?').run(request.account_id);
   db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.email_change_confirmed',?)").run(String(request.account_id));
   db.exec('COMMIT');
   return {confirmed:true,sessionsRevoked:true};
  }catch(e){db.exec('ROLLBACK');if(String(e.message).includes('UNIQUE'))throw httpError('Email is already linked to another ambassador.',409);throw e}
 }
 function logout(token){if(token)db.prepare('DELETE FROM ambassador_sessions WHERE token_hash=?').run(digest(token));}
 async function requestPasswordRecovery(emailInput,sendLink,baseUrl){
  const email=identityEmail(emailInput);
  if(!emailPattern.test(email)||email.length>254)return {accepted:true};
  const record=db.prepare('SELECT id,email FROM ambassador_accounts WHERE identity_email=? AND email_verified_at IS NOT NULL').get(digest(email));
  if(!record)return {accepted:true}; // Never expose whether an account exists.
  const rawToken=makeToken(),hash=digest(rawToken);
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('DELETE FROM ambassador_password_resets WHERE account_id=?').run(record.id);
   db.prepare('INSERT INTO ambassador_password_resets(token_hash,account_id,expires_at) VALUES(?,?,?)').run(hash,record.id,Date.now()+15*60*1000);
   db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.password_recovery_requested',?)").run(String(record.id));
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error}
  await sendLink(record.email,baseUrl+'/ambassador/reset?token='+encodeURIComponent(rawToken));
  return {accepted:true};
 }
 async function completePasswordRecovery({token,newPassword}={}){
  if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))throw httpError('Invalid or expired recovery link.',410);
  const password=String(newPassword||'');
  if(password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw httpError('Use 12–128 characters including letters and a number.');
  const reset=db.prepare('SELECT account_id,expires_at FROM ambassador_password_resets WHERE token_hash=?').get(digest(token));
  if(!reset||reset.expires_at<Date.now())throw httpError('Invalid or expired recovery link.',410);
  const salt=randomBytes(16).toString('hex');
  const derived=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
  db.exec('BEGIN IMMEDIATE');
  try{
   const claimed=db.prepare('DELETE FROM ambassador_password_resets WHERE token_hash=? AND expires_at>=? RETURNING account_id').get(digest(token),Date.now());
   if(!claimed)throw httpError('Invalid or expired recovery link.',410);
   db.prepare('UPDATE ambassador_accounts SET password_salt=?,password_hash=?,email_verified_at=COALESCE(email_verified_at,CURRENT_TIMESTAMP) WHERE id=?').run(salt,derived.toString('hex'),claimed.account_id);
   db.prepare('DELETE FROM ambassador_password_resets WHERE account_id=?').run(claimed.account_id);
   db.prepare('DELETE FROM ambassador_sessions WHERE account_id=?').run(claimed.account_id);
   db.prepare("INSERT INTO audit(action,ref) VALUES('ambassador.password_reset_completed',?)").run(String(claimed.account_id));
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error}
  return {updated:true,sessionsRevoked:true};
 }
 function listApplications(){
   return db.prepare("SELECT a.id,a.name_en,a.email,a.country,a.phone,a.created_at,a.email_verified_at,a.ambassador_id,a.campaign_id,c.slug AS campaign,i.status AS ambassador_status,i.code AS referral_code FROM ambassador_accounts a JOIN campaigns c ON c.id=a.campaign_id LEFT JOIN ambassadors i ON i.id=a.ambassador_id ORDER BY a.id DESC LIMIT 300").all();
 }
 return {publicCampaigns,signup,activate,attachExistingAmbassador,login,session,logout,listApplications,requestPasswordRecovery,completePasswordRecovery,editPhone,requestEmailChange,confirmEmailChange};
}
