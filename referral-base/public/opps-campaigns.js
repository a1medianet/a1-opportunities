const $=id=>document.getElementById(id);
let csrf='',campaigns=[],organizations=[];
const say=(message,bad=false)=>{const el=$('message');el.textContent=message;el.className=bad?'error':'';if(typeof updateLanguage==='function')updateLanguage()};
async function request(path,method='GET',body){
 const response=await fetch(path,{method,credentials:'same-origin',headers:{...(method!=='GET'?{'x-a1-owner-csrf':csrf,'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({error:'تعذر الاتصال'}));
 if(!response.ok)throw Error(data.error||'Request failed ('+response.status+')');return data;
}
const addOption=(select,value,text)=>{const el=document.createElement('option');el.value=value;el.textContent=text;select.append(el)};
function draw(){
 $('campaignList').replaceChildren();
 const t=document.createElement('table'),header=document.createElement('tr');
 for(const title of ['الحملة','الجهة','الرمز','الحالة','عمولة الجهة','حصة A1','إحالة رقم صفر']){const th=document.createElement('th');th.textContent=title;header.append(th)}t.append(header);
 for(const o of campaigns){const r=document.createElement('tr');for(const val of [o.title,o.organizer,o.slug,o.registration_status,(o.gross_cents/100).toFixed(2)+' $',(o.a1_fee_cents/100).toFixed(2)+' $',o.owner_referral_code||'قيد التجهيز']){const cell=document.createElement('td');cell.textContent=String(val||'');r.append(cell)}t.append(r)}$('campaignList').append(t);
 $('organizationId').replaceChildren();for(const org of organizations)addOption($('organizationId'),org.id,org.name+' — '+org.status);
 $('campaignId').replaceChildren();for(const o of campaigns)addOption($('campaignId'),o.id,o.title);
 $('reportCampaign').replaceChildren();for(const o of campaigns)addOption($('reportCampaign'),o.id,o.title);
 $('draftCampaignId').replaceChildren();for(const o of campaigns)addOption($('draftCampaignId'),o.id,o.title);
 const current=$('editCampaignId').value;$('editCampaignId').replaceChildren();for(const o of campaigns)addOption($('editCampaignId'),o.id,o.title);if(campaigns.some(o=>String(o.id)===current))$('editCampaignId').value=current;populateEdit();
 if(typeof updateLanguage==='function')updateLanguage();
}
function populateEdit(){
 const o=campaigns.find(x=>String(x.id)===$('editCampaignId').value);
 if(!o)return;
 $('editTitle').value=o.title||'';
 $('editDate').value=o.event_date||'';
 $('editBrand').value=o.brand_name||'';
 $('editDescription').value=o.description||'';
 $('editUrl').value=o.organizer_url||'';
 $('editCampaignForm').querySelector('button[type=submit]').disabled=o.registration_status==='ready';
}
$('editCampaignId').addEventListener('change',populateEdit);
$('editCampaignForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector('button[type=submit]');
 try{
  const data=Object.fromEntries(new FormData(form));
  data.campaignId=Number(data.campaignId);
  button.disabled=true;
  const result=await request('/api/admin/opportunities/draft-update','POST',data);
  await refresh();say('تم حفظ تفاصيل الحملة رقم '+result.campaignId+' وتوثيق التعديل'); 
 }catch(e){say(e.message,true)}finally{const o=campaigns.find(x=>String(x.id)===$('editCampaignId').value);button.disabled=o?.registration_status==='ready'}
});
async function refresh(){const result=await Promise.all([request('/api/admin/opportunities'),request('/api/admin/organizations')]);campaigns=result[0].opportunities;organizations=result[1].organizations;draw()}
async function init(){try{const session=await request('/api/owner/me');csrf=session.csrf;if(!csrf)throw Error('No owner session');await refresh();$('content').hidden=false}catch(e){$('loginRequired').hidden=false;$('content').hidden=true}}
$('organizationForm').addEventListener('submit',async event=>{event.preventDefault();try{const data=Object.fromEntries(new FormData(event.target));await request('/api/admin/organizations','POST',data);event.target.reset();await refresh();say('أُضيفت الجهة كمسودة')}catch(e){say(e.message,true)}});
$('campaignForm').addEventListener('submit',async event=>{event.preventDefault();try{const form=new FormData(event.target);const data=Object.fromEntries(form);data.organizationId=Number(data.organizationId);const out=await request('/api/admin/opportunities','POST',data);event.target.reset();await refresh();say('حُفظت الحملة كمسودة. رابطك الشخصي: '+location.origin+'/r/'+out.ownerReferralCode)}catch(e){say(e.message,true)}});
$('termsForm').addEventListener('submit',async event=>{event.preventDefault();try{const f=new FormData(event.target);const mode=f.get('mode'),gross=Number(f.get('gross')),value=Number(f.get('value'));if(!Number.isFinite(gross)||!Number.isFinite(value)||gross<0||value<0)throw Error('قيم غير صحيحة');const data={campaignId:Number(f.get('campaignId')),grossCents:Math.round(gross*100),mode,value:Math.round(value*100),reason:f.get('reason')};const result=await request('/api/admin/opportunities/terms','POST',data);await refresh();say('تم توثيق التعديل. نصيب A1 '+(result.a1FeeCents/100).toFixed(2)+' $، والباقي '+(result.ambassadorCents/100).toFixed(2)+' $')}catch(e){say(e.message,true)}});
$('draftStatusForm').addEventListener('submit',async event=>{
 event.preventDefault();
 try {
  const form=new FormData(event.target),campaignId=Number(form.get('campaignId')),status=String(form.get('status'));
  const existing=campaigns.find(o=>o.id===campaignId);
  if(!existing||existing.registration_status==='ready')throw Error('This campaign cannot be modified here');
  await request('/api/admin/opportunities/draft-status','POST',{campaignId,status});
  await refresh();say('تم حفظ حالة الحملة دون فتح التسجيل');
 } catch(e){say(e.message,true)}
});
$('loadReport').addEventListener('click',async()=>{
 try{
  const id=$('reportCampaign').value,info=await request('/api/admin/opportunities/report?campaignId='+encodeURIComponent(id));
  const tbl=document.createElement('table'),head=document.createElement('tr');
  for(const label of ['السفير','رمز الإحالة','الزيارات','التسجيلات','الاشتراكات المثبتة','عمولات مسجلة ($)','المصروف والمسجل ($)']){const c=document.createElement('th');c.textContent=label;head.append(c)}
  tbl.append(head);
  for(const a of info.ambassadors){const tr=document.createElement('tr');for(const val of [a.name,a.code,a.visits,a.registrations,a.verified_sales,(a.tracked_commission_cents/100).toFixed(2),(a.recorded_paid_cents/100).toFixed(2)]){const cell=document.createElement('td');cell.textContent=val;tr.append(cell)}tbl.append(tr)}
  $('reportTable').replaceChildren(tbl);if(typeof updateLanguage==='function')updateLanguage();say('تم تحميل تقرير الحملة المحددة')
 }catch(e){say(e.message,true)}
});
init();
