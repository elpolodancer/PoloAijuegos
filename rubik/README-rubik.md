# 🧊 Cubo de Rubik (carpeta `rubik/`)

Simulador de cubos y rompecabezas de giro para el portal de juegos. **Hoy están listos los cubos de 2×2 hasta 10×10.** La meta es llegar a unos **100 modelos distintos** (Pyraminx, Megaminx, cubos más grandes y muchos más) usando el mismo motor.

## Estado

| Parte | Estado |
|---|---|
| Cubos 2×2 hasta 10×10 (3D con CSS, sin librerías, funciona sin internet) | ✅ listo (pantalla sin probar en celular a partir de 7×7) |
| Motor n×n genérico (más de 10×10 = ampliar `MAXN` y `TABLA` en `juego-rubik.js`) | ✅ listo |
| Mezclar, deshacer, cronómetro, contador de movimientos | ✅ listo |
| Menú de pausa estándar, fondo de madera, pantalla completa | ✅ listo |
| Récord y puntos en el perfil (con sincronización de cuenta) | ✅ listo |
| Selector de tamaños 2×2 a 10×10 en el menú | ✅ listo |
| Resto de modelos (11×11 en adelante, poliedros…) | 🛠️ pendiente (ver catálogo) |

## Cómo se juega

- Elige un tamaño de **2×2 a 10×10** en el menú principal.
- **Arrastra una pegatina** en la dirección en que quieres mover esa capa (gira la capa completa, también las internas).
- **Arrastra el fondo** (o una pieza negra) para girar la vista.
- **Botones U R F D L B** con la notación oficial (capa exterior); el botón morado **′** los invierte (U′, R′…). En teclado: la letra, y **Shift + letra** para el giro inverso.
- Desde **4×4** aparece el botón dorado **Ancho**: cada toque suma una capa (2, 3… hasta la mitad del cubo) y las letras giran esa cantidad de capas exteriores a la vez (Uw, Rw…; la letra muestra una «w»). Un toque más vuelve a 1. Las capas internas se giran arrastrando.
- **🔀 Mezclar** hace giros al azar (15 en 2×2, 20 en 3×3, 40 en 4×4 y de ahí +20 por tamaño hasta 160 en 10×10; desde 4×4 con capas internas); el cronómetro arranca con tu primer giro y se detiene al resolver. **↶ Deshacer** vuelve atrás tus movimientos.
- Al resolver una mezcla ganas puntos base + bono por rapidez, y se guarda tu mejor tiempo **por tamaño**:

| Tamaño | Base | Bono (segundos que sobren de…) | Máximo |
|---|---|---|---|
| 2×2 | 50 | 60 s | 110 |
| 3×3 | 100 | 300 s | 400 |
| 4×4 | 250 | 600 s | 850 |
| 5×5 | 500 | 900 s | 1400 |
| 6×6 | 800 | 1200 s | 2000 |
| 7×7 | 1100 | 1800 s | 2900 |
| 8×8 | 1500 | 2400 s | 3900 |
| 9×9 | 2000 | 3000 s | 5000 |
| 10×10 | 2600 | 3600 s | 6200 |
- **Esc** o **☰ Pausa** abren el menú de pausa (Continuar / Mezclar de nuevo / Cubo resuelto / Salir).

