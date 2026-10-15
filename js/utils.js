// Small shared helpers.

// Nominee and college names come from a shared Google Sheet that several people can
// edit. Anything from the sheet is escaped before it is written into the page, so a
// stray angle bracket in a name stays text and cannot run as code.
function escHTML(x){return String(x==null?"":x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}

const $=id=>document.getElementById(id);
const bandOf=v=>(BANDS.find(b=>v>=b[0])||BANDS[BANDS.length-1])[1];
const pct=(vals,crit,max)=>vals.reduce((a,v,i)=>a+v/max*(+crit[i].split("|")[1]),0); // always out of 100
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const parseR=(txt,crit)=>{const m={};String(txt||"").split("\n").forEach(l=>{const x=l.match(/^\[(.*?)\] (.*)$/);if(x)m[x[1]]=x[2]});return crit.map(c=>m[c.split("|")[0]]||"")};
