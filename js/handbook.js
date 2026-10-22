// Adjudicator Handbook features: rubrics, declarations, moderation report, help extras.

// ---------- Adjudicator Handbook content: rubrics, guidance, declarations, moderation ----------

// Under every criterion: the descriptor for the score typed, plus what to look for.
function decorateRubric(n){
 if(data.settings.max!==5)return;
 const crit=categories[n.cat][1];
 crit.forEach((_,i)=>{
  const inp=$('sc'+i),box=inp&&inp.closest('.criteria'),R=RUBRIC[i];if(!box||!R)return;
  box.querySelector('.criterion-row').insertAdjacentHTML('afterend','<div id="rub'+i+'" class="rub-line"></div>');
  box.insertAdjacentHTML('beforeend','<details class="rub-more"><summary>What to look for, guiding questions and full rubric</summary>'+
   '<p><b>Focus:</b> '+escHTML(R.focus)+'</p><p><b>Consider</b></p><ul>'+R.consider.map(x=>'<li>'+escHTML(x)+'</li>').join('')+'</ul>'+
   '<p><b>Guiding questions</b></p><ul>'+R.questions.map(x=>'<li>'+escHTML(x)+'</li>').join('')+'</ul>'+
   '<p><b>Rubric</b></p><table class="rub-tab">'+R.rubric.map((d,k)=>'<tr><td>'+(k+1)+'</td><td>'+escHTML(d)+'</td></tr>').join('')+'</table></details>');
  const show=()=>{const v=+inp.value,el=$('rub'+i);
   el.innerHTML=(inp.value!==''&&Number.isInteger(v)&&v>=1&&v<=5)?'<b>'+v+' &middot; '+SCALE[v-1][1]+':</b> '+escHTML(R.rubric[v-1]):'<span class="muted">Enter a score from 1 to 5 to see what it means for this criterion.</span>'};
  inp.addEventListener('input',show);show();
 });
 const first=document.querySelector('#coiBody .criteria');
 if(first)first.insertAdjacentHTML('beforebegin','<details class="ind-box"><summary>Cross-cutting indicators: apply these to all six criteria</summary><ul>'+INDICATORS.map(x=>'<li><b>'+escHTML(x[0])+':</b> '+escHTML(x[1])+'</li>').join('')+'</ul></details>');
}

// Handbook section 14: each judge accepts the confidentiality declaration once, before scoring.
window.ackConfidential=run(async()=>{
 if(!$('confTick').checked)throw new Error("Tick the box to accept the declaration.");
 await api("declare",{judge:data.me,code:($('judgeCode')||{}).value.trim(),type:"confidentiality"});
 await refresh();loadScoreForm();
});
function confGateHTML(){
 return '<div class="panel" style="margin-top:20px;border:2px solid #d4af37"><h3>Confidentiality declaration</h3><p>'+escHTML(CONF_TEXT)+'</p>'+
  '<label class="signoff"><input type="checkbox" id="confTick"><span>I, <b>'+escHTML(data.me)+'</b>, accept this declaration. It is recorded with the date and time.</span></label>'+
  '<div class="actions"><button class="btn green" onclick="ackConfidential()">Accept and continue</button></div></div>';
}

// Final Moderation Report (handbook section 12). The administrator writes it; auditors read it.
let modDirty=false;
function modHTML(id,avg,done){
 const m=(data.moderation||[]).find(x=>String(x.nomineeId)===String(id))||{};
 const band=bandOf(avg),differs=m.outcome&&done&&String(m.outcome).toLowerCase()!==band.toLowerCase();
 const head='<div class="mod-box"><h4>Final moderation report</h4><p class="muted" style="margin:0 0 10px">Score-based outcome: <b>'+escHTML(band)+'</b>'+(done?'':' (provisional, awaiting judges)')+'</p>';
 if(PIN){
  const fld=(k,label)=>'<label>'+label+'</label><textarea class="mod-'+k+'">'+escHTML(m[k]||'')+'</textarea>';
  return head+'<div class="mod-form" data-id="'+escHTML(id)+'">'+fld('strengths','Overall strengths')+fld('evidence','Evidence supporting recommendation')+fld('achievements','Significant achievements')+
   '<label>Recommended outcome</label><select class="mod-outcome"><option value="">-- Select --</option>'+BANDS.map(b=>'<option'+(m.outcome===b[1]?' selected':'')+'>'+escHTML(b[1])+'</option>').join('')+'</select>'+
   (differs?'<span class="flag-diff">Differs from the score-based outcome</span>':'')+
   '<div class="actions"><button class="btn green" onclick="saveModeration(this)">Save report</button></div>'+(m.date?'<p class="muted">Last saved '+escHTML(m.date)+'</p>':'')+'</div></div>';
 }
 const v=(k,l)=>'<b>'+l+'</b><p>'+(m[k]?escHTML(m[k]):'<span class="muted">Not completed</span>')+'</p>';
 return head+'<div class="mod-view">'+v('strengths','Overall strengths')+v('evidence','Evidence supporting recommendation')+v('achievements','Significant achievements')+
  '<b>Recommended outcome</b><p>'+(m.outcome?escHTML(m.outcome):'<span class="muted">Not completed</span>')+(differs?'<span class="flag-diff">Differs from the score-based outcome</span>':'')+'</p></div></div>';
}
window.saveModeration=run(async btn=>{
 const f=btn.closest('.mod-form'),g=k=>f.querySelector('.mod-'+k).value.trim();
 await api("moderation",{id:f.dataset.id,strengths:g('strengths'),evidence:g('evidence'),achievements:g('achievements'),outcome:g('outcome')},true);
 modDirty=false;await refresh();alert("Moderation report saved.");
});
$('resultsTable').addEventListener('input',e=>{if(e.target.closest&&e.target.closest('.mod-form'))modDirty=true});

// Help page: the handbook's process stages and evidence guide.
function renderHelpExtra(){
 const hb=$('helpBody');if(!hb)return;
 let x=$('helpExtra');if(!x){x=document.createElement('div');x.id='helpExtra';hb.after(x)}
 if(x.dataset.done)return;x.dataset.done="1";
 x.innerHTML='<div class="panel"><h3>Adjudication process</h3><div class="tablewrap" style="max-height:none"><table><tr><th>Stage</th><th>Activity</th><th>Outcome</th></tr>'+STAGES.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+escHTML(r[1])+'</td><td>'+escHTML(r[2])+'</td></tr>').join('')+'</table></div></div>'+
  '<div class="panel"><h3>Evidence review guide</h3><p class="muted">Review all submitted evidence before assigning scores. Judge evidence and demonstrated impact, not reputation, status or institutional profile.</p>'+
  EVIDENCE.map(e=>'<details class="rub-more"><summary>'+escHTML(e[0])+'</summary><p><b>Review:</b> '+escHTML(e[1])+'</p><p><b>Verification sources:</b> '+escHTML(e[2])+'</p></details>').join('')+'</div>'+
  '<div class="panel"><h3>Cross-cutting judging indicators</h3><p class="muted">These inform scoring across all six criteria.</p><div class="tablewrap" style="max-height:none"><table><tr><th>Indicator</th><th>Key question for judges</th></tr>'+INDICATORS.map(r=>'<tr><td><b>'+escHTML(r[0])+'</b></td><td>'+escHTML(r[1])+'</td></tr>').join('')+'</table></div></div>';
}
