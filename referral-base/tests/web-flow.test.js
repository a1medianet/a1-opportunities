import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const freePort=()=>new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
async function boot(env){
 const dir=mkdtempSync(join(tmpdir(),'a1-referral-web-')),port=await freePort();
 const child=spawn(process.execPath,['src/server.js'],{cwd:new URL('..',import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,m=>m.slice(1)),env:{...process.env,A1_REFERRAL_DB_PATH:join(dir,'flow.sqlite'),A1_REFERRAL_PORT:String(port),A1_REFERRAL_BIND:'127.0.0.1',A1_REFERRAL_ADMIN_KEY:'review-local-admin-secret-never-production',...env},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<130;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return {child,dir,base}}catch{}await new Promise(r=>setTimeout(r,100));}
 child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(dir,{recursive:true,force:true});throw Error('Server startup failed');
}
test('public invite to named participant, organizer confirmation, private ambassador scope',async()=>{
 const {child,dir,base}=await boot({A1_REFERRAL_REGISTRATION_OPEN:'1',A1_REFERRAL_WHATSAPP_GROUP_URL:'https://chat.whatsapp.com/GroupFakeForTestOnly'});
 const owner={'x-demo-admin-key':'review-local-admin-secret-never-production','content-type':'application/json'};
 const call=async(path,method='GET',payload,headers={})=>{const r=await fetch(base+path,{method,headers:{...headers},body:payload?JSON.stringify(payload):undefined});let data;try{data=await r.json()}catch{data={}}return {status:r.status,data,headers:r.headers}};
 try{
   assert.equal((await call('/api/program')).data.registrationOpen,false);
   assert.equal((await call('/api/admin/program','POST',{groupUrl:'https://chat.whatsapp.com/GroupFakeForTestOnly',registrationOpen:true,organizerApproved:false},owner)).status,400);
   assert.equal((await call('/api/admin/program','POST',{groupUrl:'https://chat.whatsapp.com/GroupFakeForTestOnly',registrationOpen:true,organizerApproved:true},owner)).status,200);
   assert.equal((await call('/api/program')).data.registrationOpen,true);
   assert.equal((await call('/api/ambassador/me')).status,401);
   assert.equal((await call('/api/admin/participants')).status,403);
   for(const route of ['/ambassador','/manage'])assert.equal((await fetch(base+route)).status,200);
   const ambassador=await call('/api/admin/ambassadors','POST',{name:'Inviter One'},owner);
   assert.equal(ambassador.status,200);
   const invite=ambassador.data.inviteUrl,token=ambassador.data.accessToken;
   const follow=await fetch(base+invite,{redirect:'manual'});assert.equal(follow.status,302);assert.equal(follow.headers.get('location'),'/?ref='+invite.slice(3));
   const inputs={code:invite.slice(3),name:'Visitor One',phone:'+999123456789',consent:true};
   const registered=await call('/api/participants','POST',inputs,{'content-type':'application/json'});
   assert.equal(registered.status,200);assert.equal(registered.data.received,true);assert.ok(registered.data.groupUrl.startsWith('https://chat.whatsapp.com/'));
   const repeat=await call('/api/participants','POST',{...inputs,name:'Changed name'}, {'content-type':'application/json'});
   assert.equal(repeat.data.received,true);
   assert.equal(repeat.data.groupUrl,registered.data.groupUrl);
   assert.equal(Object.hasOwn(repeat.data,'joinTicket'),false);
   assert.equal((await call('/api/whatsapp/click','POST',{joinTicket:registered.data.joinTicket},{'content-type':'application/json'})).data.recorded,true);
   assert.equal((await call('/api/whatsapp/click','POST',{joinTicket:registered.data.joinTicket},{'content-type':'application/json'})).data.recorded,true);
   assert.equal((await call('/api/ambassador/me','GET',null,{authorization:'Bearer '+invite.slice(3)})).status,401);
   const mine=await call('/api/ambassador/me','GET',null,{authorization:'Bearer '+token});
   assert.equal(mine.status,200);assert.equal(mine.data.count,1);assert.equal(mine.data.participants[0].name,'Visitor One');
   assert.equal(Object.hasOwn(mine.data.participants[0],'phone'),false);
   const people=await call('/api/admin/participants','GET',null,owner);assert.equal(people.data.participants[0].phone,'+999123456789');
   const id=people.data.participants[0].id;
   assert.equal((await call('/api/admin/participants/status','POST',{id,status:'joined'},owner)).data.updated,true);
   assert.equal((await call('/api/admin/participants/status','POST',{id,status:'attended'},owner)).data.updated,true);
   assert.equal((await call('/api/admin/participants/status','POST',{id,status:'enrolled'},owner)).status,400);
   assert.equal((await call('/api/admin/sales/verify','POST',{participantId:id,paymentRef:'TEST-SALE-0001',evidenceRef:'TEST-RECEIPT-0001',saleCents:9000,commissionCents:1000},owner)).status,200);
   assert.equal((await call('/api/admin/sales/verify','POST',{participantId:id,paymentRef:'TEST-SALE-0002',evidenceRef:'TEST-RECEIPT-0002',saleCents:9000,commissionCents:1000},owner)).status,400);
   assert.equal((await call('/api/admin/sales/approve','POST',{id:1},owner)).status,200);
   assert.equal((await call('/api/admin/sales/pay','POST',{id:1,payoutRef:'TRANSFER-0001'},owner)).status,200);
   const summary=await call('/api/admin/participants','GET',null,owner);assert.equal(summary.data.totals.verifiedSubscriptions,1);assert.equal(summary.data.totals.paidCommissionCents,1000);
   assert.equal(summary.data.perAmbassador.find(x=>x.name==='Inviter One').clickedWhatsApp,1);
   assert.equal((await call('/api/ambassador/me','GET',null,{authorization:'Bearer '+token})).data.participants[0].status,'enrolled');
 }finally{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}
});
test('group joining is closed when organizer has not supplied official invitation',async()=>{
 const {child,dir,base}=await boot({A1_REFERRAL_REGISTRATION_OPEN:'0',A1_REFERRAL_WHATSAPP_GROUP_URL:''});
 try{
  const state=await fetch(base+'/api/program').then(r=>r.json());assert.equal(state.registrationOpen,false);
  const r=await fetch(base+'/api/participants',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Person',phone:'+999123456789',code:'any',consent:true})});
  assert.equal(r.status,503);
 }finally{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}
});
