// Start-up: restore a saved sign-in, then draw. Also the quiet background refresh.

// Every 2 minutes the sheet is re-read quietly (no overlay, no flicker). The screen is only redrawn when something
// actually changed AND the person is not scoring, typing or editing; otherwise the new data waits until their next click.
const sig = () =>
  JSON.stringify([S.d.nominees, S.d.scores, S.d.settings, S.d.declarations, S.d.moderation, S.d.recusals, S.d.log]);
async function bgRefresh() {
  if (!live() || !S.role || document.hidden || busyN > 0 || S.tab === 'Settings') return;
  const before = sig();
  try {
    await load(true);
  } catch (e) {
    return;
  }
  if (sig() === before) return;
  const a = document.activeElement,
    typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if (typing || S.nom || S.edit || S.tab === 'Moderation') return;
  const y = scrollY;
  render();
  scrollTo(0, y);
}
setInterval(bgRefresh, 120000);

(async () => {
  if (!live()) {
    setTimeout(render, 0);
    return;
  }
  await restoreSession();
  if (!S.role)
    await busy(async () => {
      try {
        const r = await post({ action: 'read' });
        setCats(r);
        S.d.judgeNames = r.judgeNames || [];
        S.d.auditorNames = r.auditorNames || [];
        Object.assign(S.d.settings, r.settings);
      } catch (e) {}
    });
  render();
})();
