'use strict';
const $=id=>document.getElementById(id);
const labels={
en:{
program:'Ambassador Program',signin:'Sign In',pill:'LINKTUTOR PRO · AMBASSADOR NETWORK',
headline:'Share. Track. Earn.',heroLead:'Share LinkTutor Pro and track your referrals.',
point1:'Your personal link',point2:'Track registrations',point3:'Confirmed commissions',
eventTitle:'Free online introduction',eventDetail:'Saturday, 28 November 2026 · 7:00 PM Beirut time · Zoom',
disclaimer:'Commission applies only to verified paid subscriptions after approval.',
apply:'BECOME AN AMBASSADOR',formHeading:'Create your account',formIntro:'Enter your details to get your link.',
fullName:'Full Name',email:'Email address',country:'Country',phone:'WhatsApp (with country code)',password:'Create password',chooseCountry:'Select country',
selectCampaign:'Select your campaign',loadingCampaign:'Loading campaigns...',terms:'I agree to the program terms, privacy notice and contact about this opportunity.',
security:'Registration protected by Cloudflare Turnstile',submit:'Create ambassador account',already:'Already registered?',signInLink:'Sign in to your dashboard',
successTitle:'Check your email',successText:'We sent an activation link. Open it to activate your account.',
localEmail:'Local preview: no email is sent. Use this activation link to check the experience on Thaghr.',activateNow:'Verify email in local preview',
stepsHeading:'How it works',stepTitle1:'Register and verify',stepText1:'Register and verify your email.',
stepTitle2:'Share your link',stepText2:'Share your referral link.',
stepTitle3:'Track your results',stepText3:'Track your results.',footer:'© 2026 LinkTutor Pro. All rights reserved.',
submitting:'Checking your registration...',errorVerify:'Complete the Cloudflare verification first.',errorNetwork:'Unable to submit. Please check your connection.',
notReady:'Ambassador registration will open soon. Please contact the organizer.',closedHeading:'Registration is closed',closedExplanation:'Already an ambassador? Sign in.',previewHeading:'Ambassador registration preview',previewExplanation:'Preview only. Registration is not open.',previewNotice:'Preview only — the registration form is not active. Cloudflare verification will appear when authorized registration is enabled.',privateTestNotice:'Private invitation only. Public registration is closed.',readTerms:'Terms & privacy',select:'Select campaign',successGeneric:'Registration submitted.'
},
ar:{
program:'برنامج السفراء',signin:'\u062f\u062e\u0648\u0644',pill:'LINKTUTOR PRO · برنامج السفراء',
headline:'شارك. تابع. اربح.',heroLead:'شارك LinkTutor Pro وتابع إحالاتك.',
point1:'رابطك الخاص',point2:'متابعة التسجيلات',point3:'العمولات المعتمدة',
eventTitle:'لقاء تعريفي مجاني عبر الإنترنت',eventDetail:'السبت 28 نوفمبر 2026 · الساعة 7 مساءً بتوقيت بيروت · Zoom',
disclaimer:'تُحتسب العمولة بعد إثبات الاشتراك المدفوع واعتماده.',
apply:'انضم إلى برنامج السفراء',formHeading:'أنشئ حسابك كسفير',formIntro:'أدخل بياناتك للحصول على رابطك.',
fullName:'الاسم الكامل',email:'البريد الإلكتروني',country:'الدولة',phone:'واتساب (مع رمز الدولة)',password:'أنشئ كلمة مرور',chooseCountry:'اختر الدولة',
selectCampaign:'اختر الحملة',loadingCampaign:'جارٍ تحميل الحملات...',terms:'أوافق على شروط البرنامج والخصوصية والتواصل بشأن هذه الفرصة.',
security:'التسجيل محمي بواسطة Cloudflare Turnstile',submit:'إنشاء حساب سفير',already:'لديك حساب؟',signInLink:'ادخل إلى لوحة السفير',
successTitle:'تحقق من بريدك',successText:'أرسلنا رابط التفعيل إلى بريدك. افتحه لتفعيل الحساب.',
localEmail:'معاينة محلية: لن تُرسل رسالة بريد حقيقية. استخدم رابط التفعيل أدناه لتجربة الخطوات على Thaghr.',activateNow:'تفعيل البريد في المعاينة المحلية',
stepsHeading:'كيف يعمل؟',stepTitle1:'سجّل وفعّل بريدك',stepText1:'سجّل وأكّد بريدك.',
stepTitle2:'شارك رابطك',stepText2:'شارك رابط إحالتك.',
stepTitle3:'تابع نتائجك',stepText3:'تابع نتائجك.',footer:'© 2026 LinkTutor Pro. All rights reserved.',
submitting:'جارٍ التحقق من تسجيلك...',errorVerify:'أكمل التحقق الأمني من Cloudflare أولًا.',errorNetwork:'تعذّر التسجيل. تحقق من اتصال الإنترنت.',
notReady:'سيفتح تسجيل السفراء قريبًا. يُرجى التواصل مع الإدارة.',closedHeading:'التسجيل مغلق حاليًا',closedExplanation:'لديك حساب سفير؟ ادخل إليه.',previewHeading:'معاينة تسجيل السفراء',previewExplanation:'معاينة فقط. التسجيل غير متاح.',previewNotice:'معاينة فقط — التسجيل غير مفعّل. سيظهر تحقق Cloudflare عند السماح بالتسجيل.',privateTestNotice:'دعوة خاصة فقط. التسجيل العام مغلق.',readTerms:'الشروط والخصوصية',select:'اختر الحملة',successGeneric:'تم إرسال الطلب.'
}};
const languageKey='a1ReferralLanguage';
let lang='en';
try{lang=localStorage.getItem(languageKey)==='ar'?'ar':'en'}catch{}
let ready=false;
let signupAvailabilityState=false;
const managerPreview = new URLSearchParams(location.search).get('preview') === '1';
let widgetId;
let siteKey='';
let automaticCampaign='';
let currentTermsVersion='2026-11-17-v1';
let inviteToken='';
try{
 const incoming=new URLSearchParams(location.hash.replace(/^#/,'' )).get('invite');
 if(incoming&&/^[-_A-Za-z0-9]{43}$/.test(incoming)){
  inviteToken=incoming;sessionStorage.setItem('a1ReferralPrivateInvite',incoming);
  history.replaceState(null,'',location.pathname+location.search);
 }else inviteToken=sessionStorage.getItem('a1ReferralPrivateInvite')||'';
}catch{}
function setSignupAvailability(value,invitation){
 const usable=Boolean(value&&automaticCampaign);
 signupAvailabilityState=usable;
 $('joinForm').hidden=!usable&&!managerPreview;
 $('closedEnrollment').hidden=usable||managerPreview;
 $('previewNotice').hidden=!managerPreview||usable;
 for(const field of $('joinForm').querySelectorAll('input,select,button')) field.disabled=!usable;
 $('privateTestNotice').hidden=!usable||!invitation;
 $('submitButton').disabled=!usable;
 if(usable&&invitation){
  const emailInput=$('joinForm').querySelector('input[name=email]');
  emailInput.value=invitation.email;emailInput.readOnly=true;
 }
 if(!usable)$('formStatus').textContent='';
 translate();
}
let widgetToken='';
let verificationPending=null;
let verificationErrorCode='';
let verificationFailed=false;

function finishVerification(token){
 widgetToken=token||'';
 if(verificationPending){verificationPending(widgetToken);verificationPending=null}
}
async function acquireSignupToken(){
 if(!siteKey)return '';
 if(widgetToken)return widgetToken;
 renderWidget();
 if(widgetId===undefined||!window.turnstile)throw Error(labels[lang].errorVerify);
 if(verificationFailed){
  verificationFailed=false;
  try{window.turnstile.reset(widgetId)}catch{}
 }
 const token=await new Promise(resolve=>{
  let complete=false;
  const settle=value=>{if(complete)return;complete=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>{verificationPending=null;verificationFailed=true;settle('')},25000);
  verificationPending=settle;
  try{window.turnstile.execute(widgetId)}catch{verificationPending=null;verificationFailed=true;settle('')}
 });
 if(!token){
  const hint=verificationErrorCode?' ('+verificationErrorCode+')':'';
  throw Error((lang==='ar'?'تعذّر التحقق الأمني. أعد المحاولة دون إعادة إدخال البيانات.':'Security check failed. Tap the button again; your details are saved.')+hint);
 }
 return token;
}
let scheduleForVisitors=null;
function displayRegistrationSchedule(){
 const box=$('publicEnrollmentSchedule');
 if(!box)return;
 if(signupAvailabilityState||!scheduleForVisitors||scheduleForVisitors.mode!=='scheduled'){box.hidden=true;box.replaceChildren();return}
 const info=scheduleForVisitors,isAr=lang==='ar';
 const date=info.opensAt?new Date(info.opensAt):null;
 const future=date&&!Number.isNaN(date.getTime())&&date.getTime()>Date.now();
 if(!future){box.hidden=true;box.replaceChildren();return}
 const label=document.createElement('span');
 label.className='schedule-label';
 label.textContent=isAr?'حالة استقبال السفراء':'AMBASSADOR APPLICATIONS';
 const title=document.createElement('strong');
 title.className='schedule-title';
 const foot=document.createElement('span');
 foot.className='schedule-foot';
 if(info.mode==='scheduled'&&future){
  title.textContent=new Intl.DateTimeFormat(isAr?'ar-LB':'en-GB',{timeZone:'Asia/Beirut',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(date);
  foot.textContent=isAr?'موعد فتح مخطط · رهن اكتمال التحقق والاعتماد':'Planned opening · subject to final approval';
 }else if(info.mode==='scheduled'){
  title.textContent=isAr?'لم يُفتح التسجيل بعد':'Registration is not open yet';
  foot.textContent=isAr?'الموعد السابق لم يتحول إلى فتح تلقائي':'The planned time did not activate registration';
 }else{
  title.textContent=isAr?'التسجيل مغلق حاليًا':'Registration currently closed';
  foot.textContent=isAr?'سنعلن موعد الاستقبال بعد استكمال التجهيزات':'Opening details will be announced after readiness checks';
 }
 box.replaceChildren(label,title,foot);
 box.hidden=false;
}

function translate(){
 const t=labels[lang];
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(t[key])el.textContent=t[key]});
 // Country names follow the current UI language, without mixing scripts or changing ISO-2 values.
 for(const option of $('country').options){if(option.value)option.textContent=lang==='ar'?option.dataset.ar:option.dataset.en;}
 document.querySelectorAll('#switchLanguage [data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===lang)));
 document.title=lang==='ar'?'تسجيل السفراء | LinkTutor Pro®':'Join the Ambassador Program | LinkTutor Pro®';
 displayRegistrationSchedule();
 $('formHeading').textContent=signupAvailabilityState?t.formHeading:managerPreview?t.previewHeading:t.closedHeading;
 $('formHeading').nextElementSibling.textContent=signupAvailabilityState?t.formIntro:managerPreview?t.previewExplanation:t.closedExplanation;
 document.querySelector('[name=name]').placeholder=lang==='ar'?'اكتب اسمك الكامل بالإنكليزية':'Your full name';
 document.querySelector('[name=password]').placeholder=lang==='ar'?'12 حرفًا على الأقل مع رقم':'12+ characters and a number';
}
$('switchLanguage').addEventListener('click',event=>{const btn=event.target.closest('button[data-lang]');if(!btn||btn.dataset.lang===lang)return;lang=btn.dataset.lang;try{localStorage.setItem(languageKey,lang)}catch{}translate()});
window.a1TurnstileLoaded=()=>{ready=true;renderWidget()};
function renderWidget(){
 if(!siteKey||!window.turnstile||widgetId!==undefined)return;
 widgetId=window.turnstile.render('#turnstile',{
  sitekey:siteKey,
  appearance:'interaction-only',
  execution:'execute',
  action:'ambassador_signup',
  callback:token=>finishVerification(token),
  'expired-callback':()=>{verificationFailed=true;finishVerification('')},
  'timeout-callback':()=>{verificationFailed=true;finishVerification('')},
  'error-callback':code=>{verificationFailed=true;verificationErrorCode=String(code||'');finishVerification('');return true}
 });
}
(async()=>{
 try{
  const [campaignResponse,configResponse,legalResponse]=await Promise.all([fetch('/api/public/campaigns'),fetch('/api/signup-config'),fetch('/api/legal')]);
  if(!campaignResponse.ok||!configResponse.ok)throw Error('not ready');
  const campaigns=(await campaignResponse.json()).campaigns||[];
  let config=await configResponse.json();
  if(!config.ready&&inviteToken){
   const privateResponse=await fetch('/api/signup-config/invite',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({token:inviteToken})});
   if(privateResponse.ok){const candidate=await privateResponse.json();if(candidate.ready&&candidate.invitation)config={...config,...candidate}}
   if(!config.ready){sessionStorage.removeItem('a1ReferralPrivateInvite');inviteToken='';}
  }
  siteKey=config.siteKey||'';
  if(legalResponse.ok){const policy=await legalResponse.json();currentTermsVersion=Number(policy.revision)>0?'ltp-legal-v'+Number(policy.revision):'2026-11-17-v1';}
  // Never claim that production Cloudflare protection is active without a configured widget.
  $('turnstileProtection').hidden=true;
  // This client currently has one active campaign; it is selected behind the scenes.
  // Multiple active campaigns require an explicit organizer routing decision before opening signup.
  automaticCampaign=campaigns.length===1?campaigns[0].slug:'';
  if(config.invitation&&config.invitation.campaign!==automaticCampaign){config.ready=false;siteKey='';}
  scheduleForVisitors=config.enrollment||null;
  setSignupAvailability(config.ready,config.invitation);
  if((!config.ready||!automaticCampaign)&&!managerPreview){$('formStatus').textContent=labels[lang].notReady}
  renderWidget();
  // Cloudflare API can load before or after our deferred application script.
  let retry=0;
  const retryWidget=setInterval(()=>{renderWidget();if(widgetId!==undefined||++retry>=40)clearInterval(retryWidget)},250);
 }catch{setSignupAvailability(false);if(!managerPreview)$('formStatus').textContent=labels[lang].notReady}
})();
$('joinForm').addEventListener('submit',async event=>{
 event.preventDefault();if(!signupAvailabilityState||$('submitButton').disabled)return;
 $('formStatus').textContent='';
 if(!$('joinForm').reportValidity())return;
 $('submitButton').disabled=true;
 $('formStatus').textContent=lang==='ar'?'جارٍ التحقق الأمني…':'Verifying browser security…';
 try{if(siteKey)await acquireSignupToken()}catch(err){$('formStatus').textContent=err.message||labels[lang].errorVerify;$('submitButton').disabled=false;return}
 const f=new FormData($('joinForm'));
 const data={
 name:String(f.get('name')||''),email:String(f.get('email')||''),
 country:String(f.get('country')||''),phone:String(f.get('phone')||''),
 password:String(f.get('password')||''),campaign:automaticCampaign,
 agree:$('agree').checked,termsVersion:currentTermsVersion,turnstileToken:widgetToken,inviteToken
 };
 $('formStatus').textContent=labels[lang].submitting;
 try{
  const response=await fetch('/api/ambassador/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||labels[lang].errorNetwork);
  try{sessionStorage.removeItem('a1ReferralPrivateInvite')}catch{}
  inviteToken='';$('privateTestNotice').hidden=true;
  $('joinForm').hidden=true;$('successPanel').hidden=false;
  if(result.activationUrl)$('activationLink').href=result.activationUrl;
  else {$('activationLink').hidden=true;$('successPanel').querySelector('.preview-note').hidden=true}
 }catch(err){
  $('formStatus').textContent=err.message||labels[lang].errorNetwork;
  $('submitButton').disabled=false;
  widgetToken='';try{window.turnstile?.reset(widgetId)}catch{}
 }
});
translate();
