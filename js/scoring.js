// The scoring maths: weighted totals, the recognition band, and each nominee's result.

// A judge's total as a percentage: each 1-5 score is scaled by its criterion's weight.
const total = v => Math.round(v.reduce((a, x, i) => a + (x / 5) * CRIT[i][1], 0) * 100) / 100;

// Recognition band for an average percentage (90 / 80 / 70).
const recog = a => (a >= 90 ? OUTCOMES[0] : a >= 80 ? OUTCOMES[1] : a >= 70 ? OUTCOMES[2] : OUTCOMES[3]);

// One nominee's result. A nominee is "waiting" until enough judges have scored; a recused judge lowers the number needed.
function result(n) {
  const sc = S.d.scores.filter(s => s.id === n.id),
    gone = new Set((S.d.recusals || []).filter(r => String(r.nomineeId) === String(n.id)).map(r => r.judge)).size,
    need = Math.max(1, +S.d.settings.judges - gone);
  if (sc.length < need) return { n, sc, wait: true };
  const t = sc.map(s => s.total),
    avg = t.reduce((a, b) => a + b, 0) / t.length;
  return { n, sc, avg, rec: recog(avg), flag: Math.max(...t) - Math.min(...t) > +S.d.settings.spread };
}
const results = () => S.d.nominees.map(result).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
