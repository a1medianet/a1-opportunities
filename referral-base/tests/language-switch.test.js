import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const pages=['onboarding.html','terms-preview.html','verify.html','ambassador-preview.html','manage-preview.html'];
for(const filename of pages){
 test('AR and EN are direct adjacent controls with no slash: '+filename,()=>{
  const html=readFileSync(join('public',filename),'utf8');
  assert.match(html,/(?:data-lang|data-locale)="en"/);
  assert.match(html,/(?:data-lang|data-locale)="ar"/);
  assert.doesNotMatch(html,/<span\s+aria-hidden="true">\s*\/\s*<\/span>/);
  assert.match(html,/<button[^>]*(?:data-lang|data-locale)="en"[^>]*>EN<\/button>\s*<button[^>]*(?:data-lang|data-locale)="ar"[^>]*>AR<\/button>/);
 });
}
