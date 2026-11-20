import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page = readFileSync('public/onboarding.html','utf8');
const client = readFileSync('public/onboarding.js','utf8');

test('public registration is hidden by default, while preview explains its disabled state',()=>{
 assert.match(page,/<form id="joinForm" hidden novalidate>/);
 assert.match(page,/<p id="previewNotice"[^>]* hidden/);
 assert.match(client,/new URLSearchParams\(location\.search\)\.get\('preview'\) === '1'/);
 assert.match(client,/\$\('joinForm'\)\.hidden=!usable&&!managerPreview/);
 assert.match(client,/\$\('previewNotice'\)\.hidden=!managerPreview\|\|usable/);
});

test('manager preview cannot enable controls, submit a signup, or fake human verification',()=>{
 assert.match(client,/for\(const field of \$\('joinForm'\)\.querySelectorAll\('input,select,button'\)\) field\.disabled=!usable/);
 assert.match(client,/event\.preventDefault\(\);if\(!signupAvailabilityState\|\|\$\('submitButton'\)\.disabled\)return/);
 assert.match(client,/siteKey=config\.siteKey\|\|''/);
 assert.match(client,/\$\('turnstileProtection'\)\.hidden=true/);
 assert.doesNotMatch(client,/managerPreview\s*\?\s*true\s*:\s*config\.ready/);
});
