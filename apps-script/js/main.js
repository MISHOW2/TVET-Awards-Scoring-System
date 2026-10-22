// Start-up and the 2-minute refresh timer. Must load last.

data.judges=[];data.log=[];data.recusals=[];data.scores=[];data.nominees=[];   // start empty; the sheet is the only source
init();
refresh().catch(e=>alert("Cannot reach the scoring sheet.\n\n"+e.message+"\n\nNothing is stored on this device."));
// Refresh the live pages on a timer, but never while something else is talking to
// the sheet, and never while someone is typing into a field.
setInterval(()=>{
 if(document.hidden||modDirty)return;                      // nothing to refresh while the tab is in the background
 if(document.getElementById('busyVeil'))return;
 const t=document.activeElement&&document.activeElement.tagName;
 if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
 const a=document.querySelector('.page.active').id;
 if(a==='results'||a==='dashboard')refresh().catch(()=>{});
},120000);   // every 2 minutes; the Refresh button updates at once
