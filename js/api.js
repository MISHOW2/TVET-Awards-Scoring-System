// Talking to the Google Apps Script: requests, the busy overlay and the scoped refresh.

let PIN=null,AUD=null;   // AUD = read-only auditor credentials, kept in memory only
// Reads the script's reply. If Google sent a web page instead of data (an error, a sign-in page,
// a deployment problem), show what it said rather than a JSON parsing error.
async function readJson(r){
 const t=await r.text();
 try{return JSON.parse(t)}catch(e){
  const words=t.replace(/<(style|script)[\s\S]*?<\/\1>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,260);
  throw new Error("The scoring sheet answered with a web page instead of data (HTTP "+r.status+"). Google says: \""+(words||"nothing")+"\". Check the deployment: Execute as Me, access Anyone, latest version, and the URL in SHEET_URL.")}
}
async function api(action,body={},admin){
 if(admin){PIN=PIN||prompt("Admin PIN:");if(!PIN)throw new Error("cancelled")}
 const r=await fetch(SHEET_URL,{method:"POST",body:JSON.stringify({action,pin:admin?PIN:undefined,...body})}); // plain-text body = no CORS preflight
 const j=await readJson(r);
 if(j.error){if(/PIN/.test(j.error))PIN=null;throw new Error(j.error)}
 return j;
}
// A visible sign that the app is talking to the sheet. Without it, a slow
// connection looks exactly like a page that has stopped working.
function busy(text){
 let el=document.getElementById('busyVeil');
 if(text===false){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='busyVeil';
  el.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(244,247,251,.75)";
  document.body.appendChild(el)}
 el.innerHTML='<div style="background:#fff;border-radius:14px;padding:22px 28px;box-shadow:0 10px 30px rgba(11,31,58,.18);text-align:center;max-width:320px">'+
  '<div style="width:26px;height:26px;margin:0 auto 12px;border:3px solid #dfe6ef;border-top-color:#145da0;border-radius:50%;animation:spin .8s linear infinite"></div>'+
  '<b>'+escHTML(text)+'</b><div style="color:#68758a;font-size:13px;margin-top:4px">This can take a few seconds.</div></div>';
}
const run=f=>async(...a)=>{try{return await f(...a)}catch(e){if(e.message!=="cancelled")alert(e.message)}};
// Scoped read: admin PIN gets everything, a judge's name + code gets only that judge's own rows.
let refreshSeq=0;   // only the newest read may update the page, so a slow page-load read cannot wipe a sign-in
async function refresh(){
 const mySeq=++refreshSeq;
 const j=AUD?AUD.name:sel.value.trim(),c=AUD?AUD.code:(($('judgeCode')||{}).value||"").trim();
 busy("Checking the shared record...");
 try{
  const r=await fetch(SHEET_URL,{method:"POST",body:JSON.stringify({action:"read",pin:PIN||undefined,judge:(j&&c)?j:undefined,code:(j&&c)?c:undefined})});
  const d=await readJson(r);if(mySeq!==refreshSeq)return;   // a newer read has started: ignore this older answer
  if(d.error){if(/PIN/.test(d.error))PIN=null;throw new Error(d.error)}
  data.me=undefined;data.role=undefined;data.confirmed=undefined;Object.assign(data,d);updateAll()
 } finally { if(mySeq===refreshSeq)busy(false) }}
window.unlock=run(async()=>{AUD=null;PIN=prompt("Admin PIN:");if(!PIN)return;try{await refresh()}catch(e){PIN=null;throw e}});
