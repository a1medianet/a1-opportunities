import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

const CODE = () => randomBytes(12).toString('base64url');
const hash = value => createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
export function createStore(path, {seedTestData=false}={}) {
  mkdirSync(join(path, '..'), {recursive:true});
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, event_date TEXT NOT NULL, commission_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS ambassadors (id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, status TEXT NOT NULL CHECK(status IN ('approved','pending','suspended')) DEFAULT 'approved');
CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id), name TEXT NOT NULL, email TEXT NOT NULL, email_hash TEXT NOT NULL, privacy_accepted INTEGER NOT NULL, registered_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(campaign_id,email_hash));
CREATE TABLE IF NOT EXISTS enrollments (id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id), external_id TEXT NOT NULL UNIQUE, payment_ref TEXT NOT NULL UNIQUE, proof_note TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0), status TEXT NOT NULL CHECK(status IN ('paid','refunded')) DEFAULT 'paid');
CREATE TABLE IF NOT EXISTS commissions (id INTEGER PRIMARY KEY, enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(id), ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), status TEXT NOT NULL CHECK(status IN ('due','paid','reversed')) DEFAULT 'due');
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT NOT NULL, ref TEXT NOT NULL, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);
  db.prepare("INSERT OR IGNORE INTO campaigns(id,slug,title,event_date,commission_cents) VALUES(1,'linktutor-2026-11-28','LinkTutor Pro — Ambassador Program','2026-11-28',4000)").run();
  // Never invent ambassadors in real client data. Tests opt in explicitly.
  if (seedTestData && !db.prepare('SELECT id FROM ambassadors LIMIT 1').get()) {
    db.prepare("INSERT INTO ambassadors(campaign_id,name,code) VALUES(1,?,?)").run('Demo Ambassador — A',CODE());
    db.prepare("INSERT INTO ambassadors(campaign_id,name,code) VALUES(1,?,?)").run('Demo Ambassador — B',CODE());
  }
  const audit=(action,ref)=>db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)').run(action,String(ref));
  function register(input) {
    if (!input || input.consent !== true || !String(input.name||'').trim() || !/^\S+@\S+\.\S+$/.test(String(input.email||''))) throw new Error('Name, valid email, and privacy consent are required');
    const ambassador=db.prepare("SELECT a.* FROM ambassadors a JOIN campaigns c ON c.id=a.campaign_id WHERE a.code=? AND a.status='approved' AND c.active=1").get(input.code);
    if(!ambassador) throw new Error('Invalid referral code');
    const email=String(input.email).trim().toLowerCase(); if (!email.endsWith('.test')) throw new Error('Demo mode accepts only .test addresses; do not submit personal information');
    try {
      const out=db.prepare('INSERT INTO leads(campaign_id,ambassador_id,name,email,email_hash,privacy_accepted) VALUES(?,?,?,?,?,1)').run(ambassador.campaign_id,ambassador.id,String(input.name).trim().slice(0,120),email,hash(email));
      audit('lead.registered',out.lastInsertRowid);
      return {id:Number(out.lastInsertRowid),duplicate:false};
    } catch(e) {
      if(!String(e.message).includes('UNIQUE')) throw e;
      audit('lead.duplicate_review',hash(email).slice(0,12));
      return {duplicate:true,message:'Existing registration; attribution not reassigned'};
    }
  }
  function recordPayment(input){
    if(!input || !String(input.externalId||'').trim() || !String(input.paymentRef||'').trim() || !String(input.proofNote||'').trim() || !Number.isInteger(input.amountCents) || input.amountCents<=0) throw new Error('Payment proof evidence and positive amount required');
    const lead=db.prepare('SELECT * FROM leads WHERE id=?').get(input.leadId);
    if(!lead) throw new Error('Lead not found');
    const existing=db.prepare('SELECT * FROM enrollments WHERE external_id=? OR payment_ref=?').get(input.externalId,input.paymentRef);
    const previousLeadEnrollment=db.prepare('SELECT id FROM enrollments WHERE lead_id=? LIMIT 1').get(lead.id);
    if(previousLeadEnrollment && (!existing || previousLeadEnrollment.id!==existing.id)) throw new Error('Enrollment already recorded for this lead');
    if(existing && existing.lead_id!==lead.id) throw new Error('Payment reference belongs to another lead');
    if(existing) return {duplicate:true,enrollmentId:existing.id};
    db.exec('BEGIN IMMEDIATE');
    try{
      const en=db.prepare('INSERT INTO enrollments(lead_id,external_id,payment_ref,proof_note,amount_cents) VALUES(?,?,?,?,?)').run(lead.id,String(input.externalId),String(input.paymentRef),String(input.proofNote),input.amountCents);
      const campaign=db.prepare('SELECT * FROM campaigns WHERE id=?').get(lead.campaign_id);
      db.prepare('INSERT INTO commissions(enrollment_id,ambassador_id,amount_cents) VALUES(?,?,?)').run(en.lastInsertRowid,lead.ambassador_id,campaign.commission_cents);
      audit('payment.verified',en.lastInsertRowid);
      db.exec('COMMIT');
      return {duplicate:false,enrollmentId:Number(en.lastInsertRowid),commissionCents:campaign.commission_cents};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function refund(externalId){
    const en=db.prepare('SELECT * FROM enrollments WHERE external_id=?').get(externalId);
    if(!en) throw new Error('Enrollment not found');
    if(en.status==='refunded') return {duplicate:true};
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare("UPDATE enrollments SET status='refunded' WHERE id=?").run(en.id);
      db.prepare("UPDATE commissions SET status='reversed' WHERE enrollment_id=?").run(en.id);
      audit('payment.refunded',en.id);
      db.exec('COMMIT');
      return {duplicate:false};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function stats(code) {
    const ambassador=db.prepare("SELECT id,name,code FROM ambassadors WHERE code=? AND status='approved'").get(code);
    if(!ambassador) return null;
    const registrations=db.prepare('SELECT COUNT(*) AS total FROM leads WHERE ambassador_id=?').get(ambassador.id).total;
    const earnings=db.prepare("SELECT SUM(CASE WHEN c.status IN ('due','paid') THEN 1 ELSE 0 END) AS paidEnrollments, COALESCE(SUM(CASE WHEN c.status IN ('due','paid') THEN c.amount_cents ELSE 0 END),0) AS earnedCents, COALESCE(SUM(CASE WHEN c.status='paid' THEN c.amount_cents ELSE 0 END),0) AS paidCents FROM commissions c WHERE ambassador_id=?").get(ambassador.id);
    return {...ambassador,registrations,...earnings};
  }
  function adminOverview() {
    return {ambassadors:db.prepare('SELECT id,name,code,status FROM ambassadors').all(),leads:db.prepare('SELECT l.id,l.name,l.registered_at,a.name AS ambassador FROM leads l JOIN ambassadors a ON a.id=l.ambassador_id ORDER BY l.id DESC LIMIT 50').all(),commissions:db.prepare('SELECT c.id,c.amount_cents,c.status,e.external_id FROM commissions c JOIN enrollments e ON e.id=c.enrollment_id ORDER BY c.id DESC LIMIT 50').all()};
  }
  return {db,register,recordPayment,refund,stats,adminOverview};
}
