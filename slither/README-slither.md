# Slither (`slither/`)

Arena redonda con bots: come bolitas para crecer, no toques el cuerpo de otra serpiente ni la orilla. id de puntos: `slither`. Tipo **A) por niveles** del estándar (mapa de México con agua y, al terminarlo, el mundo) más un **♾️ Juego libre**.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-slither.html` | Página: canvas, botones fijos, HUD (Largo y Récord) y las ventanas (Juego libre, Info, resultado) |
| `juego-slither.js` | Todo el juego: simulación, bots, dibujo, entrada, menús, progreso y mapa. Al final trae la herramienta de calibración (solo con `#calibrar`) |
| `niveles-slither.js` | Los **22 600 niveles**: reparto de dificultad y mapas, metas y tabla de calibración. Sin `document` (se prueba en Node) |
| `verificar-slither.mjs`, `package.json` | Solo consola, **no van al service worker**: `node slither/verificar-slither.mjs` comprueba todo el reparto |

## Niveles (22 600 = 226 etapas × 100)
Etapas = los 32 estados de México (Quintana Roo primero, de sur a norte) y los 194 países, con el mapa estándar (`compartido/mapa-niveles.js`). Los niveles se abren en orden; se guarda el nivel más alto abierto y el más alto terminado.

Cada nivel es `{ n, etapa, k, dif, mapa, meta, reto, respiro, techo }` y **es siempre el mismo para todos** (semilla por número de nivel). **Si cambias el generador cuando ya hay jugadores con progreso, verían otro nivel con el mismo número: no lo cambies después de publicar.**

- **Objetivo:** siempre de puntos: llegar a `meta` de **Largo** (el número que se ve) sin que te choquen. Al llegar, ganas; si mueres, reintentas.
- **Dificultad (`dif`)** = bots Fácil / Normal / Difícil (`DIFICULTADES` en `juego-slither.js`).
- **Mapa (`mapa`)** = Pequeño / Mediano / Grande (`MAPAS`).

### Reparto de dificultad
Se reparte **etapa por etapa con cuentas exactas** (método del mayor residuo) y el orden dentro de la etapa se sortea con semilla. La mezcla cambia en línea recta:

| | Fácil | Normal | Difícil |
|---|---|---|---|
| Primera etapa (Quintana Roo) | 50 | 40 | 10 |
| Última etapa (último país) | 25 | 35 | 40 |

Por décimas del juego (de `verificar-slither.mjs`): 49/40/11 → 46/39/15 → 44/39/17 → 41/38/21 → 39/38/23 → 36/37/27 → 34/37/29 → 31/36/33 → 29/36/35 → 26/35/39 (% Fácil/Normal/Difícil). Entre etapas los Fáciles nunca suben ni los Difíciles bajan.

### Reparto de mapas
33/33/34 por etapa (el mapa que recibe el nivel extra rota con `etapa % 3`): **7534 / 7533 / 7533** en total (33.3 % cada uno). La racha más larga con el mismo mapa es de 8 niveles. Mapa y dificultad se sortean por separado.

### Metas (puntos)
- Curva geométrica de **250** (nivel 1) a **2000** (último), con `CURVA = 0.85` (sube un poco más rápido al principio).
- Se sortean con altibajos: ~7 % son **retos** (+20 a +40 %), ~19 % **respiros** (−15 a −30 %) y el resto varía ±10 %. Los primeros 5 niveles no se sortean (no bajan). Mínimo 200.
- Mediana por décima del juego: 290 → 370 → 460 → 580 → 710 → 860 → 1050 → 1200 → 1200 → 1250. Máxima 2300.
- **El nivel 1 es siempre Fácil, mapa Pequeño y de 250 puntos** (única excepción al sorteo, para que nadie empiece contra bots difíciles).
- Pasar un nivel **por primera vez** da puntos de perfil: `puntosNivel(meta) = max(2, meta/40)`. Repetirlo no da. (En los niveles no se usa la regla del Juego libre de «1 punto por cada 10 de masa».)
- En el mapa, cada botón dice su nivel con el **color** (verde / azul / rojo = bots fáciles / normales / difíciles), el **número** (meta, `1.2k` = 1200) y la **letra** del mapa (P / M / G).

