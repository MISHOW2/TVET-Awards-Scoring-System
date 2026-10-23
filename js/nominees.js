// Nominee register: add, edit, delete.

// ---------- nominees ----------
// renderNominees() lives in the original script above, outside this block, so this
// has to be a genuine global rather than a let inside the closure.
window.editingNominee=null;   // the id being edited, or null when adding

window.editNominee=id=>{
 const n=data.nominees.find(x=>String(x.id)===String(id));
 if(!n)return alert("That nominee is no longer on the register.");
 editingNominee=String(n.id);
 $('nName').value=n.name;$('nCollege').value=n.college;$('nCategory').value=n.cat;$('nId').value=n.id;
 $('nId').readOnly=true;
 $('saveNomineeBtn').textContent="Update Nominee";
 $('cancelEditNominee').style.display="";
 const note=$('nomineeFormNote');
 note.style.display="";note.innerHTML="<b>Editing "+escHTML(n.name)+"</b> ("+escHTML(n.id)+"). Saving changes this entry rather than adding a new one. Their scores are kept.";
 $('nName').focus();$('nName').select();
 window.scrollTo(0,0);
};
window.cancelNomineeEdit=()=>{
 editingNominee=null;
 $('nName').value="";$('nCollege').value="";$('nId').value="";$('nId').readOnly=false;
 $('saveNomineeBtn').textContent="Save Nominee";
 $('cancelEditNominee').style.display="none";
 $('nomineeFormNote').style.display="none";
 renderNominees();
};
window.addNominee=run(async()=>{
 const name=$('nName').value.trim(),college=$('nCollege').value,cat=+$('nCategory').value;
 if(!name||!college)return alert("Please enter the nominee name and choose a college.");
 const taken=new Set(data.nominees.map(x=>String(x.id)));
 let id=$('nId').value.trim();
 if(editingNominee){
  id=editingNominee;
 } else {
  if(id&&taken.has(id))return alert("Nomination ID "+id+" is already used. Choose another or leave it blank.");
  const clash=data.nominees.find(x=>loose(x.name)===loose(name)&&loose(x.college)===loose(college)&&x.cat===cat);
  if(clash&&!confirm(name+" from "+college+" is already on the register in this category as "+clash.id+". Add them again anyway?"))return;
  if(!id)id=nextId(taken);
 }
 busy(editingNominee?"Updating the nominee...":"Adding the nominee...");
 try{ await api("nominee",{id,name,college,cat,catName:categories[cat][0],extra:collectExtra()},true);detailCache={}; } finally { busy(false) }
 const wasEdit=editingNominee;
 cancelNomineeEdit();
 await refresh();
 alert(wasEdit?"Nominee updated.":"Nominee added.");
});
// Search box and "only without a PoE" filter above the nominee list.
$('nomineeList').insertAdjacentHTML("beforebegin",'<div id="nomSearchBar" class="nsearch" style="display:none"><input id="nomSearch" type="search" placeholder="Search by name, college, ID or award" autocomplete="off" aria-label="Search nominees"><label class="nonly"><input type="checkbox" id="nomNoPoe"> Only nominees without a PoE</label><button class="btn" id="nomClear" type="button">Clear</button></div>');
$('nomSearch').oninput=()=>{nomFilter.q=$('nomSearch').value;renderNominees()};
$('nomNoPoe').onchange=()=>{nomFilter.noPoe=$('nomNoPoe').checked;renderNominees()};
$('nomClear').onclick=()=>{nomFilter.q="";nomFilter.noPoe=false;$('nomSearch').value="";$('nomNoPoe').checked=false;renderNominees();$('nomSearch').focus()};
{const base=window.renderNominees;window.renderNominees=function(){base();$('nomSearchBar').style.display=((PIN||data.me)&&(data.nominees||[]).length)?"":"none"}}
// Attach, replace or remove one nominee's PoE without opening the whole edit form.
window.attachPoe=run(async id=>{
 const n=data.nominees.find(x=>String(x.id)===String(id));
 if(!n)return alert("That nominee is no longer on the register. Refreshing.");
 const v=prompt("Paste the Google Drive link (or file ID) of the PoE PDF for "+n.name+".\n\nLeave it empty and press OK to remove the current PoE.","");
 if(v===null)return;
 const link=v.trim();
 busy(link?"Linking the PoE...":"Removing the PoE...");
 try{await api("setPoe",{id:String(id),poe:link},true);detailCache={};}finally{busy(false)}
 await refresh();
 alert(link?"PoE linked to "+n.name+".":"PoE removed from "+n.name+".");
 const s=$('nomSearch');if(s){s.focus();s.select()}   // ready to search for the next person
});
// Identify the nominee by id, not by row position.
window.deleteNominee=run(async id=>{
 const n=data.nominees.find(x=>x.id===id);
 if(!n)return alert("That nominee is no longer on the register. Refreshing.");
 if(!confirm("Delete "+n.name+" and their scores?"))return;
 await api("deleteNominee",{id},true);await refresh();
});
