// Paste into Extensions > Apps Script of a NEW Google Sheet. Deploy as Web app (Execute as: Me, Access: Anyone).
// After ANY edit: Deploy > Manage deployments > pencil > Version: New version > Deploy.
const TZ='Africa/Johannesburg';
const HEAD={
 Nominees:['ID','Nominee','College','CatIdx','Category'],   // + EXTRA columns, added by nomSheet()
 Scores:['Nominee ID','Nominee','College','Category','Judge','Score 1','Score 2','Score 3','Score 4','Score 5','Score 6','Total %','COI','Comments','Date'],
 ChangeLog:['Date','Nominee ID','Judge','Old %','New %','Reason'],
 Recusals:['Date','Nominee ID','Judge'],
 Judges:['Name','Code'],
 Auditors:['Name','Code'],
 Declarations:['Date','Person','Role','Type','Nominee ID'],
 Moderation:['Nominee ID','Nominee','Strengths','Evidence','Achievements','Outcome','Date'],
 'PoE Files':['File name or path','Link (optional)'],
 Settings:['Key','Value']};

// Extra nomination details, stored in the Nominees tab after the five core columns.
// Judges are never sent the fields in JUDGE_HIDDEN (contact details and who nominated).
const EXTRA=[['source','Source'],['title','Title'],['campus','Campus'],['department','Department'],['designation','Designation'],['status','Status'],['experience','Years of experience'],['province','Province'],['employeeNo','Employee number'],['focus','Focus area (subjects)'],['learners','Annual learners'],['email','Email'],['mobile','Mobile'],['nominator','Nominator'],['relationship','Nominator relationship'],['nominatorContact','Nominator contact'],['nominationDate','Nomination date'],['motivation','Motivation summary'],['why','Why deserving'],['impact','Measurable impact / evidence summary'],['profile','Professional profile'],['philosophy','Teaching philosophy'],['examples','Examples (teaching, curriculum, innovation)'],['evidence','Evidence, previous two academic years'],['poe','PoE link (Google Drive or SharePoint)']];
const JUDGE_HIDDEN=['employeeNo','email','mobile','nominator','nominatorContact','nominationDate'];
const NOM_COLS=5+EXTRA.length;
const POE_IDX=EXTRA.findIndex(x=>x[0]==='poe');   // the PoE column holds only a Google Drive file ID
// A PoE is either a Google Drive file (only its ID is stored) or a link to a file kept on SharePoint / OneDrive.
// Accepts a Drive share link, a bare Drive file ID or a SharePoint/OneDrive https link, and returns what to store, or '' when it is none of those.
const POE_HOST=/^https:\/\/(?:[a-z0-9-]+\.)*(?:sharepoint\.com|sharepoint\.us|1drv\.ms|onedrive\.live\.com)(?:[\/?#]|$)/i;
function poeId(x){
 const s=String(x==null?'':x).trim();if(!s)return '';
 let m=s.match(/^https:\/\/(?:drive|docs)\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|open\?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{20,})/);
 if(m)return m[1];
 if(/^[A-Za-z0-9_-]{20,}$/.test(s))return s;
 return (POE_HOST.test(s)&&s.length<=1800&&!/[\s<>"'\\]/.test(s))?s:'';}

function sh(n){
 let s=SpreadsheetApp.getActive().getSheetByName(n);
 if(!s){s=SpreadsheetApp.getActive().insertSheet(n);s.appendRow(HEAD[n]);s.setFrozenRows(1);
  if(n==='Settings')[['max',5],['judges',3],['qualify',70],['pin','change-me'],['judgeList','']].forEach(r=>s.appendRow(r));
  else s.getRange(1,1,s.getMaxRows(),3).setNumberFormat('@');}   // keep IDs/names as text
 return s;}
function rows(n){const v=sh(n).getDataRange().getValues(),h=v.shift();return v.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
// The Nominees tab, with the extra detail columns added to an older tab if they are missing.
function nomSheet(){
 const s=sh('Nominees'),h=HEAD.Nominees.concat(EXTRA.map(x=>x[1]));
 if(s.getLastColumn()<NOM_COLS||s.getRange(1,NOM_COLS).getValue()!==h[NOM_COLS-1]){
  if(s.getMaxColumns()<NOM_COLS)s.insertColumnsAfter(s.getMaxColumns(),NOM_COLS-s.getMaxColumns());
  s.getRange(1,1,1,NOM_COLS).setValues([h]);s.setFrozenRows(1);
  s.getRange(1,6,s.getMaxRows(),EXTRA.length).setNumberFormat('@');}
 return s;}
// Nominees are read by column position (ID, Nominee, College, CatIdx, Category), so a differently worded header row cannot hide the data.
function nomRows(){return nomSheet().getDataRange().getValues().slice(1).filter(r=>String(r[0])!=='').map(r=>({ID:r[0],Nominee:r[1],College:r[2],CatIdx:r[3],Category:r[4],hasPoe:!!String(r[5+POE_IDX]==null?'':r[5+POE_IDX]).trim()}));}
function settings(){const o={};rows('Settings').forEach(r=>o[r.Key]=r.Value);return o;}
function setKey(k,v){const s=sh('Settings'),d=s.getDataRange().getValues();
 for(let i=1;i<d.length;i++)if(d[i][0]===k){s.getRange(i+1,2).setValue(v);return}s.appendRow([k,v]);}
function del(n,f){const s=sh(n),d=s.getDataRange().getValues();for(let i=d.length-1;i>0;i--)if(f(d[i]))s.deleteRow(i+1);}
function ensureCodes(){                       // every listed judge gets a personal 4-digit code in the Judges tab
 const names=String(settings().judgeList||'').split('\n').map(x=>x.trim()).filter(Boolean),s=sh('Judges');
 s.getRange(1,1,s.getMaxRows(),2).setNumberFormat('@');           // codes stay text, so 0123 never becomes 123
 const have={};
 s.getDataRange().getValues().slice(1).forEach(r=>{                // keep a code already issued, matched by name ignoring case/spaces
  const k=key(r[0]);let c=String(r[1]).replace(/\D/g,'');
  if(c&&c.length<4)c=('0000'+c).slice(-4);                         // repair a lost leading zero
  if(k&&/^\d{4}$/.test(c)&&!have[k])have[k]=c;});
 const used=new Set(Object.values(have));
 const out2=names.map(n=>{let c=have[key(n)];
  if(!c){do{c=String(Math.floor(1000+Math.random()*9000))}while(used.has(c));used.add(c);}
  return [n,c];});
 if(s.getLastRow()>1)s.getRange(2,1,s.getLastRow()-1,2).clearContent();
 if(out2.length)s.getRange(2,1,out2.length,2).setValues(out2);}
// Clears any sign-in lockout for the listed judges.
function unlock(){const c=CacheService.getScriptCache();String(settings().judgeList||'').split('\n').forEach(n=>c.remove('fail:'+key(n).slice(0,80)));}

// RUN THIS from the editor (select setupCodes > Run) after any change to the judge list or the Judges tab.
function setupCodes(){ensureCodes();unlock();}

// Names are compared by letters and digits only: case, spaces, dots, dashes and accents are ignored.
const key=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
// Returns the judge's listed name when name + code match, otherwise ''.
// 10 wrong codes for a name lock that name out for 15 minutes.
function okJudge(n,c){
 const typed=key(n),code=String(c||'').replace(/\s/g,'');if(!typed||!code)return '';
 const cache=CacheService.getScriptCache(),k='fail:'+typed.slice(0,80),fails=+(cache.get(k)||0);
 if(fails>=10)throw new Error('Too many wrong attempts for that name. Try again in 15 minutes.');
 const j=rows('Judges').find(r=>key(r.Name)===typed);
 if(j&&String(j.Code).replace(/\s/g,'')===code){cache.remove(k);return String(j.Name);}
 cache.put(k,String(fails+1),900);return '';}
// Read-only reviewers (Legal Services, Internal Audit). Returns {name,role} for a judge OR an auditor,
// using one shared lockout counter (10 wrong codes lock that name for 15 minutes).
function who(n,c){
 const typed=key(n),code=String(c||'').replace(/\s/g,'');if(!typed||!code)return null;
 const cache=CacheService.getScriptCache(),k='fail:'+typed.slice(0,80),fails=+(cache.get(k)||0);
 if(fails>=10)throw new Error('Too many wrong attempts for that name. Try again in 15 minutes.');
 for(const [tab,role] of [['Judges','judge'],['Auditors','auditor']]){
  const j=rows(tab).find(r=>key(r.Name)===typed);
  if(j&&String(j.Code).replace(/\s/g,'')===code){cache.remove(k);return {name:String(j.Name),role};}}
 cache.put(k,String(fails+1),900);return null;}
// RUN ONCE from the editor (select setupAuditors > Run). Adds the two reviewers to the Auditors tab.
// They can read everything (scores, reasons, change log, nominee details) but can never score, edit or delete.
// Add or change reviewers afterwards directly in the Auditors tab (Name, Code).
function setupAuditors(){
 const s=sh('Auditors'),have=rows('Auditors').map(r=>key(r.Name));
 s.getRange(1,1,s.getMaxRows(),2).setNumberFormat('@');
 [['Mokhele Matthews','2058'],['Mabirimisa Lufuno','2068']].forEach(a=>{if(!have.includes(key(a[0])))s.appendRow(a)});}
const t=x=>/^[=+\-@]/.test(String(x))?"'"+x:String(x);          // stops typed text becoming a formula
const out=o=>ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// Open GET returns nothing sensitive: no roster, no judge names, no scores.
function doGet(){return out({ok:true});}

// Read (POST, so the PIN/code never sit in a URL):
//  - correct admin PIN         -> everything
//  - correct judge name + code -> the nominee roster plus only that judge's own rows
//  - nothing / anything else   -> settings, the nominee count and the judge names for the drop-down
//                                 (an error if credentials were given but wrong)
function readData(b){
 const s=settings(),adm=!!b.pin&&String(b.pin)===String(s.pin);
 if(b.pin&&!adm)return out({error:'Incorrect admin PIN.'});
 let me='',role='';
 if(!adm&&(b.judge||b.code)){const w=who(b.judge,b.code);if(!w)return out({error:'Name or code not recognised.'});me=w.name;role=w.role;}
 const full=adm||role==='auditor';   // auditors read everything, write nothing
 const all=nomRows();
 // count is public (a number only, no names), so the home page can show it before anyone logs in
 const o={settings:{max:+s.max,judges:+s.judges,qualify:+s.qualify,spread:+s.spread||15},count:all.length,judges:[],nominees:[],scores:[],log:[],recusals:[]};
 o.auditorNames=rows('Auditors').map(r=>String(r.Name)).filter(Boolean);   // names only, for the auditor sign-in drop-down
 o.judgeNames=String(s.judgeList||'').split('\n').filter(Boolean);   // names only, never codes: fills the sign-in drop-down
 if(!adm&&!me)return out(o);
 o.nominees=all.map(r=>({id:String(r.ID),name:r.Nominee,college:r.College,cat:+r.CatIdx,poe:!!r.hasPoe}));   // poe = true/false only; the file ID goes out through 'details'
 if(full)o.judges=String(s.judgeList||'').split('\n').filter(Boolean);
 if(me){o.me=me;o.role=role}
 const keep=r=>full||r.judge===me;
 o.scores=rows('Scores').map(r=>({nomineeId:String(r['Nominee ID']),judge:r.Judge,
   values:[1,2,3,4,5,6].map(i=>r['Score '+i]).filter(v=>v!==''),total:+r['Total %'],coi:r.COI,comments:r.Comments,date:String(r.Date)})).filter(keep);
 o.log=rows('ChangeLog').map(r=>({date:String(r.Date),nomineeId:String(r['Nominee ID']),judge:r.Judge,oldTotal:r['Old %'],newTotal:r['New %'],reason:r.Reason})).filter(keep);
 o.recusals=rows('Recusals').map(r=>({date:String(r.Date),nomineeId:String(r['Nominee ID']),judge:r.Judge})).filter(keep);
 const decl=rows('Declarations');
 if(role==='judge')o.confirmed=decl.some(r=>r.Person===me&&r.Type==='Confidentiality');   // has this judge signed the confidentiality declaration?
 if(full){   // administrator and auditors: the declarations log and the moderation reports
  o.declarations=decl.map(r=>({date:String(r.Date),person:r.Person,role:r.Role,type:r.Type,nomineeId:String(r['Nominee ID']||'')}));
  o.moderation=rows('Moderation').map(r=>({nomineeId:String(r['Nominee ID']),strengths:r.Strengths,evidence:r.Evidence,achievements:r.Achievements,outcome:r.Outcome,date:String(r.Date)}));}
 return out(o);}

// Full nomination details for one nominee. Admin PIN gets every field; a judge (name + code) gets all but JUDGE_HIDDEN.
function detailsData(b){
 const s=settings(),adm=!!b.pin&&String(b.pin)===String(s.pin);
 if(b.pin&&!adm)return out({error:'Incorrect admin PIN.'});
 const w=adm?null:who(b.judge,b.code);if(!adm&&!w)return out({error:'Name or code not recognised.'});
 const full=adm||w.role==='auditor';
 const r=nomSheet().getDataRange().getValues().slice(1).find(x=>String(x[0])===String(b.id));
 if(!r)return out({error:'Unknown nominee.'});
 const f={};EXTRA.forEach(([k],i)=>{if(full||!JUDGE_HIDDEN.includes(k))f[k]=String(r[5+i]==null?'':r[5+i])});
 return out({id:String(b.id),fields:f});}

// ---------- PoE files in Google Drive ----------
// Pure matching rule, so it can be tested without Drive: a nominee matches a file when every part of their name
// is in the file name; failing that, when their surname AND their college are both in the file name.
// A file that matches more than one nominee, or a nominee with more than one file, is left for a person to link.
// Matches PDFs to nominees. Two layouts work:
//  1. flat: the nominee's name (and college) is in the PDF's file name;
//  2. folders: Category / Lecturer name / files. The lecturer's folder name identifies the nominee and only the
//     file called "Portfolio of Evidence" / "PoE" counts as the PoE. Recommendation letters, presentations and
//     anything inside a "Supporting Documents" folder are ignored.
// f = {id, name, path:[folder names from the top, optional]}
function poeMatch(nominees,files){
 const words=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
 const isPoeName=n=>/portfolio\s*of\s*evidence|(^|[^a-z0-9])poe([^a-z0-9]|$)/i.test(n);
 const out={},unmatched=[],ambiguous=[];let ignored=0;
 const byFileName=f=>{const fw=new Set(words(f.name.replace(/\.pdf$/i,''))),fk=key(f.name);
  return nominees.filter(n=>{const nw=words(n.name).filter(w=>w.length>1);if(!nw.length)return false;
   if(nw.every(w=>fw.has(w)))return true;
   const kc=key(String(n.college||'').replace(/tvet college/i,''));
   return fw.has(nw[nw.length-1])&&kc.length>3&&fk.includes(kc);});};
 const byFolder=(folder)=>{const fw=new Set(words(folder).filter(w=>w.length>1)),fl=[...fw];if(!fl.length)return [];
  return nominees.filter(n=>{const nw=words(n.name).filter(w=>w.length>1);if(!nw.length)return false;
   return nw.every(w=>fw.has(w))||(fl.length>=2&&fl.every(w=>nw.includes(w)));});};
 const pick=(hits,path)=>{   // several nominees share the name: the category folder decides
  if(hits.length<2)return hits;const pw=new Set(words((path||[]).join(' ')));
  const score=n=>words(n.catName).filter(w=>w.length>2&&pw.has(w)).length,top=Math.max(...hits.map(score));
  const best=hits.filter(n=>score(n)===top);return top>0&&best.length===1?best:hits;};
 const label={};nominees.forEach(n=>label[n.id]=n.name);
 files.forEach(f=>{
  const path=Array.isArray(f.path)?f.path:[],inSupport=path.some(p=>/supporting/i.test(p));
  let hits=byFileName(f);
  if(!hits.length&&path.length){
   if(inSupport||!isPoeName(f.name)){ignored++;return}
   for(let i=path.length-1;i>=0&&!hits.length;i--)hits=byFolder(path[i]);}
  else if(path.length&&hits.length&&inSupport){ignored++;return}
  const where=(path.length?path.join('/')+'/':'')+f.name;
  hits=pick(hits,path);
  if(hits.length===1)(out[hits[0].id]=out[hits[0].id]||[]).push({id:f.id,poeNamed:isPoeName(f.name)});
  else if(hits.length>1)ambiguous.push(where);else unmatched.push(where);});
 Object.keys(out).forEach(id=>{let c=out[id];
  if(c.length>1){const p=c.filter(x=>x.poeNamed);if(p.length)c=p;}
  if(c.length>1){ambiguous.push('Several PoE files for '+label[id]);delete out[id];}else out[id]=c[0].id;});
 return {links:out,unmatched,ambiguous,ignored};}
// Writes matched links into the Nominees tab. Never overwrites an existing link.
function applyPoeLinks(files){
 const ns=nomSheet(),d=ns.getDataRange().getValues(),nominees=[];
 for(let i=1;i<d.length;i++)if(String(d[i][0])!==''&&!String(d[i][5+POE_IDX]||'').trim())nominees.push({id:String(d[i][0]),name:d[i][1],college:d[i][2],catName:d[i][4]});
 const res=poeMatch(nominees,files);let n=0;
 for(let i=1;i<d.length;i++){const id=res.links[String(d[i][0])];
  if(id){ns.getRange(i+1,6+POE_IDX).setNumberFormat('@').setValue(id);n++;
   if(/^[A-Za-z0-9_-]{20,}$/.test(id)&&String(settings().poeShare||'')==='anyone')DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}}
 const msg='Linked '+n+' PoE file(s). '+(res.ignored?res.ignored+' other documents (letters, supporting documents) were ignored. ':'')+'Files with no match: '+(res.unmatched.join('; ')||'none')+'. Needs a person: '+(res.ambiguous.join('; ')||'none')+'.';
 Logger.log(msg);try{SpreadsheetApp.getActive().toast(msg,'PoE linking',30)}catch(x){}
 return msg;}
function driveWalk(folder,out,path){   // every PDF in the folder and in all folders inside it, with the folder names above it
 path=path||[];
 const it=folder.getFilesByType(MimeType.PDF);while(it.hasNext()){const f=it.next();out.push({id:f.getId(),name:f.getName(),path});}
 const sub=folder.getFolders();while(sub.hasNext()){const c=sub.next();driveWalk(c,out,path.concat(c.getName()));}return out;}
// OPTION A, PDFs in Google Drive. RUN from the editor (select linkPoEs > Run).
// Settings tab: poeFolder = the folder's ID (the part after /folders/ in its address). Sub-folders are searched too.
// Optional: poeShare = anyone  -> each matched file is set to "anyone with the link can view".
// Leave poeShare out and share the folder yourself with the judges.
function linkPoEs(){
 const fid=String(settings().poeFolder||'').trim();
 if(!fid)throw new Error('Add a row to the Settings tab: poeFolder = the Drive folder ID.');
 return applyPoeLinks(driveWalk(DriveApp.getFolderById(fid),[]));}
// OPTION B, PDFs left on SharePoint / OneDrive (nothing is downloaded or uploaded). RUN from the editor (select linkPoEsFromList > Run).
// Paste the PoE file names into the "PoE Files" tab, column A (a path such as Folder/File.pdf is fine). Column B may hold each file's link;
// when it is empty the link is built from Settings: poeBaseUrl = the address of the SharePoint folder that holds the files.
function linkPoEsFromList(){
 const base=String(settings().poeBaseUrl||'').trim().replace(/\/+$/,''),files=[];
 sh('PoE Files').getDataRange().getValues().slice(1).forEach(r=>{
  const raw=String(r[0]||'').trim().replace(/\\/g,'/'),given=String(r[1]||'').trim();if(!raw)return;
  const parts=raw.split('/'),name=parts.pop();if(!/\.pdf$/i.test(name))return;
  const link=given||(base?base+'/'+raw.split('/').map(encodeURIComponent).join('/'):'');
  const id=poeId(link);if(id&&!/^[A-Za-z0-9_-]{20,}$/.test(id))files.push({id,name,path:parts});});
 if(!files.length)throw new Error('No usable rows. Fill the PoE Files tab (file names) and either column B or Settings > poeBaseUrl (a SharePoint/OneDrive address).');
 return applyPoeLinks(files);}

function doPost(e){
 let b0;try{b0=JSON.parse(e.postData.contents)}catch(x){return out({error:'Bad request.'})}
 if(b0.action==='read'||b0.action==='details'){try{return b0.action==='read'?readData(b0):detailsData(b0)}catch(err){return out({error:String(err.message||err)})}}                        // reads do not need the write lock

 // FIX: if the lock cannot be obtained, return JSON instead of letting Apps Script send an HTML error page.
 const lock=LockService.getScriptLock();
 try{lock.waitLock(30000);}catch(x){return out({error:'Server busy, please retry.'});}      // one write at a time
 try{
  const b=b0,s=settings(),now=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd HH:mm:ss');
  const need=()=>{if(String(b.pin)!==String(s.pin))throw new Error('Incorrect admin PIN.')};
  if(b.action==='score'||b.action==='recusal')ensureCodes();
  switch(b.action){
   case 'verify':need();break;
   case 'nominee':{need();
    const ns=nomSheet(),nd=ns.getDataRange().getValues();let k=-1;
    for(let i=1;i<nd.length;i++)if(String(nd[i][0])===b.id)k=i;
    const row=[b.id,t(b.name),b.college,b.cat,b.catName];
    const ex=b.extra?EXTRA.map(([key])=>{const raw=String(b.extra[key]==null?'':b.extra[key]).slice(0,20000);
     if(key==='poe'){const id=poeId(raw);if(raw.trim()&&!id)throw new Error('The PoE must be a Google Drive link, a Drive file ID, or a SharePoint/OneDrive link.');return id;}
     return t(raw);}):null;   // no extra sent = keep what is stored
    if(k>=0){                                   // edit: update in place and keep the Scores labels in step
     ns.getRange(k+1,1,1,row.length).setValues([row]);
     if(ex)ns.getRange(k+1,6,1,ex.length).setValues([ex]);
     const sc=sh('Scores'),sd=sc.getDataRange().getValues();
     for(let i=1;i<sd.length;i++)if(String(sd[i][0])===b.id)sc.getRange(i+1,2,1,3).setValues([[row[1],row[2],row[4]]]);
    }else ns.appendRow(ex?row.concat(ex):row);
    break;}
   case 'setPoe':{need();                        // attach, replace or remove one nominee's PoE (empty = remove)
    const ns=nomSheet(),nd=ns.getDataRange().getValues();let k=-1;
    for(let i=1;i<nd.length;i++)if(String(nd[i][0])===String(b.id))k=i;
    if(k<0)throw new Error('Unknown nominee.');
    const raw=String(b.poe==null?'':b.poe).trim(),id=poeId(raw);
    if(raw&&!id)throw new Error('That is not a Google Drive link, a Drive file ID, or a SharePoint/OneDrive link.');
    ns.getRange(k+1,6+POE_IDX).setNumberFormat('@').setValue(id);
    break;}
   case 'deleteNominee':need();
    nomSheet();del('Nominees',r=>String(r[0])===b.id);del('Scores',r=>String(r[0])===b.id);break;
   case 'score':{const rec=b.rec,log=b.log,n=nomRows().find(r=>String(r.ID)===rec.nomineeId);
    if(!n)throw new Error('Unknown nominee.');
    const me=okJudge(rec.judge,b.code);if(!me)throw new Error('Name or code not recognised.');
    rec.judge=me;
    if(!rows('Declarations').some(r=>r.Person===me&&r.Type==='Confidentiality'))throw new Error('Please accept the confidentiality declaration on the Scoring page first.');
    if(!rec.declare)throw new Error('Tick the sign-off declaration before submitting.');
    if(!rec.values.every(v=>typeof v==='number'&&v>=0&&v<=+s.max))throw new Error('Score outside allowed range.');
    if(rows('Recusals').some(r=>String(r['Nominee ID'])===rec.nomineeId&&r.Judge===rec.judge))throw new Error('You have recused yourself from this nominee.');
    const sc=sh('Scores'),d=sc.getDataRange().getValues();let k=-1;
    for(let i=1;i<d.length;i++)if(String(d[i][0])===rec.nomineeId&&d[i][4]===rec.judge)k=i;
    const vals=[...rec.values];while(vals.length<6)vals.push('');
    const row=[rec.nomineeId,n.Nominee,n.College,n.Category,rec.judge,...vals,+(+rec.total).toFixed(2),'none',t(rec.comments),now];
    if(k>=0){
     if(!log||!log.reason)throw new Error('Already scored - a reason for the change is required. Reload the page.');
     sh('ChangeLog').appendRow([now,rec.nomineeId,rec.judge,log.oldTotal,log.newTotal,t(log.reason)]);
     sc.getRange(k+1,1,1,row.length).setValues([row]);
    }else sc.appendRow(row);
    {const dl=sh('Declarations');dl.appendRow([now,me,'Judge','No conflict of interest',rec.nomineeId]);dl.appendRow([now,me,'Judge','Impartial sign-off',rec.nomineeId]);}   // signed on every submission
    break;}
   case 'declare':{const me=okJudge(b.judge,b.code);if(!me)throw new Error('Name or code not recognised.');
    if(b.type!=='confidentiality')throw new Error('Unknown declaration.');
    if(!rows('Declarations').some(r=>r.Person===me&&r.Type==='Confidentiality'))sh('Declarations').appendRow([now,me,'Judge','Confidentiality','']);
    break;}
   case 'moderation':{need();   // Final Moderation Report for one nominee (administrator only)
    const id=String(b.id||''),nn=nomRows().find(r=>String(r.ID)===id);if(!nn)throw new Error('Unknown nominee.');
    const OUTCOMES=['National Excellence Winner','Finalist Recognition','Merit Recognition','Does not qualify',''];
    if(!OUTCOMES.includes(b.outcome||''))throw new Error('Unknown outcome.');
    const cap=x=>t(String(x||'').slice(0,5000));
    const ms=sh('Moderation'),md=ms.getDataRange().getValues();let mk=-1;
    for(let i=1;i<md.length;i++)if(String(md[i][0])===id)mk=i;
    const mrow=[id,nn.Nominee,cap(b.strengths),cap(b.evidence),cap(b.achievements),b.outcome||'',now];
    if(mk>=0)ms.getRange(mk+1,1,1,mrow.length).setValues([mrow]);else ms.appendRow(mrow);
    break;}
   case 'recusal':
    {const me=okJudge(b.judge,b.code);if(!me)throw new Error('Name or code not recognised.');
    if(!rows('Recusals').some(r=>String(r['Nominee ID'])===b.nomineeId&&r.Judge===me))sh('Recusals').appendRow([now,b.nomineeId,me]);
    del('Scores',r=>String(r[0])===b.nomineeId&&r[4]===me);}break;
   case 'settings':need();{
    const keep=(b.judgeList||[]).map(x=>String(x).trim()).filter(Boolean);
    const stranded=[...new Set(rows('Scores').map(r=>r.Judge))].filter(j=>j&&!keep.includes(j));
    if(stranded.length)throw new Error(stranded[0]+' has submitted scores, so cannot be renamed or removed. Correct the name in the Scores tab of the sheet as well.');}
    setKey('max',Math.max(1,Math.min(100,+b.max||5)));setKey('judges',Math.max(1,+b.judges||3));setKey('qualify',+b.qualify||70);setKey('spread',+b.spread||15);
    setKey('judgeList',(b.judgeList||[]).map(x=>String(x).trim()).filter(Boolean).join('\n'));
    ensureCodes();
    if(b.newPin)setKey('pin',String(b.newPin));break;
   case 'clear':need();
    ['Scores','ChangeLog','Recusals','Declarations','Moderation'].forEach(n=>{const x=sh(n);if(x.getLastRow()>1)x.deleteRows(2,x.getLastRow()-1)});break;
   default:throw new Error('Unknown action.');
  }
  return out({ok:1});
 }catch(err){return out({error:String(err.message||err)});}
 finally{lock.releaseLock();}
}