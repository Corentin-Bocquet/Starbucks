/* ============================================================
   EVER — Illustrations animées

   Pourquoi pas LottieFiles, puisque c'était la demande

   Une animation Lottie est un fichier JSON hébergé chez eux. Pour
   m'en servir, il me faudrait l'identifiant exact d'une animation
   précise, vérifié. Je n'ai pas pu les vérifier depuis ici : je
   n'aurais donc livré que des URL devinées, c'est-à-dire des
   dépendances cassées le jour où l'une d'elles change ou disparaît,
   et une icône absente au milieu de l'écran.

   Ce fichier fait la même chose autrement : il anime les
   illustrations qui sont DÉJÀ dans l'application, en CSS. Résultat
   identique à l'œil, zéro octet à télécharger, ça marche hors
   ligne, et rien ne peut disparaître.

   `Anime.charger()` reste là pour le jour où une animation Lottie
   précise sera choisie : elle charge le moteur à la demande et
   joue le JSON qu'on lui donne. Rien ne s'appelle tout seul.

   Six mouvements, un par intention :
     flotte   ce qui attend        respire  ce qui est vivant
     tourne   ce qui recharge      bat      ce qui compte le temps
     brille   ce qui vient d'être gagné
     saute    ce qu'on vient de toucher
   ============================================================ */
(function (global) {
  'use strict';

  const calme = () => global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Le mouvement qui va de soi pour chaque illustration. C'est
     l'objet qui décide, pas l'endroit où on le pose : une flamme
     vacille partout, une roue tourne partout. */
  const MOUVEMENT = {
    flamme: 'respire', eclair: 'brille', goutte: 'flotte', coeur: 'bat',
    refaire: 'tourne', sync: 'tourne', roue: 'tourne-lent',
    coupe: 'flotte', medaille: 'brille', etoile: 'brille',
    haltere: 'saute', ballon: 'saute', velo: 'flotte',
    de: 'saute', coche: 'brille', cible: 'respire',
    tasse: 'respire', marmite: 'respire', verre: 'flotte',
    cadeau: 'saute', clap: 'saute', appareil: 'brille',
    loupe: 'flotte', cle: 'flotte', lieu: 'flotte',
    pas: 'saute', lune: 'flotte', personne: 'flotte',
    gens: 'flotte', chemise: 'flotte', carte: 'flotte',
    livre: 'flotte', calendrier: 'flotte', balance: 'flotte',
    proteine: 'respire', pomme: 'flotte', corbeille: 'saute',
    sortie: 'flotte', codebarre: 'brille',
    image: 'flotte', dossier: 'saute'
  };

  /* Rend une illustration animée. `nom` est celui d'Art. */
  function art(nom, taille, opts) {
    opts = opts || {};
    if (!global.Art) return '';
    const svg = nom === 'medaille' ? Art.medaille(opts.matiere || 'or', taille) : Art(nom, taille);
    if (!svg) return '';
    if (calme() || opts.fixe) return '<span class="anime">' + svg + '</span>';
    const m = opts.mouvement || MOUVEMENT[nom] || 'flotte';
    const decalage = opts.decalage != null ? opts.decalage : (Math.random() * 900);
    return '<span class="anime m-' + m + '" style="--dec:' + Math.round(decalage) + 'ms">' + svg + '</span>';
  }

  /* Une illustration qui réagit au toucher : elle saute une fois. */
  function reagir(el) {
    if (!el || calme()) return;
    el.classList.remove('m-touche');
    /* Forcer un reflow, sinon la classe retirée puis remise dans la
       même image n'est jamais vue par le navigateur. */
    void el.offsetWidth;
    el.classList.add('m-touche');
    setTimeout(() => el.classList.remove('m-touche'), 620);
  }

  /* Anime toutes les illustrations d'un bloc qui ne le sont pas
     encore. Utile après un rendu qui a posé du HTML brut. */
  function animer(racine) {
    if (calme()) return;
    (racine || document).querySelectorAll('svg.art:not([data-anime])').forEach((s) => {
      s.setAttribute('data-anime', '1');
      const p = s.parentElement;
      if (!p || p.classList.contains('anime')) return;
      p.classList.add('anime', 'm-flotte');
      p.style.setProperty('--dec', Math.round(Math.random() * 900) + 'ms');
    });
  }

  /* ---------- Le moteur Lottie, à la demande ----------
     Non appelé aujourd'hui. Il est là pour que brancher une
     animation Lottie précise ne demande qu'une ligne le jour où on
     en aura une vérifiée. */
  const MOTEUR = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie_light.min.js';
  let moteur = null;

  function charger() {
    if (global.lottie) return Promise.resolve(global.lottie);
    if (moteur) return moteur;
    moteur = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = MOTEUR; s.async = true;
      s.onload = () => global.lottie ? res(global.lottie) : rej(new Error('moteur indisponible'));
      s.onerror = () => rej(new Error('moteur injoignable'));
      document.head.appendChild(s);
    });
    return moteur;
  }

  async function jouer(el, donnees, opts) {
    if (!el || !donnees || calme()) return null;
    try {
      const L = await charger();
      return L.loadAnimation(Object.assign({
        container: el, renderer: 'svg', loop: true, autoplay: true, animationData: donnees
      }, opts || {}));
    } catch (e) { return null; }
  }

  global.Anime = { art, reagir, animer, charger, jouer, MOUVEMENT };
})(window);
