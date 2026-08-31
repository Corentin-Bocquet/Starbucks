/* ============================================================
   EVER — Stockage local d'abord, synchronise ensuite

   Principe : l'application ecrit toujours en local et répond
   immediatement. La synchronisation Supabase se fait en arrière
   plan et n'est jamais bloquante. Sans compte, ou hors ligne,
   tout continue de fonctionner sur l'appareil.

   Modele de données côté client :
     - réglages      -> paires clé/valeur (Store.get / Store.set)
     - collections   -> tableaux d'objets identifies (Store.all / add / put / del)

   Chaque objet porte : id, _at (création), _up (dernière écriture),
   _del (suppression logique, pour que la suppression se propage).
   ============================================================ */
(function (global) {
  'use strict';

  const NS = 'ever.v1.';
  const listeners = new Map();
  let dirty = new Set();
  let syncTimer = null;

  /* ---------- Acces brut ---------- */
  function raw(key, fallback) {
    try {
      const v = localStorage.getItem(NS + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch (e) {
      console.warn('[EVER] écriture locale impossible', key, e);
      if (e && /quota/i.test(e.name || '')) UI.toast("Memoire de l'appareil pleine");
      return false;
    }
  }

  /* ---------- Réglages ---------- */
  function get(key, fallback) { return raw('s.' + key, fallback); }
  function set(key, value) { write('s.' + key, value); emit('setting:' + key, value); markDirty('settings'); return value; }

  /* ---------- Collections ---------- */
  function all(name, includeDeleted) {
    const arr = raw('c.' + name, []);
    return includeDeleted ? arr : arr.filter((x) => !x._del);
  }
  function saveAll(name, arr) { write('c.' + name, arr); emit('coll:' + name, arr); markDirty(name); }

  function add(name, obj) {
    const arr = raw('c.' + name, []);
    const now = Date.now();
    const item = Object.assign({}, obj, { id: obj.id || UI.uid(), _at: obj._at || now, _up: now });
    arr.push(item);
    saveAll(name, arr);
    return item;
  }
  function put(name, id, patch) {
    const arr = raw('c.' + name, []);
    const i = arr.findIndex((x) => x.id === id);
    if (i < 0) return null;
    arr[i] = Object.assign({}, arr[i], patch, { id: id, _up: Date.now() });
    saveAll(name, arr);
    return arr[i];
  }
  function del(name, id) {
    const arr = raw('c.' + name, []);
    const i = arr.findIndex((x) => x.id === id);
    if (i < 0) return false;
    arr[i] = Object.assign({}, arr[i], { _del: true, _up: Date.now() });
    saveAll(name, arr);
    return true;
  }
  function find(name, id) { return all(name).find((x) => x.id === id) || null; }
  function upsert(name, obj) { return obj.id && find(name, obj.id) ? put(name, obj.id, obj) : add(name, obj); }

  /* ---------- Favoris (transversaux) ---------- */
  function favKey(type, id) { return type + ':' + id; }
  function favs() { return new Set(get('favs', [])); }
  function isFav(type, id) { return favs().has(favKey(type, id)); }
  function toggleFav(type, id) {
    const s = favs(), k = favKey(type, id);
    const on = !s.has(k);
    on ? s.add(k) : s.delete(k);
    set('favs', Array.from(s));
    emit('favs', s);
    return on;
  }

  /* ---------- Historique transversal ---------- */
  function log(kind, payload) {
    const arr = raw('c.history', []);
    arr.unshift({ id: UI.uid(), kind: kind, at: Date.now(), _at: Date.now(), _up: Date.now(), payload: payload || {} });
    if (arr.length > 800) arr.length = 800;
    saveAll('history', arr);
    emit('history', kind);
  }
  function history(kind, limit) {
    const arr = all('history');
    return (kind ? arr.filter((x) => x.kind === kind) : arr).slice(0, limit || 100);
  }

  /* ---------- Événements ---------- */
  function on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => listeners.get(evt).delete(fn);
  }
  function emit(evt, data) {
    const s = listeners.get(evt);
    if (s) s.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
    const star = listeners.get('*');
    if (star) star.forEach((fn) => { try { fn(evt, data); } catch (e) {} });
  }

  /* ---------- Synchronisation ---------- */
  function markDirty(name) {
    dirty.add(name);
    if (!global.Cloud || !Cloud.ready()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { push(); }, 1500);
  }

  async function push() {
    if (!global.Cloud || !Cloud.ready() || !dirty.size) return;
    const names = Array.from(dirty); dirty = new Set();
    try {
      for (const n of names) {
        if (n === 'settings') await Cloud.putSettings(exportSettings());
        else await Cloud.putCollection(n, all(n, true));
      }
      set('_lastSync', Date.now());
      emit('sync', { ok: true, at: Date.now() });
    } catch (e) {
      names.forEach((n) => dirty.add(n));
      emit('sync', { ok: false, error: String(e && e.message || e) });
    }
  }

  async function pull() {
    if (!global.Cloud || !Cloud.ready()) return false;
    try {
      const remote = await Cloud.getAll();
      if (!remote) return false;
      if (remote.settings) {
        Object.keys(remote.settings).forEach((k) => {
          if (k.charAt(0) === '_') return;
          write('s.' + k, remote.settings[k]);
        });
      }
      Object.keys(remote.collections || {}).forEach((name) => {
        write('c.' + name, mergeCollections(raw('c.' + name, []), remote.collections[name] || []));
      });
      emit('pulled', true);
      return true;
    } catch (e) {
      console.warn('[EVER] synchronisation descendante impossible', e);
      return false;
    }
  }

  /* La dernière écriture gagne, par objet. Les suppressions logiques
     se propagent comme n'importé quelle autre modification. */
  function mergeCollections(local, remote) {
    const byId = new Map();
    local.forEach((x) => byId.set(x.id, x));
    remote.forEach((r) => {
      const l = byId.get(r.id);
      if (!l || (r._up || 0) > (l._up || 0)) byId.set(r.id, r);
    });
    return Array.from(byId.values());
  }

  /* ---------- Export / import / effacement ---------- */
  const SETTING_KEYS = () => Object.keys(localStorage).filter((k) => k.indexOf(NS + 's.') === 0).map((k) => k.slice((NS + 's.').length));
  const COLL_KEYS = () => Object.keys(localStorage).filter((k) => k.indexOf(NS + 'c.') === 0).map((k) => k.slice((NS + 'c.').length));

  function exportSettings() { const o = {}; SETTING_KEYS().forEach((k) => { o[k] = get(k); }); return o; }
  function exportAll() {
    const o = { version: 1, exportedAt: new Date().toISOString(), settings: exportSettings(), collections: {} };
    COLL_KEYS().forEach((k) => { o.collections[k] = all(k, true); });
    return o;
  }
  function importAll(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Fichier illisible');
    Object.keys(obj.settings || {}).forEach((k) => write('s.' + k, obj.settings[k]));
    Object.keys(obj.collections || {}).forEach((k) => write('c.' + k, mergeCollections(raw('c.' + k, []), obj.collections[k] || [])));
    emit('imported', true);
  }
  function wipe(scope) {
    const keys = Object.keys(localStorage).filter((k) => k.indexOf(NS) === 0);
    keys.forEach((k) => {
      const short = k.slice(NS.length);
      if (scope === 'all') localStorage.removeItem(k);
      else if (scope === 'collections' && short.indexOf('c.') === 0) localStorage.removeItem(k);
      else if (scope === 'settings' && short.indexOf('s.') === 0) localStorage.removeItem(k);
    });
    emit('wiped', scope);
  }

  function usage() {
    let bytes = 0;
    Object.keys(localStorage).forEach((k) => { if (k.indexOf(NS) === 0) bytes += (localStorage.getItem(k) || '').length + k.length; });
    return bytes;
  }

  global.Store = {
    get, set, all, add, put, del, find, upsert, saveAll,
    favs, isFav, toggleFav, favKey,
    log, history,
    on, emit,
    push, pull, markDirty,
    exportAll, importAll, wipe, usage,
    NS: NS
  };
})(window);
