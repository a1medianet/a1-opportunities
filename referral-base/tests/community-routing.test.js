import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createParticipantFlow} from '../src/participants.js';
import {createCommunityRouting} from '../src/community.js';
test('WhatsApp community only opens after owner config and only for an active ambassador',()=>{
 const dir=mkdtempSync(join(tmpdir(),'a1-community-'));
 const store=createStore(join(dir,'db.sqlite'));
 try{
  const flow=createParticipantFlow(store.db);
  const community=createCommunityRouting(store.db);
  assert.equal(community.enabledFor('ltp0'),false);
  const first=flow.issueAmbassador({name:'First Community Owner',campaign:'linktutor-2026-11-28'});
  const second=flow.issueAmbassador({name:'Second Community Owner',campaign:'linktutor-2026-11-28'});
  const firstCode=first.inviteUrl.split('/').pop();const secondCode=second.inviteUrl.split('/').pop();assert.ok(firstCode);assert.ok(secondCode);
  assert.equal(community.enabledFor(firstCode),false);
  assert.throws(()=>community.configure({inviteUrl:'https://evil.example/path',enabled:true}),{status:400});
  assert.throws(()=>community.configure({inviteUrl:'',enabled:true}),{status:400});
  const invitation='https://chat.whatsapp.com/ABCdef12345';
  community.configure({inviteUrl:invitation,enabled:false});
  assert.equal(community.enabledFor(firstCode),false);
  community.configure({inviteUrl:invitation,enabled:true});
  assert.equal(community.enabledFor(firstCode),true);
  assert.equal(community.enabledFor(secondCode),true);
  assert.equal(community.enabledFor('not-existing'),false);
  assert.equal(community.redirect(firstCode).url,invitation);
  assert.equal(community.redirect(firstCode).clicks,2);
  assert.equal(community.redirect(secondCode).clicks,1);
  assert.equal(community.redirect(firstCode).clicks,3);
  assert.throws(()=>community.redirect('not-existing'),{status:404});
  community.configure({inviteUrl:invitation,enabled:false});
  assert.throws(()=>community.redirect(firstCode),{status:503});
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM participants').get().n,0);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true})}
});
