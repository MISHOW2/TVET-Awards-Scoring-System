// Set apiUrl to your deployed Apps Script web app URL to go live. Empty = demo mode (data lives in memory).
const CONFIG = { apiUrl: 'https://script.google.com/macros/s/AKfycbwXOBrM1AaMIh7Jkc_ifGTlf1Kwl2RqBh7_MsTRPWSAGYM4IEFqGgeXjQIdn1EUc4Nfzw/exec' };
// The seven award categories, in sheet order (index = CatIdx). The sheet's own names win if it supplies any.
const CATS = ["National TVET Lecturer of the Year","Engineering Lecturer Excellence Award","Business and Utility Studies Lecturer Excellence Award","Occupational Programmes Lecturer Excellence Award","Emerging TVET Lecturer Award","Innovation in Teaching and Learning Award","Work-Integrated Learning Excellence Award"];
const setCats = r => { const c=(r.categories||r.cats||[]).map(x=>typeof x==='string'?x:(x&&(x.name||x.catName))||'');
  c.forEach((x,i)=>{ if(x) CATS[i]=x }); };
const CRIT = [
  ['Teaching Effectiveness',25],['Student Performance',20],['Industry Alignment and Work-Integrated Learning',20],
  ['Innovation and Digital Teaching',15],['Professional Development',10],['Student Feedback',10]];
const SCALE = [['1 – Poor','Does not meet requirements. Little or no supporting evidence.'],['2 – Fair','Partially meets requirements. Significant gaps in evidence or impact.'],['3 – Good','Meets requirements with sufficient supporting evidence.'],['4 – Very good','Exceeds requirements with strong evidence and measurable impact.'],['5 – Outstanding','Exceptional evidence of innovation, sustainability and sector-wide impact.']];
const OUTCOMES = ['National Excellence Winner','Finalist Recognition','Merit Recognition','Does not qualify'];
const DECL_TEXT = 'I will keep all nominee information, scores and panel discussions confidential. I will not share my personal code, and I will use the nominee details only for judging.';
const $ = s => document.querySelector(s);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = x => String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

const S = { role:null, name:'', cred:'', tab:'', nom:null, mod:null, mode:'judge', err:'', sel:{}, d:{
  settings:{judges:3,qualify:70,spread:15,open:true}, judgeNames:[], auditorNames:[],
  nominees:[],
  scores:[], declarations:[], moderation:[], recusals:[], log:[] }, dc:{} };

const live = () => !!CONFIG.apiUrl;
const post = async body => { const r = await (await fetch(CONFIG.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)})).json(); if(r.error) throw new Error(r.error); return r; };
const creds = () => S.role==='admin' ? {pin:S.cred} : {judge:S.name,code:S.cred};
let busyN=0;
const busy = async (fn, msg='Checking the shared record...') => { let o=$('#loading'); if(!o){ o=document.createElement('div'); o.id='loading'; o.className='loading'; o.setAttribute('role','status'); o.innerHTML='<div class="lbox"><div class="spin"></div><b id="lmsg"></b><span>This can take a few seconds.</span></div>'; document.body.append(o) }
  $('#lmsg').textContent=msg; busyN++; o.hidden=false; try{ return await fn() } finally { if(--busyN<=0){ busyN=0; o.hidden=true } } };
// quiet = background refresh: no overlay, errors are the caller's to ignore
async function load(quiet){
  if(!live()) return;
  const go=async()=>{
  const r = await post({action:'read',...creds()}); const d=S.d; setCats(r);
  d.settings={...d.settings,...r.settings}; d.judgeNames=r.judgeNames||[]; d.auditorNames=r.auditorNames||[];
  d.nominees=(r.nominees||[]).map(n=>({...n,details:''}));
  d.scores=(r.scores||[]).map(s=>({id:s.nomineeId,judge:s.judge,values:s.values.map(Number),total:s.total,comments:s.comments,date:s.date}));
  d.declarations=r.declarations||[]; d.moderation=r.moderation||[]; d.recusals=r.recusals||[]; d.log=r.log||[];
  if(r.role==='judge'&&r.confirmed) S.confirmed=true;
  };
  return quiet ? go() : busy(go);
}
const toast = m => { const t=document.createElement('div'); t.className='toast'; t.textContent=m; document.body.append(t); setTimeout(()=>t.remove(),2500); };

// ---- scoring maths ----
const total = v => Math.round(v.reduce((a,x,i)=>a+(x/5)*CRIT[i][1],0)*100)/100;
const recog = a => a>=90?OUTCOMES[0]:a>=80?OUTCOMES[1]:a>=70?OUTCOMES[2]:OUTCOMES[3];
function result(n){
  const sc=S.d.scores.filter(s=>s.id===n.id), gone=new Set((S.d.recusals||[]).filter(r=>String(r.nomineeId)===String(n.id)).map(r=>r.judge)).size, need=Math.max(1,+S.d.settings.judges-gone);
  if(sc.length<need) return {n,sc,wait:true};
  const t=sc.map(s=>s.total), avg=t.reduce((a,b)=>a+b,0)/t.length;
  return {n,sc,avg,rec:recog(avg),flag:Math.max(...t)-Math.min(...t)>+S.d.settings.spread};
}
const results = () => S.d.nominees.map(result).sort((a,b)=>(b.avg??-1)-(a.avg??-1));

