# Flechas — README

Ruta: `flechas/README-flechas.md` · id de puntos: `flechas`

Juego tipo laberinto de flechas: cada flecha es un camino con la punta en un extremo. Al tocarla **sale en línea recta por donde apunta**. Si en ese camino hay casillas de otra flecha, está **bloqueada**: se pone roja y se pierde un corazón (3 corazones). Se gana al sacar todas.

## 1. Archivos

| Archivo | Qué es |
|---|---|
| `index-flechas.html` | Pantalla con el estándar inmersivo (🎮 Juegos azul oscuro, ☰ Pausa, madera clara/oscura, ⛶). Menú, lista de niveles y partida |
| `juego-flechas.js` | Dibujo en canvas transparente (el panel claro del tablero es CSS), toques, corazones, barra de avance, pista 💡, animación de salida, progreso y puntos |
| `logica-flechas.js` | Reglas sin pantalla: `crearEstado`, `bloqueo`, `quitar`, `libres`, `analizar` (rondas para sacar todo y si tiene solución) |
| `generador-flechas.js` | **El bot generador.** `generar(dificultad, nivel)` → tablero con solución garantizada. Aquí viven las medidas de cada dificultad (`DIFICULTADES`) |
| `validar-flechas.mjs` | `node flechas/validar-flechas.mjs 5`: genera niveles de cada dificultad, comprueba que se puedan resolver y muestra estadísticas para comparar con las capturas |

## 2. Registro de las capturas de referencia (nivel 1 de cada dificultad)

Todas con el mismo encabezado: etiqueta de dificultad, «Nivel N», 3 corazones y botón 💡 (en el juego original trae anuncio en video; aquí es gratis).

| Dificultad | Tablero (casillas) | Cómo se ve |
|---|---|---|
| **Fácil** | **8 × 4** (exacto) | **5 flechas** que llenan las 32 casillas: largos 2, 7, 7, 8 y 8, con varios giros cada una. Solución en 3 rondas: primero salen las flechas 1, 2 y 5; luego la 4 (estaba bloqueada por la 5); al final la 3 (bloqueada por la 4) |
| **Medio** | ~ 20 × 21 (estimado a ojo) | Decenas de flechas. Mezcla de flechas diminutas (escalones de 2 a 4 casillas) y largas que cruzan casi todo el ancho. En la captura ya se había avanzado: las casillas vacías se ven como **puntitos**, la barra de avance (bajo el encabezado) va en ~20 %, falta un corazón y una flecha larga está **roja** (la tocada que estaba bloqueada) |
| **Difícil** | ~ 27 × 27 (estimado) | Tablero lleno. Muchas flechas largas verticales de lado a lado, otras en espiral o con forma de «S», y muchas cortas rellenando huecos |
| **Extra difícil** | ~ 34 × 48 (estimado), vertical | Lleno y muy apretado, con flechas largas pegadas al borde y laberintos de flechas cortas en el centro |
| **Ultra difícil** | **sin captura todavía** | En el generador está **inventado** (44 × 60, `estimado: true`) hasta que llegue una captura |

Patrones comunes:
- **El tablero va lleno**: casi toda casilla pertenece a una flecha (en Fácil, el 100 %). Las vacías solo aparecen al ir sacando flechas.
- Las flechas se mueven por la cuadrícula (solo 90°); la punta sigue la dirección del último tramo.
- La dificultad sube con el tamaño del tablero y con la cantidad de flechas que dependen unas de otras, no con trampas nuevas: las reglas son idénticas.
- Falta de las capturas: tamaño exacto en Medio/Difícil/Extra, cuántas flechas tiene cada uno y cómo crece el tablero del nivel 1 al 2 y 3.

## 3. Cómo genera el bot (`generador-flechas.js`)

1. **Trocear:** reparte todas las casillas en caminos, empezando siempre por la casilla con menos vecinas libres (así no quedan casillas sueltas).
2. **Orientar:** elige la punta de cada camino al azar (descarta puntas cuyo camino de salida choque con su propio cuerpo).
3. **Reparar:** al azar casi todo queda atascado (flechas que se estorban en círculo). Voltea puntas y, si no basta, **parte** flechas atascadas en dos hasta que todo tenga solución. El tablero sigue lleno.
4. Hace varios intentos (`intentos`) y se queda con el de más **rondas** (profundidad).

