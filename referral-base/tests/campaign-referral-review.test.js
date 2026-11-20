import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('referral landing offers participant registration before benefit articles',()=>{
 const h=read('public/index.html');
 assert.ok(h.indexOf('id="register"')>h.indexOf('class="trust shell"'));
 assert.ok(h.indexOf('id="register"')<h.indexOf('id="benefits"'));
 assert.match(h,/id="registration"/);
 assert.match(h,/id="participantTurnstile"/);
});
test('participant Turnstile config is independent of ambassador signup gate',()=>{
 const s=read('src/server.js'),c=read('public/app.js');
 assert.match(s,/url\.pathname==='\/api\/participant\/security\/config'/);
 assert.match(s,/turnstileEnabled:portalEnabled&&liveTurnstileReady/);
 assert.match(c,/fetch\('\/api\/participant\/security\/config'/);
 assert.doesNotMatch(c,/fetch\('\/api\/signup-config'/);
 assert.match(s,/verifyTurnstile\(input.turnstileToken,'participant_signup'\)/);
});
