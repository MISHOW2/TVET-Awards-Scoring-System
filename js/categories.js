// Nominees by award category: totals on the dashboard and category-first picking on the scoring page.
// (The grouped nominee list for the administrator is drawn in core.js and filtered in nominees.js.)

const catCount=(list,i)=>(list||[]).filter(n=>n.cat===i).length;

// ---------- dashboard: how many nominees are in each category ----------
// Names stay private: a visitor is told only the overall total, and signs in to see the split.
function renderCategoryTotals(){
 const t=document.getElementById("categoryTable");if(!t)return;
 const list=data.nominees||[],full=!!PIN||data.role==="auditor",judge=!full&&!!data.me&&data.role==="judge";
 if(!list.length){
  t.innerHTML='<tr><th>Category</th><th>Criteria</th></tr>'+categories.map(c=>'<tr><td>'+escHTML(c[0])+'</td><td>'+c[1].map(x=>x.split("|")[0]+" ("+x.split("|")[1]+"%)").join(", ")+'</td></tr>').join("")+
   (data.count?'<tr><td colspan="2" class="muted">'+data.count+' nominees have been entered. Sign in to see how many are in each category.</td></tr>':'');
  return;
 }
 const mine=new Set(),gone=new Set();
 if(judge){(data.scores||[]).forEach(s=>{if(s.judge===data.me)mine.add(String(s.nomineeId))});(data.recusals||[]).forEach(r=>{if(r.judge===data.me)gone.add(String(r.nomineeId))})}
 const extraHead=full?'<th class="num">With a PoE</th>':judge?'<th class="num">Done by you</th>':'';
 const extra=ns=>full?'<td class="num">'+ns.filter(n=>n.poe).length+' / '+ns.length+'</td>':judge?'<td class="num">'+ns.filter(n=>mine.has(String(n.id))||gone.has(String(n.id))).length+' / '+ns.length+'</td>':'';
 let rows='';
 categories.forEach((c,i)=>{const ns=list.filter(n=>n.cat===i);
  rows+='<tr><td>'+escHTML(c[0])+'</td><td class="num"><b>'+ns.length+'</b></td>'+extra(ns)+'<td>'+c[1].map(x=>x.split("|")[0]+" ("+x.split("|")[1]+"%)").join(", ")+'</td></tr>'});
 rows+='<tr class="total"><td>All categories</td><td class="num">'+list.length+'</td>'+extra(list)+'<td></td></tr>';
 t.innerHTML='<tr><th>Category</th><th class="num">Nominees</th>'+extraHead+'<th>Criteria</th></tr>'+rows;
}
const updateAllBase=window.updateAll;
window.updateAll=function(){updateAllBase();renderCategoryTotals()};

// ---------- scoring page: pick the category first, then the nominee ----------
$('scoreNominee').previousElementSibling.insertAdjacentHTML("beforebegin",'<label for="scoreCategory">Award category</label><select id="scoreCategory" aria-label="Award category"></select>');
$('scoreNominee').insertAdjacentHTML("afterend",'<p class="muted" id="scoreHint"></p>');
$('scoreCategory').onchange=()=>{$('scoreNominee').value="";renderScoreSelect();loadScoreForm()};
window.renderScoreSelect=function(){
 const sel=$('scoreNominee'),cs=$('scoreCategory'),list=data.nominees||[],me=data.me||"";
 const done=new Set(),out=new Set();
 if(me){(data.scores||[]).forEach(s=>{if(s.judge===me)done.add(String(s.nomineeId))});(data.recusals||[]).forEach(r=>{if(r.judge===me)out.add(String(r.nomineeId))})}
 const prevCat=cs.value,prev=sel.value,mark=n=>done.has(String(n.id))?"\u2713 ":out.has(String(n.id))?"\u2717 ":"";
 cs.innerHTML='<option value="">All categories ('+list.length+')</option>'+categories.map((c,i)=>{
  const ns=list.filter(n=>n.cat===i),d=ns.filter(n=>done.has(String(n.id))||out.has(String(n.id))).length;
  return '<option value="'+i+'">'+escHTML(c[0])+' ('+ns.length+(me?', '+d+' done by you':'')+')</option>'}).join("");
 cs.value=prevCat;if(cs.value!==prevCat)cs.value="";
 const byName=(a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:"base"});
 const opt=n=>'<option value="'+escHTML(n.id)+'">'+mark(n)+escHTML(n.name)+' \u2014 '+escHTML(n.college)+'</option>';
 let html='<option value="">-- Select nominee --</option>';
 if(cs.value!==""){html+=list.filter(n=>String(n.cat)===cs.value).sort(byName).map(opt).join("")}
 else{categories.forEach((c,i)=>{const ns=list.filter(n=>n.cat===i).sort(byName);if(ns.length)html+='<optgroup label="'+escHTML(c[0])+' ('+ns.length+')">'+ns.map(opt).join("")+'</optgroup>'});
  const bad=list.filter(n=>!categories[n.cat]);if(bad.length)html+='<optgroup label="No valid award category">'+bad.sort(byName).map(opt).join("")+'</optgroup>'}
 sel.innerHTML=html;sel.value=prev;if(sel.value!==prev)sel.value="";
 $('scoreHint').textContent=me?"\u2713 you have scored this nominee   \u2717 you have recused yourself":"";
};
