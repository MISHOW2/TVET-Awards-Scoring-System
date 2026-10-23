// Page shell, local state and the original renderers. Later files wrap these functions.
// Framework defaults: 1-5 per criterion, three judges per nominee, 70 to qualify.
let data=JSON.parse(localStorage.getItem("tvetAwardsData")||'{"nominees":[],"scores":[],"settings":{"max":5,"judges":3,"qualify":70}}');
function save(){localStorage.setItem("tvetAwardsData",JSON.stringify(data));updateAll()}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(id).classList.add("active");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===id));updateAll()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function init(){
 document.getElementById("categoryTable").innerHTML="<tr><th>Category</th><th>Criteria</th></tr>"+categories.map(c=>`<tr><td>${c[0]}</td><td>${c[1].map(x=>x.split("|")[0]+" ("+x.split("|")[1]+"%)").join(", ")}</td></tr>`).join("");
 document.getElementById("nCategory").innerHTML=categories.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join("");
 document.getElementById("nCollege").innerHTML='<option value="">-- Select College --</option>'+colleges.map((c,i)=>`<option value="${c}">${String(i+1).padStart(3,"0")} - ${c}</option>`).join("");
 document.getElementById("maxScore").value=data.settings.max;document.getElementById("judgeCount").value=data.settings.judges;updateAll()
}
function addNominee(){
 const name=document.getElementById("nName").value.trim(),college=document.getElementById("nCollege").value,cat=+document.getElementById("nCategory").value,id=document.getElementById("nId").value.trim()||"TVET-"+String(data.nominees.length+1).padStart(3,"0");
 if(!name||!college){alert("Please enter the nominee name and select a college.");return}
 data.nominees.push({id,name,college,cat});save();document.getElementById("nName").value="";document.getElementById("nCollege").value="";document.getElementById("nId").value="";alert("Nominee added.");
}
function updateAll(){
 document.getElementById("statNominees").textContent=data.nominees.length;
 document.getElementById("statScores").textContent=data.scores.length;
 let avg=data.scores.length?data.scores.reduce((a,s)=>a+s.total,0)/data.scores.length:0;document.getElementById("statAverage").textContent=avg.toFixed(1)+"%";
 renderNominees();renderScoreSelect();renderResults();
}
// Search and "no PoE" filter for the nominee list (the admin attaches 198 PoEs one by one, so finding a person has to be quick).
window.nomFilter={q:"",noPoe:false,cat:""};
function nomVisible(){
 const fold=s=>String(s==null?"":s).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),f=window.nomFilter,qs=fold(f.q).split(/\s+/).filter(Boolean);
 return data.nominees.filter(n=>(!f.noPoe||!n.poe)&&(f.cat===""||String(n.cat)===f.cat)&&qs.every(w=>fold(n.name+" "+n.college+" "+n.id+" "+(categories[n.cat]?categories[n.cat][0]:"")).includes(w)));
}
// One row per nominee, grouped under a heading for each award category with its total.
function rowsByCategory(){
 const list=nomVisible(),byName=(a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:"base"});
 const row=n=>`<tr${String(n.id)===editingNominee?' style="background:#fdf6e3"':''}><td>${escHTML(n.id)}</td><td><b>${escHTML(n.name)}</b></td><td>${escHTML(n.college)}</td><td><span class="badge">${escHTML(categories[n.cat]?categories[n.cat][0]:"")}</span></td><td>${n.poe?'<span class="badge poe-yes">PoE</span>':'<span class="badge poe-no">No PoE</span>'} <button class="btn" data-poe="${escHTML(n.id)}">PoE</button> <button class="btn" data-edit="${escHTML(n.id)}">Edit</button> <button class="btn red" data-del="${escHTML(n.id)}">Delete</button></td></tr>`;
 const out=[],groups=categories.map((c,i)=>[c[0],list.filter(n=>n.cat===i)]);
 const other=list.filter(n=>!categories[n.cat]);if(other.length)groups.push(["No valid award category",other]);
 groups.forEach(([name,g])=>{if(!g.length)return;
  const noPoe=g.filter(n=>!n.poe).length;
  out.push('<tr class="grouprow"><td colspan="5"><b>'+escHTML(name)+'</b> &middot; '+g.length+' nominee'+(g.length===1?'':'s')+' &middot; '+noPoe+' without a PoE</td></tr>');
  g.sort(byName).forEach(n=>out.push(row(n)));});
 return out;
}
function renderNominees(){
 const el=document.getElementById("nomineeList");if(!data.nominees.length){el.innerHTML='<div class="empty">No nominees added yet.</div>';return}
 const list=nomVisible();
 if(!list.length){el.innerHTML='<p class="muted">'+data.nominees.length+' on the register.</p><div class="empty">No nominee matches that search.</div>';return}
 el.innerHTML='<p class="muted">'+(list.length===data.nominees.length?data.nominees.length+' on the register.':'Showing '+list.length+' of '+data.nominees.length+'.')+' '+data.nominees.filter(n=>!n.poe).length+' without a PoE.</p><div class="tablewrap"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>Category</th><th></th></tr>'+rowsByCategory().join("")+"</table></div>";
 el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteNominee(b.dataset.del));
 el.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editNominee(b.dataset.edit));
 el.querySelectorAll("[data-poe]").forEach(b=>b.onclick=()=>attachPoe(b.dataset.poe));
}
function deleteNominee(id){if(confirm("Delete this nominee and their scores?")){data.nominees=data.nominees.filter(n=>n.id!==id);data.scores=data.scores.filter(s=>s.nomineeId!==id);save()}}
function renderScoreSelect(){let s=document.getElementById("scoreNominee");s.innerHTML='<option value="">-- Select nominee --</option>'+data.nominees.map(n=>`<option value="${escHTML(n.id)}">${escHTML(n.name)} \u2014 ${escHTML(categories[n.cat]?categories[n.cat][0]:"")}</option>`).join("")}
function loadScoreForm(){}
function submitScore(){}
function renderResults(){}
function saveSettings(){}
function clearScores(){}
function exportCSV(){
 let out="Nominee ID,Nominee,College,Category,Judge,Total Score,Comments,Date\n";
 data.scores.forEach(s=>{let n=data.nominees.find(x=>x.id===s.nomineeId);if(n)out+=[n.id,n.name,n.college,categories[n.cat][0],s.judge,s.total.toFixed(2),s.comments||"",s.date].map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")+"\n"});
 let blob=new Blob([out],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="TVET_Awards_Scoring_Results.csv";a.click();URL.revokeObjectURL(a.href);
}
init();

try{localStorage.removeItem("tvetAwardsData")}catch(e){}   // nothing is kept in the browser any more
window.save=()=>updateAll();                                // old save() no longer writes locally
// Recognition bands from the framework. A nominee is placed by the panel average.
// per-criterion reasons are stored in the Comments cell as "[Criterion] reason" lines
