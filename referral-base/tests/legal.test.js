import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createLegalSettings} from '../src/legal.js';
function fixture(){
 const path=mkdtempSync(join(tmpdir(),'a1-ref-legal-'));
 const store=createStore(join(path,'legal.sqlite'));
 return {store,legal:createLegalSettings(store.db),close:()=>{store.db.close();rmSync(path,{recursive:true,force:true})}};
}
test('policy text can be edited in two languages without altering public wording',()=>{
 const f=fixture();
 try{
  const before=f.legal.publicView(),draft=f.legal.managerView();
  assert.equal(before.revision,0);
  const en='Policy in English: '+('LinkTutor Pro confirms organizer review of program conditions. ').repeat(5);
  const ar='الشروط باللغة العربية: '+('هذه المسودة تخص البرنامج ولا تنشر قبل موافقة الإدارة. ').repeat(5);
  const result=f.legal.save({english:en,arabic:ar});
  assert.equal(result.revision,draft.revision+1);
  assert.equal(result.draftEnglish,en.trim());
  assert.equal(f.legal.publicView().english,before.english);
  assert.equal(f.legal.publicView().arabic,before.arabic);
  assert.throws(()=>f.legal.publish({revision:result.revision-1,confirm:true}),/changed/);
  assert.throws(()=>f.legal.publish({revision:result.revision,confirm:false}),/confirmation/);
  const approved=f.legal.publish({revision:result.revision,confirm:true});
  assert.equal(approved.publishedRevision,result.revision);
  assert.equal(f.legal.publicView().english,en.trim());
  assert.equal(f.legal.publicView().arabic,ar.trim());
  assert.equal(createLegalSettings(f.store.db).publicView().revision,result.revision);
  assert.ok(f.store.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='legal.published'").get().n>=1);
 }finally{f.close()}
});
test('policy editor rejects empty and oversized text without publishing',()=>{
 const f=fixture();
 try{
  assert.throws(()=>f.legal.save({english:'short',arabic:'قصير'}),/150/);
  assert.throws(()=>f.legal.save({english:'A'.repeat(10001),arabic:'ب'.repeat(200)}),/150/);
  assert.equal(f.legal.publicView().revision,0);
 }finally{f.close()}
});
