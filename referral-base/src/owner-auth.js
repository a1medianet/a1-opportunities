import {createHash,createHmac,createCipheriv,createDecipheriv,randomBytes,scrypt as callback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(callback);
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const fail=(message='Invalid credentials or verification code.',status=401)=>Object.assign(new Error(message),{status});
const equal=(a,b)=>{
 const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));
 return x.length===y.length&&timingSafeEqual(x,y);
};
const validToken=value=>typeof value==='string'&&/^[-_A-Za-z0-9]{43}$/.test(value);
const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128&&/[a-z]/i.test(value)&&/[0-9]/.test(value);
const base32=buffer=>{
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,number=0,output='';
 for(const byte of buffer){number=(number<<8)|byte;bits+=8;while(bits>=5){output+=abc[(number>>>(bits-5))&31];bits-=5}}
 if(bits)output+=abc[(number<<(5-bits))&31];
 return output;
};
const fromBase32=value=>{
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,num=0;const bytes=[];
 for(const chr of value.replace(/=+$/,'').toUpperCase()){const pos=abc.indexOf(chr);if(pos<0)throw fail();num=(num<<5)|pos;bits+=5;if(bits>=8){bytes.push((num>>>(bits-8))&255);bits-=8}}
 return Buffer.from(bytes);
};
export const totpAt=(secret,time=Date.now())=>{
 const ctr=Math.floor(time/30000),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(ctr));
 const mac=createHmac('sha1',fromBase32(secret)).update(counter).digest();
 const offset=mac[19]&15;const number=(mac.readUInt32BE(offset)&0x7fffffff)%1000000;
 return String(number).padStart(6,'0');
};
const totpWindow=(secret,code,last=-1,at=Date.now())=>{
 if(!/^[0-9]{6}$/.test(String(code||'')))return -1;
 const step=Math.floor(at/30000);
 for(const i of [-1,0,1])if(step+i>last&&equal(totpAt(secret,(step+i)*30000),code))return step+i;
 return -1;
};
export function createOwnerAuth(db,env=process.env,options={}){
 const email=String(env.A1_REFERRAL_ADMIN_EMAIL||'').trim().toLowerCase();
 const salt=String(env.A1_REFERRAL_ADMIN_PASSWORD_SALT||'');
 const passwordHash=String(env.A1_REFERRAL_ADMIN_PASSWORD_HASH||'');
 const csrfSecret=String(env.A1_REFERRAL_ADMIN_CSRF_SECRET||'');
 const encryptionKey=String(env.A1_REFERRAL_OWNER_MFA_ENCRYPTION_KEY||'');
 const configured=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&/^[0-9a-f]{32,64}$/.test(salt)&&/^[0-9a-f]{128}$/.test(passwordHash)&&/^[0-9a-f]{64,}$/.test(csrfSecret);
 const mfaKeyReady=/^[0-9a-f]{64}$/.test(encryptionKey);
 const clock=options.now||Date.now;
 const sendRecoveryEmail=options.sendRecoveryEmail;
 const migrations=[
  'CREATE TABLE IF NOT EXISTS owner_sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS owner_credentials(id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL,password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)',
  'CREATE TABLE IF NOT EXISTS owner_mfa(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,secret TEXT,pending TEXT,pending_expires INTEGER,last_step INTEGER NOT NULL DEFAULT -1)',
  'CREATE TABLE IF NOT EXISTS owner_mfa_challenges(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS owner_mfa_recovery_codes(code_hash TEXT PRIMARY KEY)',
  'CREATE TABLE IF NOT EXISTS owner_password_resets(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL)'
 ];
 db.exec(migrations.join(';')+';');
 if(configured)db.prepare('INSERT OR IGNORE INTO owner_credentials(id,email,password_salt,password_hash) VALUES(1,?,?,?)').run(email,salt,passwordHash);
 db.prepare('INSERT OR IGNORE INTO owner_mfa(id,enabled) VALUES(1,0)').run();
 const getCredentials=()=>db.prepare('SELECT email,password_salt,password_hash FROM owner_credentials WHERE id=1').get();
 const getMfa=()=>db.prepare('SELECT * FROM owner_mfa WHERE id=1').get();
 const isReady=()=>configured&&Boolean(getCredentials());
 const audit=(action)=>db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)').run(action,'owner');
 const csrfToken=t=>createHmac('sha256',Buffer.from(csrfSecret,'hex')).update('a1-referral:owner-csrf-v1:'+t).digest('base64url');
 const encrypt=secret=>{
  if(!mfaKeyReady)throw fail('Two-step verification is not configured.',503);
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(encryptionKey,'hex'),iv);
  const payload=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),payload.toString('base64url')].join('.');
 };
 const decrypt=encoded=>{
  if(!mfaKeyReady||!encoded)throw fail('Two-step verification key is unavailable.',503);
  const [iv,tag,payload]=encoded.split('.');
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from(encryptionKey,'hex'),Buffer.from(iv,'base64url'));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(payload,'base64url')),decipher.final()]).toString('utf8');
 };
 async function matchesPassword(value){
  const credentials=getCredentials();
  if(!isReady()||!credentials||typeof value!=='string'||value.length>128||value.length<12)return false;
  const derived=await scrypt(value,credentials.password_salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});
  return equal(derived.toString('hex'),credentials.password_hash);
 }
 function issueSession(){
  const raw=token(),expires=clock()+4*60*60*1000;
  db.prepare('DELETE FROM owner_sessions WHERE expires_at < ?').run(clock());
  db.prepare('INSERT INTO owner_sessions(token_hash,expires_at) VALUES(?,?)').run(hash(raw),expires);
  return {token:raw,csrf:csrfToken(raw),email:getCredentials().email,expires};
 }
 function session(value){
  if(!isReady()||!validToken(value))return null;
  const row=db.prepare('SELECT expires_at FROM owner_sessions WHERE token_hash=? AND expires_at>?').get(hash(value),clock());
  return row?{email:getCredentials().email,csrf:csrfToken(value),expires:row.expires_at}:null;
 }
 function requireSession(value){const result=session(value);if(!result)throw fail('Sign-in required.');return result}
 function checkCsrf(value,provided){const s=session(value);return Boolean(s&&equal(s.csrf,provided))}
 function logout(value){if(validToken(value))db.prepare('DELETE FROM owner_sessions WHERE token_hash=?').run(hash(value))}
 function useSecondFactor(code){
  const m=getMfa();if(!m.enabled)throw fail();
  if(!mfaKeyReady)throw fail('Two-step verification is temporarily unavailable.',503);
  const secret=decrypt(m.secret);
  const step=totpWindow(secret,code,Number(m.last_step),clock());
  if(step>=0){db.prepare('UPDATE owner_mfa SET last_step=? WHERE id=1').run(step);return true}
  const normalized=String(code||'').toUpperCase().replace(/[\s-]/g,'');
  if(/^[A-F0-9]{20}$/.test(normalized)){
   const result=db.prepare('DELETE FROM owner_mfa_recovery_codes WHERE code_hash=?').run(hash(normalized));
   if(result.changes===1){audit('owner.mfa.recovery_code_used');return true}
  }
  throw fail('Invalid or previously used verification code.');
 }
 async function login(input){
  if(!isReady()||!equal(String(input?.email||'').trim().toLowerCase(),getCredentials().email)||!(await matchesPassword(String(input?.password||''))))throw fail('Invalid email or password.');
  const m=getMfa();
  if(m.enabled){
   if(!mfaKeyReady)throw fail('Two-step verification is temporarily unavailable.',503);
   const raw=token();
   db.prepare('DELETE FROM owner_mfa_challenges WHERE expires_at < ?').run(clock());
   db.prepare('INSERT INTO owner_mfa_challenges(token_hash,expires_at) VALUES(?,?)').run(hash(raw),clock()+5*60*1000);
   return {mfaRequired:true,challenge:raw};
  }
  return issueSession();
 }
 function completeMfa(challenge,code){
  if(!validToken(challenge))throw fail();
  const entry=db.prepare('SELECT * FROM owner_mfa_challenges WHERE token_hash=? AND expires_at>?').get(hash(challenge),clock());
  if(!entry||entry.attempts>=5)throw fail();
  db.prepare('UPDATE owner_mfa_challenges SET attempts=attempts+1 WHERE token_hash=?').run(hash(challenge));
  useSecondFactor(code);
  db.prepare('DELETE FROM owner_mfa_challenges WHERE token_hash=?').run(hash(challenge));
  return issueSession();
 }
 async function beginMfa(value,password){
  requireSession(value);
  if(getMfa().enabled)throw fail('Two-step verification is already enabled.',409);
  if(!mfaKeyReady)throw fail('Two-step verification is not yet configured.',503);
  if(!(await matchesPassword(password)))throw fail();
  const secret=base32(randomBytes(20));
  db.prepare('UPDATE owner_mfa SET pending=?,pending_expires=? WHERE id=1').run(encrypt(secret),clock()+10*60*1000);
  const account=getCredentials().email;
  const uri='otpauth://totp/'+encodeURIComponent('A1 Referral:'+account)+'?secret='+secret+'&issuer='+encodeURIComponent('A1 Referral')+'&algorithm=SHA1&digits=6&period=30';
  audit('owner.mfa.setup_started');
  return {secret,otpauthUrl:uri,expiresInSeconds:600};
 }
 function confirmMfa(value,code){
  requireSession(value);
  const m=getMfa();
  if(m.enabled||!m.pending||m.pending_expires<clock())throw fail('Setup has expired. Start again.',410);
  const secret=decrypt(m.pending);
  const step=totpWindow(secret,code,-1,clock());
  if(step<0)throw fail('Invalid verification code.');
  const codes=Array.from({length:8},()=>randomBytes(10).toString('hex').toUpperCase());
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE owner_mfa SET enabled=1,secret=pending,pending=NULL,pending_expires=NULL,last_step=? WHERE id=1').run(step);
   db.prepare('DELETE FROM owner_mfa_recovery_codes').run();
   for(const code of codes)db.prepare('INSERT INTO owner_mfa_recovery_codes(code_hash) VALUES(?)').run(hash(code));
   db.prepare('DELETE FROM owner_sessions').run();db.prepare('DELETE FROM owner_mfa_challenges').run();
   audit('owner.mfa.enabled');db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  return {enabled:true,recoveryCodes:codes,loggedOut:true};
 }
 async function disableMfa(value,password,code){
  requireSession(value);if(!getMfa().enabled)throw fail('Two-step verification is not enabled.',409);
  if(!(await matchesPassword(password)))throw fail();
  useSecondFactor(code);
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE owner_mfa SET enabled=0,secret=NULL,pending=NULL,pending_expires=NULL,last_step=-1 WHERE id=1').run();
   db.prepare('DELETE FROM owner_mfa_recovery_codes').run();db.prepare('DELETE FROM owner_sessions').run();
   db.prepare('DELETE FROM owner_mfa_challenges').run();audit('owner.mfa.disabled');db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  return {enabled:false,loggedOut:true};
 }
 function mfaStatus(value){requireSession(value);return {enabled:Boolean(getMfa().enabled),canEnable:mfaKeyReady,recoveryCodesRemaining:db.prepare('SELECT COUNT(*) AS n FROM owner_mfa_recovery_codes').get().n}}
 async function requestRecovery(supplied,linkBuilder){
  if(!isReady()||typeof sendRecoveryEmail!=='function')throw fail('Email recovery is temporarily unavailable.',503);
  if(!equal(String(supplied||'').trim().toLowerCase(),getCredentials().email))return {accepted:true};
  const raw=token();
  db.prepare('DELETE FROM owner_password_resets').run();
  db.prepare('INSERT INTO owner_password_resets(token_hash,expires_at) VALUES(?,?)').run(hash(raw),clock()+15*60*1000);
  try{await sendRecoveryEmail(getCredentials().email,linkBuilder(raw))}catch{
   db.prepare('DELETE FROM owner_password_resets WHERE token_hash=?').run(hash(raw));throw fail('Email recovery is temporarily unavailable.',503);
  }
  audit('owner.password_reset.requested');
  return {accepted:true};
 }
 async function changePassword(value,currentPassword,newPassword,mfaCode){
  requireSession(value);
  if(!(await matchesPassword(currentPassword)))throw fail('Current password is incorrect.');
  if(!validPassword(newPassword))throw fail('New password must include 12 or more characters, letters and numbers.',400);
  if(getMfa().enabled)useSecondFactor(mfaCode);
  const newSalt=randomBytes(16).toString('hex');
  const newHash=(await scrypt(newPassword,newSalt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024})).toString('hex');
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE owner_credentials SET password_salt=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').run(newSalt,newHash);
   db.prepare('DELETE FROM owner_sessions').run();
   db.prepare('DELETE FROM owner_mfa_challenges').run();
   db.prepare('DELETE FROM owner_password_resets').run();
   audit('owner.password.changed');db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  return {passwordChanged:true,loggedOut:true};
 }
 async function finishRecovery(input){
  const raw=String(input?.token||''),newPassword=String(input?.newPassword||'');
  if(!validToken(raw)||!validPassword(newPassword))throw fail('Invalid recovery link or password.',400);
  const row=db.prepare('SELECT expires_at FROM owner_password_resets WHERE token_hash=? AND expires_at>?').get(hash(raw),clock());
  if(!row)throw fail('Recovery link is invalid or expired.',410);
  if(getMfa().enabled)useSecondFactor(input?.mfaCode);
  const newSalt=randomBytes(16).toString('hex');
  const newHash=(await scrypt(newPassword,newSalt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024})).toString('hex');
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE owner_credentials SET password_salt=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').run(newSalt,newHash);
   db.prepare('DELETE FROM owner_sessions').run();
   db.prepare('DELETE FROM owner_password_resets').run();
   db.prepare('DELETE FROM owner_mfa_challenges').run();
   audit('owner.password_reset.completed');db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err}
  return {passwordReset:true};
 }
 return {email:getCredentials()?.email||email,configured:isReady(),mfaKeyReady,login,completeMfa,session,checkCsrf,logout,beginMfa,confirmMfa,disableMfa,mfaStatus,changePassword,requestRecovery,finishRecovery};
}
