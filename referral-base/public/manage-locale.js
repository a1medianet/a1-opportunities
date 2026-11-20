'use strict';
/*
 * LinkTutor Pro management interface locale.
 * Text-only translations: customer-generated records, IDs, and financial data remain untouched.
 * No translation service, network calls, or cross-tenant state.
 */
(()=>{
 const dictionary={
 'Ambassador Operations':'إدارة برنامج السفراء',
 'LINKTUTOR PRO · ORGANIZER':'لينك تيوتر برو · الإدارة',
 'Management Sign In':'تسجيل دخول الإدارة',
 'Sign In':'دخول',
 'Forgot password?':'نسيت كلمة المرور؟',
 'Enter the 6-digit code from your authenticator app, or a one-time recovery code.':'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة أو أحد رموز الاسترداد الاحتياطية.',
 'Verification code':'رمز التحقق',
 'Verify and Sign In':'التحقق والدخول',
 'Back':'رجوع',
 'A private reset link will be sent to your registered email when secure email recovery is configured.':'سنرسل رابطًا آمنًا لإعادة تعيين كلمة المرور إلى بريدك المسجّل عند تفعيل خدمة الاسترداد.',
 'Account email':'البريد الإلكتروني للحساب',
 'Send Recovery Link':'إرسال رابط الاسترداد',
 'Back to Sign In':'العودة إلى تسجيل الدخول',
 'LINKTUTOR PRO · AMBASSADOR PROGRAM':'لينك تيوتر برو · برنامج السفراء',
 'Referral Management':'إدارة الإحالات',
 'Manage invitations, participants, verified conversions and commission payouts.':'إدارة الدعوات والمشاركين والاشتراكات المؤكدة والعمولات المصروفة.',
 'Sign Out':'تسجيل الخروج',
 'Applications':'طلبات السفراء',
 'Ambassadors':'السفراء',
 'Participants':'المشاركون',
 'Commissions':'العمولات',
 'Campaign Settings':'إعدادات الحملة',
 'Refresh':'تحديث',
 'Ambassador Applications':'طلبات انضمام السفراء',
 'New ambassadors appear here after registration. Email verification activates their account and personal referral link.':'تظهر طلبات السفراء الجديدة هنا. يُفعّل الحساب ورابط الإحالة بعد تأكيد البريد الإلكتروني.',
 'Full Name':'الاسم الكامل',
 'Email / Login':'البريد الإلكتروني / الدخول',
 'Country':'الدولة',
 'Phone':'الهاتف',
 'Campaign':'الحملة',
 'Email Verification':'تأكيد البريد',
 'Invitation':'رابط الدعوة',
 'Passwords are never shown to management. Reset access through the secure account recovery process when enabled.':'لا تظهر كلمات المرور للإدارة. تُستعاد صلاحية الدخول من خلال الاسترداد الآمن عند تفعيله.',
 'Monitor personal links, total registrations, and access status. Suspend an account without erasing its referral history.':'متابعة الروابط الشخصية والتسجيلات وحالة الحساب. يمكن تعليق الحساب دون حذف سجل الإحالات.',
 'Show inactive':'عرض غير النشطين',
 'Ambassador':'السفير',
 'Status':'الحالة',
 'Registered Participants':'المشاركون المسجلون',
 'Personal Link':'الرابط الشخصي',
 'Actions':'الإجراءات',
 'Participants & Referral Journey':'المشاركون ورحلة الإحالة',
 'A WhatsApp link click is not membership confirmation. Attendance and payment are independently verified.':'فتح رابط واتساب لا يثبت الانضمام. يتم تأكيد الحضور والدفع بشكل مستقل.',
 'Export CSV':'تصدير CSV',
 'All participants':'جميع المشاركين',
 'Registered':'مسجّل',
 'Clicked destination':'فتح رابط الوجهة',
 'Confirmed group join':'انضمام مؤكد للمجموعة',
 'Confirmed attendance':'حضور مؤكد',
 'Verified paid subscription':'اشتراك مدفوع مؤكّد',
 'Participant':'المشارك',
 'WhatsApp':'واتساب',
 'Inviter':'المحيل',
 'Destination':'الوجهة',
 'Evidence / Status':'الإثبات / الحالة',
 'Verified Subscriptions & Commissions':'الاشتراكات والعمولات المؤكدة',
 'Record the payment reference and receipt evidence first. Commission approval and payout are separate steps.':'سجّل مرجع الدفع وإثبات الإيصال أولًا. اعتماد العمولة وصرفها عمليتان منفصلتان.',
 'Participant ID':'رقم المشارك',
 'Payment Reference':'مرجع الدفع',
 'Evidence / Receipt Reference':'مرجع الإثبات / الإيصال',
 'Subscription Amount (USD)':'قيمة الاشتراك (USD)',
 'Commission (USD)':'العمولة (USD)',
 'Verify Paid Subscription':'تأكيد الاشتراك المدفوع',
 'Subscription':'الاشتراك',
 'Commission':'العمولة',
 'Current Status':'الحالة الحالية',
 'Campaign Destination':'وجهة الحملة',
 'Participants receive the official link after completing the registration form. Public registration remains closed until the organizer approves it.':'يحصل المشاركون على الرابط الرسمي بعد إكمال التسجيل. ويبقى التسجيل العام مغلقًا حتى موافقة الإدارة.',
 'Destination Type':'نوع الوجهة',
 'WhatsApp group':'مجموعة واتساب',
 'Approved external link':'رابط خارجي معتمد',
 'WhatsApp Group Link':'رابط مجموعة واتساب',
 'Approved Custom URL':'الرابط المخصص المعتمد',
 'Organizer approved':'موافقة الجهة المنظمة',
 'Open participant registration':'فتح تسجيل المشاركين',
 'Save Campaign Settings':'حفظ إعدادات الحملة',
 'Custom links are accepted only from explicitly approved HTTPS domains. Never redirect visitors before their registration is saved.':'تُقبل الروابط المخصصة من نطاقات HTTPS المعتمدة فقط. لا يُحوَّل الزائر قبل حفظ تسجيله.',
 'Ambassador Registration Control':'التحكم بتسجيل السفراء',
 'Open, close or schedule Create Ambassador Account independently from participant registration. Default is closed.':'افتح أو أغلق أو جدول تسجيل السفراء بشكل مستقل عن تسجيل المشاركين. الإعداد الافتراضي مغلق.',
 'Registration Mode':'وضع التسجيل',
 'Enable Create Ambassador Account on homepage':'إظهار نموذج إنشاء حساب سفير في الصفحة الرئيسية',
 'Closed':'مغلق',
 'Open now (requires all production gates)':'فتح الآن (يتطلب اكتمال شروط الحماية)',
 'Schedule opening':'جدولة الفتح',
 'Opening date and time (your browser timezone)':'تاريخ ووقت الفتح (حسب المنطقة الزمنية في المتصفح)',
 'Save registration control':'حفظ إعداد التسجيل',
 'WhatsApp Group Pool':'إدارة مجموعات واتساب',
 'Give each group a name, URL and admission limit. Active groups are selected by priority. Mark FULL or CLOSED immediately when it cannot accept participants. Link clicks are not actual confirmed members.':'سمِّ كل مجموعة وحدد رابطها وسعتها وأولويتها. تُختار المجموعات الفعالة بالترتيب؛ غيّر الحالة إلى ممتلئة أو مغلقة عند عدم استقبال أعضاء جدد. فتح الرابط لا يثبت الانضمام.',
 'Group name':'اسم المجموعة',
 'WhatsApp invite URL':'رابط دعوة واتساب',
 'Capacity / admission limit':'السعة / حد استقبال الدعوات',
 'Reported current members':'الأعضاء الحاليون بحسب الإدارة',
 'Priority (lower first)':'الأولوية (الأصغر أولًا)',
 'Add group (draft)':'إضافة مجموعة (مسودة)',
 'Group':'المجموعة',
 'URL':'الرابط',
 'Capacity':'السعة',
 'Reported members':'الأعضاء المبلّغ عنهم',
 'Assigned links':'الروابط المخصصة',
 'Priority':'الأولوية',
 'Save':'حفظ',
 'DRAFT':'مسودة',
 'ACTIVE':'فعّالة',
 'FULL':'ممتلئة',
 'CLOSED':'مغلقة',
 'No WhatsApp groups have been added.':'لم تُضَف مجموعات واتساب بعد.',
 'Test Invite':'دعوة اختبار',
 'Private Ambassador Test Invitation':'دعوة اختبار سفير خاصة',
 'Create a single-use, one-hour invitation for one email without opening public registration. Verified email and organizer-published terms are required.':'أنشئ دعوة خاصة لبريد واحد، تُستخدم مرة واحدة خلال ساعة، دون فتح التسجيل للعامة. يلزم التأكد من البريد واعتماد الشروط ونشرها من الإدارة.',
 'Tester email address':'بريد السفير المجرّب',
 'Create private invitation':'إنشاء دعوة اختبار خاصة',
 'Copy this link privately. It is valid only for the email above, expires after one hour, and can be used once.':'انسخ الرابط بصورة خاصة؛ يصلح للبريد المحدد فقط ولمرة واحدة خلال ساعة.',
 'Copy invitation link':'نسخ رابط الدعوة',
  'Ambassador Signup':'تسجيل السفراء',
 'WhatsApp Groups':'مجموعات واتساب',
 'Terms & Privacy':'الشروط والخصوصية',
 'Program Terms & Privacy':'شروط البرنامج وإشعار الخصوصية',
 'Edit English and Arabic content independently. Saving a draft does not publish it or open registration.':'يمكنك تعديل النصين الإنجليزي والعربي بصورة مستقلة؛ حفظ المسودة لا ينشرها ولا يفتح التسجيل.',
 'English terms':'الشروط بالإنجليزية',
 'Arabic terms':'الشروط بالعربية',
 'Save draft':'حفظ المسودة',
 'I reviewed EN and AR separately and approve publication of both saved versions.':'راجعت النصين بالتبديل بين AR وEN وأوافق على نشر النسختين المحفوظتين.',
 'Publish approved wording':'نشر النص المعتمد',
 'Publication updates the public wording. Ambassador registration remains subject to separate security, email and organizer approval gates.':'يحدّث النشر نص الشروط العام، وتبقى إمكانية تسجيل السفراء خاضعة لشروط حماية البريد والموافقة المنفصلة.',
 'Account Security':'أمان الحساب',
 'Manage two-step verification for the organizer. Use an authenticator app, and keep backup codes in a safe place.':'إدارة التحقق بخطوتين لحساب الإدارة. استخدم تطبيق مصادقة واحفظ رموز الاسترداد في مكان آمن.',
 'Checking security settings...':'جارٍ التحقق من إعدادات الأمان...',
 'Confirm your current password':'أكّد كلمة المرور الحالية',
 'Set Up Two-Step Verification':'إعداد التحقق بخطوتين',
 'Scan this code in your authenticator app, or enter the secret manually. The setup expires in 10 minutes.':'امسح رمز QR بتطبيق المصادقة أو أدخل المفتاح يدويًا. تنتهي صلاحية الإعداد خلال 10 دقائق.',
 'Manual setup key:':'مفتاح الإعداد اليدوي:',
 '6-digit code':'رمز من 6 أرقام',
 'Enable Two-Step Verification':'تفعيل التحقق بخطوتين',
 'Two-step verification is active. Your password alone will no longer sign in to the administration.':'التحقق بخطوتين مفعّل. لن تكفي كلمة المرور وحدها لدخول الإدارة.',
 'Disable two-step verification':'تعطيل التحقق بخطوتين',
 'Current password':'كلمة المرور الحالية',
 'Authenticator or recovery code':'رمز المصادقة أو الاسترداد',
 'Disable (requires verification)':'تعطيل (يتطلب التحقق)',
 'Save these recovery codes now. They will not be shown again.':'احفظ رموز الاسترداد الآن؛ لن تُعرض مرة أخرى.',
 'I Saved My Recovery Codes':'حفظت رموز الاسترداد',
 'Change management password':'تغيير كلمة مرور الإدارة',
 'New password':'كلمة المرور الجديدة',
 'Authenticator or backup code (if enabled)':'رمز المصادقة أو الرمز الاحتياطي (إن كان مفعّلًا)',
 'Change Password and Sign Out All Sessions':'تغيير كلمة المرور وإنهاء كل الجلسات',
 'Admin email':'البريد الإلكتروني للإدارة',
 'Password':'كلمة المرور',
 'Email address':'البريد الإلكتروني',
 'Search name, phone or inviter...':'ابحث بالاسم أو الهاتف أو المحيل...',
 'Ambassador Applications':'طلبات السفراء',
 'Registered account requests':'طلبات إنشاء الحسابات',
 'Active Ambassadors':'السفراء النشطون',
 'Active referral links':'روابط إحالة فعّالة',
 'Attributed by personal link':'مسجّلون عبر روابط شخصية',
 'WhatsApp Link Clicks':'فتح رابط واتساب',
 'Does not confirm membership':'لا يثبت الانضمام للمجموعة',
 'Confirmed Group Joins':'المنضمون المؤكدون للمجموعة',
 'Verified by organizer':'أكدته الإدارة',
 'Verified Paid Subscriptions':'الاشتراكات المدفوعة المؤكدة',
 'Requires payment evidence':'يتطلب إثبات الدفع',
 'Recorded Commissions':'العمولات المسجّلة',
 'Verified paid referrals':'إحالات مدفوعة مثبتة',
 'Paid Out':'المبالغ المصروفة',
 'Payout recorded':'صرف مسجّل',
 'Verified':'تم التأكيد',
 'Pending verification':'بانتظار تأكيد البريد',
 'Not activated yet':'غير مفعّل بعد',
 'Active':'نشط',
 'Suspended':'معلّق',
 'Pending':'معلّق للمراجعة',
 'Suspend':'تعليق',
 'Activate':'تفعيل',
 'Opened link':'فتح الرابط',
 'Not clicked':'لم يفتح',
 'Group member confirmed':'انضمام مؤكد للمجموعة',
 'Attendance confirmed':'حضور مؤكّد',
 'Paid subscription verified':'اشتراك مدفوع مؤكّد',
 'Confirm joining':'تأكيد الانضمام',
 'Confirm attendance':'تأكيد الحضور',
 'Verify subscription':'إثبات الاشتراك',
 'Payment verified · approval pending':'الدفع مؤكّد · بانتظار اعتماد العمولة',
 'Commission approved':'العمولة معتمدة',
 'Reversed / refunded':'ملغى / مسترد',
 'Approve':'اعتماد',
 'Record payout':'تسجيل الصرف',
 'Refund / Reverse':'إلغاء / استرداد',
 'No ambassador applications yet.':'لا توجد طلبات سفراء بعد.',
 'No active ambassadors yet. Verified applications will appear here.':'لا يوجد سفراء نشطون بعد. ستظهر الطلبات المؤكدة هنا.',
 'No participants match these filters.':'لا يوجد مشاركون مطابقون للبحث.',
 'No verified paid subscriptions yet.':'لا توجد اشتراكات مدفوعة مؤكدة بعد.',
 'Update saved.':'تم حفظ التعديل.',
 'Data refreshed.':'تم تحديث البيانات.',
 'Participant registration is OPEN.':'تسجيل المشاركين مفتوح.',
 'Participant registration is CLOSED.':'تسجيل المشاركين مغلق.',
 'Enter valid amounts.':'أدخل مبالغ صحيحة.',
 'Paid subscription verified. Commission awaits approval.':'تم إثبات الاشتراك المدفوع، والعمولة بانتظار الاعتماد.',
 'Campaign settings saved.':'تم حفظ إعدادات الحملة.',
 'Access denied. Please sign in again.':'تم رفض الوصول. سجّل الدخول مجددًا.',
 'Request could not be completed.':'تعذّر إكمال الطلب.',
 'Too many attempts. Please try again later.':'محاولات كثيرة جدًا. حاول لاحقًا.',
 'Too many attempts. Try again later.':'محاولات كثيرة جدًا. حاول لاحقًا.',
 'Invalid email or password.':'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
 'Sign-in failed.':'فشل تسجيل الدخول.',
 'Complete the Cloudflare verification first.':'أكمل التحقق من Cloudflare أولًا.',
 'Security verification is temporarily unavailable.':'التحقق الأمني غير متاح مؤقتًا.',
 'Invalid or previously used verification code.':'رمز التحقق غير صالح أو مستخدم سابقًا.',
 'Unable to complete request.':'تعذّر تنفيذ الطلب.',
 'Two-step verification: ON':'التحقق بخطوتين: مفعّل',
 'Two-step verification: OFF':'التحقق بخطوتين: غير مفعّل',
 'Authenticator setup available':'إعداد تطبيق المصادقة متاح',
 'Encryption key not configured':'مفتاح التشفير غير مُعدّ',
 'Two-step verification enabled. Save your backup codes now; your session has been revoked.':'تم تفعيل التحقق بخطوتين. احفظ رموز الاسترداد؛ انتهت جلستك الحالية.',
 'Sign in again with your password and authenticator code.':'سجّل الدخول مجددًا بكلمة المرور ورمز المصادقة.',
 'Two-step verification disabled. Please sign in again.':'تم تعطيل التحقق بخطوتين. سجّل الدخول مجددًا.',
 'Password changed and all sessions revoked. Sign in with the new password.':'تم تغيير كلمة المرور وإنهاء كل الجلسات. سجّل الدخول بالكلمة الجديدة.',
 'Use at least 12 characters, including letters and numbers.':'استخدم 12 حرفًا على الأقل، تشمل أحرفًا وأرقامًا.',
 'Complete Cloudflare verification first.':'أكمل التحقق من Cloudflare أولًا.',
 'If recognized, recovery instructions will be sent.':'إذا كان الحساب مسجّلًا، فستُرسل تعليمات الاسترداد.',
 'If this email is registered, recovery instructions will be sent.':'إذا كان البريد مسجّلًا، فستُرسل تعليمات الاسترداد.',
 'Recovery is not available until the administrator configures verified SMTP and Cloudflare Turnstile.':'الاسترداد غير متاح حتى إعداد بريد SMTP والتحقق من Cloudflare Turnstile.',
 '© 2026 LinkTutor Pro. All rights reserved.':'© 2026 LinkTutor Pro. All rights reserved.'
 };
 const reverse=Object.fromEntries(Object.entries(dictionary).map(([en,ar])=>[ar,en]));
 const localeKey='a1ReferralLanguage';
 let language=location.hostname==='opps.a1net.tech'?'ar':'en';
 try{const selected=localStorage.getItem(localeKey);if(selected==='ar'||selected==='en')language=selected}catch{}
 const translate=value=>{
   const trimmed=String(value??'').trim();
   if(!trimmed)return String(value??'');
   const en=Object.hasOwn(dictionary,trimmed)?trimmed:reverse[trimmed];
   if(!en)return String(value??'');
   const result=language==='ar'?dictionary[en]:en;
   return String(value).replace(trimmed,result);
 };
 const dynamic=(text)=>{
   const source=String(text??'');
   if(language==='en')return source;
   let m=/^(\d+) applications$/.exec(source);
   if(m)return m[1]+' طلبات';
   m=/^Showing (\d+) of the latest (\d+) participants\.$/.exec(source);
   if(m)return 'عرض '+m[1]+' من آخر '+m[2]+' مشاركين.';
   m=/^(\d+) backup codes remaining$/.exec(source);
   if(m)return m[1]+' رموز استرداد متبقية';
   return translate(source);
 };
 const elementsToSkip=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
 let translating=false;
 function translateNode(root){
  if(!root||root.nodeType===9)root=document.body;
  if(!root)return;
  const nodes=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const p=node.parentElement;
   if(!p||elementsToSkip.has(p.tagName)||p.closest('[data-no-translate]'))continue;
   const original=node.nodeValue;
   const target=dynamic(original);
   if(target!==original)node.nodeValue=target;
  }
  const elements=(root.nodeType===1?[root,...root.querySelectorAll('input,select,button,img,a')]:document.querySelectorAll('input,select,button,img,a'));
  for(const el of elements){
   for(const attr of ['placeholder','aria-label','title']){
    const value=el.getAttribute(attr);
    if(!value)continue;
    const target=translate(value);
    if(value!==target)el.setAttribute(attr,target);
   }
  }
 }
 function paint(){
  document.querySelectorAll('[data-policy-locale]').forEach(field=>{
   field.hidden=field.dataset.policyLocale!==language;
  });
  document.documentElement.lang=language;
  document.documentElement.dir=language==='ar'?'rtl':'ltr';
  document.title=language==='ar'?'إدارة برنامج السفراء | LinkTutor Pro®':'Ambassador Management | LinkTutor Pro®';
  document.querySelectorAll('[data-locale]').forEach(btn=>{
   const active=btn.dataset.locale===language;
   btn.setAttribute('aria-pressed',String(active));
   btn.classList.toggle('active',active);
  });
  translating=true;
  try{translateNode(document.body)}finally{translating=false}
 }
 function change(next){
  if(next!=='en'&&next!=='ar')return;
  language=next;
  try{localStorage.setItem(localeKey,language)}catch{}
  paint();
 }
 document.querySelectorAll('[data-locale]').forEach(btn=>btn.addEventListener('click',()=>change(btn.dataset.locale)));
 paint();
 let queued=false;
 const observer=new MutationObserver(records=>{
  if(translating||queued)return;
  if(!records.some(r=>r.type==='childList'||r.type==='characterData'))return;
  queued=true;
  queueMicrotask(()=>{
   queued=false;
   if(translating)return;
   translating=true;
   try{translateNode(document.body)}finally{translating=false}
  });
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 window.a1ManagerLocale={language:()=>language,t:dynamic,change};
})();
