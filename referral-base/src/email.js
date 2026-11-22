import nodemailer from 'nodemailer';
const formatEmail=value=>/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
const htmlEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getSafeUrl=value=>{const parsed=new URL(value);if(parsed.protocol!=='https:')throw new Error('A secure HTTPS action URL is required.');return parsed.href;};
export function renderActionEmail({heading,description,action,expiry,url,notice}){
 const safeUrl=getSafeUrl(url);
 const text=[heading,'',description,'',action+':',safeUrl,'','This secure, one-time link expires in '+expiry+'.','',notice,'','A1 Opportunities | A1 Media Network'].join('\n');
 const esc=htmlEscape;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
 <body style="margin:0;padding:32px 12px;background:#f0f5fc;font-family:Arial,Helvetica,sans-serif;color:#183260">
 <div style="max-width:580px;margin:auto;background:#fff;border:1px solid #dfE7f5;border-radius:16px;overflow:hidden">
 <div style="background:#153773;padding:24px 30px;color:#fff;font-weight:bold;font-size:22px">A1 <span style="font-weight:400">Opportunities</span></div>
 <div style="padding:30px">
 <h1 style="font-size:23px;line-height:1.3;margin:0 0 20px;color:#183260">${esc(heading)}</h1>
 <p style="font-size:15px;line-height:1.8;margin:0 0 24px">${esc(description)}</p>
 <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:#2548b9;border-radius:9px">
 <a href="${esc(safeUrl)}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:15px;font-weight:bold">${esc(action)}</a>
 </td></tr></table>
 <p style="font-size:13px;color:#536887;line-height:1.7;margin-top:22px">This one-time secure link expires in <strong>${esc(expiry)}</strong>.</p>
 <p style="font-size:13px;line-height:1.65;color:#536887">${esc(notice)}</p>
 <p style="font-size:12px;color:#6d7d95;margin-top:24px;overflow-wrap:anywhere">If the button does not work, copy the following link into your browser:<br><a href="${esc(safeUrl)}" style="color:#2548b9;overflow-wrap:anywhere">${esc(safeUrl)}</a></p>
 </div>
 <div style="padding:18px 30px;background:#f6f8fc;color:#60718e;font-size:12px">A1 Opportunities · Operated by A1 Media Network</div>
 </div></body></html>`;
 return {text,html};
}
export function createEmailService(env=process.env){
 const host=String(env.A1_REFERRAL_SMTP_HOST||'').trim(),port=Number(env.A1_REFERRAL_SMTP_PORT||0);
 const user=String(env.A1_REFERRAL_SMTP_USER||''),pass=String(env.A1_REFERRAL_SMTP_PASSWORD||'');
 const from=String(env.A1_REFERRAL_MAIL_FROM||'').trim();
 const ready=Boolean(/^[\w.-]{4,253}$/.test(host)&&[465,587].includes(port)&&formatEmail(from)&&user&&pass&&env.A1_REFERRAL_VERIFIED_EMAIL_DELIVERY==='1');
 let transporter;
 if(ready)transporter=nodemailer.createTransport({
  host,port,secure:port===465,requireTLS:port===587,
  auth:{user,pass},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:12000,
  disableFileAccess:true,disableUrlAccess:true
 });
 async function send(to,subject,body){
  if(!ready||!formatEmail(to))throw Object.assign(new Error('Email sending is not configured.'),{status:503});
  const content=typeof body==='string'?{text:body}:body;
  const sent=await transporter.sendMail({from:{name:'A1 Opportunities',address:from},to,subject,...content,disableFileAccess:true,disableUrlAccess:true});
  if(!sent.accepted?.includes(to))throw new Error('Email was not accepted by the SMTP relay.');
  return true;
 }
 const dispatch=(to,subject,content)=>send(to,subject,renderActionEmail(content));
 return {
  ready,
  sendRecoveryEmail:(to,url)=>dispatch(to,'Reset your A1 Opportunities management password',{heading:'Reset your management password',description:'We received a request to reset the password for your A1 Opportunities management account.',action:'Reset management password',expiry:'15 minutes',url,notice:'If you did not request this, ignore this message. Two-step verification remains required when enabled.'}),
  sendAmbassadorInvitationEmail:(to,url)=>dispatch(to,'Activate your A1 Opportunities ambassador account',{heading:'Activate your ambassador account',description:'Your existing ambassador referral code has been linked to this email by the A1 Opportunities platform owner. Set your password to activate your account.',action:'Activate my ambassador account',expiry:'24 hours',url,notice:'If you were not expecting this invitation, ignore this email. Your account cannot be accessed until you set your password.'}),
  sendAmbassadorRecoveryEmail:(to,url)=>dispatch(to,'Reset your A1 Opportunities ambassador password',{heading:'Reset your ambassador password',description:'We received a request to reset your A1 Opportunities ambassador account password.',action:'Reset my password',expiry:'15 minutes',url,notice:'If you did not request a password reset, ignore this message. Your password will remain unchanged.'}),
  sendAmbassadorEmailChange:(to,url)=>dispatch(to,'Confirm your new A1 Opportunities email',{heading:'Confirm your new email address',description:'A change of email address was requested for your ambassador account. Confirm that you own this new email address.',action:'Confirm new email',expiry:'24 hours',url,notice:'If you did not request this, ignore this message. Your previous email stays active.'}),
  sendActivationEmail:(to,url)=>dispatch(to,'Verify your A1 Opportunities ambassador email',{heading:'Verify your email address',description:'Welcome to A1 Opportunities. Verify this email address to activate your ambassador account.',action:'Verify my email',expiry:'24 hours',url,notice:'If you did not create an ambassador account, you can safely ignore this message.'})
 };
}
