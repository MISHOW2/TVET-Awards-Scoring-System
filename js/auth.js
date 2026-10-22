// Judge sign-in (name + code) and the admin PIN guard.

// ---------- judge sign-in ----------
// Judges now choose their name from a drop-down (names only, never codes) and type
// only their personal code. The sheet still returns nominees only for a valid
// name + code (or the admin PIN).
const sel=$('judgeName');
sel.onchange=()=>{
 AUD=null;data.role=undefined;data.me=undefined;if(!PIN){data.nominees=[];data.scores=[]}
 $('judgeCode').value="";$('scoreForm').innerHTML="";$('scoreNominee').value="";
 loginMsg("Now type your personal code and press Sign in.");updateAll();
};
sel.insertAdjacentHTML('afterend','<label>Your personal code</label><input id="judgeCode" type="password" autocomplete="new-password" placeholder="Code given to you by the organisers">'+
 '<div class="actions" style="margin-top:10px"><button class="btn green" id="judgeSignIn">Sign in</button></div><div id="loginMsg" class="muted" style="margin-top:8px">Choose your name from the list, type your code, then press Sign in to load the nominees.</div>');
function loginMsg(t,bad){const e=$('loginMsg');e.textContent=t;e.style.color=bad?"#c0392b":""}
window.judgeSignIn=async()=>{
 const j=sel.value.trim(),c=$('judgeCode').value.trim();
 if(!j||!c)return loginMsg("Choose your name and enter your personal code.",true);
 AUD=null;
 // An admin session would make the sheet ignore the judge's name and code, so sign the admin out first.
 const keepPin=PIN;PIN=null;
 try{await refresh();if(!data.me)throw new Error("Name or code not recognised.");
  sel.value=data.me;loginMsg("Signed in as "+data.me+".");if(!formInProgress())loadScoreForm();renderMyScores()}
 catch(e){PIN=keepPin;data.me=undefined;loginMsg(e.message,true)}
};
$('judgeSignIn').onclick=judgeSignIn;
$('judgeCode').onkeydown=e=>{if(e.key==="Enter")judgeSignIn()};
// Fill the drop-down from the names the sheet sends. The list is only rebuilt when it
// changes, so a refresh never wipes the judge's selection.
function fillJudges(){
 const names=data.judgeNames||[],sig=names.join("|"),cur=sel.value;
 if(sel.dataset.sig===sig)return;
 sel.dataset.sig=sig;
 sel.innerHTML='<option value="">-- Select your name --</option>'+names.map(n=>'<option value="'+escHTML(n)+'">'+escHTML(n)+'</option>').join("");
 sel.value=names.includes(cur)?cur:"";
}

// ---------- admin guard ----------
// The roster and judge list only exist in the page after the PIN is accepted. Anything that
// compares against them (duplicates, the judge list, settings) must load them first, or it would
// be working from an empty list and could overwrite the real one.
async function needAdmin(){
 if(PIN&&(data.judges||[]).length+(data.nominees||[]).length>0)return;
 if(!PIN){const p=prompt("Admin PIN:");if(!p)throw new Error("cancelled");PIN=p}
 try{await refresh()}catch(e){PIN=null;throw e}
}
const oldRenderNominees=window.renderNominees;
window.renderNominees=function(){
 if(!PIN&&!data.me){const c=data.count||0;$('nomineeList').innerHTML='<div class="empty"><b style="font-size:22px;color:#145da0">'+c+'</b> nominee'+(c===1?' has':'s have')+' been entered.<br>The names are private. Enter the admin PIN to see them.<br><br><button class="btn gold" onclick="unlock()">Unlock (admin)</button></div>';return}
 oldRenderNominees();
};
