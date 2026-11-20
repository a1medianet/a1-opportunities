'use strict';
const $=id=>document.getElementById(id);
const strings={
en:{
 joinNav:'Join as Ambassador',welcome:'Welcome back',loginInfo:'Sign in to see your link and results.',email:'Email address',password:'Password',signIn:'Sign in',newAccount:'Not registered yet?',createAccount:'Create an ambassador account',dashboardIntro:"Share your link and track results.",
 refresh:'Refresh',logout:'Sign out',linkLabel:'YOUR PERSONAL INVITATION LINK',copy:'Copy link',share:'Share on WhatsApp',results:'Campaign results',metricNote:'Only verified activity and approved commissions count.',participants:'My participants',participant:'Participant',whatsapp:'WhatsApp click',status:'Confirmed progress',registeredAt:'Registered',commissions:'Commission history',amount:'Amount',
 linkVisits:'Link opens',registered:'Registered people',clicked:'Opened WhatsApp',join:'Confirmed group join',attendance:'Confirmed attendance',subscriptions:'Paid subscriptions',pending:'Pending approval',approved:'Approved, unpaid',paid:'Paid commissions',
 visitsNote:'Not unique visitors',registeredNote:'From your personal link',clickedNote:'Link click only',joinNote:'Confirmed by management',attendanceNote:'Confirmed by management',subsNote:'Payment verified',pendingNote:'Not yet approved',approvedNote:'Ready for payout',paidNote:'Recorded payment',
 registeredStatus:'Registered',joinedStatus:'Joined group',attendedStatus:'Attended session',enrolledStatus:'Paid subscription',
 verifyStatus:'Payment verified, awaiting commission approval',approvedStatus:'Commission approved, awaiting payout',paidStatus:'Commission paid',reversedStatus:'Reversed / refunded',
 yes:'Yes',no:'No',empty:'No participants yet. Share your personal link to start.',noSales:'No verified paid subscriptions yet.',copyOk:'Invitation link copied.',copyFailed:'Select and copy the link from the field.',needLogin:'Please sign in first.',wrongLogin:'Email, password or account status could not be verified.',refreshed:'Results updated.',welcomeName:'Hello, ',forgot:'Forgot password?',recoveryIntro:'Enter your email to reset your password.',sendRecovery:'Send recovery link',backToLogin:'Back to sign in',recoveryUnavailable:'Password recovery is not yet available. Contact the organizer.',needTurnstile:'Complete the Cloudflare verification first.',turnstileError:'Cloudflare verification could not load. Reload the page.',recoverySent:'If this email is registered, recovery instructions will be sent.'
},
ar:{
 joinNav:'تسجيل سفير جديد',welcome:'مرحبًا بعودتك',loginInfo:'ادخل لرؤية رابطك ونتائجك.',email:'البريد الإلكتروني',password:'كلمة المرور',signIn:'دخول',newAccount:'ليس لديك حساب؟',createAccount:'أنشئ حساب سفير',dashboardIntro:'شارك رابطك وتابع نتائجك.',refresh:'تحديث',logout:'تسجيل الخروج',linkLabel:'رابط الإحالة الشخصي',copy:'نسخ الرابط',share:'مشاركة واتساب',results:'نتائج الحملة',metricNote:'تُحتسب النتائج والعمولات المعتمدة فقط.',participants:'المشاركون من رابطك',participant:'المشارك',whatsapp:'فتح واتساب',status:'المرحلة المؤكدة',registeredAt:'تاريخ التسجيل',commissions:'سجل العمولات',amount:'المبلغ',
 linkVisits:'فتحات رابط الدعوة',registered:'المسجّلون',clicked:'فتحوا واتساب',join:'انضمام مؤكد',attendance:'حضور مؤكد',subscriptions:'اشتراكات مدفوعة',pending:'بانتظار الاعتماد',approved:'معتمدة غير مصروفة',paid:'عمولات مصروفة',
 visitsNote:'ليست أعداد أشخاص فريدين',registeredNote:'من رابط إحالتك',clickedNote:'فتح الرابط فقط',joinNote:'بتأكيد الإدارة',attendanceNote:'بتأكيد الإدارة',subsNote:'بعد إثبات الدفع',pendingNote:'لم تعتمد بعد',approvedNote:'جاهزة للصرف',paidNote:'صرف موثّق',
 registeredStatus:'مسجّل',joinedStatus:'انضم إلى المجموعة',attendedStatus:'حضر الجلسة',enrolledStatus:'اشتراك مدفوع',
 verifyStatus:'الدفع مثبت والعمولة تنتظر الاعتماد',approvedStatus:'العمولة معتمدة وتنتظر الصرف',paidStatus:'العمولة مصروفة',reversedStatus:'ملغاة أو مستردة',
 yes:'نعم',no:'لا',empty:'لا يوجد مشاركون حتى الآن. شارك رابطك لبدء الإحالات.',noSales:'لا توجد اشتراكات مدفوعة مثبتة بعد.',copyOk:'تم نسخ رابط الدعوة.',copyFailed:'حدّد الرابط ثم انسخه من الحقل.',needLogin:'يرجى تسجيل الدخول أولًا.',wrongLogin:'تعذّر التحقق من البريد أو كلمة المرور أو حالة الحساب.',refreshed:'تم تحديث النتائج.',welcomeName:'مرحبًا، ',forgot:'نسيت كلمة المرور؟',recoveryIntro:'أدخل بريدك لاستعادة كلمة المرور.',sendRecovery:'إرسال رابط الاستعادة',backToLogin:'العودة إلى تسجيل الدخول',recoveryUnavailable:'خدمة استعادة كلمة المرور غير متاحة بعد. تواصل مع الإدارة.',needTurnstile:'أكمل تحقق Cloudflare أولًا.',turnstileError:'تعذر تحميل تحقق Cloudflare. أعد تحميل الصفحة.',recoverySent:'إذا كان البريد مسجلًا، فستُرسل تعليمات الاستعادة إليه.'
}
};
const profileStrings={
 en:{heading:'Account details',name:'Name',phone:'WhatsApp number',savePhone:'Save WhatsApp',email:'Email address',password:'Current password (to change email)',changeEmail:'Confirm new email',phoneSaved:'WhatsApp number saved.',emailSent:'Confirmation sent to your NEW email. Your current email remains active until you confirm it.',emailConfirmed:'New email confirmed. Sign in with your new address.',emailFailed:'Email verification failed or expired.'},
 ar:{heading:'بيانات الحساب',name:'الاسم',phone:'رقم واتساب',savePhone:'حفظ واتساب',email:'البريد الإلكتروني',password:'كلمة المرور الحالية (لتغيير البريد)',changeEmail:'تأكيد البريد الجديد',phoneSaved:'تم حفظ رقم واتساب.',emailSent:'أرسلنا التأكيد إلى البريد الجديد. يبقى البريد الحالي معتمدًا حتى تأكيد التغيير.',emailConfirmed:'تم تأكيد البريد الجديد. ادخل باستخدام العنوان الجديد.',emailFailed:'تعذّر تأكيد البريد أو انتهت صلاحية الرابط.'}
};
const languageKey='a1ReferralLanguage';
let lang='en';
try{lang=localStorage.getItem(languageKey)==='ar'?'ar':'en'}catch{}
let lastData=null;
let ambassadorSecurity={turnstileEnabled:false,recoveryReady:false,siteKey:''},ambLoginToken='',ambRecoveryToken='',ambLoginWidget,ambRecoveryWidget;
let ambLoginPending=null;
function completeLoginVerification(token){
 ambLoginToken=token||'';
 loginVerificationStatus(ambLoginToken?'ready':'error');
 if(ambLoginPending){const settle=ambLoginPending;ambLoginPending=null;settle(ambLoginToken)}
}
async function getLoginVerificationToken(){
 if(!ambassadorSecurity.turnstileEnabled)return '';
 if(ambLoginToken)return ambLoginToken;
 renderAmbassadorTurnstile();
 if(ambLoginWidget===undefined||!window.turnstile)throw Error(strings[lang].turnstileError);
 loginVerificationStatus('checking');
 const token=await new Promise(resolve=>{
  let done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>{ambLoginPending=null;finish('')},60000);
  ambLoginPending=finish;
  try{window.turnstile.execute(ambLoginWidget)}catch{ambLoginPending=null;finish('')}
 });
 if(!token)throw Error(strings[lang].turnstileError);
 return token;
}

