import nodemailer from 'nodemailer';
const formatEmail=value=>/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
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
 async function send(to,subject,text){
  if(!ready||!formatEmail(to))throw Object.assign(new Error('Email sending is not configured.'),{status:503});
  const sent=await transporter.sendMail({from,to,subject,text,disableFileAccess:true,disableUrlAccess:true});
  if(!sent.accepted?.includes(to))throw new Error('Email was not accepted by the SMTP relay.');
  return true;
 }
 return {
  ready,
  sendRecoveryEmail:(to,url)=>send(to,'Reset your A1 Referral management password',
   'A password reset was requested for your A1 Referral management account.\n\nOpen this one-time link within 15 minutes:\n'+url+'\n\nIf you did not request this change, ignore this message. If two-step verification is enabled, your authenticator or recovery code is also required.'),
  sendAmbassadorInvitationEmail:(to,url)=>send(to,'Activate your A1 Opportunities ambassador login',
   'Your existing ambassador referral code has been linked to this email by the A1 Opportunities platform owner.\n\nTo verify this mailbox and choose your password, open this one-time link within 24 hours:\n'+url+'\n\nIf you did not request this invitation, ignore this message. No account can be used before you set your password.'),
  sendAmbassadorRecoveryEmail:(to,url)=>send(to,'Reset your A1 Opportunities ambassador password',
   'A password reset was requested for your A1 Opportunities ambassador account.\n\nOpen the one-time link within 15 minutes:\n'+url+'\n\nIf you did not request a reset, ignore this email.'),
  sendAmbassadorEmailChange:(to,url)=>send(to,'Confirm your new A1 Opportunities email',
   'You requested to change your ambassador account email.\n\nConfirm the NEW email within 24 hours using this one-time link:\n'+url+'\n\nIf you did not request this, ignore this message. Your previous email stays active.'),
  sendActivationEmail:(to,url)=>send(to,'Verify your A1 Opportunities ambassador email',
   'Welcome to the A1 Opportunities ambassador program.\n\nVerify your email using this one-time link within 24 hours:\n'+url+'\n\nIf you did not create an account, you can safely ignore this message.')
 };
}
