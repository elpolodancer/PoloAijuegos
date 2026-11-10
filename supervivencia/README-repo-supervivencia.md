# Proyecto: Juegos (portal) · juego «Supervivencia» — cosas para pegar en los archivos del repo

## 1) `juegos.js`: línea nueva al final de `JUEGOS` (después de «Bloques de madera»)

```js
  { id: "supervivencia", nombre: "Supervivencia", icono: "🌲", descripcion: "Un mundo de 50×50 casillas en vista isométrica (estilo Last Day on Earth): camina por el bosque, coloca piso de madera, piedra o baldosas y planta o tala árboles. Tu mundo se guarda solo.", carpeta: "supervivencia" },
```

Y agregar `"supervivencia"` al final de la lista `EN_DESARROLLO` (al terminar el juego, quitarlo).

## 2) `sw.js`: en el objeto `JUEGOS` (junto a `supermercado` y `rubik`)

```js
  supervivencia: ["juego.js"],
```

Subir `VERSION` de 141 a **142** y anotar en el comentario de «Última versión»: `142 = «supervivencia» nuevo (mapa isométrico 50×50 con piso, árboles y personaje)`.

## 3) `README.md` principal — fila para la tabla «Mapa de archivos»

| `supervivencia/index-supervivencia.html`, `supervivencia/juego-supervivencia.js`, `supervivencia/README-supervivencia.md` | Juego «Supervivencia» (id `supervivencia`, base de un juego estilo Last Day on Earth): mapa de 50×50 casillas en vista isométrica dibujado en un solo `<canvas>` transparente a pantalla completa (la lógica es un mapa plano x, y proyectado en rombos 2:1 con `SX()`/`SY()`; `aMundo()` es la inversa; suelo por diagonales y árboles + personaje ordenados por profundidad en `ents`). Datos en `piso` y `arboles` (`Uint8Array(2500)`, índice `j * N + i`): pisos madera/piedra/baldosa y árboles roble/pino. El personaje camina tocando (búsqueda en anchura + `suavizar()`) o con flechas/WASD, choca con árboles y borde; zoom con dos dedos o rueda; herramientas de construcción (piso, quitar, plantar/talar). `☰ Pausa` con `compartido/menu-pausa.js` (Info, «Mundo nuevo» en dos toques, Salir). Mundo en `localStorage` (`supervivencia_mundo_v1`, `{ v: 1, piso, arboles, x, y, t }`). No usa Firebase ni puntos todavía. Diseño y plan en `README-supervivencia.md` |

## 4) Nota para la sección «Estado»

- Supervivencia (10 nov 2026, `sw.js` `VERSION` = 142): base creada con mapa isométrico de 50×50, piso (madera, piedra, baldosas), árboles generados al azar (plantar/talar con la herramienta 🌳), personaje que camina rodeando árboles, zoom, estándar inmersivo, menú de pausa, fondo de madera y guardado local. La lógica se probó en Node con un DOM simulado (jsdom: piso y arrastre, árbol sobre piso rechazado, plantar y talar, quitar piso, ruta rodeando un muro de árboles, teclado en la diagonal correcta, tope en el borde del mapa, guardado) y un cuadro del dibujo se renderizó con node-canvas; NO se ha probado en un navegador ni en un celular real (toques, pellizco, rendimiento, tamaño de los botones en horizontal). Pendiente: registrar en `juegos.js` y `sw.js` (arriba), imagen de tarjeta (`imagenes/supervivencia.webp`, y anotarla en `ARCHIVOS` de `sw.js`) y todo lo del plan (recursos, construcción con costo, hambre y sed, enemigos, día y noche).
