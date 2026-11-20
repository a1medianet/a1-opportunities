import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
test('visitor registration is linked to one ambassador, duplicate phone cannot switch inviter',()=>{
 const dir=mkdtempSync(join(tmpdir(),'referral-participants-'));
 const store=createStore(join(dir,'test.sqlite'));
 try{
 const flow=createParticipantFlow(store.db);
 const a=flow.issueAmbassador({name:'Ambassador One'}),b=flow.issueAmbassador({name:'Ambassador Two'});
 assert.match(a.inviteUrl,/^\/r\/[A-Za-z0-9_-]+$/);
 assert.equal(flow.ownOverview(a.inviteUrl.slice(3)),null,'public referral code is not an access credential');
 const tokenA=a.accessToken;const tokenB=b.accessToken;
 const codeA=a.inviteUrl.slice(3),codeB=b.inviteUrl.slice(3);
 assert.deepEqual(flow.register({code:codeA,name:'Visitor One',phone:'+999123456789',consent:true}),{received:true});
 assert.deepEqual(flow.register({code:codeB,name:'Visitor Copy',phone:'+999123456789',consent:true}),{received:true});
 assert.equal(flow.ownOverview(tokenA).count,1);
 assert.equal(flow.ownOverview(tokenB).count,0);
 assert.equal(flow.ownOverview(tokenA).participants[0].name,'Visitor One');
 assert.ok(!Object.hasOwn(flow.ownOverview(tokenA).participants[0],'phone'));
 assert.equal(flow.ownerOverview()[0].phone,'+999123456789');
 assert.throws(()=>flow.register({code:codeA,name:'No Consent',phone:'+999123456780',consent:false}),/Consent/);
 const id=flow.ownerOverview()[0].id;
 assert.equal(flow.updateStatus(id,'joined').updated,true);
 assert.equal(flow.updateStatus(id,'joined').updated,false);
 assert.equal(flow.updateStatus(id,'attended').updated,true);
 assert.throws(()=>flow.updateStatus(id,'enrolled'),/verified payment/);
 assert.equal(flow.ownOverview(tokenA).participants[0].status,'attended');
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});
