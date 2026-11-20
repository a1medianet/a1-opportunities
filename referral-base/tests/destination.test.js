import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/core.js';
import {createProgramSettings} from '../src/settings.js';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'a1-referral-destination-'));const store=createStore(join(dir,'local.sqlite'));
 const settings=createProgramSettings(store.db);
 return {settings,close(){store.db.close();rmSync(dir,{recursive:true,force:true})}};
}
test('organizer selects WhatsApp or pre-approved HTTPS destination without exposing unapproved links',()=>{
 const f=fixture();try{
  assert.equal(f.settings.active().registrationOpen,false);
  assert.throws(()=>f.settings.update({destinationType:'custom',customUrl:'http://linktutorpro.com/',organizerApproved:true,registrationOpen:true}));
  assert.throws(()=>f.settings.update({destinationType:'custom',customUrl:'https://localhost:8080/',organizerApproved:true,registrationOpen:true}));
  assert.throws(()=>f.settings.update({destinationType:'custom',customUrl:'https://unapproved.example/',organizerApproved:true,registrationOpen:true}));
  assert.throws(()=>f.settings.update({destinationType:'custom',customUrl:'https://linktutorpro.com/intro',organizerApproved:false,registrationOpen:true}));
  const custom=f.settings.update({destinationType:'custom',customUrl:'https://linktutorpro.com/intro',organizerApproved:true,registrationOpen:true});
  assert.equal(custom.active,true);
  assert.equal(f.settings.active().groupUrl,'https://linktutorpro.com/intro');
  assert.equal(f.settings.active().destinationType,'custom');
  const standard=f.settings.update({destinationType:'whatsapp',groupUrl:'https://chat.whatsapp.com/GroupForTestingOnly',organizerApproved:true,registrationOpen:true});
  assert.equal(standard.active,true);
  assert.equal(f.settings.active().destinationType,'whatsapp');
  assert.equal(f.settings.active().groupUrl,'https://chat.whatsapp.com/GroupForTestingOnly');
  f.settings.update({groupUrl:'',organizerApproved:false,registrationOpen:false});
  assert.equal(f.settings.active().registrationOpen,false);
 }finally{f.close()}
});
