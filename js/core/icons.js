/* ============================================================
   EVER — Bibliotheque d'icones
   Trait fin, 24x24, une seule grille, aucune dependance.
   Règle produit : des icones dans l'interface, jamais d'emoji.
   Les emoji ne survivent que dans les données saisies par
   l'utilisateur et dans les jeux de données historiques.
   ============================================================ */
(function (global) {
  'use strict';

  const P = {
    /* Navigation principale */
    coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 2.5v2M10.5 2v2.5M14 2.5v2"/>',
    glass: '<path d="M4 3h16l-7 8v8"/><path d="M9 21h6"/><path d="M13 11 20 3"/>',
    pot: '<path d="M5 10h14v5a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-5Z"/><path d="M3 10h18"/><path d="M19 12.5h1.8a1.5 1.5 0 0 1 0 3H19"/><path d="M5 12.5H3.2a1.5 1.5 0 0 0 0 3H5"/><path d="M12 4v3M9 5.5v1.5M15 5.5v1.5"/>',
    apple: '<path d="M12 7.5c-1.2-1.6-3-2.3-4.6-1.7C5.3 6.6 4 9 4 11.7c0 4 2.6 8.3 5 8.3 1 0 1.7-.5 3-.5s2 .5 3 .5c2.4 0 5-4.3 5-8.3 0-2.7-1.3-5.1-3.4-5.9-1.6-.6-3.4.1-4.6 1.7Z"/><path d="M12 7.5c0-1.9 1.3-3.5 3-4"/>',
    heart: '<path d="M12 20s-7-4.3-7-9.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 15.7 12 20 12 20Z"/>',
    activity: '<path d="M3 12h4l2.5-7 5 14L17 12h4"/>',

    /* Chrome */
    grid: '<circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-3.9 3.6-6 8-6s8 2.1 8 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    back: '<path d="m15 19-7-7 7-7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    edit: '<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8Z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-1.3 5.5"/><path d="M20 5v6h-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4M12 17h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16 6 12l4-4M6 12h10"/>',
    link: '<path d="M10 13a4.5 4.5 0 0 0 6.5.4l2-2a4.5 4.5 0 0 0-6.4-6.4L11 6"/><path d="M14 11a4.5 4.5 0 0 0-6.5-.4l-2 2a4.5 4.5 0 0 0 6.4 6.4L13 18"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 20V8M7 12l5-5 5 5"/><path d="M4 4h16"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M4 4l16 16"/><path d="M9.9 5.6A10.5 10.5 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 7.7A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',

    /* Modules */
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.3-2h6.8l1.3 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"/><circle cx="12" cy="13" r="4"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/>',
    flame: '<path d="M12 3s4 3.5 4 7a4 4 0 0 1-8 0c0-1.2.5-2.2 1-3-2 1.5-4 4-4 7a7 7 0 1 0 14 0c0-5-4-8.5-7-11Z"/>',
    steps: '<path d="M7 21c-1.5 0-2.5-1-2.5-2.5 0-2 1-3 1-5S4 10 4 7.5 5.3 3 7.3 3s2.7 1.8 2.7 4-1 3.5-1 5.5.5 3 .5 5.5S8.5 21 7 21Z"/><path d="M17.5 21c1.5 0 2.5-1 2.5-2.5 0-2-1-3-1-5s1.5-3.5 1.5-6-1.3-4.5-3.3-4.5S14.5 4.8 14.5 7s1 3.5 1 5.5-.5 3-.5 5.5.9 3 2.5 3Z"/>',
    pulse: '<path d="M3 12h3.5l2-5 3.5 10 2.5-6 1.5 3H21"/>',
    moon: '<path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5Z"/>',
    dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    scale: '<circle cx="12" cy="12" r="9"/><path d="M12 12 15.5 8"/><path d="M12 3v2"/>',
    gift: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18M12 9v11"/><path d="M12 9S10.5 4.5 8 4.5a2.2 2.2 0 0 0 0 4.5h4Zm0 0s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5h-4Z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3 12h18M3 8h4.5M16.5 8H21M3 16h4.5M16.5 16H21"/>',
    tv: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="m9 22 3-3 3 3"/>',
    map: '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    shirt: '<path d="M8 3 4 5.5 6 10l2-1v11h8V9l2 1 2-4.5L16 3l-2 2h-4L8 3Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.3-8 6 6 0 0 1 11.5 1.6A3.5 3.5 0 0 1 17.5 18Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    rain: '<path d="M7 15a4 4 0 0 1-.3-8 6 6 0 0 1 11.5 1.6A3.5 3.5 0 0 1 17.5 15Z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/>',
    sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="m18.5 15.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5.5v1.5A3.5 3.5 0 0 0 9 10M16 5h2.5v1.5A3.5 3.5 0 0 1 15 10"/><path d="M12 13v4M9 20h6M10 17h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
    bell: '<path d="M18 15V10a6 6 0 1 0-12 0v5l-1.6 3h15.2L18 15Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    book: '<path d="M4 4.5A2 2 0 0 1 6 3h13v16H6a2 2 0 0 0-2 2V4.5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    water: '<path d="M12 3s6 6.4 6 10.5A6 6 0 1 1 6 13.5C6 9.4 12 3 12 3Z"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 16c0 2 1 4 1 4s2-9 15-11c0 0-5 2-8 6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.3 3-5.2 6.5-5.2s6.5 1.9 6.5 5.2"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.6c2.2.6 3.5 2.2 3.5 4.4"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9.5Z"/>',
    fork: '<path d="M6 3v6a2.5 2.5 0 0 0 5 0V3M8.5 11v10"/><path d="M17 3c-1.5 1.5-2 3-2 5s.6 3 2 3v10"/>',
    sync: '<path d="M20 6a8 8 0 0 0-14 2M4 18a8 8 0 0 0 14-2"/><path d="M4 4v4h4M20 20v-4h-4"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15.5 12v2.5"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2"/>',
    theme: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" fill="currentColor"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>'
  };

  function icon(name, size) {
    const d = P[name];
    if (!d) return '';
    const s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  icon.has = (n) => !!P[n];
  icon.names = () => Object.keys(P);
  global.Icon = icon;
})(window);
