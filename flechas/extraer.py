import numpy as np, json, sys
from PIL import Image, ImageDraw

def cargar(ruta):
    im = np.array(Image.open(ruta).convert("RGB")).astype(int)
    oscuro = (im[:,:,0] < 135) & (im[:,:,1] < 145) & (im[:,:,2] < 150)
    oscuro[:330,:] = False      # encabezado
    oscuro[1300:,:] = False     # pista, anuncio
    return oscuro

def centros_trazos(oscuro, eje):
    """centros de trazos finos cruzando líneas de barrido (eje=0: columnas x de trazos verticales; eje=1: filas y de trazos horizontales)"""
    a = oscuro if eje == 0 else oscuro.T
    cs = []
    for fila in a[::3]:
        d = np.diff(np.concatenate([[0], fila.astype(int), [0]]))
        ini = np.where(d == 1)[0]; fin = np.where(d == -1)[0]
        for i, f in zip(ini, fin):
            if f - i <= 30: cs.append((i + f - 1) / 2)
    return np.array(cs)

def reticula(cs):
    """(paso, desplazamiento) de la retícula a partir de centros de trazos"""
    h = np.bincount(np.round(cs).astype(int))
    pk = [i for i in range(1, len(h) - 1) if h[i] >= h[i-1] and h[i] >= h[i+1] and h[i] > 0.15 * h.max()]
    # agrupar picos cercanos
    gr = []
    for p in pk:
        if gr and p - gr[-1][-1] <= 3: gr[-1].append(p)
        else: gr.append([p])
    c = np.array([np.average(g, weights=h[g]) for g in gr]); w = np.array([h[g].sum() for g in gr])
    mejor = None
    for s in np.arange(100, 11.9, -0.1):
        ang = 2 * np.pi * c / s
        o = np.angle(np.sum(w * np.exp(1j * ang))) / (2 * np.pi) * s
        res = ((c - o + s/2) % s) - s/2
        rms = np.sqrt(np.sum(w * res**2) / w.sum())
        if rms < 1.6: mejor = (s, o % s, rms); break
    return mejor, c

def analizar(ruta):
    osc = cargar(ruta)
    cx = centros_trazos(osc, 0); cy = centros_trazos(osc, 1)
    (sx, ox, rx), _ = reticula(cx); (sy, oy, ry), _ = reticula(cy)
    return osc, sx, ox, sy, oy, rx, ry

if __name__ == "__main__":
    for r in sys.argv[1:]:
        osc, sx, ox, sy, oy, rx, ry = analizar(r)
        print(r, "paso x %.2f y %.2f  desp %.1f %.1f  rms %.2f %.2f" % (sx, sy, ox, oy, rx, ry))