Notación: U arriba, D abajo, L izquierda, R derecha, F frente, B atrás; sin marca = a favor del reloj mirando esa cara, ′ = al revés.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index-rubik.html` | Página inmersiva: botones fijos, menú, mandos, ventana de «Resuelto» |
| `juego-rubik.js` | Interfaz: dibujo 3D, arrastre, cola de animaciones, cronómetro, pausa, progreso |
| `logica-rubik.js` | Lógica pura (sin DOM) de cualquier cubo n×n×n: piezas, giros (también anchos), mezcla y comprobación de «resuelto» |

Dependencias compartidas: `compartido/estilos.css`, `inmersivo.css`, `menu-pausa.js`, `cola-puntos.js`, `progreso.js` (opcional), `fondo-madera.js`, `pantalla-completa.js`.

## Especificación inmersiva (cumplida)

- Arriba-izquierda: **🎮 Juegos** (vuelve al portal; azul oscuro `b-azuloscuro`, alargado) y **☰** debajo (mismo ancho, gris). Oculto en el menú principal; en partida dice «Pausa» y abre `menu-pausa.js`.
- Abajo-izquierda: **🌙/☀️** (lo crea `fondo-madera.js`). Abajo-derecha: **⛶/✕** (lo crea `pantalla-completa.js`).
- Arriba-derecha: chips de tamaño, tiempo y movimientos en `.hud.hud-der`.
- El juego no pone fondo propio ni controles en las esquinas reservadas: los mandos (U R F D L B, Mezclar, Deshacer) van centrados, 62 px por encima de las esquinas de abajo.
- Colores de los botones: azul oscuro (🎮 Juegos), gris (☰), azul (caras), morado (invertir), oro (mezclar y ancho), verde/rojo (continuar/salir). En el menú, verde = 2×2, azul = 3×3, morado = 4×4, oro = 5×5 a 7×7, rojo = 8×8 a 10×10 (más color, más difícil).

## Cómo debe verse el menú y el juego (estándar del Rubik)

El Rubik es un juego **sin mapa, sin niveles y sin modo libre aparte**: la persona elige un cubo, lo revuelve y lo resuelve. Nada más. (El mapa con agua y los niveles son de los juegos por niveles; ver `ESTANDARES-juegos.md`.)

**Fondo (siempre madera):** madera **clara** por defecto y madera **oscura con luna** con el botón 🌙/☀️ de abajo a la izquierda. Aplica al menú y a la partida.
- `<html class="inmersivo">` y `<body class="inmersivo">`; el juego NO pone fondo propio en `html` ni `body`.
- En el `<head>`, el script pequeño que pone la clase `oscura` antes de pintar (evita el parpadeo).
- Al final del `<body>`: `<script type="module" src="../compartido/fondo-madera.js">` (crea el botón 🌙/☀️ y la madera) y `pantalla-completa.js` (⛶).
- Los textos sueltos sobre la madera usan `var(--txt-fondo)`, `var(--txt-fondo-suave)` y `var(--sombra-txt)`; los paneles (pausa, «Resuelto») conservan su fondo oscuro.
- `index-rubik.html` ya cumple todo esto.

**Menú principal** (sin ☰, que solo aparece en partida):
1. Título «🧊 Cubo de Rubik» y una frase de cómo se juega.
2. **Selector de modelo**: un botón por cubo (hoy 2×2 a 10×10; más color = más difícil). Es lo único que se elige.
3. Mejores tiempos por tamaño (si ya hay).
4. Botones fijos: 🎮 Juegos (arriba-izq., azul oscuro alargado), 🌙/☀️ (abajo-izq.), ⛶ (abajo-der.).

**Partida:**
- Cubo en el centro sobre la madera; arriba a la derecha los chips (modelo, tiempo, movimientos); abajo al centro los mandos: caras `U R F D L B`, **🔀 Mezclar** (oro, el botón principal) y ↶ Deshacer.
- Arriba a la izquierda: 🎮 Juegos y, debajo, **☰ Pausa** (Continuar / Mezclar de nuevo / Cubo resuelto / Salir).
- Salir lleva al menú principal del Rubik (el selector de modelo), no a un mapa.

## Cómo agregarlo al portal

1. En `juegos.js`, dentro de `JUEGOS`:
   `{ id: "rubik", nombre: "Cubo de Rubik", icono: "🧊", descripcion: "Resuelve cubos de 2×2 hasta 10×10 girando sus capas: mezcla, deshacer, cronómetro y tu mejor tiempo por tamaño. Pronto: Pyraminx, Megaminx y unos 100 modelos.", carpeta: "rubik" }`
   y añade `"rubik"` a `EN_DESARROLLO` mientras no esté terminado.
2. En `sw.js`: anota `rubik` en `JUEGOS` y sube `VERSION`.
3. Si le haces imagen (`imagenes/rubik.webp`), agrégala a `ARCHIVOS` de `sw.js` y a la línea de `juegos.js`.
4. Reglas de Firestore: no hace falta nada nuevo; usa `sumarPuntos("rubik", …)` y `progreso/{uid}/juegos/rubik`, igual que los demás juegos.

## Catálogo previsto: ~100 modelos

La lista puede cambiar al implementarla; el número exacto se ajustará.

- **Cubos N×N (17):** 1×1, 2×2 ✅, 3×3 ✅, 4×4 ✅, 5×5 ✅, 6×6 ✅, 7×7 ✅, 8×8 ✅, 9×9 ✅, 10×10 ✅, 11×11, 12×12, 13×13, 15×15, 17×17, 20×20, 21×21.
- **Cuboides (8):** Floppy 1×3×3, Torre 2×2×3, Dominó 2×3×3, 2×2×4, 2×3×4, 3×3×4, 3×3×5, 3×4×5.
- **Pirámides (8):** Pyraminx, Pyraminx Duo, Tetraminx, Master Pyraminx, Professor Pyraminx, Royal Pyraminx, Pyramorphix, Pyraminx Crystal.
- **Dodecaedros (8):** Megaminx, Kilominx, Master Kilominx, Flowerminx, Gigaminx, Teraminx, Petaminx, Alexander's Star.
- **Otros poliedros (6):** Skewb Diamond, Face-Turning Octahedron (FTO), Dino Cube, Rex Cube, Skewb Ultimate, Impossiball.
- **Skewb y giros de esquina (10):** Skewb, Master Skewb, Redi Cube, Ivy Cube, Fisher Cube, Windmill Cube, Axis Cube, Mixup Cube, Curvy Copter, Helicopter Cube.
- **Mecánicos (8):** Gear Cube, Gear Shift, Gear Ball, Square-1, Super Square-1, Clock, Rubik's 360, Rubik's Magic.
- **Variantes de forma y de vista (10):** Mirror Cube (2×2, 3×3, 4×4), Void Cube, Ghost Cube, Bandaged 3×3, Siamese, Constrained, Crazy 3×3, Sudoku Cube.
- **Variantes con color o imagen (~25, por definir):** cubos con foto propia, mosaico, colores raros, fantasma, pegatinas con números, etc.

## Hoja de ruta

1. **3×3** ✅
2. Selector de modelos en el menú principal (con los bloqueados en gris).
3. N×N: 2×2 a 10×10 ✅. Falta 11×11 en adelante (ampliar `MAXN` y `TABLA`; ojo con el rendimiento) y un selector con más modelos.
4. Poliedros (Pyraminx, Megaminx…): piezas definidas por un eje, un corte y un ángulo en lugar de cuartos de vuelta.
5. Mecánicos y variantes de forma (necesitan reglas propias de giro).
6. Modos extra: reto diario con mezcla fija, a ciegas, mejor tiempo por modelo, resolver paso a paso.

## Notas técnicas

- Ejes como en CSS: **x derecha, y abajo, z hacia ti**. Las posiciones van en unidades de media pieza, `p = 2·i − (n−1)` (3×3: −2, 0, 2; 4×4: −3, −1, 1, 3), así que 2×2 y 4×4 no necesitan fracciones. El tamaño de pieza se reparte (`S·3/n`) para que el cubo entero mida lo mismo. Cada pieza guarda posición `p` y orientación `M` (matriz entera 3×3); girar una capa es multiplicar por una matriz de +90°/−90°. Por eso el «resuelto» no depende de qué pieza está dónde, solo de los colores visibles en cada lado.
- Verificado en Node de 2×2 a 10×10 (incluye giros anchos): 4 giros de cada cara = identidad, `R R′` = identidad, `(R U R′ U′)×6` = identidad, 60 giros al azar deshechos en orden inverso = resuelto, y el giro ancho se deshace bien. Hay 6·n² pegatinas en cada tamaño.
- Rendimiento: desde 5×5 no se dibujan las piezas interiores (10×10 son 488 piezas visibles en vez de 1000) y al girar solo se repinta la capa que se mueve.
- Progreso en `localStorage` (`rubik_progreso_v1`): `{ m: { "2": ms, … "10": ms }, resueltos, t }`; al unir con la nube se queda el mejor tiempo de cada tamaño. Si existe el campo antiguo `mejor`, se toma como el de 3×3.
