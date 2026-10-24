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
  ${S.mode==='admin'?`<label for="cred">Admin PIN</label><input id="cred" type="password" autocomplete="off">`:`<label for="nm">Your name</label><select id="nm"><option value="">Choose your name from the list</option>${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select><label for="cred">Personal code</label><input id="cred" type="password" inputmode="numeric" autocomplete="off">`}
  <p class="sub" style="font-size:14px;margin:6px 0">Names are not case-sensitive. Never share your code.</p><p class="err" id="err">${esc(S.err)}</p>
  <button class="btn dark" style="width:100%" id="go">Sign in</button>
  <div class="note"><span class="eyebrow">Administrator</span>Choosing Administrator replaces the name list with a single field for the admin PIN.</div>
  ${live()?'':'<p style="margin-top:24px"><a href="#" id="proto">Prototype: continue as a first-time judge →</a></p>'}</section>
  <div><section class="card" style="margin-top:0"><h2>Which role am I?</h2>${[['Judge','Panel member','See the nominees, read their details, score them and give reasons. You see only your own scores.'],['Auditor','Legal Services / Internal Audit','Read-only access to the full results, reasons, declarations and moderation report. Auditors cannot score or change anything.'],['Administrator','Awards secretariat','Manages nominees, judges, settings and the final report. Signs in with the admin PIN.']].map(r=>`<div class="def"><b>${r[0]}</b> <small class="sub">${r[1]}</small><br>${r[2]}</div>`).join('')}</section>
  <section class="card"><h2>If sign-in does not work</h2>${[['Code not accepted','Check that you chose your own name, then retype the code carefully. If it still fails, ask the administrator to confirm or reset it.'],['Too many attempts','Wait 15 minutes, or ask the administrator to unlock your name.'],['Name missing from the list','Ask the administrator to add you in the sheet.']].map(r=>`<div class="box"><b>${r[0]}</b><br>${r[1]}</div>`).join('')}<p class="sub" style="font-size:14px;margin:0">After 10 wrong codes for one name, that name is locked for 15 minutes.</p></section>
  <div class="note solid"><span class="eyebrow">Confidentiality</span>The nominee list and judge names are private. They appear only after you sign in with a valid personal code or the admin PIN. Sign out on a shared computer.</div></div></div>`;
};
document.addEventListener('click',e=>{ if(e.target.id==='proto'){ e.preventDefault(); S.role='judge'; S.name=S.d.judgeNames[0]; S.confirmed=false; S.tab=''; render(); } });

// ---- shared: nomination details and the PoE ----
const EXTRA_F=[['source','Source'],['title','Title'],['campus','Campus'],['department','Department'],['designation','Designation'],['status','Status'],['experience','Years of experience'],['province','Province'],['employeeNo','Employee number'],['focus','Focus area (subjects)'],['learners','Annual learners'],['email','Email'],['mobile','Mobile'],['nominator','Nominator'],['relationship','Nominator relationship'],['nominatorContact','Nominator contact'],['nominationDate','Nomination date'],['motivation','Motivation summary'],['why','Why deserving'],['impact','Measurable impact / evidence summary'],['profile','Professional profile'],['philosophy','Teaching philosophy'],['examples','Examples (teaching, curriculum, innovation)'],['evidence','Evidence, previous two academic years'],['poe','PoE link (Google Drive or SharePoint)'],['poeFolder','PoE folder link (Google Drive folder)']];
const LAB=Object.fromEntries(EXTRA_F), LONGF=new Set(['motivation','why','impact','profile','philosophy','examples','evidence']);
const GROUPS=[['About the nominee',['source','title','campus','department','designation','status','experience','province','focus','learners','employeeNo']],['Nomination',['nominator','relationship','nominatorContact','nominationDate']],['Contact details',['email','mobile']],['Motivation and evidence',['motivation','why','impact','profile','philosophy','examples','evidence']]];
const FILE_ID=/^[A-Za-z0-9_-]{20,}$/, FOLD=/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{20,}$/, SPURL=/^https:\/\/(?:[a-z0-9-]+\.)*(?:sharepoint\.com|sharepoint\.us|1drv\.ms|onedrive\.live\.com)(?:[\/?#]|$)/i;
// one nominee's details, fetched on demand and kept for the session. The sheet decides what each role may see.
const detail = async id => { const k=S.role+'|'+id; if(S.dc[k]) return S.dc[k]; const r=await post({action:'details',...creds(),id:String(id)}); return S.dc[k]=r.fields||{}; };
function poeBlock(f){
  const id=String(f.poe||'').trim(), fo=String(f.poeFolder||'').trim(); let h='';
  if(FILE_ID.test(id)) h+=`<p class="sub" style="margin:0 0 6px"><b>The PoE document (PDF)</b></p><a class="btn dark" target="_blank" rel="noopener noreferrer" href="https://drive.google.com/file/d/${encodeURIComponent(id)}/view">Open the PoE (new tab)</a>`;
  else if(SPURL.test(id)&&id.length<=1800&&!/[\s<>"'\\]/.test(id)) h+=`<p class="sub" style="margin:0 0 6px"><b>The PoE document (SharePoint / OneDrive)</b></p><a class="btn dark" target="_blank" rel="noopener noreferrer" href="${esc(id)}">Open the PoE (new tab)</a>`;
  if(FOLD.test(fo)) h+=`<p class="sub" style="margin:${h?'16px':'0'} 0 6px"><b>All the evidence for this nominee</b> (videos, certificates, letters, supporting documents)</p><a class="btn gold" target="_blank" rel="noopener noreferrer" href="${esc(fo)}">Open the PoE folder (new tab)</a>`;
  if(!h) return '<p class="sub">No PoE has been linked to this nominee yet. Ask the organisers before scoring.</p>';
  return h+'<p class="sub" style="font-size:14px;margin:12px 0 0">If Google or SharePoint asks you to sign in or says you need access, ask the organisers to share it with you.</p>';
}
function detailCards(f){
  return GROUPS.map(([t,keys])=>{ const have=keys.filter(k=>String(f[k]||'').trim()); if(!have.length) return '';
    const sh=have.filter(k=>!LONGF.has(k)), lg=have.filter(k=>LONGF.has(k));
    return `<div class="box"><b>${t}</b>${sh.length?'<div class="dgrid">'+sh.map(k=>`<div><span class="eyebrow">${esc(LAB[k])}</span>${esc(f[k])}</div>`).join('')+'</div>':''}${lg.map(k=>`<div class="def"><span class="eyebrow">${esc(LAB[k])}</span><div style="white-space:pre-wrap">${esc(f[k])}</div></div>`).join('')}</div>`; }).join('')
    || '<p class="sub">No nomination details have been loaded for this nominee yet. Ask the organisers before scoring.</p>';
}
// ---- judge scoring ----
scorePage = function(){
  const n=S.d.nominees.find(x=>x.id===S.nom), v=S.sel.v, m=mine(n.id), gone=recused(n.id), closed=S.d.settings.open===false;
  const left=`<p style="margin-top:20px"><button class="lnk" id="back">← Back to nominees</button></p><div class="grid side"><div>
  <section class="card" style="margin-top:0"><small class="sub">Nomination ID ${esc(n.id)}</small><h2 style="font-size:26px;margin:6px 0">${esc(n.name)}</h2><p class="sub">${esc(n.college)}</p><span class="tag">${esc(CATS[n.cat]||'')}</span> ${poeTag(n)}</section>
  <details class="card" id="ne" open><summary><h2>Portfolio of Evidence</h2></summary><div id="poe"><p class="sub">Loading...</p></div></details>
  <details class="card" id="nd2" open><summary><h2>Nomination details</h2></summary><div id="dets"><p class="sub">Loading...</p></div></details>
  <section class="card scalecard"><h2>The scale</h2><table class="scale">${SCALE.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><p class="sub" style="font-size:14px;margin-top:10px">The total is a percentage: all 3s give 60%, all 4s give 80%, all 5s give 100%.</p></section></div>`;
  if(gone) return left+`<section class="card" style="margin-top:0"><h2>You have recused yourself</h2><p>You declared a conflict of interest with this nominee, so you cannot score them. If this was a mistake, tell the administrator.</p></section></div>`;
  if(closed) return left+`<section class="card" style="margin-top:0"><h2>Scoring is closed</h2><p>The administrator has closed scoring.${m?` Your saved total for this nominee is <b>${m.total}%</b>.`:''}</p></section></div>`;
  return left+`<section class="card" style="margin-top:0"><label for="coi" style="margin-top:0">Conflict of interest</label><select id="coi"><option value="">-- Declare --</option><option value="none">I have NO conflict of interest with this nominee</option><option value="conflict">I HAVE a conflict of interest, so I recuse myself</option></select>
  <div id="sbody" ${S.sel.coi==='none'?'':'hidden'}><div class="row between" style="margin-top:18px"><h2>Your scores</h2><span class="sub" style="font-size:14px">Whole number from 1 to 5 for each criterion</span></div>
  ${CRIT.map((c,i)=>`<div class="crit"><div class="head"><span>${c[0]}</span><span class="tag">Weight ${c[1]}</span></div><div class="eyebrow" style="margin:8px 0 2px">Guidance</div><p class="sub" style="font-size:14px;margin:0">${GUIDE[i]}</p><div class="pick" role="group" aria-label="${c[0]}">${[1,2,3,4,5].map(k=>`<button data-i="${i}" data-k="${k}" aria-pressed="${v[i]===k}">${k}</button>`).join('')}<span class="sub pts" id="pt${i}">${(v[i]/5*c[1]).toFixed(0)} / ${c[1]} points</span></div>${ENDS}</div>`).join('')}
  <label for="why">Your reasons for the scores</label><p class="sub" style="font-size:14px;margin:0 0 6px">One box for all six criteria. Refer to the evidence.</p><textarea id="why" style="min-height:140px">${esc(S.sel.c)}</textarea>
  <div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, choose the recusal option above and do not score them.</div>
  <label class="note solid row" style="font-weight:400"><input type="checkbox" id="sign" style="width:auto"> I assessed this nomination impartially, with no conflict of interest, on the submitted and verified evidence.</label><p class="err" id="err"></p>
  <div class="row between foot"><div><small class="sub">Your total</small><div class="total"><span id="tot">${total(v)}</span><span class="sub" style="font-size:16px;font-weight:400"> %</span></div></div><div class="row"><span class="note conf" id="conf" style="margin:0">After Save, a confirmation appears here</span><button class="btn dark" id="save">Save</button></div></div></div></section></div>`;
};
bindScore = function(){
  const v=S.sel.v, id=S.nom; $('#back').onclick=()=>{S.nom=null;render()};
  detail(id).then(f=>{ if(S.nom!==id||!$('#poe')) return; $('#poe').innerHTML=poeBlock(f); $('#dets').innerHTML=detailCards(f); })
    .catch(e=>{ if($('#poe')) $('#poe').innerHTML='<p class="err">Could not load the details: '+esc(e.message)+'</p>'; });
  if(matchMedia('(max-width:820px)').matches&&$('#ne')){ $('#nd2').open=false }
  const coi=$('#coi'); if(!coi) return;
  coi.value=S.sel.coi||'';
  coi.onchange=async()=>{
    if(coi.value==='conflict'){
      if(!confirm('Recuse yourself from this nominee? Any score you entered for them will be removed.')){ coi.value=S.sel.coi||''; return }
      try{ await busy(async()=>{ await post({action:'recusal',nomineeId:S.nom,judge:S.name,code:S.cred}); await load(true) },'Recording your recusal...'); toast('Recusal recorded. You cannot score this nominee.'); S.nom=null; render(); }
      catch(e){ toast(e.message); coi.value=S.sel.coi||'' }
    } else { S.sel.coi=coi.value; $('#sbody').hidden=coi.value!=='none'; }
  };
  document.querySelectorAll('.pick button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;v[i]=+b.dataset.k;
    document.querySelectorAll(`.pick button[data-i="${i}"]`).forEach(x=>x.setAttribute('aria-pressed',+x.dataset.k===v[i]));
    $('#pt'+i).textContent=`${(v[i]/5*CRIT[i][1]).toFixed(0)} / ${CRIT[i][1]} points`; $('#tot').textContent=total(v)});
  $('#why').oninput=e=>S.sel.c=e.target.value;
  $('#save').onclick=async()=>{
    const err=m=>$('#err').textContent=m;
    if(S.d.settings.open===false) return err('Scoring is closed.');
    if(S.sel.coi!=='none') return err('Declare that you have no conflict of interest before scoring.');
    if(v.some(x=>!x)) return err('Give every criterion a score from 1 to 5.');
    if(S.sel.c.trim().length<5) return err('Write your reasons for the scores.');
    if(!$('#sign').checked) return err('Tick the sign-off before saving.');
    const old=mine(S.nom), rec={nomineeId:S.nom,judge:S.name,values:v,total:total(v),comments:S.sel.c.trim(),declare:true};
    if(old&&old.total===rec.total&&old.comments===rec.comments&&old.values.every((x,i)=>x===v[i])) return err('Nothing has changed since you last saved.');
    let reason=''; if(old){ reason=(prompt('You already scored this nominee. Why are you changing the score?')||'').trim(); if(!reason) return err('A reason for the change is required.'); }
    try{ if(live()){ await post({action:'score',code:S.cred,rec,log:old?{oldTotal:old.total,newTotal:rec.total,reason}:null}); await load(); }
      else { S.d.scores=S.d.scores.filter(s=>!(s.id===S.nom&&s.judge===S.name)); S.d.scores.push({id:S.nom,judge:S.name,values:[...v],total:rec.total,comments:rec.comments}); }
      toast('Saved. Your scores for '+S.d.nominees.find(x=>x.id===S.nom).name+' are stored.'); S.nom=null; render();
    }catch(e){err(e.message)}
  };
};

// ---- admin: nominees ----
const parseCsv = t => { const rows=[]; let r=[],f='',q=false; for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){ if(ch==='"'){ if(t[i+1]==='"'){f+='"';i++} else q=false } else f+=ch }
  else if(ch==='"') q=true; else if(ch===','){r.push(f);f=''}
  else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&t[i+1]==='\n')i++; r.push(f);f='';rows.push(r);r=[] } else f+=ch }
  if(f||r.length){r.push(f);rows.push(r)} return rows.filter(x=>x.some(v=>v.trim())); };
nomsPage = function(){
  const e=S.d.nominees.find(n=>n.id===S.edit)||{}, q=(S.nq||'').toLowerCase(), c=S.nc||'', np=!!S.nopoe, N=S.d.nominees.length;
  const rows=S.d.nominees.filter(n=>(c===''||String(n.cat)===c)&&(!np||!n.poe)&&(n.name+' '+n.college+' '+n.id+' '+(CATS[n.cat]||'')).toLowerCase().includes(q));
  const groups=byCat(rows), noPoe=S.d.nominees.filter(n=>!n.poe).length;
  const field=([k,l])=>LONGF.has(k)?`<div style="grid-column:1/-1"><label for="x_${k}">${esc(l)}</label><textarea id="x_${k}"></textarea></div>`:`<div><label for="x_${k}">${esc(l)}</label><input id="x_${k}" autocomplete="off"></div>`;
  return `<h1>Nominees</h1><p class="sub">Add and manage lecturers or teams entering the awards. ${noPoe} of ${N} nominees have no PoE linked yet.</p>
  <div style="margin-bottom:16px">${catTable([['With a PoE',ns=>ns.filter(n=>n.poe).length+' of '+ns.length],['Scored by every judge',ns=>ns.filter(n=>S.d.scores.filter(s=>s.id===n.id).length>=Math.max(1,+S.d.settings.judges)).length]])}</div>
  <div class="grid side"><section class="card" style="margin:0"><h2>${e.id?'Edit nominee':'Add nominee'}</h2>
  <label for="nn">Nominee / lecturer name</label><input id="nn" value="${esc(e.name)}"><label for="nc">College / institution</label><input id="nc" value="${esc(e.college)}">
  <label for="nk">Award category</label><select id="nk"><option value="">Select a category</option>${CATS.map((x,i)=>`<option value="${i}" ${e.id&&e.cat===i?'selected':''}>${esc(x)}</option>`).join('')}</select>
  <label for="ni">Nomination ID</label><input id="ni" value="${esc(e.id)}" ${e.id?'readonly':''}>
  <details id="xd" class="note" style="margin-top:14px" ${e.id?'open':''}><summary><b>Nomination details and PoE links</b></summary><p class="sub" style="font-size:14px">Judges read these when they score. Contact details and who nominated are kept from judges. ${e.id?'Existing values are loaded below.':''}</p><div class="xgrid">${EXTRA_F.map(field).join('')}</div></details>
  <p class="err" id="err"></p><div class="row"><button class="btn gold" id="addn">Save nominee</button><button class="btn" id="cn">Cancel</button></div></section>
  <section class="card" style="margin:0"><div class="row between"><h2 style="margin:0">Nominee register</h2><div class="row"><input id="nq" placeholder="Search name, college or ID" value="${esc(S.nq||'')}" style="width:220px"><select id="ncf" style="width:auto"><option value="">All categories</option>${CATS.map((x,i)=>`<option value="${i}" ${String(i)===c?'selected':''}>${esc(x)}</option>`).join('')}</select></div></div>
  <label class="row" style="font-weight:400;margin:10px 0 0"><input type="checkbox" id="nnp" style="width:auto" ${np?'checked':''}> Only nominees without a PoE</label>
  <p class="sub" style="margin:10px 0 0">Showing ${rows.length} of ${N} nominees.</p>
  <div class="tw" style="margin-top:10px"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>PoE</th><th>Judges scored</th><th>Actions</th></tr>${groups.map(g=>`<tr class="grouprow"><td colspan="6">${esc(g.name)} &middot; ${g.all.length} nominee${g.all.length===1?'':'s'} &middot; ${g.all.filter(n=>n.poe).length} with a PoE</td></tr>`+g.items.map(n=>`<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${poeTag(n)}</td><td>${S.d.scores.filter(s=>s.id===n.id).length} of ${S.d.settings.judges}</td><td><button class="lnk" data-view="${esc(n.id)}">Details</button> &nbsp; <button class="lnk" data-poe="${esc(n.id)}">${n.poe?'Change PoE':'Attach PoE'}</button> &nbsp; <button class="lnk" data-edit="${esc(n.id)}">Edit</button> &nbsp; <button class="lnk" style="color:inherit" data-del="${esc(n.id)}">Delete</button></td></tr>`).join('')).join('')||'<tr><td colspan="6">No nominees match. Clear the search or add a nominee.</td></tr>'}</table></div>
  ${S.view?`<div class="card" style="margin:16px 0 0"><div class="row between"><h2 style="margin:0">${esc((S.d.nominees.find(n=>n.id===S.view)||{}).name||S.view)}</h2><button class="lnk" id="vclose">Close</button></div><div class="dp" data-id="${esc(S.view)}"><p class="sub">Loading...</p></div></div>`:''}</section></div>
  <section class="card"><div class="grid g2"><div><h2>Import the whole list</h2><p class="sub">Upload a CSV file with one nominee per row. The first row must have these headings:</p><div class="row" style="margin-bottom:10px">${['Nomination ID','Nominee name','College','Award category'].map(h=>`<span class="tag">${h}</span>`).join('')}</div><p class="sub" style="font-size:14px">Optional columns: any nomination detail heading (for example Motivation summary), plus <b>PoE link (Google Drive or SharePoint)</b> and <b>PoE folder link (Google Drive folder)</b>. Nothing already on the register is overwritten, and every skipped row is listed with the reason. In Excel, use Save As › CSV.</p><button class="lnk" id="tpl">Download a blank template</button><div id="imp"></div></div>
  <div class="dz" id="dz"><b>Drop your CSV file here</b><span>or</span><button class="btn" id="bf">Browse files</button><input type="file" id="fi" accept=".csv,text/csv" hidden></div></div></section>`;
};
const xvals = () => Object.fromEntries(EXTRA_F.map(([k])=>[k,(($('#x_'+k)||{}).value||'').trim()]));
bindNoms = function(){
  const keep=id=>{ const el=$(id); el.focus(); el.setSelectionRange?.(99,99); };
  $('#nq').oninput=e=>{S.nq=e.target.value;render();keep('#nq')}; $('#ncf').onchange=e=>{S.nc=e.target.value;render()}; $('#nnp').onchange=e=>{S.nopoe=e.target.checked;render()};
  $('#cn').onclick=()=>{S.edit=null;S.xl=null;S.fresh=true;render()};
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{S.edit=b.dataset.edit;S.xl=null;render();scrollTo(0,0)});
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{S.view=b.dataset.view;render();document.querySelector('.dp')?.scrollIntoView({behavior:'smooth',block:'nearest'})});
  if($('#vclose')) $('#vclose').onclick=()=>{S.view=null;render()};
  document.querySelectorAll('[data-poe]').forEach(b=>b.onclick=async()=>{
    const n=S.d.nominees.find(x=>x.id===b.dataset.poe); if(!n) return;
    const v=prompt('Paste a link for '+n.name+':\n- a Google Drive or SharePoint link to the PoE PDF, or\n- a Google Drive FOLDER link with all of their evidence.\n\nLeave it empty and press OK to remove both.',''); if(v===null) return;
    const link=v.trim(), isFolder=/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(link);
    try{ if(live()){ await busy(async()=>{ await post({action:'setPoe',pin:S.cred,id:n.id,...(link?(isFolder?{folder:link}:{poe:link}):{poe:'',folder:''})}); await load(true) },'Saving the PoE link...'); S.dc={}; }
      else n.poe=!!link; toast(link?'PoE linked to '+n.name+'.':'PoE removed from '+n.name+'.'); render(); $('#nq')&&keep('#nq'); }catch(err){ toast(err.message) } });
  $('#addn').onclick=async()=>{ const n={id:$('#ni').value.trim(),name:$('#nn').value.trim(),college:$('#nc').value.trim(),cat:+$('#nk').value,catName:CATS[+$('#nk').value]};
    if(!n.id||!n.name||$('#nk').value==='') return $('#err').textContent='Fill in the name, category and nomination ID.';
    if(!S.edit&&S.d.nominees.some(x=>x.id===n.id)) return $('#err').textContent='That nomination ID is already on the register.';
    // Editing: the details are sent only once they have been loaded into the form, so an edit can never blank what is stored.
    const x=xvals(), extra=S.edit?(S.xl===S.edit?x:undefined):(Object.values(x).some(Boolean)?x:undefined);
    try{ if(live()){ await post({action:'nominee',pin:S.cred,id:n.id,name:n.name,college:n.college,cat:n.cat,catName:n.catName,...(extra?{extra}:{})}); S.dc={}; await load(); }
      else { const i=S.d.nominees.findIndex(y=>y.id===n.id); if(i>=0) S.d.nominees[i]={...S.d.nominees[i],...n}; else S.d.nominees.push({...n,details:''}); }
      S.edit=null; S.xl=null; S.fresh=true; toast('Nominee saved.'); render(); }catch(e){ $('#err').textContent=e.message } };
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this nominee and their scores?')) return;
    try{ if(live()){await post({action:'deleteNominee',pin:S.cred,id:b.dataset.del});S.dc={};await load()} else {S.d.nominees=S.d.nominees.filter(n=>n.id!==b.dataset.del);S.d.scores=S.d.scores.filter(s=>s.id!==b.dataset.del)} render(); }catch(e){toast(e.message)} });
  $('#tpl').onclick=()=>dl('nominee-template.csv','Nomination ID,Nominee name,College,Award category,Motivation summary,PoE link (Google Drive or SharePoint),PoE folder link (Google Drive folder)\n');
  $('#bf').onclick=()=>$('#fi').click(); $('#fi').onchange=e=>importFile(e.target.files[0]);
  const dz=$('#dz'); dz.ondragover=e=>{e.preventDefault();dz.classList.add('over')}; dz.ondragleave=()=>dz.classList.remove('over'); dz.ondrop=e=>{e.preventDefault();importFile(e.dataTransfer.files[0])};
};
async function importFile(f){
  const out=$('#imp'); if(!f) return; if(!/\.csv$/i.test(f.name)) return out.innerHTML='<p class="err">Save the file as CSV first (Excel: Save As › CSV).</p>';
  const rows=parseCsv(await f.text()), h=rows.shift().map(key), ix=k=>h.indexOf(k), [a,b,c,d]=['nominationid','nomineename','college','awardcategory'].map(ix);
  if([a,b,c,d].includes(-1)) return out.innerHTML='<p class="err">The first row must have: Nomination ID, Nominee name, College, Award category.</p>';
  const xcols=[]; h.forEach((hh,i)=>{ const f2=EXTRA_F.find(([k,l])=>key(k)===hh||key(l)===hh); if(f2&&![a,b,c,d].includes(i)) xcols.push([f2[0],i]) });
  let added=0; const skipped=[];
  for(const r of rows){ const n={id:(r[a]||'').trim(),name:(r[b]||'').trim(),college:(r[c]||'').trim(),cat:CATS.findIndex(x=>key(x)===key(r[d]))};
    const why=!n.id||!n.name?'missing ID or name':S.d.nominees.some(x=>x.id===n.id)?'ID already on the register':n.cat<0?'unknown category “'+(r[d]||'')+'”':'';
    if(why){skipped.push((n.id||n.name||'blank row')+': '+why);continue}
    const extra={}; xcols.forEach(([k,i])=>{ if((r[i]||'').trim()) extra[k]=r[i].trim() });
    try{ if(live()) await post({action:'nominee',pin:S.cred,id:n.id,name:n.name,college:n.college,cat:n.cat,catName:CATS[n.cat],...(Object.keys(extra).length?{extra}:{})}); else S.d.nominees.push({...n,details:''}); added++ }catch(e){skipped.push(n.id+': '+e.message)} }
  if(live()) await load(); S.dc={}; render(); $('#imp').innerHTML=`<p><b>${added} added, ${skipped.length} skipped.</b></p>${skipped.length?'<ul>'+skipped.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>':''}`;
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
  <div class="row between" style="border-top:1px solid var(--soft);padding-top:14px"><div><b>Scoring is ${open?'open':'closed'}</b><br><span class="sub" style="font-size:14px">Saved with “Save settings”. When closed, judges cannot score or recuse.</span></div><div class="seg" style="width:220px"><button class="btn ${open?'dark':''}" id="so" aria-pressed="${open}">Open</button><button class="btn ${open?'':'dark'}" id="sc" aria-pressed="${!open}">Closed</button></div></div>
  <p class="err" id="err"></p><div class="row"><button class="btn dark" id="ssave">Save settings</button><button class="btn" id="sdis">Discard changes</button></div></section>
  <section class="card"><div class="row between"><h2>Judges and auditors</h2><button class="btn" id="sheet">Open the Google Sheet</button></div><p class="sub">Names and personal codes are kept in the Google Sheet. Codes are generated by the sheet’s setup tools and can be reset there. This list is read-only.</p><div class="tw"><table><tr><th>Name</th><th>Role</th><th>Declaration</th><th>Sign-in</th></tr>${S.d.judgeNames.map(n=>`<tr><td>${esc(n)}</td><td>Judge</td><td>${sg(n)?'Signed':'Not yet'}</td><td>Active</td></tr>`).join('')}${S.d.auditorNames.map(n=>`<tr><td>${esc(n)}</td><td>Auditor</td><td>Not required</td><td>Active</td></tr>`).join('')}</table></div><p class="sub" style="font-size:14px;margin:10px 0 0">After 10 wrong codes for one name, that name is locked for 15 minutes. Keep the admin PIN private and change it if it is ever shared.</p></section>
  <section class="card" style="border-style:dashed"><h2>Clear all data</h2><p class="sub">Wipes scores, declarations and moderation notes. Use it only for a fresh start. Export to Excel first if you need a copy.</p><div class="row"><button class="btn" id="sx">Export to Excel</button><button class="btn" style="border-style:dashed" id="clr">Clear scores, declarations and notes…</button></div></section></div>
  <div><section class="card" style="margin-top:0"><h2>Criteria and weights</h2>${CRIT.map(c=>`<div class="def row between"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('')}<p class="sub" style="font-size:14px;margin:8px 0 0">Each criterion is scored 1 to 5. The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p></section>
  <section class="card"><h2>How totals become recognition</h2>${[['90 and above',0],['80 to 89',1],['70 to 79',2],['Below 70',3]].map(r=>`<div class="def row between"><span class="sub">${r[0]}</span><b>${OUTCOMES[r[1]]}</b></div>`).join('')}</section></div></div>`;
};
// ---- help ----
help = function(){
  const ol=a=>`<ol class="steps">${a.map(x=>`<li>${x}</li>`).join('')}</ol>`, row=(a,b)=>`<div class="def"><b>${a}</b> ${b}</div>`;
  const sec=(id,t,body)=>`<section class="card" id="h-${id}" style="margin-top:0"><h2>${t}</h2>${body}</section>`;
  return `<h1>Help</h1><p class="sub">How the scoring system works, for judges, auditors and the administrator. Everything is saved to a shared Google Sheet, so every person sees the same up-to-date information.</p>
  <div class="row" style="margin:14px 0">${[['judges','For judges'],['auditors','For auditors'],['admin','For the administrator'],['criteria','Criteria and scale'],['trouble','Troubleshooting']].map(c=>`<button class="btn chipbtn" data-go="h-${c[0]}">${c[1]}</button>`).join('')}</div>
  <div class="grid g2" style="align-items:start"><div class="grid">
  ${sec('judges','For judges','<b>Signing in</b>'+ol(['Open the scoring page.','Choose your name from the drop-down list.','Type your personal code and press Sign in.','On your first sign-in, read and tick the confidentiality declaration. You cannot score until you have done this.'])+'<b>Scoring a nominee</b>'+ol(['Pick a nominee from the list. Read the nomination details and open the PoE: the PDF opens in a new tab, and “Open the PoE folder” shows everything else they submitted.','Declare whether you have a conflict of interest. If you do, choose the recusal option and do not score the nominee. Otherwise give each of the six criteria a whole number from 1 to 5; the guidance for each is shown beside it.','Write your reasons for the scores in the one box, with reference to the evidence.','Tick the sign-off: you assessed the nomination impartially, with no conflict of interest, on the submitted and verified evidence.','Press Save. A confirmation appears when it is stored.'])+'<div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, do not score them. Tell the administrator.</div>')}
  ${sec('auditors','For auditors',ol(['Choose your name from the Auditor drop-down, enter your code and sign in.','Open the Results tab to see every nominee’s scores, each judge’s reasons, and the flags.','Use the Declarations tab to check that confidentiality and impartiality sign-offs are recorded.','Use the Moderation tab to view the final moderation report.'])+'<p class="sub">Auditor access is read-only. If a figure looks wrong, tell the administrator; you cannot edit it.</p>')}
  ${sec('admin','For the administrator',row('Nominees:','add them one by one or import them in bulk. Use Attach PoE to link a PDF or the nominee’s Drive folder, and tick “Only nominees without a PoE” to see who is still missing.')+row('Judges and auditors:','keep the names and codes in the Google Sheet. Codes are generated by the sheet’s setup tools and can be reset there.')+row('Settings:','number of judges required, the spread limit, and whether scoring is open. Closing scoring stops every judge from scoring or recusing.')+row('Moderation:','after judging, record strengths, evidence, achievements and the outcome per nominee for the final report.')+row('Export:','download the results as a CSV file, which opens in Excel.')+row('Clear:','wipes scores, declarations and moderation notes. Use it only for a fresh start.'))}</div>
  <div class="grid"><section class="card" style="margin-top:0"><h2>Who can do what</h2>${row('Judge','<small class="sub">(Panel member)</small><br>See the nominees, read their details, score them and give reasons. You see only your own scores.')}${row('Auditor','<small class="sub">(Legal Services / Internal Audit)</small><br>Read-only access to the full results, reasons, declarations and moderation report. Auditors cannot score or change anything.')}${row('Administrator','<small class="sub">(Awards secretariat)</small><br>Manages nominees, judges, settings and the final report. Signs in with the admin PIN.')}</section>
  ${sec('criteria','The criteria and scale',CRIT.map(c=>`<div class="def row between"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('')+'<table class="scale" style="border:0;margin-top:10px">'+SCALE.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')+'</table><p class="sub" style="font-size:14px">The total is out of 100: all 3s give 60, all 4s give 80, all 5s give 100.</p>')}
  <section class="card" style="margin-top:0"><h2>How totals become recognition</h2>${[['90 and above',0],['80 to 89',1],['70 to 79',2],['Below 70',3]].map(r=>`<div class="def row between"><span class="sub">${r[0]}</span><b>${OUTCOMES[r[1]]}</b></div>`).join('')}<p style="margin-top:10px"><b>Awaiting judges</b> means fewer than the required number of judges (three) have scored that nominee, so no final result is shown yet.</p><p><b>Spread flag:</b> if judges’ totals differ by more than the set limit (default 15 points), the nominee is flagged for the panel to discuss and moderate.</p></section>
  ${sec('trouble','Good to know and troubleshooting',row('Automatic update:','the page checks the sheet quietly in the background every 2 minutes. It never reloads while you are scoring, typing or editing, and it only redraws a list when something has changed.')+row('Switching users:','sign out first on a shared computer.')+row('Lockout:','after 10 wrong codes for one name, that name is locked for 15 minutes.')+row('Names are not case-sensitive;','spaces and punctuation are ignored.')+'<h2 style="margin-top:18px">Troubleshooting</h2>'+[['Code not accepted','Check that you chose your own name, then retype the code carefully. If it still fails, ask the administrator to confirm or reset it.'],['Too many attempts','Wait 15 minutes, or ask the administrator to unlock your name.'],['Name missing from the list','Ask the administrator to add you in the sheet.'],['Scores not showing for others','Wait for the 2-minute refresh, or reload the page.'],['Page will not load','Check your internet connection, then reload.']].map(r=>`<div class="def trow"><b>${r[0]}</b><span>${r[1]}</span></div>`).join(''))}</div></div>
  ${S.role==='admin'||S.role==='auditor'?'':'<p><button class="lnk" id="bk">← Back</button></p>'}`;
};
document.addEventListener('click',e=>{ const g=e.target.dataset?.go; if(g) document.getElementById(g)?.scrollIntoView({behavior:'smooth'}); });
// ---- settings ----
bindSettings = function(){
  const o=S.d.settings, keepNums=()=>{ o.judges=+$('#sj').value||o.judges; o.spread=+$('#ss').value||o.spread };
  $('#so').onclick=()=>{keepNums();o.open=true;render()}; $('#sc').onclick=()=>{keepNums();o.open=false;render()};
  $('#ssave').onclick=async()=>{ const j=+$('#sj').value, sp=+$('#ss').value; if(!(j>=1)||!(sp>=1)) return $('#err').textContent='Enter whole numbers of 1 or more.';
    try{ if(live()){ await post({action:'settings',pin:S.cred,max:5,judges:j,qualify:70,spread:sp,open:o.open!==false,judgeList:S.d.judgeNames}); await load(); } else { o.judges=j; o.spread=sp }
      toast('Settings saved. Scoring is '+(o.open===false?'closed':'open')+' for every judge.'); render(); }catch(e){ $('#err').textContent=e.message } };
  $('#sdis').onclick=async()=>{ if(live()) await load(); render(); toast('Changes discarded.') };
  $('#sx').onclick=exportCsv; $('#sheet').onclick=()=>CONFIG.sheetUrl?open(CONFIG.sheetUrl,'_blank','noopener'):toast('Set CONFIG.sheetUrl in app.js to link the sheet.');
  $('#clr').onclick=async()=>{ if(prompt('Type CLEAR to wipe all scores, declarations and notes.')!=='CLEAR') return;
    try{ if(live()){await post({action:'clear',pin:S.cred});await load()} else {S.d.scores=[];S.d.declarations=[];S.d.moderation=[]} toast('Data cleared.'); render(); }catch(e){toast(e.message)} };
};

// ---- results: category totals, the selected nominee's details and PoE, and the audit trail ----
const results0 = resultsPage;
resultsPage = function(){
  const nm=id=>(S.d.nominees.find(n=>String(n.id)===String(id))||{}).name||id, byDate=(a,b)=>String(b.date).localeCompare(String(a.date));
  const tbl=(h,r)=>r.length?`<div class="tw" style="max-height:420px;overflow:auto"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.join('')}</table></div>`:'<p class="sub">None recorded.</p>';
  const rn=S.rn&&S.d.nominees.find(n=>n.id===S.rn), gone=rn?(S.d.recusals||[]).filter(r=>String(r.nomineeId)===String(rn.id)).map(r=>r.judge):[];
  return results0().replace('<div class="grid g5">',catTable([['Fully scored',ns=>ns.filter(n=>!result(n).wait).length+' of '+ns.length]]).replace('class="card tw" style="margin:0"','class="card tw" style="margin:0 0 16px"')+'<div class="grid g5">')
  +(rn?`<section class="card"><h2>Nomination details and PoE: ${esc(rn.name)}</h2>${gone.length?`<p><b>Recused:</b> ${gone.map(esc).join(', ')}</p>`:''}<div class="dp" data-id="${esc(rn.id)}"><p class="sub">Loading...</p></div></section>`:'')
  +`<section class="card"><h2>Audit trail</h2><p class="sub">Every change to a submitted score and every conflict of interest declared. Signed declarations are on the Declarations tab.</p>
  <h3 style="margin:14px 0 6px">Changes to submitted scores (${(S.d.log||[]).length})</h3>${tbl(['Date','Nominee','Judge','Old %','New %','Reason'],[...(S.d.log||[])].sort(byDate).map(l=>`<tr><td>${esc(String(l.date).slice(0,16))}</td><td>${esc(nm(l.nomineeId))}</td><td>${esc(l.judge)}</td><td>${esc(l.oldTotal)}</td><td>${esc(l.newTotal)}</td><td>${esc(l.reason)}</td></tr>`))}
  <h3 style="margin:18px 0 6px">Conflicts of interest declared (${(S.d.recusals||[]).length})</h3>${tbl(['Date','Nominee','Judge'],[...(S.d.recusals||[])].sort(byDate).map(r=>`<tr><td>${esc(String(r.date).slice(0,16))}</td><td>${esc(nm(r.nomineeId))}</td><td>${esc(r.judge)}</td></tr>`))}</section>`;
};

// ---- after every draw: fill the PoE/details panels, and never lose what is typed in the nominee form ----
const render0 = render;
render = function(){
  const ids=['nn','nc','nk','ni',...EXTRA_F.map(f=>'x_'+f[0])], held={};
  const formUp=S.role==='admin'&&S.tab==='Nominees'&&$('#xd'); const hadEdit=S.edit||'';
  if(formUp) ids.forEach(i=>{ const el=$('#'+i); if(el) held[i]=el.value });
  render0();
  if(formUp&&!S.fresh&&$('#xd')&&(S.edit||'')===hadEdit) ids.forEach(i=>{ const el=$('#'+i); if(el&&held[i]!==undefined) el.value=held[i] });
  S.fresh=false;
  if(S.role&&live()){ try{ sessionStorage.setItem('tvet.session',JSON.stringify({role:S.role,name:S.name,cred:S.cred,mode:S.mode,tab:S.tab})) }catch(e){} }
  document.querySelectorAll('.dp').forEach(async el=>{ try{ const f=await detail(el.dataset.id); if(el.isConnected) el.innerHTML=poeBlock(f)+'<div style="margin-top:16px"></div>'+detailCards(f) }catch(e){ if(el.isConnected) el.innerHTML='<p class="err">Could not load: '+esc(e.message)+'</p>' } });
  if(S.role==='admin'&&S.tab==='Nominees'&&S.edit&&S.xl!==S.edit&&$('#xd')){ const id=S.edit;
    detail(id).then(f=>{ if(S.edit!==id||!$('#xd')) return; EXTRA_F.forEach(([k])=>{ const el=$('#x_'+k); if(el) el.value=f[k]||'' }); S.xl=id }).catch(()=>{}); }
};
