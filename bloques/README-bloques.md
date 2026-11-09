<!-- Ruta: bloques/README-bloques.md -->
# Bloques de madera (Polo Blocks)

Arrastra 3 piezas a un tablero de 8×8 y limpia filas y columnas completas. Cada ronda trae piezas que sí caben, pero con trampas: si pones una en otro hueco, a otra pieza ya no le queda sitio. Pierdes cuando ninguna de las piezas que te quedan cabe.

Al abrir se ve la pantalla de inicio «Polo Blocks» (1.5 s) y luego el **menú**: tres dificultades del modo infinito y la lista de niveles fijos. El botón 🗺️ de arriba vuelve al menú y ↻ reinicia lo que juegas.

## Las dos zonas

### ♾️ Infinito (3 dificultades)
Partida sin fin; termina cuando ninguna pieza cabe. Cada dificultad tiene su propio récord (👑). Todo se define en `DIFICULTADES` de `niveles-bloques.js`:

| | 🌱 Fácil | 🪵 Normal | 🔥 Difícil |
|---|---|---|---|
| Cubos al empezar | 14 a 18 | 22 a 27 (como siempre) | 27 a 32 |
| Trampas (`base` → `tope`, cada `rondas`) | 0 → 0.5, en 80 rondas | 0 → 1, en 35 rondas (como siempre) | 0.35 → 1, en 20 rondas |
| Preferencia por líneas (`limpia`) | 12 | 6 (como siempre) | 3 |
| Candados | desde la ronda 12, la mitad de seguido, nunca dos | desde la 3 (como siempre) | desde la 2, 1.5 veces más seguido, segundo desde la 8 |
| Puntos de juego por punto de perfil | 60 | 40 | 30 |

**Normal es el juego de antes sin cambios.** Las partidas guardadas antes de las dificultades se cargan como Normal y el récord de antes (`mejor`) es el de Normal.

Medido con `node bot-bloques.mjs dificultades 100 150` (rondas que aguanta): el **bot medio** (no mira adelante) llega a una mediana de 10 en Fácil, 7 en Normal y 3 en Difícil. El **bot bueno** casi nunca pierde (Fácil: nunca en 100 partidas hasta la ronda 150; Normal y Difícil a veces antes), así que sirve poco para medir; la prueba de verdad es jugarlo a mano.

### 🗺️ Niveles fijos (30 publicados; meta: 2000)
Cada nivel tiene un **reto** (`RETOS` en `niveles-bloques.js`). Al empezar sale un cartel con las instrucciones. El tablero inicial y las piezas de cada ronda salen siempre igual para todos (semilla por nivel, ronda y variante `sem`), y cada ronda sigue teniendo solución. Se abren de uno en uno. Con `?todos` en la dirección se abren todos para probar.

**Retos que existen hoy**

| Reto | Qué pide | Cómo se define |
|---|---|---|
| 🎯 `puntos` | Llegar a N puntos | `meta` |
| 🔒 `candados` | Eliminar del todo los bloques con candado. Cada línea que pasa por un bloque le quita **una capa**; sin capas, otra línea lo elimina. Candado simple = 2 líneas, doble = 3, triple = 4 | `cand: [1, 1, 2…]` (capas de cada bloque) |

El tablero guarda las capas (0 a 3) en dos planos de bits (`logica-bloques.js`: `capas`, `fijarCapas`). Los bloques por eliminar se recuerdan en `S.obj` (un número por fila): el aro rojo del tablero los marca, incluso cuando ya no tienen candados. Para inventar un reto nuevo: añade una entrada a `RETOS` (`texto`, `hud`, `cumplido`, `falta`) y úsala en la fila del nivel.

**Los 30 niveles publicados** (medido con `node bot-bloques.mjs niveles`; «aficionado» = jugador simulado que elige entre sus 2 mejores jugadas; los niveles 1 a 10 son solo de puntos)

| Niveles | Reto | Bot bueno tarda | Aficionado pasa |
|---|---|---|---|
| 1 a 5 | puntos 50 a 105 | 3 a 4 rondas | 82 a 96 % |
| 6 a 10 | puntos 120 a 180 | 5 a 8 rondas | 38 a 63 % |
| 11 | 1 candado | 4 | 57 % |
| 12, 14, 17 | puntos 200, 215, 225 | 8 a 9 | 27 a 38 % |
| 13, 16 | 2 candados | 5 y 9 | 28 a 30 % |
| 15, 18, 19 | 3 candados | 7 a 8 | 21 a 30 % |
| 20 | 4 candados | 9 | 26 % |
| 21, 24, 27 | puntos 235, 245, 255 | 8 a 11 | 24 a 29 % |
| 22 | 3 candados | 5 | 39 % |
| 23, 25 | 4 candados | 7 | 21 a 29 % |
| 26 | 5 candados | 10 | 22 % |
| 28, 29 | 5 candados | 6 a 7 | 12 a 21 % |
| 30 | 6 candados | 9 | 15 % |

- Los niveles 21 a 30 (9 nov 2026) siguen el mismo patrón de 11 a 20 (puntos y candados simples, sin dobles ni triples). Se eligieron con `buscar` (30 a 40 variantes por nivel) y se les puso `par` con `niveles`; `validar` da todo bien. Los porcentajes de aficionado cambian un poco entre corridas (son simulaciones al azar); el 29 y el 30 son los más duros de la tanda (conviene probarlos a mano).
- **Estrellas** según las rondas: 3 ★ si llegas al `par` del nivel, 2 ★ hasta un 50 % más, 1 ★ si lo pasas. El par es lo que tarda el bot bueno ×1.5 + 1.
- **Puntos de perfil:** 5 la primera vez que pasas cada nivel. Los puntos del juego dentro de un nivel no cuentan para el perfil.
- Una persona tarda más rondas que el bot bueno (cuenta con 1.3 a 1.5 veces).

