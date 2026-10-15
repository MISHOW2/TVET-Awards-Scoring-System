// Results leaderboard (administrator and auditors) and the auditor sign-in.

// ---------- results (administrator and auditors) ----------
const auditorBox=()=>'<div style="max-width:340px;margin:18px auto 0;text-align:left"><b>Auditor sign-in</b><div class="muted" style="margin:2px 0 6px">Legal Services and Internal Audit reviewers (read-only).</div><select id="audName"><option value="">-- Select your name --</option>'+(data.auditorNames||[]).map(n=>'<option value="'+escHTML(n)+'">'+escHTML(n)+'</option>').join('')+'</select><input id="audCode" type="password" placeholder="Your code" autocomplete="new-password" style="margin-top:8px"><div class="actions"><button class="btn green" onclick="auditorSignIn()">Sign in as auditor</button></div></div>';
window.auditorSignIn=run(async()=>{
 const n=($('audName')||{}).value||"",c=($('audCode')||{}).value||"";
 if(!n.trim()||!c.trim())throw new Error("Choose your name and enter your code.");
 AUD={name:n.trim(),code:c.trim()};
 try{await refresh();if(data.role!=="auditor")throw new Error("Name or code not recognised.")}
 catch(e){AUD=null;data.me=undefined;data.role=undefined;throw e}
 updateAll();
});
window.renderResults=function(){
 const el=$('resultsTable');
 if(!PIN&&data.role!=="auditor"){el.innerHTML='<div class="empty">Results are visible to the administrator and to appointed auditors only.<br><br><button class="btn gold" onclick="unlock()">Unlock results (admin)</button>'+auditorBox()+'</div>';return}
 if(!data.scores.length){el.innerHTML='<div class="empty">No completed scores yet.</div>';return}
 const req=data.settings.judges;let rows=[];
 data.nominees.forEach(n=>{const ss=data.scores.filter(s=>s.nomineeId===n.id);if(!ss.length)return;
  const tot=ss.map(s=>s.total);
  rows.push({...n,avg:tot.reduce((a,b)=>a+b,0)/tot.length,count:ss.length,done:ss.length>=req,
   spread:tot.length>1?Math.max(...tot)-Math.min(...tot):0})});
 rows.sort((a,b)=>a.cat-b.cat||b.done-a.done||b.avg-a.avg);let last=-1,rk=0;
 el.innerHTML="<table><tr><th>Rank</th><th>Nominee</th><th>College</th><th>Category</th><th>Judges</th><th>Average</th><th>Status</th></tr>"+rows.map(r=>{
  if(r.cat!==last){last=r.cat;rk=0}
  const band=r.done?bandOf(r.avg):null;
  const spread=r.spread>=(data.settings.spread||15)?` <span class="badge" title="The judges are ${r.spread.toFixed(1)} points apart on this nominee" style="background:#fdecea;color:#c0392b">Wide spread ${r.spread.toFixed(1)}</span>`:"";
  return `<tr><td><span class="rank">${r.done?"#"+(++rk):"-"}</span></td><td><b>${escHTML(r.name)}</b>${spread}</td><td>${escHTML(r.college)}</td><td>${escHTML(categories[r.cat]?categories[r.cat][0]:"")}</td><td>${r.count}/${req}</td><td><b>${r.avg.toFixed(2)}%</b><div class="bar"><i style="width:${Math.min(100,r.avg)}%"></i></div></td><td><span class="badge"${r.done&&r.avg<70?' style="background:#fdecea;color:#c0392b"':r.done&&r.avg>=90?' style="background:#fdf6e3;color:#8a6d1a"':''}>${!r.done?"Awaiting judges":escHTML(band)}</span></td></tr>`}).join("")+"</table>";
};
window.clearScores=run(async()=>{
 if(!confirm("Clear ALL scoring records for EVERY judge? This cannot be undone."))return;
 await api("clear",{},true);await refresh();
});
