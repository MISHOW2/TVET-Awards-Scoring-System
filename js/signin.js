// Sign-in for judges, auditors and the administrator.

function signin() {
  const names = S.mode === 'auditor' ? S.d.auditorNames : S.d.judgeNames;
  return `<div class="grid g2" style="margin-top:28px;align-items:start"><section class="card" style="margin:0"><h1 style="margin-top:0">Sign in</h1><p class="sub">Panel judges, auditors and the administrator all sign in here.</p>
  <div class="seg">${['judge', 'auditor', 'admin'].map(m => `<button class="btn ${S.mode === m ? 'dark' : ''}" data-m="${m}">${m === 'admin' ? 'Administrator' : m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
  ${S.mode === 'admin' ? `<label for="cred">Admin PIN</label><input id="cred" type="password" autocomplete="off">` : `<label for="nm">Your name</label><select id="nm"><option value="">Choose your name from the list</option>${names.map(n => `<option>${esc(n)}</option>`).join('')}</select><label for="cred">Personal code</label><input id="cred" type="password" inputmode="numeric" autocomplete="off">`}
  <p class="sub" style="font-size:14px;margin:6px 0">Names are not case-sensitive. Never share your code.</p><p class="err" id="err">${esc(S.err)}</p>
  <button class="btn dark" style="width:100%" id="go">Sign in</button>
  <div class="note"><span class="eyebrow">Administrator</span>Choosing Administrator replaces the name list with a single field for the admin PIN.</div>
  ${live() ? '' : '<p style="margin-top:24px"><a href="#" id="proto">Prototype: continue as a first-time judge →</a></p>'}</section>
  <div><section class="card" style="margin-top:0"><h2>Which role am I?</h2>${[
    [
      'Judge',
      'Panel member',
      'See the nominees, read their details, score them and give reasons. You see only your own scores.',
    ],
    [
      'Auditor',
      'Legal Services / Internal Audit',
      'Read-only access to the full results, reasons, declarations and moderation report. Auditors cannot score or change anything.',
    ],
    [
      'Administrator',
      'Awards secretariat',
      'Manages nominees, judges, settings and the final report. Signs in with the admin PIN.',
    ],
  ]
    .map(r => `<div class="def"><b>${r[0]}</b> <small class="sub">${r[1]}</small><br>${r[2]}</div>`)
    .join('')}</section>
  <section class="card"><h2>If sign-in does not work</h2>${[
    [
      'Code not accepted',
      'Check that you chose your own name, then retype the code carefully. If it still fails, ask the administrator to confirm or reset it.',
    ],
    ['Too many attempts', 'Wait 15 minutes, or ask the administrator to unlock your name.'],
    ['Name missing from the list', 'Ask the administrator to add you in the sheet.'],
  ]
    .map(r => `<div class="box"><b>${r[0]}</b><br>${r[1]}</div>`)
    .join(
      '',
    )}<p class="sub" style="font-size:14px;margin:0">After 10 wrong codes for one name, that name is locked for 15 minutes.</p></section>
  <div class="note solid"><span class="eyebrow">Confidentiality</span>The nominee list and judge names are private. They appear only after you sign in with a valid personal code or the admin PIN. Sign out on a shared computer.</div></div></div>`;
}

// A "prototype" link shown only in demo mode: continue as a first-time judge.
document.addEventListener('click', e => {
  if (e.target.id === 'proto') {
    e.preventDefault();
    S.role = 'judge';
    S.name = S.d.judgeNames[0];
    S.confirmed = false;
    S.tab = '';
    render();
  }
});

function bindSignin() {
  document.querySelectorAll('[data-m]').forEach(
    b =>
      (b.onclick = () => {
        S.mode = b.dataset.m;
        S.err = '';
        render();
      }),
  );
  const go = () =>
    busy(async () => {
      const nm = $('#nm')?.value || '',
        c = $('#cred').value.trim();
      S.err = '';
      try {
        if (S.mode === 'admin') {
          if (live()) await post({ action: 'verify', pin: c });
          else if (c !== '1234') throw new Error('Incorrect admin PIN.');
          S.role = 'admin';
          S.cred = c;
        } else {
          if (!nm || !c) throw new Error('Choose your name and enter your code.');
          S.role = S.mode;
          S.name = nm;
          S.cred = c;
          if (live()) await load();
          S.confirmed = live()
            ? S.confirmed
            : S.d.declarations.some(x => x.person === nm && x.type === 'Confidentiality');
        }
        if (S.role === 'admin') await load();
        S.tab = S.role === 'judge' ? '' : 'Results';
        if (S.role === 'admin') S.tab = 'Nominees';
      } catch (e) {
        S.err = e.message;
        S.role = null;
      }
      render();
    }, 'Signing you in...');
  $('#go').onclick = go;
  $('#cred').onkeydown = e => {
    if (e.key === 'Enter') go();
  };
}

// After a refresh: sign the person back in from the saved session. A wrong, changed or locked-out code ends it;
// a network failure does not (it retries, then asks for a refresh while keeping the session).
async function restoreSession() {
  const sv = savedSession();
  if (!sv || !sv.role || !sv.cred) return;
  S.role = sv.role;
  S.name = sv.name || '';
  S.cred = sv.cred;
  S.mode = sv.mode || 'judge';
  for (let i = 0; i < 3; i++) {
    try {
      await busy(() => load(), 'Restoring your session...');
      S.tab = sv.tab || (S.role === 'admin' ? 'Nominees' : S.role === 'auditor' ? 'Results' : '');
      return;
    } catch (e) {
      if (/recognised|Incorrect|Too many/i.test(e.message)) {
        forgetSession();
        S.role = null;
        S.cred = '';
        S.name = '';
        S.err = 'Your session ended: ' + e.message;
        return;
      }
      if (i < 2) await new Promise(r => setTimeout(r, 2500));
      else {
        S.role = null;
        S.cred = '';
        S.err = 'Could not reach the server. Refresh to try again; you are still signed in.';
      }
    }
  }
}