**Plan de dificultad (por implementar)**

| Niveles | Qué aparece |
|---|---|
| 1 a 10 | Solo puntos, sin candados (tutorial) |
| 11 a 100 | Candados simples |
| 101 a 200 | Aparecen los dobles |
| 201 a 300 | Aparecen los triples (menos seguido) |
| 301 a 600 | Dificultad baja |
| 601 a 800 · 801 a 1000 · 1001 a 1500 · 1501 a 2000 | Sube un escalón en cada tramo |

Regla de oro: **ningún nivel debe depender de una solución muy específica.** Por eso cada nivel se elige con el bot (ver abajo) y se exige que un jugador aficionado simulado lo pase con frecuencia. Medido en los niveles 16 a 20 antes de pasar a candados simples, un aficionado pasaba solo el 3 al 11 % de los niveles con doble o triple candado; al llegar al 101 y al 201 hay que calibrar esos niveles con más holgura (menos cubos, `limpia` alto, candados en filas llenas) y comprobar que el aficionado los pase con un porcentaje razonable.

## Guardado

- `bloques_partida_v1`: la partida en curso (zona, dificultad o nivel, tablero de 24 números, piezas, puntos; en niveles también `obj` y `sem`). Las partidas con tablero de 8 o 16 números (antes de los candados y de las capas) se completan con ceros. Las partidas de niveles guardadas antes de los retos (sin `v: 2`) se descartan. Solo en el dispositivo. «Continuar» aparece en el menú si hay una a medias; empezar otra la pierde.
- `bloques_record_v1`: `{ mejor (Normal), facil, dificil, est: [estrellas del nivel 1, 2…] }`. Se sincroniza con la cuenta (`unirRecord` en `juego-bloques.js`: gana el mayor de cada marca y la mayor estrella de cada nivel).

## Archivos

| Archivo | Qué es |
|---|---|
| `index-bloques.html` | Página, pantalla de inicio «Polo Blocks», menú y carteles |
| `juego-bloques.js` | Pantalla, controles, menús, guardado y sonido |
| `logica-bloques.js` | Reglas del tablero con capas de candado (`capas`, `fijarCapas`, `colocar`, `puntosJugada`) y generador de rondas (`generarRonda`, con `limpia`; `tableroCon`; `rellenar` con `pCandado`, `piso`, `extra`) |
| `niveles-bloques.js` | Dificultades, catálogo de retos (`RETOS`), tabla `NIVELES`, niveles fijos (`nivelFijo`, `estrellasDe`), partidas nuevas y `avanzarRonda` (reglas de cada ronda). No toca el DOM |
| `bot-bloques.mjs` | Herramienta de Node: `dificultades`, `niveles`, `validar`, `buscar`, `calibrar` y `curva` |

## Cómo agregar niveles fijos

1. En `niveles-bloques.js`, añade una fila a `NIVELES` y sube `NIVELES_FIJOS`. Campos: `reto` (`"puntos"` con `meta`, o `"candados"` con `cand: [capas de cada bloque]`), `cubos`, `dif`, `par`, y opcionales `limpia`, `sesgo`, `piso`/`extra`, `sem`. Cuanto más fáciles se quieran, `dif` 0, `limpia` alto (30 a 40) y `sesgo: -1` (candados en filas llenas).
2. Elige la variante con `node bot-bloques.mjs buscar <nivel> 24 <minRondas> <maxRondas>`: prueba `sem` 0, 1, 2… y recomienda la que dura lo previsto y más pasan los aficionados. Anota la `sem` recomendada en la fila.
3. `node bot-bloques.mjs niveles <desde> <hasta>` da el `par` sugerido (rondas del bot bueno ×1.5 + 1) y los porcentajes de aficionado y novato. Escribe el `par`.
4. `node bot-bloques.mjs validar` comprueba que el bot gane todos, que los 10 primeros sean solo de puntos y que ningún par quede por debajo de lo que tarda el bot.
5. Sube `VERSION` en `sw.js`. Si la fila usa una variante nueva del reto, anota el cambio aquí.

Otras ayudas del bot: `calibrar [desde] [hasta] [%]` propone la meta de puntos que pasaría ese porcentaje de aficionados; `curva` muestra los puntos de cada ronda. Todo corre solo en Node (no se carga en el juego).

## Pendiente / ideas

- Niveles 31 a 2000 siguiendo el plan de dificultad de arriba. Conviene repartirlos en tandas de archivos y generarlos con un script que use `buscar`.
- Dobles (101 a 200) y triples (201 a 300): el motor ya los soporta (`cand: [2]`, `[3]`) y se dibujan, pero ningún nivel publicado los usa todavía. Calibrarlos con `buscar` antes de publicarlos.
- Más retos distintos (a añadir en `RETOS`): límite de rondas, hacer N combos de 2 líneas, limpiar todo el tablero, tableros con formas, bloques que aparecen con el tiempo.
- Decidir cómo se desbloquean los niveles cuando haya muchos (hoy: pasar el anterior). La lista ya está paginada (50 por página, `POR_PAG`).
- Ajustar a mano Fácil y Difícil del infinito jugando; el bot no sustituye a una persona. Lo mismo vale para los niveles: probar los 30 a mano y reajustar con `buscar`.
- La zona infinita no guarda el progreso en la nube más que el récord; las estrellas sí.
