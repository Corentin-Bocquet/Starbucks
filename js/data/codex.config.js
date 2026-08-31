/* EVER — Configuration du Codex : assistant 3 étapes, palettes, héros. */
/* Assistant de choix : 3 étapes par onglet, 2 à 6 options par étape.
   La norme des "product finders" du web est 3 à 5 étapes ; on reste à 3 pour ne pas lasser. */
const ANY = {v:null, n:'Peu importé', s:'Montre-moi tout', img:'ck-bar-non'};

const WIZ = {
 sb:[
  {key:'temp2', q:'Tu le veux comment ?', sub:'La température, c\'est le premier tri.', opts:[
   {v:'chaud', n:'Chaud', s:'Tasse fumante', img:'sb-temp-chaud'},
   {v:'glace', n:'Glacé', s:'Sur glaçons', img:'sb-temp-glace'},
   {v:'mixe', n:'Mixé', s:'Frappuccino', img:'sb-temp-mixe'}, ANY]},
  {key:'base', q:'Sur quelle base ?', sub:'Ce qui donne le goût dominant.', opts:[
   {v:'cafe', n:'Café', s:'Espresso ou filtre', img:'sb-base-cafe'},
   {v:'lait', n:'Sans café', s:'Lait et chocolat', img:'sb-base-lait'},
   {v:'the', n:'Thé & matcha', s:'Chai, matcha, Earl Grey', img:'sb-base-the'},
   {v:'fruit', n:'Fruité', s:'Refreshers', img:'sb-base-fruit'}, ANY]},
  {key:'gour', q:'Léger ou gourmand ?', sub:'Compté sur une taille Grande.', opts:[
   {v:'leger', n:'Léger', s:'Moins de 150 kcal', img:'sb-gour-leger'},
   {v:'équilibré', n:'Équilibré', s:'150 à 300 kcal', img:'sb-gour-equilibre'},
   {v:'gourmand', n:'Gourmand', s:'Plus de 300 kcal', img:'sb-gour-gourmand'}, ANY]}],
 ck:[
  {key:'alcool', q:'Tu pars sur quel alcool ?', sub:'Un seul choix, on affine juste après.', opts:[
   {v:'rhum', n:'Rhum', s:'Blanc, ambré, overproof', img:'ck-alcool-rhum'},
   {v:'whisky', n:'Whisky', s:'Bourbon, rye, blend', img:'ck-alcool-whisky'},
   {v:'vodka', n:'Vodka', s:'Neutre et polyvalente', img:'ck-alcool-vodka'},
   {v:'tequila', n:'Tequila', s:'Agave et agrumes', img:'ck-alcool-tequila'},
   {v:'gin', n:'Gin', s:'Genièvre et botaniques', img:'ck-alcool-gin'}, ANY]},
  {key:'humeur', q:'Envie de quoi, là ?', sub:'Le profil de goût, pas la recette.', opts:[
   {v:'frais', n:'Frais & acidulé', s:'Citron, menthe, bulles', img:'ck-humeur-frais'},
   {v:'tropical', n:'Tropical', s:'Ananas, passion, mangue', img:'ck-humeur-tropical'},
   {v:'corse', n:'Corsé & amer', s:'Court, alcool en avant', img:'ck-humeur-corse'},
   {v:'gourmand', n:'Crémeux', s:'Coco, crème, dessert', img:'ck-humeur-gourmand'},
   {v:'chic', n:'Chic & festif', s:'Verre à pied, élégant', img:'ck-humeur-chic'}, ANY]},
  {key:'__stock', q:'Avec ce que tu as ?', sub:'Ton bar est modifiable dans les paramètres.', opts:[
   {v:'oui', n:'Mon bar', s:'Faisable ce soir', img:'ck-bar-oui'},
   {v:'non', n:'Peu importé', s:'Même si j\'achète', img:'ck-bar-non'}]}],
 mm:[
  {key:'moment', q:'C\'est pour quel moment ?', sub:'Le service décide de tout le reste.', opts:[
   {v:'apero', n:'Apéro', s:'À grignoter', img:'mm-moment-apero'},
   {v:'entree', n:'Entrée', s:'Salades et petits plats', img:'mm-moment-entree'},
   {v:'plat', n:'Plat', s:'Le vrai repas', img:'mm-moment-plat'},
   {v:'dessert', n:'Dessert', s:'La fin qu\'on retient', img:'mm-moment-dessert'}, ANY]},
  {key:'serv', q:'Chaud ou froid ?', sub:'Comment ça se sert à table.', opts:[
   {v:'chaud', n:'Chaud', s:'Sortie de casserole', img:'mm-serv-chaud'},
   {v:'froid', n:'Froid', s:'Frigo ou ambiante', img:'mm-serv-froid'}, ANY]},
  {key:'mode', q:'Tu allumes le four ?', sub:'Utile quand on a la flemme.', opts:[
   {v:'four', n:'Au four', s:'Gratins et gâteaux', img:'mm-mode-four'},
   {v:'sansfour', n:'Sans four', s:'Poêle, casserole, cru', img:'mm-mode-sansfour'}, ANY]}]
};

