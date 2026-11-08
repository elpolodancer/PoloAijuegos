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

### 🗺️ Niveles fijos (3 por ahora; meta: unos 2000)
Cada nivel pide **limpiar N líneas** (🎯 arriba a la izquierda). El tablero inicial y las piezas de cada ronda salen siempre igual para todos (semilla por nivel y ronda, `rngRonda`), y cada ronda sigue teniendo solución. Se abren de uno en uno (al pasar el 1 se abre el 2…). Con `?todos` en la dirección se abren todos para probar.

- **Estrellas** según las rondas que tardas: 3 ★ si llegas al «par» del nivel, 2 ★ hasta un 50 % más, 1 ★ si lo pasas. El par sale del bot: lo que tarda el bot bueno ×1.5 + 1.
- **Puntos de perfil:** 5 la primera vez que pasas cada nivel (repetirlo no da más). Los puntos del juego dentro de un nivel no cuentan para el perfil.
- **Primeros 10 niveles:** sencillos y sin nada extra (sin candados, rondas casi siempre fáciles). Publicados hoy: 1 a 3.

| Nivel | Meta | Cubos al empezar | Par (3 ★) | Bot bueno | Bot al azar gana |
|---|---|---|---|---|---|
| 1 | 3 líneas | 13 | 6 rondas | 3 rondas | ~30 % |
| 2 | 4 líneas | 14 | 7 | 4 | ~15-25 % |
| 3 | 4 líneas | 13 | 4 | 2 | ~20 % |

## Guardado

- `bloques_partida_v1`: la partida en curso (zona, dificultad o nivel, tablero, piezas, puntos). Solo en el dispositivo. «Continuar» aparece en el menú si hay una a medias; empezar otra la pierde.
- `bloques_record_v1`: `{ mejor (Normal), facil, dificil, est: [estrellas del nivel 1, 2…] }`. Se sincroniza con la cuenta (`unirRecord` en `juego-bloques.js`: gana el mayor de cada marca y la mayor estrella de cada nivel).

## Archivos

| Archivo | Qué es |
|---|---|
| `index-bloques.html` | Página, pantalla de inicio «Polo Blocks», menú y carteles |
| `juego-bloques.js` | Pantalla, controles, menús, guardado y sonido |
| `logica-bloques.js` | Reglas del tablero y generador de rondas (`generarRonda`, con `limpia`; `tableroCon`; `rellenar` con `pCandado`) |
| `niveles-bloques.js` | Dificultades, niveles fijos (`nivelFijo`, `estrellasDe`), partidas nuevas y `avanzarRonda` (reglas de cada ronda). No toca el DOM |
| `bot-bloques.mjs` | Herramienta de Node: `dificultades`, `niveles` y `validar` |

## Cómo agregar niveles fijos

1. En `niveles-bloques.js`, añade una fila a `SENCILLOS` (líneas, cubos, par) y sube `NIVELES_FIJOS`. Para pasar del 10, hace falta una curva nueva dentro de `nivelFijo()` (retos, candados, etc.).
2. `node bot-bloques.mjs niveles` muestra si el bot bueno lo gana y cuántas rondas tarda (de ahí sale el par). `node bot-bloques.mjs validar` comprueba que los sencillos no tengan candados y que el bot gane todos.
3. Sube `VERSION` en `sw.js`.

## Pendiente / ideas

- Niveles 4 a 10 (sencillos) y luego la curva hacia ~2000 niveles con variedad de dificultad y algunos retos. Ideas: metas distintas a «limpiar líneas», candados, tableros con formas, límite de rondas.
- Generador de niveles más sofisticado: traer el de otro de tus juegos (en «Defensa del castillo»: semilla por nivel, calibración con un bot que se guarda en un archivo generado). Con 2000 niveles conviene repartirlos en tandas de archivos.
- Con muchos niveles, la lista ya está paginada (50 por página, `POR_PAG`); falta decidir cómo se desbloquean (hoy: pasar el anterior).
- Ajustar a mano Fácil y Difícil jugando; el bot no sustituye a una persona.
- La zona infinita ya no guarda el progreso en la nube más que el récord; las estrellas sí.
