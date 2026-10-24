// Wireframe-accurate screens. Loaded after app.js: replaces its simpler versions of these views.
CONFIG.sheetUrl = CONFIG.sheetUrl || '';
const GUIDE = ['Quality of lesson delivery, learner engagement and assessment practice.','Pass rates, throughput and improvement in learner results.','Links with employers, workplace placements and relevance to industry needs.','Use of digital tools and new methods that improve learning.','Qualifications, training and ongoing growth as a lecturer.','Learner surveys and testimonials about the nominee’s teaching.'];
const ENDS = '<div class="endpts"><span>1 Poor</span><span>5 Outstanding</span></div>';
const evHtml = l => l.map(e=>`<div class="ev"><span class="doc"></span><span>${esc(e.name)}</span><a href="${esc(e.url)}" target="_blank" rel="noopener">Open</a></div>`).join('') || '<p class="sub">No evidence files linked.</p>';
const dl = (name, text) => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download=name; a.click(); };
const exportCsv = () => dl('tvet-awards-results.csv',[['Nominee','Category','Judges','Average','Recognition'],...results().map(r=>[r.n.name,CATS[r.n.cat],r.sc.length,r.wait?'':r.avg.toFixed(1),r.wait?'Awaiting judges':r.rec])].map(l=>l.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n'));

// header: Help link for judges, admin title on Nominees
const chrome0 = chrome;
chrome = function(){ chrome0();
  if(S.role==='judge'&&!$('#hl')){ $('#who').insertAdjacentHTML('afterbegin','<a href="#help" id="hl">Help</a>'); $('#hl').onclick=e=>{e.preventDefault();S.tab='Help';render()}; }
  $('.brand strong').textContent = S.role==='admin'&&S.tab==='Nominees' ? 'Awards Scoring & Adjudication' : 'Scoring System'; };

// ---- sign in ----
signin = function(){
  const names = S.mode==='auditor'?S.d.auditorNames:S.d.judgeNames;
  return `<div class="grid g2" style="margin-top:28px;align-items:start"><section class="card" style="margin:0"><h1 style="margin-top:0">Sign in</h1><p class="sub">Panel judges, auditors and the administrator all sign in here.</p>
  <div class="seg">${['judge','auditor','admin'].map(m=>`<button class="btn ${S.mode===m?'dark':''}" data-m="${m}">${m==='admin'?'Administrator':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
  ${S.mode==='admin'?`<label for="cred">Admin PIN</label><input id="cred" type="password" autocomplete="off">`:`<label for="nm">Your name</label><select id="nm"><option value="">Choose your name from the list</option>${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select><label for="cred">Personal code</label><input id="cred" inputmode="numeric" autocomplete="off">`}
  <p class="sub" style="font-size:14px;margin:6px 0">Names are not case-sensitive. Never share your code.</p><p class="err" id="err">${esc(S.err)}</p>
  <button class="btn dark" style="width:100%" id="go">Sign in</button>
  <div class="note"><span class="eyebrow">Administrator</span>Choosing Administrator replaces the name list with a single field for the admin PIN.</div>
  ${live()?'':'<p style="margin-top:24px"><a href="#" id="proto">Prototype: continue as a first-time judge →</a></p>'}</section>
  <div><section class="card" style="margin-top:0"><h2>Which role am I?</h2>${[['Judge','Panel member','See the nominees, read their details, score them and give reasons. You see only your own scores.'],['Auditor','Legal Services / Internal Audit','Read-only access to the full results, reasons, declarations and moderation report. Auditors cannot score or change anything.'],['Administrator','Awards secretariat','Manages nominees, judges, settings and the final report. Signs in with the admin PIN.']].map(r=>`<div class="def"><b>${r[0]}</b> <small class="sub">${r[1]}</small><br>${r[2]}</div>`).join('')}</section>
  <section class="card"><h2>If sign-in does not work</h2>${[['Code not accepted','Check that you chose your own name, then retype the code carefully. If it still fails, ask the administrator to confirm or reset it.'],['Too many attempts','Wait 15 minutes, or ask the administrator to unlock your name.'],['Name missing from the list','Ask the administrator to add you in the sheet.']].map(r=>`<div class="box"><b>${r[0]}</b><br>${r[1]}</div>`).join('')}<p class="sub" style="font-size:14px;margin:0">After 10 wrong codes for one name, that name is locked for 15 minutes.</p></section>
  <div class="note solid"><span class="eyebrow">Confidentiality</span>The nominee list and judge names are private. They appear only after you sign in with a valid personal code or the admin PIN. Sign out on a shared computer.</div></div></div>`;
};
document.addEventListener('click',e=>{ if(e.target.id==='proto'){ e.preventDefault(); S.role='judge'; S.name=S.d.judgeNames[0]; S.confirmed=false; S.tab=''; render(); } });

// ---- judge scoring ----
scorePage = function(){
  const n=S.d.nominees.find(x=>x.id===S.nom), v=S.sel.v;
  return `<p style="margin-top:20px"><button class="lnk" id="back">← Back to nominees</button></p><div class="grid side"><div>
  <section class="card" style="margin-top:0"><small class="sub">Nomination ID ${esc(n.id)}</small><h2 style="font-size:26px;margin:6px 0">${esc(n.name)}</h2><p class="sub">${esc(n.college)}</p><span class="tag">${esc(CATS[n.cat]||'')}</span></section>
  <details class="card" id="ne" open><summary><h2>Nomination and evidence</h2></summary><p id="nomtxt">${esc(n.details||'')}</p><h2 style="margin-top:16px">Evidence</h2><div id="evs">${evHtml(n.evidence||[{name:'Portfolio of Evidence (PDF)',url:'#'}])}</div></details>
  <section class="card scalecard"><h2>The scale</h2><table class="scale">${SCALE.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><p class="sub" style="font-size:14px;margin-top:10px">The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p></section></div>
  <section class="card" style="margin-top:0"><div class="row between"><h2>Your scores</h2><span class="sub" style="font-size:14px">Whole number from 1 to 5 for each criterion</span></div>
  ${CRIT.map((c,i)=>`<div class="crit"><div class="head"><span>${c[0]}</span><span class="tag">Weight ${c[1]}</span></div><div class="eyebrow" style="margin:8px 0 2px">Guidance</div><p class="sub" style="font-size:14px;margin:0">${GUIDE[i]}</p><div class="pick" role="group" aria-label="${c[0]}">${[1,2,3,4,5].map(k=>`<button data-i="${i}" data-k="${k}" aria-pressed="${v[i]===k}">${k}</button>`).join('')}<span class="sub pts" id="pt${i}">${(v[i]/5*c[1]).toFixed(0)} / ${c[1]} points</span></div>${ENDS}</div>`).join('')}
  <label for="why">Your reasons for the scores</label><p class="sub" style="font-size:14px;margin:0 0 6px">Refer to the evidence.</p><textarea id="why" style="min-height:140px" ${S.d.settings.open===false?'disabled':''}>${esc(S.sel.c)}</textarea>
  <div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, do not score them. Tell the administrator.</div>
  <label class="note solid row" style="font-weight:400"><input type="checkbox" id="sign" style="width:auto"> I assessed this nomination impartially, with no conflict of interest, on the submitted and verified evidence.</label><p class="err" id="err"></p>
  <div class="row between foot"><div><small class="sub">Your total</small><div class="total"><span id="tot">${total(v)}</span> <span class="sub" style="font-size:16px;font-weight:400">/ 100</span></div></div><div class="row"><span class="note conf" id="conf" style="margin:0">After Save, a confirmation appears here</span><button class="btn dark" id="save">Save</button></div></div></section></div>`;
};
const bs0 = bindScore;
bindScore = function(){ bs0(); if(matchMedia('(max-width:820px)').matches) $('#ne').open=false;
  if(live()) post({action:'details',...creds(),id:S.nom}).then(r=>{ const f=r.fields||{}, ev=[];
    const lk=x=>/^[A-Za-z0-9_-]{20,}$/.test(x)?'https://drive.google.com/file/d/'+x+'/view':(/^https:\/\//.test(x)?x:'');
    if(lk(f.poe)) ev.push({name:'Portfolio of Evidence',url:lk(f.poe)}); if(/^https:\/\//.test(f.poeFolder||'')) ev.push({name:'PoE folder',url:f.poeFolder});
    $('#nomtxt').textContent=f.motivation||f.why||''; $('#evs').innerHTML=evHtml(ev); }).catch(()=>{}); };

// ---- admin: nominees ----
const parseCsv = t => { const rows=[]; let r=[],f='',q=false; for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){ if(ch==='"'){ if(t[i+1]==='"'){f+='"';i++} else q=false } else f+=ch }
  else if(ch==='"') q=true; else if(ch===','){r.push(f);f=''}
  else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&t[i+1]==='\n')i++; r.push(f);f='';rows.push(r);r=[] } else f+=ch }
  if(f||r.length){r.push(f);rows.push(r)} return rows.filter(x=>x.some(v=>v.trim())); };
nomsPage = function(){
  const e=S.d.nominees.find(n=>n.id===S.edit)||{}, q=(S.nq||'').toLowerCase(), c=S.nc||'';
  const all=S.d.nominees.filter(n=>(c===''||String(n.cat)===c)&&(n.name+n.college+n.id).toLowerCase().includes(q));
  const pages=Math.max(1,Math.ceil(all.length/6)), pg=Math.min(S.np||0,pages-1), rows=all.slice(pg*6,pg*6+6);
  return `<h1>Nominees</h1><p class="sub">Add and manage lecturers or teams entering the awards.</p><div class="grid side"><section class="card" style="margin:0"><h2>${e.id?'Edit nominee':'Add nominee'}</h2>
  <label for="nn">Nominee / lecturer name</label><input id="nn" value="${esc(e.name)}"><label for="nc">College / institution</label><input id="nc" value="${esc(e.college)}">
  <label for="nk">Award category</label><select id="nk"><option value="">Select a category</option>${CATS.map((x,i)=>`<option value="${i}" ${e.id&&e.cat===i?'selected':''}>${x}</option>`).join('')}</select>
  <label for="ni">Nomination ID</label><input id="ni" value="${esc(e.id)}" ${e.id?'readonly':''}><label for="nd">Nomination and evidence (optional)</label><textarea id="nd" placeholder="What judges will read, and links to evidence">${esc(e.details)}</textarea>
  <p class="err" id="err"></p><div class="row"><button class="btn gold" id="addn">Save nominee</button><button class="btn" id="cn">Cancel</button></div></section>
  <section class="card" style="margin:0"><div class="row between"><h2 style="margin:0">Nominee register</h2><div class="row"><input id="nq" placeholder="Search name, college or ID" value="${esc(S.nq||'')}" style="width:220px"><select id="ncf" style="width:auto"><option value="">All categories</option>${CATS.map((x,i)=>`<option value="${i}" ${String(i)===c?'selected':''}>${x}</option>`).join('')}</select></div></div>
  <div class="tw" style="margin-top:14px"><table><tr><th>Nomination ID</th><th>Nominee</th><th>College</th><th>Category</th><th>Judges scored</th><th>Actions</th></tr>${rows.map(n=>`<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${esc(CATS[n.cat]||'')}</td><td>${S.d.scores.filter(s=>s.id===n.id).length} of ${S.d.settings.judges}</td><td><button class="lnk" data-edit="${esc(n.id)}">Edit</button> &nbsp; <button class="lnk" style="color:inherit" data-del="${esc(n.id)}">Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No nominees match. Clear the search or add a nominee.</td></tr>'}</table></div>
  <div class="row between" style="margin-top:14px"><span class="sub">Showing ${all.length?pg*6+1:0} to ${pg*6+rows.length} of ${all.length} nominees</span><div class="row"><button class="btn" id="pv" ${pg<1?'disabled':''}>Previous</button><button class="btn" id="nx" ${pg>=pages-1?'disabled':''}>Next</button></div></div></section></div>
  <section class="card"><div class="grid g2"><div><h2>Import the whole list</h2><p class="sub">Upload a CSV file with one nominee per row. The first row must have these headings:</p><div class="row" style="margin-bottom:10px">${['Nomination ID','Nominee name','College','Award category'].map(h=>`<span class="tag">${h}</span>`).join('')}</div><p class="sub" style="font-size:14px">Detail columns are optional. Nothing already on the register is overwritten, and every skipped row is listed with the reason. In Excel, use Save As › CSV.</p><button class="lnk" id="tpl">Download a blank template</button><div id="imp"></div></div>
  <div class="dz" id="dz"><b>Drop your CSV file here</b><span>or</span><button class="btn" id="bf">Browse files</button><input type="file" id="fi" accept=".csv,text/csv" hidden></div></div></section>`;
};
bindNoms = function(){
  const keep=id=>{ const el=$(id); el.focus(); el.setSelectionRange?.(99,99); };
  $('#nq').oninput=e=>{S.nq=e.target.value;S.np=0;render();keep('#nq')}; $('#ncf').onchange=e=>{S.nc=e.target.value;S.np=0;render()};
  $('#pv').onclick=()=>{S.np=(S.np||0)-1;render()}; $('#nx').onclick=()=>{S.np=(S.np||0)+1;render()}; $('#cn').onclick=()=>{S.edit=null;render()};
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{S.edit=b.dataset.edit;render();scrollTo(0,0)});
  $('#addn').onclick=async()=>{ const n={id:$('#ni').value.trim(),name:$('#nn').value.trim(),college:$('#nc').value.trim(),cat:+$('#nk').value,catName:CATS[+$('#nk').value],details:$('#nd').value.trim()};
    if(!n.id||!n.name||$('#nk').value==='') return $('#err').textContent='Fill in the name, category and nomination ID.';
    if(!S.edit&&S.d.nominees.some(x=>x.id===n.id)) return $('#err').textContent='That nomination ID is already on the register.';
    try{ if(live()){ await post({action:'nominee',pin:S.cred,id:n.id,name:n.name,college:n.college,cat:n.cat,catName:n.catName,extra:{motivation:n.details}}); await load(); }
      else { const i=S.d.nominees.findIndex(x=>x.id===n.id); if(i>=0) S.d.nominees[i]={...S.d.nominees[i],...n}; else S.d.nominees.push(n); }
      S.edit=null; toast('Nominee saved.'); render(); }catch(e){ $('#err').textContent=e.message } };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this nominee and their scores?')) return;
    try{ if(live()){await post({action:'deleteNominee',pin:S.cred,id:b.dataset.del});await load()} else {S.d.nominees=S.d.nominees.filter(n=>n.id!==b.dataset.del);S.d.scores=S.d.scores.filter(s=>s.id!==b.dataset.del)} render(); }catch(e){toast(e.message)} });
  $('#tpl').onclick=()=>dl('nominee-template.csv','Nomination ID,Nominee name,College,Award category\n');
  $('#bf').onclick=()=>$('#fi').click(); $('#fi').onchange=e=>importFile(e.target.files[0]);
  const dz=$('#dz'); dz.ondragover=e=>{e.preventDefault();dz.classList.add('over')}; dz.ondragleave=()=>dz.classList.remove('over'); dz.ondrop=e=>{e.preventDefault();importFile(e.dataTransfer.files[0])};
};
async function importFile(f){
  const out=$('#imp'); if(!f) return; if(!/\.csv$/i.test(f.name)) return out.innerHTML='<p class="err">Save the file as CSV first (Excel: Save As › CSV).</p>';
  const rows=parseCsv(await f.text()), h=rows.shift().map(key), ix=k=>h.indexOf(k), [a,b,c,d]=['nominationid','nomineename','college','awardcategory'].map(ix);
  if([a,b,c,d].includes(-1)) return out.innerHTML='<p class="err">The first row must have: Nomination ID, Nominee name, College, Award category.</p>';
  let added=0; const skipped=[];
  for(const r of rows){ const n={id:(r[a]||'').trim(),name:(r[b]||'').trim(),college:(r[c]||'').trim(),cat:CATS.findIndex(x=>key(x)===key(r[d]))};
    const why=!n.id||!n.name?'missing ID or name':S.d.nominees.some(x=>x.id===n.id)?'ID already on the register':n.cat<0?'unknown category “'+(r[d]||'')+'”':'';
    if(why){skipped.push((n.id||n.name||'blank row')+': '+why);continue}
    try{ if(live()) await post({action:'nominee',pin:S.cred,id:n.id,name:n.name,college:n.college,cat:n.cat,catName:CATS[n.cat]}); else S.d.nominees.push({...n,details:''}); added++ }catch(e){skipped.push(n.id+': '+e.message)} }
  if(live()) await load(); render(); $('#imp').innerHTML=`<p><b>${added} added, ${skipped.length} skipped.</b></p>${skipped.length?'<ul>'+skipped.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>':''}`;
}

// ---- declarations ----
declPage = function(){
  const J=S.d.judgeNames, sg=n=>S.d.declarations.some(d=>d.person===n&&d.type==='Confidentiality');
  return `<h1>Declarations</h1><p class="sub">Check that confidentiality and impartiality sign-offs are recorded. Auditors see this tab read-only.</p><div class="grid" style="grid-template-columns:minmax(280px,1fr) 2fr;align-items:start">
  <section class="card" style="margin:0"><h2>Confidentiality declarations</h2><div class="tw"><table><tr><th>Name</th><th>Role</th><th>Declaration</th></tr>${J.map(n=>`<tr><td>${esc(n)}</td><td>Judge</td><td><span class="tag" ${sg(n)?'':'style="border-style:dashed"'}>${sg(n)?'Signed':'Not signed'}</span></td></tr>`).join('')}${S.d.auditorNames.map(n=>`<tr><td>${esc(n)}</td><td>Auditor</td><td class="sub">Not required</td></tr>`).join('')}</table></div></section>
  <section class="card" style="margin:0"><h2>Impartiality sign-offs</h2><p class="sub">Each judge ticks, per nominee, that they assessed impartially, with no conflict of interest, on the submitted and verified evidence.</p><div class="tw"><table><tr><th>Nominee</th>${J.map(n=>`<th>${esc(n)}</th>`).join('')}</tr>${S.d.nominees.map(n=>`<tr><td>${esc(n.name)}</td>${J.map(j=>`<td>${S.d.scores.some(s=>s.id===n.id&&s.judge===j)?'✓ Signed':'–'}</td>`).join('')}</tr>`).join('')||'<tr><td>No nominees yet.</td></tr>'}</table></div><p class="sub" style="font-size:14px;margin:10px 0 0">A dash means the judge has not scored that nominee yet.</p></section></div>`;
};

// ---- moderation: final report ----
const mod0 = modPage, bmod0 = bindMod;
modPage = function(){
  if(S.report) return `<div class="row between"><h1>Final moderation report</h1><button class="btn" id="repback">← Back to moderation</button></div><section class="card tw"><table><tr><th>Nominee</th><th>Average</th><th>Outcome</th><th>Strengths</th><th>Evidence</th><th>Achievements</th></tr>${S.d.nominees.map(n=>{const m=S.d.moderation.find(x=>x.nomineeId===n.id)||{},r=result(n);return `<tr><td>${esc(n.name)}</td><td>${r.wait?'–':r.avg.toFixed(1)}</td><td>${esc(m.outcome||'Not decided')}</td><td>${esc(m.strengths)}</td><td>${esc(m.evidence)}</td><td>${esc(m.achievements)}</td></tr>`}).join('')}</table></section>`;
  return mod0().replace('<h1>Moderation</h1>','<div class="row between"><h1>Moderation</h1><button class="btn" id="rep">View final moderation report</button></div>'); };
bindMod = function(){ if(S.report){ $('#repback').onclick=()=>{S.report=false;render()}; return } bmod0(); $('#rep').onclick=()=>{S.report=true;render()}; };

// ---- settings ----
settingsPage = function(){
  const s=S.d.settings, sg=n=>S.d.declarations.some(d=>d.person===n&&d.type==='Confidentiality'), open=s.open!==false;
  return `<h1>Settings</h1><p class="sub">Administrator only. Control how many judges are required, when results are flagged, and whether scoring is open.</p><div class="grid side" style="grid-template-columns:1fr 340px"><div>
  <section class="card" style="margin-top:0"><h2>Scoring rules</h2><div class="grid g2"><div><label for="sj">Number of judges required</label><input id="sj" type="number" min="1" value="${s.judges}"><p class="sub" style="font-size:14px">Until this many judges have scored a nominee, the result shows as Awaiting judges.</p></div><div><label for="ss">Spread limit (points)</label><input id="ss" type="number" min="1" value="${s.spread}"><p class="sub" style="font-size:14px">If judges’ totals differ by more than this, the nominee gets a Spread flag. Default 15.</p></div></div>
  <div class="row between" style="border-top:1px solid var(--soft);padding-top:14px"><div><b>Scoring is ${open?'open':'closed'}</b><br><span class="sub" style="font-size:14px">Switch this off when judging is finished.</span></div><div class="seg" style="width:220px"><button class="btn ${open?'dark':''}" id="so" aria-pressed="${open}">Open</button><button class="btn ${open?'':'dark'}" id="sc" aria-pressed="${!open}">Closed</button></div></div>
  <p class="err" id="err"></p><div class="row"><button class="btn dark" id="ssave">Save settings</button><button class="btn" id="sdis">Discard changes</button></div></section>
  <section class="card"><div class="row between"><h2>Judges and auditors</h2><button class="btn" id="sheet">Open the Google Sheet</button></div><p class="sub">Names and personal codes are kept in the Google Sheet. Codes are generated by the sheet’s setup tools and can be reset there. This list is read-only.</p><div class="tw"><table><tr><th>Name</th><th>Role</th><th>Declaration</th><th>Sign-in</th></tr>${S.d.judgeNames.map(n=>`<tr><td>${esc(n)}</td><td>Judge</td><td>${sg(n)?'Signed':'Not yet'}</td><td>Active</td></tr>`).join('')}${S.d.auditorNames.map(n=>`<tr><td>${esc(n)}</td><td>Auditor</td><td>Not required</td><td>Active</td></tr>`).join('')}</table></div><p class="sub" style="font-size:14px;margin:10px 0 0">After 10 wrong codes for one name, that name is locked for 15 minutes. Keep the admin PIN private and change it if it is ever shared.</p></section>
  <section class="card" style="border-style:dashed"><h2>Clear all data</h2><p class="sub">Wipes scores, declarations and moderation notes. Use it only for a fresh start. Export to Excel first if you need a copy.</p><div class="row"><button class="btn" id="sx">Export to Excel</button><button class="btn" style="border-style:dashed" id="clr">Clear scores, declarations and notes…</button></div></section></div>
  <div><section class="card" style="margin-top:0"><h2>Criteria and weights</h2>${CRIT.map(c=>`<div class="def row between"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('')}<p class="sub" style="font-size:14px;margin:8px 0 0">Each criterion is scored 1 to 5. The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p></section>
  <section class="card"><h2>How totals become recognition</h2>${[['90 and above',0],['80 to 89',1],['70 to 79',2],['Below 70',3]].map(r=>`<div class="def row between"><span class="sub">${r[0]}</span><b>${OUTCOMES[r[1]]}</b></div>`).join('')}</section></div></div>`;
};
const bset0 = bindSettings;
bindSettings = function(){ bset0();
  const o=S.d.settings; $('#so').onclick=()=>{o.open=true;render()}; $('#sc').onclick=()=>{o.open=false;render()};
  $('#sdis').onclick=async()=>{ if(live()) await load(); render(); toast('Changes discarded.') };
  $('#sx').onclick=exportCsv; $('#sheet').onclick=()=>CONFIG.sheetUrl?open(CONFIG.sheetUrl,'_blank','noopener'):toast('Set CONFIG.sheetUrl in app.js to link the sheet.'); };

// ---- help ----
help = function(){
  const ol=a=>`<ol class="steps">${a.map(x=>`<li>${x}</li>`).join('')}</ol>`, row=(a,b)=>`<div class="def"><b>${a}</b> ${b}</div>`;
  const sec=(id,t,body)=>`<section class="card" id="h-${id}" style="margin-top:0"><h2>${t}</h2>${body}</section>`;
  return `<h1>Help</h1><p class="sub">How the scoring system works, for judges, auditors and the administrator. Everything is saved to a shared Google Sheet, so every person sees the same up-to-date information.</p>
  <div class="row" style="margin:14px 0">${[['judges','For judges'],['auditors','For auditors'],['admin','For the administrator'],['criteria','Criteria and scale'],['trouble','Troubleshooting']].map(c=>`<button class="btn chipbtn" data-go="h-${c[0]}">${c[1]}</button>`).join('')}</div>
  <div class="grid g2" style="align-items:start"><div class="grid">
  ${sec('judges','For judges','<b>Signing in</b>'+ol(['Open the scoring page.','Choose your name from the drop-down list.','Type your personal code and press Sign in.','On your first sign-in, read and tick the confidentiality declaration. You cannot score until you have done this.'])+'<b>Scoring a nominee</b>'+ol(['Pick a nominee from the list. Open their details to read the nomination and evidence.','Give each of the six criteria a whole number from 1 to 5. The guidance for each criterion is shown beside it.','Write your reasons for the scores, with reference to the evidence.','Tick the sign-off: you assessed the nomination impartially, with no conflict of interest, on the submitted and verified evidence.','Press Save. A confirmation appears when it is stored.'])+'<div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, do not score them. Tell the administrator.</div>')}
  ${sec('auditors','For auditors',ol(['Choose your name from the Auditor drop-down, enter your code and sign in.','Open the Results tab to see every nominee’s scores, each judge’s reasons, and the flags.','Use the Declarations tab to check that confidentiality and impartiality sign-offs are recorded.','Use the Moderation tab to view the final moderation report.'])+'<p class="sub">Auditor access is read-only. If a figure looks wrong, tell the administrator; you cannot edit it.</p>')}
  ${sec('admin','For the administrator',row('Nominees:','add them one by one or import them in bulk.')+row('Judges and auditors:','keep the names and codes in the Google Sheet. Codes are generated by the sheet’s setup tools and can be reset there.')+row('Settings:','number of judges required, the spread limit, and whether scoring is open.')+row('Moderation:','after judging, record strengths, evidence, achievements and the outcome per nominee for the final report.')+row('Export:','download the results to Excel.')+row('Clear:','wipes scores, declarations and moderation notes. Use it only for a fresh start.'))}</div>
  <div class="grid"><section class="card" style="margin-top:0"><h2>Who can do what</h2>${row('Judge','<small class="sub">(Panel member)</small><br>See the nominees, read their details, score them and give reasons. You see only your own scores.')}${row('Auditor','<small class="sub">(Legal Services / Internal Audit)</small><br>Read-only access to the full results, reasons, declarations and moderation report. Auditors cannot score or change anything.')}${row('Administrator','<small class="sub">(Awards secretariat)</small><br>Manages nominees, judges, settings and the final report. Signs in with the admin PIN.')}</section>
  ${sec('criteria','The criteria and scale',CRIT.map(c=>`<div class="def row between"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('')+'<table class="scale" style="border:0;margin-top:10px">'+SCALE.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')+'</table><p class="sub" style="font-size:14px">The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p>')}
  <section class="card" style="margin-top:0"><h2>How totals become recognition</h2>${[['90 and above',0],['80 to 89',1],['70 to 79',2],['Below 70',3]].map(r=>`<div class="def row between"><span class="sub">${r[0]}</span><b>${OUTCOMES[r[1]]}</b></div>`).join('')}<p style="margin-top:10px"><b>Awaiting judges</b> means fewer than the required number of judges (three) have scored that nominee, so no final result is shown yet.</p><p><b>Spread flag:</b> if judges’ totals differ by more than the set limit (default 15 points), the nominee is flagged for the panel to discuss and moderate.</p></section>
  ${sec('trouble','Good to know and troubleshooting',row('Automatic refresh:','the page re-reads the sheet every 2 minutes so you see other people’s changes. It pauses while you are typing, so you never lose work.')+row('Switching users:','sign out first on a shared computer.')+row('Lockout:','after 10 wrong codes for one name, that name is locked for 15 minutes.')+row('Names are not case-sensitive;','spaces and punctuation are ignored.')+'<h2 style="margin-top:18px">Troubleshooting</h2>'+[['Code not accepted','Check that you chose your own name, then retype the code carefully. If it still fails, ask the administrator to confirm or reset it.'],['Too many attempts','Wait 15 minutes, or ask the administrator to unlock your name.'],['Name missing from the list','Ask the administrator to add you in the sheet.'],['Scores not showing for others','Wait for the 2-minute refresh, or reload the page.'],['Page will not load','Check your internet connection, then reload.']].map(r=>`<div class="def trow"><b>${r[0]}</b><span>${r[1]}</span></div>`).join(''))}</div></div>
  ${S.role==='admin'||S.role==='auditor'?'':'<p><button class="lnk" id="bk">← Back</button></p>'}`;
};
document.addEventListener('click',e=>{ const g=e.target.dataset?.go; if(g) document.getElementById(g)?.scrollIntoView({behavior:'smooth'}); });
render();