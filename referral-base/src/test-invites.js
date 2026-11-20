import {randomBytes,createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const validEmail=v=>/^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/.test(v)&&v.length<=254;
const validToken=v=>typeof v==='string'&&/^[-_A-Za-z0-9]{43}$/.test(v);
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const normalizeEmail=v=>String(v||'').trim().toLowerCase();
/** Owner-only invitation to test ambassador signup without opening public signup.
 * Requires Cloudflare Turnstile, verified SMTP and published organizer terms.
 */
export function createAmbassadorTestInvites(db,{now=Date.now}={}){
 db.exec("CREATE TABLE IF NOT EXISTS ambassador_test_invites(id INTEGER PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,campaign_id INTEGER NOT NULL REFERENCES campaigns(id),email TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_amb_test_invites_email ON ambassador_test_invites(email,campaign_id);");
 const audit=db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)');
 function create({email,campaign='linktutor-2026-11-28'}={}){
  const target=normalizeEmail(email);
  if(!validEmail(target))throw invalid('Enter a valid invited ambassador email.');
  const record=db.prepare('SELECT id FROM campaigns WHERE slug=? AND active=1').get(campaign);
  if(!record)throw invalid('Campaign is unavailable.',404);
  if(db.prepare('SELECT id FROM ambassador_accounts WHERE identity_email=?').get(digest(target)))throw invalid('An ambassador account already exists for this email.',409);
  const token=randomBytes(32).toString('base64url');
  const expiresAt=now()+60*60*1000;
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('DELETE FROM ambassador_test_invites WHERE email=? AND campaign_id=? AND used_at IS NULL').run(target,record.id);
   const result=db.prepare('INSERT INTO ambassador_test_invites(token_hash,campaign_id,email,expires_at) VALUES(?,?,?,?)').run(digest(token),record.id,target,expiresAt);
   audit.run('ambassador.test_invite_created',String(result.lastInsertRowid));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return {token,email:target,campaign,expiresAt:new Date(expiresAt).toISOString()};
 }
 function inspect(token){
  if(!validToken(token))return null;
  const row=db.prepare("SELECT i.email,c.slug AS campaign,i.expires_at AS expiresAt FROM ambassador_test_invites i JOIN campaigns c ON c.id=i.campaign_id WHERE i.token_hash=? AND i.used_at IS NULL AND i.expires_at>? AND c.active=1").get(digest(token),now());
  return row||null;
 }
 /** Called inside onboarding.signup's SAVEPOINT. */
 function claim(token,{email,campaign}={}){
  const normalized=normalizeEmail(email);
  if(!validToken(token)||!validEmail(normalized))throw invalid('Invitation expired or invalid.',403);
  const row=db.prepare("UPDATE ambassador_test_invites SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND used_at IS NULL AND expires_at>? AND email=? AND campaign_id=(SELECT id FROM campaigns WHERE slug=? AND active=1) RETURNING id").get(digest(token),now(),normalized,String(campaign||''));
  if(!row)throw invalid('Invitation expired, already used or assigned to another email.',403);
  audit.run('ambassador.test_invite_consumed',String(row.id));
  return true;
 }
 return {create,inspect,claim};
}
