/* ============================================================
   EVER : Visuels

   Toutes les images de l'application sont générées une fois,
   détourées, et livrées avec elle dans img/v/. Plus aucune banque
   d'images, plus aucune génération à la volée : une image qui
   n'est pas dans ce catalogue n'existe pas, et l'interface prend
   alors une mise en page sans image, pensée pour ça.

   Le point d'entrée est `Vis.trouve(texte, type)`. Il reçoit ce
   que l'application nomme (« Karting », « Gousse d'ail », « Bateau
   de sushis à plusieurs ») et rend le nom du fichier, ou null.

   Trois étages, dans cet ordre :
     1. le nom exact du fichier ;
     2. les règles, des expressions testées dans l'ordre : la plus
        précise d'abord (« blanc d'oeuf » avant « oeuf ») ;
     3. rien. Mieux vaut pas d'image qu'une image fausse.

   Le type oriente la recherche : un « Café » est une activité dans
   Activités, un ingrédient dans une recette.
   ============================================================ */
(function (global) {
  'use strict';

  const BASE = 'img/v/';

  /* La liste des fichiers livrés, régénérée à chaque lot d'images. */
  const DISPO = 'a-commander,a-faire,a-voir,acai,accessoires,activite,actualiser,aider,ail,ajouter,alcool,alcoolise,aliment,ami,ananas,angostura,animal,anis,apero,apple-sante,apprendre,apres-ski,asperges,asperges-vertes,avion,baguette-magique,bain,bain-glace,bar,barbecue,barbecue-plat,barre-chocolat,bas,basilic,bateau,beach-volley,beef-jerky,beignets,betteraves,beurre,bien-habille,biere,biere-abbaye,biere-aromatisee,biere-blonde,biere-tequila,biscuit-graham,blanc-oeuf,blender,boeuf,boisson-inventee,bonbons,bons-plans,boomerang,boudoirs,bouillon,bouquet-garni,bourbon,boussole,bowling,boxe,brandy-mure,brunch,brunch-plat,cacahuetes,cacahuetes-3d,cacao,cadeau,cafe,cafe-calme,cafe-filtre,cafe-lieu,cafe-soluble,caipirinha,calendrier,calin,calories,campari,cannelle,canyoning,caramel,cardio,carottes,cassonade,cat-autre,cat-culture,cat-ete,cat-food,cat-fun,cat-hiver,cat-insolite,cat-plage,cat-sport,cerf-volant,cerise,chai,chambord,champignons,chapelure,char-voile,chataigne,chaussettes,chaussures,chercher,chili,chill,chocolat-lait,chocolat-noir,chocolat-suisse,chouchous,cinema,citron-jaune,citron-vert,citronnade,ck-bar-oui,ck-chic,ck-corse,ck-cremeux,ck-frais,ck-gin,ck-peu-importe,ck-rhum,ck-tequila,ck-tropical,ck-vodka,ck-whisky,classe,cocktail-exotique,cocktail-invente,cocktails,codebarre,cognac,coiffeur,coins-discrets,cold-brew,collegue,comptes,connue,cookie-sucre,cookies,coucher-soleil,couple,courgettes,course,cran,creme,creme-coco,creme-dessert,creme-fouettee,creme-fraiche,crepe,croutons,cuisiner,cuisiner-ensemble,cuisiner-pour,culture,dahl,de,defi,demander,deux-cafes,diner-deux,dormir,dormir-amis,douche-froide,dunes,eau,eau-gazeuse,ecrire,effacer,elan,enfant,epices,equitation,escalade,escape,espresso,estragon,etirements,exporter,exposition,famille,farine,fauteuil,favoris,fierte,film-blotti,fondue,fondue-bourguignonne,foot,fraises,fratrie,fromage,fruit-dragon,fruit-passion,fruits,fuet,galerie,gaufre,gaufre-food,gin,gin-japonais,glace,glace-barre,glace-cookie,glace-pot,glacons,glucides,golf,grains-cafe,grands-parents,grenadine,guide,haut,herbes,hibiscus,histoire,historique,hot-dog,huile,hydratation,ic-cafe,ic-manger,ic-savoir,ic-shopping,ic-sortir,ic-verre,jambon,jeu-video,jeux-plage,jeux-societe,jus-ananas,jus-canneberge,jus-orange,jus-pamplemousse,jus-rouge,karting,kine,kitesurf,kiwi,kobe,lait,lait-vegetal,lardons,lecture,legumes,levure,lieu,limonade,liqueur-banane,liqueur-cafe,liqueur-creme,listes,luge,luge-rail,mails,mais,marche,marche-defi,marcher,marcher-deux,marshmallow,mascarpone,massage,mastiha,matcha,menthe,message,meteo-chaud,meteo-froid,meteo-pluie,meteo-soleil,mi-cuit,mini-chocolats,mini-golf,mm-apero,mm-chaud,mm-dessert,mm-entree,mm-express,mm-four,mm-froid,mm-mijote,mm-peu-importe,mm-plat,mm-sansfour,mochi,mojito,molkky,mood,mousse-lait,muffins,munster,muscade,muscle,musculation,musee,musique,nitro,noix,noter,objectifs,oeufs,oignon,oldmoney,pancakes-sales,paprika,parapente,parent,parents,parfum,parler,pas,pastel-nata,pate-cacahuete,pate-cookie,pate-tarte,patinoire,peanut-cups,peche,penderie,persil,petanque,peu-importe,photo-tenue,pique-nique,pistache,pizza,plage,plat-enfance,plateau,poids,poisson,poivre,poke,pomme,pommes-de-terre,pompes,popcorn,porc-caramel,poudre-rose,poulet,praline,pratique,proteines,publier,rafting,rando-groupe,randonnee,ranger,raquettes-neige,raquettes-plage,recette-inventee,reconfort,record,repas-potes,restaurant,rhum,rhum-arrange,rhum-blanc,rhum-overproof,ribs,rillettes,rire,riz,rosalie,roti,roue,rye,salade-verte,sale,sans-alcool,sardines,sauce-chocolat,saucisson,sauna,sb-cafe,sb-chaud,sb-equilibre,sb-fruit,sb-glace,sb-gourmand,sb-lait,sb-leger,sb-mixe,sb-the,scanner,seance-lourde,sel,semaine,sex-on-the-beach,sirop-bleu,sirop-canne,sirop-saison,sirop-sucre,sirop-vanille,sirop-violette,ski,ski-fond,snowboard,soda-orange,soda-pamplemousse,soiree,soiree-deux,sommeil,sourire,sous-vetement,souvenirs,spa,speculoos,sport,sport-co,sport-tenue,sucre,sucre-cat,surprise,sushi,sushis,sweet-cream,t-bone,tache,telephone,tendresse,tennis,tenue,tequila,terrine,the,thon,tiramisu,tomates,tomates-farcies,tomates-sechees,topping,tous,trail,triple-sec,trois-idees,truffes-chocolat,ufc,vanille,veau,velo,velo-route,vermouth-rouge,vermouth-sec,veste,via-ferrata,viande,video,villa,vin-blanc,vin-cuit,vin-rouge,vinaigre-balsamique,vinaigre-cidre,visite,vodka,vodka-framboise,vodka-noire,vodka-peche,vodka-rose,vodka-rouge,vtt,vtt-descente,whisky,whisky-miel,wraps,xanthane,zeste-orange'.split(',');
  const SET = new Set(DISPO);

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

  /* ---------- Les règles ----------
     Chaque ligne : [expression, fichier]. L'expression porte sur
     le texte normalisé (minuscules, sans accents ni ponctuation). */
  const R = (src, slug) => [new RegExp(src), slug];

  const CONCEPTS = [
    R('^(tourner|tourner la roue|la roue|roue|roulette|hasard|de hasard|lancer)$', 'roue'),
    R('trois idees|3 idees|plusieurs idees', 'trois-idees'),
    R('surprends moi|surprise|choisis pour moi|choisi pour moi', 'surprise'),
    R('baguette magique|inventer|invente|creer avec l ia|generer', 'baguette-magique'),
    R('^(ajouter|nouveau|nouvelle|creer|a saisir ajouter|saisir|ajouter une activite|une activite)$', 'ajouter'),
    R('historique|deja fait|mon historique|journal des sorties', 'historique'),
    R('^(favoris|favori|mes favoris|coups de coeur)$', 'favoris'),
    R('^(listes|mes listes|liste|a acheter|courses)$', 'listes'),
    R('^(chercher|rechercher|recherche|a la main|saisie manuelle|dans la base)$', 'chercher'),
    R('actualiser|rafraichir|refresh|mettre a jour', 'actualiser'),
    R('^(tourner ici|explorer|boussole)$', 'boussole'),
    R('histoire', 'histoire'),
    R('culture', 'culture'),
    R('pourquoi elle est connue|connue pour|celebre|emblematique', 'connue'),
    R('^(a voir|voir)$|incontournable', 'a-voir'),
    R('^(a faire|faire)$', 'a-faire'),
    R('bons plans|bon plan|budget', 'bons-plans'),
    R('coins discrets|insolite|secret|cache', 'coins-discrets'),
    R('^(pratique|infos pratiques|a savoir)$', 'pratique'),
    R('^(guide|le guide|guide de ville)$', 'guide'),
    R('mes etablissements|une adresse|adresse|lieu|lieux|etablissement', 'lieu'),
    R('apple sante|sante apple|import sante', 'apple-sante'),
    R('tout effacer|effacer|supprimer|vider|poubelle', 'effacer'),
    R('exporter|export', 'exporter'),
    R('code barre|codebarre|code a barres|barcode', 'codebarre'),
    R('scanner|scan|prendre en photo|photo du plat|appareil photo', 'scanner'),
    R('objectifs|objectif|cible|palier', 'objectifs'),
    R('^(mood|humeur|ton mood|comment tu te sens)$', 'mood'),
    R('^(calories|kcal|energie)$', 'calories'),
    R('^(proteines|proteine|prot)$', 'proteines'),
    R('^(pas|marche du jour|nombre de pas)$', 'pas'),
    R('^(sommeil|dodo|nuit)$', 'sommeil'),
    R('^(eau|hydratation)$', 'hydratation'),
    R('^(poids|balance)$', 'poids'),
    R('^(cardio|coeur|frequence cardiaque|bpm)$', 'cardio'),
    R('^(glucides|glucide)$', 'glucides'),
    R('^(muscu|musculation|muscle|muscles|seance)$', 'muscle'),
    R('^(sport|sports|entrainement)$', 'sport'),
    R('^(l elan|elan|dopamine)$', 'elan'),
    R('^(la fierte|fierte|serotonine)$', 'fierte'),
    R('^(le rire|rire|cannabinoides)$', 'rire'),
    R('^(le reconfort|reconfort|opioides)$', 'reconfort'),
    R('^(le cran|cran|testosterone)$', 'cran'),
    R('^(la tendresse|tendresse|ocytocine)$', 'tendresse'),
    R('noter', 'noter'),
    R('marcher \\d|marche \\d|jours de marche', 'marche-defi'),
    R('defi|challenge', 'defi'),
    R('couple|copine|copain|chéri|cheri|femme|mari|conjoint|partenaire|amoureu', 'couple'),
    R('grand pere|grand mere|grands parents|papi|mamie|papy|mamy', 'grands-parents'),
    R('pere|mere|papa|maman|parents', 'parent'),
    R('frere|soeur|fratrie|cousin|cousine', 'fratrie'),
    R('fils|fille|enfant|neveu|niece|bebe', 'enfant'),
    R('collegue|boss|patron|travail|manager', 'collegue'),
    R('famille', 'famille'),
    R('ami|amie|pote|copain|bff', 'ami'),
    R('cadeau|cadeaux|offrir', 'cadeau'),
    R('^(sale|sales|le sale)$', 'sale'),
    R('^(sucre|sucres|le sucre)$', 'sucre-cat'),
    R('non alcoolise|sans alcool|soft|boisson$|boissons$', 'sans-alcool'),
    R('^(alcoolise|alcoolises|alcool|alcools)$', 'alcoolise'),
    R('a commander|commander|livraison', 'a-commander'),
    R('^(tous|tout|toutes)$', 'tous'),
    R('^plage et nature$|^nature$', 'cat-plage'),
    R('^fun$|^jeux$', 'cat-fun'),
    R('^food$|^manger$|^restauration$', 'cat-food'),
    R('^insolite$', 'cat-insolite'),
    R('^hiver$', 'cat-hiver'),
    R('^ete$', 'cat-ete'),
    R('^autre$|^divers$', 'cat-autre'),
    R('^haut$|^hauts$', 'haut'), R('^bas$', 'bas'), R('^chaussures$', 'chaussures'),
    R('^veste$|^manteau$|^vestes$', 'veste'), R('^accessoires?$', 'accessoires'),
    R('^sous vetements?$', 'sous-vetement'), R('^chaussettes$', 'chaussettes'),
    R('^chill$', 'chill'), R('^soiree$', 'soiree'), R('^classe$', 'classe'),
    R('^old ?money$|^oldmoney$', 'oldmoney'), R('^sport ?tenue$', 'sport-tenue'),
    R('^penderie$|^ma penderie$', 'penderie'), R('^mes tenues$|^tenues$|^tenue$', 'tenue')
  ];

  const ACTIVITES = [
    R('bateau de sushi|sushis a plusieurs|sushi boat', 'sushis'),
    R('repas avec des potes|vrai repas', 'repas-potes'),
    R('tete a tete|diner a deux|diner en tete', 'diner-deux'),
    R('soiree a deux', 'soiree-deux'),
    R('calin', 'calin'),
    R('appeler ses parents|parents', 'parents'),
    R('ami perdu de vue|appeler un ami|appeler', 'telephone'),
    R('marcher a deux', 'marcher-deux'),
    R('marcher dehors|marcher|balade|promenade$', 'marcher'),
    R('animal|chien|chat', 'animal'),
    R('cuisiner pour', 'cuisiner-pour'),
    R('cuisiner a plusieurs|cuisiner ensemble', 'cuisiner-ensemble'),
    R('cuisiner|cuisine', 'cuisiner'),
    R('film blotti|regarder un film', 'film-blotti'),
    R('ufc|mma', 'ufc'),
    R('psg|match|foot', 'foot'),
    R('jeux de societe|jeu de societe', 'jeux-societe'),
    R('sport collectif|padel|basket', 'sport-co'),
    R('cafe avec quelqu|deux cafes|prendre un cafe', 'deux-cafes'),
    R('vrai cafe|cafe assis|cafe sans telephone', 'cafe-calme'),
    R('randonnee a plusieurs|rando a plusieurs', 'rando-groupe'),
    R('dormir chez', 'dormir-amis'),
    R('dormir|sommeil|huit heures', 'dormir'),
    R('masser|massage', 'massage'),
    R('sauna|hammam', 'sauna'),
    R('bain chaud|bain$', 'bain'),
    R('bain glace|froid|mer froide|glacee', 'bain-glace'),
    R('douche froide', 'douche-froide'),
    R('vrai sujet|parler', 'parler'),
    R('etirement|respiration|yoga', 'etirements'),
    R('kine|osteo|soigner', 'kine'),
    R('plat de son enfance|enfance', 'plat-enfance'),
    R('professionnel|psy|therapeute', 'fauteuil'),
    R('seance lourde|gros mouvements', 'seance-lourde'),
    R('combat|boxe', 'boxe'),
    R('au propre avant|parfum', 'parfum'),
    R('coiffeur|barbe|ongles|au propre', 'coiffeur'),
    R('demander', 'demander'),
    R('pompes', 'pompes'),
    R('muscu|musculation|salle de sport', 'musculation'),
    R('course a pied|footing|running|sortie course', 'course'),
    R('ranger', 'ranger'),
    R('apprendre|formation|cours', 'apprendre'),
    R('montage|video', 'video'),
    R('ecrire', 'ecrire'),
    R('session de jeu|jeu video|console', 'jeu-video'),
    R('route a velo|velo de route', 'velo-route'),
    R('morceau|musique|vinyle', 'musique'),
    R('chapitre|lire|lecture|livre', 'lecture'),
    R('tache|finir', 'tache'),
    R('publier', 'publier'),
    R('mail', 'mails'),
    R('habiller', 'bien-habille'),
    R('relire|construit|souvenirs', 'souvenirs'),
    R('aider', 'aider'),
    R('record', 'record'),
    R('comptes|budget du mois', 'comptes'),
    R('message', 'message'),
    R('marche|au marche', 'marche'),
    R('^plage|baignade', 'plage'),
    R('dunes', 'dunes'),
    R('jeux de plage', 'jeux-plage'),
    R('raquettes de plage|jokari|frescobol', 'raquettes-plage'),
    R('cerf volant', 'cerf-volant'),
    R('boomerang', 'boomerang'),
    R('coucher de soleil|lever de soleil', 'coucher-soleil'),
    R('pique nique', 'pique-nique'),
    R('beach volley', 'beach-volley'),
    R('tennis', 'tennis'),
    R('rosalie', 'rosalie'),
    R('char a voile|charavoile', 'char-voile'),
    R('equitation|cheval|poney', 'equitation'),
    R('mini golf', 'mini-golf'),
    R('golf', 'golf'),
    R('trail', 'trail'),
    R('randonnee|rando', 'randonnee'),
    R('kitesurf|kite|surf|voile', 'kitesurf'),
    R('karting|kart', 'karting'),
    R('escape', 'escape'),
    R('bowling', 'bowling'),
    R('petanque', 'petanque'),
    R('molkky', 'molkky'),
    R('glace|glacier', 'glace'),
    R('crepe', 'crepe'),
    R('gaufre', 'gaufre'),
    R('brunch', 'brunch'),
    R('apero', 'apero'),
    R('apres ski', 'apres-ski'),
    R('^bar|cocktail|pub', 'bar'),
    R('fondue', 'fondue'),
    R('barbecue|bbq', 'barbecue'),
    R('restaurant|resto|diner|dejeuner|bistrot|brasserie|table', 'restaurant'),
    R('^cafe|salon de the|coffee', 'cafe-lieu'),
    R('galerie', 'galerie'),
    R('musee', 'musee'),
    R('exposition|expo', 'exposition'),
    R('visite|guide', 'visite'),
    R('architecture|villa|monument|chateau|eglise|patrimoine', 'villa'),
    R('bapteme de l air|avion|ulm', 'avion'),
    R('sortie en mer|bateau|voilier|croisiere', 'bateau'),
    R('ski de fond', 'ski-fond'),
    R('ski', 'ski'),
    R('snowboard', 'snowboard'),
    R('raquettes', 'raquettes-neige'),
    R('luge sur rail|luge d ete', 'luge-rail'),
    R('luge', 'luge'),
    R('patin|patinoire', 'patinoire'),
    R('spa|thermes', 'spa'),
    R('cinema|film', 'cinema'),
    R('parapente', 'parapente'),
    R('vtt de descente|descente', 'vtt-descente'),
    R('vtt', 'vtt'),
    R('velo|cyclisme', 'velo'),
    R('via ferrata', 'via-ferrata'),
    R('escalade|grimpe|bloc', 'escalade'),
    R('rafting', 'rafting'),
    R('canyoning', 'canyoning'),
    R('sport|seance', 'musculation')
  ];

  /* Les familles (kind) des activités et des lieux proposés par l'IA. */
  const KINDS = {
    plage: 'plage', promenade: 'marcher', 'cerf-volant': 'cerf-volant', 'pique-nique': 'pique-nique',
    tennis: 'tennis', 'beach-volley': 'beach-volley', velo: 'velo', charavoile: 'char-voile',
    equitation: 'equitation', golf: 'golf', randonnee: 'randonnee', kitesurf: 'kitesurf',
    karting: 'karting', escape: 'escape', bowling: 'bowling', petanque: 'petanque',
    glacier: 'glace', restaurant: 'restaurant', cafe: 'cafe-lieu', brunch: 'brunch', apero: 'apero',
    bar: 'bar', galerie: 'galerie', musee: 'musee', exposition: 'exposition', monument: 'villa',
    parapente: 'parapente', ski: 'ski', snowboard: 'snowboard', 'ski-fond': 'ski-fond',
    raquettes: 'raquettes-neige', luge: 'luge', patinoire: 'patinoire', spa: 'spa', cinema: 'cinema',
    vtt: 'vtt', trail: 'trail', 'via-ferrata': 'via-ferrata', escalade: 'escalade', rafting: 'rafting',
    canyoning: 'canyoning', marche: 'marche', sport: 'musculation', shopping: 'bons-plans',
    concert: 'musique', festival: 'rire', spectacle: 'culture', theatre: 'culture', parc: 'marcher',
    piscine: 'plage', zoo: 'animal', aquarium: 'bateau', autre: 'activite'
  };

  const ALIMENTS = [
    R('terrine', 'terrine'), R('rillettes', 'rillettes'), R('porc au caramel', 'porc-caramel'),
    R('fondue bourguignonne', 'fondue-bourguignonne'), R('jerky|viande sechee', 'beef-jerky'),
    R('belle iloise|sardine', 'sardines'), R('charcuterie|plateau de fromage', 'plateau'),
    R('dahl|lentilles', 'dahl'), R('pancakes', 'pancakes-sales'), R('tomates farcies', 'tomates-farcies'),
    R('tomates sechees', 'tomates-sechees'), R('cacahuetes 3d', 'cacahuetes-3d'),
    R('ribs', 'ribs'), R('t bone', 't-bone'), R('munster', 'munster'), R('saucisson', 'saucisson'),
    R('fuet', 'fuet'), R('kobe|wagyu', 'kobe'), R('hot dog', 'hot-dog'), R('pizza', 'pizza'),
    R('poke', 'poke'), R('pate a cookies', 'pate-cookie'), R('pop ?corn', 'popcorn'),
    R('suchard', 'chocolat-suisse'), R('reese', 'peanut-cups'), R('lindor', 'truffes-chocolat'),
    R('chouchou', 'chouchous'), R('beignet', 'beignets'), R('cookie dough|haagen', 'glace-cookie'),
    R('cookie', 'cookies'), R('muffin', 'muffins'), R('mi cuit|moelleux|fondant', 'mi-cuit'),
    R('mont blanc|creme dessert|danette', 'creme-dessert'), R('nuii|magnum|esquimau', 'glace-pot'),
    R('snickers glace', 'glace-barre'), R('snickers|mars|twix', 'barre-chocolat'),
    R('nata', 'pastel-nata'), R('bonbon|haribo', 'bonbons'), R('milka|mini supreme', 'mini-chocolats'),
    R('mochi', 'mochi'), R('orangina|soda orange', 'soda-orange'), R('tourtel|biere aromatisee', 'biere-aromatisee'),
    R('citronnade', 'citronnade'), R('limonade', 'limonade'), R('ruby|jus rouge', 'jus-rouge'),
    R('aller dans un cafe', 'cafe-lieu'), R('sex on the beach', 'sex-on-the-beach'),
    R('caipirinha', 'caipirinha'), R('mojito', 'mojito'), R('cocktails? exotiques?|tiki', 'cocktail-exotique'),
    R('^cocktails?$', 'cocktails'), R('paix dieu|abbaye|trappiste', 'biere-abbaye'),
    R('desperados', 'biere-tequila'), R('bagarre|biere', 'biere-blonde'), R('roku|gin japonais', 'gin-japonais'),
    R('mastiha', 'mastiha'), R('bumbu|rhum arrange', 'rhum-arrange'), R('baileys', 'liqueur-creme'),
    R('jack daniel|honey', 'whisky-miel'), R('raspberri|framboise', 'vodka-framboise'),
    R('peche', 'vodka-peche'), R('vodka black|vodka noire', 'vodka-noire'), R('vodka red|vodka rouge', 'vodka-rouge'),
    R('vodka pink|vodka rose', 'vodka-rose'), R('asperge', 'asperges-vertes'), R('tiramisu', 'tiramisu'),
    R('sushi|maki', 'sushi'), R('brunch', 'brunch-plat'), R('barbecue|grillade', 'barbecue-plat'),
    R('gaufre', 'gaufre-food'), R('crepe', 'crepe'), R('glace', 'glace'), R('burger', 'cat-food')
  ];

  const INGREDIENTS = [
    R('blanc d oeuf|blancs d oeufs', 'blanc-oeuf'), R('\\boeufs?\\b', 'oeufs'),
    R('creme fouettee|chantilly', 'creme-fouettee'), R('mousse', 'mousse-lait'),
    R('sweet cream', 'sweet-cream'), R('azote|nitro', 'nitro'), R('cold brew', 'cold-brew'),
    R('cannelle|cinnamon', 'cannelle'), R('jus de pomme|apple crisp|pomme', 'pomme'),
    R('fraises? lyophilisee|fraise acai|base fraise|puree de fraise|fraise', 'fraises'),
    R('fruit du dragon|mangue fruit du dragon', 'fruit-dragon'), R('mangue', 'mangue'), R('hibiscus', 'hibiscus'),
    R('pistache', 'pistache'), R('muscade', 'muscade'), R('marshmallow|guimauve', 'marshmallow'),
    R('graham|biscuit', 'biscuit-graham'), R('kiwi|carambole', 'kiwi'), R('jus de peche|peche', 'peche'),
    R('glacon', 'glacons'), R('zeste d orange|tranche d orange', 'zeste-orange'), R('cerise|marasquin', 'cerise'),
    R('ananas', 'ananas'), R('praline|toffee|noisette', 'praline'), R('chestnut|chataigne|marron', 'chataigne'),
    R('sirop bleu', 'sirop-bleu'), R('poudre rose|poudres? colorees', 'poudre-rose'),
    R('xanthane', 'xanthane'), R('crunch|miettes|copeaux|topping', 'topping'), R('sugar cookie', 'cookie-sucre'),
    R('earl grey|english breakfast|sachets', 'the'), R('acai', 'acai'), R('^sirop|sirop au choix|sirop classic', 'sirop'),
    R('sauce mocha|mocha', 'sauce-chocolat'), R('dilution', 'eau'), R('limonade', 'limonade'),
    R('salade de thon', 'thon'),
    R('lait vegetal|lait d avoine|lait d amande|lait de soja', 'lait-vegetal'),
    R('creme de coco|lait de coco', 'creme-coco'), R('creme fraiche', 'creme-fraiche'),
    R('creme liquide|creme entiere|^creme$', 'creme'), R('mascarpone', 'mascarpone'),
    R('beurre de cacahuete|pate de cacahuete', 'pate-cacahuete'), R('cacahuete|arachide', 'cacahuetes'),
    R('beurre|margarine', 'beurre'), R('farine', 'farine'),
    R('sucre vanille|gousse de vanille|gousses de vanille|vanille', 'vanille'),
    R('sirop de vanille', 'sirop-vanille'), R('cassonade|sucre roux|vergeoise', 'cassonade'),
    R('sirop de sucre', 'sirop-sucre'), R('sirop de canne', 'sirop-canne'), R('grenadine', 'grenadine'),
    R('violette', 'sirop-violette'), R('sirops? saisonniers?|pumpkin|potiron', 'sirop-saison'),
    R('sucre', 'sucre'),
    R('tomates? sechee', 'tomates-sechees'), R('tomate', 'tomates'),
    R('poudre d oignon|oignon|echalote', 'oignon'), R('ail', 'ail'),
    R('carotte', 'carottes'), R('champignon', 'champignons'), R('courgette', 'courgettes'),
    R('asperge', 'asperges'), R('betterave', 'betteraves'), R('pommes? de terre|patate', 'pommes-de-terre'),
    R('salade', 'salade-verte'), R('mais', 'mais'), R('persil', 'persil'),
    R('estragon', 'estragon'), R('basilic', 'basilic'), R('bouquet garni|thym|laurier', 'bouquet-garni'),
    R('menthe', 'menthe'), R('origan|sauge|marjolaine|herbes', 'herbes'),
    R('boeuf|bourguignon|macreuse|joue|collier|gite', 'boeuf'), R('poulet|volaille', 'poulet'),
    R('lardon|couenne|bacon', 'lardons'), R('jambon', 'jambon'), R('roti|dinde', 'roti'),
    R('thon', 'thon'), R('veau', 'veau'), R('saumon|poisson', 'poisson'), R('viande', 'viande'),
    R('riz', 'riz'), R('boudoir', 'boudoirs'), R('speculoos', 'speculoos'),
    R('chocolat au lait', 'chocolat-lait'), R('chocolat noir|chocolat patissier|chocolat dessert', 'chocolat-noir'),
    R('sauce chocolat', 'sauce-chocolat'), R('chocolat', 'chocolat-noir'),
    R('cacao|nesquik', 'cacao'), R('levure', 'levure'), R('noix', 'noix'),
    R('chapelure|panko', 'chapelure'), R('crouton', 'croutons'), R('pate a tarte|pate feuilletee|pate brisee', 'pate-tarte'),
    R('wrap|tortilla', 'wraps'), R('bouillon|fond de veau|cube', 'bouillon'),
    R('huile', 'huile'), R('balsamique', 'vinaigre-balsamique'), R('vinaigre', 'vinaigre-cidre'),
    R('sel|glutamate', 'sel'), R('poivre', 'poivre'), R('paprika', 'paprika'), R('chili|piment', 'chili'),
    R('epice', 'epices'),
    R('nescafe|cafe soluble|instantane', 'cafe-soluble'), R('grains? de cafe|espresso grains', 'grains-cafe'),
    R('cafe filtre|filtre', 'cafe-filtre'), R('espresso|expresso', 'espresso'), R('cafe', 'cafe'),
    R('caramel', 'caramel'), R('matcha', 'matcha'), R('chai', 'chai'), R('the', 'the'),
    R('^fruits?|base fruits', 'fruits'), R('blender|mixeur', 'blender'), R('legume', 'legumes'),
    R('lait', 'lait'), R('fromage|gruyere|emmental|parmesan|mozzarella|cheddar|comte', 'fromage'),
    R('eau gazeuse|eau petillante|perrier', 'eau-gazeuse'), R('^eau', 'eau'),
    R('soda au pamplemousse|soda pamplemousse', 'soda-pamplemousse'),
    R('jus d orange', 'jus-orange'), R('jus d ananas', 'jus-ananas'), R('canneberge|cranberry', 'jus-canneberge'),
    R('pamplemousse', 'jus-pamplemousse'), R('passion', 'fruit-passion'),
    R('citron vert|lime', 'citron-vert'), R('citron', 'citron-jaune'),
    R('biere', 'biere'), R('vin blanc', 'vin-blanc'), R('vin rouge|saint amour|bourgogne', 'vin-rouge'),
    R('madere|marsala|porto', 'vin-cuit'), R('cognac|armagnac|brandy de mure|brandy', 'cognac'),
    R('anis|pastis|ouzo|raki', 'anis'), R('rhum blanc', 'rhum-blanc'), R('overproof', 'rhum-overproof'),
    R('rhum', 'rhum'), R('gin', 'gin'), R('vodka', 'vodka'), R('tequila|mezcal', 'tequila'),
    R('bourbon', 'bourbon'), R('rye|seigle', 'rye'), R('whisky|whiskey|scotch', 'whisky'),
    R('vermouth rouge|martini rosso', 'vermouth-rouge'), R('vermouth', 'vermouth-sec'),
    R('campari|aperol|bitter', 'campari'), R('angostura', 'angostura'),
    R('triple sec|cointreau|curacao', 'triple-sec'), R('liqueur de cafe|kahlua', 'liqueur-cafe'),
    R('banane', 'liqueur-banane'), R('mure', 'brandy-mure'), R('chambord|framboise', 'chambord'),
    R('alcool', 'alcool')
  ];

  const ORDRE = {
    ingredient: [INGREDIENTS, ALIMENTS],
    boisson:    [INGREDIENTS, ALIMENTS],
    plat:       [ALIMENTS, INGREDIENTS],
    aliment:    [ALIMENTS],
    activite:   [ACTIVITES, CONCEPTS],
    lieu:       [ACTIVITES, CONCEPTS],
    vetement:   [CONCEPTS],
    icone:      [CONCEPTS, ACTIVITES, ALIMENTS, INGREDIENTS]
  };

  const memo = new Map();

  function trouve(texte, type) {
    if (texte == null || texte === '') return null;
    const k = (type || '') + '|' + texte;
    if (memo.has(k)) return memo.get(k);
    const n = norm(texte);
    const brut = n.replace(/ /g, '-');
    let res = null;
    if (SET.has(brut)) res = brut;
    if (!res && type === 'kind' && KINDS[texte] && SET.has(KINDS[texte])) res = KINDS[texte];
    if (!res) {
      /* Dans une liste, la correspondance qui arrive le plus tôt dans
         le nom gagne : « Huile de colza (ou margarine) » est de
         l'huile, « Beurre, en mélange avec l'huile » est du beurre.
         À égalité, l'ordre des règles tranche. */
      const listes = ORDRE[type] || ORDRE.icone;
      for (const L of listes) {
        let mieux = null, pos = 1e9;
        for (const [re, slug] of L) {
          if (!SET.has(slug)) continue;
          const m = re.exec(n);
          if (m && m.index < pos) { pos = m.index; mieux = slug; }
        }
        if (mieux) { res = mieux; break; }
      }
    }
    memo.set(k, res);
    return res;
  }

  /* Le visuel d'une activité : son nom d'abord, sa famille ensuite,
     sa catégorie en dernier. Une activité ajoutée à la main garde la
     photo qu'on lui a donnée ; sinon elle prend celle de son type. */
  function activite(a) {
    if (!a) return null;
    return trouve(a.nom || a.label, 'activite') ||
      (a.kind && SET.has(KINDS[a.kind]) ? KINDS[a.kind] : null) ||
      trouve(a.category, 'icone') || 'activite';
  }

  const src = (slug) => slug && SET.has(slug) ? BASE + slug + '.webp' : null;
  const url = (texte, type) => src(trouve(texte, type));

  function html(slug, opts) {
    opts = opts || {};
    const s = src(slug);
    if (!s) return '';
    return '<span class="vis3d' + (opts.classe ? ' ' + opts.classe : '') + '">' +
      '<img src="' + s + '" alt="" loading="lazy" decoding="async" draggable="false"></span>';
  }

  global.Vis = { trouve, activite, src, url, html, norm, KINDS, DISPO, SET, BASE };
})(window);
