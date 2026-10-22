// Page refresh wrapper: fills drop-downs, counts and panels after every read.

// ---------- UI refresh + live updates ----------
const oldUpdate=window.updateAll;
window.updateAll=function(){
 const v=$('scoreNominee').value;oldUpdate();$('scoreNominee').value=v;fillJudges();
 if(!(data.nominees||[]).length&&data.count)$('statNominees').textContent=data.count;   // names stay private, the count does not
 $('statCategories').textContent=categories.length;
 const mx=data.settings.max,lw=mx<=10?1:0;
 $('scoring').querySelector('.hero p').textContent="Score each criterion from "+lw+" to "+mx+(mx<=10?" (whole numbers)":"")+" and give a written reason for every score. The app applies the weights automatically.";
 $('maxScore').value=data.settings.max;$('judgeCount').value=data.settings.judges;
 $('qualify').value=data.settings.qualify??70;$('spread').value=data.settings.spread??15;$('judgeList').value=(data.judges||[]).join("\n");
 renderJudgePanel();renderMyScores();renderHelp();
};
