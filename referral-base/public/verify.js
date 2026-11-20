'use strict';
const localeKey='a1ReferralLanguage';
let language='en';
try{language=localStorage.getItem(localeKey)==='ar'?'ar':'en'}catch{}
const dictionary={
  en:{
    title:'Verify Email | LinkTutor Pro®',signin:'Ambassador Sign In',eyebrow:'EMAIL VERIFICATION',heading:'Confirm your email',
    checking:'Checking your activation link...',missing:'This activation link is invalid.',success:'Email verified successfully.',
    expired:'This activation link is invalid or has expired.',failed:'Verification could not be completed. Please try again or contact the organizer.',
    signinAction:'Continue to your account',returnRegistration:'Back to home',footer:'© 2026 LinkTutor Pro. All rights reserved.'
  },
  ar:{
    title:'تأكيد البريد | A1 Opportunities',signin:'دخول السفير',eyebrow:'تأكيد البريد',heading:'تأكيد بريدك الإلكتروني',
    checking:'جارٍ تأكيد البريد…',missing:'رابط التفعيل غير صالح.',success:'تم تأكيد بريدك بنجاح.',
    expired:'انتهت صلاحية الرابط أو أنه غير صالح.',failed:'تعذّر التفعيل. حاول مجددًا أو تواصل مع الإدارة.',
    signinAction:'المتابعة إلى حسابك',returnRegistration:'العودة للرئيسية',footer:'حقوق النشر محفوظة'
  }
};
let outcome='checking';
function paint(){
 const t=dictionary[language];
 document.documentElement.lang=language;
 document.documentElement.dir=language==='ar'?'rtl':'ltr';
 document.title=t.title;
 document.querySelectorAll('[data-i18n]').forEach(el=>{const word=t[el.dataset.i18n];if(word)el.textContent=word});
 document.querySelectorAll('#switchLanguage [data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===language)));
 const status=document.getElementById('verificationMessage');
 status.textContent=t[outcome]||t.failed;
 status.dataset.status=outcome;
 const success=outcome==='success';
 document.getElementById('verifyHeading').textContent=success?(language==='ar'?'تم التفعيل!':'Email confirmed!'):t.heading;
 document.getElementById('verifyEyebrow').hidden=success;
 document.getElementById('returnRegistration').hidden=success;
 document.querySelector('.site-header .signin-link').hidden=success;
 document.querySelector('.info-card').classList.toggle('verified-success',success);
}
document.getElementById('switchLanguage').addEventListener('click',event=>{
 const btn=event.target.closest('button[data-lang]');if(!btn||btn.dataset.lang===language)return;
 language=btn.dataset.lang;
 try{localStorage.setItem(localeKey,language)}catch{}
 paint();
});
paint();
(async()=>{
 const token=new URLSearchParams(location.search).get('token')||'';
 if(!/^[-_A-Za-z0-9]{43}$/.test(token)){outcome='missing';history.replaceState({},'',location.pathname);paint();return}
 try{
  const response=await fetch('/api/ambassador/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
  if(!response.ok){outcome=response.status===410?'expired':'failed';return}
  const data=await response.json();
  outcome=data.activated===true?'success':'failed';
  if(outcome==='success')document.getElementById('goToLogin').hidden=false;
 }catch{outcome='failed'}
 finally{history.replaceState({},'',location.pathname);paint()}
})();