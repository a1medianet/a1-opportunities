'use strict';
const $=id=>document.getElementById(id);
let resetToken=new URLSearchParams(location.search).get('token')||'';
history.replaceState({},'',location.pathname);
let challengeToken='',siteKey='',widgetId,securityReady=false;
const status=$('resetStatus');
function renderWidget(){
 if(!securityReady||!siteKey||!window.turnstile||widgetId!==undefined)return;
 widgetId=window.turnstile.render('#resetTurnstile',{sitekey:siteKey,action:'owner_reset',callback:t=>challengeToken=t,'expired-callback':()=>challengeToken='','error-callback':()=>challengeToken=''});
}
window.ownerResetTurnstileLoaded=renderWidget;
(async()=>{
 try{
  const response=await fetch('/api/owner/security/config',{cache:'no-store'});
  const cfg=await response.json();
  securityReady=Boolean(cfg.recoveryReady&&cfg.turnstileEnabled&&cfg.siteKey);
  siteKey=cfg.siteKey||'';
  if(!securityReady){status.textContent='Secure email recovery is not yet configured. Contact your administrator.';$('resetSubmit').disabled=true}
  else renderWidget();
 }catch{status.textContent='Security settings are unavailable.';$('resetSubmit').disabled=true}
})();
if(!/^[-_a-zA-Z0-9]{43}$/.test(resetToken)){status.textContent='Invalid recovery link.';$('resetSubmit').disabled=true}
$('resetForm').addEventListener('submit',async e=>{
 e.preventDefault();status.textContent='';
 const password=$('newPassword').value,repeat=$('repeatPassword').value;
 if(password!==repeat){status.textContent='The passwords do not match.';return}
 if(!/^(?=.{12,128}$)(?=.*[a-z])(?=.*\d)/i.test(password)){status.textContent='Use 12 or more characters including letters and numbers.';return}
 if(!challengeToken){status.textContent='Complete Cloudflare verification first.';return}
 $('resetSubmit').disabled=true;
 try{
  const res=await fetch('/api/owner/recovery/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:resetToken,newPassword:password,mfaCode:$('mfaCode').value.trim(),turnstileToken:challengeToken})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'Unable to reset password.');
  resetToken='';$('resetForm').reset();$('resetForm').hidden=true;
  $('backToAdmin').hidden=false;status.textContent='Password changed. All previous sessions have been revoked.';
 }catch(err){status.textContent=err.message;$('resetSubmit').disabled=false}
 finally{challengeToken='';try{window.turnstile?.reset(widgetId)}catch{}}
});
