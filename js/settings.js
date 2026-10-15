// Settings page.

// ---------- settings ----------
window.saveSettings=run(async()=>{
 const np=$('newPin').value.trim();
 await api("settings",{max:$('maxScore').value,judges:$('judgeCount').value,qualify:$('qualify').value,
  spread:$('spread').value,judgeList:$('judgeList').value.split("\n"),newPin:np},true);
 if(np)PIN=np;$('newPin').value="";await refresh();alert("Settings saved.");
});
$('settings').insertAdjacentHTML('beforeend',`<div class="panel"><h3>Judges on the panel</h3>
 <p class="muted">These are the names judges choose from the drop-down on the Scoring page. A judge who is not on this list cannot score.</p>
 <div id="judgePanel"></div>
 <label for="judgeList">Judge list (one name per line)</label><textarea id="judgeList" style="min-height:120px"></textarea>
 <div class="notice" style="border-left-color:#c0392b"><b>Do not rename a judge by editing this box.</b> Scores are filed under the name used when they were submitted, so a name changed here leaves them behind. Use the Rename button above, which refuses the change if it would strand anything.</div>
 <h3 style="margin-top:26px">Thresholds &amp; admin PIN</h3>
 <label>Qualifying line (% of 100)</label><input id="qualify" type="number" min="0" max="100">
 <label>Flag a nominee when the judges are this many points apart</label><input id="spread" type="number" min="1" max="60">
 <label>New admin PIN (leave blank to keep)</label><input id="newPin" type="password">
 <div class="notice"><b>Recognition bands.</b> 90 and above National Excellence Winner, 80 to 89 Finalist Recognition, 70 to 79 Merit Recognition, below 70 does not qualify. These come from the framework and are applied automatically.</div>
 <div class="notice" style="border-left-color:#c0392b"><b>Do not change "Maximum score per criterion" once judging has started.</b> Every total already captured is worked out against it, so changing it re-bases scores that have already been submitted. The framework uses 1 to 5, so it should stay on 5.</div></div>`);
