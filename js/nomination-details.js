// Nomination details: the one-nominee details fetch, judge/admin views and the admin form fields.

// ---------- nomination details ----------
// Long nomination text is fetched one nominee at a time ("details" action), never sent with the
// list. The admin PIN sees every field; a judge (name + code) does not get contact details or
// who nominated the lecturer. That rule is enforced by the sheet, not by this page.
const DETAIL_GROUPS=[["About the nominee",["source","title","campus","department","designation","status","experience","province","focus","learners","employeeNo"]],["Nomination",["nominator","relationship","nominatorContact","nominationDate"]],["Contact details",["email","mobile"]],["Motivation and evidence",["motivation","why","impact","profile","philosophy","examples","evidence"]]];
const DETAIL_LONG=new Set(["motivation","why","impact","profile","philosophy","examples","evidence"]);
const DETAIL_LABEL=Object.fromEntries(EXTRA_FIELDS);
let detailCache={};
async function fetchDetails(id){
 const code=(AUD?AUD.code:(($('judgeCode')||{}).value||"")).trim(),key=(PIN?"A|":"J|"+(data.me||"")+"|"+code+"|")+id;
 if(detailCache[key])return detailCache[key];
 const body={action:"details",id:String(id)};
 if(PIN)body.pin=PIN;else{body.judge=data.me;body.code=code}
 const r=await fetch(SHEET_URL,{method:"POST",body:JSON.stringify(body)}),d=await readJson(r);
 if(d.error){if(/PIN/.test(d.error))PIN=null;throw new Error(d.error)}
 return detailCache[key]=d.fields||{};
}
// The Portfolio of Evidence: a PDF kept in Google Drive. Only the Drive file ID is stored; the PDF is opened
// from Drive, so it is never copied into this page or the repo.
const POE_RE=/^[A-Za-z0-9_-]{20,}$/;
function poeHTML(f){
 const id=String(f.poe||"").trim();
 if(!POE_RE.test(id))return '<div class="poebox"><h4>Portfolio of Evidence (PDF)</h4><p class="muted">No PoE has been linked to this nominee yet. Ask the organisers before scoring.</p></div>';
 return '<div class="poebox"><h4>Portfolio of Evidence (PDF)</h4><button class="btn gold" data-poeview="'+escHTML(id)+'">View the PoE here</button> '+
  '<a class="btn" target="_blank" rel="noopener noreferrer" href="https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view">Open in a new tab</a>'+
  '<p class="muted" style="margin:8px 0 0">If Google asks you to sign in or says you need access, ask the organisers to share the file with you.</p><div class="poeframe"></div></div>';
}
// One delegated handler: the viewer is built only when asked for, so a 13 MB PDF is not loaded for every nominee.
document.addEventListener("click",e=>{
 const b=e.target.closest&&e.target.closest("[data-poeview]");if(!b)return;
 const id=b.dataset.poeview,box=b.parentElement.querySelector(".poeframe");if(!POE_RE.test(id)||!box)return;
 if(box.firstChild){box.innerHTML="";b.textContent="View the PoE here";return}
 const fr=document.createElement("iframe");fr.src="https://drive.google.com/file/d/"+encodeURIComponent(id)+"/preview";fr.title="Portfolio of Evidence";fr.setAttribute("loading","lazy");
 box.appendChild(fr);b.textContent="Hide the PoE";
});
function detailsHTML(f){
 let out="";
 DETAIL_GROUPS.forEach(([title,keys])=>{
  const have=keys.filter(k=>String(f[k]||"").trim());if(!have.length)return;
  const short=have.filter(k=>!DETAIL_LONG.has(k)),long=have.filter(k=>DETAIL_LONG.has(k));
  out+='<div class="dcard'+(long.length?' dwide':'')+'"><h4>'+escHTML(title)+'</h4>';
  if(short.length)out+='<div class="dgrid">'+short.map(k=>'<div class="dtile"><span class="dlabel">'+escHTML(DETAIL_LABEL[k])+'</span>'+escHTML(f[k])+'</div>').join("")+'</div>';
  if(long.length)out+='<div class="dlongs">'+long.map(k=>'<div class="dlong"><span class="dlabel">'+escHTML(DETAIL_LABEL[k])+'</span><div class="dtext">'+escHTML(f[k])+'</div></div>').join("")+'</div>';
  out+='</div>';
 });
 return poeHTML(f)+(out?'<div class="dcards">'+out+'</div>':'<p class="muted">No nomination details have been loaded for this nominee yet. Ask the organisers before scoring.</p>');
}
// Judge page: details of the selected nominee, shown above the scoring form.
$('scoreNominee').insertAdjacentHTML("afterend",'<div id="nomDetails"></div>');
async function showNomDetails(id){
 const el=$('nomDetails');if(!el)return;
 if(!id||(!PIN&&!data.me)){el.innerHTML="";return}
 el.innerHTML='<div class="dbox"><p class="muted">Loading the nomination details...</p></div>';
 try{
  const f=await fetchDetails(id);
  if($('scoreNominee').value!==id)return;          // they picked someone else meanwhile
  el.innerHTML='<div class="dbox"><h3 style="margin:12px 0 0">Nomination details</h3>'+detailsHTML(f)+"</div>";
 }catch(e){if($('scoreNominee').value===id)el.innerHTML='<div class="notice">Could not load the nomination details: '+escHTML(e.message)+"</div>"}
}
const loadFormOnly=window.loadScoreForm;
window.loadScoreForm=function(){loadFormOnly();showNomDetails($('scoreNominee').value)};

