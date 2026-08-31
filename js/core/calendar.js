/* ============================================================
   EVER — Calendrier

   Deux chemins, un seul bouton pour l'utilisateur :

   1. Fichier .ics. Marche partout, tout de suite, sans compte et
      sans autorisation : iOS ouvre le fichier dans Calendrier,
      Android dans Agenda. C'est le comportement par défaut.

   2. Google Calendar. Nécessite un identifiant OAuth créé dans la
      console Google, colle dans Réglages, et le domaine autorise.
      Tant que ce n'est pas fait, on n'affiche rien a ce sujet :
      un bouton qui échoué est pire que pas de bouton.
   ============================================================ */
(function (global) {
  'use strict';

  const GIS = 'https://accounts.google.com/gsi/client';
  let token = null;

  const clientId = () => Store.get('googleClientId', '') || '';
  const googleReady = () => !!clientId();

  function pad(n) { return String(n).padStart(2, '0'); }
  function ical(dt) {
    const d = new Date(dt);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  const fold = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  function icsFor(ev) {
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + (ev.minutes || 90) * 60000);
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EVER//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + UI.uid() + '@ever.app',
      'DTSTAMP:' + ical(Date.now()),
      'DTSTART:' + ical(start),
      'DTEND:' + ical(end),
      'SUMMARY:' + fold(ev.title),
      ev.location ? 'LOCATION:' + fold(ev.location) : '',
      ev.description ? 'DESCRIPTION:' + fold(ev.description) : '',
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + fold(ev.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }

  /* Fenêtre de saisie : titre, date, heure, durée, lieu. */
  async function add(ev) {
    const now = new Date();
    const defDate = ev.date || UI.day.today();
    const defTime = ev.time || (now.getHours() < 18 ? '19:00' : '12:00');
    const res = await UI.promptSheet('Ajouter àu calendrier', [
      { name: 'title', label: 'Titre', value: ev.title || '' },
      { name: 'date', label: 'Date', type: 'date', value: defDate },
      { name: 'time', label: 'Heure', type: 'time', value: defTime },
      { name: 'minutes', label: 'Durée (minutes)', type: 'number', inputmode: 'numeric', value: ev.minutes || 90 },
      { name: 'location', label: 'Lieu', value: ev.location || '' }
    ], 'Ajouter');
    if (!res || !res.title) return null;

    const start = new Date(res.date + 'T' + (res.time || '19:00') + ':00');

    /* Calendrier intelligent : on prévient avant de poser un événement
       par-dessus un autre. On ne bloque pas, on informe. */
    const clash = conflicts(start, Number(res.minutes) || 90);
    if (clash.length) {
      const ok = await UI.confirmSheet(
        'Créneau déjà pris',
        'À cette heure-là tu as déjà : ' + clash.map((c) => c.title).join(', ') + '. On ajoute quand même ?',
        false);
      if (!ok) return null;
    }

    const payload = {
      title: res.title, start: start, minutes: Number(res.minutes) || 90,
      location: res.location, description: ev.description || ''
    };

    Store.add('calendarEvents', {
      title: payload.title, at: start.getTime(), minutes: payload.minutes,
      location: payload.location, kind: ev.kind || 'autre'
    });
    Store.log('calendrier', { title: payload.title, at: start.getTime() });

    if (googleReady()) {
      try { await googleInsert(payload); UI.toast('Ajoute a Google Calendar'); return payload; }
      catch (e) { console.warn(e); }
    }
    UI.download(slug(payload.title) + '.ics', icsFor(payload), 'text/calendar');
    UI.toast('Événement prêt : ouvre le fichier pour l\'ajouter');
    return payload;
  }

  const slug = (s) => String(s || 'evenement').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  /* ============================================================
     Calendrier intelligent

     Sans OAuth Google, l'app connaît quand même son propre agenda :
     tout ce qu'elle a planifié est enregistré localement. Cela suffit
     à éviter de poser deux choses au même moment, à proposer un
     créneau libre, et à dire à Gemini de quoi la journée est faite.
     Avec Google connecté, les vrais événements viennent s'ajouter.
     ============================================================ */

  /* Tous les événements connus d'une journée, triés. */
  function dayEvents(dayKey) {
    const key = dayKey || UI.day.today();
    const own = Store.all('calendarEvents')
      .filter((e) => UI.day.key(e.at) === key)
      .map((e) => ({ title: e.title, start: e.at, end: e.at + (e.minutes || 90) * 60000, source: 'ever', kind: e.kind }));
    const ext = (Store.get('googleDayCache', {})[key] || []).map((e) => ({
      title: e.title, start: new Date(e.start).getTime(), end: new Date(e.end).getTime(), source: 'google'
    }));
    return own.concat(ext).sort((a, b) => a.start - b.start);
  }

  /* Ce qui chevauche un créneau donné. */
  function conflicts(start, minutes) {
    const s = new Date(start).getTime();
    const e = s + (minutes || 90) * 60000;
    return dayEvents(UI.day.key(s)).filter((x) => x.start < e && x.end > s);
  }

  /* Premier créneau libre d'au moins `minutes`, dans la plage donnée. */
  function freeSlot(dayKey, minutes, fromHour, toHour) {
    const key = dayKey || UI.day.today();
    const need = (minutes || 90) * 60000;
    const [y, m, d] = key.split('-').map(Number);
    let cursor = new Date(y, m - 1, d, fromHour == null ? 9 : fromHour, 0, 0).getTime();
    const limit = new Date(y, m - 1, d, toHour == null ? 23 : toHour, 0, 0).getTime();
    if (key === UI.day.today()) cursor = Math.max(cursor, Date.now() + 30 * 60000);

    const busy = dayEvents(key);
    for (const b of busy) {
      if (b.start - cursor >= need) return new Date(cursor);
      cursor = Math.max(cursor, b.end);
    }
    return limit - cursor >= need ? new Date(cursor) : null;
  }

  /* Combien de temps disponible d'ici la fin de la journée. */
  function timeAvailable(dayKey) {
    const key = dayKey || UI.day.today();
    const slot = freeSlot(key, 30);
    if (!slot) return 0;
    const busy = dayEvents(key).filter((b) => b.start > slot.getTime());
    const [y, m, d] = key.split('-').map(Number);
    const end = busy.length ? busy[0].start : new Date(y, m - 1, d, 23, 0, 0).getTime();
    return Math.max(0, Math.round((end - slot.getTime()) / 60000));
  }

  /* Résumé injecté dans les invites Gemini. */
  function describe(dayKey) {
    const list = dayEvents(dayKey);
    if (!list.length) return 'Agenda : rien de prévu.';
    return 'Agenda : ' + list.map((e) =>
      UI.fmt.time(e.start) + ' ' + e.title + ' (' + Math.round((e.end - e.start) / 60000) + ' min)').join(' ; ') +
      '. Temps libre restant : ' + timeAvailable(dayKey) + ' minutes.';
  }

  /* Filtre une liste de propositions selon le temps réellement dispo. */
  function fits(item, dayKey) {
    const need = item.minutes || durationOf(item);
    const free = timeAvailable(dayKey);
    return free === 0 || need <= free;
  }
  const DUREES = {
    bar: 120, cafe: 60, restaurant: 105, brunch: 105, glacier: 30, apero: 90,
    musee: 120, galerie: 60, exposition: 90, cinema: 140, bowling: 90, karting: 75,
    escape: 90, spa: 150, plage: 180, promenade: 60, randonnee: 210, velo: 120,
    ski: 300, golf: 240, tennis: 90, shopping: 120, evenement: 180
  };
  const durationOf = (item) => DUREES[item.kind] || 90;

  /* ---------- Google Calendar (optionnel) ---------- */
  function loadGis() {
    if (global.google && google.accounts) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = GIS; s.async = true; s.onload = res; s.onerror = () => rej(new Error('Google indisponible'));
      document.head.appendChild(s);
    });
  }

  async function googleAuth() {
    if (!googleReady()) throw new Error('Identifiant Google absent');
    await loadGis();
    return new Promise((resolve, reject) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (resp) => {
          if (resp && resp.access_token) { token = resp.access_token; resolve(token); }
          else reject(new Error('Autorisation refusée'));
        }
      });
      tc.requestAccessToken({ prompt: token ? '' : 'consent' });
    });
  }

  async function googleInsert(ev) {
    const t = token || await googleAuth();
    const end = new Date(new Date(ev.start).getTime() + (ev.minutes || 90) * 60000);
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: ev.title,
        location: ev.location || undefined,
        description: ev.description || undefined,
        start: { dateTime: new Date(ev.start).toISOString() },
        end: { dateTime: end.toISOString() }
      })
    });
    if (!r.ok) { token = null; throw new Error('Google Calendar a refusé la demande'); }
    return r.json();
  }

  async function busyToday() {
    if (!googleReady() || !token) return [];
    try {
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(); to.setHours(23, 59, 59, 0);
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime' +
        '&timeMin=' + from.toISOString() + '&timeMax=' + to.toISOString(), { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) return [];
      const j = await r.json();
      return (j.items || []).map((e) => ({ title: e.summary, start: e.start && (e.start.dateTime || e.start.date), end: e.end && (e.end.dateTime || e.end.date) }));
    } catch (e) { return []; }
  }

  /* Rafraîchit le cache Google d'une journée, sans jamais bloquer. */
  async function refreshGoogleDay(dayKey) {
    if (!googleReady() || !token) return;
    const key = dayKey || UI.day.today();
    try {
      const items = await busyToday();
      const cache = Store.get('googleDayCache', {});
      cache[key] = items;
      Store.set('googleDayCache', cache);
    } catch (e) {}
  }

  global.Cal = {
    add, icsFor, googleReady, googleAuth, busyToday,
    dayEvents, conflicts, freeSlot, timeAvailable, describe, fits, durationOf, refreshGoogleDay
  };
})(window);
