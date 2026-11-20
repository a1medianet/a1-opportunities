/**
 * Campaign-scoped ambassador enrollment availability.
 * Scheduled openings use UTC and server time. Defaults CLOSED.
 */
export function createEnrollmentGate(db,{now=Date.now}={}){
 db.exec("CREATE TABLE IF NOT EXISTS ambassador_enrollment_gates (campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id), mode TEXT NOT NULL DEFAULT 'closed' CHECK(mode IN ('closed','open','scheduled')), opens_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT OR IGNORE INTO ambassador_enrollment_gates(campaign_id) SELECT id FROM campaigns;");
 const select=db.prepare("SELECT g.campaign_id,g.mode,g.opens_at,g.updated_at,c.slug,c.title FROM ambassador_enrollment_gates g JOIN campaigns c ON c.id=g.campaign_id WHERE c.slug=?");
 const audit=db.prepare('INSERT INTO audit(action,ref) VALUES(?,?)');
 function view(slug='linktutor-2026-11-28'){
  const record=select.get(slug);
  if(!record)throw Object.assign(new Error('Campaign not found'),{status:404});
  const time=record.opens_at?Date.parse(record.opens_at):NaN;
  const open=record.mode==='open'||(record.mode==='scheduled'&&Number.isFinite(time)&&now()>=time);
  return {campaign:record.slug,mode:record.mode,opensAt:record.opens_at,open,updatedAt:record.updated_at};
 }
 function update({campaign='linktutor-2026-11-28',mode,opensAt}={}){
  if(!['closed','open','scheduled'].includes(mode))throw Object.assign(new Error('Invalid enrollment mode'),{status:400});
  const record=select.get(campaign);
  if(!record)throw Object.assign(new Error('Campaign not found'),{status:404});
  let date=null;
  if(mode==='scheduled'){
    const when=String(opensAt||'');
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(when)||!Number.isFinite(Date.parse(when))||Date.parse(when)<=now())throw Object.assign(new Error('Choose a future date and time.'),{status:400});
    date=new Date(Date.parse(when)).toISOString();
  }
  db.prepare("UPDATE ambassador_enrollment_gates SET mode=?,opens_at=?,updated_at=CURRENT_TIMESTAMP WHERE campaign_id=?")
    .run(mode,date,record.campaign_id);
  audit.run('ambassador.enrollment_gate_'+mode,String(record.campaign_id));
  return view(campaign);
 }
 return {view,update};
}
