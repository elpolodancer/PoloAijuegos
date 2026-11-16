# Bombas (estilo Bomberman)

Id de puntos: `bombas`. Tablero de 13×11 casillas: muros fijos, bloques que se rompen, monstruos que patrullan y mejoras escondidas (💣 más bombas, 🔥 más alcance, ⚡ más velocidad).

## Archivos
- `index-bombas.html`: página con el menú principal estándar (♾️ Modo libre con 5 dificultades · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), 👤 Iniciar sesión arriba a la derecha, cruz y botón 💣 táctiles.
- `logica-bombas.js`: reglas sin pantalla (`construir`, `nuevaRonda`, `paso`). Un bot de comprobación de niveles las puede usar igual que el juego.
- `juego-bombas.js`: pantalla, sonido, controles, menú, pausa, mapa y progreso (`bombas_progreso_v1` = `{ record, max, hecho, t }`, sincronizado con `conectar()`).

## Reglas
- **Mapas de 10×10 a 40×40** (`MIN_LADO`, `MAX_LADO`): `construir({ cols, filas, … })` acota el tamaño. La pantalla muestra 13×11 casillas y una cámara sigue al jugador; si el mapa es más chico, queda centrado.
- **Puerta 🚪** escondida bajo uno de los bloques más lejanos a la salida. Para ganar hay que romper ese bloque, eliminar a todos los bots y entrar en ella (`puertaRequiereEnemigos: false` la deja abrir aunque queden bots).
- **Mejoras** dentro de bloques: 💣 +1 bomba a la vez (1 → 5), 🔥 +1 de alcance (1 → 5), ⚡ más velocidad (12 → 7 cuadros por casilla). Se conservan entre rondas.
- **Bots con 5 niveles** (`BOTS`): 1 🎈 Globo (al azar) · 2 🐛 Gusano (a veces te sigue) · 3 👻 Fantasma (te sigue seguido) · 4 🤖 Robot (te sigue y nunca pisa casillas en peligro: huye de las bombas) · 5 😈 Demonio (camino más corto hacia ti, huye y pone sus propias bombas, solo si tiene por dónde escapar). Cada uno da 100 × su nivel en puntos.
- **Modo libre** (`DIFICULTADES_LIBRE`): cada dificultad trae su mezcla de bots por nivel, su tamaño inicial (de 11×11 a 31×23) y vidas. Cada ronda crece 2 casillas de ancho y de alto (hasta 40) y suma un bot del nivel más alto de la dificultad (hasta +6).
- **Niveles del mapa** (para después, sección 10): `construir` ya acepta `bots: [n1..n5]`, `cols`, `filas`, `bloques`, `items` y `vidas`; falta el reparto de tamaños (10×10 a 40×40) y de bots entre los 22 600 niveles, que va junto con la dificultad de la sección 8.

## Estado (estándares, sección 10)
- Hecho: menú estándar, mapa de México y mundo armado (32 estados + 194 países × 100 niveles; el mundo se revela al terminar los 32 estados y los países se abren de uno en uno), pausa, sesión, progreso y Modo libre (cada ronda agrega un enemigo, hasta +4).
- **Niveles: NO generados a propósito** (`NIVELES_CREADOS = 0` en `juego-bombas.js`). Al tocar un nivel sale «🚧 Los niveles todavía no están creados».
- Antes de generarlos: definir como constantes las mecánicas, metas y temas (ideas: hielo, jaulas, portales, jefe cada 10 niveles, rescatar animalitos), enseñarlas al bot y comprobar una muestra del mapa.
- La pantalla NO se ha probado en navegador/celular (cruz táctil, cámara en mapas grandes, tamaño en vertical). La lógica se probó en Node: mapas de 10 a 40 con la puerta alcanzable, topes de mejoras (5 y 5), reacción en cadena, y que los bots suben de peligro por nivel y los demonios no se suicidan.

## Para registrarlo (sección 5 de ESTANDARES-juegos.md)
1. `juegos.js`, junto a las demás líneas, y agregar `"bombas"` a `EN_DESARROLLO`:
   `{ id: "bombas", nombre: "Bombas", icono: "💣", descripcion: "Pon bombas, rompe bloques y elimina a los monstruos sin quedar en la explosión (estilo Bomberman).", carpeta: "bombas" },`
2. `sw.js`, en `JUEGOS`: `bombas: ["juego.js", "logica.js"],` y subir `VERSION` (hoy 180).
3. README principal: fila en «Mapa de archivos» y nota en «Estado».