### Que todos se puedan pasar (calibración)
Una meta puede ser imposible si el reto es demasiado alto para esos bots. Para evitarlo hay un **techo** por combinación de mapa y bots, medido con un **jugador automático** (la IA de los bots, nivel Normal) que juega muchas vidas y anota el **pico de Largo de cada una** (`CALIBRACION` en `niveles-slither.js`: cuantiles 5 %…95 %). La meta de un nivel **nunca pasa del punto que el jugador automático alcanza en el 10 % de sus vidas** (`P_TECHO`) en esa combinación; los niveles que topan se sortean entre 85 y 100 % del techo (~17 % de los niveles, sobre todo al final). Además, en el **primer 20 % del juego** ninguna meta baja del 25 % de éxito (`P_INICIO`).

Techos de meta `[mapa][bots]` (Pequeño/Mediano/Grande × Fácil/Normal/Difícil): `[[1600,1200,1200],[1950,1400,1250],[2300,1400,1250]]`. Probabilidad de que una vida del jugador automático llegue a la meta, por décima del juego: **60 % → 52 % → 44 % → 37 % → 30 % → 25 % → 20 % → 16 % → 14 % → 13 %** (ninguna por debajo de 10 %).

> **Ojo:** esto es un PISO. El jugador automático muere mucho al nacer y una persona juega mejor, así que para una persona los niveles son más fáciles de lo que dicen estos porcentajes. Lo que NO se ha medido es cómo se sienten con gente real: afinar jugando (`META_INI`, `META_FIN`, `CURVA`, `P_TECHO`).

### Cómo repetir la calibración
Hay que repetirla si cambias `DIFICULTADES`, `MAPAS` o la IA de los bots (`pensar`).
1. Sirve la carpeta del repo con cualquier servidor estático y abre `slither/index-slither.html#calibrar` en un navegador de escritorio.
2. En la consola: `await __calibrar(50, 12)` (50 minutos simulados por combinación con 12 jugadores automáticos; tarda varios minutos y va mostrando el avance).
3. Pega el resultado (la tabla de 3×3×19 números) en `CALIBRACION`, y corre `node slither/verificar-slither.mjs`: debe terminar con «Todo cumple».
Las metas cambian si cambia la tabla, así que hazlo **antes** de publicar.

**Nota (12 nov 2026):** la tabla `CALIBRACION` actual se midió con una versión anterior de esta misma sonda. Al repetirla con la herramienta de este archivo (50 min × 9 combinaciones, 12 jugadores automáticos) salieron picos ~20 % más altos (mediana de las diferencias; techos de meta `[[1800,1350,1350],[2400,1500,1400],[2350,1650,1600]]` en lugar de los actuales). **Se dejó la tabla actual a propósito**: es más conservadora, así que los niveles son más fáciles de alcanzar. Si en las pruebas con gente los niveles se sienten demasiado fáciles, pega la medición nueva (o baja `P_TECHO`) y vuelve a correr el verificador.

## Juego libre
Sin metas: eliges la dificultad de los bots (Fácil, Normal, Difícil) y el tamaño del mapa (Pequeño, Mediano, Grande); se guarda en el aparato (`slither_config`). Mantiene el récord de Largo y los puntos de perfil de siempre (1 por cada 10 de masa máxima, menos el primero).

### Mapas y bots (`MAPAS`, `DIFICULTADES`)
| Mapa | Radio | Bots | Bolitas | Doradas |
|---|---|---|---|---|
| Pequeño | 2600 | 24 | 1500 | 30 |
| Mediano | 3800 | 36 | 3200 | 64 |
| Grande | 5200 | 50 | 6000 | 120 |

Las **bolitas doradas** valen 10 veces una normal; reaparecen entre 8 y 22 s después de comerse. Los bots: Fácil piensa lento, ve poco y casi no caza (y es 8 % más lento); Normal es el comportamiento original; Difícil reacciona rápido, ve 1.5 veces más lejos, caza casi siempre con turbo y es un poco más rápido y ágil, y nace más grande.

## Progreso
`localStorage` `slither_progreso_v1` = `{ record, max, hecho }`, sincronizado con `compartido/progreso.js` (gana el mayor de cada dato). Antes el récord era un número suelto en `slither_record`: se migra solo y la fusión entiende el formato viejo. Niveles que pasaste no se pierden aunque cambies de aparato.

## Pendiente
- Afinar con jugadores reales (ver la nota de la calibración).
- Sin sonido, sin imagen de tarjeta (`imagenes/slither.webp`).
- Los puntos del Juego libre (sin tope por partida) siguen la regla antigua; la propuesta general del estándar para el modo libre es no dar puntos.
- No probado en celular real (sí en Chrome de escritorio: mapa, niveles, victoria, derrota, reintentar, pausa y recarga).
