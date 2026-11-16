# Explota colores (`explotacolores`)

Tablero de 10 columnas × 15 filas. Toca un grupo de 3 o más bloques del mismo color (unidos arriba/abajo/izquierda/derecha): se quita al instante, caen los de arriba y llegan bloques nuevos. Puntos por grupo = `n² × 10` (3 → 90, 6 → 360, 9 → 810, 15 → 2 250).

- **Rapidez:** la lógica se actualiza en el mismo toque; la animación (gravedad 170 filas/s², tope 45 filas/s, una columna cae en ~0,4 s) nunca bloquea el siguiente toque. Se toca el bloque que *se ve* bajo el dedo.
- **Ayudas:** los grupos jugables llevan borde blanco y los demás se ven más apagados; cada color tiene su figura (● ▲ ■ ◆ ★ ♥ ✚). Si por azar no quedara ninguna jugada, se pinta una (`asegurarJugada`).
- **Modo libre (5 dificultades = número de colores):** Muy fácil 3, Fácil 4, Normal 5, Difícil 6, Experto 7.
- **Ronda de 60 s** que empieza con el primer toque (`SEGUNDOS` en `juego-explotacolores.js`). Récord por dificultad en `explotacolores_progreso_v1` (`{ m: { "<colores>": mejor }, t }`), sincronizado con `conectar()` + `unirMaximos`.
- **Puntos del portal:** siguiendo el estándar del Modo libre, no se envían a la cola (`encolarPuntos`). Si se quiere, en `terminar()`: `import("../compartido/cola-puntos.js").then(m => m.encolarPuntos("explotacolores", Math.floor(puntos / 10)))`.
- **Pendiente (estándares):** Niveles y Mapa muestran «🚧 Los niveles todavía no están creados»; falta conectar `crearEtapas` + `montarMapa`, imagen de tarjeta y probar en celular/navegador (la lógica sí se probó en Node: 2 000 jugadas seguidas sin huecos ni tableros sin jugada).

## Registro (sección 5 de ESTANDARES-juegos.md)
- `juegos.js`: `{ id: "explotacolores", nombre: "Explota colores", icono: "💥", descripcion: "Toca grupos de 3 o más bloques del mismo color para quitarlos: los de arriba caen, llegan nuevos y los grupos grandes dan muchísimos puntos. Rondas de 60 segundos.", carpeta: "explotacolores" },` y agregar `"explotacolores"` a `EN_DESARROLLO`.
- `sw.js`: en `JUEGOS` → `explotacolores: ["juego.js", "logica.js"],` y subir `VERSION` (181 → 182).
- README principal: fila en «Mapa de archivos» y nota en «Estado».
