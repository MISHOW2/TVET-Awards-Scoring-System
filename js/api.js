// Talking to the Google Sheet (Apps Script web app). Every read and write goes through post().

// One POST. The body is sent as plain text so the browser makes no preflight request. An error from the sheet is thrown.
const post = async body => {
  const r = await (
    await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    })
  ).json();
  if (r.error) throw new Error(r.error);
  return r;
};

// The loading overlay. busy(fn,msg) shows it while fn runs; calls can overlap.
let busyN = 0;
const busy = async (fn, msg = 'Checking the shared record...') => {
  let o = $('#loading');
  if (!o) {
    o = document.createElement('div');
    o.id = 'loading';
    o.className = 'loading';
    o.setAttribute('role', 'status');
    o.innerHTML =
      '<div class="lbox"><div class="spin"></div><b id="lmsg"></b><span>This can take a few seconds.</span></div>';
    document.body.append(o);
  }
  $('#lmsg').textContent = msg;
  busyN++;
  o.hidden = false;
  try {
    return await fn();
  } finally {
    if (--busyN <= 0) {
      busyN = 0;
      o.hidden = true;
    }
  }
};

// Category names from the sheet replace the built-in ones (only where the sheet supplies a name).
const setCats = r => {
  const c = (r.categories || r.cats || []).map(x => (typeof x === 'string' ? x : (x && (x.name || x.catName)) || ''));
  c.forEach((x, i) => {
    if (x) CATS[i] = x;
  });
};

// Read everything this person may see. quiet = background refresh: no overlay.
async function load(quiet) {
  if (!live()) return;
  const go = async () => {
    const r = await post({ action: 'read', ...creds() });
    const d = S.d;
    setCats(r);
    d.settings = { ...d.settings, ...r.settings };
    d.judgeNames = r.judgeNames || [];
    d.auditorNames = r.auditorNames || [];
    d.nominees = (r.nominees || []).map(n => ({ ...n, details: '' }));
    d.scores = (r.scores || []).map(s => ({
      id: s.nomineeId,
      judge: s.judge,
      values: s.values.map(Number),
      total: s.total,
      comments: s.comments,
      date: s.date,
    }));
    d.declarations = r.declarations || [];
    d.moderation = r.moderation || [];
    d.recusals = r.recusals || [];
    d.log = r.log || [];
    if (r.role === 'judge' && r.confirmed) S.confirmed = true;
  };
  return quiet ? go() : busy(go);
}
