/* ============================================================
   EVER — Retour sonore et haptique

   Repris de WALLET, où le principe est juste : sur iOS, un <audio>
   par clic sature et introduit un retard audible. On décode chaque
   son une fois, on le rejoue via WebAudio, et le contexte n'est créé
   qu'au premier geste utilisateur, comme l'exige Safari.

   Tout est désactivable dans Réglages. Par défaut, le son est coupé
   et l'haptique est active : une app qui fait du bruit sans qu'on
   l'ait demandé, c'est une app qu'on désinstalle.
   ============================================================ */
(function (global) {
  'use strict';

  const FILES = {
    tap: 'tap.mp3', select: 'select.mp3', toggle: 'toggle.mp3',
    sheetOpen: 'sheet-open.mp3', sheetClose: 'sheet-close.mp3',
    back: 'back.mp3', launch: 'launch.mp3',
    success: 'success.mp3', alert: 'alert.mp3', warn: 'warn.mp3', error: 'error.mp3'
  };
  const VOLUME = {
    tap: .16, select: .2, toggle: .18, sheetOpen: .22, sheetClose: .18,
    back: .18, launch: .28, success: .3, alert: .32, warn: .26, error: .28
  };
  /* Vibrations : courtes, jamais insistantes. */
  const HAPTIC = {
    tap: 6, select: 9, toggle: 8, sheetOpen: 10, sheetClose: 6, back: 6,
    launch: [8, 30, 12], success: [10, 40, 16], alert: [14, 60, 14],
    warn: [12, 50, 12], error: [18, 60, 18], tick: 4, light: 8, medium: 14, heavy: 22
  };

  let ctx = null;
  const buffers = new Map();
  const pending = new Map();

  const prefs = () => ({
    sound: Store.get('sound', false),
    haptics: Store.get('haptics', true)
  });

  function audioContext() {
    if (ctx) return ctx;
    const C = global.AudioContext || global.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
    return ctx;
  }

  function load(name) {
    if (buffers.has(name)) return Promise.resolve(buffers.get(name));
    if (pending.has(name)) return pending.get(name);
    const c = audioContext(), file = FILES[name];
    if (!c || !file) return Promise.resolve(null);

    const task = fetch('sounds/' + file)
      .then((r) => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))
      .then((buf) => c.decodeAudioData(buf))
      .then((decoded) => { buffers.set(name, decoded); pending.delete(name); return decoded; })
      .catch(() => { pending.delete(name); return null; });

    pending.set(name, task);
    return task;
  }

  /* Précharge discrète au premier geste : on ne bloque jamais un clic. */
  let armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    const c = audioContext();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (prefs().sound) ['tap', 'select', 'success', 'sheetOpen'].forEach(load);
  }
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, arm, { once: true, passive: true }));

  async function play(name) {
    if (!prefs().sound) return;
    const c = audioContext();
    if (!c) return;
    if (c.state === 'suspended') { try { await c.resume(); } catch (e) { return; } }
    const buf = await load(name);
    if (!buf) return;
    try {
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = VOLUME[name] == null ? .2 : VOLUME[name];
      src.buffer = buf;
      src.connect(gain).connect(c.destination);
      src.start(0);
    } catch (e) {}
  }

  function vibrate(name) {
    if (!prefs().haptics || !('vibrate' in navigator)) return;
    const v = HAPTIC[name];
    if (!v) return;
    try { navigator.vibrate(v); } catch (e) {}
  }

  /* Point d'entrée unique : son + vibration, jamais bloquant. */
  function fire(name) {
    vibrate(name);
    play(name);
  }

  global.Feedback = { fire, play, vibrate, arm, FILES: Object.keys(FILES) };
})(window);
