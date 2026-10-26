// The judge's pages: confidentiality declaration, the nominee list, and the scoring page.

function confirmPage() {
  return `<div style="max-width:720px;margin:28px auto"><span class="tag">First sign-in only</span><h1>Confidentiality declaration</h1><p class="sub">Read and tick the declaration below. You cannot score until you have done this.</p><div class="card"><b>${'Declaration from the awards secretariat'}</b><p style="margin-top:10px">${DECL_TEXT}</p></div><label class="note solid row" style="font-weight:400"><input type="checkbox" id="ok" style="width:auto"> I have read the confidentiality declaration and I accept it.</label><div class="row"><button class="btn dark" id="cont" disabled>Continue to nominees</button></div></div>`;
}

function bindConfirm() {
  $('#ok').onchange = e => ($('#cont').disabled = !e.target.checked);
  $('#cont').onclick = async () => {
    try {
      if (live()) await post({ action: 'declare', judge: S.name, code: S.cred, type: 'confidentiality' });
      S.d.declarations.push({ date: new Date().toISOString(), person: S.name, role: 'Judge', type: 'Confidentiality' });
      S.confirmed = true;
      render();
    } catch (e) {
      toast(e.message);
    }
  };
}

// ---- the nominee list: category totals, filters, and nominees grouped by category ----
function listPage() {
  const q = (S.q || '').toLowerCase(),
    c = S.cat || '',
    np = !!S.nopoe,
    N = S.d.nominees.length,
    closed = S.d.settings.open === false;
  const done = S.d.nominees.filter(n => mine(n.id)).length,
    gone = S.d.nominees.filter(n => recused(n.id)).length;
  const rows = S.d.nominees.filter(
    n =>
      (c === '' || String(n.cat) === c) &&
      (!np || !n.poe) &&
      (n.name + ' ' + n.college + ' ' + n.id + ' ' + (CATS[n.cat] || '')).toLowerCase().includes(q),
  );
  const pgd = pageOf(
      byCat(rows).flatMap(g => g.items),
      'judge',
    ),
    groups = byCat(pgd.items);
  return `<div class="row between"><div><h1>Nominees</h1><p class="sub">Open a nominee to read the nomination and evidence, then score them. You see only your own scores.</p></div><span class="chip">${closed ? 'Scoring is closed' : 'Scoring is open'}</span></div>
  <div class="card" style="margin:0 0 16px"><div class="row between"><b>Your progress</b><span class="sub">${done} scored${gone ? `, ${gone} recused` : ''}, of ${N} nominees</span></div><div class="bar-track"><div class="bar-fill" style="width:${N ? ((done + gone) / N) * 100 : 0}%"></div></div></div>
  ${catTable([
    ['Done by you', ns => ns.filter(n => mine(n.id)).length + ' of ' + ns.length],
    ['Recused', ns => ns.filter(n => recused(n.id)).length],
    ['With a PoE', ns => ns.filter(n => n.poe).length + ' of ' + ns.length],
  ])}
  <div class="card grid g3" style="align-items:end"><div><label for="cat" style="margin:0 0 4px">Category</label><select id="cat"><option value="">All categories</option>${CATS.map((x, i) => `<option value="${i}" ${String(i) === c ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
  <div><label for="q" style="margin:0 0 4px">Search</label><input id="q" placeholder="Name, college or ID" value="${esc(S.q || '')}"></div>
  <label class="row" style="font-weight:400;margin:0"><input type="checkbox" id="np" style="width:auto" ${np ? 'checked' : ''}> Only nominees without a PoE</label></div>
  <p class="sub" id="top-judge" style="margin:0 0 8px">Showing ${rows.length} of ${N} nominees.</p>
  <div class="card tw"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>PoE</th><th>Your status</th><th>Action</th></tr>${
    groups
      .map(
        g =>
          `<tr class="grouprow"><td colspan="6">${esc(g.name)} &middot; ${g.all.length} nominee${g.all.length === 1 ? '' : 's'} &middot; ${g.all.filter(n => mine(n.id)).length} done by you</td></tr>` +
          g.items
            .map(n => {
              const m = mine(n.id),
                r = recused(n.id);
              return `<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${poeTag(n)}</td><td><span class="tag">${r ? 'Recused' : m ? 'Saved: ' + m.total + '%' : 'Not scored'}</span></td><td>${r ? '' : `<button class="btn ${m ? '' : 'dark'}" data-id="${esc(n.id)}">${m ? 'Review' : 'Score'}</button>`}</td></tr>`;
            })
            .join(''),
      )
      .join('') || '<tr><td colspan="6">No nominees match. Clear the search or choose another category.</td></tr>'
  }</table></div>${pager(pgd)}`;
}

function bindList() {
  document.querySelectorAll('[data-id]').forEach(
    b =>
      (b.onclick = () => {
        S.nom = b.dataset.id;
        const m = mine(S.nom);
        S.sel.v = m ? [...m.values] : [0, 0, 0, 0, 0, 0];
        S.sel.c = m?.comments || '';
        S.sel.coi = m ? 'none' : '';
        render();
        scrollTo(0, 0);
      }),
  );
  $('#cat').onchange = e => {
    S.cat = e.target.value;
    S.pg.judge = 0;
    render();
  };
  $('#np').onchange = e => {
    S.nopoe = e.target.checked;
    S.pg.judge = 0;
    render();
  };
  $('#q').oninput = e => {
    S.q = e.target.value;
    S.pg.judge = 0;
    render();
    $('#q').focus();
    $('#q').setSelectionRange(99, 99);
  };
}

// ---- the scoring page: PoE and details on the left, conflict of interest and scores on the right ----
function scorePage() {
  const n = S.d.nominees.find(x => x.id === S.nom),
    v = S.sel.v,
    m = mine(n.id),
    gone = recused(n.id),
    closed = S.d.settings.open === false;
  const left = `<p style="margin-top:20px"><button class="lnk" id="back">← Back to nominees</button></p><div class="grid side"><div>
  <section class="card" style="margin-top:0"><small class="sub">Nomination ID ${esc(n.id)}</small><h2 style="font-size:26px;margin:6px 0">${esc(n.name)}</h2><p class="sub">${esc(n.college)}</p><span class="tag">${esc(CATS[n.cat] || '')}</span> ${poeTag(n)}</section>
  <details class="card" id="ne" open><summary><h2>Portfolio of Evidence</h2></summary><div id="poe"><p class="sub">Loading...</p></div></details>
  <details class="card" id="nd2" open><summary><h2>Nomination details</h2></summary><div id="dets"><p class="sub">Loading...</p></div></details>
  <section class="card scalecard"><h2>The scale</h2><table class="scale">${SCALE.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><p class="sub" style="font-size:14px;margin-top:10px">The total is a percentage: all 3s give 60%, all 4s give 80%, all 5s give 100%.</p></section></div>`;
  if (gone)
    return (
      left +
      `<section class="card" style="margin-top:0"><h2>You have recused yourself</h2><p>You declared a conflict of interest with this nominee, so you cannot score them. If this was a mistake, tell the administrator.</p></section></div>`
    );
  if (closed)
    return (
      left +
      `<section class="card" style="margin-top:0"><h2>Scoring is closed</h2><p>The administrator has closed scoring.${m ? ` Your saved total for this nominee is <b>${m.total}%</b>.` : ''}</p></section></div>`
    );
  return (
    left +
    `<section class="card" style="margin-top:0"><label for="coi" style="margin-top:0">Conflict of interest</label><select id="coi"><option value="">-- Declare --</option><option value="none">I have NO conflict of interest with this nominee</option><option value="conflict">I HAVE a conflict of interest, so I recuse myself</option></select>
  <div id="sbody" ${S.sel.coi === 'none' ? '' : 'hidden'}>${indicators()}<div class="row between" style="margin-top:18px"><h2>Your scores</h2><span class="sub" style="font-size:14px">Whole number from 1 to 5 for each criterion</span></div>
  ${CRIT.map((c, i) => `<div class="crit"><div class="head"><span>${c[0]}</span><span class="tag">Weight ${c[1]}</span></div><p class="sub" style="font-size:14px;margin:8px 0 0">${GUIDE[i]}</p>${rubric(i)}<div class="pick" role="group" aria-label="${c[0]}">${[1, 2, 3, 4, 5].map(k => `<button data-i="${i}" data-k="${k}" aria-pressed="${v[i] === k}">${k}</button>`).join('')}<span class="sub pts" id="pt${i}">${((v[i] / 5) * c[1]).toFixed(0)} / ${c[1]} points</span></div>${ENDS}</div>`).join('')}
  <label for="why">Strengths and evidence supporting your scores</label><p class="sub" style="font-size:14px;margin:0 0 6px">One box for all six criteria. Give the strengths you found and the evidence that supports each score.</p><textarea id="why" style="min-height:140px">${esc(S.sel.c)}</textarea>
  <div class="note"><b>Tip:</b> Judge on evidence only. If you know a nominee personally or have a conflict of interest, choose the recusal option above and do not score them.</div>
  <label class="note solid row" style="font-weight:400"><input type="checkbox" id="sign" style="width:auto"> ${SIGNOFF_TEXT}</label><p class="err" id="err"></p>
  <div class="row between foot"><div><small class="sub">Your total</small><div class="total"><span id="tot">${total(v)}</span><span class="sub" style="font-size:16px;font-weight:400"> %</span></div></div><div class="row"><span class="note conf" id="conf" style="margin:0">After Save, a confirmation appears here</span><button class="btn dark" id="save">Save</button></div></div></div></section></div>`
  );
}

function bindScore() {
  const v = S.sel.v,
    id = S.nom;
  $('#back').onclick = () => {
    S.nom = null;
    render();
  };
  detail(id)
    .then(f => {
      if (S.nom !== id || !$('#poe')) return;
      $('#poe').innerHTML = poeBlock(f);
      $('#dets').innerHTML = detailCards(f, (S.d.nominees.find(n => n.id === id) || {}).name);
    })
    .catch(e => {
      if ($('#poe')) $('#poe').innerHTML = '<p class="err">Could not load the details: ' + esc(e.message) + '</p>';
    });
  if (matchMedia('(max-width:820px)').matches && $('#ne')) {
    $('#nd2').open = false;
  }
  const coi = $('#coi');
  if (!coi) return;
  coi.value = S.sel.coi || '';
  coi.onchange = async () => {
    if (coi.value === 'conflict') {
      if (!confirm('Recuse yourself from this nominee? Any score you entered for them will be removed.')) {
        coi.value = S.sel.coi || '';
        return;
      }
      try {
        await busy(async () => {
          await post({ action: 'recusal', nomineeId: S.nom, judge: S.name, code: S.cred });
          await load(true);
        }, 'Recording your recusal...');
        toast('Recusal recorded. You cannot score this nominee.');
        S.nom = null;
        render();
      } catch (e) {
        toast(e.message);
        coi.value = S.sel.coi || '';
      }
    } else {
      S.sel.coi = coi.value;
      $('#sbody').hidden = coi.value !== 'none';
    }
  };
  document.querySelectorAll('.pick button').forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.i;
        v[i] = +b.dataset.k;
        document
          .querySelectorAll(`.pick button[data-i="${i}"]`)
          .forEach(x => x.setAttribute('aria-pressed', +x.dataset.k === v[i]));
        $('#pt' + i).textContent = `${((v[i] / 5) * CRIT[i][1]).toFixed(0)} / ${CRIT[i][1]} points`;
        $('#tot').textContent = total(v);
      }),
  );
  $('#why').oninput = e => (S.sel.c = e.target.value);
  $('#save').onclick = async () => {
    const err = m => ($('#err').textContent = m);
    if (S.d.settings.open === false) return err('Scoring is closed.');
    if (S.sel.coi !== 'none') return err('Declare that you have no conflict of interest before scoring.');
    if (v.some(x => !x)) return err('Give every criterion a score from 1 to 5.');
    if (S.sel.c.trim().length < 5) return err('Write your reasons for the scores.');
    if (!$('#sign').checked) return err('Tick the sign-off before saving.');
    const old = mine(S.nom),
      rec = { nomineeId: S.nom, judge: S.name, values: v, total: total(v), comments: S.sel.c.trim(), declare: true };
    if (old && old.total === rec.total && old.comments === rec.comments && old.values.every((x, i) => x === v[i]))
      return err('Nothing has changed since you last saved.');
    let reason = '';
    if (old) {
      reason = (prompt('You already scored this nominee. Why are you changing the score?') || '').trim();
      if (!reason) return err('A reason for the change is required.');
    }
    try {
      if (live()) {
        await post({
          action: 'score',
          code: S.cred,
          rec,
          log: old ? { oldTotal: old.total, newTotal: rec.total, reason } : null,
        });
        await load();
      } else {
        S.d.scores = S.d.scores.filter(s => !(s.id === S.nom && s.judge === S.name));
        S.d.scores.push({ id: S.nom, judge: S.name, values: [...v], total: rec.total, comments: rec.comments });
      }
      toast('Saved. Your scores for ' + S.d.nominees.find(x => x.id === S.nom).name + ' are stored.');
      S.nom = null;
      render();
    } catch (e) {
      err(e.message);
    }
  };
}

// The handbook rubric for one criterion, folded away until the judge opens it.
function rubric(i) {
  const r = RUBRIC[i],
    list = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<details class="rubric"><summary>Show the rubric</summary><div class="eyebrow">Consider</div>${list(r.consider)}<div class="eyebrow">Guiding questions</div>${list(r.ask)}<div class="eyebrow">What each rating means</div><table class="scale" style="border:0">${r.levels.map((x, k) => `<tr><td><b>${k + 1}</b></td><td>${esc(x)}</td></tr>`).join('')}</table></details>`;
}

// The six cross-cutting indicators that inform every score.
function indicators() {
  return `<details class="note rubric" style="margin-top:14px"><summary><b>Cross-cutting indicators</b>: keep these in mind for every criterion</summary><div class="tw"><table><tr><th>Indicator</th><th>Key question</th></tr>${INDICATORS.map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join('')}</table></div></details>`;
}
