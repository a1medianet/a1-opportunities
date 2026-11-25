import http from 'node:http';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {openFoundation} from './foundation.mjs';
const s=openFoundation(process.env.DB_PATH||':memory:');
const token=process.env.ALPHA_PASSWORD;
if(!token||token.length<20)throw Error('ALPHA_PASSWORD required');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const page=(body)=>'<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A1 Opportunities V2</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#18304d;font:16px system-ui}header{background:#173653;color:white;padding:22px}main{max-width:1100px;margin:auto;padding:24px}section{background:white;border:1px solid #dce4ee;border-radius:12px;padding:20px;margin:16px 0}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:inherit}input,select,button{font:inherit;padding:10px;border:1px solid #c5d2e1;border-radius:7px;margin:5px;max-width:100%}button{background:#2455a0;color:white;cursor:pointer}table{width:100%;border-collapse:collapse}td,th{text-align:right;padding:12px;border-bottom:1px solid #e4eaf1}.scroll{overflow:auto}small{color:#62748a}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.cards section{margin:0}h1{margin:0}strong{font-size:24px}</style><header><h1>A1 Opportunities</h1><small style="color:#d6e4f5">V2 Alpha · بيئة تجريبية خاصة</small><nav><a href="/">نظرة عامة</a><a href="/#campaigns">الحملات</a><a href="/#ambassadors">السفراء</a></nav></header><main>'+body+'</main></html>';
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
 const u=new URL(req.url,'http://localhost');const send=(status,body,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(body)};
 if(u.pathname==='/health')return send(200,JSON.stringify({status:'ok',environment:'ALPHA'}),'application/json');
 const expected='Basic '+Buffer.from('admin:'+token).toString('base64');
 if(!equal(req.headers.authorization||'',expected)){res.setHeader('WWW-Authenticate','Basic realm="A1 V2 Private Alpha"');return send(401,'Authentication required','text/plain')}
 if(req.method==='POST'){
 if(req.headers['sec-fetch-site']==='cross-site'||!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded'))return send(403,'Forbidden','text/plain');
 const origin=req.headers.origin;if(!origin||!['https://ref.a1net.tech','http://127.0.0.1:13182'].includes(origin))return send(403,'Forbidden origin','text/plain');
 try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)return send(413,'Too large','text/plain')}const f=new URLSearchParams(raw),v=k=>{const x=(f.get(k)||'').trim();if(!x||x.length>150)throw Error('Invalid field');return x};
 if(u.pathname==='/organization')s.createOrganization(randomUUID(),v('name'));
 else if(u.pathname==='/campaign')s.createCampaign(v('org'),randomUUID(),v('name'),v('terms'));
 else if(u.pathname==='/activate')s.activateCampaign(v('org'),v('campaign'));
 else if(u.pathname==='/ambassador')s.createAmbassador(v('org'),randomUUID(),v('name'));
 else return send(404,'Not found');
 res.writeHead(303,{Location:'/'});return res.end();
 }catch{return send(400,page('<section>تعذر حفظ العملية. تحقق من البيانات. <a href="/">عودة</a></section>'))}}
 if(req.method!=='GET'||u.pathname!=='/')return send(404,'Not found');
 const org=s.db.prepare('SELECT * FROM organizations ORDER BY name').all(),campaigns=s.db.prepare('SELECT c.*,o.name AS organization FROM campaigns c JOIN organizations o ON o.id=c.org').all(),amb=s.db.prepare('SELECT a.*,o.name AS organization FROM ambassadors a JOIN organizations o ON o.id=a.org').all();
 const options=org.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.name)+'</option>').join('');
 const select='<select name="org" required>'+options+'</select>';
 const form=(path,fields)=>'<form method="post" action="'+path+'">'+fields+'<button>حفظ</button></form>';
 return send(200,page('<h2>مركز إدارة الحملات</h2><p>نسخة Alpha خاصة — بيانات اختبار فقط، لا تكامل حي أو تسويات مالية.</p><div class="cards">'+[['الجهات',org.length],['الحملات',campaigns.length],['السفراء',amb.length]].map(([n,x])=>'<section>'+n+'<br><strong>'+x+'</strong></section>').join('')+'</div><section><h2>الجهات</h2>'+form('/organization','<input name="name" placeholder="اسم الجهة" required>')+'</section><section id="campaigns"><h2>الحملات</h2>'+form('/campaign',select+'<input name="name" placeholder="اسم الحملة" required><input name="terms" placeholder="إصدار الشروط" required>')+'<div class="scroll"><table><tr><th>الحملة</th><th>الجهة</th><th>الحالة</th><th>الإجراء</th></tr>'+campaigns.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.organization)+'</td><td>'+esc(c.status)+'</td><td>'+(c.status==='draft'?form('/activate','<input type="hidden" name="org" value="'+esc(c.org)+'"><input type="hidden" name="campaign" value="'+esc(c.id)+'">'):'—')+'</td></tr>').join('')+'</table></div></section><section id="ambassadors"><h2>السفراء</h2>'+form('/ambassador',select+'<input name="name" placeholder="اسم السفير" required>')+'<table><tr><th>الاسم</th><th>الجهة</th></tr>'+amb.map(a=>'<tr><td>'+esc(a.name)+'</td><td>'+esc(a.organization)+'</td></tr>').join('')+'</table></section>'));
});
server.listen(Number(process.env.PORT||13182),'0.0.0.0');
