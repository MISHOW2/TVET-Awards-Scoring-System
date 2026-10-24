// Declarations: who has signed the confidentiality declaration and the impartiality sign-offs.

function declPage() {
  const J = S.d.judgeNames,
    sg = n => S.d.declarations.some(d => d.person === n && d.type === 'Confidentiality');
  return `<h1>Declarations</h1><p class="sub">Check that confidentiality and impartiality sign-offs are recorded. Auditors see this tab read-only.</p><div class="grid" style="grid-template-columns:minmax(280px,1fr) 2fr;align-items:start">
  <section class="card" style="margin:0"><h2>Confidentiality declarations</h2><div class="tw"><table><tr><th>Name</th><th>Role</th><th>Declaration</th></tr>${J.map(n => `<tr><td>${esc(n)}</td><td>Judge</td><td><span class="tag" ${sg(n) ? '' : 'style="border-style:dashed"'}>${sg(n) ? 'Signed' : 'Not signed'}</span></td></tr>`).join('')}${S.d.auditorNames.map(n => `<tr><td>${esc(n)}</td><td>Auditor</td><td class="sub">Not required</td></tr>`).join('')}</table></div></section>
  <section class="card" style="margin:0"><h2>Impartiality sign-offs</h2><p class="sub">Each judge ticks, per nominee, that they assessed impartially, with no conflict of interest, on the submitted and verified evidence.</p><div class="tw"><table><tr><th>Nominee</th>${J.map(n => `<th>${esc(n)}</th>`).join('')}</tr>${S.d.nominees.map(n => `<tr><td>${esc(n.name)}</td>${J.map(j => `<td>${S.d.scores.some(s => s.id === n.id && s.judge === j) ? '✓ Signed' : '–'}</td>`).join('')}</tr>`).join('') || '<tr><td>No nominees yet.</td></tr>'}</table></div><p class="sub" style="font-size:14px;margin:10px 0 0">A dash means the judge has not scored that nominee yet.</p></section></div>`;
}
