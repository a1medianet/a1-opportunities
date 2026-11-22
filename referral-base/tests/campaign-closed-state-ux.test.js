import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('participant registration defaults to an honest closed card, not a disabled form preview',()=>{
 const html=read('public/index.html'),js=read('public/app.js'),css=read('public/campaign.css');
 assert.match(html,/id="registrationClosedCard"/);
 assert.match(html,/<form id="registration" class="form-card" hidden>/);
 assert.match(js,/\$\('registration'\)\.hidden=!registrationOpen/);
 assert.match(js,/\$\('registrationClosedCard'\)\.hidden=registrationOpen/);
 assert.match(css,/\.campaign-page \[hidden\]\{display:none!important\}/);
});
test('participant captcha only renders after real attributed community availability',()=>{
 const js=read('public/app.js');
 assert.match(js,/if\(!registrationOpen\|\|!window\.turnstile/);
 assert.match(js,/fetch\('\/api\/community\?ref='/);
 assert.match(js,/registrationOpen=d\?\.available===true && Boolean\(ref\)/);
});
test('attributed community requires name registration before WhatsApp',()=>{
 const campaign=read('public/campaign.js'),html=read('public/index.html'),css=read('public/campaign.css');
 assert.match(html,/id="register" hidden aria-hidden="true"/);
 assert.match(css,/\.campaign-page \.signup-area\[hidden\]\{display:none!important\}/);
 assert.match(html,/href="#session"><span data-c="start"/);
 assert.match(campaign,/communityInviteLink'\)\.href='#register'/);
 assert.match(campaign,/No prior teaching experience required/);
 assert.match(campaign,/لا تُشترط خبرة تدريس سابقة/);
});
test('landing marketing copy is motivational and bilingual',()=>{
 const campaign=read('public/campaign.js');
 assert.match(campaign,/Start your journey teaching Arabic online/);
 assert.match(campaign,/ابدأ رحلتك في تعليم العربية/);
});
