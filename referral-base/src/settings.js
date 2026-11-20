const groupPattern=/^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+$/;
const approvedHosts=new Set((process.env.A1_REFERRAL_ALLOWED_DESTINATION_HOSTS||'linktutorpro.com,www.linktutorpro.com').split(/[,;\s]+/).map(v=>v.toLowerCase()).filter(Boolean));
function safeCustom(value){
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&approvedHosts.has(u.hostname.toLowerCase())&&!u.hash;
 }catch{return false}
}
export function createProgramSettings(db,groupPool=null){
 db.exec(`CREATE TABLE IF NOT EXISTS program_settings (
 campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id),
 group_url TEXT NOT NULL DEFAULT '',
 registration_open INTEGER NOT NULL DEFAULT 0 CHECK(registration_open IN (0,1)),
 organizer_approved INTEGER NOT NULL DEFAULT 0 CHECK(organizer_approved IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`);
 db.prepare("INSERT OR IGNORE INTO program_settings(campaign_id) VALUES(1)").run();
 const columns=db.prepare('PRAGMA table_info(program_settings)').all().map(row=>row.name);
 if(!columns.includes('destination_type'))db.exec("ALTER TABLE program_settings ADD COLUMN destination_type TEXT NOT NULL DEFAULT 'whatsapp'");
 if(!columns.includes('custom_url'))db.exec("ALTER TABLE program_settings ADD COLUMN custom_url TEXT NOT NULL DEFAULT ''");
 const current=()=>db.prepare('SELECT campaign_id,group_url,custom_url,destination_type,registration_open,organizer_approved,updated_at FROM program_settings WHERE campaign_id=1').get();
 const resolveDestination=s=>{
  if(s.destination_type==='custom'&&safeCustom(s.custom_url))return {url:s.custom_url,type:'custom'};
  if(s.destination_type==='whatsapp'&&groupPool){const pool=groupPool.list();if(pool.length)return {url:groupPool.eligibleGroup(1)?.url||'',type:'whatsapp'};}
  if(s.destination_type==='whatsapp'&&groupPattern.test(s.group_url))return {url:s.group_url,type:'whatsapp'};
  return {url:'',type:s.destination_type};
 };
 const active=()=>{
  const s=current(),dest=resolveDestination(s);
  return {registrationOpen:Boolean(s.registration_open&&s.organizer_approved&&dest.url),groupUrl:dest.url,destinationType:dest.type};
 };
 function update(input){
  const groupUrl=String(input?.groupUrl||'').trim();
  const customUrl=String(input?.customUrl||'').trim();
  const destinationType=String(input?.destinationType||'whatsapp');
  const open=input?.registrationOpen===true,approved=input?.organizerApproved===true;
  if(!['whatsapp','custom'].includes(destinationType))throw Error('Unknown destination type');
  if(groupUrl&&!groupPattern.test(groupUrl))throw Error('Invalid WhatsApp group link');
  if(customUrl&&!safeCustom(customUrl))throw Error('Custom destination hostname must be approved by the organizer and allowlisted');
  const destination=resolveDestination({group_url:groupUrl,custom_url:customUrl,destination_type:destinationType});
  if(open&&(!approved||!destination.url))throw Error('Organizer approval and an approved destination link required');
  db.prepare("UPDATE program_settings SET group_url=?,custom_url=?,destination_type=?,registration_open=?,organizer_approved=?,updated_at=CURRENT_TIMESTAMP WHERE campaign_id=1").run(groupUrl,customUrl,destinationType,open?1:0,approved?1:0);
  db.prepare("INSERT INTO audit(action,ref) VALUES('program.updated','1')").run();
  return view();
 }
 function view(){const s=current(),dest=resolveDestination(s);return {registrationOpen:Boolean(s.registration_open),organizerApproved:Boolean(s.organizer_approved),groupUrl:s.group_url,customUrl:s.custom_url,destinationType:s.destination_type,destinationUrl:dest.url,active:active().registrationOpen,updatedAt:s.updated_at}}
 return {active,view,update};
}
