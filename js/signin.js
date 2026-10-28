// Sign-in for judges, auditors and the administrator.
// Judges and auditors type ONLY their personal code. The sheet finds the person from the code and sends back their
// name and role (see load in api.js), so nobody picks a name from a list. The administrator signs in with the admin PIN.

function signin() {
  const admin = S.mode === 'admin';
  return `<div class="grid g2" style="margin-top:28px;align-items:start"><section class="card" style="margin:0"><h1 style="margin-top:0">Sign in</h1><p class="sub">Panel judges, auditors and the administrator all sign in here.</p>
  <div class="seg">${[
    ['code', 'Judge or auditor'],
    ['admin', 'Administrator'],
  ]
    .map(
      ([m, l]) =>
        `<button class="btn ${S.mode === m ? 'dark' : ''}" data-m="${m}" aria-pressed="${S.mode === m}">${l}</button>`,
    )
    .join('')}</div>
  <label for="cred">${admin ? 'Admin PIN' : 'Personal code'}</label><input id="cred" type="password" ${admin ? '' : 'inputmode="numeric" '}autocomplete="off">
  <p class="sub" style="font-size:14px;margin:6px 0">${admin ? 'Keep the admin PIN private.' : 'Type only your personal code. You do not need to choose your name. Never share your code.'}</p><p class="err" id="err">${esc(S.err)}</p>
  <button class="btn dark" style="width:100%" id="go">Sign in</button>
  <div class="note"><span class="eyebrow">${admin ? 'Administrator' : 'Judges and auditors'}</span>${admin ? 'The administrator signs in with the admin PIN.' : 'Your code tells the system who you are. Your name and role appear at the top once you are signed in.'}</div>
  ${live() ? '' : '<p class="sub" style="font-size:14px">Demo mode: any code signs you in as a judge; the admin PIN is “1234”.</p>'}</section>
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
      'Retype the code carefully, with nothing before or after it. If it still fails, ask the administrator to confirm or reissue it.',
    ],
    [
      'Too many attempts',
      'After 20 wrong codes in a row, sign-in pauses for everyone for 15 minutes. Wait, or ask the administrator to unlock it.',
    ],
    ['Lost your code', 'Ask the administrator. Personal codes are kept in the Google Sheet.'],
  ]
    .map(r => `<div class="box"><b>${r[0]}</b><br>${r[1]}</div>`)
    .join('')}</section>
  <div class="note solid"><span class="eyebrow">Confidentiality</span>The nominee list and judge names are private. They appear only after you sign in with a valid personal code or the admin PIN. Sign out on a shared computer.</div></div></div>`;
}

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
      const c = $('#cred').value.trim();
      S.err = '';
      try {
        if (!c) throw new Error(S.mode === 'admin' ? 'Enter the admin PIN.' : 'Enter your personal code.');
        if (S.mode === 'admin') {
          if (live()) await post({ action: 'verify', pin: c });
          else if (c !== '1234') throw new Error('Incorrect admin PIN.');
          S.role = 'admin';
          S.name = '';
          S.cred = c;
          await load();
          S.tab = 'Nominees';
        } else {
          S.role = null;
          S.cred = c;
          if (live()) {
            await load(); // the sheet finds the person from the code; load sets S.name and S.role from its reply
            if (!S.role || S.role === 'admin') throw new Error('Code not recognised.');
          } else {
            S.role = 'judge';
            S.name = 'Demo judge';
            S.confirmed = S.d.declarations.some(x => x.person === S.name && x.type === 'Confidentiality');
          }
          S.tab = S.role === 'judge' ? '' : 'Results';
        }
      } catch (e) {
        S.err = e.message;
        S.role = null;
        S.name = '';
        S.cred = '';
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
  S.mode = sv.mode === 'admin' ? 'admin' : 'code';
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
