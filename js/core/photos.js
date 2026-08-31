/* ============================================================
   EVER — Photos

   localStorage plafonne a environ 5 Mo : une seule photo d'iPhone
   le remplit. Les images vivent donc dans IndexedDB, sans limite
   pratique, et ne sont referencees ailleurs que par leur
   identifiant.

   Si un compte Supabase est connecté, la photo part aussi dans le
   bucket, et l'URL publique devient la source d'affichage : c'est
   ce qui permet de retrouver sa penderie sur un autre appareil.
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

  /* Enregistre une image redimensionnee et renvoie son identifiant. */
  async function put(fileOrDataUrl, maxSide) {
    const dataUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : await AI.shrink(fileOrDataUrl, maxSide || 1100, 0.84);
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

  /* Remplit toutes les balises <img data-photo="id"> d'un conteneur. */
  async function hydrate(rootEl) {
    const nodes = Array.from((rootEl || document).querySelectorAll('[data-photo]'));
    for (const n of nodes) {
      const id = n.getAttribute('data-photo');
      if (!id) continue;
      const src = await get(id);
      if (src) { n.src = src; n.removeAttribute('data-photo'); }
    }
  }

  async function usage() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try { return await navigator.storage.estimate(); } catch (e) { return null; }
  }

  global.Photos = { put, get, del, hydrate, usage };
})(window);
