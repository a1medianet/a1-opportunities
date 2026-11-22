'use strict';
const $$=id=>document.getElementById(id);
const language=(()=>{try{return localStorage.getItem('a1ReferralLanguage')==='ar'?'ar':'en'}catch{return 'en'}})();
const copy={en:{title:'Reset your password',intro:'Use your one-time email recovery link to choose a new password.',newLabel:'New password',confirmLabel:'Confirm new password',submit:'Reset password',back:'Ambassador Sign In',missing:'The reset link is missing or invalid.',unavailable:'Secure password recovery is not available yet. Contact the organizer.',verification:'Complete Cloudflare verification first.',mismatch:'Passwords must match.',weak:'Use 12–128 characters including letters and numbers.',success:'Password changed. All existing sessions were revoked. Sign in with your new password.',failure:'The reset link is invalid, expired or already used.'},ar:{title:'استعادة كلمة المرور',intro:'استخدم رابط البريد الإلكتروني لمرة واحدة لتعيين كلمة مرور جديدة.',newLabel:'كلمة المرور الجديدة',confirmLabel:'تأكيد كلمة المرور الجديدة',submit:'تغيير كلمة المرور',back:'دخول السفير',missing:'رابط الاستعادة مفقود أو غير صالح.',unavailable:'خدمة استعادة كلمة المرور غير متاحة بعد. تواصل مع الإدارة.',verification:'أكمل تحقق Cloudflare أولًا.',mismatch:'كلمتا المرور غير متطابقتين.',weak:'استخدم 12 إلى 128 حرفًا تتضمن أحرفًا وأرقامًا.',success:'تم تغيير كلمة المرور وإلغاء الجلسات القديمة. سجّل الدخول بكلمتك الجديدة.',failure:'رابط الاستعادة غير صالح أو منتهي الصلاحية أو مستخدم سابقًا.'}};
const t=copy[language];
document.documentElement.lang=language;
document.documentElement.dir=language==='ar'?'rtl':'ltr';
for(const [id,key] of [['resetTitle','title'],['resetIntro','intro'],['newLabel','newLabel'],['confirmLabel','confirmLabel'],['resetSubmit','submit'],['backLink','back']])$$(id).textContent=t[key];
let security={turnstileEnabled:false,recoveryReady:false,siteKey:''},challenge='',widgetId;
const resetToken=new URL(location.href).searchParams.get('token');
const visibilityLabels=language==='ar'?{show:'إظهار كلمة المرور',hide:'إخفاء كلمة المرور'}:{show:'Show password',hide:'Hide password'};
$$('passwordGuidance').textContent=language==='ar'?'استخدم كلمة مرور فريدة لا تقل عن 16 رمزًا. يمكن لـGoogle Chrome اقتراح كلمة مرور قوية وحفظها في مدير كلمات المرور.':'Choose a unique password of at least 16 characters. Google Chrome can suggest and save a strong password in Password Manager.';
document.querySelectorAll('.password-visibility').forEach(button=>{
 button.addEventListener('click',()=>{
  const input=$$(button.dataset.target),show=input.type==='password';
  input.type=show?'text':'password';
  button.setAttribute('aria-pressed',String(show));
  button.setAttribute('aria-label',show?visibilityLabels.hide:visibilityLabels.show);
  button.title=show?visibilityLabels.hide:visibilityLabels.show;
  const icon=button.querySelector('svg');
  if(icon)icon.innerHTML=show?'<path d="M3 3 21 21"/><path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.1 3.8"/><path d="M6.2 6.3C3.5 8 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.1-.8"/><path d="M10 10a3 3 0 0 0 4 4"/>':'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>';
 });
});

