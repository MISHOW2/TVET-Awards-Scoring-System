// Judge scoring page: own submissions, conflict of interest, scoring form.

// ---------- what this judge has already done ----------
// A judge can reopen anything they have submitted and change it. The reason for the
// change is still required, and the old and new totals still go to the change log.
function renderMyScores(){
 const el=$('myScores');if(!el)return;
 const j=data.me||"";
 if(!j){el.innerHTML='<div class="empty">Sign in above to see your own scoring.</div>';return}
 const mine=(data.scores||[]).filter(s=>s.judge===j);
 const myRecusals=(data.recusals||[]).filter(r=>r.judge===j);
 const done=new Set(mine.map(s=>String(s.nomineeId)));
 const out=new Set(myRecusals.map(r=>String(r.nomineeId)));
 const todo=(data.nominees||[]).filter(n=>!done.has(String(n.id))&&!out.has(String(n.id)));
 el.innerHTML='<p class="muted">'+mine.length+' submitted &middot; '+myRecusals.length+' recused &middot; '+todo.length+' still to score.</p>'+
  (mine.length?'<div class="tablewrap"><table><tr><th>Nominee</th><th>Category</th><th>Your score</th><th></th></tr>'+
   mine.map(s=>{const n=(data.nominees||[]).find(x=>String(x.id)===String(s.nomineeId))||{};
    return `<tr><td><b>${escHTML(n.name||s.nomineeId)}</b><br><small>${escHTML(n.college||"")}</small></td>`+
     `<td>${escHTML(categories[n.cat]?categories[n.cat][0]:"")}</td>`+
     `<td><b>${Number(s.total).toFixed(2)}%</b></td>`+
     `<td><button class="btn" data-reopen="${escHTML(s.nomineeId)}">Open and change</button></td></tr>`}).join("")+
   '</table></div>':'<div class="empty">You have not submitted any scores yet.</div>')+
  (myRecusals.length?'<p class="muted" style="margin-top:12px">Recused from: '+myRecusals.map(r=>{
    const n=(data.nominees||[]).find(x=>String(x.id)===String(r.nomineeId))||{};return escHTML(n.name||r.nomineeId)}).join(", ")+'</p>':'')+
  (todo.length?'<p class="muted" style="margin-top:12px"><b>Still to score:</b> '+todo.map(n=>escHTML(n.name)).join(", ")+'</p>':
    (mine.length?'<div class="notice" style="margin-top:12px"><b>That is everyone.</b> You have scored or recused yourself from every nominee on the register.</div>':''));
 el.querySelectorAll("[data-reopen]").forEach(b=>b.onclick=()=>{
  $('scoreNominee').value=b.dataset.reopen;
  loadScoreForm();
  $('scoreForm').scrollIntoView({behavior:"smooth",block:"center"});
 });
}

