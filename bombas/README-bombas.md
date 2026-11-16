# Bombas (estilo Bomberman)

Id de puntos: `bombas`. Tablero de 13×11 casillas: muros fijos, bloques que se rompen, monstruos que patrullan y mejoras escondidas (💣 más bombas, 🔥 más alcance, ⚡ más velocidad).

## Archivos
- `index-bombas.html`: página con el menú principal estándar (♾️ Modo libre con 5 dificultades · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), 👤 Iniciar sesión arriba a la derecha, cruz y botón 💣 táctiles.
- `logica-bombas.js`: reglas sin pantalla (`construir`, `nuevaRonda`, `paso`). Un bot de comprobación de niveles las puede usar igual que el juego.
- `juego-bombas.js`: pantalla, sonido, controles, menú, pausa, mapa y progreso (`bombas_progreso_v1` = `{ record, max, hecho, t }`, sincronizado con `conectar()`).

## Estado (estándares, sección 10)
- Hecho: menú estándar, mapa de México y mundo armado (32 estados + 194 países × 100 niveles; el mundo se revela al terminar los 32 estados y los países se abren de uno en uno), pausa, sesión, progreso y Modo libre (cada ronda agrega un enemigo, hasta +4).
- **Niveles: NO generados a propósito** (`NIVELES_CREADOS = 0` en `juego-bombas.js`). Al tocar un nivel sale «🚧 Los niveles todavía no están creados».
- Antes de generarlos: definir como constantes las mecánicas, metas y temas (ideas: hielo, jaulas, portales, jefe cada 10 niveles, rescatar animalitos), enseñarlas al bot y comprobar una muestra del mapa.
- La pantalla NO se ha probado en navegador/celular (cruz táctil, tamaño en vertical). La lógica se probó en Node: escapar de la propia bomba, reacción en cadena y que el jugador nunca entra a muros ni bloques.

## Para registrarlo (sección 5 de ESTANDARES-juegos.md)
1. `juegos.js`, junto a las demás líneas, y agregar `"bombas"` a `EN_DESARROLLO`:
   `{ id: "bombas", nombre: "Bombas", icono: "💣", descripcion: "Pon bombas, rompe bloques y elimina a los monstruos sin quedar en la explosión (estilo Bomberman).", carpeta: "bombas" },`
2. `sw.js`, en `JUEGOS`: `bombas: ["juego.js", "logica.js"],` y subir `VERSION` (hoy 180).
3. README principal: fila en «Mapa de archivos» y nota en «Estado».
