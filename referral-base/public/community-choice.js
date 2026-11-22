const $=id=>document.getElementById(id);
const primary=$('open-community');
const fallback=$('open-other');
const url=$('invite-url');
const android=/Android/i.test(navigator.userAgent);
const lang=(navigator.languages||[navigator.language||'ar']).some(v=>/^ar\b/i.test(v))?'ar':'en';
if(android){
 primary.href=primary.dataset.business;
 primary.rel='noreferrer';
}else{
 // On other devices use the ordinary HTTPS invite; app selection is determined by the OS.
 fallback.hidden=true;
}
if(lang==='en'){
 document.documentElement.lang='en';document.documentElement.dir='ltr';
 $('title').textContent='Registration saved';
 $('description').textContent='Continue to the A1 Opportunities WhatsApp community';
 primary.textContent='Open community';
 fallback.textContent='Use regular WhatsApp';
 $('fallback-title').textContent='WhatsApp not opening?';
 $('copy-link').textContent='Copy community link';
 url.setAttribute('aria-label','Community link');
}
$('copy-link').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(url.value);$('copy-link').textContent=lang==='ar'?'تم نسخ الرابط':'Link copied'}
 catch{url.focus();url.select();$('copy-link').textContent=lang==='ar'?'انسخ الرابط المحدد':'Copy selected link'}
});
