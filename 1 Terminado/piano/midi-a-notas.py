#!/usr/bin/env python3
# Ruta: piano/midi-a-notas.py  (herramienta para el programador; NO se sube al sitio ni va en sw.js)
# Convierte la melodía de un archivo MIDI a una línea lista para pegar en MELODIAS de juego-piano.js.
# No necesita instalar nada (solo Python 3).
#
#   python3 midi-a-notas.py cancion.mid              → lista las pistas y convierte la que parece ser la melodía
#   python3 midi-a-notas.py cancion.mid 1            → convierte la pista número 1
#   python3 midi-a-notas.py cancion.mid 1 "Nombre (Autor)"   → con el nombre que saldrá en el menú
#
# Reglas: se toca una nota por cada nota del MIDI, en orden. Si varias notas empiezan en el mismo instante (acorde) se queda con la
# más aguda. Las notas muy rápidas o repetidas se dejan tal cual: si te parecen demasiadas, usa otra pista o recorta la melodía a mano.
# Los MIDI de órgano repiten la misma voz en varias pistas a distinta octava: al elegir pista sola se ignoran esas copias, y la
# melodía se sube o baja por octavas completas hasta quedar en la zona cómoda del piano (así no suena chillona ni demasiado grave).
import struct, sys, os

NOMBRES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
nota = lambda m: NOMBRES[m % 12] + str(m // 12 - 1)

def num_variable(b, i):
    v = 0
    while True:
        c = b[i]; i += 1; v = (v << 7) | (c & 127)
        if not c & 128: return v, i

def leer(ruta):
    d = open(ruta, "rb").read()
    if d[:4] != b"MThd": sys.exit("Eso no parece un archivo MIDI.")
    n = struct.unpack(">H", d[10:12])[0]
    pos, pistas = 14, []
    for _ in range(n):
        if d[pos:pos + 4] != b"MTrk": break
        ln = struct.unpack(">I", d[pos + 4:pos + 8])[0]
        b = d[pos + 8:pos + 8 + ln]; pos += 8 + ln
        i = tick = run = 0; nombre = ""; ons = []
        while i < len(b):
            dt, i = num_variable(b, i); tick += dt
            st = b[i]
            if st == 0xFF:
                ty = b[i + 1]; l, j = num_variable(b, i + 2)
                if ty == 3: nombre = b[j:j + l].decode("latin1")
                i = j + l
                if ty == 0x2F: break
                continue
            if st in (0xF0, 0xF7):
                l, j = num_variable(b, i + 1); i = j + l; continue
            if st & 128: run = st; i += 1
            k, canal = run & 0xF0, run & 15
            if k in (0xC0, 0xD0): i += 1; continue
            a, c = b[i], b[i + 1]; i += 2
            if k == 0x90 and c > 0 and canal != 9: ons.append((tick, a))  # canal 9 = batería: se ignora
        pistas.append((nombre, ons))
    return pistas

def melodia(ons):
    por_tick = {}
    for t, m in ons: por_tick[t] = max(por_tick.get(t, 0), m)  # acorde → la nota más aguda
    return [por_tick[t] for t in sorted(por_tick)]

def centrar(notas):
    """Sube o baja la melodía por octavas completas para que su nota media quede entre Sol#3 (56) y Sol#5 (80)."""
    media, d = sum(notas) / len(notas), 0
    while media + d > 80: d -= 12
    while media + d < 56: d += 12
    return [x + d for x in notas], d

def es_copia(pistas, k):
    """True si la pista k es otra pista más grave repetida a una o más octavas (mismos instantes, mismas notas +12, +24…)."""
    ticks = sorted({t for t, _ in pistas[k][1]}); mk = melodia(pistas[k][1])
    for j, (_, ons) in enumerate(pistas):
        if j == k or not ons or sorted({t for t, _ in ons}) != ticks: continue
        dif = {a - b for a, b in zip(mk, melodia(ons))}
        if len(dif) == 1 and dif.pop() > 0: return True
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    ruta = sys.argv[1]
    pistas = leer(ruta)
    print("Pistas con notas:")
    candidatas = []
    for k, (nombre, ons) in enumerate(pistas):
        if not ons: continue
        media = sum(m for _, m in ons) / len(ons)
        print(f"  {k}: «{nombre}»  {len(ons)} notas, tono medio {media:.0f}")
        if len(ons) >= 8 and not es_copia(pistas, k): candidatas.append((media, k))
    if len(sys.argv) > 2: k = int(sys.argv[2])
    elif candidatas: k = max(candidatas)[1]  # por defecto, la pista más aguda (casi siempre la melodía)
    else: sys.exit("No encontré pistas con notas.")
    notas, desplazo = centrar(melodia(pistas[k][1]))
    if desplazo: print(f"(La melodía se movió {desplazo // 12:+d} octava(s) para que suene cómoda.)")
    titulo = sys.argv[3] if len(sys.argv) > 3 else os.path.splitext(os.path.basename(ruta))[0]
    print(f"\nPista elegida: {k}  ({len(notas)} notas). Pega esta línea en MELODIAS de juego-piano.js:\n")
    print('  { nombre: "%s", notas: nt("%s") },' % (titulo, " ".join(nota(m) for m in notas)))
