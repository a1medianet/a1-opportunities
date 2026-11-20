'use strict';
const $=id=>document.getElementById(id);
let ownerCsrf='',records=[],shown=[],applications=[],ambassadorRecords=[],program={},legalDraftRevision=0;
async function refreshCommunity(){
 try{
  const c=await request('/api/admin/community');
  $('communityInviteUrl').value=c.inviteUrl||'';
  $('communityEnabled').checked=Boolean(c.enabled);
  $('communityStatus').textContent=c.enabled?'Community invitation is published on attributed referral pages.':'Community invitation is not published.';
  const report=await request('/api/admin/community/report');
  $('communityReportSummary').textContent='Referral link visits: '+report.visits+' · Community link clicks: '+report.communityClicks;
  const body=$('communityReportRows');body.replaceChildren();
  for(const r of report.rows){const tr=document.createElement('tr');td(tr,r.name);td(tr,r.code);td(tr,r.visits);td(tr,r.communityClicks);body.append(tr);}
  if(!report.rows.length)empty(body,4,'No ambassador activity recorded yet.');
 }catch(error){$('communityStatus').textContent=error.message}
}
const money=value=>(Number(value||0)/100).toFixed(2)+' USD';
const stateLabels={registered:'Registered',joined:'Group member confirmed',attended:'Attendance confirmed',enrolled:'Paid subscription verified'};
const commissionLabels={verified:'Payment verified · approval pending',approved:'Commission approved',paid:'Payout recorded',reversed:'Reversed / refunded'};
const request=async(path,method='GET',data)=>{
 const res=await fetch(path,{method,cache:'no-store',headers:{'x-a1-owner-csrf':ownerCsrf,'content-type':'application/json'},credentials:'same-origin',body:data?JSON.stringify(data):undefined});
 const response=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(res.status===403?'Access denied. Please sign in again.':response.error||'Request could not be completed.');
 return response;
};
const td=(tr,txt,cls)=>{
 const c=document.createElement('td');c.textContent=String(txt??'');if(cls)c.className=cls;tr.append(c);return c;
};
const empty=(tbody,columns,text)=>{
 const tr=document.createElement('tr');const cell=document.createElement('td');
 cell.colSpan=columns;cell.className='muted';cell.textContent=text;tr.append(cell);tbody.append(tr);
};
function command(cell,title,perform){
 const b=document.createElement('button');b.type='button';b.textContent=title;
 b.addEventListener('click',async()=>{
  $('ownerMessage').textContent='';b.disabled=true;
  try{const out=await perform();if(out===false)return;await refresh();$('ownerMessage').textContent='Update saved.'}
  catch(error){$('ownerMessage').textContent=error.message}
  finally{b.disabled=false}
 });
 cell.append(b);
}
const stat=(label,value,description)=>{
 const el=document.createElement('div');el.className='kpi';
 const a=document.createElement('span');a.textContent=label;
 const b=document.createElement('strong');b.textContent=String(value);
 const d=document.createElement('small');d.textContent=description;
 el.append(a,b,d);return el;
};
function renderApplications(){
 const tbody=$('applicationsRows');tbody.replaceChildren();
 $('applicationsCount').textContent=applications.length+' applications';
 for(const a of applications){
  const tr=document.createElement('tr');
  td(tr,a.name_en);td(tr,a.email);td(tr,new Intl.DisplayNames(['en'],{type:'region'}).of(a.country)||a.country);td(tr,a.phone);
  td(tr,a.campaign);td(tr,a.email_verified_at?'Verified':'Pending verification');
  td(tr,a.referral_code?location.origin+'/r/'+a.referral_code:'Not activated yet','link-cell');
  tbody.append(tr);
 }
 if(!applications.length)empty(tbody,7,'No ambassador applications yet.');
}
function renderAmbassadors(){
 const tbody=$('ambassadorsRows');tbody.replaceChildren();
 const showInactive=$('showInactive').checked;
 for(const a of ambassadorRecords){
  if(a.status!=='approved'&&!showInactive)continue;
  const tr=document.createElement('tr');
  td(tr,a.name);td(tr,a.status==='approved'?'Active':a.status==='suspended'?'Suspended':'Pending');
  td(tr,a.registered);td(tr,location.origin+'/r/'+a.code,'link-cell');
  const actions=document.createElement('td');
  command(actions,a.status==='approved'?'Suspend':'Activate',async()=>{
   if(!confirm((a.status==='approved'?'Suspend ':'Activate ')+a.name+'? Previous referral and commission records will be kept.'))return false;
   await request('/api/admin/ambassadors/status','POST',{id:a.id,status:a.status==='approved'?'suspended':'approved'});
  });
  tr.append(actions);tbody.append(tr);
 }
 if(!tbody.children.length)empty(tbody,5,'No active ambassadors yet. Verified applications will appear here.');
}
function filtered(){
 const term=$('participantSearch').value.trim().toLowerCase();
 const filter=$('participantFilter').value;
 shown=records.filter(p=>{
  if(term&&!([p.id,p.name,p.phone,p.ambassador].join(' ').toLowerCase().includes(term)))return false;
  if(filter==='joined')return Boolean(p.confirmedJoin);
  if(filter==='attended')return Boolean(p.confirmedAttendance);
  return filter==='all'||(filter==='clicked'?Boolean(p.clickedWhatsApp):p.status===filter);
 });
 $('resultsCount').textContent='Showing '+shown.length+' of the latest '+records.length+' participants.';
}
function renderParticipants(){
 filtered();const tbody=$('participantsRows');tbody.replaceChildren();
 for(const p of shown){
  const tr=document.createElement('tr');
  td(tr,p.id+' · '+p.name);td(tr,p.phone);td(tr,p.ambassador);
  td(tr,p.clickedWhatsApp?'Opened link':'Not clicked');
  const evidence=[stateLabels[p.status]||p.status,p.confirmedJoin?'Group join confirmed':'',p.confirmedAttendance?'Attendance confirmed':''].filter(Boolean).join(' · ');
  td(tr,evidence);
  const actions=document.createElement('td');
  if(!p.confirmedJoin)command(actions,'Confirm joining',()=>request('/api/admin/participants/status','POST',{id:p.id,status:'joined'}));
  if(!p.confirmedAttendance)command(actions,'Confirm attendance',()=>request('/api/admin/participants/status','POST',{id:p.id,status:'attended'}));
  if(p.status!=='enrolled')command(actions,'Verify subscription',async()=>{$('saleParticipant').value=p.id;location.hash='sales';$('salePaymentRef').focus();return false});
  tr.append(actions);tbody.append(tr);
 }
 if(!shown.length)empty(tbody,6,'No participants match these filters.');
}
function renderSales(sales){
 const tbody=$('salesRows');tbody.replaceChildren();
 for(const s of sales){
  const tr=document.createElement('tr');
  for(const x of [s.participant,s.ambassador,money(s.sale_cents),money(s.commission_cents),commissionLabels[s.status]||s.status])td(tr,x);
  const actions=document.createElement('td');
  if(s.status==='verified')command(actions,'Approve',async()=>{if(!confirm('Approve commission '+money(s.commission_cents)+'?'))return false;await request('/api/admin/sales/approve','POST',{id:s.id})});
  if(s.status==='approved')command(actions,'Record payout',async()=>{const ref=prompt('Enter payout reference:');if(ref===null)return false;await request('/api/admin/sales/pay','POST',{id:s.id,payoutRef:ref.trim()})});
  if(s.status!=='reversed')command(actions,'Refund / Reverse',async()=>{
   const reason=prompt('Reason for refund or reversal (minimum 8 characters):');if(reason===null)return false;
   const response=await request('/api/admin/sales/reverse','POST',{id:s.id,reason:reason.trim()});
   if(response.recoveryRequired)alert('Refund recorded. A previously paid commission requires recovery or settlement.');
  });
  tr.append(actions);tbody.append(tr);
 }
 if(!sales.length)empty(tbody,6,'No verified paid subscriptions yet.');
}
async function refresh(){
 const [d,a,settings,policy,enrollment,groupResponse]=await Promise.all([request('/api/admin/participants'),request('/api/admin/applications'),request('/api/admin/program'),request('/api/admin/legal'),request('/api/admin/enrollment'),request('/api/admin/groups')]);
 renderEnrollment(enrollment);renderGroups(groupResponse.groups);void refreshCommunity();
 legalDraftRevision=policy.revision;
 $('legalEnglish').value=policy.draftEnglish;
 $('legalArabic').value=policy.draftArabic;
 $('legalRevisionStatus').textContent='Draft revision '+policy.revision+' · Published revision '+policy.publishedRevision;
 $('legalPublishConfirm').checked=false;
 records=d.participants||[];ambassadorRecords=d.ambassadors||[];applications=a.applications||[];program=settings;
 const ambassadors=d.perAmbassador||[],totals=d.totals||{};
 $('kpis').replaceChildren(
 stat('Ambassador Applications',applications.length,'Registered account requests'),
 stat('Active Ambassadors',ambassadorRecords.filter(x=>x.status==='approved').length,'Active referral links'),
 stat('Registered Participants',ambassadors.reduce((n,x)=>n+(x.registered||0),0),'Attributed by personal link'),
 stat('WhatsApp Link Clicks',ambassadors.reduce((n,x)=>n+(x.clickedWhatsApp||0),0),'Does not confirm membership'),
 stat('Confirmed Group Joins',ambassadors.reduce((n,x)=>n+(x.confirmedJoin||0),0),'Verified by organizer'),
 stat('Verified Paid Subscriptions',totals.verifiedSubscriptions||0,'Requires payment evidence'),
 stat('Recorded Commissions',money(totals.totalCommissionCents),'Verified paid referrals'),
 stat('Paid Out',money(totals.paidCommissionCents),'Payout recorded'));
 renderApplications();renderAmbassadors();renderParticipants();renderSales(d.sales||[]);
 $('programDestinationType').value=settings.destinationType||'whatsapp';
 $('programGroupUrl').value=settings.groupUrl||'';
 $('programCustomUrl').value=settings.customUrl||'';
 updateDestinationVisibility();
 $('programApproved').checked=Boolean(settings.organizerApproved);
 $('programOpen').checked=Boolean(settings.registrationOpen);
 $('programState').textContent=settings.active?'Participant registration is OPEN.':'Participant registration is CLOSED.';
}
$('loginForm').addEventListener('submit',e=>window.a1OrganizerSignIn(e));
$('refresh').addEventListener('click',()=>refresh().then(()=>$('ownerMessage').textContent='Data refreshed.').catch(e=>$('ownerMessage').textContent=e.message));
$('showInactive').addEventListener('change',renderAmbassadors);
$('participantSearch').addEventListener('input',renderParticipants);
$('participantFilter').addEventListener('change',renderParticipants);
$('verifySubscription').addEventListener('submit',async e=>{
 e.preventDefault();
 const amount=Math.round(Number($('saleAmount').value)*100),commission=Math.round(Number($('saleCommission').value)*100);
 if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(commission)||commission<0){$('ownerMessage').textContent='Enter valid amounts.';return}
 if(!confirm('Did the organizer actually verify this payment and its supporting receipt?'))return;
 try{
 await request('/api/admin/sales/verify','POST',{participantId:Number($('saleParticipant').value),paymentRef:$('salePaymentRef').value.trim(),evidenceRef:$('saleEvidence').value.trim(),saleCents:amount,commissionCents:commission});
 $('verifySubscription').reset();await refresh();$('ownerMessage').textContent='Paid subscription verified. Commission awaits approval.';
 }catch(error){$('ownerMessage').textContent=error.message}
});
function updateDestinationVisibility(){const custom=$('programDestinationType').value==='custom';$('whatsappField').hidden=custom;$('customField').hidden=!custom;}
$('programDestinationType').addEventListener('change',updateDestinationVisibility);
$('legalDraftForm').addEventListener('submit',async e=>{
 e.preventDefault();$('ownerMessage').textContent='';
 try{const result=await request('/api/admin/legal','POST',{english:$('legalEnglish').value,arabic:$('legalArabic').value});legalDraftRevision=result.revision;await refresh();$('ownerMessage').textContent='Draft saved without publishing.'}
 catch(err){$('ownerMessage').textContent=err.message}
});
$('legalPublishButton').addEventListener('click',async()=>{
 if(!$('legalPublishConfirm').checked){$('ownerMessage').textContent='Please approve both languages before publishing.';return}
 if(!confirm('Publish the reviewed English and Arabic wording to the public terms page?'))return;
 try{await request('/api/admin/legal/publish','POST',{revision:legalDraftRevision,confirm:true});await refresh();$('ownerMessage').textContent='Approved terms published. Registration remains independently controlled.'}
 catch(err){$('ownerMessage').textContent=err.message}
});
$('programForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const groupUrl=$('programGroupUrl').value.trim(),customUrl=$('programCustomUrl').value.trim(),destinationType=$('programDestinationType').value;
 const organizerApproved=$('programApproved').checked,registrationOpen=$('programOpen').checked;
 if(registrationOpen&&!confirm('Are the official group link, program terms and privacy notice approved by the organizer?'))return;
 try{await request('/api/admin/program','POST',{groupUrl,customUrl,destinationType,organizerApproved,registrationOpen});await refresh();$('ownerMessage').textContent='Campaign settings saved.'}catch(error){$('ownerMessage').textContent=error.message}
});
$('communityForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=$('communityForm').querySelector('button[type=submit]');button.disabled=true;
 try{
  await request('/api/admin/community','POST',{inviteUrl:$('communityInviteUrl').value.trim(),enabled:$('communityEnabled').checked});
  await refreshCommunity();
  $('ownerMessage').textContent='WhatsApp Community destination saved.';
 }catch(error){$('communityStatus').textContent=error.message}
 finally{button.disabled=false}
});
$('signOut').addEventListener('click',async()=>{await fetch('/api/owner/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});ownerCsrf='';records=[];applications=[];$('adminDashboard').hidden=true;$('adminLogin').hidden=false;$('ownerMessage').textContent=''});
fetch('/api/owner/me',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)return;const user=await r.json();await window.a1OrganizerShow(user)}).catch(()=>{});
$('exportParticipants').addEventListener('click',()=>{
 if(!ownerCsrf)return;filtered();
 const rows=[['ID','Name','WhatsApp','Ambassador','Link Click','Status','Registered At'],...shown.map(p=>[p.id,p.name,p.phone,p.ambassador,p.clickedWhatsApp?'Yes':'No',p.status,p.registered_at])];
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'").replace(/"/g,'""')+'"';
 const csv='\uFEFF'+rows.map(row=>row.map(safe).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const el=document.createElement('a');el.href=url;el.download='linktutor-referrals-'+new Date().toISOString().slice(0,10)+'.csv';el.click();setTimeout(()=>URL.revokeObjectURL(url),500);
});

function renderEnrollment(value){
 const mode=value.mode||'closed';
 $('enrollmentMode').value=mode;
 $('enrollmentPublicSwitch').checked=Boolean(value.open);
 $('enrollmentDateField').hidden=mode!=='scheduled';
 if(value.opensAt){const dt=new Date(value.opensAt);$('enrollmentDate').value=new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16)}
 const reasons=[!value.emailReady?'SMTP email delivery unverified':'',!value.legalPublished?'Approved terms not published':'',!value.infrastructureReady?'Launch infrastructure not ready':''].filter(Boolean);
 $('enrollmentReadiness').textContent=reasons.length?'Not ready: '+reasons.join(' · '):'Readiness checks satisfied';
 $('enrollmentState').textContent='Ambassador registration: '+(value.open?'OPEN':'CLOSED')+' · mode '+mode+' · email ready: '+(value.emailReady?'YES':'NO')+' · legal published: '+(value.legalPublished?'YES':'NO')+' · infrastructure ready: '+(value.infrastructureReady?'YES':'NO');
}
function groupInput(value,type='text',min=null){
 const input=document.createElement('input');input.type=type;input.value=String(value??'');if(min!==null)input.min=min;input.style.minWidth='90px';return input;
}
function renderGroups(groups){
 const target=$('groupsRows');target.replaceChildren();
 for(const g of groups){
  const tr=document.createElement('tr');
  const name=groupInput(g.name),url=groupInput(g.url,'url'),capacity=groupInput(g.capacity,'number',1),members=groupInput(g.reportedMembers,'number',0),priority=groupInput(g.priority,'number',0);
  for(const input of [name,url,capacity,members]){const cell=document.createElement('td');cell.append(input);tr.append(cell)}
  td(tr,g.routedParticipants||0);
  const priorityCell=document.createElement('td');priorityCell.append(priority);tr.append(priorityCell);
  const status=document.createElement('select');for(const mode of ['draft','active','full','closed']){const option=new Option(mode.toUpperCase(),mode);status.add(option)}status.value=g.status;
  const statusCell=document.createElement('td');statusCell.append(status);tr.append(statusCell);
  const actions=document.createElement('td');
  command(actions,'Save',async()=>{
    const payload={id:g.id,name:name.value,url:url.value,capacity:Number(capacity.value),reportedMembers:Number(members.value),priority:Number(priority.value),status:status.value};
    if(status.value==='active'&&g.status!=='active'&&!confirm('Activate this WhatsApp group for new participants?'))return false;
    await request('/api/admin/groups/update','POST',payload);
  });
  tr.append(actions);target.append(tr);
 }
 if(!groups.length)empty(target,8,'No WhatsApp groups have been added.');
 $('groupsStatus').textContent=groups.length+' configured WhatsApp group(s). Update reported membership manually; reservations are not confirmed joins.';
}
$('enrollmentMode').addEventListener('change',()=>{
 $('enrollmentDateField').hidden=$('enrollmentMode').value!=='scheduled';
 $('enrollmentPublicSwitch').checked=$('enrollmentMode').value==='open';
});
$('enrollmentPublicSwitch').addEventListener('change',()=>{
 $('enrollmentMode').value=$('enrollmentPublicSwitch').checked?'open':'closed';
 $('enrollmentDateField').hidden=true;
 $('enrollmentState').textContent=$('enrollmentPublicSwitch').checked?'Opening requested — click Save registration control to apply after security and approval checks.':'Closing requested — click Save registration control to apply.';
});
$('enrollmentForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const notice=$('enrollmentSaveMessage');
 notice.className='enrollment-save-message';
 const mode=$('enrollmentMode').value;
 const openUnavailable=mode==='open'&&$('enrollmentReadiness').textContent.startsWith('Not ready:');
 if(openUnavailable){
  notice.classList.add('error');
  notice.textContent='Cannot open registration yet. '+$('enrollmentReadiness').textContent+'. Complete SMTP verification and publish organizer-approved terms first.';
  notice.scrollIntoView({block:'nearest',behavior:'smooth'});return;
 }
 if(mode==='open'&&!confirm('Open ambassador account creation to the public? Email verification and organizer-approved terms are required.'))return;
 const input={mode};
 if(mode==='scheduled'){
  const date=new Date($('enrollmentDate').value);
  if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now()){
   notice.classList.add('error');notice.textContent='Choose a valid FUTURE date and time. The schedule is not saved.';return
  }
  input.opensAt=date.toISOString();
 }
 const button=$('enrollmentForm').querySelector('button[type=submit]');
 button.disabled=true;
 try{
  await request('/api/admin/enrollment','POST',input);
  await refresh();
  notice.className='enrollment-save-message success';
  notice.textContent=mode==='scheduled'?'Schedule saved. Opening remains conditional on SMTP, legal terms and launch security gates.':mode==='closed'?'Saved: public ambassador registration is closed.':'Saved: registration opening authorized.';
 }catch(err){
  notice.className='enrollment-save-message error';
  notice.textContent='Not saved: '+(err.message||'Please check settings.');
 }finally{button.disabled=false;notice.scrollIntoView({block:'nearest',behavior:'smooth'})}
});
$('groupAddForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const input={name:$('groupName').value.trim(),url:$('groupUrl').value.trim(),capacity:Number($('groupCapacity').value),reportedMembers:Number($('groupMembers').value),priority:Number($('groupPriority').value)};
 try{await request('/api/admin/groups','POST',input);$('groupAddForm').reset();await refresh();$('ownerMessage').textContent='Group saved as DRAFT; activate it only after verifying its WhatsApp link.'}
 catch(err){$('ownerMessage').textContent=err.message}
});

$('testInviteForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const message=$('testInviteMessage'),button=$('testInviteForm').querySelector('button[type=submit]');
 message.textContent='';$('testInviteResult').hidden=true;$('testInviteUrl').value='';
 button.disabled=true;
 try{
  const response=await request('/api/admin/test-invites','POST',{email:$('testInviteEmail').value.trim()});
  $('testInviteUrl').value=response.invitationUrl;
  $('testInviteResult').hidden=false;
  message.textContent='Private invitation prepared. Expires '+new Date(response.expiresAt).toLocaleString()+'. Public signup remains closed.';
 }catch(error){message.textContent=error.message}
 finally{button.disabled=false}
});
$('copyTestInvite').addEventListener('click',async()=>{
 const url=$('testInviteUrl').value;
 if(!url)return;
 try{await navigator.clipboard.writeText(url);$('testInviteMessage').textContent='Invitation link copied privately.'}
 catch{$('testInviteUrl').focus();$('testInviteUrl').select();$('testInviteMessage').textContent='Select and copy the invitation URL manually.'}
});
