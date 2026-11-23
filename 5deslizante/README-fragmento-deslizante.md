<!-- PROYECTO: Portal Juegos · fragmentos para el README principal (raíz) -->

## 1) Fila para la tabla «Mapa de archivos» (reemplaza la fila actual de Deslizante)

| `5deslizante/index-5deslizante.html`, `5deslizante/juego-5deslizante.js`, `5deslizante/niveles-5deslizante.js`, `5deslizante/README-5deslizante.md` | Juego «Puzle deslizante» (id de puntos `deslizante`, carpeta `5deslizante`, 5.º de la zona «Juegos»): 3 900 niveles por países (195 × 20) con el mapa de un solo país (`unPais` de `compartido/mapa-niveles.js`: la silueta del país se llena de agua y «Continuar» va en su centro; siluetas en `compartido/contornos-paises.js`), celebración de estrellas (salen una tras otra, caen al centro del país y el país hace «pop») al pasar un nivel y Modo libre de 3×3 a 30×30. Estrellas (solo adorno), monedas y puntos del juego por tablero; 1 punto de portal por nivel (`encolarNivel`). Progreso en `localStorage` (`deslizante_progreso`, `{ v: 2, hechos, mejores, libre, estrellas, puntos }`) sincronizado con `conectar()`. Herramientas de consola (no van en `sw.js`): `generar-`, `sortear-` y `verificar-niveles-deslizante.mjs`. Detalle en `README-5deslizante.md` |

## 2) Nota para la sección «Estado»

- Puzle deslizante (23 nov 2026, `sw.js` `VERSION` = 211): terminado, en la zona «Juegos» (no está en `EN_DESARROLLO`) y como 5.º de la lista; la carpeta pasó de `deslizante/` a `5deslizante/` (el id `deslizante` no cambió). Los 3 900 niveles están verificados con solución; probado en navegador sin pantalla (PC y celular simulado), NO con el dedo en celular real. Pendiente: boost «Eliminar un cuadro», contorno real del Vaticano (usa una gota) y que `generar-contornos-paises.mjs` deje Australia como rectángulo si se vuelve a correr.
