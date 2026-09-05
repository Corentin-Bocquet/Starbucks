/* ============================================================
   EVER — Choisir un lieu sur une carte

   Leaflet + tuiles OpenStreetMap : gratuit, sans clé, sans compte.
   La carte reste dans l'application : on cherche, on déplace, on
   zoome, on pose le marqueur, on valide. Le géocodage inverse passe
   par Nominatim, qui demande un usage raisonnable — on ne l'appelle
   donc qu'au relâchement du marqueur, jamais pendant le glissement.
   ============================================================ */
(function (global) {
  'use strict';

  const CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  const JS  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  let loading = null;

  function load() {
    if (global.L) return Promise.resolve(global.L);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      if (!document.querySelector('link[data-leaflet]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = CSS; l.setAttribute('data-leaflet', '');
        document.head.appendChild(l);
      }
      const s = document.createElement('script');
      s.src = JS; s.async = true;
      s.onload = () => global.L ? res(global.L) : rej(new Error('Carte indisponible'));
      s.onerror = () => rej(new Error('Carte injoignable hors ligne'));
      document.head.appendChild(s);
    });
    return loading;
  }

  /* ============================================================
     Le marqueur

     Leaflet pose par defaut une image PNG dont le chemin est
     calcule a partir de celui de sa feuille de style. Servie depuis
     un CDN, cette image ne se resout pas : le navigateur affiche
     alors le rectangle a point d'interrogation de l'image cassee.

     On ne lui laisse pas le choix : le marqueur est un SVG ecrit
     ici, donc rien a telecharger et rien qui puisse manquer.
     ============================================================ */
  function epingle(L, couleur) {
    const c = couleur || '#C6402F';
    return L.divIcon({
      className: 'epingle',
      iconSize: [30, 40],
      iconAnchor: [15, 38],
      popupAnchor: [0, -34],
      html:
        '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true">' +
          '<defs><linearGradient id="pg" x1="6" y1="2" x2="24" y2="34" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#fff" stop-opacity=".45"/>' +
            '<stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>' +
          '<ellipse cx="15" cy="37" rx="6" ry="2.2" fill="rgba(0,0,0,.28)"/>' +
          '<path d="M15 1.5c-6.1 0-11 4.8-11 10.8 0 7.9 9.6 18.6 10.4 19.5a.8.8 0 0 0 1.2 0c.8-.9 10.4-11.6 10.4-19.5 0-6-4.9-10.8-11-10.8Z" fill="' + c + '"/>' +
          '<path d="M15 1.5c-6.1 0-11 4.8-11 10.8 0 7.9 9.6 18.6 10.4 19.5a.8.8 0 0 0 1.2 0c.8-.9 10.4-11.6 10.4-19.5 0-6-4.9-10.8-11-10.8Z" fill="url(#pg)"/>' +
          '<circle cx="15" cy="12" r="4.4" fill="#fff"/>' +
        '</svg>'
    });
  }

  async function reverse(lat, lon) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=fr&lat=' + lat + '&lon=' + lon,
        { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.address || {};
      return {
        name: a.city || a.town || a.village || a.municipality || a.county || j.name || 'Lieu choisi',
        admin: a.state || a.county || '',
        country: a.country || '',
        label: j.display_name || ''
      };
    } catch (e) { return null; }
  }

  /* Ouvre le sélecteur. Résout avec { name, lat, lon, admin, country } ou null. */
  function pick(start) {
    return new Promise(async (resolve) => {
      let answered = false;
      const p = start || Ctx.place();

      const sheet = UI.openSheet(
        '<div class="mbody" style="padding-top:6px">' +
          '<h2 style="font-size:22px;margin-bottom:4px">Choisir sur la carte</h2>' +
          '<p class="secdesc">Cherche une ville, ou déplace le marqueur là où tu es.</p>' +
          '<label class="search" style="box-shadow:var(--sh-inset);margin-bottom:10px">' + Icon('search', 17) +
            '<input data-q placeholder="Ville, adresse…" autocomplete="off"></label>' +
          '<div data-sugg></div>' +
          '<div data-map style="height:300px;border-radius:var(--r-lg);overflow:hidden;background:var(--surface-2);position:relative">' +
            '<div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:13px">Chargement de la carte…</div>' +
          '</div>' +
          '<div class="panel" style="margin-top:10px;padding:12px 14px">' +
            '<b data-name style="font-size:15px">' + UI.esc(p.name) + '</b>' +
            '<small class="muted" style="display:block" data-coords>' + p.lat.toFixed(4) + ', ' + p.lon.toFixed(4) + '</small>' +
          '</div>' +
          '<div class="btnrow" style="margin-top:12px">' +
            '<button class="btn primary grow lg" data-ok>' + Icon('check', 17) + 'Valider ce lieu</button>' +
            '<button class="btn" data-here>' + Icon('pin', 16) + 'Ma position</button>' +
          '</div>' +
        '</div>',
        { onClose: () => { if (!answered) resolve(null); } }
      );

      const $ = (s) => sheet.querySelector(s);
      let current = { name: p.name, lat: p.lat, lon: p.lon, admin: p.admin || '', country: p.country || '' };

      function show() {
        $('[data-name]').textContent = current.name;
        $('[data-coords]').textContent = current.lat.toFixed(4) + ', ' + current.lon.toFixed(4);
      }

      /* Recherche par nom : même service que le reste de l'app. */
      $('[data-q]').oninput = UI.debounce(async (e) => {
        const v = e.target.value.trim();
        const out = $('[data-sugg]');
        if (v.length < 2) { out.innerHTML = ''; return; }
        const rows = await Ctx.searchCity(v);
        out.innerHTML = rows.length
          ? '<div class="list" style="margin-bottom:10px">' + rows.slice(0, 5).map((c, i) =>
              '<button class="rowitem" data-i="' + i + '"><span class="ic">' + Icon('pin', 17) + '</span>' +
              '<span class="tx"><b>' + UI.esc(c.name) + '</b><small>' + UI.esc(c.label) + '</small></span></button>').join('') + '</div>'
          : '';
        out.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
          const c = rows[+b.dataset.i];
          current = { name: c.name, lat: c.lat, lon: c.lon, admin: c.admin, country: c.country };
          show(); out.innerHTML = ''; $('[data-q]').value = '';
          if (map) { map.setView([c.lat, c.lon], 12); marker.setLatLng([c.lat, c.lon]); }
        });
      }, 400);

      $('[data-ok]').onclick = () => { answered = true; UI.closeSheet(); resolve(current); };
      $('[data-here]').onclick = async (ev) => {
        const b = ev.currentTarget;
        const avant = b.innerHTML;
        b.disabled = true; b.innerHTML = Icon('pin', 16) + 'Recherche…';
        try {
          const loc = await Ctx.locate();
          current = { name: loc.name, lat: loc.lat, lon: loc.lon, admin: loc.admin || '', country: loc.country || '' };
          show();
          if (map) { map.setView([loc.lat, loc.lon], 13); marker.setLatLng([loc.lat, loc.lon]); }
          /* Le nom exact arrive apres, par Nominatim : la carte
             bouge tout de suite, le libelle se corrige ensuite. */
          const info = await reverse(loc.lat, loc.lon);
          if (info) { current.name = info.name; current.admin = info.admin; current.country = info.country; show(); }
        } catch (e) {
          UI.toast(e.message);
        } finally {
          b.disabled = false; b.innerHTML = avant;
        }
      };

      let map = null, marker = null;
      try {
        const L = await load();
        const box = $('[data-map]');
        box.innerHTML = '';
        map = L.map(box, { zoomControl: true, attributionControl: true }).setView([current.lat, current.lon], 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18, attribution: '© OpenStreetMap'
        }).addTo(map);
        marker = L.marker([current.lat, current.lon], { draggable: true, icon: epingle(L) }).addTo(map);

        const settle = async (latlng) => {
          current.lat = latlng.lat; current.lon = latlng.lng;
          show();
          const info = await reverse(latlng.lat, latlng.lng);
          if (info) { current.name = info.name; current.admin = info.admin; current.country = info.country; show(); }
        };
        marker.on('dragend', () => settle(marker.getLatLng()));
        map.on('click', (e) => { marker.setLatLng(e.latlng); settle(e.latlng); });
        setTimeout(() => map.invalidateSize(), 250);
      } catch (e) {
        $('[data-map]').innerHTML =
          '<div style="position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;color:var(--muted);font-size:13px">' +
          UI.esc(e.message) + '<br>La recherche par nom fonctionne quand même.</div>';
      }
    });
  }

  /* ============================================================
     La fiche d'un lieu

     On reste dans l'application : la carte s'ouvre en pop-up,
     centree sur l'adresse, avec le nom, les infos utiles et un
     bouton pour partir dans Plans ou Google Maps si on veut
     vraiment y aller.

     Deux cas : soit le lieu porte deja ses coordonnees, soit on
     les demande a Nominatim a partir de son adresse. Si les deux
     echouent, la fiche s'affiche quand meme, sans carte, avec les
     boutons de navigation qui eux marchent toujours.
     ============================================================ */
  async function geocode(q) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=' + encodeURIComponent(q),
        { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !j.length) return null;
      return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), label: j[0].display_name || '' };
    } catch (e) { return null; }
  }

  const surApple = () => /iPad|iPhone|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '');

  function liens(lieu) {
    const q = encodeURIComponent([lieu.nom, lieu.adresse, lieu.ville].filter(Boolean).join(' '));
    return {
      apple:   'https://maps.apple.com/?q=' + q,
      google:  'https://www.google.com/maps/search/?api=1&query=' + q,
      itineraire: 'https://www.google.com/maps/dir/?api=1&destination=' + q
    };
  }

  function fiche(lieu, opts) {
    opts = opts || {};
    if (!lieu || !lieu.nom) return;
    const L2 = liens(lieu);
    const apple = surApple();

    const puces = [];
    if (lieu.rating) puces.push('★ ' + String(lieu.rating).replace('.', ',') + (lieu.reviews ? ' · ' + lieu.reviews + ' avis' : ''));
    if (lieu.price) puces.push('€'.repeat(lieu.price));
    if (lieu.hours) puces.push(lieu.hours);
    if (lieu.distance != null) puces.push(UI.fmt.km(lieu.distance));

    UI.openSheet(
      '<div class="fichelieu">' +
        '<div class="carte" data-carte>' +
          '<div class="attente">' + Icon('location', 26) + '</div>' +
        '</div>' +
        '<div class="voile"></div>' +
        '<div class="infos">' +
          (lieu.categorie ? '<div class="sur">' + UI.esc(lieu.categorie) + '</div>' : '') +
          '<h2>' + UI.esc(lieu.nom) + '</h2>' +
          (lieu.adresse ? '<p class="adr">' + Icon('pin', 14) + UI.esc(lieu.adresse) + '</p>' : '') +
          (lieu.pitch ? '<p class="txt">' + UI.esc(lieu.pitch) + '</p>' : '') +
          (puces.length ? '<div class="puces">' + puces.map((x) => '<span>' + UI.esc(x) + '</span>').join('') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="mbody" style="padding-top:14px">' +
        '<a class="btn primary block lg" href="' + UI.attr(apple ? L2.apple : L2.google) + '" target="_blank" rel="noopener">' +
          Icon('external', 18) + (apple ? 'Ouvrir dans Plans' : 'Ouvrir dans Google Maps') + '</a>' +
        '<div class="btnrow" style="margin-top:8px">' +
          '<a class="btn grow" href="' + UI.attr(L2.itineraire) + '" target="_blank" rel="noopener">' + Icon('map', 16) + 'Itinéraire</a>' +
          '<a class="btn grow" href="' + UI.attr(apple ? L2.google : L2.apple) + '" target="_blank" rel="noopener">' +
            Icon('external', 16) + (apple ? 'Google Maps' : 'Plans') + '</a>' +
        '</div>' +
        (opts.extra || '') +
      '</div>',
      { onMount: async (sh) => {
          if (opts.onMount) opts.onMount(sh);
          const boite = sh.querySelector('[data-carte]');
          let lat = Number(lieu.lat), lon = Number(lieu.lon);
          if (!isFinite(lat) || !isFinite(lon)) {
            const g = await geocode([lieu.nom, lieu.adresse, lieu.ville].filter(Boolean).join(', '));
            if (g) { lat = g.lat; lon = g.lon; }
          }
          /* Adresse introuvable : on ne laisse pas un rectangle gris.
             On centre sur la ville en cours, ce qui situe deja le
             lieu, et on le dit en une ligne. Faute de ville connue,
             une photo du lieu vaut mieux que rien. */
          let approx = false;
          if (!isFinite(lat) || !isFinite(lon)) {
            const ville = global.Ctx ? Ctx.place() : null;
            if (ville && isFinite(ville.lat)) { lat = ville.lat; lon = ville.lon; approx = true; }
          }
          if (!isFinite(lat) || !isFinite(lon)) {
            if (global.Stock) {
              boite.innerHTML = '<img src="' + UI.attr(Stock.genere('lieu', lieu.nom, { l: 800, h: 500 })) +
                '" alt="" style="width:100%;height:100%;object-fit:cover">';
            } else {
              boite.innerHTML = '<div class="attente">' + Icon('location', 26) + '<span>Adresse non localisée</span></div>';
            }
            return;
          }
          if (approx) {
            const n = sh.querySelector('.infos .adr');
            if (n) n.insertAdjacentHTML('afterend',
              '<p class="approx">Adresse exacte inconnue : la carte montre la ville.</p>');
          }
          try {
            const L = await load();
            boite.innerHTML = '<div class="toile" data-toile></div>';
            const map = L.map(boite.querySelector('[data-toile]'), {
              zoomControl: false, attributionControl: false,
              dragging: true, scrollWheelZoom: false, doubleClickZoom: true, tapHold: false
            }).setView([lat, lon], 16);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.marker([lat, lon], { icon: epingle(L) }).addTo(map);
            setTimeout(() => map.invalidateSize(), 220);
          } catch (e) {
            boite.innerHTML = '<div class="attente">' + Icon('location', 26) + '<span>Carte indisponible hors ligne</span></div>';
          }
        } }
    );
  }

  /* ============================================================
     La carte en miniature

     Partout ou une petite image devrait dire « c'est ici », on
     posait une icone d'epingle. Une vraie carte, meme minuscule,
     en dit infiniment plus : on reconnait le trait de cote, le
     centre-ville, la route.

     Elle est figee : ni zoom, ni deplacement, ni clic. C'est une
     illustration, pas un outil.
     ============================================================ */
  async function mini(boite, lieu) {
    if (!boite || !lieu) return;
    let lat = Number(lieu.lat), lon = Number(lieu.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      const g = await geocode([lieu.nom, lieu.adresse].filter(Boolean).join(', '));
      if (g) { lat = g.lat; lon = g.lon; }
    }
    if (!isFinite(lat) || !isFinite(lon)) {
      const v = global.Ctx ? Ctx.place() : null;
      if (v && isFinite(v.lat)) { lat = v.lat; lon = v.lon; }
    }
    if (!isFinite(lat) || !isFinite(lon)) return;

    try {
      const L = await load();
      boite.innerHTML = '';
      const m = L.map(boite, {
        zoomControl: false, attributionControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
        keyboard: false, touchZoom: false, tap: false
      }).setView([lat, lon], lieu.zoom || 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
      L.marker([lat, lon], { icon: epingle(L), interactive: false }).addTo(m);
      setTimeout(() => m.invalidateSize(), 200);
      boite.classList.add('prete');
    } catch (e) { /* pas de carte, pas de trou : la boite reste vide */ }
  }

  /* ============================================================
     La carte en tout petit, sans bibliotheque

     Poser une vraie carte Leaflet sur chaque ligne d'une liste de
     vingt lieux, c'est vingt instances a animer : le telephone
     rame. Mais une carte, a un zoom donne, est decoupee en tuiles
     de 256 pixels dont l'adresse se calcule directement depuis la
     latitude et la longitude. Une seule image, aucun script.

     C'est la projection de Mercator, en trois lignes :
       x = (lon + 180) / 360 * 2^z
       y = (1 - ln(tan(lat) + sec(lat)) / PI) / 2 * 2^z

     Resultat : la vraie carte du quartier, en vignette, a la place
     de la petite epingle grise qui ne disait rien.
     ============================================================ */
  function tuile(lat, lon, z) {
    const n = Math.pow(2, z || 13);
    const rad = Number(lat) * Math.PI / 180;
    const x = Math.floor((Number(lon) + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n);
    return 'https://tile.openstreetmap.org/' + (z || 13) + '/' + x + '/' + y + '.png';
  }

  /* La vignette complete : la tuile, un voile pour l'adoucir, et
     l'epingle au centre. Faute de coordonnees, on prend celles de
     la ville en cours : mieux vaut le bon quartier que rien. */
  function vignette(lieu, opts) {
    opts = opts || {};
    let lat = Number(lieu && lieu.lat), lon = Number(lieu && lieu.lon);
    if (!isFinite(lat) || !isFinite(lon)) {
      const v = global.Ctx ? Ctx.place() : null;
      if (v && isFinite(v.lat)) { lat = v.lat; lon = v.lon; }
    }
    if (!isFinite(lat) || !isFinite(lon)) return '';
    return '<span class="vigncarte' + (opts.classe ? ' ' + opts.classe : '') + '">' +
      '<img loading="lazy" src="' + UI.attr(tuile(lat, lon, opts.zoom || 13)) + '" alt="">' +
      '<i></i></span>';
  }

  global.MapPick = { pick, load, reverse, fiche, geocode, liens, mini, epingle, tuile, vignette };
})(window);
