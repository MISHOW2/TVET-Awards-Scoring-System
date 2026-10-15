// Judge panel management (administrator).

// ---------- judges ----------
// Scores are filed under the judge's name, so a rename has to move every row that
// judge has already submitted. Doing it by hand in the list below would orphan them.
function renderJudgePanel(){
 const el=$('judgePanel');if(!el)return;
 if(!PIN){el.innerHTML='<div class="empty">The panel is confidential. Enter the admin PIN to see and manage it.<br><br><button class="btn gold" onclick="unlock()">Unlock (admin)</button></div>';return}
 const list=data.judges||[];
 const sheets=j=>(data.scores||[]).filter(s=>s.judge===j).length;
 el.innerHTML=(list.length?'<div class="tablewrap"><table><tr><th>Judge</th><th>Sheets in</th><th></th></tr>'+
  list.map(j=>`<tr><td><b>${escHTML(j)}</b></td><td>${sheets(j)}</td><td><button class="btn" data-rename="${escHTML(j)}">Rename</button> <button class="btn red" data-dropj="${escHTML(j)}">Remove</button></td></tr>`).join("")+
  '</table></div>':'<div class="empty">No judges yet. Add the first one below.</div>')+
  '<div class="actions" style="margin-top:12px"><input id="newJudge" placeholder="Name of the judge to add" style="max-width:280px"> <button class="btn green" id="addJudgeBtn">Add judge</button></div>';
 el.querySelectorAll("[data-rename]").forEach(b=>b.onclick=()=>renameJudge(b.dataset.rename));
 el.querySelectorAll("[data-dropj]").forEach(b=>b.onclick=()=>removeJudge(b.dataset.dropj));
 const add=$('addJudgeBtn');if(add)add.onclick=()=>addJudge();
}
async function saveJudgeList(list,label){
 busy(label||"Saving the judge list...");
 try{
  await api("settings",{max:data.settings.max,judges:data.settings.judges,qualify:data.settings.qualify??70,
   spread:data.settings.spread??15,judgeList:list,newPin:""},true);
 } finally { busy(false) }
 await refresh();
}
window.addJudge=run(async()=>{
 const name=norm(($('newJudge')||{}).value);
 if(!name)return alert("Type the judge's name first.");
 if((data.judges||[]).some(j=>loose(j)===loose(name)))return alert(name+" is already on the panel.");
 await saveJudgeList([...(data.judges||[]),name],"Adding the judge...");
 alert(name+" added. Give them their personal code separately, it is set in the sheet.");
});
window.renameJudge=run(async old=>{
 // Scores are filed under the judge's name and the sheet has no way to delete or
 // re-key a submitted row: writing it under a new name leaves the old one behind,
 // and the nominee is then counted twice. So a rename is only safe before they score.
 const mine=(data.scores||[]).filter(s=>s.judge===old).length;
 if(mine) return alert(old+" has already submitted "+mine+" sheet"+(mine===1?"":"s")+".\n\nRenaming them now would leave "+(mine===1?"that sheet":"those sheets")+" filed under the old name and count the nominee twice. Correct the spelling in the Google Sheet itself, where the scores can be re-filed at the same time.");
 const name=norm(prompt("New name for "+old+":",old)||"");
 if(!name||name===old)return;
 if((data.judges||[]).some(j=>loose(j)===loose(name)&&j!==old))return alert(name+" is already on the panel.");
 await saveJudgeList((data.judges||[]).map(j=>j===old?name:j),"Renaming the judge...");
 alert(name+" renamed. Give them their personal code if it has changed.");
});
window.removeJudge=run(async name=>{
 const mine=(data.scores||[]).filter(s=>s.judge===name).length;
 if(mine)return alert(name+" has "+mine+" submitted sheet"+(mine===1?"":"s")+". Removing them would leave "+(mine===1?"it":"them")+" filed under a judge who is no longer on the panel. Rename them instead, or clear their scores first.");
 if(!confirm("Remove "+name+" from the panel?"))return;
 await saveJudgeList((data.judges||[]).filter(j=>j!==name),"Removing the judge...");
 alert(name+" removed.");
});