function loginVerificationStatus(state){
 const el=$('ambLoginProgress'),button=$('ambLoginRetry');if(!el||!button)return;
 const messages=lang==='ar'?{
 checking:'جارٍ التحقق الآمن من المتصفح…',ready:'التحقق مكتمل، يمكنك تسجيل الدخول.',error:'تأخر التحقق. حاول مرة أخرى أو افحص إضافات المتصفح.'
 }:{checking:'Checking browser security…',ready:'Verified. You can sign in.',error:'Verification is delayed. Retry or check browser extensions.'};
 el.textContent=messages[state]||'';
 el.dataset.state=state;
 button.hidden=state!=='error';
 button.textContent=lang==='ar'?'إعادة المحاولة':'Retry verification';
}
$('ambLoginRetry').addEventListener('click',async()=>{
 ambLoginToken='';
 try{resetAmbassadorTurnstile('login');await getLoginVerificationToken()}catch{loginVerificationStatus('error')}
});
function resetAmbassadorTurnstile(which='login'){
 try{window.turnstile?.reset(which==='login'?ambLoginWidget:ambRecoveryWidget)}catch{}
 if(which==='login')ambLoginToken='';else ambRecoveryToken='';
}
function renderAmbassadorTurnstile(){
 if(!window.turnstile||!ambassadorSecurity.turnstileEnabled||!ambassadorSecurity.siteKey)return;
 const loginEl=$('ambassadorLoginTurnstile');loginEl.hidden=false;
 if(ambLoginWidget===undefined)ambLoginWidget=window.turnstile.render('#ambassadorLoginTurnstile',{
  sitekey:ambassadorSecurity.siteKey,appearance:'interaction-only',execution:'execute',action:'ambassador_login',callback:t=>completeLoginVerification(t),
  'expired-callback':()=>{ambLoginToken=''},'timeout-callback':()=>completeLoginVerification(''), 'error-callback':()=>{completeLoginVerification('');return true}
 });
 if(!$('ambassadorRecoveryForm').hidden&&ambRecoveryWidget===undefined)ambRecoveryWidget=window.turnstile.render('#ambassadorRecoveryTurnstile',{
  sitekey:ambassadorSecurity.siteKey,action:'ambassador_recovery',callback:t=>ambRecoveryToken=t,
  'expired-callback':()=>ambRecoveryToken='', 'error-callback':()=>{ambRecoveryToken='';$('ambassadorRecoveryMessage').textContent=strings[lang].turnstileError;}
 });
}
window.a1AmbassadorTurnstileLoaded=renderAmbassadorTurnstile;
fetch('/api/ambassador/security/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
 if(!data)return;ambassadorSecurity=data;loginVerificationStatus('');renderAmbassadorTurnstile();
 let retry=0;const timer=setInterval(()=>{renderAmbassadorTurnstile();if(ambLoginWidget!==undefined||++retry>=40){clearInterval(timer);if(ambLoginWidget===undefined)loginVerificationStatus('')}},250);
}).catch(()=>{});
const money=n=>(Number(n||0)/100).toFixed(2)+' USD';
function translate(){
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-profile-i18n]').forEach(el=>{el.textContent=profileStrings[lang][el.dataset.profileI18n]||''});
 if($('ambLoginProgress').dataset.state)loginVerificationStatus($('ambLoginProgress').dataset.state);
 for(const el of document.querySelectorAll('[data-i18n]')){const k=el.dataset.i18n;if(strings[lang][k])el.textContent=strings[lang][k]}
 document.querySelectorAll('#switchLanguage [data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===lang)));
 $('loginPassword').placeholder=lang==='ar'?'كلمة مرور حسابك':'Your account password';
 document.title=lang==='ar'?'لوحة السفير | LinkTutor Pro®':'Ambassador Dashboard | LinkTutor Pro®';
 if(lastData)render(lastData);
}
$('switchLanguage').addEventListener('click',event=>{const btn=event.target.closest('button[data-lang]');if(!btn||btn.dataset.lang===lang)return;lang=btn.dataset.lang;try{localStorage.setItem(languageKey,lang)}catch{}translate()});
const column=(row,val)=>{const cell=document.createElement('td');cell.textContent=String(val??'');row.append(cell)};
function metric(label,value,note){
 const box=document.createElement('div');box.className='metric';
 const a=document.createElement('small');a.textContent=strings[lang][label];
 const b=document.createElement('strong');b.textContent=String(value);
 const c=document.createElement('span');c.textContent=strings[lang][note];
 box.append(a,b,c);return box;
}
function render(d){
 lastData=d;
 $('greeting').textContent=strings[lang].welcomeName+(d.profile?.nameEn||d.name);
 $('referralLink').value=location.origin+d.inviteUrl;
 $('profileName').textContent=d.profile?.nameEn||d.name||'';
$('greetingPhone').textContent=d.profile?.phone||'';
 $('profilePhone').value=d.profile?.phone||'';
 $('profileEmail').value=d.profile?.email||'';

 const s=d.summary||{};
 $('metrics').replaceChildren(
 metric('linkVisits',d.linkVisits||0,'visitsNote'),
 metric('registered',s.registered||0,'registeredNote'),
 metric('clicked',s.clickedWhatsApp||0,'clickedNote'),
 metric('join',s.confirmedJoin||0,'joinNote'),
 metric('attendance',s.attended||0,'attendanceNote'),
 metric('subscriptions',s.subscriptions||0,'subsNote'),
 metric('pending',money(s.pendingApprovalCents),'pendingNote'),
 metric('approved',money(s.approvedUnpaidCents),'approvedNote'),
 metric('paid',money(s.paidCents),'paidNote'));
 const translation=strings[lang];
 const pNames=new Map((d.participants||[]).map(x=>[x.id,x.name]));
 $('participantRows').replaceChildren();
 for(const p of d.participants||[]){
   const tr=document.createElement('tr');
   const base={registered:'registeredStatus',joined:'joinedStatus',attended:'attendedStatus',enrolled:'enrolledStatus'};
   const phases=[translation[base[p.status]]||p.status,p.confirmedJoin?translation.join:'',p.confirmedAttendance?translation.attendance:''].filter(Boolean).join(' · ');
   for(const value of [p.name,p.clickedWhatsApp?translation.yes:translation.no,phases,p.registered_at])column(tr,value);
   $('participantRows').append(tr);
 }
 if(!d.participants?.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent=translation.empty;tr.append(td);$('participantRows').append(tr)}
 $('commissionRows').replaceChildren();
 for(const item of d.sales||[]){
  const tr=document.createElement('tr');
  const map={verified:'verifyStatus',approved:'approvedStatus',paid:'paidStatus',reversed:'reversedStatus'};
  for(const value of [pNames.get(item.participant_id)||translation.participant,money(item.commission_cents),translation[map[item.status]]||item.status])column(tr,value);
  $('commissionRows').append(tr);
 }
 if(!d.sales?.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent=translation.noSales;tr.append(td);$('commissionRows').append(tr)}
}
async function show(){
 const r=await fetch('/api/ambassador/me',{credentials:'same-origin',cache:'no-store'});
 if(!r.ok)throw Error(strings[lang].needLogin);
 const d=await r.json();$('loginPanel').hidden=true;$('dashboard').hidden=false;render(d);
}
$('emailLogin').addEventListener('submit',async event=>{
 event.preventDefault();$('loginMessage').textContent='';$('signInButton').disabled=true;
 try{
  if(ambassadorSecurity.turnstileEnabled)await getLoginVerificationToken();
  const r=await fetch('/api/ambassador/login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:$('loginEmail').value.trim(),password:$('loginPassword').value,turnstileToken:ambLoginToken})});
  if(!r.ok)throw Error(strings[lang].wrongLogin);
  $('loginPassword').value='';
  await show();
 }catch(e){$('loginMessage').textContent=e.message||strings[lang].wrongLogin}
 finally{resetAmbassadorTurnstile('login');$('signInButton').disabled=false}
});
const profileRequest=async(path,body)=>{
 const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Unable to save changes.');
 return data;
};
$('updatePhoneForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('updatePhoneForm').querySelector('button');button.disabled=true;$('phoneStatus').textContent='';
 try{await profileRequest('/api/ambassador/profile/phone',{phone:$('profilePhone').value});await show();$('phoneStatus').textContent=profileStrings[lang].phoneSaved}
 catch(error){$('phoneStatus').textContent=error.message}
 finally{button.disabled=false}
});
$('requestEmailChangeForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('requestEmailChangeForm').querySelector('button');button.disabled=true;$('emailStatus').textContent='';
 try{await profileRequest('/api/ambassador/profile/email/request',{email:$('profileEmail').value,password:$('profilePassword').value});$('profilePassword').value='';$('emailStatus').textContent=profileStrings[lang].emailSent}
 catch(error){$('emailStatus').textContent=error.message}
 finally{button.disabled=false}
});
(async()=>{
 const params=new URLSearchParams(location.search);
 const token=params.get('email-change');
 if(!token)return;
 history.replaceState({},'',location.pathname);
 if(!/^[-_A-Za-z0-9]{43}$/.test(token)){$('loginMessage').textContent=profileStrings[lang].emailFailed;return}
 try{
  await profileRequest('/api/ambassador/profile/email/confirm',{token});
  $('loginMessage').textContent=profileStrings[lang].emailConfirmed;
 }catch(error){$('loginMessage').textContent=profileStrings[lang].emailFailed+' '+error.message}
})();
$('refresh').addEventListener('click',async()=>{try{await show();$('dashboardMessage').textContent=strings[lang].refreshed}catch(e){$('dashboardMessage').textContent=e.message}});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('referralLink').value);$('linkMessage').textContent=strings[lang].copyOk}catch{$('referralLink').select();$('linkMessage').textContent=strings[lang].copyFailed}});
$('share').addEventListener('click',()=>window.open('https://wa.me/?text='+encodeURIComponent('LinkTutor Pro · '+$('referralLink').value),'_blank','noopener,noreferrer'));
$('logout').addEventListener('click',async()=>{await fetch('/api/ambassador/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});lastData=null;$('dashboard').hidden=true;$('loginPanel').hidden=false;$('loginPassword').value=''});
translate();if(!new URLSearchParams(location.search).has('email-change'))show().catch(()=>{});

$('forgotAmbassadorPassword').addEventListener('click',()=>{
 $('ambassadorRecoveryMessage').textContent='';
 if(!ambassadorSecurity.recoveryReady){$('ambassadorRecoveryMessage').textContent=strings[lang].recoveryUnavailable;return}
 $('emailLogin').hidden=true;$('ambassadorRecoveryForm').hidden=false;
 $('forgotAmbassadorPassword').hidden=true;
 $('ambassadorRecoveryEmail').value=$('loginEmail').value.trim();
 renderAmbassadorTurnstile();
});
$('cancelAmbassadorRecovery').addEventListener('click',()=>{
 $('emailLogin').hidden=false;$('ambassadorRecoveryForm').hidden=true;
 $('forgotAmbassadorPassword').hidden=false;
 $('ambassadorRecoveryMessage').textContent='';
 resetAmbassadorTurnstile('recovery');
});
$('ambassadorRecoveryForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const message=$('ambassadorRecoveryMessage');message.textContent='';
 if(!ambassadorSecurity.recoveryReady){message.textContent=strings[lang].recoveryUnavailable;return}
 if(ambassadorSecurity.turnstileEnabled&&!ambRecoveryToken){message.textContent=strings[lang].needTurnstile;return}
 const button=$('ambassadorRecoveryForm').querySelector('button[type=submit]');button.disabled=true;
 try{
  const response=await fetch('/api/ambassador/recovery/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('ambassadorRecoveryEmail').value.trim(),turnstileToken:ambRecoveryToken})});
  if(!response.ok)throw Error(strings[lang].recoveryUnavailable);
  message.textContent=strings[lang].recoverySent;
 }catch(error){message.textContent=error.message}
 finally{resetAmbassadorTurnstile('recovery');button.disabled=false}
});
