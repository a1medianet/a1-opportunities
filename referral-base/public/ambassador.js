'use strict';
const $=id=>document.getElementById(id);
let accessToken='';
const participantLabels={registered:'مسجّل — بانتظار تأكيد الإدارة',joined:'انضم للمجموعة (مؤكد)',attended:'حضر اللقاء (مؤكد)',enrolled:'اشتراك مدفوع مثبت'};
const commissionLabels={verified:'الدفع مثبت · العمولة بانتظار الاعتماد',approved:'العمولة معتمدة · بانتظار الصرف',paid:'العمولة مصروفة',reversed:'ملغاة / مستردة'};
const money=cents=>(Number(cents||0)/100).toFixed(2)+' USD';
function stat(label,value,detail){
 const card=document.createElement('div');card.className='amb-metric';
 const heading=document.createElement('small');heading.textContent=label;
 const number=document.createElement('strong');number.textContent=String(value);
 const desc=document.createElement('span');desc.textContent=detail;
 card.append(heading,number,desc);return card;
}
function column(tr,value){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)}
async function show(){
 const r=await fetch('/api/ambassador/me',{headers:{authorization:'Bearer '+accessToken},cache:'no-store'});
 if(!r.ok)throw Error('تعذّر الدخول. تحقق من المفتاح أو تواصل مع الإدارة.');
 const d=await r.json();$('login').hidden=true;$('dashboard').hidden=false;
 $('welcome').textContent='مرحبًا '+d.name;
 $('invite').value=location.origin+d.inviteUrl;
 $('count').textContent=d.count;
 const s=d.summary||{};
 $('ambassadorTotals').replaceChildren(
 stat('فتح رابط الدعوة',d.linkVisits||0,'عدد مرات الفتح، لا يمثل زوارًا فريدين'),
 stat('المسجّلون',s.registered||0,'أسماء مرتبطة برابطك'),
 stat('فتحوا واتساب',s.clickedWhatsApp||0,'لا يعني انضمامهم'),
 stat('انضمام مؤكد',s.confirmedJoin||0,'بتأكيد الإدارة'),
 stat('حضور مؤكد',s.attended||0,'بتأكيد الإدارة'),
 stat('اشتراكات مدفوعة',s.subscriptions||0,'بعد إثبات الدفع'),
 stat('بانتظار اعتماد العمولة',money(s.pendingApprovalCents),'مبالغ مثبتة لا تُصرف بعد'),
 stat('معتمدة غير مصروفة',money(s.approvedUnpaidCents),'جاهزة للصرف الإداري'),
 stat('عمولات مصروفة',money(s.paidCents),'صرف موثق بمرجع')
 );
 $('people').replaceChildren();
 for(const p of d.participants||[]){
   const row=document.createElement('tr');
   const evidence=[participantLabels[p.status]||p.status,p.confirmedJoin?'انضمام مؤكد':'انضمام غير مؤكد',p.confirmedAttendance?'حضور مؤكد':'حضور غير مؤكد'].join(' · ');
  for(const value of [p.name,p.clickedWhatsApp?'نعم':'لا',evidence,p.registered_at])column(row,value);
   $('people').append(row);
 }
 if(!d.participants?.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='لا توجد تسجيلات حتى الآن. شارك رابط الدعوة لبدء المتابعة.';row.append(td);$('people').append(row)}
 const names=new Map((d.participants||[]).map(p=>[p.id,p.name]));
 $('sales').replaceChildren();
 for(const item of d.sales||[]){const row=document.createElement('tr');for(const value of [names.get(item.participant_id)||'مشارك مسجّل',money(item.commission_cents),commissionLabels[item.status]||item.status])column(row,value);$('sales').append(row)}
 if(!d.sales?.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='لا توجد اشتراكات مدفوعة مثبتة بعد.';row.append(td);$('sales').append(row)}
 $('dashStatus').textContent='تم تحديث البيانات.';
}
$('loginForm').addEventListener('submit',async event=>{event.preventDefault();accessToken=$('access').value.trim();$('loginStatus').textContent='';try{await show();$('access').value=''}catch(err){$('loginStatus').textContent=err.message;accessToken=''}});
$('refreshDashboard').addEventListener('click',()=>show().catch(e=>$('dashStatus').textContent=e.message));
$('copyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('invite').value);$('copyStatus').textContent='تم نسخ الرابط.'}catch{$('invite').select();$('copyStatus').textContent='حدّد الرابط وانسخه من الحقل.'}});
$('shareLink').addEventListener('click',()=>{const url='https://wa.me/?text='+encodeURIComponent('رابط التسجيل في لقاء LinkTutor Pro: '+$('invite').value);window.open(url,'_blank','noopener,noreferrer')});
$('logout').addEventListener('click',()=>{accessToken='';$('access').value='';$('dashboard').hidden=true;$('login').hidden=false;$('loginStatus').textContent='';$('copyStatus').textContent=''});
