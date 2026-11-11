# Ajedrez (id de puntos `ajedrez`)

## Pantallas
- **Menú principal = mapa de niveles** (`compartido/mapa-niveles.js`): México (32 estados) y, al terminarlo, el mundo (194 países). Botones: `▶ Continuar · nivel N`, `♾️ Juego libre`, `ℹ️ Info`, `🌍 Mundo`.
- **♾️ Juego libre** = el ajedrez de siempre contra la computadora (5 niveles, ⭐ y puntos la primera vez que se vence cada uno).
- **Botones fijos**: 🎮 Juegos (portal), ☰ («Menú principal» en el mapa, «Pausa» en partida; oculto en la vista principal), 🌙/☀️ y ⛶. Fondo de madera por `fondo-madera.js`.

## Niveles del mapa (infraestructura lista, SIN contenido todavía)
- `niveles-ajedrez.js`: `ETAPAS = crearEtapas({ porEtapa: 100 })` → 3 200 (México) + 19 400 (mundo) = **22 600**.
- Progreso `{ max, hecho }` en `localStorage` `ajedrez:mapa`, sincronizado con `conectar("ajedrez-mapa", …)` (gana el más alto).
- `datosNivel(n)` devuelve `null` hasta que se definan los niveles; mientras tanto `jugarNivel` avisa «todavía no tiene contenido».
- Prueba: abrir `index-ajedrez.html?dev=1` → al tocar un nivel aparece «✅ Superar» y se ve subir el agua.
- NO cambiar el orden de estados/países ni `porEtapa` tras publicar.

## Niveles hechos (etapa 1, Quintana Roo)
1-3 peón · 4-6 torre · 7-9 caballo · 10-12 alfil · 13-15 dama (el 15: jaque mate) · 16-18 rey (el 18: enroque) · 19-21 primeras partidas (dificultad 1, 1 y 2).
Son ejercicios de uso, no partidas: solo mueven las blancas. Datos en `LISTA` de `niveles-ajedrez.js`. Dificultad contra la computadora: **8 niveles** (`NIVELES` en `juego-ajedrez.js`).

## Por planear
1. ¿Qué es un nivel? (propuesta: problemas tácticos: mate en 1/2/3, ganar material, defender; dificultad creciente dentro de cada etapa).
2. Origen de las 22 600 posiciones y soluciones (generadas y verificadas con el motor de `ia-ajedrez.js`).
3. Formato y carga: un archivo por etapa (100 niveles ≈ pocos KB) cargado al abrir esa etapa; anotarlos en `sw.js`.
4. Puntos/monedas por nivel y por etapa terminada.
