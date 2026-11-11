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
| `niveles-fijos-flechas.js` | **Niveles copiados de las capturas** (hoy: Fácil 1 a 15). Se usan tal cual; el generador solo crea los que no están aquí |
| `herramientas/leer_capturas.py` | **Bot lector:** convierte capturas de pantalla en niveles fijos listos para pegar en `niveles-fijos-flechas.js` (usa `extraer.py` y `leer_nivel.py`, misma carpeta) |
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

## 2b. Fácil, niveles 1 a 15 (ya son niveles fijos)

Los leyó `herramientas/leer_capturas.py` directamente de las capturas (no a mano) y se comprobó que cada uno tiene solución. Lo medido:

| Nivel | Tablero | Forma | Flechas | Largo prom. / máx | Giros por flecha | Rondas | Libres al inicio |
|---|---|---|---|---|---|---|---|
| 1 | 8×4 | rectángulo lleno | 5 | 6.4 / 8 | 2.0 | 3 | 3 |
| 2 | 8×8 | rectángulo lleno | 8 | 8.0 / 10 | 1.8 | 3 | 5 |
| 3 | 8×8 | casi lleno (94 %) | 7 | 8.6 / 10 | 4.6 | 4 | 3 |
| 4 | 30×30 | **cruz** (39 % del cuadro) | 23 | 15.2 / 35 | 3.7 | 7 | 8 |
| 5 | 10×10 | lleno | 9 | 11.0 / 12 | 2.4 | 5 | 3 |
| 6 | 15×15 | **cuatro islas** (53 %) | 12 | 9.9 / 17 | 4.5 | 6 | 4 |
| 7 | 12×12 | lleno | 12 | 11.8 / 23 | 2.4 | 6 | 5 |
| 8 | 19×19 | lleno | 30 | 11.9 / 27 | 2.6 | 5 | 13 |
| 9 | 15×16 | casi lleno | 23 | 10.1 / 18 | 5.5 | 8 | 9 |
| 10 | 19×19 | lleno | 26 | 13.8 / 24 | 2.7 | 5 | 9 |
| 11 | 15×20 | casi lleno | 26 | 11.1 / 20 | 6.5 | 6 | 10 |
| 12 | 33×14 | **ancho** con huecos (84 %) | 30 | 12.9 / 32 | 2.4 | 6 | 8 |
| 13 | 15×15 | lleno | 16 | 13.9 / 26 | 1.8 | 9 | 5 |
| 14 | 18×18 | casi lleno | 32 | 9.8 / 24 | 5.4 | 7 | 11 |
| 15 | 19×19 | lleno | 27 | 13.1 / 23 | 2.4 | 8 | 10 |

Lo que se aprendió de Fácil:
- **Pocas flechas y largas**: de 5 a 32 flechas, con largo promedio de 6 a 15 casillas y hasta 35. Mis niveles generados antes tenían 3 a 6 veces más flechas y mucho más cortas.
- **Pocas rondas para sacar todo (3 a 9)**. Las rondas suben despacio con el nivel (3 en los primeros, 5 a 9 del 5 al 15).
- **Los tableros no siempre son rectángulos**: hay cruz (nivel 4), cuatro islas (nivel 6), tableros anchos con huecos (nivel 12) y rectángulos con huecos sueltos (niveles 3, 9, 11, 14). Los huecos no llevan puntitos.
- **El tamaño NO crece parejo**: 8×4, 8×8, 30×30 en cruz, 10×10, 15×15… Desde el nivel 8 casi todos son de unos 15 a 19 por lado. Al parecer el tablero máximo ronda 19×19 (o 30×30 en forma de cruz, que tiene menos casillas).
- **Dos estilos de flecha**: *largas* con pocos giros (niveles 1, 2, 5, 7, 10, 13, 15: unos 2 giros por flecha) y *serpientes* con muchos giros (niveles 9, 11, 14: 5 a 6 giros, y 4.5 en el 6).
- Siempre hay al menos 3 flechas libres al inicio (en los grandes, 9 a 13).

