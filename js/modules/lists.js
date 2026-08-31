/* ============================================================
   EVER — Listes partagées

   Une liste porte un code court (six caracteres, sans lettres
   ambigues) qui suffit a la rejoindre. Les droits sont explicites :
   voir, ajouter, tout modifier.

   Le partage exige un compte : sans serveur, deux telephones n'ont
   aucun moyen de se parler. Sans compte, tout le reste continue de
   fonctionner en local.
   ============================================================ */
(function (global) {
  'use strict';

  const PERMS = [
    { v: 'view',  n: 'Peut voir' },
    { v: 'add',   n: 'Peut ajouter' },
    { v: 'edit',  n: 'Peut tout modifier' }
  ];

  const KINDS = {
    foods:  { nom: 'Aliments', icon: 'fork' },
    gifts:  { nom: 'Cadeaux',  icon: 'gift' },
    media:  { nom: 'Films et séries', icon: 'film' },
    places: { nom: 'Lieux',    icon: 'pin' },
    autre:  { nom: 'Divers',   icon: 'list' }
  };

  async function open(kind) {
    if (!Cloud.configured()) return offline();
    if (!Cloud.ready()) return needAccount();

    const sheet = UI.openSheet('<div class="mbody">' + UI.thinking('Chargement des listes…') + '</div>');
    let lists = [];
    try { lists = await Cloud.myLists(); } catch (e) { UI.toast('Serveur injoignable'); }
    if (kind) lists = lists.filter((l) => l.kind === kind || !l.kind);

    sheet.querySelector('.mbody') && (sheet.innerHTML =
      '<div class="grabber"><i></i></div><button class="close" data-sheet-close>' + Icon('close', 16) + '</button>' +
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:4px">Listes partagées</h2>' +
        '<p class="secdesc">Un code, et la personne d\'en face voit la même liste.</p>' +
        (lists.length ? '<div class="list">' + lists.map(row).join('') + '</div>'
          : UI.empty('users', 'Aucune liste', 'Créé la première ou rejoins celle de quelqu\'un.')) +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary grow" data-new>' + Icon('plus', 16) + 'Créer</button>' +
          '<button class="btn grow" data-join>' + Icon('link', 16) + 'Rejoindre</button>' +
        '</div>' +
      '</div>');

    sheet.querySelectorAll('[data-list]').forEach((b) => b.onclick = () => openList(lists.find((l) => l.id === b.dataset.list)));
    sheet.querySelector('[data-new]').onclick = () => createFlow(kind);
    sheet.querySelector('[data-join]').onclick = () => joinFlow();
  }

  const row = (l) => '<button class="rowitem" data-list="' + UI.attr(l.id) + '">' +
    '<span class="ic">' + Icon((KINDS[l.kind] || KINDS.autre).icon, 17) + '</span>' +
    '<span class="tx"><b>' + UI.esc(l.name) + '</b><small>Code ' + UI.esc(l.share_code) +
    (l.list_members ? ' · ' + (l.list_members.length + 1) + ' personnes' : '') + '</small></span>' +
    '<span class="rt">' + Icon('next', 15) + '</span></button>';

  async function createFlow(kind) {
    const res = await UI.promptSheet('Nouvelle liste partagée', [
      { name: 'name', label: 'Nom', placeholder: 'Vacances, Couple, Famille…' },
      { name: 'kind', label: 'Type', type: 'select', value: kind || 'autre', options: Object.keys(KINDS).map((k) => ({ v: k, n: KINDS[k].nom })) },
      { name: 'permission', label: 'Droit par défaut', type: 'select', value: 'add', options: PERMS.map((p) => ({ v: p.v, n: p.n })) }
    ], 'Créer');
    if (!res || !res.name) return;
    try {
      const l = await Cloud.createSharedList(res.name, res.kind, res.permission);
      UI.closeSheet();
      shareCode(l);
    } catch (e) { UI.toast(e.message || 'Création impossible'); }
  }

  function shareCode(l) {
    UI.openSheet('<div class="mbody" style="text-align:center;padding-top:10px">' +
      '<h2 style="font-size:22px">' + UI.esc(l.name) + '</h2>' +
      '<p class="secdesc">Donne ce code a qui doit rejoindre.</p>' +
      '<div style="font-size:38px;font-weight:900;letter-spacing:.14em;margin:18px 0;font-variant-numeric:tabular-nums">' + UI.esc(l.share_code) + '</div>' +
      '<button class="btn primary block lg" data-copy>' + Icon('copy', 17) + 'Copier le code</button>' +
      '</div>', { onMount: (s) => s.querySelector('[data-copy]').onclick = () => UI.copy(l.share_code) });
  }

  async function joinFlow() {
    const res = await UI.promptSheet('Rejoindre une liste', [
      { name: 'code', label: 'Code de partage', placeholder: 'K7F2P9' }
    ], 'Rejoindre');
    if (!res || !res.code) return;
    try {
      const l = await Cloud.joinSharedList(res.code.trim());
      UI.toast('Tu as rejoint ' + l.name);
      open(l.kind);
    } catch (e) { UI.toast(e.message || 'Code refusé'); }
  }

  async function openList(l) {
    if (!l) return;
    const sheet = UI.openSheet('<div class="mbody">' + UI.thinking('Chargement…') + '</div>');
    let items = [];
    try { items = await Cloud.listItems(l.id); } catch (e) {}
    sheet.innerHTML = '<div class="grabber"><i></i></div><button class="close" data-sheet-close>' + Icon('close', 16) + '</button>' +
      '<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">' + UI.esc(l.name) + '</h2>' +
      '<p class="secdesc">Code ' + UI.esc(l.share_code) + ' · ' + UI.esc((KINDS[l.kind] || KINDS.autre).nom) + '</p>' +
      (items.length ? '<div class="list">' + items.map((it) =>
        '<div class="rowitem"><span class="ic">' + Icon('check', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(it.data && it.data.nom || '') + '</b><small>' + UI.esc(it.data && it.data.note || '') + '</small></span>' +
        '<button class="rt" data-rm="' + UI.attr(it.id) + '">' + Icon('trash', 16) + '</button></div>').join('') + '</div>'
        : UI.empty('list', 'Liste vide', 'Ajoute la première entrée.')) +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn primary grow" data-add>' + Icon('plus', 16) + 'Ajouter</button>' +
        '<button class="btn grow" data-import>' + Icon('download', 16) + 'Importer chez moi</button>' +
        '<button class="btn ghost" data-share>' + Icon('share', 16) + 'Code</button>' +
      '</div></div>';

    sheet.querySelector('[data-share]').onclick = () => shareCode(l);
    sheet.querySelector('[data-add]').onclick = async () => {
      const r = await UI.promptSheet('Ajouter', [{ name: 'nom', label: 'Nom' }, { name: 'note', label: 'Note', placeholder: 'Facultatif' }], 'Ajouter');
      if (!r || !r.nom) return;
      try { await Cloud.addListItem(l.id, { nom: r.nom, note: r.note }); openList(l); }
      catch (e) { UI.toast('Ajout refusé : vérifie tes droits sur cette liste'); }
    };
    sheet.querySelector('[data-import]').onclick = () => {
      const target = l.kind === 'gifts' ? 'gifts' : l.kind === 'media' ? 'media' : l.kind === 'places' ? 'places' : 'foods';
      let n = 0;
      items.forEach((it) => {
        const nom = it.data && it.data.nom;
        if (!nom) return;
        if (Store.all(target).some((x) => x.nom === nom)) return;
        Store.add(target, { nom: nom, note: it.data.note || '', cat: 'sale', source: 'partage' });
        n++;
      });
      UI.toast(n + ' entrée' + (n > 1 ? 's' : '') + ' importée' + (n > 1 ? 's' : ''));
    };
    sheet.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => {
      try { await Cloud.removeListItem(b.dataset.rm); openList(l); } catch (e) { UI.toast('Suppression refusée'); }
    });
  }

  function needAccount() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">Connecté-toi pour partager</h2>' +
      '<p class="mdesc">Deux telephones ne peuvent pas se parler sans serveur. Le compte sert uniquement a cela : tes listes personnelles fonctionnent déjà sans.</p>' +
      '<button class="btn primary block lg" style="margin-top:18px" data-go>Ouvrir le compte</button></div>',
      { onMount: (s) => s.querySelector('[data-go]').onclick = () => { UI.closeSheet(); App.go('#/m/settings/compte'); } });
  }

  function offline() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">Partage non configuré</h2>' +
      '<p class="mdesc">Le partage a besoin d\'un projet Supabase. Le schéma complet est fourni dans <b>sql/schema.sql</b> : créé le projet, colle le SQL, puis renseigne l\'URL et la clé publique dans Réglages.</p>' +
      '<button class="btn primary block lg" style="margin-top:18px" data-go>Ouvrir les réglages</button></div>',
      { onMount: (s) => s.querySelector('[data-go]').onclick = () => { UI.closeSheet(); App.go('#/m/settings/compte'); } });
  }

  global.Lists = { open, PERMS, KINDS };
})(window);
