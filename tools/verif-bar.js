/* Vérifie la cohérence du Codex : node tools/verif-bar.js
   Bar :
   - chaque ingrédient du bar sert au moins une recette ;
   - chaque ingrédient d'une recette existe dans le bar ;
   - chaque recette a un alcool et une humeur connus de l'assistant.
   Café (placard) et Recettes (garde-manger) :
   - chaque fiche a une liste sk non vide, faite de clés du stock ;
   - Café : sk contient au moins ce que demandent les ingrédients
     (règles SKREGLES.sb de codex.config.js) ;
   - Recettes : sk est exactement ce que demandent les ingrédients
     (règles SKREGLES.mm) ;
   - chaque clé du stock sert au moins une fiche.
   Partout : pas d'identifiant en double, pas de clé de stock en
   double dans un même onglet. */
const fs = require('fs');
const src = ['codex.data.js', 'cocktails.plus.js', 'cocktails.plus2.js', 'codex.config.js']
  .map((f) => fs.readFileSync(__dirname + '/../js/data/' + f, 'utf8')).join('\n').replace(/^const /gm, 'var ');
const D = new Function(src + '\nreturn {BAR, COCKTAILS, WIZ, PLACARD, GARDE, DRINKS, MAMIE, STOCKDEF, skDepuis};')();
let erreurs = 0;
const err = (...m) => { erreurs++; console.log(...m); };

/* ---------- Bar ---------- */
const bar = new Set(D.BAR.map((b) => b.k));
const used = new Set();
const alc = new Set(D.WIZ.ck[0].opts.map((o) => o.v)), hum = new Set(D.WIZ.ck[1].opts.map((o) => o.v));
D.COCKTAILS.forEach((c) => {
  c.ing.forEach((i) => { if (!i.k) return; used.add(i.k); if (!bar.has(i.k)) err('inconnu dans le bar :', c.id, i.k); });
  if (!c.ing.some((i) => i.k && !i.opt)) err('cocktail sans ingrédient requis :', c.id);
  (c.sk || []).forEach((k) => { if (!bar.has(k)) err('sk inconnu dans le bar :', c.id, k); });
  if (!alc.has(c.alcool)) err('alcool inconnu :', c.id, c.alcool);
  [].concat(c.humeur).forEach((h) => { if (!hum.has(h)) err('humeur inconnue :', c.id, h); });
});
D.BAR.forEach((b) => { if (!used.has(b.k)) err('sans recette :', b.k); });

/* ---------- Placard (Café) et garde-manger (Recettes) ---------- */
function verifStock(tab, fiches, nom, exact) {
  const stock = new Set(D.STOCKDEF[tab].map((b) => b.k));
  const servis = new Set();
  fiches.forEach((d) => {
    const sk = d.sk || [];
    if (!sk.length) err(nom + ' : sk vide :', d.id);
    sk.forEach((k) => { servis.add(k); if (!stock.has(k)) err(nom + ' : sk inconnu :', d.id, k); });
    const attendu = D.skDepuis(tab, d.ing);
    const manque = attendu.filter((k) => sk.indexOf(k) < 0);
    if (manque.length) err(nom + ' : les ingrédients demandent', manque.join(', '), 'absent(s) de sk :', d.id);
    if (exact) {
      const trop = sk.filter((k) => attendu.indexOf(k) < 0);
      if (trop.length) err(nom + ' : sk', trop.join(', '), 'sans ingrédient correspondant :', d.id);
    }
  });
  D.STOCKDEF[tab].forEach((b) => { if (!servis.has(b.k)) err(nom + ' : clé de stock jamais utilisée :', b.k); });
}
verifStock('sb', D.DRINKS, 'Café', false);
verifStock('mm', D.MAMIE, 'Recettes', true);

/* ---------- Doublons ---------- */
[['Café', D.DRINKS], ['Bar', D.COCKTAILS], ['Recettes', D.MAMIE]].forEach(([nom, l]) => {
  const ids = l.map((c) => c.id);
  ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => err(nom + ' : doublon :', x));
});
Object.keys(D.STOCKDEF).forEach((t) => {
  const ks = D.STOCKDEF[t].map((b) => b.k);
  ks.filter((x, i) => ks.indexOf(x) !== i).forEach((x) => err('clé de stock en double (' + t + ') :', x));
});

console.log(D.COCKTAILS.length + ' cocktails, ' + D.BAR.length + ' ingrédients du bar, ' +
  D.DRINKS.length + ' boissons, ' + D.MAMIE.length + ' recettes, ' + erreurs + ' erreur(s)');
process.exit(erreurs ? 1 : 0);
