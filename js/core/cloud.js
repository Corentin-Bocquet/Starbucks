/* ============================================================
   EVER — Supabase : comptes et synchronisation

   La bibliotheque supabase-js n'est chargee que si un projet est
   configuré. Sans configuration, l'application reste 100 % locale
   et aucune requete reseau n'est faite.

   Modele serveur (voir sql/schema.sql) :
     profiles          un profil par compte
     user_settings     un enregistrement JSON de réglages
     user_collections  une ligne par collection, contenu en JSON
     shared_lists      listes partagées par code
     list_members      qui a acces a quoi et avec quels droits
     list_items        contenu des listes partagées
   ============================================================ */
(function (global) {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  let client = null;
  let session = null;
  let loading = null;

  function cfg() {
    const c = global.EVER_CONFIG || {};
    return {
      url: Store.get('supabaseUrl', '') || c.supabaseUrl || '',
      key: Store.get('supabaseAnonKey', '') || c.supabaseAnonKey || ''
    };
  }
  function schema() {
    const c = global.EVER_CONFIG || {};
    return Store.get('supabaseSchema', '') || c.supabaseSchema || 'public';
  }
  function configured() { const c = cfg(); return !!(c.url && c.key); }
  function ready() { return !!(client && session); }
  function user() { return session ? session.user : null; }

  function loadSdk() {
    if (global.supabase) return Promise.resolve(global.supabase);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CDN; s.async = true;
      s.onload = () => global.supabase ? resolve(global.supabase) : reject(new Error('SDK indisponible'));
      s.onerror = () => reject(new Error('Chargement du SDK impossible'));
      document.head.appendChild(s);
    });
    return loading;
  }

  async function init() {
    if (!configured()) return false;
    try {
      const sdk = await loadSdk();
      const c = cfg();
      client = sdk.createClient(c.url, c.key, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ever.auth' },
        db: { schema: schema() }
      });
      const { data } = await client.auth.getSession();
      session = data ? data.session : null;
      client.auth.onAuthStateChange((_evt, s) => {
        session = s;
        Store.emit('auth', s ? s.user : null);
        if (s) { Store.pull().then(() => Store.push()); }
      });
      Store.emit('auth', user());
      if (session) { await Store.pull(); await Store.push(); }
      return true;
    } catch (e) {
      console.warn('[EVER] Supabase indisponible :', e.message);
      return false;
    }
  }

  /* ---------- Authentification ---------- */
  async function signUp(email, password, pseudo) {
    if (!client) throw new Error('Aucun projet Supabase configuré');
    const { data, error } = await client.auth.signUp({
      email: email, password: password,
      options: { data: { pseudo: pseudo || email.split('@')[0] } }
    });
    if (error) throw new Error(translate(error.message));
    return data;
  }
  async function signIn(email, password) {
    if (!client) throw new Error('Aucun projet Supabase configuré');
    const { data, error } = await client.auth.signInWithPassword({ email: email, password: password });
    if (error) throw new Error(translate(error.message));
    session = data.session;
    return data;
  }
  async function signInMagic(email) {
    if (!client) throw new Error('Aucun projet Supabase configuré');
    const { error } = await client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.href.split('#')[0] } });
    if (error) throw new Error(translate(error.message));
    return true;
  }
  async function resetPassword(email) {
    if (!client) throw new Error('Aucun projet Supabase configuré');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
    if (error) throw new Error(translate(error.message));
    return true;
  }
  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    session = null;
    Store.emit('auth', null);
  }

  function translate(msg) {
    const m = String(msg || '');
    if (/Invalid login/i.test(m)) return 'Adresse ou mot de passe incorrect';
    if (/already registered/i.test(m)) return 'Cette adresse a déjà un compte';
    if (/at least 6/i.test(m)) return 'Le mot de passe doit faire au moins 6 caracteres';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives, reessaie dans une minute';
    if (/Email not confirmed/i.test(m)) return "Adresse non confirmee : ouvre le mail d'activation";
    if (/fetch|network/i.test(m)) return 'Serveur injoignable';
    return m;
  }

  /* ---------- Synchronisation ---------- */
  async function putSettings(obj) {
    if (!ready()) return;
    const { error } = await client.from('user_settings')
      .upsert({ user_id: user().id, data: obj, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  }
  async function putCollection(name, rows) {
    if (!ready()) return;
    const { error } = await client.from('user_collections')
      .upsert({ user_id: user().id, name: name, data: rows, updated_at: new Date().toISOString() }, { onConflict: 'user_id,name' });
    if (error) throw error;
  }
  async function getAll() {
    if (!ready()) return null;
    const uid = user().id;
    const [s, c] = await Promise.all([
      client.from('user_settings').select('data').eq('user_id', uid).maybeSingle(),
      client.from('user_collections').select('name,data').eq('user_id', uid)
    ]);
    const out = { settings: s && s.data ? s.data.data : null, collections: {} };
    if (c && c.data) c.data.forEach((r) => { out.collections[r.name] = r.data || []; });
    return out;
  }

  /* ---------- Listes partagées ---------- */
  function code() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  async function createSharedList(name, kind, permission) {
    if (!ready()) throw new Error('Connecté-toi pour partager une liste');
    const row = { owner_id: user().id, name: name, kind: kind, share_code: code(), default_permission: permission || 'view' };
    const { data, error } = await client.from('shared_lists').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function joinSharedList(shareCode) {
    if (!ready()) throw new Error('Connecté-toi pour rejoindre une liste');
    const { data: list, error } = await client.from('shared_lists').select('*').eq('share_code', shareCode.toUpperCase()).maybeSingle();
    if (error) throw error;
    if (!list) throw new Error('Aucune liste avec ce code');
    const { error: e2 } = await client.from('list_members')
      .upsert({ list_id: list.id, user_id: user().id, permission: list.default_permission }, { onConflict: 'list_id,user_id' });
    if (e2) throw e2;
    return list;
  }
  async function myLists() {
    if (!ready()) return [];
    const { data, error } = await client.from('shared_lists').select('*, list_members(user_id,permission)');
    if (error) { console.warn(error); return []; }
    return data || [];
  }
  async function listItems(listId) {
    if (!ready()) return [];
    const { data, error } = await client.from('list_items').select('*').eq('list_id', listId).order('created_at');
    if (error) { console.warn(error); return []; }
    return data || [];
  }
  async function addListItem(listId, payload) {
    if (!ready()) throw new Error('Connexion requise');
    const { data, error } = await client.from('list_items')
      .insert({ list_id: listId, author_id: user().id, data: payload }).select().single();
    if (error) throw error;
    return data;
  }
  async function removeListItem(itemId) {
    if (!ready()) throw new Error('Connexion requise');
    const { error } = await client.from('list_items').delete().eq('id', itemId);
    if (error) throw error;
  }
  async function leaveList(listId) {
    if (!ready()) return;
    await client.from('list_members').delete().eq('list_id', listId).eq('user_id', user().id);
  }

  /* ---------- Fichiers (photos de vêtements, repas) ---------- */
  /* Les compartiments sont préfixés : le projet héberge aussi WALLET. */
  const bucketName = (b) => (b.indexOf('ever-') === 0 ? b : 'ever-' + b);

  async function uploadImage(bucket, file) {
    if (!ready()) throw new Error('Connexion requise pour envoyer une photo');
    const ext = (file.name || 'img.jpg').split('.').pop().toLowerCase();
    const path = user().id + '/' + UI.uid() + '.' + ext;
    const { error } = await client.storage.from(bucketName(bucket)).upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = client.storage.from(bucketName(bucket)).getPublicUrl(path);
    return { path: path, url: data.publicUrl };
  }
  async function deleteImage(bucket, path) {
    if (!ready()) return;
    await client.storage.from(bucketName(bucket)).remove([path]);
  }

  global.Cloud = {
    init, configured, ready, user, client: () => client,
    signUp, signIn, signInMagic, resetPassword, signOut,
    putSettings, putCollection, getAll,
    createSharedList, joinSharedList, myLists, listItems, addListItem, removeListItem, leaveList,
    uploadImage, deleteImage
  };
})(window);
