/* ============================================================
   EVER — Listes partagées

   Une liste porte un code court (six caractères, sans lettres
   ambiguës) qui suffit à la rejoindre. Les droits sont explicites :
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
    foods:  { nom: 'Délices', icon: 'fork' },
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
          : UI.empty('users', 'Aucune liste', 'Crée la première ou rejoins celle de quelqu\'un.')) +
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
      '<p class="secdesc">Donne ce code à qui doit rejoindre.</p>' +
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
        (IMPORT[l.kind] ? '<button class="btn grow" data-import>' + Icon('download', 16) + 'Importer chez moi</button>' : '') +
        '<button class="btn ghost" data-share>' + Icon('share', 16) + 'Code</button>' +
      '</div></div>';

    sheet.querySelector('[data-share]').onclick = () => shareCode(l);
    sheet.querySelector('[data-add]').onclick = async () => {
      const r = await UI.promptSheet('Ajouter', [{ name: 'nom', label: 'Nom' }, { name: 'note', label: 'Note', placeholder: 'Facultatif' }], 'Ajouter');
      if (!r || !r.nom) return;
      try { await Cloud.addListItem(l.id, { nom: r.nom, note: r.note }); openList(l); }
      catch (e) { UI.toast('Ajout refusé : vérifie tes droits sur cette liste'); }
    };
    const imp = sheet.querySelector('[data-import]');
    if (imp) imp.onclick = () => importer(l, items);
    sheet.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => {
      try { await Cloud.removeListItem(b.dataset.rm); openList(l); } catch (e) { UI.toast('Suppression refusée'); }
    });
  }

  /* ============================================================
     Importer chez moi, selon le type de la liste

     Chaque collection a sa propre forme : un cadeau appartient à
     une personne (champ person), un film porte un titre (titre et
     non nom), un aliment une catégorie d'aliment. Tout importer en
     { nom, cat:'sale' } donnait des cadeaux rattachés à personne,
     donc invisibles, et des films sans titre.
     ============================================================ */
  const norm = (t) => String(t || '').trim().toLowerCase();
  const IMPORT = {
    gifts: {
      existe: (it, ctx) => Store.all('gifts').some((g) => g.person === ctx.person && norm(g.nom) === norm(it.nom)),
      ajouter: (it, ctx) => Store.add('gifts', { person: ctx.person, nom: it.nom, note: it.note || '', cat: 'autre', source: 'partage' })
    },
    media: {
      existe: (it) => Store.all('media').some((m) => norm(m.titre) === norm(it.nom)),
      ajouter: (it) => Store.add('media', {
        titre: it.nom, type: it.type === 'serie' ? 'serie' : 'film', status: 'avoir',
        resume: it.note || '', source: 'partage'
      })
    },
    places: {
      existe: (it) => Store.all('places').some((p) => norm(p.nom) === norm(it.nom)),
      ajouter: (it) => Store.add('places', { nom: it.nom, note: it.note || '', kind: 'autre', source: 'partage' })
    },
    foods: {
      existe: (it) => Store.all('foods').some((f) => norm(f.nom) === norm(it.nom)),
      ajouter: (it) => Store.add('foods', { nom: it.nom, note: it.note || '', cat: 'sale', source: 'partage' })
    }
  };

  async function importer(l, items) {
    const regle = IMPORT[l.kind];
    if (!regle) return;
    const ctx = {};
    if (l.kind === 'gifts') {
      /* Un cadeau sans destinataire n'apparaît nulle part : on
         demande pour qui. */
      const proches = Store.all('people');
      if (!proches.length) { UI.toast("Ajoute d'abord quelqu'un dans Cadeaux"); return; }
      if (proches.length === 1) ctx.person = proches[0].id;
      else {
        const r = await UI.promptSheet('Pour qui ?', [
          { name: 'person', label: 'Ces idées sont pour', type: 'select', value: proches[0].id,
            options: proches.map((p) => ({ v: p.id, n: p.nom })) }
        ], 'Importer');
        if (!r || !r.person) return;
        ctx.person = r.person;
      }
    }
    let n = 0;
    items.forEach((x) => {
      const d = x.data || {};
      const it = { nom: String(d.nom || d.titre || '').trim(), note: d.note || '', type: d.type };
      if (!it.nom || regle.existe(it, ctx)) return;
      regle.ajouter(it, ctx);
      n++;
    });
    UI.toast(n ? n + ' entrée' + (n > 1 ? 's' : '') + ' importée' + (n > 1 ? 's' : '') : 'Tout est déjà chez toi');
  }

  function needAccount() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">Connecté-toi pour partager</h2>' +
      '<p class="mdesc">Deux téléphones ne peuvent pas se parler sans serveur. Le compte sert uniquement à cela : tes listes personnelles fonctionnent déjà sans.</p>' +
      '<button class="btn primary block lg" style="margin-top:18px" data-go>Ouvrir le compte</button></div>',
      { onMount: (s) => s.querySelector('[data-go]').onclick = () => { UI.closeSheet(); App.go('#/m/settings/compte'); } });
  }

  function offline() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">Partage non configuré</h2>' +
      '<p class="mdesc">Le partage a besoin d\'un projet Supabase. Le schéma complet est fourni dans <b>sql/schema.sql</b> : crée le projet, colle le SQL, puis renseigne l\'URL et la clé publique dans Réglages.</p>' +
      '<button class="btn primary block lg" style="margin-top:18px" data-go>Ouvrir les réglages</button></div>',
      { onMount: (s) => s.querySelector('[data-go]').onclick = () => { UI.closeSheet(); App.go('#/m/settings/compte'); } });
  }

  global.Lists = { open, openList, PERMS, KINDS };
})(window);
