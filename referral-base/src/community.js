import {createHash} from 'node:crypto';
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const validLink=value=>/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,100}$/.test(value);
export function createCommunityRouting(db){
 db.exec("CREATE TABLE IF NOT EXISTS referral_community_settings(campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),invite_url TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO referral_community_settings(campaign_id) SELECT id FROM campaigns; CREATE TABLE IF NOT EXISTS referral_community_clicks(id INTEGER PRIMARY KEY,ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id),clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_referral_community_clicks_amb ON referral_community_clicks(ambassador_id);");
 const campaign=db.prepare("SELECT id FROM campaigns WHERE slug=?");
 // Access to WhatsApp is granted only after a named, consented participant registration.
 const ticketHash=value=>createHash('sha256').update(String(value)).digest('hex');
 function registeredRedirect(ticket){
  if(typeof ticket!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(ticket))throw invalid('Registration required',403);
  const current=settings();
  if(!current.enabled||!validLink(current.inviteUrl))throw invalid('Community unavailable',503);
  const token=ticketHash(ticket);
  db.exec('BEGIN IMMEDIATE');
  try{
   const row=db.prepare("SELECT p.id,p.ambassador_id,t.expires_at,t.used_at FROM participant_join_tickets t JOIN participants p ON p.id=t.participant_id JOIN ambassadors a ON a.id=p.ambassador_id JOIN campaigns c ON c.id=p.campaign_id WHERE t.ticket_hash=? AND a.status='approved' AND c.slug='linktutor-2026-11-28'").get(token);
   if(!row||row.expires_at<Date.now()||row.used_at)throw invalid('Registration link expired; please register again',403);
   const used=db.prepare("UPDATE participant_join_tickets SET used_at=CURRENT_TIMESTAMP WHERE ticket_hash=? AND used_at IS NULL").run(token);
   if(used.changes!==1)throw invalid('Link already used',403);
   db.prepare('UPDATE participants SET join_clicked_at=COALESCE(join_clicked_at,CURRENT_TIMESTAMP) WHERE id=?').run(row.id);
   db.prepare('INSERT INTO referral_community_clicks(ambassador_id) VALUES(?)').run(row.ambassador_id);
   db.prepare("INSERT INTO audit(action,ref) VALUES('community.registered_redirect',?)").run(String(row.id));
   db.exec('COMMIT');
   return {url:current.inviteUrl};
  }catch(error){db.exec('ROLLBACK');throw error}
 }

 const state=db.prepare('SELECT invite_url AS inviteUrl,enabled,updated_at AS updatedAt FROM referral_community_settings WHERE campaign_id=?');
 const lookup=db.prepare("SELECT a.id FROM ambassadors a JOIN campaigns c ON c.id=a.campaign_id WHERE a.code=? AND a.status='approved' AND c.active=1 AND c.slug=?");
 const count=db.prepare('SELECT COUNT(*) AS total FROM referral_community_clicks WHERE ambassador_id=?');
 function configure({inviteUrl='',enabled=false}={}){
  const value=String(inviteUrl||'').trim();
  if(value&&!validLink(value))throw invalid('Enter an official WhatsApp Community invite URL.');
  if(enabled&&!value)throw invalid('Community invite link is required before publishing.');
  const id=campaign.get('linktutor-2026-11-28')?.id;
  if(!id)throw invalid('Campaign not found',404);
  db.prepare('UPDATE referral_community_settings SET invite_url=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE campaign_id=?').run(value,enabled?1:0,id);
  db.prepare("INSERT INTO audit(action,ref) VALUES('community.settings_updated',?)").run(String(id));
  return settings();
 }
 function settings(){
  const id=campaign.get('linktutor-2026-11-28')?.id;
  const result=id?state.get(id):null;
  return result||{inviteUrl:'',enabled:0};
 }
 function enabledFor(code){
  const amb=lookup.get(String(code||''),'linktutor-2026-11-28');
  const current=settings();
  return Boolean(amb&&current.enabled&&validLink(current.inviteUrl));
 }
 function redirect(code){
  const amb=lookup.get(String(code||''),'linktutor-2026-11-28');
  if(!amb)throw invalid('Active ambassador link not found',404);
  const current=settings();
  if(!current.enabled||!validLink(current.inviteUrl))throw invalid('Community is not accepting visitors yet',503);
  db.prepare('INSERT INTO referral_community_clicks(ambassador_id) VALUES(?)').run(amb.id);
  return {url:current.inviteUrl,clicks:count.get(amb.id).total};
 }
 function ownClicks(ambassadorId){
  return count.get(Number(ambassadorId))?.total||0;
 }
 function report(){
  // UTC equivalents of Beirut 20 Nov 2026 20:00 to 28 Nov 2026 19:00.
  // Keep legacy totals intact; campaign metrics use an exclusive end boundary.
  const start='2026-11-20 18:00:00',end='2026-11-28 17:00:00';
  const rows=db.prepare(`SELECT a.code,a.name,
    (SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id) AS visits,
    (SELECT COUNT(*) FROM referral_community_clicks cc WHERE cc.ambassador_id=a.id) AS communityClicks,
    (SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id AND v.visited_at>=? AND v.visited_at<?) AS campaignVisits,
    (SELECT COUNT(*) FROM referral_community_clicks cc WHERE cc.ambassador_id=a.id AND cc.clicked_at>=? AND cc.clicked_at<?) AS campaignClicks
    FROM ambassadors a JOIN campaigns c ON c.id=a.campaign_id WHERE c.slug='linktutor-2026-11-28' ORDER BY campaignClicks DESC,a.code ASC`).all(start,end,start,end);
  const sum=key=>rows.reduce((n,r)=>n+r[key],0);
  return {rows,visits:sum('visits'),communityClicks:sum('communityClicks'),
   period:{startUtc:'2026-11-20T18:00:00Z',endUtc:'2026-11-28T17:00:00Z',visits:sum('campaignVisits'),communityClicks:sum('campaignClicks')},
   note:'Event counts, not unique visitors, confirmed WhatsApp memberships, attendance, or paid conversions.'};
 }
 return {settings,configure,enabledFor,redirect,registeredRedirect,report,ownClicks};
}
