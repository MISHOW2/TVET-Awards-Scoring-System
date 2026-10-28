// Everything the app remembers while it runs, and the signed-in session kept across a page refresh.

// S = the current screen and person; S.d = the data read from the sheet; S.dc = nomination details already fetched.
const S = {
  role: null,
  name: '',
  cred: '',
  tab: '',
  nom: null,
  mod: null,
  mode: 'code', // sign-in tab: 'code' (judge or auditor) or 'admin'
  err: '',
  sel: {},
  ps: 5, // rows per page in the long lists
  pg: {}, // current page (0-based) of each list: judge, admin, results
  d: {
    settings: { judges: 3, qualify: 70, spread: 15, open: true },
    judgeNames: [],
    auditorNames: [],
    nominees: [],
    scores: [],
    declarations: [],
    moderation: [],
    recusals: [],
    log: [],
  },
  dc: {},
};

// True when a web app address is configured; otherwise the app runs on in-memory demo data.
const live = () => !!CONFIG.apiUrl;

// What every request carries to prove who is asking: the admin PIN, or a judge/auditor's personal code.
// The code alone identifies the person; the sheet sends back their name and role.
const creds = () => (S.role === 'admin' ? { pin: S.cred } : { code: S.cred });

// A page refresh does not sign anyone out. The sign-in lives in sessionStorage: it survives a refresh, is removed by
// Sign out, and disappears when the tab or browser is closed. The sheet still checks the code on every request.
const SESSION_KEY = 'tvet.session';
function saveSession() {
  if (!S.role || !live()) return;
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ role: S.role, name: S.name, cred: S.cred, mode: S.mode, tab: S.tab }),
    );
  } catch (e) {}
}
function forgetSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}
function savedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
}
