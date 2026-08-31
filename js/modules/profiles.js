/* ============================================================
   EVER — Profils et connexions
   Qui partage quoi avec toi, et ce que tu partages.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null;

  async function mount(el) {
    root = el;
    render([]);
    if (Cloud.ready()) {
      try { render(await Cloud.myLists()); } catch (e) { render([]); }
    }
  }

  function render(lists) {
    const u = Cloud.ready() ? Cloud.user() : null;
    const people = Store.all('people');

    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding-top:16px">' +
        (u ? '<div class="panel row" style="gap:14px">' +
              '<span style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-weight:800;font-size:18px">' +
              UI.esc(((u.user_metadata && u.user_metadata.pseudo) || u.email || '?').charAt(0).toUpperCase()) + '</span>' +
              '<div class="grow"><b style="font-size:16px">' + UI.esc((u.user_metadata && u.user_metadata.pseudo) || 'Mon compte') + '</b>' +
              '<small class="muted" style="display:block">' + UI.esc(u.email || '') + '</small></div>' +
              Game.badge() +
            '</div>'
          : '<div class="panel" style="text-align:center;padding:22px 18px">' +
            '<b style="display:block;margin-bottom:6px">Aucun compte</b>' +
            '<p class="muted" style="font-size:13px;margin-bottom:14px">Tout fonctionne en local. Le compte sert à retrouver ses données sur un autre appareil et a partager des listes.</p>' +
            '<button class="btn primary" data-act="account">Créer ou se connecter</button></div>') +
      '</div>' +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Listes partagées</h2>' +
        '<button data-act="lists">Gérer</button></div>' +
        (lists && lists.length ? '<div class="list">' + lists.map((l) =>
          '<div class="rowitem"><span class="ic">' + Icon('users', 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(l.name) + '</b><small>Code ' + UI.esc(l.share_code) + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></div>').join('') + '</div>'
          : '<p class="muted" style="font-size:13px">Aucune liste partagée pour le moment.</p>') +
      '</div>' +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Mes fiches</h2>' +
        '<button data-act="gifts">Ouvrir</button></div>' +
        (people.length ? '<div class="list">' + people.map((p) =>
          '<button class="rowitem" data-p="' + UI.attr(p.id) + '"><span class="ic">' + Icon('user', 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(p.nom) + '</b><small>' + UI.esc(p.relation || '') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>'
          : '<p class="muted" style="font-size:13px">Les personnes ajoutées dans Cadeaux apparaissent ici.</p>') +
      '</div>' +

      '<div class="section"><div class="banner">' + Icon('lock', 18) +
      '<span>Les indices privés des fiches cadeaux ne sont jamais partages, même quand la liste correspondante l\'est.</span></div></div>' +
      '</div>';

    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ({
      account: () => App.go('#/m/settings/compte'),
      lists: () => Lists.open(),
      gifts: () => App.go('#/m/gifts')
    })[b.dataset.act]());
    root.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => App.go('#/m/gifts/' + b.dataset.p));
  }

  App.register('profiles', { mount: mount });
  global.Profiles = { mount };
})(window);
