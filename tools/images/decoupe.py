"""Découpe les planches reçues (G01.png, G02.jpg...) en visuels détourés.

    python3 tools/images/decoupe.py dossier_des_planches
Chaque planche 3 x 3 donne neuf fichiers img/v/<slug>.webp (512 px,
fond transparent), puis la liste DISPO de js/core/visuels.js est
régénérée. Demande rembg (pip install rembg onnxruntime).
"""
import glob, json, os, re, shutil, sys, tempfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import cutout, trim

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(os.path.dirname(ICI))
LOTS = {l['id']: l for l in json.load(open(os.path.join(ICI, 'lots.json')))}
DEST = os.path.join(RACINE, 'img', 'v')
# On découpe à côté, puis on publie d'un coup : le dépôt ne change qu'à la fin.
TMP = tempfile.mkdtemp(prefix='decoupe-')


def couloirs(masque, n):
    """Les coupes passent au milieu des bandes les plus blanches."""
    dens = masque.mean(axis=0)
    L = len(dens); coupes = [0]
    for k in range(1, n):
        c = int(L * k / n); w = int(L * (0.36 / n))
        seg = dens[c - w:c + w]
        idx = np.where(seg <= seg.min() + 0.002)[0]
        coupes.append(c - w + int(idx.mean()))
    coupes.append(L)
    return coupes


def grille_visible(im):
    """Vrai si la planche a des traits ou des fonds de case (pas un blanc uni)."""
    a = np.asarray(im.convert('L')).astype(int)
    W = a.shape[1]
    col = a[:, W // 3 - 3:W // 3 + 4].mean(axis=0)
    return col.min() < 245 or a[5:40, 5:40].mean() < 250


# Planches où Gemini a sauté une case : position réelle de chaque objet.
CASES = {'G18': [0, 1, 2, 3, 4, 5, 7], 'G26': [0, 1, 2, 3, 4, 5, 7]}


def decoupe(lid, chemin):
    im = Image.open(chemin).convert('RGB')
    a = np.asarray(im).astype(int)
    pasblanc = a.min(axis=2) < 238
    items = LOTS[lid]['items']
    if grille_visible(im):
        # Traits de grille ou fonds de case : tiers exacts, marge intérieure.
        W, H = im.size
        xs, ys = [0, W // 3, 2 * W // 3, W], [0, H // 3, 2 * H // 3, H]
    else:
        xs, ys = couloirs(pasblanc, 3), couloirs(pasblanc.T, 3)
    m = int(min(im.size) * 0.012)
    faits = []
    places = CASES.get(lid, list(range(len(items))))
    for k, pos in enumerate(places):
        if k >= len(items):
            continue
        r, c = divmod(pos, 3)
        slug = items[k][0]
        case = im.crop((xs[c] + m, ys[r] + m, xs[c + 1] - m, ys[r + 1] - m))
        trim(cutout(case), pad=0.06, size=512).save(os.path.join(TMP, slug + '.webp'), 'WEBP', quality=86, method=6)
        faits.append(slug)
    return faits


def publier():
    for f in glob.glob(TMP + '/*.webp'):
        shutil.move(f, os.path.join(DEST, os.path.basename(f)))
    slugs = sorted(os.path.basename(f)[:-5] for f in glob.glob(DEST + '/*.webp'))
    p = os.path.join(RACINE, 'js', 'core', 'visuels.js')
    s = open(p).read()
    s = re.sub(r"const DISPO = '[^']*'\.split", "const DISPO = '" + ','.join(slugs) + "'.split", s)
    open(p, 'w').write(s)
    return len(slugs)


if __name__ == '__main__':
    dossier = sys.argv[1]
    for f in sorted(glob.glob(os.path.join(dossier, '*'))):
        lid = os.path.splitext(os.path.basename(f))[0].upper()
        if lid in LOTS:
            print(lid, decoupe(lid, f))
    print(publier(), 'visuels publiés')
