// Minimal, mobile-first WhatsApp invitation handoff.
// A user gesture is required for Android intent links in Chrome.
const validInvite=/^https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]{10,100})$/;
export function renderCommunityChoice(url){
 const match=validInvite.exec(String(url||''));
 if(!match)throw Error('Invalid approved invitation');
 const invite=url;
 const business='intent://chat.whatsapp.com/'+match[1]+'#Intent;scheme=https;package=com.whatsapp.w4b;S.browser_fallback_url='+encodeURIComponent(invite)+';end';
 return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="robots" content="noindex,nofollow">
 <meta name="theme-color" content="#f4f8ff">
 <title>تم التسجيل | A1 Opportunities</title>
 <style>
 :root{color-scheme:light}
 *{box-sizing:border-box}
 body{margin:0;min-height:100vh;background:linear-gradient(160deg,#eef5ff,#fff 72%);color:#142c50;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif}
 main{width:min(420px,calc(100% - 32px));margin:clamp(35px,10vh,100px) auto 30px;border:1px solid #dce7f6;border-radius:22px;background:#fff;padding:clamp(24px,6vw,38px);text-align:center;box-shadow:0 16px 45px #15365f12}
 .mark{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;background:#e4f7eb;color:#118251;margin:0 auto 16px;font-size:31px;font-weight:800}
 h1{font-size:clamp(22px,5.5vw,27px);margin:0 0 10px;line-height:1.4}
 p{margin:0 0 23px;color:#61758b;font-size:15px;line-height:1.65}
 .primary{display:flex;align-items:center;justify-content:center;background:#128851;color:#fff;min-height:58px;padding:13px 18px;border-radius:13px;text-decoration:none;font-size:18px;font-weight:800}
 .primary:focus-visible,.alternative:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid #3f79dd;outline-offset:3px}
 .alternative{display:block;text-decoration:none;color:#285ab3;font-size:14px;font-weight:700;padding:15px 6px;margin-top:7px}
 details{margin-top:16px;border-top:1px solid #e7edf5;padding-top:15px;text-align:start}
 summary{cursor:pointer;font-size:13px;color:#65758a;text-align:center;list-style:inside}
 .fallback{margin-top:12px}
 .fallback input{display:block;direction:ltr;width:100%;padding:11px;border:1px solid #d6e2f1;border-radius:9px;font-size:12px;background:#f6f9fd;color:#36465f}
 .fallback button{border:0;background:#e7efff;color:#2654a2;border-radius:9px;padding:11px 17px;margin:10px 0 0;font-weight:700;font-size:14px;cursor:pointer}
 .footer{margin-top:19px;font-size:12px;color:#8796aa;line-height:1.5}
 </style></head><body>
 <main>
 <span class="mark" aria-hidden="true">✓</span>
 <h1 id="title">تم حفظ تسجيلك</h1>
 <p id="description">اضغط للانتقال إلى مجتمع A1 Opportunities على واتساب</p>
 <a class="primary" id="open-community" href="${invite}" data-business="${business}" rel="noreferrer">فتح المجتمع</a>
 <a class="alternative" id="open-other" href="${invite}" rel="noreferrer">استخدام واتساب العادي</a>
 <details><summary id="fallback-title">لم يُفتح واتساب؟</summary>
 <div class="fallback"><input readonly id="invite-url" value="${invite}" aria-label="رابط المجتمع">
 <button type="button" id="copy-link">نسخ رابط المجتمع</button></div></details>
 <div class="footer">A1 Opportunities</div>
 </main><script src="/community-choice.js" defer></script></body></html>`;
}
