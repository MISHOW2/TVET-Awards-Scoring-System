// The page frame: header, tabs and the draw routine every screen goes through.

// The header: who is signed in, the Help link and the tabs for this role.
function chrome() {
  const help = '<a href="#help" id="hl">Help</a>';
  $('#who').innerHTML = !S.role
    ? help
    : (S.role === 'judge' ? help : '') +
      (S.role === 'admin' ? '<span>Synced with Google Sheet</span>' : '') +
      `<span class="chip"><i></i>${esc(S.role === 'admin' ? 'Administrator' : S.name)}</span><button class="btn" id="out">Sign out</button>`;
  const tabs =
    S.role === 'admin'
      ? ['Nominees', 'Results', 'Declarations', 'Moderation', 'Settings', 'Help']
      : S.role === 'auditor'
        ? ['Results', 'Declarations', 'Moderation', 'Help']
        : [];
  $('#tabs').innerHTML = tabs
    .map(t => `<button ${S.tab === t ? 'aria-current="page"' : ''} data-t="${t}">${t}</button>`)
    .join('');
  $('#tabs').onclick = e => {
    if (e.target.dataset.t) {
      S.tab = e.target.dataset.t;
      S.nom = null;
      render();
    }
  };
  $('.brand strong').textContent =
    S.role === 'admin' && S.tab === 'Nominees' ? 'Awards Scoring & Adjudication' : 'Scoring System';
  if ($('#out'))
    $('#out').onclick = () => {
      forgetSession();
      S.role = null;
      S.cred = '';
      S.confirmed = false;
      S.nom = null;
      S.tab = '';
      render();
    };
  if ($('#hl'))
    $('#hl').onclick = e => {
      e.preventDefault();
      S.tab = 'Help';
      render();
    };
}

// Draw the current page. Each admin/auditor tab is a pair: [builds the HTML, attaches its events].
function pageFor(tab) {
  return {
    Nominees: [nomsPage, bindNoms],
    Results: [resultsPage, bindResults],
    Declarations: [declPage, () => {}],
    Moderation: [modPage, bindMod],
    Settings: [settingsPage, bindSettings],
  }[tab];
}
// The nominee form must survive a redraw (searching the register redraws the page), so what was typed is put back.
const FORM_FIELDS = () => ['nn', 'nc', 'nk', 'ni', ...EXTRA_F.map(f => 'x_' + f[0])];
function render() {
  const formUp = S.role === 'admin' && S.tab === 'Nominees' && $('#xd'),
    editing = S.edit || '',
    held = {};
  if (formUp)
    FORM_FIELDS().forEach(i => {
      const el = $('#' + i);
      if (el) held[i] = el.value;
    });
  chrome();
  const a = $('#app');
  if (S.tab === 'Help') a.innerHTML = help();
  else if (!S.role) {
    a.innerHTML = signin();
    bindSignin();
  } else if (S.role === 'judge') {
    if (!S.confirmed) {
      a.innerHTML = confirmPage();
      bindConfirm();
    } else if (S.nom) {
      a.innerHTML = scorePage();
      bindScore();
    } else {
      a.innerHTML = listPage();
      bindList();
    }
  } else {
    S.tab = S.tab || 'Results';
    const v = pageFor(S.tab);
    a.innerHTML = v[0]();
    v[1]();
  }
  if (formUp && !S.fresh && $('#xd') && (S.edit || '') === editing)
    FORM_FIELDS().forEach(i => {
      const el = $('#' + i);
      if (el && held[i] !== undefined) el.value = held[i];
    });
  S.fresh = false;
  fillPanels();
  loadEditDetails();
  saveSession();
}
// Panels marked class="dp" (data-id = nominee) are filled with that nominee's PoE links and details.
function fillPanels() {
  document.querySelectorAll('.dp').forEach(async el => {
    try {
      const f = await detail(el.dataset.id);
      if (el.isConnected)
        el.innerHTML =
          poeBlock(f) +
          '<div style="margin-top:16px"></div>' +
          detailCards(f, (S.d.nominees.find(n => n.id === el.dataset.id) || {}).name);
    } catch (e) {
      if (el.isConnected) el.innerHTML = '<p class="err">Could not load: ' + esc(e.message) + '</p>';
    }
  });
}
// Editing a nominee: load every stored detail into the form first. Saving sends the details only once they are loaded,
// so an edit can never blank what is stored.
function loadEditDetails() {
  if (!(S.role === 'admin' && S.tab === 'Nominees' && S.edit && S.xl !== S.edit && $('#xd'))) return;
  const id = S.edit;
  detail(id)
    .then(f => {
      if (S.edit !== id || !$('#xd')) return;
      EXTRA_F.forEach(([k]) => {
        const el = $('#x_' + k);
        if (el) el.value = f[k] || '';
      });
      S.xl = id;
    })
    .catch(() => {});
}
