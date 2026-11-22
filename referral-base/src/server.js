import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
import {createStore} from './core.js';
import {createParticipantFlow} from './participants.js';
import {createCommercialFlow} from './commercial.js';
import {createProgramSettings} from './settings.js';
import {createAmbassadorOnboarding} from './onboarding.js';
import {createOwnerAuth} from './owner-auth.js';
import {createLegalSettings} from './legal.js';
import {createEnrollmentGate} from './enrollment-gate.js';
import {createGroupPool} from './groups.js';
import {createCommunityRouting} from './community.js';
import {renderCommunityChoice} from './community-choice.js';
import {createAmbassadorTestInvites} from './test-invites.js';
import {createRateLimiter} from './rate-limit.js';
import {createEmailService} from './email.js';
import {createOpportunityCatalog} from './opportunities.js';
import QRCode from 'qrcode';
const root=join(fileURLToPath(new URL('..',import.meta.url)));
const store=createStore(process.env.A1_REFERRAL_DB_PATH || join(root,'data','referral.sqlite'));
const commercial=createCommercialFlow(store.db);
const groupPool=createGroupPool(store.db);
const community=createCommunityRouting(store.db);
const participants=createParticipantFlow(store.db,id=>commercial.issueJoinTicket(id),id=>groupPool.ticketForParticipant(id));
const program=createProgramSettings(store.db,groupPool);
const enrollmentGate=createEnrollmentGate(store.db);
const legal=createLegalSettings(store.db);
const onboarding=createAmbassadorOnboarding(store.db,{issueAmbassador:participants.issueAmbassador});
const opportunities=createOpportunityCatalog(store.db);
if(process.env.A1_OPPS_DIRECT_REFERRAL==='1' && new URL(process.env.A1_REFERRAL_PUBLIC_URL||'https://referral.a1net.tech').hostname==='opps.a1net.tech')participants.ensureCampaignZeroAmbassador('linktutor-2026-11-28','ltp0');
const testInvites=createAmbassadorTestInvites(store.db);
const emailService=createEmailService();
const ownerAuth=createOwnerAuth(store.db,process.env,{sendRecoveryEmail:emailService.ready?emailService.sendRecoveryEmail:undefined});
// Never enable this feature with test credentials on the public VPS.
const localPreview=process.env.A1_REFERRAL_LOCAL_PREVIEW==='1' && (process.env.A1_REFERRAL_BIND||'127.0.0.1')==='127.0.0.1' && process.env.NODE_ENV!=='production';
const portalEnabled=localPreview||(process.env.A1_REFERRAL_PORTAL_ENABLED==='1'&&process.env.NODE_ENV==='production');
const turnstileSiteKey=portalEnabled?(process.env.A1_REFERRAL_TURNSTILE_SITE_KEY||''):'';
const turnstileSecret=portalEnabled?(process.env.A1_REFERRAL_TURNSTILE_SECRET_KEY||''):'';
// Never accept test Turnstile keys in production. Live enrollment also requires proven email delivery.
const liveTurnstileReady=Boolean(turnstileSiteKey&&turnstileSecret&&!turnstileSiteKey.startsWith('1x')&&!turnstileSecret.startsWith('1x'));
// Scoped operational fallback: preserve Turnstile for owner and participants.
const ambassadorTurnstileEnabled=process.env.A1_REFERRAL_AMBASSADOR_TURNSTILE_DISABLED!=='1';
const ambassadorSecurityReady=()=>!ambassadorTurnstileEnabled||liveTurnstileReady;
// Evaluate published policy and registration gates on each request; organizer can control
// enrollment without restarting the server, while security and delivery stay mandatory.
const signupInfrastructureReady=()=>localPreview?Boolean(turnstileSiteKey&&turnstileSecret):Boolean(portalEnabled&&ambassadorSecurityReady()&&emailService.ready&&legal.managerView().publishedRevision>0);
const signupReady=()=>signupInfrastructureReady()&&(localPreview||enrollmentGate.view().open);
// Invited UAT is separate from publicly open registration; only an owner-approved,
// published policy + real email + production Turnstile permit a one-email invite.
const privateInviteReady=()=>Boolean(portalEnabled&&ambassadorSecurityReady()&&emailService.ready&&legal.managerView().publishedRevision>0);
const ownerRecoveryReady=Boolean(emailService.ready&&(localPreview||liveTurnstileReady));
const ambassadorRecoveryReady=Boolean(emailService.ready&&(localPreview||ambassadorSecurityReady()));
const siteUrl=String(process.env.A1_REFERRAL_PUBLIC_URL||'https://referral.a1net.tech').replace(/\/$/,'');
async function verifyTurnstile(token,expectedAction){
 if(!turnstileSecret||typeof token!=='string'||!token||token.length>2048)return false;
 try{
  const body=new URLSearchParams({secret:turnstileSecret,response:token});
  const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body,signal:AbortSignal.timeout(8000)});
  const validation=await res.json();
  if(!res.ok||validation.success!==true)return false;
  if(localPreview)return true;
  return String(validation.hostname||'').toLowerCase()===new URL(siteUrl).hostname.toLowerCase()&&validation.action===expectedAction;
 }catch{return false;}
}
const sessionCookie=req=>{const match=String(req.headers.cookie||'').match(/(?:^|;\s*)a1ref_session=([A-Za-z0-9_-]{43})(?=;|$)/);return match?.[1]||'';};
const cookieOpts='Path=/; HttpOnly; SameSite=Strict; Max-Age=14400'+(process.env.NODE_ENV==='production'?'; Secure':'');
const ownerCookie=req=>{const match=String(req.headers.cookie||'').match(/(?:^|;\s*)a1ref_owner=([A-Za-z0-9_-]{43})(?=;|$)/);return match?.[1]||'';};
const adminKey=process.env.A1_REFERRAL_ADMIN_KEY || '';
const port=Number(process.env.A1_REFERRAL_PORT || 3107);
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
const compare=(a,b)=>{const x=Buffer.from(String(a||'')), y=Buffer.from(String(b||''));return x.length===y.length && timingSafeEqual(x,y);};
const authorized=req=>Boolean(ownerAuth.session(ownerCookie(req)))||(localPreview||!ownerAuth.configured)&&adminKey.length>=24&&compare(req.headers['x-demo-admin-key'],adminKey);
const csrfAllowed=req=>req.method==='GET'||Boolean(ownerAuth.session(ownerCookie(req))&&ownerAuth.checkCsrf(ownerCookie(req),req.headers['x-a1-owner-csrf']))||(localPreview||!ownerAuth.configured)&&adminKey.length>=24&&compare(req.headers['x-demo-admin-key'],adminKey);
const parse=async(req,maxLength=12000)=>{let body='';for await(const chunk of req){body+=chunk;if(body.length>maxLength) throw new Error('Request too large');}return JSON.parse(body||'{}');};
const registerAllowed=createRateLimiter();
const fixedRate={currency:'USD',amount:40,confirmed:false,sessionDate:'2026-11-28'};
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try {
    if(req.method==='GET' && ['/explore','/opportunities','/opportunities.html'].includes(url.pathname)) {res.writeHead(302,{'location':'/','cache-control':'no-store'});return res.end();}
    if(portalEnabled && req.method==='GET' && url.pathname==='/api/public/campaigns')
      return json(res,200,{campaigns:onboarding.publicCampaigns()});
    if(portalEnabled && req.method==='GET' && url.pathname==='/api/signup-config')
      return json(res,200,{siteKey:signupReady()&&ambassadorTurnstileEnabled?turnstileSiteKey:'',ready:signupReady(),localPreview,enrollment:enrollmentGate.view()});
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/signup-config/invite'){
      if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});
      const data=await parse(req);
      const invite=privateInviteReady()?testInvites.inspect(data.token):null;
      return json(res,200,{ready:Boolean(invite),siteKey:invite&&ambassadorTurnstileEnabled?turnstileSiteKey:'',invitation:invite?{email:invite.email,campaign:invite.campaign,expiresAt:new Date(invite.expiresAt).toISOString()}:null});
    }
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/signup'){
      if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});
      if(!signupReady()&&!privateInviteReady())return json(res,503,{error:'Enrollment is closed or awaiting verified email, legal approval and security activation.'});
      const data=await parse(req);
      const invite=!signupReady()?testInvites.inspect(data.inviteToken):null;
      if(!signupReady()&&(!invite||invite.email!==String(data.email||'').trim().toLowerCase()||invite.campaign!==String(data.campaign||'')))
        return json(res,503,{error:'Registration is closed. A valid private invitation is required.'});
      const legalRevision=legal.publicView().revision;
      const expectedVersion=legalRevision>0?'ltp-legal-v'+legalRevision:'2026-11-17-v1';
      if(data.termsVersion!==expectedVersion)return json(res,409,{error:'Program terms were updated. Reload and review the latest wording.'});
      if(ambassadorTurnstileEnabled&&!(await verifyTurnstile(data.turnstileToken,'ambassador_signup')))return json(res,403,{error:'Human verification failed. Please retry.'});
      const result=await onboarding.signup(data,invite?{claimInvitation:fields=>testInvites.claim(data.inviteToken,fields)}:{});
      if(localPreview)return json(res,201,{accepted:true,emailDelivery:'local-preview-only',activationUrl:'/verify?token='+encodeURIComponent(result.activationToken)});
      await emailService.sendActivationEmail(result.email,siteUrl+'/verify?token='+encodeURIComponent(result.activationToken));
      return json(res,201,{accepted:true,emailDelivery:'sent'});
    }
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/activate'){
      if(!signupInfrastructureReady()&&!privateInviteReady())return json(res,503,{error:'Activation is not yet enabled.'});
      const result=onboarding.activate((await parse(req)).token);
      return json(res,200,{activated:result.activated});
    }
    if(portalEnabled && req.method==='GET' && url.pathname==='/api/ambassador/security/config')
      return json(res,200,{turnstileEnabled:ambassadorTurnstileEnabled&&liveTurnstileReady,siteKey:ambassadorTurnstileEnabled&&liveTurnstileReady?turnstileSiteKey:'',recoveryReady:ambassadorRecoveryReady});
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/recovery/request'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ambassadorRecoveryReady)return json(res,503,{error:'Email recovery is not configured.'});
      const data=await parse(req);
      if(ambassadorTurnstileEnabled&&!(await verifyTurnstile(data.turnstileToken,'ambassador_recovery')))return json(res,403,{error:'Human verification failed.'});
      await onboarding.requestPasswordRecovery(data.email,emailService.sendAmbassadorRecoveryEmail,siteUrl);
      return json(res,200,{accepted:true,message:'If this address is registered, recovery instructions will be sent.'});
    }
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/recovery/complete'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ambassadorRecoveryReady)return json(res,503,{error:'Email recovery is not configured.'});
      const data=await parse(req);
      if(ambassadorTurnstileEnabled&&!(await verifyTurnstile(data.turnstileToken,'ambassador_reset')))return json(res,403,{error:'Human verification failed.'});
      return json(res,200,await onboarding.completePasswordRecovery(data));
    }
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/login'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      const data=await parse(req);
      if(ambassadorTurnstileEnabled&&liveTurnstileReady&&!(await verifyTurnstile(data.turnstileToken,'ambassador_login')))return json(res,403,{error:'Human verification failed.'});
      const result=await onboarding.login(data);
      res.setHeader('Set-Cookie','a1ref_session='+result.token+'; '+cookieOpts);
      return json(res,200,{authenticated:true});
    }
    if(portalEnabled && req.method==='POST' && url.pathname==='/api/ambassador/logout'){
      onboarding.logout(sessionCookie(req));
      res.setHeader('Set-Cookie','a1ref_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return json(res,200,{loggedOut:true});
    }
    if(req.method==='POST' && url.pathname==='/api/owner/login'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      const input=await parse(req);
      if(liveTurnstileReady&&!(await verifyTurnstile(input.turnstileToken,'owner_login')))return json(res,403,{error:'Human verification failed.'});
      const result=await ownerAuth.login(input);
      if(result.mfaRequired)return json(res,200,{mfaRequired:true,challenge:result.challenge});
      res.setHeader('Set-Cookie','a1ref_owner='+result.token+'; '+cookieOpts);
      return json(res,200,{authenticated:true,email:result.email,csrf:result.csrf});
    }
    if(req.method==='GET' && url.pathname==='/api/owner/security/config')return json(res,200,{siteKey:liveTurnstileReady?turnstileSiteKey:'',turnstileEnabled:liveTurnstileReady,recoveryReady:ownerRecoveryReady});
    if(req.method==='POST' && url.pathname==='/api/owner/mfa/verify'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      const body=await parse(req),result=ownerAuth.completeMfa(body.challenge,body.code);
      res.setHeader('Set-Cookie','a1ref_owner='+result.token+'; '+cookieOpts);
      return json(res,200,{authenticated:true,csrf:result.csrf,email:result.email});
    }
    if(req.method==='GET' && url.pathname==='/api/owner/mfa/status')return json(res,200,ownerAuth.mfaStatus(ownerCookie(req)));
    if(req.method==='POST' && url.pathname==='/api/owner/mfa/start'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ownerAuth.checkCsrf(ownerCookie(req),req.headers['x-a1-owner-csrf']))return json(res,403,{error:'Request verification failed'});
      const data=await parse(req),setup=await ownerAuth.beginMfa(ownerCookie(req),data.password);
      return json(res,200,{...setup,qrDataUrl:await QRCode.toDataURL(setup.otpauthUrl,{width:210,margin:1,errorCorrectionLevel:'M'})});
    }
    if(req.method==='POST' && url.pathname==='/api/owner/mfa/confirm'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ownerAuth.checkCsrf(ownerCookie(req),req.headers['x-a1-owner-csrf']))return json(res,403,{error:'Request verification failed'});
      return json(res,200,ownerAuth.confirmMfa(ownerCookie(req),(await parse(req)).code));
    }
    if(req.method==='POST' && url.pathname==='/api/owner/mfa/disable'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ownerAuth.checkCsrf(ownerCookie(req),req.headers['x-a1-owner-csrf']))return json(res,403,{error:'Request verification failed'});
      const data=await parse(req);return json(res,200,await ownerAuth.disableMfa(ownerCookie(req),data.password,data.code));
    }
    if(req.method==='POST' && url.pathname==='/api/owner/password/change'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many attempts'});
      if(!ownerAuth.checkCsrf(ownerCookie(req),req.headers['x-a1-owner-csrf']))return json(res,403,{error:'Request verification failed'});
      const body=await parse(req);return json(res,200,await ownerAuth.changePassword(ownerCookie(req),body.currentPassword,body.newPassword,body.mfaCode));
    }
    if(req.method==='POST' && url.pathname==='/api/owner/recovery/request'){
      if(!registerAllowed(req))return json(res,429,{error:'Try again later.'});
      if(!ownerRecoveryReady)return json(res,503,{error:'Email recovery is not configured.'});
      const data=await parse(req);
      if(!(await verifyTurnstile(data.turnstileToken,'owner_recovery')))return json(res,403,{error:'Human verification failed.'});
      await ownerAuth.requestRecovery(data.email,raw=>siteUrl+'/reset?token='+encodeURIComponent(raw));
      return json(res,200,{accepted:true,message:'If the address is recognized, recovery instructions will be sent.'});
    }
    if(req.method==='POST' && url.pathname==='/api/owner/recovery/complete'){
      if(!registerAllowed(req))return json(res,429,{error:'Try again later.'});
      if(!ownerRecoveryReady)return json(res,503,{error:'Email recovery is not configured.'});
      const data=await parse(req);
      if(!(await verifyTurnstile(data.turnstileToken,'owner_reset')))return json(res,403,{error:'Human verification failed.'});
      return json(res,200,await ownerAuth.finishRecovery(data));
    }
    if(req.method==='GET' && url.pathname==='/api/owner/me'){
      const session=ownerAuth.session(ownerCookie(req));
      return session?json(res,200,{authenticated:true,email:session.email,csrf:session.csrf}):json(res,401,{error:'Sign-in required'});
    }
    if(req.method==='POST' && url.pathname==='/api/owner/logout'){
      ownerAuth.logout(ownerCookie(req));
      res.setHeader('Set-Cookie','a1ref_owner=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(process.env.NODE_ENV==='production'?'; Secure':''));
      return json(res,200,{loggedOut:true});
    }
    if(req.method==='GET' && /^\/join\/[-_A-Za-z0-9]{43}$/.test(url.pathname)){
      const destination=groupPool.redirect(url.pathname.slice(6));
      res.writeHead(302,{Location:destination.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});return res.end();
    }
    if(req.method==='GET' && ['/opportunities','/opportunities.html','/opportunities.css','/opportunities.js'].includes(url.pathname)){
      const file=url.pathname==='/opportunities'?'opportunities.html':url.pathname.slice(1);
      const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html';
      res.writeHead(200,{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','content-security-policy':file.endsWith('.html')?"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'":"default-src 'none'"});
      return res.end(readFileSync(join(root,'public',file)));
    }
    if(req.method==='GET' && process.env.A1_OPPS_DIRECT_REFERRAL==='1' && url.pathname==='/o/ltp'){
      res.writeHead(302,{'location':'/campaign?ref=ltp0','cache-control':'no-store','referrer-policy':'no-referrer'});
      return res.end();
    }
    if(req.method==='GET' && process.env.A1_OPPS_DIRECT_REFERRAL==='1' && url.pathname==='/campaign' && !url.searchParams.has('ref')){
      const target=new URL('/campaign',siteUrl);
      for(const [key,value] of url.searchParams)target.searchParams.append(key,value);
      target.searchParams.set('ref','ltp0');
      res.writeHead(302,{'location':target.pathname+target.search,'cache-control':'no-store','referrer-policy':'no-referrer'});
      return res.end();
    }
    if(req.method==='GET' && ['/opps-campaigns','/opps-campaigns.html','/opps-campaigns.css','/opps-campaigns.js','/opps-campaign-locale.js'].includes(url.pathname)){
      const file=url.pathname==='/opps-campaigns'?'opps-campaigns.html':url.pathname.slice(1);
      const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html';
      res.writeHead(200,{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':file.endsWith('.html')?"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none';base-uri 'none'":"default-src 'none'"});
      return res.end(readFileSync(join(root,'public',file)));
    }
    if(req.method==='GET' && url.pathname==='/api/community'){
      const code=String(url.searchParams.get('ref')||'');
      return json(res,200,{available:community.enabledFor(code)});
    }
    if(req.method==='GET' && /^\/community\/registered\/[-_A-Za-z0-9]{43}$/.test(url.pathname)){
      if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});
      const destination=community.registeredRedirect(url.pathname.slice('/community/registered/'.length));
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store, private','referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});
      return res.end(renderCommunityChoice(destination.url));
    }
    if(req.method==='GET' && /^\/community\/[A-Za-z0-9_-]{3,64}$/.test(url.pathname)){
      const code=url.pathname.slice('/community/'.length);
      if(!community.enabledFor(code))return json(res,404,{error:'Invitation not found'});
      res.writeHead(302,{'location':'/campaign?ref='+encodeURIComponent(code)+'#register','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});
      return res.end();
    }
    if(req.method==='POST' && url.pathname==='/api/community/register'){
      if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});
      // Phone-only campaign registration: no visitor challenge; rate limiter remains enabled.
      const input=await parse(req);
      if(!community.enabledFor(String(input.code||'')))return json(res,404,{error:'Invitation unavailable'});
      // No OTP or CAPTCHA for this campaign; commission requires later organizer payment confirmation.
      const registration=participants.register(input);
      return json(res,200,{received:true,groupUrl:registration.joinTicket?'/community/registered/'+registration.joinTicket:'',attributionConfirmed:Boolean(registration.joinTicket)});
    }
    if(req.method==='GET' && url.pathname==='/api/legal')return json(res,200,legal.publicView());
    if(req.method==='GET' && url.pathname==='/api/health') return json(res,200,{status:'ok',environment:process.env.NODE_ENV==='production'?'PRODUCTION':'LOCAL_REVIEW'}); if(req.method==='GET' && /^\/r\/[A-Za-z0-9_-]{3,64}$/.test(url.pathname)) {const code=url.pathname.slice(3);if(!participants.activeReferral(code))return json(res,404,{error:'Invitation not found'});res.writeHead(302,{location:(portalEnabled?'/campaign':'/')+'?ref='+encodeURIComponent(code),'cache-control':'no-store','referrer-policy':'no-referrer'});return res.end();} if(req.method==='GET' && url.pathname==='/api/config') return json(res,200,{title:'LinkTutor Pro — Ambassador Program'});
    if(req.method==='POST' && url.pathname==='/api/register') return json(res,410,{error:'Please use the current registration form'});
    if(req.method==='GET' && url.pathname==='/api/program') return json(res,200,{registrationOpen:program.active().registrationOpen});
    // Participant verification is independent of the ambassador enrollment switch.
    // The participant form must receive a real site key even when ambassador signup is closed.
    if(req.method==='GET' && url.pathname==='/api/participant/security/config')
      return json(res,200,{turnstileEnabled:portalEnabled&&liveTurnstileReady,siteKey:portalEnabled&&liveTurnstileReady?turnstileSiteKey:''});
    if(req.method==='POST' && url.pathname==='/api/participants') {if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});const state=program.active();if(!state.registrationOpen)return json(res,503,{error:'Registration will open soon'});const input=await parse(req);if(portalEnabled&&(!localPreview&&!liveTurnstileReady))return json(res,503,{error:'Registration is not yet available'});if(portalEnabled&&!(await verifyTurnstile(input.turnstileToken,'participant_signup')))return json(res,403,{error:'Human verification failed'});const registration=participants.register(input);return json(res,200,{...registration,groupUrl:state.destinationType==='whatsapp'&&groupPool.list().length?registration.redirectPath||'':state.groupUrl,destinationType:state.destinationType});}
    if(req.method==='POST' && ['/api/whatsapp/click','/api/destination/click'].includes(url.pathname)) {if(!registerAllowed(req))return json(res,429,{error:'Please try again later'});return json(res,200,commercial.markJoinLinkClick((await parse(req)).joinTicket));}
    if(portalEnabled&&req.method==='POST'&&url.pathname==='/api/ambassador/profile/phone'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many requests.'});
      const source=String(req.headers.origin||'');
      if(source&&source!==siteUrl)return json(res,403,{error:'Invalid request origin'});
      return json(res,200,onboarding.editPhone(sessionCookie(req),(await parse(req)).phone));
    }
    if(portalEnabled&&req.method==='POST'&&url.pathname==='/api/ambassador/profile/email/request'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many requests.'});
      const source=String(req.headers.origin||'');
      if(source&&source!==siteUrl)return json(res,403,{error:'Invalid request origin'});
      if(!emailService.ready)return json(res,503,{error:'Email delivery unavailable'});
      const body=await parse(req);
      return json(res,200,await onboarding.requestEmailChange(sessionCookie(req),body.email,body.password,emailService.sendAmbassadorEmailChange,siteUrl));
    }
    if(portalEnabled&&req.method==='POST'&&url.pathname==='/api/ambassador/profile/email/confirm'){
      if(!registerAllowed(req))return json(res,429,{error:'Too many requests.'});
      return json(res,200,onboarding.confirmEmailChange((await parse(req)).token));
    }
    if(req.method==='GET' && url.pathname==='/api/ambassador/me') {const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');const amb=participants.ambassadorByToken(token);const session=portalEnabled?onboarding.session(sessionCookie(req)):null;const id=amb?.id||session?.ambassador_id;if(!id)return json(res,401,{error:'Sign-in required'});const view=participants.ownOverviewById(id);return json(res,200,{...view,...commercial.ownSummary(id),communityClicks:community.ownClicks(id),profile:session?{nameAr:session.name_ar,nameEn:session.name_en,email:session.email,country:session.country,phone:session.phone}:null});}
    if(req.method==='GET' && url.pathname==='/api/ambassador') return json(res,403,{error:'Sign-in required'});
    if(req.method==='GET' && url.pathname==='/api/public/opportunities') return json(res,200,{opportunities:opportunities.list().filter(o=>o.registration_status==='ready'&&o.active===1).map(o=>({slug:o.slug,title:o.title,eventDate:o.event_date,organizer:o.organizer,brandName:o.brand_name}))});
    if(url.pathname.startsWith('/api/admin/')){
      if(!authorized(req)) return json(res,403,{error:'Organizer sign-in required'});
      if(!csrfAllowed(req))return json(res,403,{error:'Request verification failed'});
      if(req.method==='POST'&&url.pathname==='/api/admin/test-invites'){
        if(!privateInviteReady())return json(res,503,{error:'Publish organizer-approved terms before inviting a tester. Verified SMTP and security gates are also required.'});
        const invited=testInvites.create(await parse(req));
        return json(res,201,{email:invited.email,expiresAt:invited.expiresAt,invitationUrl:siteUrl+'/#invite='+invited.token});
      }
      if(req.method==='GET'&&url.pathname==='/api/admin/enrollment')return json(res,200,{...enrollmentGate.view(),infrastructureReady:signupInfrastructureReady(),emailReady:emailService.ready,legalPublished:legal.managerView().publishedRevision>0});
      if(req.method==='POST'&&url.pathname==='/api/admin/enrollment'){
        const body=await parse(req);
        if(body.mode==='open'&&!signupInfrastructureReady()&&!localPreview)return json(res,503,{error:'Verified SMTP and approved terms are required before opening registrations.'});
        return json(res,200,enrollmentGate.update(body));
      }
      if(req.method==='GET'&&url.pathname==='/api/admin/community')return json(res,200,community.settings());
      if(req.method==='GET'&&url.pathname==='/api/admin/participants/export.csv'){
        const rows=store.db.prepare("SELECT p.id,p.phone,p.display_code,p.real_name,a.name AS ambassador_name,a.code AS ambassador_code,p.registered_at,p.status,p.join_clicked_at,p.joined_at,p.attended_at FROM participants p JOIN ambassadors a ON a.id=p.ambassador_id JOIN campaigns c ON c.id=p.campaign_id WHERE c.slug='linktutor-2026-11-28' ORDER BY p.registered_at,p.id").all();
        const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r\n]/,'\u0027$&').replace(/"/g,'""')+'"';
        const csv='\uFEFF'+[['participant_id','whatsapp_phone','participant_code','real_name','first_ambassador_name','first_ambassador_code','registered_at_utc','registered_at_beirut','status','community_clicked_at_utc','confirmed_join_at_utc','confirmed_attendance_at_utc'],...rows.map(r=>[r.id,r.phone,r.display_code,r.real_name,r.ambassador_name,r.ambassador_code,r.registered_at,new Date(r.registered_at.replace(' ','T')+'Z').toLocaleString('sv-SE',{timeZone:'Asia/Beirut',hour12:false}),r.status,r.join_clicked_at,r.joined_at,r.attended_at])].map(row=>row.map(safe).join(',')).join('\r\n')+'\r\n';
        res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="a1-opportunities-linktutor-referrals.csv"','cache-control':'no-store, private','x-content-type-options':'nosniff'});
        return res.end(csv);
      }
      if(req.method==='GET'&&url.pathname==='/api/admin/community/report')return json(res,200,community.report());
      if(req.method==='POST'&&url.pathname==='/api/admin/community')return json(res,200,community.configure(await parse(req)));
      if(req.method==='GET'&&url.pathname==='/api/admin/groups')return json(res,200,{groups:groupPool.list()});
      if(req.method==='POST'&&url.pathname==='/api/admin/groups')return json(res,201,groupPool.add(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/groups/update')return json(res,200,groupPool.edit(await parse(req)));
      if(req.method==='GET'&&url.pathname==='/api/admin/legal')return json(res,200,legal.managerView());
      if(req.method==='POST'&&url.pathname==='/api/admin/legal')return json(res,200,legal.save(await parse(req,25000)));
      if(req.method==='POST'&&url.pathname==='/api/admin/legal/publish')return json(res,200,legal.publish(await parse(req)));
      if(req.method==='GET'&&url.pathname==='/api/admin/applications') return json(res,200,{applications:onboarding.listApplications().filter(a=>a.campaign==='linktutor-2026-11-28')});
      if(req.method==='GET'&&url.pathname==='/api/admin/opportunities')return json(res,200,{opportunities:opportunities.list()});
      if(req.method==='GET'&&url.pathname==='/api/admin/organizations')return json(res,200,{organizations:opportunities.organizations()});
      if(req.method==='GET'&&url.pathname==='/api/admin/opportunities/report')return json(res,200,opportunities.report(url.searchParams.get('campaignId')));
      if(req.method==='POST'&&url.pathname==='/api/admin/organizations')return json(res,201,opportunities.addOrganization(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/opportunities')return json(res,201,opportunities.add(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/opportunities/draft-update')return json(res,200,opportunities.updateDraft(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/opportunities/terms')return json(res,200,opportunities.setTerms(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/opportunities/draft-status')return json(res,200,opportunities.setDraftStatus(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/opportunities/ambassador')return json(res,200,opportunities.grantAmbassador(await parse(req),participants.issueAmbassador));
      if(req.method==='GET'&&url.pathname==='/api/admin/overview') return json(res,200,store.adminOverview());
      if(req.method==='GET'&&url.pathname==='/api/admin/program') return json(res,200,program.view());
      if(req.method==='POST'&&url.pathname==='/api/admin/program') {const body=await parse(req);if(portalEnabled&&!localPreview&&body.registrationOpen===true&&(!ambassadorSecurityReady()||legal.managerView().publishedRevision===0||process.env.A1_REFERRAL_TERMS_APPROVED!=='1'))return json(res,503,{error:'Cloudflare protection and organizer-approved legal terms are required before public registration.'});return json(res,200,program.update(body));}
      if(req.method==='GET'&&url.pathname==='/api/admin/participants') return json(res,200,opportunities.legacyLtpAdminView());
      if(req.method==='POST'&&url.pathname==='/api/admin/sales/verify') return json(res,200,commercial.verifySale(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/sales/approve') return json(res,200,commercial.approveSale(Number((await parse(req)).id)));
      if(req.method==='POST'&&url.pathname==='/api/admin/sales/pay') return json(res,200,commercial.payCommission(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/sales/reverse') return json(res,200,commercial.reverseSale(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/ambassadors') return json(res,200,participants.issueAmbassador(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/ambassadors/status') return json(res,200,participants.setAmbassadorStatus(await parse(req)));
      if(req.method==='POST'&&url.pathname==='/api/admin/participants/status') {const input=await parse(req);return json(res,200,participants.updateStatus(Number(input.id),String(input.status)));}
      if(req.method==='POST'&&url.pathname==='/api/admin/payment') return json(res,410,{error:'Use the subscription verification workflow'});
      if(req.method==='POST'&&url.pathname==='/api/admin/refund') return json(res,410,{error:'Use the subscription reversal workflow'});
      return json(res,404,{error:'Unknown admin action'});
    }
    if(req.method==='GET' && /^\/branding\/a1-opps\/(?:label|icon)-(?:blue|darkblue|white)\.svg$/.test(url.pathname)){
      const asset=readFileSync(join(root,'public',url.pathname.slice(1)));
      res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"});
      return res.end(asset);
    }
    if(req.method==='GET' && /^\/branding\/linktutor-(light|dark)\.svg$/.test(url.pathname)) {const asset=readFileSync(join(root,'public',url.pathname.slice(1)));res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});return res.end(asset);}
    if(req.method==='GET' && /^\/fonts\/tajawal-(400|500|700|800)\.ttf$/.test(url.pathname)) {const font=readFileSync(join(root,'public',url.pathname.slice(1)));res.writeHead(200,{'content-type':'font/ttf','cache-control':'public, max-age=604800','x-content-type-options':'nosniff'});return res.end(font);}
    if(req.method==='GET' && ['/','/index.html','/campaign','/onboarding.html','/onboarding.css','/onboarding.js','/verify','/verify.html','/verify.js','/terms','/terms-preview.html','/terms-preview.js','/preview-info.css','/styles.css','/app.js','/community-choice.js','/campaign.css','/campaign.js','/ambassador','/ambassador.html','/ambassador.js','/ambassador-preview.html','/ambassador-preview.css','/ambassador-preview.js','/ambassador-reset','/ambassador/reset','/ambassador-reset.html','/ambassador-reset.js','/ambassador-reset-enhancements.css','/manage-preview.html','/manage-preview.css','/manage-preview.js','/manage-locale.js','/owner-security-ui.js','/reset','/reset.html','/reset.js','/manage','/manage.html','/manage.js'].includes(url.pathname)) {
      if(!portalEnabled && ['/onboarding.html','/onboarding.css','/onboarding.js','/verify','/verify.html','/verify.js','/terms','/terms-preview.html','/terms-preview.js','/preview-info.css','/reset','/reset.html','/reset.js','/ambassador-reset','/ambassador/reset','/ambassador-reset.html','/ambassador-reset.js'].includes(url.pathname))return json(res,404,{error:'Not found'});
      const name=url.pathname==='/'?(portalEnabled?'onboarding.html':'index.html'):url.pathname==='/campaign'?'index.html':url.pathname==='/reset'?'reset.html':url.pathname==='/ambassador-reset'?'ambassador-reset.html':url.pathname==='/ambassador/reset'?'ambassador-reset.html':url.pathname==='/verify'?'verify.html':url.pathname==='/terms'?'terms-preview.html':url.pathname==='/ambassador'?(portalEnabled?'ambassador-preview.html':'ambassador.html'):url.pathname==='/manage'?(portalEnabled?'manage-preview.html':'manage.html'):url.pathname.slice(1);
      // Count the actual referral landing page once, not the /r redirect and landing twice.
      // Internal page visits remain event counts; they are not unique visitors.
      if((url.pathname==='/campaign'||(!portalEnabled&&(url.pathname==='/'||url.pathname==='/index.html')))&&url.searchParams.has('ref')){
        const code=String(url.searchParams.get('ref')||'');
        if(/^[A-Za-z0-9_-]{3,64}$/.test(code))participants.recordVisit(code);
      }
      const content=readFileSync(join(root,'public',name));
      const type=name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html';
      res.writeHead(200,{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':portalEnabled?"default-src 'self'; img-src 'self' data:; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'":"default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none' "});return res.end(content);
    }
    json(res,404,{error:'Not found'});
  } catch(err){json(res,err?.status||400,{error:localPreview&&err?.status?err.message:'Request could not be processed'});}
}).listen(port,process.env.A1_REFERRAL_BIND || '127.0.0.1',()=>console.log('A1 Referral demo: http://127.0.0.1:'+port));



