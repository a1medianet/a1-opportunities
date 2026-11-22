import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('referral landing offers participant registration before benefit articles',()=>{
 const h=read('public/index.html');
 assert.ok(h.indexOf('id="register"')>h.indexOf('class="opportunity-card"'));
 assert.ok(h.indexOf('id="register"')<h.indexOf('id="benefits"'));
 assert.match(h,/id="registration"/);
 assert.doesNotMatch(h,/id="participantTurnstile"/);
});
test('phone-only community registration is rate limited and not Turnstile-gated',()=>{
 const s=read('src/server.js'),c=read('public/app.js');
 const start=s.indexOf("url.pathname==='/api/community/register'");
 assert.ok(start>=0);
 const route=s.slice(start,s.indexOf("url.pathname==='/api/participant/security/config'",start));
 assert.match(route,/registerAllowed\(req\)/);
 assert.doesNotMatch(route,/verifyTurnstile/);
 assert.match(c,/\/api\/community\/register/);
});
