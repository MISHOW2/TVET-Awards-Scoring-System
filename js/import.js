// Bulk import of the nominations workbook (xlsx / csv).

// ---------- bulk import ----------
// One nominee per row. Added one at a time through the same "nominee" action the
// form uses, so nothing changes on the Apps Script side.
// Extra nomination details (key, column heading). Same keys and headings as Code.gs.
const EXTRA_FIELDS=[["source","Source"],["title","Title"],["campus","Campus"],["department","Department"],["designation","Designation"],["status","Status"],["experience","Years of experience"],["province","Province"],["employeeNo","Employee number"],["focus","Focus area (subjects)"],["learners","Annual learners"],["email","Email"],["mobile","Mobile"],["nominator","Nominator"],["relationship","Nominator relationship"],["nominatorContact","Nominator contact"],["nominationDate","Nomination date"],["motivation","Motivation summary"],["why","Why deserving"],["impact","Measurable impact / evidence summary"],["profile","Professional profile"],["philosophy","Teaching philosophy"],["examples","Examples (teaching, curriculum, innovation)"],["evidence","Evidence, previous two academic years"],["poe","PoE link (Google Drive or SharePoint)"],["poeFolder","PoE folder link (Google Drive folder)"]];
const TEMPLATE_HEADERS=["Nomination ID","Nominee name","College","Award category",...EXTRA_FIELDS.map(x=>x[1])];
const norm=v=>String(v??"").replace(/\s+/g," ").trim();
// South African numbers are stored as +27 XX XXX XXXX. Excel drops the leading 0, so a 9-digit number is
// taken to be missing it. Anything that is not clearly a SA number is left exactly as typed.
function normPhone(v){
 const t=String(v??"").trim();if(!t)return "";
 const d=t.replace(/\D/g,"");let rest;
 if(d.startsWith("27")&&d.length===11)rest=d.slice(2);else if(d.length===10&&d[0]==="0")rest=d.slice(1);else if(d.length===9)rest=d;else return t;
 return "+27 "+rest.slice(0,2)+" "+rest.slice(2,5)+" "+rest.slice(5);
}
const loose=v=>norm(v).toLowerCase().replace(/\btvet college\b/,"").replace(/[^a-z0-9]/g,"");
const matchCollege=v=>colleges.find(c=>loose(c)===loose(v))||null;
const matchCategory=v=>{
 const raw=norm(v);if(!raw)return -1;
 const num=Number(raw);
 if(Number.isInteger(num)&&num>=1&&num<=categories.length)return num-1;
 const exact=categories.findIndex(c=>loose(c[0])===loose(raw));if(exact>=0)return exact;
 return loose(raw).length>6?categories.findIndex(c=>loose(c[0]).includes(loose(raw))):-1;
};
// A fresh id that cannot collide, even after deletions.
function nextId(taken){let i=1,id;do{id="TVET-"+String(i++).padStart(3,"0")}while(taken.has(id));return id}
async function sheetJs(){
 if(window.XLSX)return window.XLSX;
 await new Promise((ok,bad)=>{const el=document.createElement("script");
  el.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  el.onload=ok;el.onerror=()=>bad(new Error("The Excel library could not load. Use the CSV template, it needs no internet."));
  document.head.appendChild(el)});
 return window.XLSX;
}
const templateRows=()=>[TEMPLATE_HEADERS,["","Example: Sipho Radebe",colleges[0],categories[0][0]],["","","",""],["","","",""],["","","",""]];
const csvCell=v=>{let t=String(v??"");if(/^[\s]*[=+@-]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"'};
window.downloadTemplateCsv=()=>{
 const csv=templateRows().map(r=>r.map(csvCell).join(",")).join("\n");
 const blob=new Blob(["﻿",csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="TVET-nominees-template.csv";a.click();URL.revokeObjectURL(a.href);
 alert("Template downloaded. One nominee per row. The example row is ignored when you upload.");
};
window.downloadTemplate=run(async()=>{
 busy("Building the template...");
 try{
  const X=await sheetJs(),wb=X.utils.book_new(),sheet=X.utils.aoa_to_sheet(templateRows());
  sheet["!cols"]=[{wch:16},{wch:34},{wch:40},{wch:46}];
  X.utils.book_append_sheet(wb,sheet,"Nominees");
  X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([["Award categories"],...categories.map((c,i)=>[(i+1)+". "+c[0]]),[""],["Colleges in the pilot"],...colleges.map(c=>[c])]),"Lists");
  X.writeFile(wb,"TVET-nominees-template.xlsx");
  alert("Template downloaded. The second sheet lists every category and college, so the wording can be copied exactly.");
 } finally { busy(false) }
});
function parseCsv(text){
 const rows=[];let cell="",row=[],q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch}
  else if(ch==='"')q=true;
  else if(ch===","){row.push(cell);cell=""}
  else if(ch==="\n"){row.push(cell);rows.push(row);row=[];cell=""}
  else if(ch!=="\r")cell+=ch}
 if(cell!==""||row.length){row.push(cell);rows.push(row)}
 return rows;
}
function readRows(file){
 const isCsv=/\.csv$/i.test(file.name);
 return new Promise((ok,bad)=>{
  const r=new FileReader();
  r.onerror=()=>bad(new Error("That file could not be read. Try saving it again."));
  r.onload=async()=>{
   try{
    if(isCsv)return ok(parseCsv(String(r.result).replace(/^﻿/,"")));
    const X=await sheetJs(),wb=X.read(new Uint8Array(r.result),{type:"array"});
    ok(X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,blankrows:false,raw:false}));
   }catch(e){bad(e)}
  };
  if(isCsv)r.readAsText(file);else r.readAsArrayBuffer(file);
 });
}
window.importNominees=run(async file=>{
 const rows=await readRows(file);
 if(!rows.length)throw new Error("That file has no rows in it.");
 const head=(rows[0]||[]).map(h=>norm(h).toLowerCase());
 const col=name=>head.findIndex(h=>h.startsWith(name));
 const iId=col("nomination id"),iName=col("nominee"),iCollege=col("college"),iCat=col("award category");
 const iEx=[];EXTRA_FIELDS.forEach(([k,label])=>{const i=head.indexOf(norm(label).toLowerCase());if(i>=0)iEx.push([k,i])});   // optional detail columns
 if(iName<0||iCollege<0||iCat<0)throw new Error("That file does not have the expected column headings. The first row needs: Nomination ID, Nominee name, College, Award category.");
 const added=[],skipped=[],queue=[];
 const takenIds=new Set(data.nominees.map(n=>String(n.id)));
 const takenPeople=new Set(data.nominees.map(n=>loose(n.name)+"|"+loose(n.college)+"|"+n.cat));   // same person may be entered once per award category
 for(let r=1;r<rows.length;r++){
  const row=rows[r]||[],line=r+1;
  const name=norm(row[iName]),collegeRaw=norm(row[iCollege]),catRaw=norm(row[iCat]);
  let id=norm(row[iId]);
  if(!name&&!collegeRaw&&!catRaw)continue;
  if(/^example\b/i.test(name)){skipped.push({line,name,why:"The example row from the template"});continue}
  if(!name){skipped.push({line,name:"(blank)",why:"No nominee name"});continue}
  const college=matchCollege(collegeRaw);
  if(!college){skipped.push({line,name,why:collegeRaw?"College not in the pilot list: "+collegeRaw:"No college given"});continue}
  const cat=matchCategory(catRaw);
  if(cat<0){skipped.push({line,name,why:catRaw?"Award category not recognised: "+catRaw:"No award category given"});continue}
  const person=loose(name)+"|"+loose(college)+"|"+cat;
  if(takenPeople.has(person)){skipped.push({line,name,why:"Already on the register in that award category"});continue}
  if(id&&takenIds.has(id)){skipped.push({line,name,why:"Nomination ID "+id+" is already used"});continue}
  if(!id)id=nextId(takenIds);
  takenIds.add(id);takenPeople.add(person);
  queue.push({line,id,name,college,cat,extra:iEx.length?Object.fromEntries(iEx.map(([k,i])=>[k,k==="mobile"?normPhone(row[i]):String(row[i]??"").trim()])):undefined});
 }
 const report=()=>{
  $('importReport').innerHTML='<div class="notice" style="margin-top:14px"><b>'+added.length+" added</b> to the shared record"+
   (skipped.length?", <b>"+skipped.length+" skipped</b>.</div>":".</div>")+
   (skipped.length?'<div class="tablewrap"><table><tr><th>Row</th><th>Nominee</th><th>Why it was skipped</th></tr>'+
    skipped.map(x=>"<tr><td>"+x.line+"</td><td>"+escHTML(x.name)+'</td><td style="color:#c0392b">'+escHTML(x.why)+"</td></tr>").join("")+"</table></div>":"");
 };
 if(!queue.length){report();throw new Error("Nothing in that file could be added. The reasons are listed below.")}
 try{
  for(let i=0;i<queue.length;i++){
   const row=queue[i];
   busy("Adding nominee "+(i+1)+" of "+queue.length+"...");
   try{
    await api("nominee",{id:row.id,name:row.name,college:row.college,cat:row.cat,catName:categories[row.cat][0],extra:row.extra},true);
    added.push(row);
   }catch(e){
    if(e.message==="cancelled")throw e;
    skipped.push({line:row.line,name:row.name,why:"The shared record refused this row: "+e.message});
   }
  }
 } finally { busy(false) }
 await refresh();report();
 alert(added.length+" nominee"+(added.length===1?"":"s")+" added"+(skipped.length?", "+skipped.length+" skipped. See the list on the page.":"."));
});
$('importFile').onchange=e=>{const f=e.target.files&&e.target.files[0];if(f){importNominees(f);e.target.value=""}};

// A read that lands while a judge is part-way through a sheet must not wipe what
// they have typed. Re-render the form only when nothing is in progress.
function formInProgress(){
 const el=$('scoreForm');if(!el)return false;
 return [...el.querySelectorAll('input,textarea')].some(i=>i.id!=='judgeCode'&&String(i.value||'').trim()!=='');
}
function refreshKeepingWork(){
 return refresh().then(()=>{if(!formInProgress())loadScoreForm();renderMyScores()}).catch(()=>{});
}
