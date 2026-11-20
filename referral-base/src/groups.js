import {randomBytes,createHash} from 'node:crypto';
const sha256=v=>createHash('sha256').update(String(v)).digest('hex');
const groupPattern=/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,100}$/;
const modes=new Set(['draft','active','full','closed']);
const invalid=(text,status=400)=>Object.assign(new Error(text),{status});
export function createGroupPool(db,{now=Date.now}={}){
 db.exec("CREATE TABLE IF NOT EXISTS referral_destination_groups(id INTEGER PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), name TEXT NOT NULL, url TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 10000), reported_members INTEGER NOT NULL DEFAULT 0 CHECK(reported_members>=0), priority INTEGER NOT NULL DEFAULT 100 CHECK(priority BETWEEN 0 AND 10000), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','full','closed')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_referral_destination_groups ON referral_destination_groups(campaign_id,status,priority); CREATE TABLE IF NOT EXISTS referral_participant_destinations(participant_id INTEGER PRIMARY KEY REFERENCES participants(id), group_id INTEGER REFERENCES referral_destination_groups(id), first_redirect_at TEXT, last_redirect_at TEXT, redirects INTEGER NOT NULL DEFAULT 0, issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS idx_referral_participant_group ON referral_participant_destinations(group_id); CREATE TABLE IF NOT EXISTS referral_destination_access(token_hash TEXT PRIMARY KEY,participant_id INTEGER NOT NULL REFERENCES participants(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
 const lookup=db.prepare("SELECT id FROM campaigns WHERE slug=?");
 const audit=db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)');
 const publicInfo=campaign=>{
  const id=lookup.get(campaign)?.id;
  if(!id)throw invalid('Campaign not found',404);
  return {campaign,id};
 };
 const list=(campaign='linktutor-2026-11-28')=>{
  const id=publicInfo(campaign).id;
  return db.prepare("SELECT g.id,g.name,g.url,g.capacity,g.reported_members AS reportedMembers,g.priority,g.status,COUNT(r.participant_id) AS routedParticipants,g.created_at AS createdAt,g.updated_at AS updatedAt FROM referral_destination_groups g LEFT JOIN referral_participant_destinations r ON r.group_id=g.id WHERE g.campaign_id=? GROUP BY g.id ORDER BY g.priority ASC,g.id ASC").all(id);
 };
 function add(input={}){
  const id=publicInfo(input.campaign||'linktutor-2026-11-28').id;
  const name=String(input.name||'').trim(),url=String(input.url||'').trim();
  const capacity=Number(input.capacity||0),members=Number(input.reportedMembers||0),priority=Number(input.priority??100);
  if(name.length<3||name.length>100||!groupPattern.test(url)||!Number.isSafeInteger(capacity)||capacity<1||capacity>10000||!Number.isSafeInteger(members)||members<0||members>capacity||!Number.isSafeInteger(priority)||priority<0||priority>10000)throw invalid('Enter a valid group name, WhatsApp invite link, capacity, member estimate and priority.');
  const existing=db.prepare('SELECT id FROM referral_destination_groups WHERE campaign_id=? AND (name=? COLLATE NOCASE OR url=?)').get(id,name,url);
  if(existing)throw invalid('Group name or link already exists for this campaign.',409);
  const result=db.prepare("INSERT INTO referral_destination_groups(campaign_id,name,url,capacity,reported_members,priority,status) VALUES(?,?,?,?,?,?,'draft')").run(id,name,url,capacity,members,priority);
  audit.run('destination.group_created',String(result.lastInsertRowid));
  return {created:true,id:Number(result.lastInsertRowid)};
 }
 function edit(input={}){
  const id=Number(input.id);
  if(!Number.isSafeInteger(id)||id<=0)throw invalid('Group id is required');
  const old=db.prepare('SELECT * FROM referral_destination_groups WHERE id=?').get(id);
  if(!old)throw invalid('Group not found',404);
  const name=String(input.name??old.name).trim(),url=String(input.url??old.url).trim();
  const capacity=Number(input.capacity??old.capacity),members=Number(input.reportedMembers??old.reported_members),priority=Number(input.priority??old.priority),status=String(input.status??old.status);
  if(name.length<3||name.length>100||!groupPattern.test(url)||!modes.has(status)||!Number.isSafeInteger(capacity)||capacity<1||capacity>10000||!Number.isSafeInteger(members)||members<0||members>capacity||!Number.isSafeInteger(priority)||priority<0||priority>10000)throw invalid('Invalid group settings.');
  if(db.prepare('SELECT id FROM referral_destination_groups WHERE campaign_id=? AND id<>? AND (name=? COLLATE NOCASE OR url=?)').get(old.campaign_id,id,name,url))throw invalid('Duplicate group name or URL.',409);
  db.prepare('UPDATE referral_destination_groups SET name=?,url=?,capacity=?,reported_members=?,priority=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name,url,capacity,members,priority,status,id);
  audit.run('destination.group_'+status,String(id));
  return {updated:true,id};
 }
 // This is a persistent opaque link, not the public WhatsApp invitation.
 // It is associated with exactly one participant, without disclosing that participant's ID.
 function ticketForParticipant(participantId){
  const p=db.prepare('SELECT id FROM participants WHERE id=?').get(participantId);
  if(!p)throw invalid('Participant not found',404);
  const code=randomBytes(32).toString('base64url');
  db.prepare('INSERT OR IGNORE INTO referral_participant_destinations(participant_id) VALUES(?)').run(participantId);
  db.prepare('INSERT INTO referral_destination_access(token_hash,participant_id) VALUES(?,?)').run(sha256(code),participantId);
  return '/join/'+code;
 }
 function nextGroup(campaignId,ignoreId=0){
  return db.prepare("SELECT g.*,(SELECT COUNT(*) FROM referral_participant_destinations r WHERE r.group_id=g.id) AS reserved FROM referral_destination_groups g WHERE g.campaign_id=? AND g.status='active' AND g.id<>? AND MAX(g.reported_members,(SELECT COUNT(*) FROM referral_participant_destinations r WHERE r.group_id=g.id))<g.capacity ORDER BY g.priority,g.id LIMIT 1").get(campaignId,ignoreId);
 }
 function eligibleGroup(campaignId){return nextGroup(campaignId);}
 function redirect(token){
  if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))throw invalid('Invitation link not found',404);
  // DB transaction coordinates a new group allocation and enforces capacity by reserved routes.
  db.exec('BEGIN IMMEDIATE');
  try{
   const route=db.prepare('SELECT r.participant_id,r.group_id,p.campaign_id FROM referral_destination_access a JOIN referral_participant_destinations r ON r.participant_id=a.participant_id JOIN participants p ON p.id=r.participant_id WHERE a.token_hash=?').get(sha256(token));
   if(!route)throw invalid('Invitation link not found',404);
   const old=route.group_id?db.prepare('SELECT * FROM referral_destination_groups WHERE id=?').get(route.group_id):null;
   const reservations=old?db.prepare('SELECT COUNT(*) AS n FROM referral_participant_destinations WHERE group_id=?').get(old.id).n:0;
   // If the old group is full/closed, all older redirect URLs now resolve to the next open group.
   const group=old&&old.status==='active'&&old.reported_members<old.capacity&&reservations<=old.capacity?old:nextGroup(route.campaign_id);
   if(!group)throw invalid('No group is currently accepting registrations. Please contact the organizer.',503);
   db.prepare('UPDATE referral_participant_destinations SET group_id=?,first_redirect_at=COALESCE(first_redirect_at,CURRENT_TIMESTAMP),last_redirect_at=CURRENT_TIMESTAMP,redirects=redirects+1 WHERE participant_id=?').run(group.id,route.participant_id);
   db.prepare('UPDATE participants SET join_clicked_at=COALESCE(join_clicked_at,CURRENT_TIMESTAMP) WHERE id=?').run(route.participant_id);
   audit.run('destination.group_redirected',String(route.participant_id));
   db.exec('COMMIT');
   return {url:group.url,groupId:group.id};
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {list,add,edit,ticketForParticipant,eligibleGroup,redirect};
}
