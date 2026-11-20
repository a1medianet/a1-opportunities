import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createGroupPool} from '../src/groups.js';
import {createParticipantFlow} from '../src/participants.js';
import {createEnrollmentGate} from '../src/enrollment-gate.js';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'a1ref-pool-'));
 const store=createStore(join(dir,'isolated.sqlite'));
 const groups=createGroupPool(store.db);
 const flow=createParticipantFlow(store.db,null,id=>groups.ticketForParticipant(id));
 const gate=createEnrollmentGate(store.db,{now:()=>Date.parse('2026-11-18T12:00:00Z')});
 return {db:store.db,flow,groups,gate,close:()=>{store.db.close();rmSync(dir,{recursive:true,force:true})}};
}
const makeGroup=(name,tail,priority=100,capacity=10)=>({name,url:'https://chat.whatsapp.com/'+tail,priority,capacity,reportedMembers:0});
test('groups: named WhatsApp links can be activated, closed and rerouted by a permanent opaque link',()=>{
 const f=fixture();
 try{
  const a=f.groups.add(makeGroup('Group One','AbCdEfGhIj12345',1));
  const b=f.groups.add(makeGroup('Group Two','AbCdEfGhIj98765',2));
  assert.equal(f.groups.list()[0].status,'draft');
  f.groups.edit({id:a.id,status:'active'});
  f.groups.edit({id:b.id,status:'active'});
  const amb=f.flow.issueAmbassador({name:'Ambassador QA'});
  assert.equal(amb.inviteUrl,'/r/LTP0000');
  const p=f.flow.register({code:'LTP0000',name:'Participant QA',phone:'+96170123456',consent:true});
  assert.match(p.redirectPath,/^\/join\/[-_A-Za-z0-9]{43}$/);
  const original=f.groups.redirect(p.redirectPath.slice(6));
  assert.equal(original.groupId,a.id);
  assert.equal(f.groups.list()[0].routedParticipants,1);
  const reopened=f.flow.register({code:'LTP0000',name:'Participant QA',phone:'+96170123456',consent:true});
  assert.match(reopened.redirectPath,/^\/join\//);
  const same=f.groups.redirect(reopened.redirectPath.slice(6));
  assert.equal(same.groupId,a.id);
  f.groups.edit({id:a.id,status:'full'});
  const next=f.groups.redirect(p.redirectPath.slice(6));
  assert.equal(next.groupId,b.id);
  const stillNext=f.groups.redirect(p.redirectPath.slice(6));
  assert.equal(stillNext.groupId,b.id);
  f.groups.edit({id:b.id,status:'closed'});
  assert.throws(()=>f.groups.redirect(p.redirectPath.slice(6)),e=>e.status===503);
  assert.throws(()=>f.groups.redirect('bad'),e=>e.status===404);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM participants').get().n,1);
  const part=f.db.prepare('SELECT joined_at,join_clicked_at FROM participants').get();
  assert.equal(part.joined_at,null,'a click cannot be counted as a confirmed group join');
  assert.ok(part.join_clicked_at);
 }finally{f.close()}
});
test('groups: capacity and priority, validation and duplicate links',()=>{
 const f=fixture();
 try{
  const a=f.groups.add(makeGroup('First','AbCdEfGhIj123456',10,1));
  const b=f.groups.add(makeGroup('Second','AbCdEfGhIj987654',20,1));
  f.groups.edit({id:a.id,status:'active'});
  f.groups.edit({id:b.id,status:'active'});
  assert.throws(()=>f.groups.add(makeGroup('First','AbCdEfGhIj987699')),e=>e.status===409);
  const amb=f.flow.issueAmbassador({name:'Ambassador QA'});
  const p1=f.flow.register({code:'LTP0000',name:'One User',phone:'+96170123456',consent:true});
  const p2=f.flow.register({code:'LTP0000',name:'Two User',phone:'+96170123457',consent:true});
  assert.equal(f.groups.redirect(p1.redirectPath.slice(6)).groupId,a.id);
  assert.equal(f.groups.redirect(p2.redirectPath.slice(6)).groupId,b.id);
  f.groups.edit({id:b.id,reportedMembers:1});
  const p3=f.flow.register({code:'LTP0000',name:'Three User',phone:'+96170123458',consent:true});
  assert.throws(()=>f.groups.redirect(p3.redirectPath.slice(6)),e=>e.status===503);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='destination.group_redirected'").get().n,2);
 }finally{f.close()}
});
test('ambassador enrollment: default closed, manual opening, scheduled gate and audit',()=>{
 const f=fixture();
 try{
  assert.equal(f.gate.view().open,false);
  assert.equal(f.gate.update({mode:'open'}).open,true);
  assert.equal(f.gate.update({mode:'closed'}).open,false);
  assert.equal(f.gate.update({mode:'scheduled',opensAt:'2026-11-20T07:00:00.000Z'}).open,false);
  assert.throws(()=>f.gate.update({mode:'scheduled',opensAt:'2026-11-17T07:00:00.000Z'}),e=>e.status===400);
  assert.ok(f.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action LIKE 'ambassador.enrollment_gate_%'").get().n>=3);
 }finally{f.close()}
});
