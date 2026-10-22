// Audit trail (administrator and auditors) and read-only auditor behaviour.

// ---------- audit trail (administrator and auditors) ----------
function auditHTML(){
 const nom=id=>(data.nominees||[]).find(x=>String(x.id)===String(id));
 const nm=id=>{const n=nom(id);return n?n.name:id};
 const byDate=(a,b)=>String(b.date).localeCompare(String(a.date));
 const lg=[...(data.log||[])].sort(byDate),rc=[...(data.recusals||[])].sort(byDate);
 const max=data.settings.max,lo=max<=10?1:0;
 const reasons=txt=>{const m={};String(txt||"").split("\n").forEach(l=>{const x=l.match(/^\[(.*?)\] (.*)$/);if(x)m[x[1]]=x[2]});return m};
 const tbl=(h,r)=>r.length?'<div class="tablewrap" style="max-height:420px"><table><tr>'+h.map(x=>'<th>'+x+'</th>').join('')+'</tr>'+r.join('')+'</table></div>':'<p class="muted">None recorded.</p>';
 const byNom={};(data.scores||[]).forEach(s=>(byNom[s.nomineeId]=byNom[s.nomineeId]||[]).push(s));
 const ids=Object.keys(byNom).sort((a,b)=>{const x=nom(a),y=nom(b);return ((x?x.cat:99)-(y?y.cat:99))||String(nm(a)).localeCompare(String(nm(b)))});
 const cards=ids.map(id=>{
  const n=nom(id),crit=n&&categories[n.cat]?categories[n.cat][1]:[],ss=byNom[id].sort((a,b)=>String(a.judge).localeCompare(String(b.judge)));
  const avg=ss.reduce((t,s)=>t+(+s.total),0)/ss.length;
  const judges=ss.map(s=>{
   const rs=reasons(s.comments);
   const rows=crit.length?crit.map((c,i)=>{const [cn,w]=c.split("|");return '<tr><td><b>'+escHTML(cn)+'</b><div class="muted">weight '+escHTML(w)+'%</div></td><td class="sc">'+escHTML((s.values||[])[i]??"-")+' / '+max+'</td><td>'+(rs[cn]?escHTML(rs[cn]):'<span class="muted">No reason recorded</span>')+'</td></tr>'}).join(""):
    '<tr><td colspan="3">'+escHTML(s.comments||"")+'</td></tr>';
   return '<div class="aud-j"><div class="aud-jh"><b>'+escHTML(s.judge)+'</b><span>Total <b>'+(+s.total).toFixed(2)+'%</b> &middot; submitted '+escHTML(s.date)+'</span></div>'+
    '<table class="aud-t"><thead><tr><th style="width:28%">Criterion</th><th style="width:12%">Score</th><th>Written reason</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }).join("");
  return '<details class="aud-n" data-id="'+escHTML(id)+'"><summary><div>'+escHTML(nm(id))+'<small>'+escHTML(n?n.college:"")+' &middot; '+escHTML(n&&categories[n.cat]?categories[n.cat][0]:"")+'</small></div><span class="aud-chip">'+ss.length+' judge'+(ss.length===1?'':'s')+' &middot; average '+avg.toFixed(2)+'%</span></summary>'+judges+modHTML(id,avg,ss.length>=data.settings.judges)+'</details>';
 }).join("");
 return '<div style="margin-top:26px"><h3 style="margin:0 0 4px;color:#0b1f3a">Audit trail</h3><p class="muted" style="margin:0 0 6px">Every score sheet with the judge\'s written reasons, every change to a submitted score, and every conflict declared. Open a nominee to read the reasons.</p>'+
  '<h4 style="margin:16px 0 4px">Score sheets by nominee ('+(data.scores||[]).length+' sheets)</h4>'+(cards||'<p class="muted">None recorded.</p>')+
  '<h4 style="margin:22px 0 4px">Changes to submitted scores ('+lg.length+')</h4>'+tbl(['Date','Nominee','Judge','Old %','New %','Reason'],lg.map(l=>'<tr><td>'+escHTML(l.date)+'</td><td>'+escHTML(nm(l.nomineeId))+'</td><td>'+escHTML(l.judge)+'</td><td>'+escHTML(l.oldTotal)+'</td><td>'+escHTML(l.newTotal)+'</td><td>'+escHTML(l.reason)+'</td></tr>'))+
  '<h4 style="margin:22px 0 4px">Declarations signed ('+(data.declarations||[]).length+')</h4>'+tbl(['Date','Person','Declaration','Nominee'],[...(data.declarations||[])].sort(byDate).map(d=>'<tr><td>'+escHTML(d.date)+'</td><td>'+escHTML(d.person)+'</td><td>'+escHTML(d.type)+'</td><td>'+escHTML(d.nomineeId?nm(d.nomineeId):'-')+'</td></tr>'))+
  '<h4 style="margin:22px 0 4px">Conflicts of interest declared ('+rc.length+')</h4>'+tbl(['Date','Nominee','Judge'],rc.map(r=>'<tr><td>'+escHTML(r.date)+'</td><td>'+escHTML(nm(r.nomineeId))+'</td><td>'+escHTML(r.judge)+'</td></tr>'))+
  '</div>';
}
const resultsBase=window.renderResults;
window.renderResults=function(){
 const openIds=[...document.querySelectorAll('.aud-n[open]')].map(d=>d.dataset.id);
 resultsBase();
 if(PIN||data.role==="auditor"){$('resultsTable').insertAdjacentHTML('beforeend',auditHTML());
  document.querySelectorAll('.aud-n').forEach(d=>{if(openIds.includes(d.dataset.id))d.open=true})}
};
// Auditors are read-only: hide every control that writes, and the scoring form.
const loadFormJudge=window.loadScoreForm;
window.loadScoreForm=function(){
 if(data.role==="auditor"){$('scoreForm').innerHTML='<div class="notice">Auditor access is read-only. Scores are captured by the judges.</div>';return}
 if(data.me&&data.role==="judge"&&data.confirmed===false&&$('scoreNominee').value){$('scoreForm').innerHTML=confGateHTML();return}
 loadFormJudge();
};
const updateAuditorBase=window.updateAll;
window.updateAll=function(){
 updateAuditorBase();
 const aud=data.role==="auditor";
 renderHelpExtra();
 document.querySelectorAll('#results .actions .red,#nomineeList [data-edit],#nomineeList [data-del]').forEach(b=>b.style.display=aud?'none':'');
 if(aud&&$('scoreNominee').value)loadScoreForm();
};
