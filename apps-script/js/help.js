// Built-in help page.

// ---------- the manual, built in ----------
function renderHelp(){
 const el=$('helpBody');if(!el)return;
 const crit=CRITERIA.map(c=>{const [n,w]=c.split("|");return "<tr><td>"+escHTML(n)+"</td><td><b>"+w+"%</b></td></tr>"}).join("");
 const cats=categories.map((c,i)=>"<tr><td>"+(i+1)+"</td><td>"+escHTML(c[0])+"</td></tr>").join("");
 const scale=SCALE.map(x=>"<tr><td><b>"+x[0]+"</b></td><td><b>"+escHTML(x[1])+"</b></td><td>"+escHTML(x[2])+"</td></tr>").join("");
 const bands=BANDS.map(b=>"<tr><td><b>"+(b[0]?b[0]+" and above":"below 70")+"</b></td><td>"+escHTML(b[1])+"</td></tr>").join("");
 el.innerHTML=`
 <div class="grid">
  <div class="panel"><h3>For judges</h3>
   <p>Everything you do is saved to one shared record. Nothing is kept on the computer you are using, so you can start on one machine and finish on another.</p>
   <ol>
    <li><b>Go to Scoring.</b> Choose your name from the list, type the personal code the organisers gave you, then press Sign in. The page loads your own work only; you never see another judge's scores.</li>
    <li><b>Choose a nominee</b> from the list.</li>
    <li><b>Declare the conflict of interest.</b> If you know the nominee well enough that it could affect your judgement, choose to recuse yourself. That is recorded and you are not asked to score them.</li>
    <li><b>Score each of the six criteria from 1 to 5</b> and write a short reason for every one. The reason is required. The app applies the weights and shows your running total.</li>
    <li><b>Submit.</b> The score only counts once the shared record confirms it.</li>
   </ol>
   <p><b>Changing a score you already submitted.</b> Your scoring so far is listed at the bottom of the Scoring page. Press <b>Open and change</b> next to any nominee, adjust what you need, give a reason for the change, and submit again. The old total, the new total and your reason are all kept in the record.</p>
   <div class="notice"><b>Keep the window open while you work.</b> A half-finished sheet is not saved anywhere until you press Submit.</div>
  </div>
  <div class="panel"><h3>For organisers</h3>
   <p>The administrator PIN unlocks the Results page and everything that writes to the register. You are asked for it the first time you need it.</p>
   <p><b>Adding nominees.</b> Either one at a time on the Nominees page, or all at once with the upload described below. Leave the Nomination ID blank and the app gives out the next free one.</p>
   <p><b>Fixing a nominee.</b> Press <b>Edit</b> on their row. The form fills in with their details and saving updates that entry rather than creating a second one. Their scores are kept.</p>
   <p><b>Judges.</b> Settings page. Add a judge, correct a name, or remove one. A judge who has already submitted sheets cannot be renamed or removed here: their scores are filed under the name they used, and changing it in the app would leave those scores behind and count the nominee twice. Fix a name like that in the Google Sheet itself, where the scores can be re-filed at the same time. Personal codes are also set in the sheet, not here.</p>
   <p><b>Results.</b> A recognition band is only shown once the required number of judges have scored that nominee. Where the panel disagrees by more than the threshold, the row is flagged so you can discuss it before anything is announced.</p>
   <div class="notice" style="border-left-color:#c0392b"><b>Do not change the maximum score per criterion once judging has started.</b> Every total already captured was worked out against it, so changing it re-bases scores that are already in.</div>
  </div>
 </div>
 <div class="grid">
  <div class="panel"><h3>Uploading the whole list</h3>
   <p>Nominees page, at the bottom.</p>
   <ol>
    <li>Prepare an Excel or CSV file with the headings Nomination ID, Nominee name, College and Award category in the first row. The detail columns are optional.</li>
    <li>Fill in one nominee per row, using the exact college and award category names shown in this app.</li>
    <li>Leave the Nomination ID blank unless you have your own numbering.</li>
    <li>Upload the file. Rows go in one at a time with a counter on screen.</li>
   </ol>
   <p>The award category can be the full name or just its number. A college can be typed without the words "TVET College", and capitals and extra spaces do not matter.</p>
   <p><b>Nothing already on the register is overwritten.</b> A row is skipped, and listed with its row number and the reason, when it has no name, college or category, names a college or category the app does not recognise, repeats somebody already on the register, or uses a Nomination ID that is taken.</p>
  </div>
  <div class="panel"><h3>If something looks wrong</h3>
   <p><b>The page seems frozen.</b> A panel saying it is talking to the shared record means a request is in flight. Google can take a few seconds to wake up. Wait for it to clear.</p>
   <p><b>The judge list is empty.</b> The app could not read the shared record. Check the connection and reload.</p>
   <p><b>A score will not submit.</b> Every criterion needs a score and a written reason of at least a few words, and your personal code must be filled in.</p>
   <p><b>A nominee is missing.</b> Press Refresh, or check the Nominees page; another organiser may still be loading them.</p>
   <p>Scores and nominees live in the shared Google Sheet. If this page is closed, nothing submitted is lost.</p>
  </div>
 </div>
 <div class="grid">
  <div class="panel"><h3>The framework</h3>
   <p>One set of six criteria for every category.</p>
   <table><tr><th>Criterion</th><th>Weight</th></tr>${crit}</table>
   <p style="margin-top:16px">Each is scored 1 to 5, so straight 3s come to 60, straight 4s to 80 and straight 5s to 100.</p>
   <table style="margin-top:10px"><tr><th>Score</th><th></th><th>What it means</th></tr>${scale}</table>
   <p style="margin-top:16px"><b>Recognition bands</b>, applied to the panel average.</p>
   <table style="margin-top:10px">${bands}</table>
  </div>
  <div class="panel"><h3>The award categories</h3>
   <table><tr><th>#</th><th>Category</th></tr>${cats}</table>
   <p class="muted" style="margin-top:14px">Use either the number or the full name in the upload file.</p>
  </div>
 </div>`;
}