## 3. Cómo genera el bot (`generador-flechas.js`)

1. **Trocear:** reparte todas las casillas en caminos, empezando siempre por la casilla con menos vecinas libres (así no quedan casillas sueltas).
2. **Orientar:** elige la punta de cada camino al azar (descarta puntas cuyo camino de salida choque con su propio cuerpo).
3. **Reparar:** al azar casi todo queda atascado (flechas que se estorban en círculo). Voltea puntas y, si no basta, **parte** flechas atascadas en dos hasta que todo tenga solución. El tablero sigue lleno.
4. **Pulir** (solo cuando la dificultad trae `rondasMax`, hoy Fácil): **fusiona** flechas cuyos extremos se tocan hasta llegar al largo promedio de las capturas (largo meta = 6 + √casillas/3; en las capturas da 8 para 8×8 y 12 para 19×19) y **voltea puntas** para bajar las rondas a 9 o menos, sin perder nunca la solución.
5. Hace varios intentos (`intentos`) y se queda con el más parecido a las capturas (Fácil) o con el de más **rondas** (resto).

**Formas de tablero** (`mascara`): `rect`, `ruido` (huecos sueltos), `ancho`, `cruz`, `islas`. **Fácil del 16 en adelante** elige por semilla una forma y un estilo (`largas` o `serpientes`) con las proporciones de los niveles 1 a 15 (`FORMAS_FACIL` y `ESTILOS_FACIL` en `generador-flechas.js`).

Un mismo nivel siempre sale igual (semilla = dificultad + número de nivel).

Parámetros de `DIFICULTADES` (Fácil del 16 en adelante los calcula `perfilFacil`; Medio a Ultra siguen usando estos): `cols`, `filas`, `lmin`/`lmax` (largo de flecha), `sesgo` (más flechas cortas), `recto` (qué tan rectas son), `intentos`.

### Resultados de la prueba del nivel 16 en adelante de Fácil (30 niveles, `validar-flechas.mjs`)

Todos con solución. Comparado con los niveles 8, 10, 14 y 15 de las capturas (19×19: 26 a 32 flechas, largo 10 a 14, 5 a 8 rondas, 9 a 13 libres al inicio):

| Lo que se mide | Capturas (Fácil 1 a 15) | Generado (16 a 45) |
|---|---|---|
| Flechas en 19×19 | 26 a 32 | 28 a 34 |
| Largo promedio | 6 a 15 (11 a 14 en los grandes) | 8 a 12.7 |
| Rondas | 3 a 9 | 3 a 9 (algún ancho llega a 11) |
| Libres al inicio (19×19) | 9 a 13 | 3 a 8 (**más bajo**) |
| Tiempo en generar | — | 1 a 215 ms |

Diferencias conocidas: el generador deja **menos flechas libres al inicio** (el jugador tiene menos por dónde empezar) y los tableros anchos con estilo «serpientes» salen con flechas más cortas y 11 rondas.

### Resultados de la primera prueba de Medio a Ultra (5 niveles por dificultad, `validar-flechas.mjs`)

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

- **Fácil ya está calibrado con los niveles 1 a 15.** Falta lo mismo para **Medio, Difícil y Extra difícil** (y Ultra): pasar capturas de los niveles 1 a 15 de cada una y correr `herramientas/leer_capturas.py`. Con eso se pone `rondasMax` y largo meta a cada dificultad y el generador usa la misma fase de pulir (hoy en Medio a Ultra todos los niveles tienen el mismo tamaño, flechas de ~4 casillas y 28 a 50 rondas, **mucho más hondo que el original** si se parece a Fácil).
- Mejorar las flechas libres al inicio del generador (pocas) y los tableros anchos.
- Los niveles fijos 1 a 15 de Fácil se guardan en el código; si se pasan más capturas (16 en adelante) se pueden agregar igual para que dejen de ser generados.
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
