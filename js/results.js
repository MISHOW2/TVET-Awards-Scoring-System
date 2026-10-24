// Results: category totals, the leaderboard, the selected nominee's details, and the audit trail (administrator and auditors).

// The leaderboard with its filters, plus each judge's scores and reasons for the selected nominee.
function resultsSummary() {
  const R = results(),
    cnt = r => R.filter(x => x.rec === r).length,
    wait = R.filter(x => x.wait).length,
    st = S.rf || '',
    ct = S.rc || '',
    fl = S.rfl;
  const rows = R.filter(r => (ct === '' || String(r.n.cat) === ct) && (!st || r.rec === st) && (!fl || r.flag));
  const names = ['T', 'S', 'I', 'D', 'P', 'F'];
  return `<div class="row between"><div><h1>Results</h1><p class="sub">Every nominee’s scores, each judge’s reasons, and the flags.${ro() ? ' You have read-only access.' : ''}</p></div>${ro() ? '' : '<div><small class="sub">ADMINISTRATOR ONLY</small><br><button class="btn dark" id="exp">Export results (CSV)</button></div>'}</div>
  <div style="margin-bottom: 16px">${catTable([['Fully scored', ns => ns.filter(n => !result(n).wait).length + ' of ' + ns.length]])}</div>
  <div class="grid g5">${[
    ['90 and above', OUTCOMES[0]],
    ['80 to 89', OUTCOMES[1]],
    ['70 to 79', OUTCOMES[2]],
    ['Below 70', OUTCOMES[3]],
  ]
    .map(
      o =>
        `<div class="card stat" style="margin:0"><small>${o[0]}</small><strong>${o[1]}</strong><b>${cnt(o[1])}</b></div>`,
    )
    .join(
      '',
    )}<div class="card stat" style="margin:0"><small>Fewer than ${S.d.settings.judges} judges</small><strong>Awaiting judges</strong><b>${wait}</b></div></div>
  <section class="card"><div class="row"><div><label for="rc" style="margin-top:0">Category</label><select id="rc"><option value="">All categories</option>${CATS.map((x, i) => `<option value="${i}" ${String(i) === ct ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label for="rf" style="margin-top:0">Recognition</label><select id="rf"><option value="">All</option>${OUTCOMES.map(o => `<option ${o === st ? 'selected' : ''}>${o}</option>`).join('')}</select></div><label class="row" style="font-weight:400;margin-top:24px"><input type="checkbox" id="rfl" style="width:auto" ${fl ? 'checked' : ''}> Show flagged nominees only</label></div>
  <div class="tw" style="margin-top:14px"><table><tr><th>Rank</th><th>Nominee</th><th>Category</th><th>Judges</th><th>Judge totals</th><th>Average</th><th>Recognition</th><th>Flag</th></tr>${rows.map((r, i) => `<tr ${S.rn === r.n.id ? 'style="background:var(--soft)"' : ''} data-n="${esc(r.n.id)}" tabindex="0"><td><b>${r.wait ? '–' : i + 1}</b></td><td>${esc(r.n.name)}</td><td>${esc(CATS[r.n.cat] || '')}</td><td>${r.sc.length} of ${S.d.settings.judges}</td><td>${r.sc.map(s => `<span class="tag">${Math.round(s.total)}</span>`).join(' ')}</td><td><b>${r.wait ? '–' : r.avg.toFixed(1)}</b></td><td>${r.wait ? 'Awaiting judges' : r.rec}</td><td>${r.flag ? '<span class="tag">Spread flag</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="8">No nominees match these filters.</td></tr>'}</table></div>
  <p class="sub" style="font-size:14px;margin-top:10px"><b>Awaiting judges</b> means fewer than the required judges have scored that nominee. <b>Spread flag</b> means judges’ totals differ by more than ${S.d.settings.spread} points, so the panel should discuss and moderate.</p></section>
  ${
    S.rn
      ? (() => {
          const r = R.find(x => x.n.id === S.rn);
          return r
            ? `<section class="card"><h2>Judges’ scores and reasons: ${esc(r.n.name)}</h2><div class="grid g3">${r.sc.map(s => `<div class="card" style="margin:0"><div class="row between"><b>${esc(s.judge)}</b><span><b>${s.total}</b> / 100</span></div><div class="row" style="margin:8px 0">${s.values.map((x, i) => `<span class="tag"><b>${names[i]}</b> ${x}</span>`).join('')}</div><p>${esc(s.comments)}</p></div>`).join('') || '<p class="sub">No scores yet.</p>'}</div><p class="sub" style="font-size:14px">${CRIT.map((c, i) => names[i] + ' ' + c[0]).join(' · ')}</p></section>`
            : '';
        })()
      : ''
  }`;
}

// The selected nominee's PoE links and nomination details, and who recused themselves.
function resultsPanel() {
  const rn = S.rn && S.d.nominees.find(n => n.id === S.rn);
  if (!rn) return '';
  const gone = (S.d.recusals || []).filter(r => String(r.nomineeId) === String(rn.id)).map(r => r.judge);
  return `<section class="card"><h2>Nomination details and PoE: ${esc(rn.name)}</h2>${gone.length ? `<p><b>Recused:</b> ${gone.map(esc).join(', ')}</p>` : ''}<div class="dp" data-id="${esc(rn.id)}"><p class="sub">Loading...</p></div></section>`;
}
// Every change to a submitted score and every conflict of interest declared.
function auditTrail() {
  const nm = id => (S.d.nominees.find(n => String(n.id) === String(id)) || {}).name || id,
    byDate = (a, b) => String(b.date).localeCompare(String(a.date));
  const tbl = (h, r) =>
    r.length
      ? `<div class="tw" style="max-height:420px;overflow:auto"><table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${r.join('')}</table></div>`
      : '<p class="sub">None recorded.</p>';
  return `<section class="card"><h2>Audit trail</h2><p class="sub">Every change to a submitted score and every conflict of interest declared. Signed declarations are on the Declarations tab.</p>
  <h3 style="margin:14px 0 6px">Changes to submitted scores (${(S.d.log || []).length})</h3>${tbl(
    ['Date', 'Nominee', 'Judge', 'Old %', 'New %', 'Reason'],
    [...(S.d.log || [])]
      .sort(byDate)
      .map(
        l =>
          `<tr><td>${esc(String(l.date).slice(0, 16))}</td><td>${esc(nm(l.nomineeId))}</td><td>${esc(l.judge)}</td><td>${esc(l.oldTotal)}</td><td>${esc(l.newTotal)}</td><td>${esc(l.reason)}</td></tr>`,
      ),
  )}
  <h3 style="margin:18px 0 6px">Conflicts of interest declared (${(S.d.recusals || []).length})</h3>${tbl(
    ['Date', 'Nominee', 'Judge'],
    [...(S.d.recusals || [])]
      .sort(byDate)
      .map(
        r =>
          `<tr><td>${esc(String(r.date).slice(0, 16))}</td><td>${esc(nm(r.nomineeId))}</td><td>${esc(r.judge)}</td></tr>`,
      ),
  )}</section>`;
}
function resultsPage() {
  return resultsSummary() + resultsPanel() + auditTrail();
}

function bindResults() {
  $('#rc').onchange = e => {
    S.rc = e.target.value;
    render();
  };
  $('#rf').onchange = e => {
    S.rf = e.target.value;
    render();
  };
  $('#rfl').onchange = e => {
    S.rfl = e.target.checked;
    render();
  };
  document.querySelectorAll('[data-n]').forEach(r => {
    r.onclick = () => {
      S.rn = r.dataset.n;
      render();
    };
    r.onkeydown = e => {
      if (e.key === 'Enter') r.click();
    };
  });
  if ($('#exp'))
    $('#exp').onclick = () => {
      const head = ['Nominee', 'Category', 'Judges', 'Average', 'Recognition'];
      const csv = [
        head,
        ...results().map(r => [
          r.n.name,
          CATS[r.n.cat],
          r.sc.length,
          r.wait ? '' : r.avg.toFixed(1),
          r.wait ? 'Awaiting judges' : r.rec,
        ]),
      ]
        .map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'tvet-awards-results.csv';
      a.click();
    };
}

// Download the results as a CSV file (opens in Excel).
const exportCsv = () =>
  dl(
    'tvet-awards-results.csv',
    [
      ['Nominee', 'Category', 'Judges', 'Average', 'Recognition'],
      ...results().map(r => [
        r.n.name,
        CATS[r.n.cat],
        r.sc.length,
        r.wait ? '' : r.avg.toFixed(1),
        r.wait ? 'Awaiting judges' : r.rec,
      ]),
    ]
      .map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n'),
  );
