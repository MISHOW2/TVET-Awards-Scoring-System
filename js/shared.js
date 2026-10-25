// Small pieces used by more than one page: what the signed-in judge has done, the PoE badge, and category grouping.

// This judge's saved score for a nominee, and whether they have recused themselves.
const mine = id => S.d.scores.find(s => s.id === id && s.judge === S.name);
const recused = id => (S.d.recusals || []).some(r => String(r.nomineeId) === String(id) && r.judge === S.name);

// "PoE linked" / "No PoE" badge.
const poeTag = n => (n.poe ? '<span class="tag ok">PoE linked</span>' : '<span class="tag no">No PoE</span>');

// Nominees grouped by award category: [{name, all:[every nominee in it], items:[the ones passing the filters]}]
function byCat(list) {
  const all = S.d.nominees,
    g = CATS.map((name, i) => ({ i, name, all: all.filter(n => n.cat === i), items: list.filter(n => n.cat === i) }));
  const other = list.filter(n => !CATS[n.cat]);
  if (other.length) g.push({ i: -1, name: 'No valid category', all: other, items: other });
  return g.filter(x => x.items.length);
}

// A table of totals per category. cols = [[heading, fn(nomineesInCategory) -> text]]
function catTable(cols) {
  const g = CATS.map((name, i) => ({ name, ns: S.d.nominees.filter(n => n.cat === i) })).filter(x => x.ns.length);
  const tot = S.d.nominees.filter(n => CATS[n.cat]);
  return `<div class="card tw" style="margin:0"><table><tr><th>Award category</th><th>Nominees</th>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>${g.map(x => `<tr><td>${esc(x.name)}</td><td><b>${x.ns.length}</b></td>${cols.map(c => `<td>${c[1](x.ns)}</td>`).join('')}</tr>`).join('')}<tr style="background:var(--soft)"><td><b>All categories</b></td><td><b>${tot.length}</b></td>${cols.map(c => `<td><b>${c[1](tot)}</b></td>`).join('')}</tr></table></div>`;
}

// The auditor is read-only.
const ro = () => S.role === 'auditor';

// ---- paging: long lists show a few rows at a time, with Previous / page numbers / Next ----
const PAGE_SIZES = [5, 10, 25, 50];

// The slice of `list` for the current page of list `key`. The page is kept within range.
function pageOf(list, key) {
  const per = S.ps || 5,
    pages = Math.max(1, Math.ceil(list.length / per)),
    pg = Math.min(S.pg[key] || 0, pages - 1);
  S.pg[key] = pg;
  return {
    key,
    pg,
    pages,
    per,
    total: list.length,
    items: list.slice(pg * per, pg * per + per),
    from: list.length ? pg * per + 1 : 0,
    to: Math.min(list.length, pg * per + per),
  };
}

// Page numbers to show: all of them when few, otherwise first, last and the ones around the current page ('…' between).
function pageNumbers(pg, pages) {
  if (pages <= 7) return [...Array(pages).keys()];
  const want = new Set([0, pages - 1, pg - 1, pg, pg + 1].filter(n => n >= 0 && n < pages)),
    out = [];
  [...want]
    .sort((a, b) => a - b)
    .forEach((n, i, a) => {
      if (i && n - a[i - 1] > 1) out.push('…');
      out.push(n);
    });
  return out;
}

// The pager under a list. Buttons carry data-pg="key:page"; the page-size drop-down carries data-ps.
function pager(p, compact) {
  if (!p.total) return '';
  const go = (n, label, extra = '') => `<button class="btn pgbtn" data-pg="${p.key}:${n}" ${extra}>${label}</button>`;
  if (compact)
    return `<div class="pager compact"><span class="sub">${p.from} to ${p.to} of ${p.total}</span><div class="row">${go(p.pg - 1, 'Previous', p.pg < 1 ? 'disabled' : '')}<span class="sub">${p.pg + 1} / ${p.pages}</span>${go(p.pg + 1, 'Next', p.pg >= p.pages - 1 ? 'disabled' : '')}</div></div>`;
  const nums = pageNumbers(p.pg, p.pages)
    .map(n =>
      n === '…'
        ? '<span class="sub">…</span>'
        : go(
            n,
            n + 1,
            n === p.pg
              ? 'aria-current="page" aria-label="Page ' + (n + 1) + ', current page"'
              : 'aria-label="Page ' + (n + 1) + '"',
          ),
    )
    .join('');
  return `<div class="pager row between"><span class="sub">Showing ${p.from} to ${p.to} of ${p.total} &middot; page ${p.pg + 1} of ${p.pages}</span>
  <div class="row"><label class="row sub" style="margin:0;font-weight:400">Per page <select data-ps style="width:auto">${PAGE_SIZES.map(n => `<option ${n === p.per ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  ${go(p.pg - 1, 'Previous', p.pg < 1 ? 'disabled' : '')}${nums}${go(p.pg + 1, 'Next', p.pg >= p.pages - 1 ? 'disabled' : '')}</div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-pg]');
  if (!b || b.disabled) return;
  const [key, n] = b.dataset.pg.split(':');
  S.pg[key] = +n;
  render();
  const top = document.getElementById('top-' + key);
  if (top) top.scrollIntoView({ block: 'start' });
});
document.addEventListener('change', e => {
  if (!e.target.matches || !e.target.matches('[data-ps]')) return;
  S.ps = +e.target.value || 5;
  S.pg = {};
  render();
});
