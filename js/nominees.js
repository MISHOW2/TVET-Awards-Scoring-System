// Administrator: add, edit, delete and import nominees, and attach their PoE links.

function nomsPage() {
  const e = S.d.nominees.find(n => n.id === S.edit) || {},
    q = (S.nq || '').toLowerCase(),
    c = S.nc || '',
    np = !!S.nopoe,
    N = S.d.nominees.length;
  const rows = S.d.nominees.filter(
    n =>
      (c === '' || String(n.cat) === c) &&
      (!np || !n.poe) &&
      (n.name + ' ' + n.college + ' ' + n.id + ' ' + (CATS[n.cat] || '')).toLowerCase().includes(q),
  );
  const pgd = pageOf(
      byCat(rows).flatMap(g => g.items),
      'admin',
    ),
    groups = byCat(pgd.items),
    noPoe = S.d.nominees.filter(n => !n.poe).length;
  const field = ([k, l]) =>
    LONGF.has(k)
      ? `<div style="grid-column:1/-1"><label for="x_${k}">${esc(l)}</label><textarea id="x_${k}"></textarea></div>`
      : `<div><label for="x_${k}">${esc(l)}</label><input id="x_${k}" autocomplete="off"></div>`;
  return `<h1>Nominees</h1><p class="sub">Add and manage lecturers or teams entering the awards. ${noPoe} of ${N} nominees have no PoE linked yet.</p>
  <div style="margin-bottom:16px">${catTable([
    ['With a PoE', ns => ns.filter(n => n.poe).length + ' of ' + ns.length],
    [
      'Scored by every judge',
      ns => ns.filter(n => S.d.scores.filter(s => s.id === n.id).length >= Math.max(1, +S.d.settings.judges)).length,
    ],
  ])}</div>
  <div class="stack"><section class="card" style="margin:0"><h2>${e.id ? 'Edit nominee' : 'Add nominee'}</h2>
  <div class="fgrid"><div><label for="nn">Nominee / lecturer name</label><input id="nn" value="${esc(e.name)}"></div><div><label for="nc">College / institution</label><input id="nc" value="${esc(e.college)}"></div>
  <div><label for="nk">Award category</label><select id="nk"><option value="">Select a category</option>${CATS.map((x, i) => `<option value="${i}" ${e.id && e.cat === i ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
  <div><label for="ni">Nomination ID</label><input id="ni" value="${esc(e.id)}" ${e.id ? 'readonly' : ''}></div></div>
  <details id="xd" class="note" style="margin-top:14px" ${e.id ? 'open' : ''}><summary><b>Nomination details and PoE links</b></summary><p class="sub" style="font-size:14px">Judges read these when they score. Contact details and who nominated are kept from judges. ${e.id ? 'Existing values are loaded below.' : ''}</p><div class="xgrid">${EXTRA_F.map(field).join('')}</div></details>
  <p class="err" id="err"></p><div class="row"><button class="btn gold" id="addn">Save nominee</button><button class="btn" id="cn">Cancel</button></div></section>
  <section class="card" style="margin:0"><div class="row between"><h2 style="margin:0">Nominee register</h2><div class="row"><input id="nq" placeholder="Search name, college or ID" value="${esc(S.nq || '')}" style="width:220px"><select id="ncf" style="width:auto"><option value="">All categories</option>${CATS.map((x, i) => `<option value="${i}" ${String(i) === c ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
  <label class="row" style="font-weight:400;margin:10px 0 0"><input type="checkbox" id="nnp" style="width:auto" ${np ? 'checked' : ''}> Only nominees without a PoE</label>
  <p class="sub" id="top-admin" style="margin:10px 0 0">Showing ${rows.length} of ${N} nominees.</p>
  <div class="tw" style="margin-top:10px"><table><tr><th>ID</th><th>Nominee</th><th>College</th><th>PoE</th><th>Judges scored</th><th>Actions</th></tr>${groups.map(g => `<tr class="grouprow"><td colspan="6">${esc(g.name)} &middot; ${g.all.length} nominee${g.all.length === 1 ? '' : 's'} &middot; ${g.all.filter(n => n.poe).length} with a PoE</td></tr>` + g.items.map(n => `<tr><td>${esc(n.id)}</td><td>${esc(n.name)}</td><td>${esc(n.college)}</td><td>${poeTag(n)}</td><td>${S.d.scores.filter(s => s.id === n.id).length} of ${S.d.settings.judges}</td><td><button class="lnk" data-view="${esc(n.id)}">Details</button> &nbsp; <button class="lnk" data-poe="${esc(n.id)}">${n.poe ? 'Change PoE' : 'Attach PoE'}</button> &nbsp; <button class="lnk" data-edit="${esc(n.id)}">Edit</button> &nbsp; <button class="lnk" style="color:inherit" data-del="${esc(n.id)}">Delete</button></td></tr>`).join('')).join('') || '<tr><td colspan="6">No nominees match. Clear the search or add a nominee.</td></tr>'}</table></div>${pager(pgd)}
  ${S.view ? `<div class="card" style="margin:16px 0 0"><div class="row between"><h2 style="margin:0">${esc((S.d.nominees.find(n => n.id === S.view) || {}).name || S.view)}</h2><button class="lnk" id="vclose">Close</button></div><div class="dp" data-id="${esc(S.view)}"><p class="sub">Loading...</p></div></div>` : ''}</section></div>
  <section class="card"><div class="grid g2"><div><h2>Import the whole list</h2><p class="sub">Upload a CSV file with one nominee per row. The first row must have these headings:</p><div class="row" style="margin-bottom:10px">${['Nomination ID', 'Nominee name', 'College', 'Award category'].map(h => `<span class="tag">${h}</span>`).join('')}</div><p class="sub" style="font-size:14px">Optional columns: any nomination detail heading (for example Motivation summary), plus <b>PoE link (Google Drive or SharePoint)</b> and <b>PoE folder link (Google Drive folder)</b>. Nothing already on the register is overwritten, and every skipped row is listed with the reason. In Excel, use Save As › CSV.</p><button class="lnk" id="tpl">Download a blank template</button><div id="imp"></div></div>
  <div class="dz" id="dz"><b>Drop your CSV file here</b><span>or</span><button class="btn" id="bf">Browse files</button><input type="file" id="fi" accept=".csv,text/csv" hidden></div></div></section>`;
}

// What is typed in the nomination detail boxes of the form.
const xvals = () => Object.fromEntries(EXTRA_F.map(([k]) => [k, (($('#x_' + k) || {}).value || '').trim()]));

function bindNoms() {
  const keep = id => {
    const el = $(id);
    el.focus();
    el.setSelectionRange?.(99, 99);
  };
  $('#nq').oninput = e => {
    S.nq = e.target.value;
    S.pg.admin = 0;
    render();
    keep('#nq');
  };
  $('#ncf').onchange = e => {
    S.nc = e.target.value;
    S.pg.admin = 0;
    render();
  };
  $('#nnp').onchange = e => {
    S.nopoe = e.target.checked;
    S.pg.admin = 0;
    render();
  };
  $('#cn').onclick = () => {
    S.edit = null;
    S.xl = null;
    S.fresh = true;
    render();
  };
  document.querySelectorAll('[data-edit]').forEach(
    b =>
      (b.onclick = () => {
        S.edit = b.dataset.edit;
        S.xl = null;
        render();
        scrollTo(0, 0);
      }),
  );
  document.querySelectorAll('[data-view]').forEach(
    b =>
      (b.onclick = () => {
        S.view = b.dataset.view;
        render();
        document.querySelector('.dp')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }),
  );
  if ($('#vclose'))
    $('#vclose').onclick = () => {
      S.view = null;
      render();
    };
  document.querySelectorAll('[data-poe]').forEach(
    b =>
      (b.onclick = async () => {
        const n = S.d.nominees.find(x => x.id === b.dataset.poe);
        if (!n) return;
        const v = prompt(
          'Paste a link for ' +
            n.name +
            ':\n- a Google Drive or SharePoint link to the PoE PDF, or\n- a Google Drive FOLDER link with all of their evidence.\n\nLeave it empty and press OK to remove both.',
          '',
        );
        if (v === null) return;
        const link = v.trim(),
          isFolder = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(link);
        try {
          if (live()) {
            await busy(async () => {
              await post({
                action: 'setPoe',
                pin: S.cred,
                id: n.id,
                ...(link ? (isFolder ? { folder: link } : { poe: link }) : { poe: '', folder: '' }),
              });
              await load(true);
            }, 'Saving the PoE link...');
            S.dc = {};
          } else n.poe = !!link;
          toast(link ? 'PoE linked to ' + n.name + '.' : 'PoE removed from ' + n.name + '.');
          render();
          $('#nq') && keep('#nq');
        } catch (err) {
          toast(err.message);
        }
      }),
  );
  $('#addn').onclick = async () => {
    const n = {
      id: $('#ni').value.trim(),
      name: $('#nn').value.trim(),
      college: $('#nc').value.trim(),
      cat: +$('#nk').value,
      catName: CATS[+$('#nk').value],
    };
    if (!n.id || !n.name || $('#nk').value === '')
      return ($('#err').textContent = 'Fill in the name, category and nomination ID.');
    if (!S.edit && S.d.nominees.some(x => x.id === n.id))
      return ($('#err').textContent = 'That nomination ID is already on the register.');
    // Editing: the details are sent only once they have been loaded into the form, so an edit can never blank what is stored.
    const x = xvals(),
      extra = S.edit ? (S.xl === S.edit ? x : undefined) : Object.values(x).some(Boolean) ? x : undefined;
    try {
      if (live()) {
        await post({
          action: 'nominee',
          pin: S.cred,
          id: n.id,
          name: n.name,
          college: n.college,
          cat: n.cat,
          catName: n.catName,
          ...(extra ? { extra } : {}),
        });
        S.dc = {};
        await load();
      } else {
        const i = S.d.nominees.findIndex(y => y.id === n.id);
        if (i >= 0) S.d.nominees[i] = { ...S.d.nominees[i], ...n };
        else S.d.nominees.push({ ...n, details: '' });
      }
      S.edit = null;
      S.xl = null;
      S.fresh = true;
      toast('Nominee saved.');
      render();
    } catch (e) {
      $('#err').textContent = e.message;
    }
  };
  document.querySelectorAll('[data-del]').forEach(
    b =>
      (b.onclick = async () => {
        if (!confirm('Delete this nominee and their scores?')) return;
        try {
          if (live()) {
            await post({ action: 'deleteNominee', pin: S.cred, id: b.dataset.del });
            S.dc = {};
            await load();
          } else {
            S.d.nominees = S.d.nominees.filter(n => n.id !== b.dataset.del);
            S.d.scores = S.d.scores.filter(s => s.id !== b.dataset.del);
          }
          render();
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  $('#tpl').onclick = () =>
    dl(
      'nominee-template.csv',
      'Nomination ID,Nominee name,College,Award category,Motivation summary,PoE link (Google Drive or SharePoint),PoE folder link (Google Drive folder)\n',
    );
  $('#bf').onclick = () => $('#fi').click();
  $('#fi').onchange = e => importFile(e.target.files[0]);
  const dz = $('#dz');
  dz.ondragover = e => {
    e.preventDefault();
    dz.classList.add('over');
  };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => {
    e.preventDefault();
    importFile(e.dataTransfer.files[0]);
  };
}

// Import nominees from a CSV file. Optional columns: any nomination detail heading, including the two PoE links.
async function importFile(f) {
  const out = $('#imp');
  if (!f) return;
  if (!/\.csv$/i.test(f.name))
    return (out.innerHTML = '<p class="err">Save the file as CSV first (Excel: Save As › CSV).</p>');
  const rows = parseCsv(await f.text()),
    h = rows.shift().map(key),
    ix = k => h.indexOf(k),
    [a, b, c, d] = ['nominationid', 'nomineename', 'college', 'awardcategory'].map(ix);
  if ([a, b, c, d].includes(-1))
    return (out.innerHTML =
      '<p class="err">The first row must have: Nomination ID, Nominee name, College, Award category.</p>');
  const xcols = [];
  h.forEach((hh, i) => {
    const f2 = EXTRA_F.find(([k, l]) => key(k) === hh || key(l) === hh);
    if (f2 && ![a, b, c, d].includes(i)) xcols.push([f2[0], i]);
  });
  let added = 0;
  const skipped = [];
  for (const r of rows) {
    const n = {
      id: (r[a] || '').trim(),
      name: (r[b] || '').trim(),
      college: (r[c] || '').trim(),
      cat: CATS.findIndex(x => key(x) === key(r[d])),
    };
    const why =
      !n.id || !n.name
        ? 'missing ID or name'
        : S.d.nominees.some(x => x.id === n.id)
          ? 'ID already on the register'
          : n.cat < 0
            ? 'unknown category “' + (r[d] || '') + '”'
            : '';
    if (why) {
      skipped.push((n.id || n.name || 'blank row') + ': ' + why);
      continue;
    }
    const extra = {};
    xcols.forEach(([k, i]) => {
      if ((r[i] || '').trim()) extra[k] = r[i].trim();
    });
    try {
      if (live())
        await post({
          action: 'nominee',
          pin: S.cred,
          id: n.id,
          name: n.name,
          college: n.college,
          cat: n.cat,
          catName: CATS[n.cat],
          ...(Object.keys(extra).length ? { extra } : {}),
        });
      else S.d.nominees.push({ ...n, details: '' });
      added++;
    } catch (e) {
      skipped.push(n.id + ': ' + e.message);
    }
  }
  if (live()) await load();
  S.dc = {};
  render();
  $('#imp').innerHTML =
    `<p><b>${added} added, ${skipped.length} skipped.</b></p>${skipped.length ? '<ul>' + skipped.map(s => `<li>${esc(s)}</li>`).join('') + '</ul>' : ''}`;
}