Un mismo nivel siempre sale igual (semilla = dificultad + número de nivel).

Parámetros de `DIFICULTADES`: `cols`, `filas`, `lmin`/`lmax` (largo de flecha), `sesgo` (más flechas cortas), `recto` (qué tan rectas son), `intentos`.

### Resultados de la primera prueba (5 niveles por dificultad, `validar-flechas.mjs`)

Todos con solución. Aproximado:

| Dificultad | Flechas | Largo promedio | Rondas | Tiempo en generar* |
|---|---|---|---|---|
| Fácil | 5–6 | 5–6 | 4–5 | < 10 ms |
| Medio | 70–110 | 4–6 | 15–30 | 30–100 ms |
| Difícil | 130–190 | 4–6 | 28–34 | 60–150 ms |
| Extra difícil | ~460–490 | ~3.5 | ~45–50 | ~0.7–1 s |
| Ultra (estimado) | ~500–760 | ~3.5 | 30–50 | ~1.2 s (puede quedar con relleno < 100 %) |

\* En una computadora; en un celular puede tardar más. El juego muestra «Generando nivel…».

**Diferencia conocida con el original:** en Extra difícil el generador saca muchas más flechas y más cortas que las que se ven en la captura (flechas largas de borde a borde). Hay que afinar `lmin`, `sesgo` y la reparación para que conserve flechas largas.

## 4. Pendiente

- **Capturas de los niveles 2 y 3** (y, si hay, de otros más) de cada dificultad: con ellas se calibra `parametros(dif, nivel)` en `generador-flechas.js`. Hoy es **PROVISIONAL**: todos los niveles de una dificultad tienen el mismo tamaño y solo cambia la semilla.
- Captura de **Ultra difícil**.
- Contar con precisión cuántas flechas tiene cada tablero de referencia para igualar la densidad.
- En celulares chicos el tablero de Extra/Ultra queda con casillas de ~10 px: falta **zoom** (pellizcar) y mover el tablero.
- Pista 💡 ilimitada y gratis; falta decidir si cuesta monedas (el portal aún no tiene monedas en este juego).
- El menú de niveles es una **lista de 100 niveles por dificultad**, no el mapa de México/mundo del estándar de juegos por niveles (`ESTANDARES-juegos.md`, sección 4A). Hay que decidir si se mantienen las 5 dificultades o se pasa a mapa.
- Puntos al perfil por nivel (solo la primera vez): Fácil 5, Medio 10, Difícil 20, Extra 30, Ultra 50 (`PUNTOS` en `juego-flechas.js`; valores inventados).
- La pantalla **no se ha probado en navegador/celular**; se simuló una partida completa en Node con un DOM de mentira (toques, corazón perdido, victoria y progreso funcionan), pero no el dibujo real ni el rendimiento del canvas.

## 5. Para registrar el juego en el portal (según `ESTANDARES-juegos.md`, sección 5)

1. Anotarlo en `juegos.js` (id `flechas`, y su id en `EN_DESARROLLO`).
2. En `sw.js`: agregarlo a `JUEGOS`, listar `flechas/index-flechas.html`, `flechas/juego-flechas.js`, `flechas/logica-flechas.js` y `flechas/generador-flechas.js` en `ARCHIVOS`, y subir `VERSION`.
3. Imagen de la tarjeta (`imagenes/flechas.webp`) y anotarla en `ARCHIVOS` de `sw.js`.
4. Agregar la fila al «Mapa de archivos» y la nota «Estado» del README principal.

Progreso en `localStorage` (`flechas_progreso_v1`, `{ facil, medio, dificil, extra, ultra }` = nivel más alto pasado), sincronizado con `conectar()` usando `unirMaximos`. `flechas_ultima` (solo local) recuerda la última dificultad para «Continuar».
