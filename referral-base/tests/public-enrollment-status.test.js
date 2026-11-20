import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const p=join(fileURLToPath(new URL('..',import.meta.url)),'public');
test('homepage displays enrollment schedule as information, never bypasses server readiness gate',()=>{
 const html=readFileSync(join(p,'onboarding.html'),'utf8');
 const code=readFileSync(join(p,'onboarding.js'),'utf8');
 assert.match(html,/id="publicEnrollmentSchedule"/);
 assert.match(html,/role="status"/);
 assert.match(code,/config\.enrollment/);
 assert.match(code,/Asia\/Beirut/);
 assert.match(code,/if\(signupAvailabilityState\|\|!scheduleForVisitors\|\|scheduleForVisitors\.mode!=='scheduled'\)/);
 assert.match(code,/subject to final approval/i);
 assert.match(code,/setSignupAvailability\(config\.ready,config\.invitation\)/);
});

