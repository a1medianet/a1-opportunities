import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(name)=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('organizer legal editor displays only the active language without dropping stored bilingual fields',()=>{
 const html=file('manage-preview.html'),js=file('manage-locale.js'),css=file('manage-preview.css');
 assert.match(html,/id="legalEnglishField" data-policy-locale="en"/);
 assert.match(html,/id="legalArabicField" data-policy-locale="ar" hidden/);
 assert.match(js,/field\.hidden=field\.dataset\.policyLocale!==language/);
 assert.match(css,/\.legal-form label\[hidden\]\{display:none!important\}/);
 assert.match(file('manage-preview.js'),/english:\$\('legalEnglish'\)\.value,arabic:\$\('legalArabic'\)\.value/);
});
test('homepage ambassador signup switch shares server-side guarded enrollment mode',()=>{
 const html=file('manage-preview.html'),js=file('manage-preview.js');
 assert.match(html,/id="enrollmentPublicSwitch" type="checkbox" role="switch"/);
 assert.match(js,/\$\('enrollmentPublicSwitch'\)\.checked=Boolean\(value\.open\)/);
 assert.match(js,/\$\('enrollmentMode'\)\.value=\$\('enrollmentPublicSwitch'\)\.checked\?'open':'closed'/);
 assert.match(js,/request\('\/api\/admin\/enrollment','POST',input\)/);
});