/* Palettes de fond des cartes, une teinte par index, dérivées de la DA de l'onglet */
const CARDCOL = {
 sb:[['#D6EDE3','#00643C'],['#E7F0D9','#4E7A2E'],['#FBE9D2','#B0703A'],['#E3E9F5','#3D5A8A'],['#F5DEE4','#9A3F5C'],['#E8E2F2','#5B3E8E']],
 ck:[['#F3DCE7','#7B2D56'],['#FADFD3','#B05A34'],['#E5DDF0','#4E3475'],['#F7E6C9','#96702A'],['#DCE9E4','#2F6B54'],['#EDE1DB','#7A5B4C']],
 mm:[['#F6E2CE','#A8542A'],['#EAE6D4','#6E6A38'],['#F7DDD8','#9C4436'],['#E2EAD9','#4C6B3C'],['#EDE3F0','#6B4478'],['#DCE7EC','#3E6274']]
};


const MMCATS=[{id:'mamie-sucre',nom:'Le sucré',ico:'🍰',desc:'Desserts, goûters et douceurs de fin de repas.'},
              {id:'mamie-sale',nom:'Le salé',ico:'🍲',desc:'Entrées, plats et apéros de la maison.'}];
const CATOBJ={};[...CATS,...CKCATS,...MMCATS].forEach(c=>CATOBJ[c.id]=c);
const CATNAME={};Object.keys(CATOBJ).forEach(k=>CATNAME[k]=CATOBJ[k].nom);
const BADGE={permanent:'',saison:'Saisonnier',archive:'Archive',secret:'Secret',base:'Base maison',rare:'Rare en France'};
const BCLS={saison:'sai',archive:'arc',secret:'sec',base:'bas',rare:'arc'};
const SIZENAME={t:'Tall · 355 ml',g:'Grande · 473 ml',v:'Venti · 591 ml'};
const STOCKDEF={sb:PLACARD,ck:BAR,mm:GARDE};
const STOCKNAME={};[...PLACARD,...BAR,...GARDE].forEach(b=>STOCKNAME[b.k]=b.n);
const STOCKTITLE={sb:'Mon placard',ck:'Mon bar',mm:'Mon garde-manger'};
const DATA={sb:()=>DRINKS,ck:()=>COCKTAILS,mm:()=>MAMIE};
const CATLIST={sb:()=>CATS,ck:()=>CKCATS,mm:()=>MMCATS};
const HERO={
 sb:{img:IMG.hero, kicker:'Café', eye:"103 recettes · Eletta Explore", t:'Café', em:'',
     p:"Toute la carte décomposée en millilitres, avec l'ordre d'assemblage et les réglages machine.",
     stats:[[DRINKS.length,'recettes'],[CATS.length,'catégories'],[3,'tailles']]},
 ck:{img:IMG['hero-ck'], kicker:'Bar', eye:'21 cocktails · Dosages IBA', t:'Bar', em:'',
     p:"Vingt classiques aux dosages officiels et une création maison. Coche ton bar, l'app dit ce que tu peux faire ce soir.",
     stats:[[COCKTAILS.length,'cocktails'],[BAR.length,'ingrédients'],[3,'familles']]},
 mm:{img:IMG['hero-mm'], kicker:'Recettes', eye:'22 recettes de famille', t:'Recettes', em:'',
     p:"Celles qui se transmettent à l'oral et qu'on finit par oublier. Quantités et photos d'origine.",
     stats:[[MAMIE.length,'recettes'],[MAMIE.filter(r=>r.cat==='mamie-sucre').length,'sucrées'],[MAMIE.filter(r=>r.cat==='mamie-sale').length,'salées']]}
};
