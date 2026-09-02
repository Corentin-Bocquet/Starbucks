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
      $('[data-here]').onclick = async () => {
        try {
          const loc = await Ctx.locate();
          current = { name: loc.name, lat: loc.lat, lon: loc.lon, admin: '', country: '' };
          show();
          if (map) { map.setView([loc.lat, loc.lon], 13); marker.setLatLng([loc.lat, loc.lon]); }
        } catch (e) { UI.toast(e.message); }
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
        marker = L.marker([current.lat, current.lon], { draggable: true }).addTo(map);

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
          if (!isFinite(lat) || !isFinite(lon)) {
            boite.innerHTML = '<div class="attente">' + Icon('location', 26) + '<span>Adresse non localisée</span></div>';
            return;
          }
          try {
            const L = await load();
            boite.innerHTML = '<div class="toile" data-toile></div>';
            const map = L.map(boite.querySelector('[data-toile]'), {
              zoomControl: false, attributionControl: false,
              dragging: true, scrollWheelZoom: false, doubleClickZoom: true, tapHold: false
            }).setView([lat, lon], 16);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.marker([lat, lon]).addTo(map);
            setTimeout(() => map.invalidateSize(), 220);
          } catch (e) {
            boite.innerHTML = '<div class="attente">' + Icon('location', 26) + '<span>Carte indisponible hors ligne</span></div>';
          }
        } }
    );
  }

  global.MapPick = { pick, load, reverse, fiche, geocode, liens };
})(window);
