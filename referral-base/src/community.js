import {createHash} from 'node:crypto';
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const validLink=value=>/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,100}$/.test(value);
export function createCommunityRouting(db){
 db.exec("CREATE TABLE IF NOT EXISTS referral_community_settings(campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),invite_url TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO referral_community_settings(campaign_id) SELECT id FROM campaigns; CREATE TABLE IF NOT EXISTS referral_community_clicks(id INTEGER PRIMARY KEY,ambassador_id INTEGER NOT NULL REFERENCES ambassadors(id),clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_referral_community_clicks_amb ON referral_community_clicks(ambassador_id);");
 const campaign=db.prepare("SELECT id FROM campaigns WHERE slug=?");
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
 function report(){
  const rows=db.prepare("SELECT a.code,a.name,(SELECT COUNT(*) FROM referral_link_visits v WHERE v.ambassador_id=a.id) AS visits,(SELECT COUNT(*) FROM referral_community_clicks cc WHERE cc.ambassador_id=a.id) AS communityClicks FROM ambassadors a JOIN campaigns c ON c.id=a.campaign_id WHERE c.slug='linktutor-2026-11-28' ORDER BY communityClicks DESC,a.code ASC").all();
  return {rows,visits:rows.reduce((n,r)=>n+r.visits,0),communityClicks:rows.reduce((n,r)=>n+r.communityClicks,0),note:'Clicks are not unique visitors or confirmed WhatsApp memberships.'};
 }
 return {settings,configure,enabledFor,redirect,report};
}
