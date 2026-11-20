const translations={
'تعديل تفاصيل حملة محددة':'Edit Campaign Details',
'تعديل عنوان الحملة وموعدها وتعريفها دون تغيير رمز الإحالة أو الجهة المنظمة. لا تُنشر التعديلات للعامة تلقائيًا.':'Edit title, date, and campaign information without changing organizer or referral code. Changes are not published automatically.',
'علامة الجهة':'Organizer Brand',
'وصف الحملة':'Campaign Description',
'رابط الجهة الرسمي HTTPS':'Official Organizer URL (HTTPS)',
'حفظ التعديلات الموثقة':'Save Audited Changes',
'يُضاف بعد اعتماد المعلومات':'Add after organizer approval',
'1 · الجهات المنظمة':'1 · Organizers',
'إنشاء جهة مستقلة':'Create an independent organizer',
'2 · الحملات':'2 · Campaigns',
'إعدادات وحالة كل حملة':'Settings and status for each campaign',
'3 · الإحالات والتقارير':'3 · Referrals and Reports',
'تتبّع مستقل للعمولات':'Independent commission tracking',

'الحملات والجهات':'Campaigns and Organizations',
'إدارة حالة الحملة':'Campaign Draft Status',
'للحماية يمكن حفظ الحملة كمسودة أو إغلاقها فقط. فتح التسجيل يتطلب مرحلة اعتماد مستقلة.':'For safety, a campaign can only be kept as a draft or closed. Opening registrations requires separate approval.',
'الحالة':'Status',
'مسودة':'Draft',
'مغلقة':'Closed',
'حفظ حالة الحملة':'Save Campaign Status',
'تم حفظ حالة الحملة دون فتح التسجيل':'Campaign status saved without opening registration',

'العودة إلى الإدارة':'Back to Management',
'إدارة الحملات والجهات':'Campaigns and Organizations',
'نظام واحد، جهات مختلفة، وإحالات معزولة. جميع الحملات الجديدة تُنشأ كمسودات، ولا تفتح التسجيل العام.':'One system, separate organizers and referrals. New campaigns start as drafts and cannot open public registration.',
'الحملات المسجلة':'Registered Campaigns',
'إضافة جهة منظمة':'Add Organizer',
'إنشاء حملة جديدة':'Create Campaign',
'تقارير معزولة بحسب الحملة':'Campaign-Scoped Reports',
'شروط العمولة لكل حملة':'Campaign Commission Terms',
'عرض تقرير هذه الحملة':'View Campaign Report',
'إنشاء حملة كمسودة':'Create Draft Campaign',
'إضافة الجهة كمسودة':'Save Draft Organizer',
'حفظ الاتفاق كمسودة مؤرشفة':'Save Audited Draft Terms',
'يتطلب دخول المالك':'Owner Sign-In Required',
'ادخل إلى لوحة الإدارة وأكمل التحقق الثنائي، ثم افتح إدارة الحملات مجددًا.':'Sign in to Management and complete two-factor verification, then reopen Campaigns.',
'دخول الإدارة':'Management Login',
'اسم الجهة':'Organizer Name',
'المعرف الإنكليزي':'English Identifier',
'الجهة المنظمة':'Organizer',
'اسم الحملة':'Campaign Name',
'رابط الحملة الداخلي (slug)':'Campaign Slug',
'موعد الحملة':'Campaign Date',
'بادئة الإحالات':'Referral Prefix',
'يُحجز الرمز 0 تلقائيًا لـ Chadi Atwi، ثم تُنشأ رموز السفراء 1 و2 و3…':'Code 0 is reserved for Chadi Atwi; ambassadors receive sequential codes 1, 2, 3…',
'هذه التقارير للمالك فقط، ولا تكشف بيانات المشاركين لجهات أخرى. لا تُعتبر قيمة العمولة إثباتًا لتحصيل الأموال.':'Reports are restricted to the owner. No other organizer receives participant data. Commissions are not evidence of collected funds.',
'اختر الحملة':'Select Campaign',
'عمولة الجهة الإجمالية ($)':'Organizer Gross Fee ($)',
'طريقة حصة A1':'A1 Fee Mode',
'مبلغ ثابت ($)':'Fixed Amount ($)',
'نسبة مئوية (%)':'Percentage (%)',
'القيمة':'Value',
'سبب تعديل الشروط':'Reason for Change',
'فصل البيانات قائم حسب الفرصة. لا توجد بعد حسابات إدارة مستقلة للجهات الخارجية، ولا اعتماد آلي للتسوية المالية أو إطلاق الحملات.':'Data is separated by campaign. External organizer logins, automated settlement and campaign publishing are not enabled.',
'الحملة':'Campaign',
'الجهة':'Organizer',
'الرمز':'Slug',
'الحالة':'Status',
'عمولة الجهة':'Organizer Gross',
'حصة A1':'A1 Fee',
'إحالة رقم صفر':'Owner Referral 0',
'السفير':'Ambassador',
'رمز الإحالة':'Referral Code',
'الزيارات':'Visits',
'التسجيلات':'Registrations',
'الاشتراكات المثبتة':'Verified Subscriptions',
'عمولات مسجلة ($)':'Recorded Commissions ($)',
'المصروف والمسجل ($)':'Recorded Payouts ($)',
'قيد التجهيز':'Pending Setup',
'تم تحميل تقرير الحملة المحددة':'Campaign report loaded',
'أُضيفت الجهة كمسودة':'Organizer added as a draft',
'تم توثيق التعديل. نصيب A1 ':'Terms recorded. A1 fee: ',
'حُفظت الحملة كمسودة. رابطك الشخصي: ':'Draft campaign created. Personal referral link: '
};
let uiLanguage='ar';let originalText=new WeakMap();
function updateLanguage(){
 document.documentElement.lang=uiLanguage;
 document.documentElement.dir=uiLanguage==='ar'?'rtl':'ltr';
 for(const [id,lang] of [['localeAr','ar'],['localeEn','en']]){
  const control=document.getElementById(id);control.setAttribute('aria-pressed',String(uiLanguage===lang));
 }
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const n=walker.currentNode,p=n.parentElement;
  if(!p||['SCRIPT','STYLE','CODE','PRE','TEXTAREA'].includes(p.tagName)||p.closest('[data-no-translate]'))continue;
  const original=originalText.get(n)??n.nodeValue;
  if(!originalText.has(n))originalText.set(n,original);
  const trimmed=original.trim();
  if(uiLanguage==='en'&&Object.hasOwn(translations,trimmed))n.nodeValue=original.replace(trimmed,translations[trimmed]);
  else if(uiLanguage==='ar')n.nodeValue=original;
 }
 const placeholders={'اسم المؤسسة':'Organization Name','اسم الجهة':'Organizer Name','تعديل عرض الجهة بعد المراجعة':'Reason for updating organizer terms'};
 for(const el of document.querySelectorAll('input[placeholder]')){
  if(!el.dataset.arPlaceholder)el.dataset.arPlaceholder=el.getAttribute('placeholder');
  el.setAttribute('placeholder',uiLanguage==='en'?(placeholders[el.dataset.arPlaceholder]??el.dataset.arPlaceholder):el.dataset.arPlaceholder);
 }
}
document.getElementById('localeAr').addEventListener('click',()=>{uiLanguage='ar';try{localStorage.setItem('a1OppsCampaignLocale','ar')}catch{}updateLanguage()});
document.getElementById('localeEn').addEventListener('click',()=>{uiLanguage='en';try{localStorage.setItem('a1OppsCampaignLocale','en')}catch{}updateLanguage()});
try{const stored=localStorage.getItem('a1OppsCampaignLocale');if(stored==='en'||stored==='ar')uiLanguage=stored}catch{}
updateLanguage();
