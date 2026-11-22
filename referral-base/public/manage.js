const $=id=>document.getElementById(id);
let key='';
let participantCache=[],displayedParticipants=[];
const money=cents=>(Number(cents||0)/100).toFixed(2)+' USD';
const statuses={registered:'مسجّل',joined:'انضم للمجموعة',attended:'حضر الجلسة',enrolled:'اشتراك مدفوع مثبت'};
const saleStatuses={verified:'تم إثبات الدفع',approved:'العمولة معتمدة',paid:'العمولة مصروفة',reversed:'ملغى / مسترد'};
async function api(path,method='GET',data){
 const r=await fetch(path,{method,headers:{'x-demo-admin-key':key,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
 if(!r.ok)throw Error(r.status===403?'لا تملك صلاحية الدخول':'تعذّر إتمام الإجراء');
 return r.json();
}
function cell(row,value){const td=document.createElement('td');td.textContent=String(value??'');row.append(td);return td}
function action(container,label,work){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',async()=>{
  button.disabled=true;$('ownerMessage').textContent='';
  try{
   const outcome=await work();
   if(outcome===false)return; // cancelled by the administrator
   if(outcome==='navigate')return; // navigation is not a saved change
   await refresh();$('ownerMessage').textContent='تم حفظ الإجراء.';
  }catch(e){$('ownerMessage').textContent=e.message}
  finally{button.disabled=false}
 });container.append(button,document.createTextNode(' '));
}

function summaryMetric(label,value,description){
 const node=document.createElement('div');node.className='owner-kpi';
 const heading=document.createElement('span');heading.textContent=label;
 const number=document.createElement('strong');number.textContent=String(value);
 const note=document.createElement('small');note.textContent=description;
 node.append(heading,number,note);return node;
}
function drawParticipants(){
 const term=$('participantSearch').value.trim().toLocaleLowerCase(),filter=$('participantFilter').value;
 displayedParticipants=participantCache.filter(p=>{
  if(term&&!([p.id,p.name,p.real_name,p.display_code,p.phone,p.ambassador].join(' ').toLocaleLowerCase().includes(term)))return false;
  if(filter==='joined')return Boolean(p.confirmedJoin);
  if(filter==='attended')return Boolean(p.confirmedAttendance);
  return filter==='all'||(filter==='clicked'?Boolean(p.clickedWhatsApp):p.status===filter);
 });
 $('rows').replaceChildren();
 for(const p of displayedParticipants){
  const tr=document.createElement('tr');
  const evidence=[statuses[p.status]||p.status,p.confirmedJoin?'انضمام مؤكد':'انضمام غير مؤكد',p.confirmedAttendance?'حضور مؤكد':'حضور غير مؤكد'].join(' · ');
  for(const v of [(p.real_name||p.display_code||p.name),p.phone,p.ambassador+' ('+p.ambassador_code+')',new Date(p.registered_at.replace(' ','T')+'Z').toLocaleString('ar-LB',{timeZone:'Asia/Beirut',hour12:true}),p.clickedWhatsApp?'فتح الرابط':'لم يفتحه',evidence])cell(tr,v);
  const td=document.createElement('td');
  if(!p.confirmedJoin)action(td,'تأكيد الانضمام',()=>api('/api/admin/participants/status','POST',{id:p.id,status:'joined'}));
  if(!p.confirmedAttendance)action(td,'تأكيد الحضور',()=>api('/api/admin/participants/status','POST',{id:p.id,status:'attended'}));
  if(p.status!=='enrolled')action(td,'إثبات اشتراك',async()=>{$('saleParticipant').value=p.id;$('salePaymentRef').focus();$('verifySubscription').scrollIntoView({behavior:'smooth'});return 'navigate'});
  tr.append(td);$('rows').append(tr);
 }
 $('resultsCount').textContent='المعروض '+displayedParticipants.length+' من آخر '+participantCache.length+' مشارك (حد الصفحة: أحدث 200).';
}
function exportVisibleParticipants(){
 if(!key||$('ownerPanel').hidden)return;
 const records=[['الرقم','الاسم الداخلي','الاسم الحقيقي','رمز المشارك','واتساب','السفير','رمز السفير','فتح رابط المجموعة','الحالة','وقت التسجيل UTC','وقت التسجيل بيروت'],...displayedParticipants.map(p=>[p.id,p.name,p.real_name,p.display_code,p.phone,p.ambassador,p.ambassador_code,p.clickedWhatsApp?'نعم':'لا',statuses[p.status]||p.status,p.registered_at,new Date(p.registered_at.replace(' ','T')+'Z').toLocaleString('sv-SE',{timeZone:'Asia/Beirut',hour12:false})])];
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'").replace(/"/g,'""')+'"';
 const csv='\uFEFF'+records.map(row=>row.map(safe).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='linktutor-referrals-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}

function moneyPrompt(label){
 const value=window.prompt(label);
 return value===null?null:String(value).trim();
}
async function refresh(){
 const [d,program]=await Promise.all([api('/api/admin/participants'),api('/api/admin/program')]);
 $('programGroupUrl').value=program.groupUrl||'';$('programApproved').checked=program.organizerApproved;$('programOpen').checked=program.registrationOpen;
 $('programState').textContent=program.active?'التسجيل مفتوح الآن.':'التسجيل مغلق حاليًا.';
 $('ambassadorSummary').replaceChildren();$('salesRows').replaceChildren();$('ambassadorDirectory').replaceChildren();
 const showInactive=$('showInactiveAmbassadors').checked;
 const statusById=new Map((d.ambassadors||[]).map(a=>[a.id,a.status]));
 for(const a of d.ambassadors||[]){
  if(!showInactive&&a.status!=='approved')continue;
  const tr=document.createElement('tr');
  const statusText={approved:'نشط',pending:'بانتظار الموافقة',suspended:'معطّل مؤقتًا'};
  for(const v of [a.name,statusText[a.status]||a.status,a.registered,location.origin+'/r/'+a.code])cell(tr,v);
  const td=document.createElement('td');
  const next=a.status==='approved'?'suspended':'approved';
  action(td,a.status==='approved'?'تعطيل مؤقت':'تفعيل',async()=>{
   if(!confirm((next==='suspended'?'تعطيل':'تفعيل')+' رابط المحيل '+a.name+'؟ ستبقى سجلاته محفوظة.'))return false;
   await api('/api/admin/ambassadors/status','POST',{id:a.id,status:next});
  });tr.append(td);$('ambassadorDirectory').append(tr);
 }
 const totals=d.totals||{};
 const ambassadors=d.perAmbassador||[];
 $('ownerKpis').replaceChildren(
 summaryMetric('فتح رابط الدعوة',ambassadors.reduce((n,a)=>n+(Number(a.linkVisits)||0),0),'مرات الفتح، ليست زوارًا فريدين'),
 summaryMetric('المسجّلون',ambassadors.reduce((n,a)=>n+(Number(a.registered)||0),0),'من روابط السفراء'),
 summaryMetric('فتحوا رابط واتساب',ambassadors.reduce((n,a)=>n+(Number(a.clickedWhatsApp)||0),0),'لا يعني الانضمام'),
 summaryMetric('انضمام مؤكد',ambassadors.reduce((n,a)=>n+(Number(a.confirmedJoin)||0),0),'بعد تأكيد الإدارة'),
 summaryMetric('اشتراكات مثبتة',totals.verifiedSubscriptions||0,'بعد إثبات الدفع'),
 summaryMetric('العمولات',money(totals.totalCommissionCents),'الموثقة'),
 summaryMetric('المصروف',money(totals.paidCommissionCents),'بمرجع حوالة')
 );
 $('ownerTotals').textContent='الاشتراكات المثبتة: '+(totals.verifiedSubscriptions||0)+' | مجموع العمولات: '+money(totals.totalCommissionCents)+' | المصروف: '+money(totals.paidCommissionCents)+' | مبالغ مصروفة تحتاج تسوية بعد إلغاء الاشتراك: '+money(totals.recoveryOutstandingCents);
 for(const a of d.perAmbassador||[]){
  if(!showInactive&&statusById.get(a.id)!=='approved'&&!Number(a.registered)&&!Number(a.verifiedSubscriptions))continue;
  const tr=document.createElement('tr');
  for(const x of [a.name,a.linkVisits||0,a.registered,a.clickedWhatsApp,a.confirmedJoin,a.attended,a.verifiedSubscriptions,money(a.commissionCents),money(a.paidCents)])cell(tr,x);
  $('ambassadorSummary').append(tr);
 }
 participantCache=d.participants||[];
 drawParticipants();
 for(const s of d.sales||[]){
  const tr=document.createElement('tr');for(const x of [s.participant,s.ambassador,money(s.sale_cents),money(s.commission_cents),saleStatuses[s.status]||s.status])cell(tr,x);
  const td=document.createElement('td');
  if(s.status==='verified')action(td,'اعتماد العمولة',async()=>{if(!confirm('اعتماد عمولة '+money(s.commission_cents)+'؟'))return false;await api('/api/admin/sales/approve','POST',{id:s.id})});
  if(s.status==='approved')action(td,'تسجيل الصرف',async()=>{const payoutRef=moneyPrompt('مرجع الحوالة أو سند الصرف (إلزامي)');if(payoutRef===null)return false;await api('/api/admin/sales/pay','POST',{id:s.id,payoutRef})});
  if(s.status!=='reversed')action(td,'إلغاء / استرداد',async()=>{const reason=moneyPrompt('سبب الإلغاء أو الاسترداد (8 أحرف على الأقل)');if(reason===null)return false;const result=await api('/api/admin/sales/reverse','POST',{id:s.id,reason});if(result.recoveryRequired)alert('تم تسجيل الإلغاء؛ يلزم تحصيل المبلغ المصروف أو تسويته، ولم يُعتبر مستردًا تلقائيًا.')});
  tr.append(td);$('salesRows').append(tr);
 }
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();key=$('ownerKey').value.trim();try{await refresh();$('ownerLogin').hidden=true;$('ownerPanel').hidden=false;$('ownerKey').value=''}catch(err){key='';$('loginStatus').textContent=err.message}});
$('refresh').addEventListener('click',()=>refresh().catch(err=>$('ownerMessage').textContent=err.message));
$('showInactiveAmbassadors').addEventListener('change',()=>refresh().catch(err=>$('ownerMessage').textContent=err.message));
$('participantSearch').addEventListener('input',drawParticipants);
$('participantFilter').addEventListener('change',drawParticipants);
$('exportParticipants').addEventListener('click',exportVisibleParticipants);
$('newAmbassador').addEventListener('submit',async e=>{e.preventDefault();try{
 const d=await api('/api/admin/ambassadors','POST',{name:$('ambassadorName').value.trim()});
 $('createdAccount').hidden=false;$('createdAccount').textContent='السفير: '+d.name+'\nرابط الدعوة: '+location.origin+d.inviteUrl+'\nصفحة الدخول: '+location.origin+'/ambassador'+'\nمفتاح الدخول الخاص (يظهر مرة واحدة): '+d.accessToken;
 $('ambassadorName').value='';await refresh();
 }catch(err){$('ownerMessage').textContent=err.message}});
$('programForm').addEventListener('submit',async e=>{e.preventDefault();try{
 const data={groupUrl:$('programGroupUrl').value.trim(),organizerApproved:$('programApproved').checked,registrationOpen:$('programOpen').checked};
 if(data.registrationOpen&&!confirm('هل تم اعتماد رابط المجموعة وشروط المشاركة رسميًا؟'))return;
 await api('/api/admin/program','POST',data);await refresh();$('ownerMessage').textContent='حُفظت إعدادات البرنامج.';
 }catch(err){$('ownerMessage').textContent=err.message}});
$('verifySubscription').addEventListener('submit',async e=>{e.preventDefault();
 const amount=Math.round(Number($('saleAmount').value)*100),commission=Math.round(Number($('saleCommission').value)*100);
 if(!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(commission)||commission<0){$('ownerMessage').textContent='تحقق من قيمة الاشتراك والعمولة.';return}
 if(!confirm('هل تحققت الإدارة من استلام مبلغ الاشتراك ومستند الإثبات؟'))return;
 try{await api('/api/admin/sales/verify','POST',{participantId:Number($('saleParticipant').value),paymentRef:$('salePaymentRef').value.trim(),evidenceRef:$('saleEvidence').value.trim(),saleCents:amount,commissionCents:commission});$('verifySubscription').reset();$('ownerMessage').textContent='تم إثبات الاشتراك. راجع العمولة لاعتمادها.';await refresh()}
 catch(err){$('ownerMessage').textContent=err.message}
});
$('logout').addEventListener('click',()=>{key='';participantCache=[];displayedParticipants=[];$('ownerKpis').replaceChildren();$('participantSearch').value='';$('ownerPanel').hidden=true;$('ownerLogin').hidden=false;$('createdAccount').hidden=true;$('createdAccount').textContent='';$('rows').replaceChildren();$('salesRows').replaceChildren();$('ambassadorSummary').replaceChildren();$('ambassadorDirectory').replaceChildren()});
