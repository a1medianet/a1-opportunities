'use strict';
const storageKey='a1ReferralLanguage';
let current='en';
try{current=localStorage.getItem(storageKey)==='ar'?'ar':'en'}catch{}
const translated={
 en:{title:'Program Terms & Privacy Notice',kicker:'PROGRAM INFORMATION',return:'Ambassador Registration',footer:'© 2026 LinkTutor Pro. All rights reserved.',page:'Program Terms & Privacy | LinkTutor Pro®'},
 ar:{title:'شروط البرنامج وإشعار الخصوصية',kicker:'معلومات البرنامج',return:'تسجيل السفراء',footer:'© 2026 LinkTutor Pro. All rights reserved.',page:'شروط البرنامج والخصوصية | LinkTutor Pro®'}
};
// Render the organizer's Markdown as safe DOM nodes, never as untrusted HTML.
function renderPolicyMarkdown(container,markdown){
 container.replaceChildren();
 const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');
 let list=null;
 function inline(parent,value){
  const parts=String(value).split(/(\*\*[^*\n]+\*\*)/g);
  for(const part of parts){
   if(part.startsWith('**')&&part.endsWith('**')&&part.length>4){
    const strong=document.createElement('strong');
    strong.textContent=part.slice(2,-2);parent.append(strong);
   }else if(part)parent.append(document.createTextNode(part));
  }
 }
 for(const raw of lines){
  const line=raw.trim();
  if(!line){list=null;continue;}
  const heading=/^(#{1,4})\s+(.+)$/.exec(line);
  if(heading){
   list=null;const level=Math.min(heading[1].length+1,4);
   const el=document.createElement('h'+level);inline(el,heading[2]);container.append(el);continue;
  }
  const bullet=/^[-*]\s+(.+)$/.exec(line);
  if(bullet){
   if(!list){list=document.createElement('ul');container.append(list)}
   const li=document.createElement('li');inline(li,bullet[1]);list.append(li);continue;
  }
  list=null;const paragraph=document.createElement('p');inline(paragraph,line);container.append(paragraph);
 }
}
const pubPolicy={english:'',arabic:''};
async function loadPolicy(){
 try{
  const r=await fetch('/api/legal',{cache:'no-store'});if(!r.ok)throw new Error('Policy unavailable');
  const d=await r.json();
  if(typeof d.english!=='string'||typeof d.arabic!=='string')throw new Error('Policy unavailable');
  pubPolicy.english=d.english;pubPolicy.arabic=d.arabic;
  const en=document.getElementById('policy-en'),ar=document.getElementById('policy-ar');
  renderPolicyMarkdown(en,pubPolicy.english);renderPolicyMarkdown(ar,pubPolicy.arabic);
 }catch{
  document.getElementById('policy-en').textContent='The program information is temporarily unavailable.';
  document.getElementById('policy-ar').textContent='تعذّر عرض معلومات البرنامج مؤقتًا.';
 }
 render();
}
function render(){
 const t=translated[current];
 document.documentElement.lang=current;
 document.documentElement.dir=current==='ar'?'rtl':'ltr';
 document.title=t.page;
 document.querySelectorAll('[data-i18n]').forEach(el=>{if(t[el.dataset.i18n])el.textContent=t[el.dataset.i18n]});
 document.getElementById('policy-en').hidden=current!=='en';
 document.getElementById('policy-ar').hidden=current!=='ar';
 document.querySelectorAll('#switchLanguage [data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===current)));
}
document.getElementById('switchLanguage').addEventListener('click',event=>{
 const btn=event.target.closest('button[data-lang]');if(!btn||btn.dataset.lang===current)return;
 current=btn.dataset.lang;
 try{localStorage.setItem(storageKey,current)}catch{}
 render();
});
render();
loadPolicy();
