// Excel master export.

// ---------- Excel master export ----------
$('results').querySelector('.hero p').textContent="Results are calculated from every judge's submitted scores, held in one shared Google Sheet the organisers can open and download as Excel.";
$('results').querySelector('.actions').insertAdjacentHTML('beforeend',`<button class="btn green" onclick="exportXLSX()">Export Master (Excel)</button><button class="btn gold" onclick="refresh_()">Refresh</button>`);
window.refresh_=run(refresh);
window.exportXLSX=run(async()=>{
 if(!window.XLSX)return alert("Excel library not loaded yet - check internet and retry.");
 await api("verify",{},true);await refresh();
 const rows=data.scores.map(s=>{const n=data.nominees.find(x=>x.id===s.nomineeId)||{},r={"Nominee ID":s.nomineeId,Nominee:n.name,College:n.college,Category:n.cat!=null?categories[n.cat][0]:"",Judge:s.judge};
  s.values.forEach((v,i)=>r["Score "+(i+1)]=v);return Object.assign(r,{"Total %":+s.total.toFixed(2),COI:s.coi||"",Comments:s.comments||"",Date:s.date})});
 const wb=XLSX.utils.book_new(),add=(n,a)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(a),n);
 add("Scores",rows);
 add("Nominees",data.nominees.map(n=>({ID:n.id,Nominee:n.name,College:n.college,Category:categories[n.cat][0]})));
 add("Change Log",data.log);add("Recusals",data.recusals);
 XLSX.writeFile(wb,"TVET_Awards_MASTER.xlsx");
});
