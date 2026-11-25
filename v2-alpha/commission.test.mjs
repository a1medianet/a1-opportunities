import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCommission as c} from './commission.mjs';
test('200 USD, platform 20 percent, ambassador half of platform share',()=>assert.deepEqual(c({paidMinor:20000,platformBps:2000,ambassadorBps:5000}),{paidMinor:20000,eligibleMinor:20000,platformGrossMinor:4000,ambassadorMinor:2000,platformNetMinor:2000,organizerMinor:16000}));
test('integer rounding and conservation across small payments and rates',()=>{for(let p=0;p<200;p++)for(const a of [0,1,3333,5000,10000])for(const b of [0,1,3333,5000,10000]){const x=c({paidMinor:p,platformBps:a,ambassadorBps:b});assert.equal(x.organizerMinor+x.platformNetMinor+x.ambassadorMinor,p);assert.ok(x.ambassadorMinor<=x.platformGrossMinor);}});
test('invalid money and rates rejected',()=>{for(const v of [-1,1.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>c({paidMinor:v,platformBps:2000,ambassadorBps:5000}));assert.throws(()=>c({paidMinor:100,eligibleMinor:101,platformBps:2000,ambassadorBps:5000}));assert.throws(()=>c({paidMinor:100,platformBps:10001,ambassadorBps:5000}));});
test('excluded tax or fees do not generate commission when base is configured accordingly',()=>assert.equal(c({paidMinor:12000,eligibleMinor:10000,platformBps:2000,ambassadorBps:5000}).ambassadorMinor,1000));
test('maximum safe integer handled without multiplication precision loss',()=>{const p=Number.MAX_SAFE_INTEGER;const x=c({paidMinor:p,platformBps:10000,ambassadorBps:10000});assert.equal(x.ambassadorMinor,p);assert.equal(x.organizerMinor,0);});
