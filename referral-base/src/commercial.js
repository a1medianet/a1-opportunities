import {randomBytes,createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export function createCommercialFlow(db) {
 db.exec(`CREATE TABLE IF NOT EXISTS participant_join_tickets (
   ticket_hash TEXT PRIMARY KEY,
   participant_id INTEGER NOT NULL REFERENCES participants(id),
   expires_at INTEGER NOT NULL,
   used_at TEXT
 );
 CREATE TABLE IF NOT EXISTS participant_sales (
   id INTEGER PRIMARY KEY,
   participant_id INTEGER NOT NULL UNIQUE REFERENCES participants(id),
   payment_ref TEXT NOT NULL UNIQUE,
   evidence_ref TEXT NOT NULL,
   prior_status TEXT NOT NULL DEFAULT 'registered',
   sale_cents INTEGER NOT NULL CHECK(sale_cents>0),
   commission_cents INTEGER NOT NULL CHECK(commission_cents>=0),
   currency TEXT NOT NULL DEFAULT 'USD',
   status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('verified','approved','paid','reversed')),
   payout_ref TEXT UNIQUE,
   verified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   approved_at TEXT,
   paid_at TEXT,
   reversed_at TEXT,
   reversal_reason TEXT
 );
 CREATE INDEX IF NOT EXISTS idx_sale_status ON participant_sales(status);`);
 const saleColumns=db.prepare('PRAGMA table_info(participant_sales)').all().map(x=>x.name);
 if(!saleColumns.includes('prior_status'))db.exec("ALTER TABLE participant_sales ADD COLUMN prior_status TEXT NOT NULL DEFAULT 'registered'");
 const audit=(action,id)=>db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)').run(action,String(id));
 function issueJoinTicket(participantId) {
   const ticket=randomBytes(32).toString('base64url');
   db.prepare('INSERT INTO participant_join_tickets(ticket_hash,participant_id,expires_at) VALUES(?,?,?)')
     .run(digest(ticket),participantId,Date.now()+30*60*1000);
   return ticket;
 }
 function markJoinLinkClick(ticket) {
   if(typeof ticket!=='string'||ticket.length!==43)return {recorded:false};
   const item=db.prepare('SELECT * FROM participant_join_tickets WHERE ticket_hash=?').get(digest(ticket));
   if(!item||item.expires_at<Date.now())return {recorded:false};
   if(item.used_at)return {recorded:true};
   db.exec('BEGIN IMMEDIATE');
   try {
    db.prepare('UPDATE participant_join_tickets SET used_at=CURRENT_TIMESTAMP WHERE ticket_hash=? AND used_at IS NULL').run(digest(ticket));
    db.prepare('UPDATE participants SET join_clicked_at=COALESCE(join_clicked_at,CURRENT_TIMESTAMP) WHERE id=?').run(item.participant_id);
    db.prepare("INSERT INTO audit(action,ref) VALUES('whatsapp.link_clicked',?)").run(String(item.participant_id));
    db.exec('COMMIT');return {recorded:true};
   }catch(e){db.exec('ROLLBACK');throw e}
 }
 function statusForParticipant(id) {
   const item=db.prepare('SELECT * FROM participant_sales WHERE participant_id=?').get(id);
   return item||null;
 }
 function verifySale(input) {
   const id=Number(input?.participantId),paymentRef=String(input?.paymentRef||'').trim(),evidence=String(input?.evidenceRef||'').trim();
   const saleCents=Number(input?.saleCents),commissionCents=Number(input?.commissionCents);
   if(!Number.isSafeInteger(id)||id<1||paymentRef.length<4||paymentRef.length>140||evidence.length<4||evidence.length>300||!Number.isSafeInteger(saleCents)||saleCents<1||!Number.isSafeInteger(commissionCents)||commissionCents<0)throw Error('Verified sale reference, evidence and amounts required');
   const participant=db.prepare('SELECT id,status FROM participants WHERE id=?').get(id);
   if(!participant)throw Error('Participant not found');
   const previous=db.prepare('SELECT * FROM participant_sales WHERE participant_id=? OR payment_ref=?').get(id,paymentRef);
   if(previous) {
     if(previous.participant_id===id && previous.payment_ref===paymentRef && previous.sale_cents===saleCents && previous.commission_cents===commissionCents && previous.evidence_ref===evidence)return {duplicate:true,id:previous.id};
     throw Error('Conflicting sale or payment reference');
   }
   db.exec('BEGIN IMMEDIATE');
   try{
     const result=db.prepare('INSERT INTO participant_sales(participant_id,payment_ref,evidence_ref,prior_status,sale_cents,commission_cents) VALUES(?,?,?,?,?,?)').run(id,paymentRef,evidence,participant.status,saleCents,commissionCents);
     db.prepare("UPDATE participants SET status='enrolled' WHERE id=?").run(id);
     audit('sale.verified',result.lastInsertRowid);
     db.exec('COMMIT');return {duplicate:false,id:Number(result.lastInsertRowid)};
   }catch(e){db.exec('ROLLBACK');throw e}
 }
 function approveSale(id) {
   const sale=db.prepare('SELECT * FROM participant_sales WHERE id=?').get(id);
   if(!sale)throw Error('Sale not found');
   if(sale.status==='approved'||sale.status==='paid')return {duplicate:true};
   if(sale.status!=='verified')throw Error('Sale not eligible for approval');
   db.prepare("UPDATE participant_sales SET status='approved',approved_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
   audit('commission.approved',id);return {duplicate:false};
 }
 function payCommission(input) {
   const id=Number(input?.id),ref=String(input?.payoutRef||'').trim();
   if(!Number.isSafeInteger(id)||id<1||ref.length<4||ref.length>140)throw Error('Valid payout reference required');
   const sale=db.prepare('SELECT * FROM participant_sales WHERE id=?').get(id);
   if(!sale)throw Error('Sale not found');
   if(sale.status==='paid'){
     if(sale.payout_ref===ref)return {duplicate:true};
     throw Error('Conflicting payout reference');
   }
   if(sale.status!=='approved')throw Error('Commission must be approved first');
   db.prepare("UPDATE participant_sales SET status='paid',payout_ref=?,paid_at=CURRENT_TIMESTAMP WHERE id=?").run(ref,id);
   audit('commission.paid',id);return {duplicate:false};
 }
 function reverseSale(input) {
   const id=Number(input?.id),reason=String(input?.reason||'').trim();
   if(!Number.isSafeInteger(id)||id<1||reason.length<8||reason.length>300)throw Error('Reversal reason is required');
   const sale=db.prepare('SELECT * FROM participant_sales WHERE id=?').get(id);
   if(!sale)throw Error('Sale not found');
   if(sale.status==='reversed')return {duplicate:true};
   db.exec('BEGIN IMMEDIATE');
   try{
     db.prepare("UPDATE participant_sales SET status='reversed',reversed_at=CURRENT_TIMESTAMP,reversal_reason=? WHERE id=?").run(reason,id);
     db.prepare("UPDATE participants SET status=CASE WHEN attended_at IS NOT NULL THEN 'attended' WHEN joined_at IS NOT NULL THEN 'joined' ELSE 'registered' END WHERE id=? AND status='enrolled'").run(sale.participant_id);
     audit(sale.status==='paid'?'commission.paid_reversal_requires_recovery':'commission.reversed',id);
     db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e}
   return {duplicate:false,recoveryRequired:sale.status==='paid'};
 }
 function ownerSummary(){
   const totals=db.prepare("SELECT COUNT(CASE WHEN status<>'reversed' THEN 1 END) AS verifiedSubscriptions, COALESCE(SUM(CASE WHEN status IN ('verified','approved','paid') THEN commission_cents ELSE 0 END),0) AS totalCommissionCents, COALESCE(SUM(CASE WHEN status='paid' THEN commission_cents ELSE 0 END),0) AS paidCommissionCents, COALESCE(SUM(CASE WHEN status='reversed' AND paid_at IS NOT NULL THEN commission_cents ELSE 0 END),0) AS recoveryOutstandingCents FROM participant_sales").get();
   const perAmbassador=db.prepare("SELECT a.id,a.name, (SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id) AS linkVisits, COUNT(DISTINCT p.id) AS registered, COUNT(DISTINCT CASE WHEN p.join_clicked_at IS NOT NULL THEN p.id END) AS clickedWhatsApp, COUNT(DISTINCT CASE WHEN p.joined_at IS NOT NULL THEN p.id END) AS confirmedJoin, COUNT(DISTINCT CASE WHEN p.attended_at IS NOT NULL THEN p.id END) AS attended, COUNT(DISTINCT CASE WHEN s.status<>'reversed' THEN s.id END) AS verifiedSubscriptions, COALESCE(SUM(CASE WHEN s.status IN ('verified','approved','paid') THEN s.commission_cents ELSE 0 END),0) AS commissionCents, COALESCE(SUM(CASE WHEN s.status='paid' THEN s.commission_cents ELSE 0 END),0) AS paidCents, COALESCE(SUM(CASE WHEN s.status='reversed' AND s.paid_at IS NOT NULL THEN s.commission_cents ELSE 0 END),0) AS recoveryOutstandingCents FROM ambassadors a LEFT JOIN participants p ON p.ambassador_id=a.id LEFT JOIN participant_sales s ON s.participant_id=p.id GROUP BY a.id ORDER BY a.id DESC").all();
   return {totals,perAmbassador};
 }
 function ownSummary(ambassadorId) {
   const summary=db.prepare("SELECT COUNT(DISTINCT p.id) AS registered, COUNT(DISTINCT CASE WHEN p.attended_at IS NOT NULL THEN p.id END) AS attended, COUNT(DISTINCT CASE WHEN p.join_clicked_at IS NOT NULL THEN p.id END) AS clickedWhatsApp, COUNT(DISTINCT CASE WHEN p.joined_at IS NOT NULL THEN p.id END) AS confirmedJoin, COUNT(DISTINCT CASE WHEN s.status<>'reversed' THEN s.id END) AS subscriptions, COALESCE(SUM(CASE WHEN s.status IN ('verified','approved','paid') THEN s.commission_cents ELSE 0 END),0) AS commissionCents, COALESCE(SUM(CASE WHEN s.status='verified' THEN s.commission_cents ELSE 0 END),0) AS pendingApprovalCents, COALESCE(SUM(CASE WHEN s.status='approved' THEN s.commission_cents ELSE 0 END),0) AS approvedUnpaidCents, COALESCE(SUM(CASE WHEN s.status='paid' THEN s.commission_cents ELSE 0 END),0) AS paidCents, COALESCE(SUM(CASE WHEN s.status='reversed' AND s.paid_at IS NOT NULL THEN s.commission_cents ELSE 0 END),0) AS recoveryOutstandingCents FROM participants p LEFT JOIN participant_sales s ON s.participant_id=p.id WHERE p.ambassador_id=?").get(ambassadorId);
   const sales=db.prepare('SELECT s.participant_id,s.commission_cents,s.currency,s.status FROM participant_sales s JOIN participants p ON p.id=s.participant_id WHERE p.ambassador_id=? ORDER BY s.id DESC LIMIT 100').all(ambassadorId);
   return {summary,sales};
 }
 function allSales() {
   return db.prepare('SELECT s.id,s.participant_id,s.payment_ref,s.evidence_ref,s.sale_cents,s.commission_cents,s.currency,s.status,s.payout_ref,s.verified_at,s.paid_at,s.reversal_reason,p.name AS participant,a.name AS ambassador FROM participant_sales s JOIN participants p ON p.id=s.participant_id JOIN ambassadors a ON a.id=p.ambassador_id ORDER BY s.id DESC LIMIT 200').all();
 }
 return {issueJoinTicket,markJoinLinkClick,statusForParticipant,verifySale,approveSale,payCommission,reverseSale,ownerSummary,ownSummary,allSales};
}
