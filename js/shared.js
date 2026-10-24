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
