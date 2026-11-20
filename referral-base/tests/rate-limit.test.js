import test from 'node:test';
import assert from 'node:assert/strict';
import {createRateLimiter} from '../src/rate-limit.js';
const req=(route,ip='172.17.0.1')=>({method:'POST',url:route,socket:{remoteAddress:ip}});
test('owner sign-in, ambassador sign-in and signup have independent protection windows',()=>{
 let time=10000;
 const allowed=createRateLimiter({now:()=>time,maxPerWindow:8,windowMs:60000});
 for(let i=0;i<8;i++)assert.equal(allowed(req('/api/ambassador/signup')),true);
 assert.equal(allowed(req('/api/ambassador/signup')),false);
 assert.equal(allowed(req('/api/owner/login')),true);
 assert.equal(allowed(req('/api/ambassador/login')),true);
 assert.equal(allowed(req('/api/admin/test-invites')),true);
 assert.equal(allowed(req('/api/participants')),true);
 assert.equal(allowed(req('/api/ambassador/signup?invite=foo')),false,'query strings must not create new buckets');
 time+=60001;
 assert.equal(allowed(req('/api/ambassador/signup')),true,'window expiry restores allowed attempts');
});
test('distinct source addresses cannot exhaust one another',()=>{
 const allowed=createRateLimiter({maxPerWindow:1});
 assert.equal(allowed(req('/api/owner/login','172.17.0.2')),true);
 assert.equal(allowed(req('/api/owner/login','172.17.0.2')),false);
 assert.equal(allowed(req('/api/owner/login','172.17.0.3')),true);
});
