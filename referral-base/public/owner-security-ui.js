'use strict';
let mfaChallenge='',securityConfig={turnstileEnabled:false,recoveryReady:false,siteKey:''};
let ownerLoginTurnstile='',ownerRecoveryTurnstile='',loginWidget,recoveryWidget;
const securityPost=async(path,data)=>{
 const res=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-a1-owner-csrf':ownerCsrf},body:JSON.stringify(data)});
 const out=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(res.status===429?'Too many attempts. Please try again later.':out.error||'Unable to complete request.');
 return out;
};
function renderSecurityTurnstile(){
 if(!window.turnstile||!securityConfig.turnstileEnabled||!securityConfig.siteKey)return;
 $('ownerTurnstile').hidden=false;
 // Turnstile must not render into a hidden container.
 if(loginWidget===undefined)loginWidget=window.turnstile.render('#ownerTurnstile',{sitekey:securityConfig.siteKey,action:'owner_login',callback:t=>ownerLoginTurnstile=t,'expired-callback':()=>ownerLoginTurnstile='','error-callback':()=>{ownerLoginTurnstile='';$('loginStatus').textContent='Cloudflare verification could not load. Reload and try again.';return true}});
 // Recovery form starts hidden; create its widget only after it is shown.
 if(!$('recoveryRequestForm').hidden&&recoveryWidget===undefined)recoveryWidget=window.turnstile.render('#recoveryTurnstile',{sitekey:securityConfig.siteKey,action:'owner_recovery',callback:t=>ownerRecoveryTurnstile=t,'expired-callback':()=>ownerRecoveryTurnstile='','error-callback':()=>{ownerRecoveryTurnstile='';$('loginStatus').textContent='Cloudflare verification could not load. Reload and try again.';return true}});
}
window.ownerTurnstileLoaded=renderSecurityTurnstile;
fetch('/api/owner/security/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data){securityConfig=data;renderSecurityTurnstile()}}).catch(()=>{});
function resetWidget(type){
 try{window.turnstile?.reset(type==='login'?loginWidget:recoveryWidget)}catch{}
 if(type==='login')ownerLoginTurnstile='';else ownerRecoveryTurnstile='';
}
async function showOrganizer(account){
 ownerCsrf=account.csrf;mfaChallenge='';
 $('ownerPassword').value='';$('mfaLoginCode').value='';
 $('mfaLoginForm').hidden=true;$('loginForm').hidden=false;
 await refresh();await loadMfaStatus();
 $('adminLogin').hidden=true;$('adminDashboard').hidden=false;
}
window.a1OrganizerShow=showOrganizer;
window.a1OrganizerSignIn=async e=>{
 e.preventDefault();$('loginStatus').textContent='';
 if(securityConfig.turnstileEnabled&&!ownerLoginTurnstile){$('loginStatus').textContent='Complete the Cloudflare verification first.';return}
 try{
  const response=await fetch('/api/owner/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('ownerEmail').value.trim(),password:$('ownerPassword').value,turnstileToken:ownerLoginTurnstile})});
  const account=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===429?'Too many attempts. Try again later.':response.status===503?'Security verification is temporarily unavailable.':'Invalid email or password.');
  if(account.mfaRequired){
   if(!account.challenge)throw Error('Unable to start two-step verification.');
   mfaChallenge=account.challenge;$('ownerPassword').value='';
   $('loginForm').hidden=true;$('mfaLoginForm').hidden=false;$('mfaLoginCode').focus();resetWidget('login');return;
  }
  if(!account.authenticated)throw Error('Sign-in failed.');
  await showOrganizer(account);
 }catch(error){$('loginStatus').textContent=error.message;ownerCsrf='';resetWidget('login')}
};
$('mfaLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('loginStatus').textContent='';
 try{await showOrganizer(await securityPost('/api/owner/mfa/verify',{challenge:mfaChallenge,code:$('mfaLoginCode').value.trim()}))}
 catch(error){$('loginStatus').textContent=error.message}
});
$('cancelMfaLogin').addEventListener('click',()=>{mfaChallenge='';$('mfaLoginCode').value='';$('mfaLoginForm').hidden=true;$('loginForm').hidden=false});
$('forgotPassword').addEventListener('click',()=>{
 if(!securityConfig.recoveryReady){$('loginStatus').textContent='Recovery is not available until the administrator configures verified SMTP and Cloudflare Turnstile.';return}
 $('loginStatus').textContent='';$('loginForm').hidden=true;$('mfaLoginForm').hidden=true;$('recoveryRequestForm').hidden=false;renderSecurityTurnstile();
});
$('cancelRecovery').addEventListener('click',()=>{$('recoveryRequestForm').hidden=true;$('loginForm').hidden=false;$('recoveryEmail').value='';$('loginStatus').textContent=''});
$('recoveryRequestForm').addEventListener('submit',async e=>{
 e.preventDefault();$('loginStatus').textContent='';
 if(!ownerRecoveryTurnstile){$('loginStatus').textContent='Complete Cloudflare verification first.';return}
 try{
  const result=await securityPost('/api/owner/recovery/request',{email:$('recoveryEmail').value.trim(),turnstileToken:ownerRecoveryTurnstile});
  $('loginStatus').textContent=result.message||'If recognized, recovery instructions will be sent.';
  $('recoveryRequestForm').reset();resetWidget('recovery');
 }catch(error){$('loginStatus').textContent=error.message;resetWidget('recovery')}
});
async function loadMfaStatus(){
 const data=await request('/api/owner/mfa/status');
 $('mfaStatusLabel').textContent=data.enabled?'Two-step verification: ON':'Two-step verification: OFF';
 $('mfaCodeCount').textContent=data.enabled?data.recoveryCodesRemaining+' backup codes remaining':(data.canEnable?'Authenticator setup available':'Encryption key not configured');
 $('mfaStartForm').hidden=Boolean(data.enabled)||!data.canEnable;
 $('mfaEnabledActions').hidden=!data.enabled;
 $('mfaSetup').hidden=true;
}
$('mfaStartForm').addEventListener('submit',async e=>{
 e.preventDefault();$('mfaMessage').textContent='';
 try{
  const result=await securityPost('/api/owner/mfa/start',{password:$('mfaCurrentPassword').value});
  $('mfaQr').src=result.qrDataUrl;$('mfaManualSecret').textContent=result.secret;
  $('mfaStartForm').reset();$('mfaSetup').hidden=false;
 }catch(error){$('mfaMessage').textContent=error.message}
});
$('mfaConfirmForm').addEventListener('submit',async e=>{
 e.preventDefault();$('mfaMessage').textContent='';
 try{
  const result=await securityPost('/api/owner/mfa/confirm',{code:$('mfaConfirmCode').value.trim()});
  $('mfaBackupCodes').textContent=result.recoveryCodes.join('\n');
  $('mfaSetup').hidden=true;$('mfaQr').removeAttribute('src');$('mfaManualSecret').textContent='';$('mfaConfirmForm').reset();
  $('mfaBackupPanel').hidden=false;ownerCsrf='';
  $('mfaMessage').textContent='Two-step verification enabled. Save your backup codes now; your session has been revoked.';
 }catch(error){$('mfaMessage').textContent=error.message}
});
$('backupCodesSaved').addEventListener('click',()=>{
 $('mfaBackupCodes').textContent='';$('mfaBackupPanel').hidden=true;$('adminDashboard').hidden=true;$('adminLogin').hidden=false;
 $('ownerPassword').value='';$('loginStatus').textContent='Sign in again with your password and authenticator code.';
});
$('mfaDisableForm').addEventListener('submit',async e=>{
 e.preventDefault();$('mfaMessage').textContent='';
 if(!confirm('Disable two-step verification on this organizer account?'))return;
 try{
  await securityPost('/api/owner/mfa/disable',{password:$('mfaDisablePassword').value,code:$('mfaDisableCode').value});
  $('mfaDisableForm').reset();ownerCsrf='';$('adminDashboard').hidden=true;$('adminLogin').hidden=false;
  $('loginStatus').textContent='Two-step verification disabled. Please sign in again.';
 }catch(error){$('mfaMessage').textContent=error.message}
});
$('ownerChangePasswordForm').addEventListener('submit',async e=>{
 e.preventDefault();$('mfaMessage').textContent='';
 if(!confirm('Change the password and revoke all management sessions?'))return;
 try{
  const newPassword=$('ownerNewPassword').value;
  if(!/^(?=.{12,128}$)(?=.*[a-z])(?=.*[0-9])/i.test(newPassword))throw Error('Use at least 12 characters, including letters and numbers.');
  await securityPost('/api/owner/password/change',{currentPassword:$('ownerCurrentPassword').value,newPassword,mfaCode:$('ownerChangePasswordMfa').value.trim()});
  $('ownerChangePasswordForm').reset();ownerCsrf='';$('adminDashboard').hidden=true;$('adminLogin').hidden=false;
  $('loginStatus').textContent='Password changed and all sessions revoked. Sign in with the new password.';
 }catch(error){$('mfaMessage').textContent=error.message}
});
