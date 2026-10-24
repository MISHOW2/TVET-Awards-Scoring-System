// A nominee's nomination details and Portfolio of Evidence (PoE), shared by the judge, admin and results pages.
// The PDF and the evidence folder open only in a new tab; nothing is embedded in the page.

// One nominee's details, fetched on demand and kept for the session. The sheet decides what each role may see.
const detail = async id => {
  const k = S.role + '|' + id;
  if (S.dc[k]) return S.dc[k];
  const r = await post({ action: 'details', ...creds(), id: String(id) });
  return (S.dc[k] = r.fields || {});
};

// The PoE links: the PDF document, and the Drive folder with everything else the nominee submitted.
function poeBlock(f) {
  const id = String(f.poe || '').trim(),
    fo = String(f.poeFolder || '').trim();
  let h = '';
  if (FILE_ID.test(id))
    h += `<p class="sub" style="margin:0 0 6px"><b>The PoE document (PDF)</b></p><a class="btn dark" target="_blank" rel="noopener noreferrer" href="https://drive.google.com/file/d/${encodeURIComponent(id)}/view">Open the PoE (new tab)</a>`;
  else if (SPURL.test(id) && id.length <= 1800 && !/[\s<>"'\\]/.test(id))
    h += `<p class="sub" style="margin:0 0 6px"><b>The PoE document (SharePoint / OneDrive)</b></p><a class="btn dark" target="_blank" rel="noopener noreferrer" href="${esc(id)}">Open the PoE (new tab)</a>`;
  if (FOLD.test(fo))
    h += `<p class="sub" style="margin:${h ? '16px' : '0'} 0 6px"><b>All the evidence for this nominee</b> (videos, certificates, letters, supporting documents)</p><a class="btn gold" target="_blank" rel="noopener noreferrer" href="${esc(fo)}">Open the PoE folder (new tab)</a>`;
  if (!h) return '<p class="sub">No PoE has been linked to this nominee yet. Ask the organisers before scoring.</p>';
  return (
    h +
    '<p class="sub" style="font-size:14px;margin:12px 0 0">If Google or SharePoint asks you to sign in or says you need access, ask the organisers to share it with you.</p>'
  );
}

// The nomination details as grouped cards.
function detailCards(f) {
  return (
    GROUPS.map(([t, keys]) => {
      const have = keys.filter(k => String(f[k] || '').trim());
      if (!have.length) return '';
      const sh = have.filter(k => !LONGF.has(k)),
        lg = have.filter(k => LONGF.has(k));
      return `<div class="box"><b>${t}</b>${sh.length ? '<div class="dgrid">' + sh.map(k => `<div><span class="eyebrow">${esc(LAB[k])}</span>${esc(f[k])}</div>`).join('') + '</div>' : ''}${lg.map(k => `<div class="def"><span class="eyebrow">${esc(LAB[k])}</span><div style="white-space:pre-wrap">${esc(f[k])}</div></div>`).join('')}</div>`;
    }).join('') ||
    '<p class="sub">No nomination details have been loaded for this nominee yet. Ask the organisers before scoring.</p>'
  );
}
