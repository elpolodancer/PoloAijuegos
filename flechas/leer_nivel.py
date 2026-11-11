import numpy as np, json, sys
from PIL import Image, ImageDraw
from extraer import *

def afinar(cx, cy, s0):
    """paso común para x e y, con un desplazamiento propio por eje"""
    def costo(s):
        t = 0; datos = []
        for c in (cx, cy):
            h = np.bincount(np.round(c).astype(int))
            ang = 2*np.pi*c/s; o = np.angle(np.sum(np.exp(1j*ang)))/(2*np.pi)*s
            res = ((c - o + s/2) % s) - s/2
            t += np.mean(res**2); datos.append(o % s)
        return t, datos
    mejor = min((costo(s)[0], s) for s in np.arange(s0-1.5, s0+1.5, 0.02))
    s = mejor[1]; return s, costo(s)[1]

def leer(ruta, paso=None):
    osc = cargar(ruta)
    cx = centros_trazos(osc, 0); cy = centros_trazos(osc, 1)
    (sx, ox, _), ccx = reticula(cx); (sy, oy, _), ccy = reticula(cy)
    def regresion(c, s, o):
        for _ in range(4):
            idx = np.round((c - o) / s); ok = np.abs((c - o) - idx * s) < 0.25 * s
            A = np.vstack([idx[ok], np.ones(ok.sum())]).T
            s, o = np.linalg.lstsq(A, c[ok], rcond=None)[0]
        return s, o
    sx, ox = regresion(ccx, sx, ox); sy, oy = regresion(ccy, sy, oy)
    s = (sx + sy) / 2
    H, W = osc.shape
    xs = lambda i: ox + i * sx; ys = lambda j: oy + j * sy
    imin, imax = -1, int((W - ox) / sx) + 1; jmin, jmax = int((330 - oy) / sy) - 1, int((1300 - oy) / sy) + 1
    banda = max(1.5, 0.07 * s)
    def tinta(x0, x1, y0, y1):
        xa, xb, ya, yb = int(round(x0)), int(round(x1)) + 1, int(round(y0)), int(round(y1)) + 1
        xa, ya = max(xa, 0), max(ya, 0)
        r = osc[ya:yb, xa:xb]
        return r.mean() if r.size else 0
    def linea_h(x0, x1, y):   # mejor fila (±2 px) dentro del tramo horizontal
        xa, xb = max(int(round(x0)), 0), int(round(x1)) + 1
        return max((osc[min(max(int(round(y)) + d, 0), H - 1), xa:xb].mean() if xb > xa else 0) for d in range(-2, 3))
    def linea_v(x, y0, y1):
        ya, yb = max(int(round(y0)), 0), int(round(y1)) + 1
        return max((osc[ya:yb, min(max(int(round(x)) + d, 0), W - 1)].mean() if yb > ya else 0) for d in range(-2, 3))
    aristas = set()
    for j in range(jmin, jmax + 1):
        for i in range(imin, imax + 1):
            x, y = xs(i), ys(j)
            if linea_h(x + .3*sx, x + .7*sx, y) > 0.8: aristas.add(((i, j), (i + 1, j)))
            if linea_v(x, y + .3*sy, y + .7*sy) > 0.8: aristas.add(((i, j), (i, j + 1)))
    ady = {}
    for a, b in aristas:
        ady.setdefault(a, []).append(b); ady.setdefault(b, []).append(a)
    anom = [n for n, v in ady.items() if len(v) > 2]
    # componentes
    vistos = set(); flechas = []; avisos = []
    for n in ady:
        if n in vistos: continue
        comp = []; pila = [n]; vistos.add(n)
        while pila:
            p = pila.pop(); comp.append(p)
            for q in ady[p]:
                if q not in vistos: vistos.add(q); pila.append(q)
        extremos = [p for p in comp if len(ady[p]) == 1]
        if len(extremos) != 2 or any(len(ady[p]) > 2 for p in comp):
            avisos.append(("componente raro", len(comp), comp[:3])); continue
        # camino de un extremo a otro
        ruta_ = [extremos[0]]; prev = None
        while True:
            sig = [q for q in ady[ruta_[-1]] if q != prev]
            if not sig: break
            prev = ruta_[-1]; ruta_.append(sig[0])
        # cuál extremo es la punta: el que tiene más tinta alrededor
        def masa(p):
            x, y = xs(p[0]), ys(p[1]); r = 0.42 * s
            return tinta(x - r, x + r, y - r, y + r)
        if masa(ruta_[0]) > masa(ruta_[-1]): ruta_.reverse()
        ratio = max(masa(extremos[0]), masa(extremos[1])) / max(1e-6, min(masa(extremos[0]), masa(extremos[1])))
        if ratio < 1.5: avisos.append(("punta dudosa", ratio, ruta_[-1]))
        flechas.append(ruta_)
    i0 = min(p[0] for f in flechas for p in f); j0 = min(p[1] for f in flechas for p in f)
    fl = [[(p[0] - i0, p[1] - j0) for p in f] for f in flechas]
    cols = max(p[0] for f in fl for p in f) + 1; filas = max(p[1] for f in fl for p in f) + 1
    runs = []
    for fila in osc[::5]:
        d = np.diff(np.concatenate([[0], fila.astype(int), [0]])); ini = np.where(d == 1)[0]; fin = np.where(d == -1)[0]
        runs += [f - i for i, f in zip(ini, fin) if f - i <= 0.4 * s]
    t = float(np.median(runs)) if runs else 3
    return dict(t=t, s=s, sx=sx, sy=sy, ox=ox, oy=oy, i0=i0, j0=j0, cols=cols, filas=filas, flechas=fl, avisos=avisos, osc=osc)

def dibujar(res, ruta_out, osc):
    """dibuja las flechas leídas y devuelve la fracción de tinta que NO coincide con la captura"""
    s = res['s']; H, W = osc.shape
    im = Image.new("L", (W, H), 255); d = ImageDraw.Draw(im)
    X = lambda i: res['ox'] + (i + res['i0']) * res['sx']; Y = lambda j: res['oy'] + (j + res['j0']) * res['sy']
    grosor = max(2, int(round(res['t'])))
    for f in res['flechas']:
        pts = [(X(i), Y(j)) for i, j in f]
        d.line(pts, fill=0, width=grosor, joint="curve")
        (ax, ay), (bx, by) = pts[-2], pts[-1]; dx, dy = np.sign(bx - ax), np.sign(by - ay)
        tx, ty = bx + dx*.32*s, by + dy*.32*s; cx_, cy_ = tx - dx*.58*s, ty - dy*.58*s; h = .3*s
        d.polygon([(tx, ty), (cx_ - dy*h, cy_ + dx*h), (cx_ + dy*h, cy_ - dx*h)], fill=0)
    mio = np.array(im) < 128; mio[:330, :] = False; mio[1300:, :] = False
    inter = (mio & osc).sum(); union = (mio | osc).sum()
    Image.fromarray(np.where(mio, 0, 255).astype(np.uint8)).save(ruta_out)
    return 1 - inter / union

if __name__ == "__main__":
    for r in sys.argv[1:]:
        res = leer(r)
        print(r.split("/")[-1], "s=%.2f tablero %dx%d flechas=%d avisos=%s" % (res['s'], res['cols'], res['filas'], len(res['flechas']), res['avisos'][:3]),
              "desajuste=%.3f" % dibujar(res, "/home/claude/ext/re_" + r.split("/")[-1].replace(".jpg", ".png"), res['osc']))
