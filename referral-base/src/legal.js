/** Organizer-managed bilingual policy drafts with explicit publication. Text-only. */
const defaultEN = "1. Program and scope\n\nLinkTutor Pro operates an ambassador referral program for the introductory session on 28 November 2026. Participation follows the program rules approved by its organizer.\n\n2. Ambassador account\n\nApplicants provide their full name in English, email, country, phone and a password. Email verification is required before their referral link becomes active.\n\n3. Referrals and participation\n\nParticipants voluntarily provide their name, WhatsApp number and consent. Link clicks, registration, confirmed group membership, attendance and verified paid subscriptions are distinct events.\n\n4. Commissions\n\nA click, registration or attendance alone does not create a commission. Eligibility and payouts depend on verified paid subscriptions, applicable program terms and organizer approval; refunds or reversals can affect payments.\n\n5. Data use\n\nInformation is used to administer the program, contact participants, verify eligible activity and document approved financial decisions. Access is restricted to authorized staff. Contact the organizer regarding privacy requests.";
const defaultAR = "1. نطاق البرنامج\n\nتدير LinkTutor Pro برنامجًا للسفراء والإحالات المرتبط باللقاء التعريفي بتاريخ 28 نوفمبر 2026. وتخضع المشاركة لقواعد البرنامج المعتمدة من الجهة المنظمة.\n\n2. حساب السفير\n\nيقدّم المتقدم اسمه الكامل بالإنجليزية وبريده الإلكتروني ودولته ورقم هاتفه وكلمة مرور. ويُشترط تأكيد البريد الإلكتروني قبل تفعيل رابط الإحالة.\n\n3. الإحالات والمشاركة\n\nيقدّم المشاركون أسماءهم وأرقام واتساب بموافقتهم. ويعد فتح الرابط والتسجيل والانضمام المؤكد إلى المجموعة والحضور والاشتراك المدفوع الموثق مراحل منفصلة.\n\n4. العمولات\n\nلا تنشأ عمولة بمجرد فتح الرابط أو التسجيل أو الحضور. ويتوقف الاستحقاق والصرف على الاشتراكات المدفوعة المثبتة وشروط البرنامج وموافقة الإدارة، وقد يؤثر الاسترداد أو الإلغاء في العمولات.\n\n5. استخدام البيانات\n\nتُستخدم المعلومات لإدارة البرنامج والتواصل والتحقق من الأنشطة المستحقة وتوثيق القرارات المالية المعتمدة. ويُحصر الوصول بالأشخاص المخولين. تُقدّم طلبات الخصوصية إلى الجهة المنظمة.";
const valid=t=>{
 const v=String(t??'').trim();
 if(v.length<150||v.length>10000)throw Object.assign(new Error('Policy text must contain 150–10,000 characters.'),{status:400});
 return v;
};
export function createLegalSettings(db){
 db.exec("CREATE TABLE IF NOT EXISTS referral_legal_settings (id INTEGER PRIMARY KEY CHECK(id=1), draft_en TEXT NOT NULL, draft_ar TEXT NOT NULL, published_en TEXT NOT NULL, published_ar TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, published_revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, published_at TEXT); CREATE TABLE IF NOT EXISTS referral_legal_revisions (revision INTEGER PRIMARY KEY, english TEXT NOT NULL, arabic TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('saved','published')), recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
 db.prepare('INSERT OR IGNORE INTO referral_legal_settings(id,draft_en,draft_ar,published_en,published_ar) VALUES(1,?,?,?,?)')
  .run(defaultEN,defaultAR,defaultEN,defaultAR);
 const read=()=>db.prepare('SELECT * FROM referral_legal_settings WHERE id=1').get();
 const publicView=()=>{
  const r=read();
  return {english:r.published_en,arabic:r.published_ar,revision:r.published_revision};
 };
 const managerView=()=>{
  const r=read();
  return {draftEnglish:r.draft_en,draftArabic:r.draft_ar,revision:r.revision,publishedRevision:r.published_revision,publishedAt:r.published_at,updatedAt:r.updated_at};
 };
 function save({english,arabic}={}){
  const en=valid(english),ar=valid(arabic);
  db.exec('BEGIN IMMEDIATE');
  try{
   const next=read().revision+1;
   db.prepare('UPDATE referral_legal_settings SET draft_en=?,draft_ar=?,revision=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').run(en,ar,next);
   db.prepare("INSERT INTO referral_legal_revisions(revision,english,arabic,action) VALUES(?,?,?,'saved')").run(next,en,ar);
   db.prepare("INSERT INTO audit(action,ref) VALUES('legal.draft_saved',?)").run(String(next));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return managerView();
 }
 function publish({revision,confirm}={}){
  if(confirm!==true)throw Object.assign(new Error('Organizer confirmation is required.'),{status:400});
  db.exec('BEGIN IMMEDIATE');
  try{
   const r=read();
   if(Number(revision)!==r.revision)throw Object.assign(new Error('The draft changed; review its latest revision.'),{status:409});
   db.prepare('UPDATE referral_legal_settings SET published_en=draft_en,published_ar=draft_ar,published_revision=?,published_at=CURRENT_TIMESTAMP WHERE id=1').run(r.revision);
   db.prepare("INSERT INTO referral_legal_revisions(revision,english,arabic,action) VALUES(?,?,?,'published')").run(r.revision+1000000,r.draft_en,r.draft_ar);
   db.prepare("INSERT INTO audit(action,ref) VALUES('legal.published',?)").run(String(r.revision));
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  return managerView();
 }
 return {publicView,managerView,save,publish};
}
