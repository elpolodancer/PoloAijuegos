# Ruta: flechas/herramientas/leer_capturas.py
import warnings; warnings.filterwarnings("ignore")
# «Bot lector»: convierte capturas de pantalla del juego de referencia en niveles fijos listos para pegar en niveles-fijos-flechas.js.
# Uso:   python3 leer_capturas.py 16=captura16.jpg 17=captura17.jpg > nuevos.txt
#        (el número es el nivel de esa dificultad; pega lo que sale en la lista FIJOS.<dificultad> en el orden de los niveles)
# Necesita Python 3 con numpy y pillow. Supone capturas de celular de ~715 px de ancho como las que se han pasado: encabezado arriba
# (se ignora lo de y < 330) y botón de pista/anuncio abajo (se ignora y > 1300). Si cambia el diseño, ajustar «cargar» en extraer.py.
# Avisos: lo que sale por la salida de errores (stderr) es para revisar a mano: puntas dudosas, componentes raros o un desajuste alto.
import sys
from leer_nivel import leer, dibujar

def esquinas(a):
    out = [a[0]]
    for k in range(1, len(a) - 1):
        d1 = (a[k][0] - a[k-1][0], a[k][1] - a[k-1][1]); d2 = (a[k+1][0] - a[k][0], a[k+1][1] - a[k][1])
        if d1 != d2: out.append(a[k])
    out.append(a[-1]); return out

for arg in sys.argv[1:]:
    n, ruta = arg.split("=", 1)
    r = leer(ruta)
    desajuste = dibujar(r, "relectura_%s.png" % n, r["osc"])   # imagen con lo leído, para compararla con la captura
    celdas = sum(len(a) for a in r["flechas"])
    print("    // Nivel %s: %dx%d, %d flechas" % (n, r["cols"], r["filas"], len(r["flechas"])))
    print("    { cols: %d, filas: %d, flechas: [" % (r["cols"], r["filas"]))
    print(",\n".join("      [" + ",".join("[%d,%d]" % tuple(p) for p in esquinas(a)) + "]" for a in r["flechas"]) + ",")
    print("    ] },")
    sys.stderr.write("nivel %s: %dx%d, %d flechas, %d casillas (%.0f%% del rectángulo), desajuste %.2f%s\n" % (
        n, r["cols"], r["filas"], len(r["flechas"]), celdas, 100 * celdas / (r["cols"] * r["filas"]), desajuste,
        "  ← REVISAR: " + str(r["avisos"][:3]) if r["avisos"] else ""))
