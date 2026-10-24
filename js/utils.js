// Small helpers with no knowledge of the app.

// document.querySelector, escaping for text put into HTML, and the loose key used to compare names.
const $ = s => document.querySelector(s);
const esc = x =>
  String(x ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const key = x =>
  String(x || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// A message that disappears after 2.5 seconds.
const toast = m => {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = m;
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
};

// Download text as a file.
const dl = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
};

// Read a CSV file into rows of cells (quotes, commas and line breaks inside quotes are handled).
const parseCsv = t => {
  const rows = [];
  let r = [],
    f = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      r.push(f);
      f = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      r.push(f);
      f = '';
      rows.push(r);
      r = [];
    } else f += ch;
  }
  if (f || r.length) {
    r.push(f);
    rows.push(r);
  }
  return rows.filter(x => x.some(v => v.trim()));
};
