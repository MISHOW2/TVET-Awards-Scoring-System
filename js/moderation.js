// Moderation: after judging, record strengths, evidence, achievements and the outcome per nominee, and view the final report.

// The editor for one nominee.
function moderationEditor() {
  const n = S.d.nominees.find(x => x.id === S.mod) || S.d.nominees[0];
  if (!n) return '<h1>Moderation</h1><p class="sub">Add nominees first.</p>';
  S.mod = n.id;
  const m = S.d.moderation.find(x => x.nomineeId === n.id) || {},
    r = result(n),
    q = (S.mq || '').toLowerCase(),
    pgd = pageOf(
      S.d.nominees.filter(x => (x.name + ' ' + x.college).toLowerCase().includes(q)),
      'mod',
    );
  return `<div class="row between"><h1>Moderation</h1><button class="btn" id="rep">View final moderation report</button></div><p class="sub">After judging, record strengths, evidence, achievements and the outcome for each nominee. This feeds the final report.${ro() ? ' You have read-only access.' : ''}</p>
  <div class="grid side"><section class="card" style="margin-top:0"><h2>Nominees</h2><p class="sub" style="margin:0 0 8px">${S.d.moderation.length} of ${S.d.nominees.length} started</p><input id="mq" type="search" placeholder="Search name or college" value="${esc(S.mq || '')}" aria-label="Search nominees" style="margin-bottom:10px"><div id="top-mod">${pgd.items.map(x => `<button class="item" data-m="${esc(x.id)}" ${x.id === n.id ? 'aria-current="true"' : ''}><span class="iname">${esc(x.name)}</span><small class="istat ${S.d.moderation.some(y => y.nomineeId === x.id) ? 'done' : ''}">${S.d.moderation.some(y => y.nomineeId === x.id) ? 'Done' : 'Not started'}</small></button>`).join('') || '<p class="sub">No nominees match.</p>'}</div>${pager(pgd, true)}</section>
  <section class="card" style="margin-top:0"><div class="row between"><h2>${esc(n.name)}</h2><span class="sub">${r.wait ? 'Awaiting judges' : `Average ${r.avg.toFixed(1)} / 100 · Calculated: ${r.rec}`}</span></div>
  ${[
    ['strengths', 'Overall strengths'],
    ['evidence', 'Evidence supporting recommendation'],
    ['achievements', 'Significant achievements'],
  ]
    .map(
      f =>
        `<label for="m_${f[0]}">${f[1]}</label><textarea id="m_${f[0]}" ${ro() ? 'readonly' : ''}>${esc(m[f[0]])}</textarea>`,
    )
    .join('')}
  <label for="m_outcome">Recommended outcome</label><select id="m_outcome" ${ro() ? 'disabled' : ''}><option value="">Choose an outcome</option>${OUTCOMES.map(o => `<option ${String(m.outcome).toLowerCase() === o.toLowerCase() ? 'selected' : ''}>${o}</option>`).join('')}</select>
  ${ro() ? '' : '<div class="row" style="margin-top:14px"><button class="btn dark" id="msave">Save moderation notes</button></div>'}</section></div>`;
}

// The final moderation report: every nominee, their average and outcome, and the notes.
function moderationReport() {
  return `<div class="row between"><h1>Final moderation report</h1><button class="btn" id="repback">← Back to moderation</button></div><section class="card tw"><table><tr><th>Nominee</th><th>Average</th><th>Outcome</th><th>Strengths</th><th>Evidence</th><th>Achievements</th></tr>${S.d.nominees
    .map(n => {
      const m = S.d.moderation.find(x => x.nomineeId === n.id) || {},
        r = result(n);
      return `<tr><td>${esc(n.name)}</td><td>${r.wait ? '–' : r.avg.toFixed(1)}</td><td>${esc(m.outcome || 'Not decided')}</td><td>${esc(m.strengths)}</td><td>${esc(m.evidence)}</td><td>${esc(m.achievements)}</td></tr>`;
    })
    .join('')}</table></section>`;
}
function modPage() {
  return S.report ? moderationReport() : moderationEditor();
}

function bindModEditor() {
  $('#mq').oninput = e => {
    S.mq = e.target.value;
    S.pg.mod = 0;
    render();
    $('#mq').focus();
    $('#mq').setSelectionRange(99, 99);
  };
  document.querySelectorAll('[data-m]').forEach(
    b =>
      (b.onclick = () => {
        S.mod = b.dataset.m;
        render();
      }),
  );
  if ($('#msave'))
    $('#msave').onclick = async () => {
      const rec = {
        nomineeId: S.mod,
        strengths: $('#m_strengths').value,
        evidence: $('#m_evidence').value,
        achievements: $('#m_achievements').value,
        outcome: $('#m_outcome').value,
      };
      try {
        if (live()) {
          await post({ action: 'moderation', pin: S.cred, id: S.mod, ...rec });
          await load();
        } else {
          S.d.moderation = S.d.moderation.filter(x => x.nomineeId !== S.mod);
          S.d.moderation.push(rec);
        }
        toast('Moderation notes saved.');
        render();
      } catch (e) {
        toast(e.message);
      }
    };
}

function bindMod() {
  if (S.report) {
    $('#repback').onclick = () => {
      S.report = false;
      render();
    };
    return;
  }
  bindModEditor();
  $('#rep').onclick = () => {
    S.report = true;
    render();
  };
}
