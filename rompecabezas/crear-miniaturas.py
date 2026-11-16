# Crea las miniaturas del rompecabezas: lee imagenes/1.webp … imagenes/100.webp y guarda imagenes/mini/1.webp … (320 px, ligeras).
# Uso (desde la carpeta rompecabezas):   python crear-miniaturas.py        Requiere:  pip install pillow
from pathlib import Path
from PIL import Image

LADO = 320        # lado mayor de la miniatura (px)
CALIDAD = 70      # calidad webp (0-100)
origen = Path("imagenes")
destino = origen / "mini"
destino.mkdir(exist_ok=True)

hechas = 0
for n in range(1, 101):
    f = origen / f"{n}.webp"
    if not f.exists():
        print(f"Falta {f}")
        continue
    with Image.open(f) as im:
        im = im.convert("RGB")
        im.thumbnail((LADO, LADO), Image.LANCZOS)
        im.save(destino / f"{n}.webp", "WEBP", quality=CALIDAD, method=6)
    hechas += 1
print(f"Listo: {hechas} miniaturas en {destino}")