// ---- shell ----
function chrome(){
  $('#who').innerHTML = S.role ? `${S.role==='admin'?'<span>Synced with Google Sheet</span>':''}<span class="chip"><i></i>${esc(S.role==='admin'?'Administrator':S.name)}</span><button class="btn" id="out">Sign out</button>` : '<a href="#help" id="hl">Help</a>';
  const tabs = S.role==='admin'?['Nominees','Results','Declarations','Moderation','Settings','Help']:S.role==='auditor'?['Results','Declarations','Moderation','Help']:[];
  $('#tabs').innerHTML = tabs.map(t=>`<button ${S.tab===t?'aria-current="page"':''} data-t="${t}">${t}</button>`).join('');
  $('#tabs').onclick = e => { if(e.target.dataset.t){S.tab=e.target.dataset.t;S.nom=null;render()} };
  if($('#out')) $('#out').onclick = () => { try{ sessionStorage.removeItem('tvet.session') }catch(e){} S.role=null;S.cred='';S.confirmed=false;S.nom=null;S.tab='';render(); };
  if($('#hl')) $('#hl').onclick = e => { e.preventDefault(); S.tab='Help'; render(); };
}
function render(){
  chrome(); const a=$('#app');
  if(S.tab==='Help') a.innerHTML=help();
  else if(!S.role) { a.innerHTML=signin(); bindSignin(); }
  else if(S.role==='judge'){ if(!S.confirmed){a.innerHTML=confirmPage();bindConfirm()} else if(S.nom){a.innerHTML=scorePage();bindScore()} else {a.innerHTML=listPage();bindList()} }
  else { S.tab=S.tab||'Results'; const v={Nominees:[nomsPage,bindNoms],Results:[resultsPage,bindResults],Declarations:[declPage,()=>{}],Moderation:[modPage,bindMod],Settings:[settingsPage,bindSettings]}[S.tab]; a.innerHTML=v[0](); v[1](); }
}

