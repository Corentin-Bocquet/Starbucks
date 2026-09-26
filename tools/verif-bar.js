/* Vérifie la cohérence du Bar : node tools/verif-bar.js
   - chaque ingrédient du bar sert au moins une recette ;
   - chaque ingrédient d'une recette existe dans le bar ;
   - chaque recette a un alcool et une humeur connus de l'assistant. */
const fs = require('fs');
const src = ['codex.data.js', 'cocktails.plus.js', 'codex.config.js']
  .map((f) => fs.readFileSync(__dirname + '/../js/data/' + f, 'utf8')).join('\n').replace(/^const /gm, 'var ');
const D = new Function(src + '\nreturn {BAR, COCKTAILS, WIZ};')();
const bar = new Set(D.BAR.map((b) => b.k));
const used = new Set();
let erreurs = 0;
const alc = new Set(D.WIZ.ck[0].opts.map((o) => o.v)), hum = new Set(D.WIZ.ck[1].opts.map((o) => o.v));
D.COCKTAILS.forEach((c) => {
  c.ing.forEach((i) => { if (!i.k) return; used.add(i.k); if (!bar.has(i.k)) { erreurs++; console.log('inconnu dans le bar :', c.id, i.k); } });
  if (!alc.has(c.alcool)) { erreurs++; console.log('alcool inconnu :', c.id, c.alcool); }
  if (!hum.has(c.humeur)) { erreurs++; console.log('humeur inconnue :', c.id, c.humeur); }
});
D.BAR.forEach((b) => { if (!used.has(b.k)) { erreurs++; console.log('sans recette :', b.k); } });
const ids = D.COCKTAILS.map((c) => c.id);
ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => { erreurs++; console.log('doublon :', x); });
console.log(D.COCKTAILS.length + ' cocktails, ' + D.BAR.length + ' ingrédients, ' + erreurs + ' erreur(s)');
process.exit(erreurs ? 1 : 0);
