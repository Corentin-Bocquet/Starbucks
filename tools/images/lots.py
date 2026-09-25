"""Prépare les lots d'images à générer, par grilles de 3 x 3.

Chaque lot = une planche de neuf objets sur fond blanc, découpée
ensuite en neuf visuels détourés (split.py). Les lots sont rangés par
priorité : ce qui se voit le plus dans l'app d'abord.

    python3 tools/images/lots.py        écrit lots.json et docs/PROMPTS_GEMINI.md
"""
import json, os, re, subprocess, unicodedata

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))

S2 = {s['id']: s for s in json.load(open(os.path.join(ICI, 'sheets2.json')))}
ORDRE = [
    ('Tenues et penderie', ['tenue1', 'tenue2']),
    ('Café, Bar et Recettes : « Tu le veux comment ? »', ['wiz1', 'wiz2', 'wiz3', 'wiz4']),
    ('Icônes de l\'app', ['ic8', 'ic9']),
    ('Activités', ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']),
    ('Aliments et boissons des listes', ['q9', 'q10', 'q11', 'q12']),
    ('Ingrédients des boissons', ['q13', 'q14']),
]


def slug_aliment(nom):
    s = nom.lower().replace('œ', 'oe')
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return 'al-' + re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def aliments():
    js = "global.window=global;require('%s/js/data/aliments.js');" \
         "console.log(JSON.stringify(ALIMENTS.TABLE.map(a=>a.nom)))" % RACINE
    noms = json.loads(subprocess.check_output(['node', '-e', js]))
    return [[slug_aliment(n), 'a realistic serving of « %s » (French food)' % n] for n in noms]


def prompt(items, style):
    rows = ' '.join('Row %d: %s.' % (r + 1, '; '.join(x[1] for x in items[r * 3:(r + 1) * 3]))
                    for r in range((len(items) + 2) // 3))
    grille = 'a strict 3x3 grid of %d separate' % len(items)
    if style == 'icon':
        return ('Square image, 1:1. Premium 3D icon sprite sheet: ' + grille + ' 3D icons, each isolated and centered '
                'in its own equal square cell, wide empty white space between cells, nothing touching or overlapping, '
                'seamless pure white background (#FFFFFF). ' + rows + ' Style: glossy soft-rounded 3D objects, smooth '
                'clay-plastic with a touch of frosted glass, warm palette of terracotta orange, emerald green, sunflower '
                'yellow, coral red, deep teal and cream, soft studio light from top-left, gentle contact shadow, Apple-style '
                '3D emoji look, same scale and camera angle for all, every icon fully visible with a clear margin, never '
                'cropped. No blue-purple neon. No text, no letters, no numbers, no grid lines, no borders.')
    return ('Square image, 1:1. Professional studio product photography sprite sheet: ' + grille + ' subjects, each '
            'isolated and centered in its own equal square cell, wide empty white space between cells, nothing touching '
            'or overlapping, seamless pure white background (#FFFFFF). ' + rows + ' Soft diffused top-left light, subtle '
            'contact shadow, vibrant natural colors, crisp detail, high-end editorial product photography, same slight '
            '3/4 top-down angle and same scale for every item, every subject fully visible with a clear margin, never '
            'cropped. No text, no labels, no logos, no people, no grid lines, no borders, no background texture.')


def main():
    lots, n = [], 0
    for titre, ids in ORDRE:
        for sid in ids:
            s = S2[sid]
            for k in range(0, len(s['items']), 9):
                n += 1
                lots.append({'id': 'G%02d' % n, 'groupe': titre, 'style': s['style'], 'items': s['items'][k:k + 9]})
    al = aliments()
    for k in range(0, len(al), 9):
        n += 1
        lots.append({'id': 'G%02d' % n, 'groupe': 'Aliments du journal (%d)' % len(al), 'style': 'photo', 'items': al[k:k + 9]})
    json.dump(lots, open(os.path.join(ICI, 'lots.json'), 'w'), ensure_ascii=False, indent=1)

    md = ['# Prompts Gemini pour les images d\'EVER', '',
          'Une planche = un prompt = neuf objets. Pour chaque bloc ci-dessous :', '',
          '1. copie le prompt (bouton en haut à droite du bloc) et colle-le dans Gemini ;',
          '2. vérifie vite fait : neuf objets bien séparés, fond blanc, rien de coupé (sinon relance) ;',
          '3. enregistre l\'image sous le nom du lot, par exemple `G01.png`.', '',
          'Quand tu as tout (ou un bon paquet), mets les fichiers dans un zip et envoie-le moi : je découpe, '
          'je détoure et je publie. Les lots sont rangés par priorité, les premiers se voient le plus.', '']
    groupe = None
    for l in lots:
        if l['groupe'] != groupe:
            groupe = l['groupe']
            md += ['## ' + groupe, '']
        md += ['### %s · %s' % (l['id'], ', '.join(x[0] for x in l['items'])), '', '```', prompt(l['items'], l['style']), '```', '']
    open(os.path.join(RACINE, 'docs', 'PROMPTS_GEMINI.md'), 'w').write('\n'.join(md))
    print(len(lots), 'lots')


if __name__ == '__main__':
    main()