const securityUi=language==='ar'?{
 checking:'جارٍ التحقق الآمن من المتصفح…',ready:'اكتمل التحقق. يمكنك تعيين كلمة المرور الآن.',error:'تعذّر التحقق. حاول مرة أخرى أو أوقف الإضافات المانعة مؤقتًا لهذا الموقع.',retry:'إعادة محاولة التحقق'
}:{checking:'Checking browser security…',ready:'Verification complete. You can now set your password.',error:'Verification could not complete. Retry or check browser blocking extensions.',retry:'Retry verification'};
function updateTurnstileState(state){
 const progress=$$('turnstileProgress'),retry=$$('turnstileRetry');
 if(!progress||!retry)return;
 progress.textContent=securityUi[state]||'';
 progress.dataset.state=state;
 retry.hidden=state!=='error';
}
$$('turnstileRetry').textContent=securityUi.retry;
$$('turnstileRetry').addEventListener('click',()=>{
 challenge='';
 updateTurnstileState('checking');
 try{if(widgetId!==undefined&&window.turnstile)window.turnstile.reset(widgetId);else renderTurnstile()}
 catch{updateTurnstileState('error')}
});
function renderTurnstile(){
 if(!security.recoveryReady||!security.turnstileEnabled||!security.siteKey||!window.turnstile||widgetId!==undefined)return;
 widgetId=window.turnstile.render('#ambResetTurnstile',{
  sitekey:security.siteKey,appearance:'interaction-only',execution:'render',action:'ambassador_reset',
  callback:token=>{challenge=token;updateTurnstileState('ready')},
  'expired-callback':()=>{challenge='';updateTurnstileState('checking')},
  'timeout-callback':()=>{challenge='';updateTurnstileState('error')},
  'error-callback':()=>{challenge='';updateTurnstileState('error')}
 });
}
window.a1AmbassadorResetTurnstileLoaded=renderTurnstile;
(async()=>{
 const status=$$('resetMessage');
 updateTurnstileState('checking');
 if(!/^[-_A-Za-z0-9]{43}$/.test(resetToken||'')){$$('resetSubmit').disabled=true;status.textContent=t.missing;return}
 try{
  const res=await fetch('/api/ambassador/security/config',{cache:'no-store'});
  security=await res.json();
  if(!res.ok||!security.recoveryReady){status.textContent=t.unavailable;$$('resetSubmit').disabled=true;updateTurnstileState('error');return}
  if(!security.turnstileEnabled){$$('turnstileProgress').textContent='';$$('ambResetTurnstile').hidden=true;$$('turnstileRetry').hidden=true;return}
  renderTurnstile();
  let retries=0;const timer=setInterval(()=>{renderTurnstile();if(widgetId!==undefined||++retries>=40){clearInterval(timer);if(widgetId===undefined)updateTurnstileState('error')}},250);
 }catch{status.textContent=t.unavailable;$$('resetSubmit').disabled=true;updateTurnstileState('error')}
})();
$$('ambResetForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const m=$$('resetMessage');m.textContent='';
 if(!security.recoveryReady||(security.turnstileEnabled&&!challenge)){m.textContent=t.verification;return}
 const p=$$('newAmbPassword').value;
 if(p!==$$('confirmAmbPassword').value){m.textContent=t.mismatch;return}
 if(p.length<12||p.length>128||!/[A-Za-z]/.test(p)||!/[0-9]/.test(p)){m.textContent=t.weak;return}
 $$('resetSubmit').disabled=true;
 try{
  const response=await fetch('/api/ambassador/recovery/complete',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:JSON.stringify({token:resetToken,newPassword:p,turnstileToken:challenge})});
  if(!response.ok)throw Error(t.failure);
  m.textContent=t.success;
  m.dataset.state='success';
  $$('ambResetForm').reset();
  $$('ambResetForm').hidden=true;
  const signIn=$$('afterResetSignIn');
  signIn.hidden=false;
  signIn.textContent=language==='ar'?'تسجيل الدخول الآن':'Sign in now';
  try{history.replaceState(null,'','/ambassador/reset')}catch{}
  window.setTimeout(()=>{location.assign('/ambassador')},2500);
 }catch(error){m.textContent=error.message;$$('resetSubmit').disabled=false}
 finally{challenge='';if($$('resetSubmit').disabled===false){updateTurnstileState('checking');try{window.turnstile?.reset(widgetId)}catch{updateTurnstileState('error')}}}
});
