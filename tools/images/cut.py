import sys, numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
S = {}
def sess(m):
    if m not in S: S[m] = new_session(m)
    return S[m]
def cutout(im, model='isnet-general-use'):
    im = im.convert('RGB')
    out = remove(im, session=sess(model), alpha_matting=True, alpha_matting_foreground_threshold=240,
                 alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
    a = np.array(out).astype(np.float32)
    rgb = np.array(im).astype(np.float32)
    al = a[..., 3:4] / 255.0
    # defringe : retire le blanc melange sur les bords (decontamination couleur)
    bg = np.array([255, 255, 255], np.float32)
    safe = np.clip(al, 0.05, 1)
    fg = (rgb - (1 - safe) * bg) / safe
    fg = np.where(al > 0.98, rgb, np.clip(fg, 0, 255))
    alpha = a[..., 3]
    alpha[alpha < 12] = 0
    res = np.dstack([fg, alpha]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')
def trim(im, pad=0.06, size=512):
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bb)
    w, h = im.size; s = max(w, h); p = int(s * pad)
    c = Image.new('RGBA', (s + 2*p, s + 2*p), (0,0,0,0))
    c.paste(im, ((s + 2*p - w)//2, (s + 2*p - h)//2), im)
    return c.resize((size, size), Image.LANCZOS)
if __name__ == '__main__':
    im = Image.open(sys.argv[1]); o = trim(cutout(im)); o.save(sys.argv[2])
    # preview on dark and mid backgrounds
    prev = Image.new('RGB', (1024, 512), (10, 16, 22)); prev.paste(o, (0, 0), o)
    mid = Image.new('RGB', (512, 512), (230, 90, 40)); mid.paste(o, (0, 0), o); prev.paste(mid, (512, 0))
    prev.save(sys.argv[2].replace('.png', '-prev.png'))
