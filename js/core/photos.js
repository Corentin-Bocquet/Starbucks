/* ============================================================
   EVER — Photos

   Deux endroits, et c'est voulu :

   1. IndexedDB, sur l'appareil. localStorage plafonne à 5 Mo, une
      seule photo d'iPhone le remplit. IndexedDB n'a pas cette
      limite, et l'affichage reste instantané, même hors ligne.

   2. Le compartiment Supabase, quand un compte est connecté. C'est
      la seule façon de retrouver ses vêtements sur un autre
      appareil : l'identifiant IndexedDB d'un téléphone ne veut
      rien dire sur un autre.

   Une photo porte donc deux références : `photo` (l'identifiant
   local) et `photoUrl` (l'adresse publique). L'affichage prend
   l'URL en priorité quand le local est absent, ce qui fait que
   l'ordinateur voit ses propres fichiers, et le téléphone voit
   ceux du serveur, sans que rien ne change dans les modules.
   ============================================================ */
(function (global) {
  'use strict';

  const DB = 'ever-photos', STORE = 'img', VERSION = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VERSION);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(new Error('Stockage des photos indisponible'));
    });
    return dbp;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      const req = fn(s);
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error || new Error('Écriture impossible'));
    });
  }

  /* ---------- Local ---------- */
  async function put(fileOrDataUrl, maxSide) {
    const dataUrl = typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await AI.shrink(fileOrDataUrl, maxSide || 1100, 0.84);
    const id = 'ph_' + UI.uid();
    await tx('readwrite', (s) => s.put(dataUrl, id));
    return id;
  }

  async function get(id) {
    if (!id) return null;
    if (/^https?:|^data:/.test(id)) return id;
    try { return await tx('readonly', (s) => s.get(id)); }
    catch (e) { return null; }
  }

  async function del(id) {
    if (!id || /^https?:|^data:/.test(id)) return;
    try { await tx('readwrite', (s) => s.delete(id)); } catch (e) {}
  }

  /* ---------- Local + serveur ----------
     Renvoie { id, url }. L'envoi vers Supabase ne bloque jamais
     l'interface : la photo est déjà affichable localement. */
  async function save(fileOrDataUrl, bucket, maxSide) {
    const dataUrl = typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await AI.shrink(fileOrDataUrl, maxSide || 1100, 0.84);
    const id = await put(dataUrl);
    let url = null;
    if (global.Cloud && Cloud.ready()) {
      try { url = await upload(dataUrl, bucket || 'garments'); } catch (e) { console.warn('[EVER] envoi de la photo différé', e); }
    }
    return { id: id, url: url };
  }

  /* Envoie une image encodée en data: vers le compartiment. */
  async function upload(dataUrl, bucket) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!m) return null;
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = /png/i.test(m[1]) ? 'png' : /webp/i.test(m[1]) ? 'webp' : 'jpg';
    let file;
    try { file = new File([bytes], 'photo.' + ext, { type: m[1] }); }
    catch (e) { file = new Blob([bytes], { type: m[1] }); file.name = 'photo.' + ext; }
    const res = await Cloud.uploadImage(bucket, file);
    return res && res.url;
  }

  /* ---------- Rattrapage ----------
     Parcourt une collection, envoie ce qui n'existe qu'en local, et
     redescend en local ce qui n'existe qu'en ligne. C'est ce qui
     répare un appareil qui a été utilisé hors compte. */
  async function sync(collection, field, bucket, onProgress) {
    if (!global.Cloud || !Cloud.ready()) return { up: 0, down: 0, skipped: 0 };
    field = field || 'photo';
    const urlField = field + 'Url';
    const rows = Store.all(collection);
    let up = 0, down = 0, skipped = 0, done = 0;

    for (const row of rows) {
      done++;
      if (onProgress) onProgress(done, rows.length);
      const localId = row[field], url = row[urlField];

      /* Cas 1 : on a l'URL mais pas l'image en local (autre appareil). */
      if (url && (!localId || !(await get(localId)))) {
        try {
          const r = await fetch(url);
          if (!r.ok) { skipped++; continue; }
          const blob = await r.blob();
          const data = await blobToDataUrl(blob);
          const id = await put(data);
          Store.put(collection, row.id, { [field]: id });
          down++;
        } catch (e) { skipped++; }
        continue;
      }

      /* Cas 2 : on a l'image en local mais pas en ligne. */
      if (localId && !url) {
        const data = await get(localId);
        if (!data) { skipped++; continue; }
        try {
          const u = await upload(data, bucket || 'garments');
          if (u) { Store.put(collection, row.id, { [urlField]: u }); up++; }
          else skipped++;
        } catch (e) { skipped++; }
        continue;
      }
      skipped++;
    }
    return { up: up, down: down, skipped: skipped };
  }

  function blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('Lecture impossible'));
      r.readAsDataURL(blob);
    });
  }

  /* Combien de photos n'existent que sur cet appareil. */
  function pendingUploads(collection, field) {
    field = field || 'photo';
    return Store.all(collection).filter((r) => r[field] && !r[field + 'Url']).length;
  }

  /* ---------- Affichage ----------
     Remplit les <img data-photo="…" data-photo-url="…">. L'attribut
     local est essayé d'abord (instantané, hors ligne), l'URL sert de
     secours. Si les deux échouent, on laisse la vignette vide plutôt
     qu'une image cassée, et on marque l'élément. */
  async function hydrate(rootEl) {
    const nodes = Array.from((rootEl || document).querySelectorAll('[data-photo], [data-photo-url]'));
    for (const n of nodes) {
      const id = n.getAttribute('data-photo');
      const url = n.getAttribute('data-photo-url');
      let src = null;
      if (id) src = await get(id);
      if (!src && url) src = url;
      if (src) {
        n.src = src;
        n.removeAttribute('data-photo');
        n.removeAttribute('data-photo-url');
        /* Une URL distante peut échouer : on le signale au parent. */
        n.onerror = () => { n.dataset.broken = '1'; n.style.display = 'none'; };
      } else {
        n.dataset.broken = '1';
        n.style.display = 'none';
      }
    }
  }

  /* Balise <img> prête à hydrater, à partir d'un objet qui porte
     photo et photoUrl. */
  function img(row, field, style, cls) {
    field = field || 'photo';
    const id = row[field], url = row[field + 'Url'];
    if (!id && !url) return '';
    return '<img' +
      (cls ? ' class="' + UI.attr(cls) + '"' : '') +
      (id ? ' data-photo="' + UI.attr(id) + '"' : '') +
      (url ? ' data-photo-url="' + UI.attr(url) + '"' : '') +
      (style ? ' style="' + UI.attr(style) + '"' : '') +
      ' alt="" loading="lazy">';
  }

  async function usage() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try { return await navigator.storage.estimate(); } catch (e) { return null; }
  }

  global.Photos = { put, get, del, save, upload, sync, hydrate, img, usage, pendingUploads };
})(window);