// Admin: a Details button on every nominee row, and optional detail fields on the add/edit form.
$('nomineeList').insertAdjacentHTML("afterend",'<div id="nomineeDetail"></div>');
window.viewNominee=run(async id=>{
 if(!PIN&&data.role!=="auditor")await needAdmin();
 const n=data.nominees.find(x=>String(x.id)===String(id)),box=$('nomineeDetail');
 box.innerHTML='<div class="dbox"><p class="muted">Loading...</p></div>';
 const f=await fetchDetails(id);
 box.innerHTML='<details class="dbox" open><summary>'+escHTML(n?n.name:id)+" - nomination details</summary>"+detailsHTML(f)+"</details>";
 box.scrollIntoView({behavior:"smooth",block:"nearest"});
});
const renderNomineesBase=window.renderNominees;
window.renderNominees=function(){
 renderNomineesBase();
 document.querySelectorAll("#nomineeList [data-edit]").forEach(b=>{
  b.insertAdjacentHTML("beforebegin",'<button class="btn" data-view="'+escHTML(b.dataset.edit)+'">Details</button> ');
  b.previousElementSibling.onclick=()=>viewNominee(b.dataset.edit);
 });
};
// Nomination detail fields sit in the right-hand column of the Add Nominee panel.
// Short fields run two to a row; the long motivation and evidence boxes span the full width.
$('addRight').insertAdjacentHTML("beforeend",'<details class="dbox" id="nExtra" open><summary>Nomination details</summary><p class="muted">Judges read these when they score this nominee, so fill in the motivation and evidence. Contact details and who nominated them are kept from judges.</p><div class="xgrid">'+
 EXTRA_FIELDS.map(([k,l])=>'<div class="'+(DETAIL_LONG.has(k)?'xwide':'')+'"><label>'+escHTML(l)+'</label>'+(DETAIL_LONG.has(k)?'<textarea id="x_'+k+'" style="min-height:80px"></textarea>':'<input id="x_'+k+'">')+'</div>').join("")+'</div></details>');
{const p=$("x_poe");p.placeholder="Paste the Google Drive link of the PDF";p.autocomplete="off";const m=$("x_mobile");m.type="tel";m.placeholder="+27 82 123 4567";m.onblur=()=>{m.value=normPhone(m.value)}}
let extraLoaded=false;
function clearExtra(){EXTRA_FIELDS.forEach(([k])=>{$("x_"+k).value=""});extraLoaded=false}
function collectExtra(){
 const o=Object.fromEntries(EXTRA_FIELDS.map(([k])=>[k,k==="mobile"?normPhone($("x_"+k).value):$("x_"+k).value.trim()]));
 return (extraLoaded||Object.values(o).some(Boolean))?o:undefined;   // nothing sent = the sheet keeps what it has
}
const editBase=window.editNominee;
window.editNominee=async id=>{
 editBase(id);clearExtra();
 if(!PIN)return;
 try{const f=await fetchDetails(id);EXTRA_FIELDS.forEach(([k])=>{$("x_"+k).value=f[k]||""});extraLoaded=true}catch(e){}
};
const cancelBase=window.cancelNomineeEdit;
window.cancelNomineeEdit=()=>{cancelBase();clearExtra()};

// guard every admin action (defined above, so they are all in place by now)
["addNominee","deleteNominee","attachPoe","importNominees","clearScores","addJudge","renameJudge","removeJudge","saveSettings"].forEach(n=>{
 const f=window[n];window[n]=run(async(...a)=>{await needAdmin();return f(...a)});
});