// ---------- scoring form ----------
window.loadScoreForm=function(){
 const id=$('scoreNominee').value,n=data.nominees.find(x=>x.id===id),el=$('scoreForm'),j=data.me||"";
 if(!n){el.innerHTML="";return}
 if(!j){el.innerHTML='<div class="notice">Sign in with your name and code first.</div>';return}
 if(!categories[n.cat]){el.innerHTML='<div class="notice">This nominee has no valid award category on the register. Ask the organisers to correct it.</div>';return}
 const ex=data.scores.find(s=>s.nomineeId===id&&s.judge===j);
 el.innerHTML=`<h3 style="margin-top:25px">${escHTML(categories[n.cat][0])}</h3><label>Conflict of interest</label>
 <select id="coi"><option value="">-- Declare --</option><option value="none">I have NO conflict of interest with this nominee</option><option value="conflict">I HAVE a conflict - I recuse myself</option></select><div id="coiBody"></div>`;
 $('coi').onchange=()=>body(n,id,j,ex);
 if(ex){$('coi').value="none";body(n,id,j,ex)}
};
function body(n,id,j,ex){
 const c=$('coi').value,el=$('coiBody'),crit=categories[n.cat][1],max=data.settings.max;
 if(c==="conflict"){
  if(!confirm("Recuse yourself from this nominee? Any score you entered for them will be removed."))return;
  api("recusal",{nomineeId:id,judge:j,code:$('judgeCode').value.trim()}).then(refresh).catch(e=>alert(e.message));
  el.innerHTML='<div class="notice">Recusal recorded. You cannot score this nominee.</div>';return}
 if(c!=="none"){el.innerHTML="";return}
 const lo=max<=10?1:0,rs=parseR(ex&&ex.comments,crit);
 const reopened=ex?'<div class="notice" style="border-left-color:#8a6d1a;background:#fdf6e3"><b>You already scored '+escHTML(n.name)+' at '+Number(ex.total).toFixed(2)+'%.</b> Change what you need to and submit again. Your earlier scores are filled in below, and the change is recorded with your reason.</div>':"";
 const guide=max===5?'<div class="notice" style="margin-bottom:18px">'+SCALE.map(x=>"<b>"+x[0]+" "+x[1]+"</b> &middot; "+x[2]).join("<br>")+'</div>':"";
 el.innerHTML=reopened+guide+crit.map((x,i)=>{const [name,w]=x.split("|");return `<div class="criteria"><div class="criterion-row"><div><b>${escHTML(name)}</b><small style="display:block;color:#68758a">Weight: ${w}% | Score ${lo}-${max}${max<=10?" (whole numbers)":""}</small></div><input class="score-input" type="number" min="${lo}" max="${max}" step="${max<=10?1:"any"}" id="sc${i}" value="${ex?ex.values[i]:""}" placeholder="${lo}"><div>${w}%</div><div></div></div><input type="text" id="rs${i}" value="${esc(rs[i])}" placeholder="Written reason for this score (required)" style="margin-top:8px"></div>`}).join("")+
 (ex?`<label>Reason for changing your earlier scores (required)</label><textarea id="changeWhy"></textarea>`:"")+
 `<label class="signoff"><input type="checkbox" id="signoff"><span>${escHTML(SIGN_TEXT)}</span></label><div class="actions"><button class="btn green" onclick="submitScore('${escHTML(id)}')">${ex?"Update":"Submit"} Score</button></div><div id="liveTotal" class="total"></div>`;
 document.querySelectorAll(".score-input").forEach(i=>i.addEventListener("input",()=>live(n)));live(n);decorateRubric(n);
}
function live(n){const crit=categories[n.cat][1],vals=crit.map((_,i)=>+($('sc'+i)?.value||0));$('liveTotal').textContent="Current weighted score: "+pct(vals,crit,data.settings.max).toFixed(2)+"%"}

window.submitScore=run(async id=>{
 const n=data.nominees.find(x=>x.id===id),j=data.me||"",crit=categories[n.cat][1],max=data.settings.max;
 if(!j)return alert("Select your name.");
 if($('coi').value!=="none")return alert("Declare no conflict of interest before scoring.");
 if(!$('signoff')||!$('signoff').checked)return alert("Tick the sign-off declaration before submitting.");
 const lo=max<=10?1:0;
 const vals=crit.map((_,i)=>{const t=$('sc'+i).value,v=t===""?NaN:+t;return isNaN(v)||v<lo||v>max||(max<=10&&!Number.isInteger(v))?null:v});
 if(vals.includes(null))return alert("Enter a valid score ("+lo+"-"+max+(max<=10?", whole numbers":"")+") for every criterion.");
 const rs=crit.map((_,i)=>$('rs'+i).value.trim().replace(/\s+/g," "));
 if(rs.some(r=>r.length<5))return alert("Give a written reason for every criterion score.");
 const code=$('judgeCode').value.trim();if(!code)return alert("Enter your personal judge code.");
 const com=crit.map((c,i)=>"["+c.split("|")[0]+"] "+rs[i]).join("\n");
 const old=data.scores.find(s=>s.nomineeId===id&&s.judge===j),total=pct(vals,crit,max);let log=null;
 if(old){const why=$('changeWhy').value.trim();if(!why)return alert("State the reason for changing your earlier score.");
  log={date:new Date().toISOString(),nomineeId:id,judge:j,oldTotal:+old.total.toFixed(2),newTotal:+total.toFixed(2),reason:why}}
 await api("score",{rec:{nomineeId:id,judge:j,values:vals,total,coi:"none",comments:com,declare:true},log,code});
 await refresh();alert("Score saved to the shared record.");loadScoreForm();renderMyScores();
});