// ---- sign in ----
function signin(){
  const names = S.mode==='auditor'?S.d.auditorNames:S.d.judgeNames;
  return `<div class="grid g2" style="margin-top:28px"><section class="card"><h1 style="margin-top:0">Sign in</h1><p class="sub">Panel judges, auditors and the administrator all sign in here.</p>
  <div class="seg">${['judge','auditor','admin'].map(m=>`<button class="btn ${S.mode===m?'dark':''}" data-m="${m}">${m==='admin'?'Administrator':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
  ${S.mode==='admin'?`<label for="cred">Admin PIN</label><input id="cred" type="password" autocomplete="off">`:`<label for="nm">Your name</label><select id="nm"><option value="">Choose your name from the list</option>${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select><label for="cred">Personal code</label><input id="cred" inputmode="numeric" autocomplete="off">`}
  <p class="sub" style="font-size:14px;margin-top:6px">Names are not case-sensitive. Never share your code.</p><p class="err" id="err">${esc(S.err)}</p>
  <button class="btn dark" style="width:100%" id="go">Sign in</button>
  ${S.mode==='admin'?'<div class="note"><b>Administrator</b><br>Choosing Administrator replaces the name list with a single field for the admin PIN.</div>':''}
  ${live()?'':'<p class="sub" style="font-size:14px">Demo mode: any code works, admin PIN is “1234”.</p>'}</section>
  <div><section class="card"><h2>Which role am I?</h2><p><b>Judge</b> – see the nominees, read their details, score them and give reasons. You see only your own scores.</p><p><b>Auditor</b> – read-only access to results, reasons, declarations and the moderation report.</p><p><b>Administrator</b> – manages nominees, judges, settings and the final report.</p></section>
  <section class="card"><h2>If sign-in does not work</h2><p><b>Code not accepted.</b> Check you chose your own name, retype the code, then ask the administrator to reset it.</p><p><b>Too many attempts.</b> Wait 15 minutes, or ask the administrator to unlock your name.</p><p><b>Name missing.</b> Ask the administrator to add you in the sheet.</p></section>
  <div class="note solid"><b>Confidentiality</b><br>The nominee list and judge names are private. They appear only after you sign in. Sign out on a shared computer.</div></div></div>`;
}
function bindSignin(){
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;S.err='';render()});
  const go=()=>busy(async()=>{
    const nm=$('#nm')?.value||'', c=$('#cred').value.trim(); S.err='';
    try{
      if(S.mode==='admin'){ if(live()) await post({action:'verify',pin:c}); else if(c!=='1234') throw new Error('Incorrect admin PIN.'); S.role='admin';S.cred=c; }
      else { if(!nm||!c) throw new Error('Choose your name and enter your code.'); S.role=S.mode;S.name=nm;S.cred=c; if(live()) await load(); S.confirmed=live()?S.confirmed:S.d.declarations.some(x=>x.person===nm&&x.type==='Confidentiality'); }
      if(S.role==='admin') await load(); S.tab=S.role==='judge'?'':'Results'; if(S.role==='admin')S.tab='Nominees';
    }catch(e){ S.err=e.message; S.role=null; }
    render();
  }, 'Signing you in...');
  $('#go').onclick=go; $('#cred').onkeydown=e=>{if(e.key==='Enter')go()};
}

// ---- judge ----
function confirmPage(){return `<div style="max-width:720px;margin:28px auto"><span class="tag">First sign-in only</span><h1>Confidentiality declaration</h1><p class="sub">Read and tick the declaration below. You cannot score until you have done this.</p><div class="card"><b>${'Declaration from the awards secretariat'}</b><p style="margin-top:10px">${DECL_TEXT}</p></div><label class="note solid row" style="font-weight:400"><input type="checkbox" id="ok" style="width:auto"> I have read the confidentiality declaration and I accept it.</label><div class="row"><button class="btn dark" id="cont" disabled>Continue to nominees</button></div></div>`}
function bindConfirm(){ $('#ok').onchange=e=>$('#cont').disabled=!e.target.checked;
  $('#cont').onclick=async()=>{ try{ if(live()) await post({action:'declare',judge:S.name,code:S.cred,type:'confidentiality'}); S.d.declarations.push({date:new Date().toISOString(),person:S.name,role:'Judge',type:'Confidentiality'}); S.confirmed=true; render(); }catch(e){toast(e.message)} }; }
const mine = id => S.d.scores.find(s=>s.id===id&&s.judge===S.name);
const recused = id => (S.d.recusals||[]).some(r=>String(r.nomineeId)===String(id)&&r.judge===S.name);
const poeTag = n => n.poe ? '<span class="tag ok">PoE linked</span>' : '<span class="tag no">No PoE</span>';
// nominees grouped by award category: [{name, all:[every nominee in it], items:[the ones passing the filters]}]
function byCat(list){
  const all=S.d.nominees, g=CATS.map((name,i)=>({i,name,all:all.filter(n=>n.cat===i),items:list.filter(n=>n.cat===i)}));
  const other=list.filter(n=>!CATS[n.cat]); if(other.length) g.push({i:-1,name:'No valid category',all:other,items:other});
  return g.filter(x=>x.items.length);
}
// totals per category. cols = [[heading, fn(nomineesInCategory)->text]]
function catTable(cols){
  const g=CATS.map((name,i)=>({name,ns:S.d.nominees.filter(n=>n.cat===i)})).filter(x=>x.ns.length);
  const tot=S.d.nominees.filter(n=>CATS[n.cat]);
  return `<div class="card tw" style="margin:0"><table><tr><th>Award category</th><th>Nominees</th>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr>${g.map(x=>`<tr><td>${esc(x.name)}</td><td><b>${x.ns.length}</b></td>${cols.map(c=>`<td>${c[1](x.ns)}</td>`).join('')}</tr>`).join('')}<tr style="background:var(--soft)"><td><b>All categories</b></td><td><b>${tot.length}</b></td>${cols.map(c=>`<td><b>${c[1](tot)}</b></td>`).join('')}</tr></table></div>`;
}
function listPage(){
  const q=(S.q||'').toLowerCase(), c=S.cat||'', np=!!S.nopoe, N=S.d.nominees.length, closed=S.d.settings.open===false;
  const done=S.d.nominees.filter(n=>mine(n.id)).length, gone=S.d.nominees.filter(n=>recused(n.id)).length;
  const rows=S.d.nominees.filter(n=>(c===''||String(n.cat)===c)&&(!np||!n.poe)&&(n.name+' '+n.college+' '+n.id+' '+(CATS[n.cat]||'')).toLowerCase().includes(q));
  const groups=byCat(rows);
  return `<div class="row between"><div><h1>Nominees</h1><p class="sub">Open a nominee to read the nomination and evidence, then score them. You see only your own scores.</p></div><span class="chip">${closed?'Scoring is closed':'Scoring is open'}</span></div>
  <div class="card" style="margin:0 0 16px"><div class="row between"><b>Your progress</b><span class="sub">${done} scored${gone?`, ${gone} recused`:''}, of ${N} nominees</span></div><div class="bar-track"><div class="bar-fill" style="width:${N?(done+gone)/N*100:0}%"></div></div></div>
  ${catTable([['Done by you',ns=>ns.filter(n=>mine(n.id)).length+' of '+ns.length],['Recused',ns=>ns.filter(n=>recused(n.id)).length],['With a PoE',ns=>ns.filter(n=>n.poe).length+' of '+ns.length]])}
  <div class="card grid g3" style="align-items:end"><div><label for="cat" style="margin:0 0 4px">Category</label><select id="cat"><option value="">All categories</option>${CATS.map((x,i)=>`<option value="${i}" ${String(i)===c?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <div><label for="q" style="margin:0 0 4px">Search</label><input id="q" placeholder="Name, college or ID" value="${esc(S.q||'')}"></div>
  <label class="row" style="font-weight:400;margin:0"><input type="checkbox" id="np" style="width:auto" ${np?'checked':''}> Only nominees without a PoE</label></div>
  <p class="sub" style="margin:0 0 8px">Showing ${rows.length} of ${N} nominees.</p>
  <div class="card tw"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>PoE</th><th>Your status</th><th>Action</th></tr>${groups.map(g=>`<tr class="grouprow"><td colspan="6">${esc(g.name)} &middot; ${g.all.length} nominee${g.all.length===1?'':'s'} &middot; ${g.all.filter(n=>mine(n.id)).length} done by you</td></tr>`+g.items.map(n=>{const m=mine(n.id),r=recused(n.id);return `<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${poeTag(n)}</td><td><span class="tag">${r?'Recused':m?'Saved: '+m.total+'%':'Not scored'}</span></td><td>${r?'':`<button class="btn ${m?'':'dark'}" data-id="${esc(n.id)}">${m?'Review':'Score'}</button>`}</td></tr>`}).join('')).join('')||'<tr><td colspan="6">No nominees match. Clear the search or choose another category.</td></tr>'}</table></div>`;
}
function bindList(){
  document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{S.nom=b.dataset.id;const m=mine(S.nom);S.sel.v=m?[...m.values]:[0,0,0,0,0,0];S.sel.c=m?.comments||'';S.sel.coi=m?'none':'';render();scrollTo(0,0)});
  $('#cat').onchange=e=>{S.cat=e.target.value;render()}; $('#np').onchange=e=>{S.nopoe=e.target.checked;render()};
  $('#q').oninput=e=>{S.q=e.target.value;render();$('#q').focus();$('#q').setSelectionRange(99,99)};
}
function scorePage(){
  const n=S.d.nominees.find(x=>x.id===S.nom), v=S.sel.v, m=mine(n.id);
  return `<p style="margin-top:20px"><button class="lnk" id="back">← Back to nominees</button></p><div class="grid side"><div><section class="card"><small class="sub">Nomination ID ${esc(n.id)}</small><h2 style="font-size:26px;margin:6px 0">${esc(n.name)}</h2><p class="sub">${esc(n.college)}</p><span class="tag">${esc(CATS[n.cat]||'')}</span></section>
  <section class="card"><h2>Nomination</h2><p>${esc(n.details||'Open the nominee details in the sheet to read the nomination.')}</p></section>
  <section class="card"><h2>The scale</h2><table class="scale">${SCALE.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><p class="sub" style="font-size:14px;margin-top:10px">The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p></section></div>
  <section class="card" style="margin-top:0"><div class="row between"><h2>Your scores</h2><span class="sub" style="font-size:14px">Whole number from 1 to 5 for each criterion</span></div>
  ${CRIT.map((c,i)=>`<div class="crit"><div class="head"><span>${c[0]}</span><span class="tag">Weight ${c[1]}</span></div><div class="pick" role="group" aria-label="${c[0]}">${[1,2,3,4,5].map(k=>`<button data-i="${i}" data-k="${k}" aria-pressed="${v[i]===k}">${k}</button>`).join('')}<span class="sub" id="pt${i}" style="font-size:14px">${(v[i]/5*c[1]).toFixed(0)} / ${c[1]} points</span></div></div>`).join('')}
  <label for="why">Your reasons for the scores</label><p class="sub" style="font-size:14px;margin:0 0 6px">Refer to the evidence.</p><textarea id="why" ${S.d.settings.open===false?'disabled':''}>${esc(S.sel.c)}</textarea>
  <div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, do not score them. Tell the administrator.</div>
  <label class="note solid row" style="font-weight:400"><input type="checkbox" id="sign" style="width:auto"> I assessed this nomination impartially, with no conflict of interest, on the submitted and verified evidence.</label>
  <div class="row between" style="border-top:2px solid var(--ink);padding-top:14px"><div><small class="sub">Your total</small><div class="total"><span id="tot">${total(v)}</span> <span class="sub" style="font-size:16px;font-weight:400">/ 100</span></div></div><button class="btn dark" id="save">Save</button></div><p class="err" id="err"></p></section></div>`;
}
function bindScore(){
  const v=S.sel.v; $('#back').onclick=()=>{S.nom=null;render()};
  document.querySelectorAll('.pick button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;v[i]=+b.dataset.k;
    document.querySelectorAll(`.pick button[data-i="${i}"]`).forEach(x=>x.setAttribute('aria-pressed',+x.dataset.k===v[i]));
    $('#pt'+i).textContent=`${(v[i]/5*CRIT[i][1]).toFixed(0)} / ${CRIT[i][1]} points`; $('#tot').textContent=total(v)});
  $('#why').oninput=e=>S.sel.c=e.target.value;
  $('#save').onclick=async()=>{
    const err=m=>$('#err').textContent=m;
    if(S.d.settings.open===false) return err('Scoring is closed.');
    if(v.some(x=>!x)) return err('Give every criterion a score from 1 to 5.');
    if(!S.sel.c.trim()) return err('Write your reasons for the scores.');
    if(!$('#sign').checked) return err('Tick the sign-off before saving.');
    const old=mine(S.nom), rec={nomineeId:S.nom,judge:S.name,values:v,total:total(v),comments:S.sel.c,declare:true};
    let reason=''; if(old&&old.total!==rec.total){ reason=prompt('You already scored this nominee. Why are you changing the score?')||''; if(!reason) return err('A reason for the change is required.'); }
    try{ if(live()){ await post({action:'score',code:S.cred,rec,log:old?{oldTotal:old.total,newTotal:rec.total,reason}:null}); await load(); }
      else { S.d.scores=S.d.scores.filter(s=>!(s.id===S.nom&&s.judge===S.name)); S.d.scores.push({id:S.nom,judge:S.name,values:[...v],total:rec.total,comments:rec.comments}); S.d.declarations.push({date:new Date().toISOString(),person:S.name,role:'Judge',type:'Impartial sign-off',nomineeId:S.nom}); }
      toast('Saved. Your scores for '+S.d.nominees.find(x=>x.id===S.nom).name+' are stored.'); S.nom=null; render();
    }catch(e){err(e.message)}
  };
}

// ---- admin / auditor ----
const ro = () => S.role==='auditor';
function nomsPage(){
  return `<h1>Nominees</h1><p class="sub">Add and manage lecturers or teams entering the awards.</p><div class="grid side"><section class="card" style="margin-top:0"><h2>Add nominee</h2><label for="nn">Nominee / lecturer name</label><input id="nn"><label for="nc">College / institution</label><input id="nc"><label for="nk">Award category</label><select id="nk"><option value="">Select a category</option>${CATS.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select><label for="ni">Nomination ID</label><input id="ni"><p class="err" id="err"></p><button class="btn dark" id="addn">Save nominee</button></section>
  <section class="card" style="margin-top:0"><h2>Nominee register</h2><div class="tw"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>Category</th><th>Judges scored</th><th></th></tr>${S.d.nominees.map(n=>`<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${esc(CATS[n.cat]||'')}</td><td>${S.d.scores.filter(s=>s.id===n.id).length} of ${S.d.settings.judges}</td><td><button class="lnk" data-del="${esc(n.id)}">Delete</button></td></tr>`).join('')}</table></div></section></div>
  <section class="card"><h2>Import the whole list</h2><p class="sub">Excel or CSV import with the headings Nomination ID, Nominee name, College, Award category is not built in this version. Use the Google Sheet’s Nominees tab for bulk loading.</p></section>`;
}
function bindNoms(){
  $('#addn').onclick=async()=>{ const n={id:$('#ni').value.trim(),name:$('#nn').value.trim(),college:$('#nc').value.trim(),cat:+$('#nk').value,catName:CATS[+$('#nk').value]};
    if(!n.id||!n.name||$('#nk').value==='') return $('#err').textContent='Fill in the name, category and nomination ID.';
    if(S.d.nominees.some(x=>x.id===n.id)) return $('#err').textContent='That nomination ID is already on the register.';
    try{ if(live()){await post({action:'nominee',pin:S.cred,...n});await load()} else S.d.nominees.push({...n,details:''}); toast('Nominee saved.'); render(); }catch(e){$('#err').textContent=e.message} };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this nominee and their scores?')) return;
    try{ if(live()){await post({action:'deleteNominee',pin:S.cred,id:b.dataset.del});await load()} else {S.d.nominees=S.d.nominees.filter(n=>n.id!==b.dataset.del);S.d.scores=S.d.scores.filter(s=>s.id!==b.dataset.del)} render(); }catch(e){toast(e.message)} });
}
function resultsPage(){
  const R=results(), cnt=r=>R.filter(x=>x.rec===r).length, wait=R.filter(x=>x.wait).length, st=S.rf||'', ct=S.rc||'', fl=S.rfl;
  const rows=R.filter(r=>(ct===''||String(r.n.cat)===ct)&&(!st||r.rec===st)&&(!fl||r.flag));
  const names=['T','S','I','D','P','F'];
  return `<div class="row between"><div><h1>Results</h1><p class="sub">Every nominee’s scores, each judge’s reasons, and the flags.${ro()?' You have read-only access.':''}</p></div>${ro()?'':'<div><small class="sub">ADMINISTRATOR ONLY</small><br><button class="btn dark" id="exp">Export results (CSV)</button></div>'}</div>
  <div class="grid g5">${[['90 and above',OUTCOMES[0]],['80 to 89',OUTCOMES[1]],['70 to 79',OUTCOMES[2]],['Below 70',OUTCOMES[3]]].map(o=>`<div class="card stat" style="margin:0"><small>${o[0]}</small><strong>${o[1]}</strong><b>${cnt(o[1])}</b></div>`).join('')}<div class="card stat" style="margin:0"><small>Fewer than ${S.d.settings.judges} judges</small><strong>Awaiting judges</strong><b>${wait}</b></div></div>
  <section class="card"><div class="row"><div><label for="rc" style="margin-top:0">Category</label><select id="rc"><option value="">All categories</option>${CATS.map((x,i)=>`<option value="${i}" ${String(i)===ct?'selected':''}>${x}</option>`).join('')}</select></div><div><label for="rf" style="margin-top:0">Recognition</label><select id="rf"><option value="">All</option>${OUTCOMES.map(o=>`<option ${o===st?'selected':''}>${o}</option>`).join('')}</select></div><label class="row" style="font-weight:400;margin-top:24px"><input type="checkbox" id="rfl" style="width:auto" ${fl?'checked':''}> Show flagged nominees only</label></div>
  <div class="tw" style="margin-top:14px"><table><tr><th>Rank</th><th>Nominee</th><th>Category</th><th>Judges</th><th>Judge totals</th><th>Average</th><th>Recognition</th><th>Flag</th></tr>${rows.map((r,i)=>`<tr ${S.rn===r.n.id?'style="background:var(--soft)"':''} data-n="${esc(r.n.id)}" tabindex="0"><td><b>${r.wait?'–':i+1}</b></td><td>${esc(r.n.name)}</td><td>${esc(CATS[r.n.cat]||'')}</td><td>${r.sc.length} of ${S.d.settings.judges}</td><td>${r.sc.map(s=>`<span class="tag">${Math.round(s.total)}</span>`).join(' ')}</td><td><b>${r.wait?'–':r.avg.toFixed(1)}</b></td><td>${r.wait?'Awaiting judges':r.rec}</td><td>${r.flag?'<span class="tag">Spread flag</span>':''}</td></tr>`).join('')||'<tr><td colspan="8">No nominees match these filters.</td></tr>'}</table></div>
  <p class="sub" style="font-size:14px;margin-top:10px"><b>Awaiting judges</b> means fewer than the required judges have scored that nominee. <b>Spread flag</b> means judges’ totals differ by more than ${S.d.settings.spread} points, so the panel should discuss and moderate.</p></section>
  ${S.rn?(()=>{const r=R.find(x=>x.n.id===S.rn);return r?`<section class="card"><h2>Judges’ scores and reasons: ${esc(r.n.name)}</h2><div class="grid g3">${r.sc.map(s=>`<div class="card" style="margin:0"><div class="row between"><b>${esc(s.judge)}</b><span><b>${s.total}</b> / 100</span></div><div class="row" style="margin:8px 0">${s.values.map((x,i)=>`<span class="tag"><b>${names[i]}</b> ${x}</span>`).join('')}</div><p>${esc(s.comments)}</p></div>`).join('')||'<p class="sub">No scores yet.</p>'}</div><p class="sub" style="font-size:14px">${CRIT.map((c,i)=>names[i]+' '+c[0]).join(' · ')}</p></section>`:''})():''}`;
}
function bindResults(){
  $('#rc').onchange=e=>{S.rc=e.target.value;render()}; $('#rf').onchange=e=>{S.rf=e.target.value;render()}; $('#rfl').onchange=e=>{S.rfl=e.target.checked;render()};
  document.querySelectorAll('[data-n]').forEach(r=>{r.onclick=()=>{S.rn=r.dataset.n;render()};r.onkeydown=e=>{if(e.key==='Enter')r.click()}});
  if($('#exp')) $('#exp').onclick=()=>{ const head=['Nominee','Category','Judges','Average','Recognition']; const csv=[head,...results().map(r=>[r.n.name,CATS[r.n.cat],r.sc.length,r.wait?'':r.avg.toFixed(1),r.wait?'Awaiting judges':r.rec])].map(l=>l.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='tvet-awards-results.csv'; a.click(); };
}
function declPage(){
  return `<h1>Declarations</h1><p class="sub">Confidentiality and impartiality sign-offs recorded for every judge.</p><section class="card tw"><table><tr><th>Date</th><th>Person</th><th>Role</th><th>Type</th><th>Nominee ID</th></tr>${S.d.declarations.map(d=>`<tr><td>${esc(String(d.date).slice(0,16).replace('T',' '))}</td><td>${esc(d.person)}</td><td>${esc(d.role)}</td><td>${esc(d.type)}</td><td>${esc(d.nomineeId||'')}</td></tr>`).join('')||'<tr><td colspan="5">No declarations recorded yet. They appear once judges sign in and submit scores.</td></tr>'}</table></section>`;
}
function modPage(){
  const n=S.d.nominees.find(x=>x.id===S.mod)||S.d.nominees[0]; if(!n) return '<h1>Moderation</h1><p class="sub">Add nominees first.</p>';
  S.mod=n.id; const m=S.d.moderation.find(x=>x.nomineeId===n.id)||{}, r=result(n);
  return `<h1>Moderation</h1><p class="sub">After judging, record strengths, evidence, achievements and the outcome for each nominee. This feeds the final report.${ro()?' You have read-only access.':''}</p>
  <div class="grid side"><section class="card" style="margin-top:0"><h2>Nominees</h2>${S.d.nominees.map(x=>`<button class="item" data-m="${esc(x.id)}" ${x.id===n.id?'aria-current="true"':''}><span>${esc(x.name)}</span><small>${S.d.moderation.some(y=>y.nomineeId===x.id)?'Done':'Not started'}</small></button>`).join('')}</section>
  <section class="card" style="margin-top:0"><div class="row between"><h2>${esc(n.name)}</h2><span class="sub">${r.wait?'Awaiting judges':`Average ${r.avg.toFixed(1)} / 100 · Calculated: ${r.rec}`}</span></div>
  ${[['strengths','Strengths'],['evidence','Evidence'],['achievements','Achievements']].map(f=>`<label for="m_${f[0]}">${f[1]}</label><textarea id="m_${f[0]}" ${ro()?'readonly':''}>${esc(m[f[0]])}</textarea>`).join('')}
  <label for="m_outcome">Outcome</label><select id="m_outcome" ${ro()?'disabled':''}><option value="">Choose an outcome</option>${OUTCOMES.map(o=>`<option ${m.outcome===o?'selected':''}>${o}</option>`).join('')}</select>
  ${ro()?'':'<div class="row" style="margin-top:14px"><button class="btn dark" id="msave">Save moderation notes</button></div>'}</section></div>`;
}
function bindMod(){
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.mod=b.dataset.m;render()});
  if($('#msave')) $('#msave').onclick=async()=>{ const rec={nomineeId:S.mod,strengths:$('#m_strengths').value,evidence:$('#m_evidence').value,achievements:$('#m_achievements').value,outcome:$('#m_outcome').value};
    try{ if(live()){await post({action:'moderation',pin:S.cred,id:S.mod,...rec});await load()} else {S.d.moderation=S.d.moderation.filter(x=>x.nomineeId!==S.mod);S.d.moderation.push(rec)} toast('Moderation notes saved.'); render(); }catch(e){toast(e.message)} };
}
function settingsPage(){
  const s=S.d.settings;
  return `<h1>Settings</h1><p class="sub">Administrator only. Control how many judges are required and when results are flagged.</p><div class="grid side" style="grid-template-columns:1fr 320px"><div><section class="card" style="margin-top:0"><h2>Scoring rules</h2><div class="grid g2"><div><label for="sj">Number of judges required</label><input id="sj" type="number" min="1" value="${s.judges}"></div><div><label for="ss">Spread limit (points)</label><input id="ss" type="number" min="1" value="${s.spread}"></div></div><p class="err" id="err"></p><button class="btn dark" id="ssave">Save settings</button></section>
  <section class="card"><h2>Judges and auditors</h2><p class="sub">Names and personal codes are kept in the Google Sheet. After 10 wrong codes a name is locked for 15 minutes.</p><div class="tw"><table><tr><th>Name</th><th>Role</th></tr>${S.d.judgeNames.map(n=>`<tr><td>${esc(n)}</td><td>Judge</td></tr>`).join('')}${S.d.auditorNames.map(n=>`<tr><td>${esc(n)}</td><td>Auditor</td></tr>`).join('')}</table></div></section>
  <section class="card" style="border-style:dashed"><h2>Clear all data</h2><p class="sub">Wipes scores, declarations and moderation notes. Export results first if you need a copy.</p><button class="btn" id="clr">Clear scores, declarations and notes…</button></section></div>
  <div><section class="card" style="margin-top:0"><h2>Criteria and weights</h2><table>${CRIT.map(c=>`<tr><td>${c[0]}</td><td><b>${c[1]}</b></td></tr>`).join('')}</table></section><section class="card"><h2>How totals become recognition</h2><table><tr><td>90 and above</td><td><b>${OUTCOMES[0]}</b></td></tr><tr><td>80 to 89</td><td><b>${OUTCOMES[1]}</b></td></tr><tr><td>70 to 79</td><td><b>${OUTCOMES[2]}</b></td></tr><tr><td>Below 70</td><td><b>${OUTCOMES[3]}</b></td></tr></table></section></div></div>`;
}
function bindSettings(){
  $('#ssave').onclick=async()=>{ const j=+$('#sj').value, sp=+$('#ss').value; if(j<1||sp<1) return $('#err').textContent='Enter whole numbers of 1 or more.';
    try{ if(live()){await post({action:'settings',pin:S.cred,max:5,judges:j,qualify:70,spread:sp,judgeList:S.d.judgeNames});await load()} else {S.d.settings.judges=j;S.d.settings.spread=sp} toast('Settings saved.'); }catch(e){$('#err').textContent=e.message} };
  $('#clr').onclick=async()=>{ if(prompt('Type CLEAR to wipe all scores, declarations and notes.')!=='CLEAR') return;
    try{ if(live()){await post({action:'clear',pin:S.cred});await load()} else {S.d.scores=[];S.d.declarations=[];S.d.moderation=[]} toast('Data cleared.'); render(); }catch(e){toast(e.message)} };
}
function help(){
  return `<h1>Help</h1><p class="sub">Everything on one page. Judges need the first section only.</p><section class="card"><h2>For judges</h2><p>1. Choose your name, type your personal code and sign in. On your first sign-in, accept the confidentiality declaration.</p><p>2. Pick a nominee, read the details, and give each of the six criteria a whole number from 1 to 5.</p><p>3. Write your reasons, tick the impartiality sign-off and press Save.</p><div class="note"><b>Tip:</b> If you know a nominee personally or have a conflict of interest, do not score them. Tell the administrator.</div></section>
  <section class="card"><h2>For auditors</h2><p>Open Results to see every score, reasons and flags. Use Declarations and Moderation to check sign-offs and the final report. Auditor access is read-only.</p></section>
  <section class="card"><h2>For the administrator</h2><p>Manage nominees, settings and moderation notes. Keep the admin PIN private and change it if it is ever shared.</p></section>
  <section class="card"><h2>Troubleshooting</h2><p><b>Code not accepted:</b> check you chose your own name, then ask the administrator to reset it. <b>Too many attempts:</b> wait 15 minutes. <b>Scores not showing:</b> reload the page. <b>Page will not load:</b> check your connection.</p></section>${S.role?'':'<p><button class="lnk" id="bk">← Back to sign in</button></p>'}`;
}
// ---- boot ----
document.addEventListener('click',e=>{ if(e.target.id==='bk'){S.tab='';render()} });
// Background refresh: every 2 minutes the sheet is re-read quietly (no overlay, no flicker). The screen is only
// redrawn when something actually changed AND you are not scoring, typing or editing; otherwise the new data
// waits until your next click. Nothing you are working on is ever replaced.
const sig = () => JSON.stringify([S.d.nominees,S.d.scores,S.d.settings,S.d.declarations,S.d.moderation,S.d.recusals,S.d.log]);
async function bgRefresh(){
  if(!live()||!S.role||document.hidden||busyN>0||S.tab==='Settings') return;
  const before=sig(); try{ await load(true) }catch(e){ return }
  if(sig()===before) return;
  const a=document.activeElement, typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(typing||S.nom||S.edit||S.tab==='Moderation') return;
  const y=scrollY; render(); scrollTo(0,y);
}
setInterval(bgRefresh,120000);
// Refreshing the page does not sign anyone out. The session lives in sessionStorage: it survives a refresh, is cleared by
// Sign out, and disappears when the tab or browser is closed. A wrong or locked-out credential ends it; a network failure does not.
const forget = () => { try{ sessionStorage.removeItem('tvet.session') }catch(e){} };
(async()=>{
  if(!live()){ setTimeout(render,0); return }
  let sv=null; try{ sv=JSON.parse(sessionStorage.getItem('tvet.session')||'null') }catch(e){}
  if(sv&&sv.role&&sv.cred){
    S.role=sv.role; S.name=sv.name||''; S.cred=sv.cred; S.mode=sv.mode||'judge';
    for(let i=0;i<3;i++){
      try{ await busy(()=>load(),'Restoring your session...'); S.tab=sv.tab||(S.role==='admin'?'Nominees':S.role==='auditor'?'Results':''); render(); return }
      catch(e){
        if(/recognised|Incorrect|Too many/i.test(e.message)){ forget(); S.role=null; S.cred=''; S.name=''; S.err='Your session ended: '+e.message; break }
        if(i<2) await new Promise(r=>setTimeout(r,2500)); else { S.role=null; S.cred=''; S.err='Could not reach the server. Refresh to try again; you are still signed in.'; }
      }
    }
  }
  await busy(async()=>{ try{ const r=await post({action:'read'}); setCats(r); S.d.judgeNames=r.judgeNames||[]; S.d.auditorNames=r.auditorNames||[]; Object.assign(S.d.settings,r.settings) }catch(e){} });
  render();
})();
