/* ============================================================
   EVER — Réglages
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, focus = null;

  function mount(el, rest) {
    root = el;
    focus = rest && rest[0];
    render();
    if (focus) {
      const t = root.querySelector('[data-sec="' + focus + '"]');
      if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }

  function render() {
    const u = Cloud.ready() ? Cloud.user() : null;
    const g = Food.goals(), hg = Health.goals();
    const theme = Store.get('theme', 'auto');

    root.innerHTML = '<div class="wrap">' +

      /* ---- Compte ---- */
      '<div class="section" data-sec="compte" style="padding-top:16px">' +
        '<div class="sechead"><h2 style="font-size:16px">Compte</h2></div>' +
        (u ? '<div class="list">' +
              '<button class="rowitem" data-act="avatar">' + avatarBubble(38) +
                '<span class="tx"><b>' + UI.esc((u.user_metadata && u.user_metadata.pseudo) || 'Connecté') + '</b>' +
                '<small>' + UI.esc(u.email) + '</small></span>' +
                '<span class="rt">' + (Store.get('avatar', null) || Store.get('avatarUrl', null) ? 'Changer' : 'Ajouter une photo') + Icon('next', 15) + '</span></button>' +
              '<button class="rowitem" data-act="pseudo"><span class="ic">' + Icon('edit', 17) + '</span>' +
                '<span class="tx"><b>Pseudo</b></span>' +
                '<span class="rt">' + UI.esc((u.user_metadata && u.user_metadata.pseudo) || '—') + Icon('next', 15) + '</span></button>' +
              '<button class="rowitem" data-act="sync"><span class="ic">' + Icon('sync', 17) + '</span>' +
                '<span class="tx"><b>Synchroniser maintenant</b><small>' + lastSync() + '</small></span>' +
                '<span class="rt">' + Icon('next', 15) + '</span></button>' +
              '<button class="rowitem" data-act="signout"><span class="ic" style="background:var(--danger-soft);color:var(--danger)">' + Icon('logout', 17) + '</span>' +
                '<span class="tx"><b>Se déconnecter</b></span><span class="rt">' + Icon('next', 15) + '</span></button>' +
            '</div>'
          : Cloud.configured()
            ? '<div class="list">' +
                '<button class="rowitem" data-act="login"><span class="ic">' + Icon('lock', 17) + '</span>' +
                  '<span class="tx"><b>Se connecter</b><small>Retrouver ses données partout</small></span>' +
                  '<span class="rt">' + Icon('next', 15) + '</span></button>' +
                '<button class="rowitem" data-act="signup"><span class="ic">' + Icon('plus', 17) + '</span>' +
                  '<span class="tx"><b>Créer un compte</b></span><span class="rt">' + Icon('next', 15) + '</span></button>' +
              '</div>'
            : '<div class="banner" style="margin-bottom:10px">' + Icon('info', 18) +
              '<span>Aucun projet Supabase n\'est configuré : l\'application fonctionne en local, sans compte ni partage. ' +
              'Le schéma complet à coller est dans <b>sql/schema.sql</b>.</span></div>' +
              '<button class="btn block" data-act="supabase">' + Icon('key', 16) + 'Renseigner un projet Supabase</button>') +
        (Cloud.configured() && !u ? '<p class="muted" style="font-size:11.5px;margin-top:10px;line-height:1.5">' +
          'Base connectée. EVER vit dans son propre schéma Postgres, isolé des autres applications du même projet : ' +
          'aucune table n\'est partagée, seul le compte l\'est.</p>' : '') +
      '</div>' +

      /* ---- IA ---- */
      '<div class="section" data-sec="ia">' +
        '<div class="sechead"><h2 style="font-size:16px">Intelligence artificielle</h2></div>' +
        '<div class="list">' +
          '<button class="rowitem" data-act="gemini"><span class="ic">' + Icon('sparkle', 17) + '</span>' +
            '<span class="tx"><b>Clé Gemini</b><small>' + (Store.get('geminiKey', '') ? 'Configurée · ' + mask(Store.get('geminiKey', '')) : 'Non configurée') + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="tmdb"><span class="ic">' + Icon('film', 17) + '</span>' +
            '<span class="tx"><b>Clé TMDB</b><small>' + (Store.get('tmdbKey', '') ? 'Configurée' : 'Facultative, pour les affiches de films') + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="google"><span class="ic">' + Icon('calendar', 17) + '</span>' +
            '<span class="tx"><b>Google Calendar</b><small>' + (Store.get('googleClientId', '') ? 'Configuré' : 'Sans cela, les événements passent par un fichier .ics') + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="diag"><span class="ic">' + Icon('activity', 17) + '</span>' +
            '<span class="tx"><b>Tester l\'IA</b><small>' +
            (AI.currentModel() ? 'Modèle actif : ' + UI.esc(AI.currentModel()) : 'Vérifie la clé et choisit le modèle') +
            '</small></span><span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="clearcache"><span class="ic">' + Icon('refresh', 17) + '</span>' +
            '<span class="tx"><b>Vider le cache des réponses IA</b></span><span class="rt">' + Icon('next', 15) + '</span></button>' +
        '</div>' +
        '<div class="banner warn" style="margin-top:10px">' + Icon('alert', 18) +
        '<span>Une clé Google posée en clair dans un dépôt public est lisible par tout le monde. ' +
        'Celle-ci reste sur cet appareil et n\'est jamais publiée. Pour une vraie mise en ligne, ' +
        'passe par la fonction edge fournie dans <b>sql/edge/gemini-proxy.ts</b>.</span></div>' +
      '</div>' +

      /* ---- Objectifs ---- */
      '<div class="section" data-sec="objectifs">' +
        '<div class="sechead"><h2 style="font-size:16px">Objectifs</h2></div>' +
        '<div class="list">' +
          row('flame', 'Calories', UI.fmt.n(g.kcal) + ' kcal', 'goalsFood') +
          row('activity', 'Protéines', UI.fmt.n(g.prot) + ' g', 'goalsFood') +
          row('steps', 'Pas', UI.fmt.n(hg.steps), 'goalsHealth') +
          row('moon', 'Sommeil', UI.fmt.dur(hg.sleep), 'goalsHealth') +
        '</div>' +
      '</div>' +

      /* ---- Nutrition externe ---- */
      '<div class="section" data-sec="nutrition">' +
        '<div class="sechead"><h2 style="font-size:16px">MyFitnessPal et compagnie</h2></div>' +
        '<div class="banner" style="margin-bottom:10px">' + Icon('info', 18) +
        '<span><b>Ce qui est possible, précisément.</b> MyFitnessPal a ferme son API publique en 2020 : ' +
        'seuls des partenaires sous contrat y accèdent, et aucune bibliotheque ne contourne cela sans stocker ton mot de passe. ' +
        'Le pont passe donc par des fichiers, dans les deux sens. Tes exports MFP rentrent, tes journées ressortent.</span></div>' +
        '<div class="list">' +
          '<button class="rowitem" data-act="mfpImport"><span class="ic">' + Icon('download', 17) + '</span>' +
            '<span class="tx"><b>Importer un export MyFitnessPal</b><small>Fichier CSV</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="mfpExport"><span class="ic">' + Icon('upload', 17) + '</span>' +
            '<span class="tx"><b>Exporter mon journal</b><small>CSV compatible</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        '</div>' +
      '</div>' +

      /* ---- Apparence et cartes ---- */
      '<div class="section" data-sec="apparence">' +
        '<div class="sechead"><h2 style="font-size:16px">Apparence</h2></div>' +
        '<div class="panel"><div class="row-between" style="margin-bottom:10px"><b style="font-size:14px">Thème</b></div>' +
        '<div class="seg full">' + [['auto', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']].map((t) =>
          '<button data-theme="' + t[0] + '" class="' + (theme === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div></div>' +
        '<div class="panel" style="margin-top:10px"><div class="row-between" style="margin-bottom:10px"><b style="font-size:14px">Cartes</b></div>' +
        '<div class="seg full">' + [['apple', 'Plans'], ['google', 'Google Maps']].map((t) =>
          '<button data-maps="' + t[0] + '" class="' + (Store.get('mapsProvider', 'apple') === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div></div>' +
        '<div class="list" style="margin-top:10px">' +
          '<button class="rowitem" data-act="haptics"><span class="ic">' + Icon('activity', 17) + '</span>' +
            '<span class="tx"><b>Vibrations</b><small>Retour au toucher sur iPhone</small></span>' +
            '<span class="switch ' + (Store.get('haptics', true) ? 'on' : '') + '"></span></button>' +
          '<button class="rowitem" data-act="sound"><span class="ic">' + Icon('bell', 17) + '</span>' +
            '<span class="tx"><b>Sons</b><small>Coupés par défaut</small></span>' +
            '<span class="switch ' + (Store.get('sound', false) ? 'on' : '') + '"></span></button>' +
          '<button class="rowitem" data-act="weather"><span class="ic">' + Icon('cloud', 17) + '</span>' +
            '<span class="tx"><b>Tenir compte de la météo</b></span>' +
            '<span class="switch ' + (Store.get('useWeather', true) ? 'on' : '') + '"></span></button>' +
        '</div>' +
      '</div>' +

      /* ---- Données ---- */
      '<div class="section" data-sec="donnees">' +
        '<div class="sechead"><h2 style="font-size:16px">Mes données</h2></div>' +
        '<div class="list">' +
          '<button class="rowitem" data-act="export"><span class="ic">' + Icon('download', 17) + '</span>' +
            '<span class="tx"><b>Tout exporter</b><small>' + Math.round(Store.usage() / 1024) + ' Ko en local</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="import"><span class="ic">' + Icon('upload', 17) + '</span>' +
            '<span class="tx"><b>Importer une sauvegarde</b></span><span class="rt">' + Icon('next', 15) + '</span></button>' +
          '<button class="rowitem" data-act="wipe"><span class="ic" style="background:var(--danger-soft);color:var(--danger)">' + Icon('trash', 17) + '</span>' +
            '<span class="tx"><b>Tout effacer</b><small>Definitif sur cet appareil</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        '</div>' +
      '</div>' +

      /* ---- À propos ---- */
      '<div class="section">' +
        '<div class="panel" style="text-align:center">' +
          '<img src="icons/icon-96.png" alt="" style="width:52px;height:52px;border-radius:15px;margin:0 auto 10px">' +
          '<b style="display:block;font-size:16px">EVER</b>' +
          '<small class="muted">Version ' + UI.esc((global.EVER_CONFIG || {}).appVersion || '2.0.0') + '</small>' +
          '<p class="muted" style="font-size:12px;margin-top:12px;line-height:1.55">' +
          'Projet personnel. Les recettes Starbucks sont des reconstitutions non officielles, ' +
          'les dosages cocktails suivent l\'IBA quand il existe. L\'abus d\'alcool est dangereux pour la sante. ' +
          'Les analyses nutritionnelles et sante sont indicatives et ne remplacent pas un professionnel.</p>' +
        '</div>' +
      '</div>' +
      '</div>';

    bind();
    Photos.hydrate(root);
  }

  /* La pastille de compte : photo si elle existe, initiale sinon. */
  function avatarBubble(size) {
    const id = Store.get('avatar', null), url = Store.get('avatarUrl', null);
    const u = Cloud.ready() ? Cloud.user() : null;
    const initiale = u ? ((u.user_metadata && u.user_metadata.pseudo) || u.email || '?').charAt(0).toUpperCase() : '?';
    const s = size || 38;
    return '<span class="ic" style="position:relative;width:' + s + 'px;height:' + s + 'px;border-radius:50%;overflow:hidden;' +
      'background:var(--accent);color:#fff;font-weight:800;font-size:' + Math.round(s * 0.42) + 'px">' +
      UI.esc(initiale) +
      ((id || url) ? Photos.img({ photo: id, photoUrl: url }, 'photo',
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover') : '') +
      '</span>';
  }

  const row = (ic, k, v, act) => '<button class="rowitem" data-act="' + act + '"><span class="ic">' + Icon(ic, 17) + '</span>' +
    '<span class="tx"><b>' + UI.esc(k) + '</b></span><span class="rt">' + UI.esc(v) + Icon('next', 15) + '</span></button>';
  const mask = (k) => k.slice(0, 6) + '…' + k.slice(-4);
  const lastSync = () => { const t = Store.get('_lastSync', 0); return t ? 'Dernière fois ' + UI.fmt.dateShort(t) + ' a ' + UI.fmt.time(t) : 'Jamais'; };

  function bind() {
    root.querySelectorAll('[data-theme]').forEach((b) => b.onclick = () => { Store.set('theme', b.dataset.theme); App.applyTheme(); render(); });
    root.querySelectorAll('[data-maps]').forEach((b) => b.onclick = () => { Store.set('mapsProvider', b.dataset.maps); render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
  }

  const acts = {
    /* --- Compte --- */
    login: () => authSheet('login'),
    signup: () => authSheet('signup'),
    signout: async () => {
      if (!await UI.confirmSheet('Se déconnecter', 'Tes données restent sur cet appareil.', false)) return;
      await Cloud.signOut(); render();
    },
    sync: async () => { UI.toast('Synchronisation…'); await Store.pull(); await Store.push(); render(); UI.toast('À jour'); },

    /* Photo de compte : enregistrée comme les autres, en local et en
       ligne, et recopiée dans le profil Supabase pour qu'elle suive
       le compte plutôt que l'appareil. */
    avatar: () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        const f = input.files && input.files[0];
        if (!f) return;
        UI.toast('Enregistrement…');
        try {
          const saved = await Photos.save(f, 'avatars', 512);
          Store.set('avatar', saved.id);
          Store.set('avatarUrl', saved.url || null);
          if (saved.url && Cloud.ready()) { try { await Cloud.updateProfile({ avatar_url: saved.url }); } catch (e) {} }
          App.refreshTopbar();
          render();
          UI.toast(saved.url ? 'Photo enregistrée' : 'Photo enregistrée sur cet appareil');
        } catch (e) { UI.toast("Photo impossible à enregistrer"); }
      };
      input.click();
    },
    pseudo: async () => {
      const u = Cloud.ready() ? Cloud.user() : null;
      const r = await UI.promptSheet('Mon pseudo', [
        { name: 'pseudo', label: 'Pseudo', value: (u && u.user_metadata && u.user_metadata.pseudo) || '' }
      ], 'Enregistrer');
      if (!r || !r.pseudo) return;
      try { await Cloud.updateProfile({ pseudo: r.pseudo }); App.refreshTopbar(); render(); UI.toast('Pseudo mis à jour'); }
      catch (e) { UI.toast('Modification impossible'); }
    },
    supabase: async () => {
      const r = await UI.promptSheet('Projet Supabase', [
        { name: 'url', label: 'URL du projet', value: Store.get('supabaseUrl', ''), placeholder: 'https://xxxx.supabase.co', hint: 'Réglages > API > Project URL' },
        { name: 'key', label: 'Clé publique (anon)', value: Store.get('supabaseAnonKey', ''), placeholder: 'eyJhbGciOi…', hint: 'Publiable : ce sont les policies RLS qui protegent les données' }
      ], 'Enregistrer');
      if (!r) return;
      Store.set('supabaseUrl', r.url.trim().replace(/\/$/, ''));
      Store.set('supabaseAnonKey', r.key.trim());
      UI.toast('Connexion au projet…');
      const ok = await Cloud.init();
      UI.toast(ok ? 'Projet connecté' : 'Projet injoignable : vérifie l\'URL');
      render();
    },

    /* --- IA --- */
    gemini: async () => {
      const r = await UI.promptSheet('Clé Gemini', [
        { name: 'key', label: 'Clé d\'API', value: Store.get('geminiKey', ''), placeholder: 'AIza…',
          hint: 'A créer sur aistudio.google.com. Elle reste sur cet appareil.' },
        { name: 'proxy', label: 'Ou une adresse de proxy', value: Store.get('geminiProxyUrl', ''), placeholder: 'https://…/functions/v1/gemini',
          hint: 'Si renseignee, la clé n\'est plus nécessaire' }
      ], 'Enregistrer');
      if (!r) return;
      Store.set('geminiKey', r.key.trim());
      Store.set('geminiProxyUrl', r.proxy.trim());
      if (r.key.trim() || r.proxy.trim()) {
        UI.toast('Vérification…');
        AI.forget();
        const t = await AI.selfTest();
        UI.toast(t.ok ? 'IA active · ' + t.model : t.message);
      }
      render();
    },
    tmdb: async () => {
      const r = await UI.promptSheet('Clé TMDB', [
        { name: 'key', label: 'Clé d\'API (v3)', value: Store.get('tmdbKey', ''),
          hint: 'Gratuite sur themoviedb.org. Sert uniquement aux affiches et aux fiches de films.' }
      ], 'Enregistrer');
      if (!r) return;
      Store.set('tmdbKey', r.key.trim()); render();
    },
    google: async () => {
      const r = await UI.promptSheet('Google Calendar', [
        { name: 'id', label: 'Identifiant client OAuth', value: Store.get('googleClientId', ''),
          placeholder: '…apps.googleusercontent.com',
          hint: 'Console Google Cloud, type « application web », avec ce domaine en origine autorisée.' }
      ], 'Enregistrer');
      if (!r) return;
      Store.set('googleClientId', r.id.trim()); render();
    },
    clearcache: () => { AI.clearCache(); AI.forget(); UI.toast('Cache vidé'); render(); },

    /* Diagnostic : dit exactement ce qui bloque, plutôt que le
       sempiternel « impossible de récupérer les suggestions ». */
    diag: async () => {
      UI.openSheet('<div class="mbody">' + UI.thinking('Test en cours…') + '</div>');
      AI.forget();
      const r = await AI.selfTest();
      UI.openSheet('<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">' + (r.ok ? "L'IA répond" : "L'IA ne répond pas") + '</h2>' +
        (r.ok
          ? '<div class="banner ok">' + Icon('check', 18) + '<span>Tout fonctionne.</span></div>' +
            '<div class="list" style="margin-top:12px">' +
              '<div class="rowitem"><span class="tx"><b>Modèle texte</b></span><span class="rt">' + UI.esc(r.model) + '</span></div>' +
              (r.imageModel ? '<div class="rowitem"><span class="tx"><b>Modèle image</b></span><span class="rt">' + UI.esc(r.imageModel) + '</span></div>' : '') +
              (r.count ? '<div class="rowitem"><span class="tx"><b>Modèles disponibles</b></span><span class="rt">' + r.count + '</span></div>' : '') +
            '</div>' +
            '<p class="muted" style="font-size:12px;margin-top:12px">Le modèle est choisi automatiquement parmi ce que Google expose, ' +
            "et revérifié chaque semaine. Si Google en retire un, l'application bascule toute seule.</p>"
          : '<div class="banner danger">' + Icon('alert', 18) + '<span>' + UI.esc(r.message) + '</span></div>' +
            (r.detail ? '<p class="muted" style="font-size:11.5px;margin-top:12px;word-break:break-word">' + UI.esc(String(r.detail).slice(0, 300)) + '</p>' : '')) +
        '<button class="btn block" style="margin-top:16px" data-sheet-close>Fermer</button></div>');
      render();
    },

    /* --- Objectifs --- */
    goalsFood: async () => {
      const g = Food.goals();
      const r = await UI.promptSheet('Objectifs alimentaires', [
        { name: 'kcal', label: 'Calories', type: 'number', inputmode: 'numeric', value: g.kcal },
        { name: 'prot', label: 'Protéines (g)', type: 'number', inputmode: 'numeric', value: g.prot },
        { name: 'carb', label: 'Glucides (g)', type: 'number', inputmode: 'numeric', value: g.carb },
        { name: 'fat', label: 'Lipides (g)', type: 'number', inputmode: 'numeric', value: g.fat },
        { name: 'fiber', label: 'Fibres (g)', type: 'number', inputmode: 'numeric', value: g.fiber },
        { name: 'water', label: 'Eau (ml)', type: 'number', inputmode: 'numeric', value: g.water }
      ], 'Enregistrer');
      if (!r) return;
      const out = {};
      Object.keys(r).forEach((k) => { if (r[k] !== '') out[k] = Number(r[k]); });
      Store.set('nutriGoals', Object.assign(Food.goals(), out));
      render();
    },
    goalsHealth: async () => {
      const g = Health.goals();
      const r = await UI.promptSheet('Objectifs santé', [
        { name: 'steps', label: 'Pas', type: 'number', inputmode: 'numeric', value: g.steps },
        { name: 'exercise', label: 'Minutes d\'exercice', type: 'number', inputmode: 'numeric', value: g.exercise },
        { name: 'active', label: 'Calories actives', type: 'number', inputmode: 'numeric', value: g.active },
        { name: 'sleep', label: 'Sommeil (minutes)', type: 'number', inputmode: 'numeric', value: g.sleep }
      ], 'Enregistrer');
      if (!r) return;
      Store.set('healthGoals', { steps: +r.steps, exercise: +r.exercise, active: +r.active, sleep: +r.sleep });
      render();
    },

    /* --- Nutrition externe --- */
    mfpImport: () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.csv,text/csv';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const n = Food.Bridge.importCsv(String(r.result));
            UI.toast(n + ' ligne' + (n > 1 ? 's importées' : ' importée'));
          } catch (e) { UI.toast(e.message || 'Fichier illisible'); }
        };
        r.readAsText(f, 'utf-8');
      };
      input.click();
    },
    mfpExport: () => {
      const csv = Food.Bridge.exportCsv();
      UI.download('ever-journal.csv', csv, 'text/csv');
      UI.toast('Export téléchargé');
    },

    /* --- Apparence --- */
    weather: () => { Store.set('useWeather', !Store.get('useWeather', true)); render(); },
    haptics: () => { Store.set('haptics', !Store.get('haptics', true)); UI.haptic('toggle'); render(); },
    sound: () => {
      const next = !Store.get('sound', false);
      Store.set('sound', next);
      if (next && global.Feedback) { Feedback.arm(); Feedback.fire('success'); }
      render();
    },

    /* --- Données --- */
    export: () => {
      UI.download('ever-sauvegarde-' + UI.day.today() + '.json', JSON.stringify(Store.exportAll(), null, 2), 'application/json');
      UI.toast('Sauvegarde téléchargée');
    },
    import: () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try { Store.importAll(JSON.parse(String(r.result))); UI.toast('Sauvegarde restauree'); location.reload(); }
          catch (e) { UI.toast('Fichier illisible'); }
        };
        r.readAsText(f);
      };
      input.click();
    },
    wipe: async () => {
      if (!await UI.confirmSheet('Tout effacer', 'Toutes tes données locales seront supprimees. Si tu as un compte, elles restent sur le serveur.', true)) return;
      Store.wipe('all');
      location.reload();
    }
  };

  /* ---------- Connexion ---------- */
  function authSheet(mode) {
    const isSignup = mode === 'signup';
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:23px;margin-bottom:4px">' + (isSignup ? 'Créer un compte' : 'Se connecter') + '</h2>' +
      '<p class="secdesc">Uniquement pour synchroniser et partager. Tout le reste marche sans.</p>' +
      '<form data-form>' +
        (isSignup ? '<label class="field"><span>Pseudo</span><input name="pseudo" autocomplete="nickname"></label>' : '') +
        '<label class="field"><span>Adresse e-mail</span><input name="email" type="email" autocomplete="email" required></label>' +
        '<label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="' + (isSignup ? 'new-password' : 'current-password') + '" required></label>' +
        '<div data-err class="banner danger" style="display:none;margin-bottom:12px"></div>' +
        '<button class="btn primary block lg" type="submit">' + (isSignup ? 'Créer le compte' : 'Se connecter') + '</button>' +
      '</form>' +
      '<button class="btn ghost block" style="margin-top:8px" data-switch>' + (isSignup ? "J'ai déjà un compte" : 'Créer un compte') + '</button>' +
      (isSignup ? '' : '<button class="btn ghost block" data-forgot>Mot de passe oublie</button>') +
      '</div>', {
      onMount: (s) => {
        const form = s.querySelector('[data-form]'), err = s.querySelector('[data-err]');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type=submit]');
          btn.classList.add('is-loading'); err.style.display = 'none';
          try {
            if (isSignup) {
              await Cloud.signUp(form.email.value.trim(), form.password.value, form.pseudo.value.trim());
              UI.closeSheet();
              UI.toast('Compte créé : confirme ton adresse par mail');
            } else {
              await Cloud.signIn(form.email.value.trim(), form.password.value);
              UI.closeSheet(); UI.toast('Connecté');
              await Store.pull(); await Store.push();
            }
            render();
          } catch (e2) {
            err.textContent = e2.message; err.style.display = 'flex';
          } finally { btn.classList.remove('is-loading'); }
        };
        s.querySelector('[data-switch]').onclick = () => authSheet(isSignup ? 'login' : 'signup');
        const fg = s.querySelector('[data-forgot]');
        if (fg) fg.onclick = async () => {
          const r = await UI.promptSheet('Reinitialiser', [{ name: 'email', label: 'Adresse e-mail', type: 'email' }], 'Envoyer');
          if (!r || !r.email) return;
          try { await Cloud.resetPassword(r.email); UI.toast('Mail envoye'); }
          catch (e) { UI.toast(e.message); }
        };
      }
    });
  }

  App.register('settings', { mount: mount });
  global.Settings = { mount };
})(window);
