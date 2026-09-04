/* ============================================================
   EVER — Boite a outils d'interface
   Selecteurs, echappement, feuilles modales, toasts, haptique,
   formatage. Aucune dependance.
   ============================================================ */
(function (global) {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* --- Echappement : tout ce qui vient de l'utilisateur ou d'une API
     passe par la avant d'entrer dans un innerHTML. --- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const attr = (s) => esc(s);

  /* --- Retour physique : vibration + son, délégués à Feedback --- */
  function haptic(kind) {
    if (global.Feedback) global.Feedback.fire(kind || 'light');
    else if ('vibrate' in navigator) { try { navigator.vibrate(8); } catch (e) {} }
  }

  /* --- Toast --- */
  let toastTimer = null;
  function toast(msg, ms) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), ms || 1900);
  }

  /* --- Feuille modale --- */
  const sheetStack = [];
  function openSheet(html, opts) {
    opts = opts || {};
    const ov = $('#ov'), sheet = $('#sheet');
    sheet.innerHTML =
      '<div class="grabber"><i></i></div>' +
      '<button class="close" data-sheet-close aria-label="Fermer">' + Icon('close', 16) + '</button>' +
      html;
    ov.classList.add('on');
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
    if (global.Feedback) global.Feedback.fire('sheetOpen');
    sheetStack.push(opts.onClose || null);
    if (opts.onMount) opts.onMount(sheet);
    return sheet;
  }
  function closeSheet() {
    const ov = $('#ov');
    if (!ov || !ov.classList.contains('on')) return;
    ov.classList.remove('on');
    document.body.style.overflow = '';
    if (global.Feedback) global.Feedback.fire('sheetClose');
    const cb = sheetStack.pop();
    if (cb) cb();
  }

  /* --- Confirmation, remplace window.confirm pour rester dans la DA --- */
  function confirmSheet(title, body, danger) {
    return new Promise((resolve) => {
      let answered = false;
      openSheet(
        '<div class="mbody" style="padding-top:6px">' +
          '<h2 style="font-size:22px">' + esc(title) + '</h2>' +
          '<p class="mdesc">' + esc(body || '') + '</p>' +
          '<div class="btnrow" style="margin-top:22px">' +
            '<button class="btn ' + (danger ? 'danger' : 'primary') + ' grow" data-yes>Confirmer</button>' +
            '<button class="btn ghost" data-no>Annuler</button>' +
          '</div>' +
        '</div>',
        {
          onClose: () => { if (!answered) resolve(false); },
          onMount: (s) => {
            s.querySelector('[data-yes]').onclick = () => { answered = true; closeSheet(); resolve(true); };
            s.querySelector('[data-no]').onclick  = () => { answered = true; closeSheet(); resolve(false); };
          }
        }
      );
    });
  }

  /* --- Invite de saisie --- */
  /* ============================================================
     Le formulaire visuel

     Un formulaire, ca doit se remplir avec le pouce, pas se lire
     comme un questionnaire administratif. Trois principes :

       - une illustration en tete, pour dire de quoi on parle ;
       - des choix qui se touchent (des tuiles, des segments, des
         etoiles) plutot que des menus deroulants ;
       - une seule question par ligne, en gros.

     Types disponibles : text, number, textarea, select (rendu en
     tuiles des qu'il y a peu d'options), tiles, seg, stars.

     Retro-compatible : le troisieme argument accepte toujours une
     simple chaine pour le libelle du bouton.
     ============================================================ */
  function promptSheet(title, fields, opts) {
    if (typeof opts === 'string') opts = { submit: opts };
    opts = opts || {};

    return new Promise((resolve) => {
      let answered = false;
      const etat = {};
      fields.forEach((f) => { etat[f.name] = f.value == null ? '' : String(f.value); });

      const tuiles = (f) => {
        const o = f.options || [];
        return '<div class="tuiles" data-tuiles="' + attr(f.name) + '">' + o.map((x) =>
          '<button type="button" class="tuile' + (String(x.v) === etat[f.name] ? ' on' : '') + '"' +
          ' data-v="' + attr(x.v) + '">' +
          '<span class="im">' + (global.Stock ? Stock.ic(x.ph || x.n, { type: f.phType || 'icone' }) : '') + '</span>' +
          '<b>' + esc(x.n) + '</b></button>').join('') + '</div>';
      };

      const segments = (f) => '<div class="seg large" data-seg="' + attr(f.name) + '">' +
        (f.options || []).map((x) => '<button type="button" data-v="' + attr(x.v) + '"' +
          (String(x.v) === etat[f.name] ? ' class="on"' : '') + '>' + esc(x.n) + '</button>').join('') + '</div>';

      const etoiles = (f) => '<div class="stars" data-stars="' + attr(f.name) + '">' +
        [1, 2, 3, 4, 5].map((i) => '<button type="button" data-v="' + i + '"' +
          (Number(etat[f.name]) >= i ? ' class="on"' : '') + '>' + Icon('star', 26) + '</button>').join('') +
        '<span class="val"></span></div>';

      const bloc = (f, inner, plein) =>
        '<div class="champ' + (plein ? ' plein' : '') + '">' +
        '<span class="lb">' + esc(f.label) + '</span>' + inner +
        (f.hint ? '<i class="hint">' + esc(f.hint) + '</i>' : '') + '</div>';

      const body = fields.map((f) => {
        if (f.type === 'textarea') {
          return bloc(f, '<textarea name="' + attr(f.name) + '" rows="3" placeholder="' +
            attr(f.placeholder || '') + '">' + esc(f.value || '') + '</textarea>', true);
        }
        if (f.type === 'tiles' || (f.type === 'select' && (f.options || []).length <= 14)) {
          return bloc(f, tuiles(f), true);
        }
        if (f.type === 'select') {
          return bloc(f, '<select name="' + attr(f.name) + '">' +
            (f.options || []).map((o) => '<option value="' + attr(o.v) + '"' +
              (String(o.v) === etat[f.name] ? ' selected' : '') + '>' + esc(o.n) + '</option>').join('') +
            '</select>', true);
        }
        if (f.type === 'seg') return bloc(f, segments(f), true);
        if (f.type === 'stars') return bloc(f, etoiles(f), true);
        if (f.type === 'number') {
          /* Les fleches natives d'un champ numerique font deux
             pixels de haut et changent d'aspect a chaque
             navigateur. Deux vrais boutons, assez gros pour le
             pouce, et le champ reste editable au clavier. */
          return bloc(f, '<div class="compteur" data-cpt="' + attr(f.name) + '">' +
            '<button type="button" data-pas="-1" aria-label="Moins">' + Icon('minus', 20) + '</button>' +
            '<input name="' + attr(f.name) + '" type="number" inputmode="decimal"' +
            (f.step ? ' step="' + attr(f.step) + '"' : '') +
            ' placeholder="' + attr(f.placeholder || '') + '"' +
            ' value="' + attr(f.value == null ? '' : f.value) + '">' +
            '<button type="button" data-pas="1" aria-label="Plus">' + Icon('plus', 20) + '</button>' +
            '</div>', true);
        }
        return bloc(f, '<input name="' + attr(f.name) + '" type="' + attr(f.type || 'text') + '" ' +
          (f.step ? 'step="' + attr(f.step) + '" ' : '') +
          (f.inputmode ? 'inputmode="' + attr(f.inputmode) + '" ' : '') +
          'placeholder="' + attr(f.placeholder || '') + '" value="' + attr(f.value == null ? '' : f.value) + '">');
      }).join('');

      const tete =
        '<div class="mtete' + (opts.teinte ? '' : '') + '"' +
        (opts.teinte ? ' style="--t1:' + attr(opts.teinte[0]) + ';--t2:' + attr(opts.teinte[1]) + '"' : '') + '>' +
        '<span class="ill">' + (opts.art && global.Art ? Art(opts.art, 46)
          : (opts.photo && global.Stock ? Stock.ic(opts.photo, { classe: 'gr' }) : '')) + '</span>' +
        '<h2>' + esc(title) + '</h2>' +
        (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') +
        '</div>';

      openSheet(
        tete + '<div class="mbody form-visuel">' +
        '<form data-form>' + body +
        '<button class="btn primary block lg" style="margin-top:18px" type="submit">' +
        esc(opts.submit || 'Enregistrer') + '</button>' +
        '</form></div>',
        {
          onClose: () => { if (!answered) resolve(null); },
          onMount: (s) => {
            const form = s.querySelector('[data-form]');
            if (global.Stock) Stock.peupler(s);

            s.querySelectorAll('[data-tuiles]').forEach((g) => {
              g.querySelectorAll('.tuile').forEach((b) => b.onclick = () => {
                etat[g.dataset.tuiles] = b.dataset.v;
                g.querySelectorAll('.tuile').forEach((x) => x.classList.remove('on'));
                b.classList.add('on');
                haptic('select');
              });
            });
            s.querySelectorAll('[data-seg]').forEach((g) => {
              g.querySelectorAll('button').forEach((b) => b.onclick = () => {
                etat[g.dataset.seg] = b.dataset.v;
                g.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
                b.classList.add('on');
                haptic('select');
              });
            });
            s.querySelectorAll('[data-stars]').forEach((g) => {
              g.querySelectorAll('button').forEach((b) => b.onclick = () => {
                const v = Number(b.dataset.v);
                etat[g.dataset.stars] = String(v);
                g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', Number(x.dataset.v) <= v));
                haptic('select');
              });
            });

            s.querySelectorAll('[data-cpt]').forEach((g) => {
              const inp = g.querySelector('input');
              const pas = Number(inp.getAttribute('step')) || 1;
              g.querySelectorAll('[data-pas]').forEach((b) => b.onclick = () => {
                const v = (parseFloat(inp.value) || 0) + Number(b.dataset.pas) * pas;
                inp.value = Math.round(v * 1000) / 1000;
                haptic('tick');
              });
            });

            const first = form.querySelector('input,textarea');
            if (first && !opts.pasDeFocus) setTimeout(() => first.focus(), 300);

            form.onsubmit = (e) => {
              e.preventDefault();
              const out = {};
              fields.forEach((f) => {
                const el = form.elements[f.name];
                out[f.name] = el && el.value != null ? String(el.value).trim() : (etat[f.name] || '');
              });
              answered = true; closeSheet(); resolve(out);
            };
          }
        }
      );
    });
  }

  /* --- Formatage --- */
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = {
    n: (v, d) => (v == null || isNaN(v)) ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d == null ? 0 : d }).format(v),
    g: (v) => (v == null || isNaN(v)) ? '—' : Math.round(v) + ' g',
    kcal: (v) => (v == null || isNaN(v)) ? '—' : nf.format(Math.round(v)) + ' kcal',
    pct: (v) => (v == null || isNaN(v)) ? '—' : Math.round(v) + ' %',
    km: (v) => v == null ? '—' : (v < 1 ? Math.round(v * 1000) + ' m' : v.toFixed(1).replace('.', ',') + ' km'),
    dur: (min) => {
      if (min == null || isNaN(min)) return '—';
      const h = Math.floor(min / 60), m = Math.round(min % 60);
      return h ? h + ' h ' + (m ? String(m).padStart(2, '0') : '') : m + ' min';
    },
    date: (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    dateShort: (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    time: (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  };

  /* --- Dates --- */
  const day = {
    key: (d) => { const x = d ? new Date(d) : new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); },
    add: (key, n) => { const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d + n); return day.key(x); },
    today: () => day.key(),
    label: (key) => {
      if (key === day.today()) return "Aujourd'hui";
      if (key === day.add(day.today(), -1)) return 'Hier';
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    },
    season: (d) => { const m = (d ? new Date(d) : new Date()).getMonth() + 1;
      return m <= 2 || m === 12 ? 'hiver' : m <= 5 ? 'printemps' : m <= 8 ? 'ete' : 'automne'; },
    slot: (d) => { const h = (d ? new Date(d) : new Date()).getHours();
      return h < 6 ? 'nuit' : h < 11 ? 'matin' : h < 14 ? 'midi' : h < 18 ? 'après-midi' : h < 23 ? 'soiree' : 'nuit'; }
  };

  /* --- Divers --- */
  const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms || 220); }; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copié'); return true; }
    catch (e) { toast('Copie impossible'); return false; }
  }

  /* --- Anneau de progression --- */
  function ring(value, max, label, sub, color) {
    const r = 46, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, max ? value / max : 0));
    return '<div class="ring">' +
      '<svg viewBox="0 0 112 112"><circle class="bgc" cx="56" cy="56" r="' + r + '" stroke-width="11"/>' +
      '<circle class="fgc" cx="56" cy="56" r="' + r + '" stroke-width="11" ' +
      (color ? 'style="stroke:' + attr(color) + '" ' : '') +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p)).toFixed(1) + '"/></svg>' +
      '<div class="lab"><div><b>' + esc(label) + '</b><span>' + esc(sub || '') + '</span></div></div></div>';
  }

  /* --- Courbe simple --- */
  function sparkline(values, color) {
    const v = (values || []).filter((x) => typeof x === 'number' && !isNaN(x));
    if (v.length < 2) return '<div class="spark"></div>';
    const min = Math.min.apply(null, v), max = Math.max.apply(null, v);
    const span = (max - min) || 1;
    const w = 100, h = 40;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * w, h - ((y - min) / span) * (h - 6) - 3]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = d + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
    const col = color || 'var(--accent)';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + area + '" fill="' + col + '" opacity=".12"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '</svg>';
  }

  function empty(iconName, title, text) {
    return '<div class="empty"><div class="ei">' + Icon(iconName || 'info', 26) + '</div>' +
      '<b>' + esc(title) + '</b><p>' + esc(text || '') + '</p></div>';
  }

  function thinking(text) {
    return '<div class="thinking"><div class="spinner"></div>' + esc(text || 'Un instant…') + '</div>';
  }

  /* --- Le petit point d'interrogation ---------------------------
     Tout ce qui est vrai mais dont personne n'a besoin pour agir
     part ici : dosages officiels, précisions de mesure, mises en
     garde. Le texte visible reste court, le détail attend qu'on le
     demande.

     Ça ouvre son propre calque et non une feuille modale : on doit
     pouvoir demander une précision depuis l'intérieur d'une fiche
     sans la faire disparaître. */
  function hint(text, title) {
    return '<button type="button" class="hintq" data-hint="' + attr(text) + '"' +
      (title ? ' data-hint-t="' + attr(title) + '"' : '') +
      ' aria-label="En savoir plus">?</button>';
  }
  function showHint(text, title) {
    let pop = $('#hintpop');
    if (!pop) { pop = document.createElement('div'); pop.id = 'hintpop'; document.body.appendChild(pop); }
    pop.innerHTML = '<div class="hintcard">' +
      '<h4>' + esc(title || 'Pour info') + '</h4>' +
      String(text).split('\n').filter(Boolean).map((l) => '<p>' + esc(l) + '</p>').join('') +
      '<button type="button" class="btn soft block" data-hint-close>Compris</button></div>';
    pop.classList.add('on');
  }
  function hideHint() { const p = $('#hintpop'); if (p) p.classList.remove('on'); }

  /* ============================================================
     La grande carte

     Le modele repris des maquettes : le visuel occupe le haut, un
     degrade le fond dans le texte, le titre et les informations se
     posent par-dessus, une pastille de valeur se cale a droite du
     titre, et l'action principale est une large pilule claire en
     bas de la carte.

     Un seul composant pour tous les endroits qui montrent une
     chose a choisir : un lieu, une boisson, un film, une tenue.
     Ils se ressemblent parce qu'ils font la meme promesse.

     opts : { image, degrade, sur, titre, valeur, texte, puces[],
              action{label,icon}, actions[] }
     ============================================================ */
  function grandeCarte(o) {
    o = o || {};
    const visuel = o.image
      ? '<img src="' + attr(o.image) + '" alt="" loading="lazy">'
      : '';
    const fond = o.degrade
      ? ' style="--g1:' + o.degrade[0] + ';--g2:' + o.degrade[1] + '"'
      : '';
    const puces = (o.puces || []).filter(Boolean);
    const actions = o.actions || (o.action ? [o.action] : []);

    return '<div class="gcarte' + (o.image ? '' : ' sansphoto') + (o.compacte ? ' compacte' : '') + '"' + fond + '>' +
      '<div class="visuel">' + visuel + '</div>' +
      '<div class="ombre"></div>' +
      '<div class="corps">' +
        (o.sur ? '<div class="sur">' + esc(o.sur) + '</div>' : '') +
        '<div class="titreligne">' +
          '<h3>' + esc(o.titre || '') + '</h3>' +
          (o.valeur ? '<span class="valeur">' + esc(o.valeur) + '</span>' : '') +
        '</div>' +
        (o.texte ? '<p>' + esc(o.texte) + '</p>' : '') +
        (puces.length ? '<div class="puces">' + puces.map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>' : '') +
        (actions.length
          ? '<div class="actions">' + actions.map((a, i) =>
              '<button class="cta' + (i ? ' secondaire' : '') + '" data-cta="' + attr(a.id || String(i)) + '">' +
                (a.icon ? Icon(a.icon, 17) : '') + esc(a.label) + '</button>').join('') + '</div>'
          : '') +
      '</div>' +
    '</div>';
  }

  global.UI = {
    $, $$, esc, attr, haptic, toast,
    openSheet, closeSheet, confirmSheet, promptSheet,
    hint, showHint, hideHint, grandeCarte,
    fmt, day, uid, clamp, debounce, sleep, download, copy,
    ring, sparkline, empty, thinking
  };

  /* Fermetures globales */
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-hint]');
    if (q) {
      e.preventDefault(); e.stopPropagation();
      haptic('light');
      showHint(q.dataset.hint, q.dataset.hintT);
      return;
    }
    if (e.target.closest('[data-hint-close]') || e.target.id === 'hintpop') { hideHint(); return; }
    if (e.target.closest('[data-sheet-close]')) closeSheet();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const p = $('#hintpop');
    if (p && p.classList.contains('on')) { hideHint(); return; }
    closeSheet();
  });
})(window);
