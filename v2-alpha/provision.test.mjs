import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionAmbassador as run} from './provision.mjs';
function setup(){
 const links=new Map(),assets=new Map(),locks=new Map(),calls={go:0,render:0};
 const store={getLink:k=>links.get(k),saveLink:(k,v)=>links.set(k,v),getAsset:k=>assets.get(k),saveAsset:(k,v)=>assets.set(k,v),async runExclusive(k,f){const prev=locks.get(k)||Promise.resolve();const next=prev.catch(()=>{}).then(f);locks.set(k,next);try{return await next}finally{if(locks.get(k)===next)locks.delete(k)}}};
 const campaign={organizationId:'o1',id:'c1',status:'active',termsVersion:'t1',templates:['feed','story','portrait'].map(format=>({organizationId:'o1',campaignId:'c1',id:format,version:'1',format,kind:'static',status:'published'}))};
 const member={organizationId:'o1',campaignId:'c1',id:'a1',status:'active',acceptedTermsVersion:'t1'};
 const go={async ensureReferral(x){calls.go++;const url='https://go.example.test/'+x.key;return {url,qrPayload:url}}};
 const content={async render(x){calls.render++;return {id:x.key,request:x}}};
 return {campaign,member,go,content,store,calls};
}
test('three exact sizes and only two personalization fields',async()=>{const x=setup(),r=await run(x);assert.deepEqual(r.assets.map(a=>[a.request.width,a.request.height]),[[1080,1080],[1080,1920],[1080,1350]]);for(const a of r.assets)assert.deepEqual(a.request.overlays,{qrPayload:r.link.url,shortUrl:r.link.url});});
test('concurrent activation reuses link and renders once per version',async()=>{const x=setup();const [a,b]=await Promise.all([run(x),run(x)]);assert.deepEqual(a,b);assert.deepEqual(x.calls,{go:1,render:3});x.campaign.templates[0].version='2';await run(x);assert.deepEqual(x.calls,{go:1,render:4});});
test('reject unaccepted terms suspended member and wrong campaign',async()=>{for(const patch of [{acceptedTermsVersion:'old'},{status:'suspended'},{campaignId:'other'},{organizationId:'other'}]){const x=setup();Object.assign(x.member,patch);await assert.rejects(run(x));assert.equal(x.calls.go,0);}});
test('exclude draft assets and reject cross-tenant published template',async()=>{const x=setup();x.campaign.templates[0].status='draft';assert.equal((await run(x)).assets.length,2);x.campaign.templates[1].organizationId='other';await assert.rejects(run(x),/scope/);});
test('retry after renderer failure preserves link and completed assets',async()=>{const x=setup(),render=x.content.render;x.content.render=async a=>{if(a.templateId==='story')throw Error('offline');return render(a)};await assert.rejects(run(x));x.content.render=render;assert.equal((await run(x)).assets.length,3);assert.deepEqual(x.calls,{go:1,render:3});});
test('reject QR that differs from assigned short URL',async()=>{const x=setup();x.go.ensureReferral=async()=>({url:'https://go.example.test/a',qrPayload:'https://go.example.test/b'});await assert.rejects(run(x),/binding/);assert.equal(x.calls.render,0);});
test('different ambassador has independent referral and motion template supported',async()=>{const x=setup();x.campaign.templates[0].kind='motion';const a=await run(x);x.member.id='a2';const b=await run(x);assert.notEqual(a.link.url,b.link.url);assert.equal(b.assets[0].request.kind,'motion');});
