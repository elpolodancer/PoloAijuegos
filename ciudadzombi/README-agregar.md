## 1) Fila nueva para la tabla «Mapa de archivos» (pégala junto a las filas de los demás juegos)

| `ciudadzombi/index-ciudadzombi.html`, `ciudadzombi/juego-ciudadzombi.js`, `ciudadzombi/logica-ciudadzombi.js`, `ciudadzombi/prueba-ciudadzombi.mjs` (solo consola), `ciudadzombi/README-ciudadzombi.md` | Juego «Ciudad Zombi» (id de puntos `ciudadzombi`): simulador de apocalipsis zombi en una ciudad vista en 2D desde arriba, de 15×15 manzanas (por defecto) y hasta 30×30, 50×50 y 100×100, con 20 000 (por defecto), 30 000, 50 000 o 100 000 ciudadanos del tamaño de un píxel. El jugador coloca zombis sin límite, manda soldados (15 golpes, velocidad 1.5) y suelta bombas; los humanos (5 golpes, velocidad 1) huyen a las esquinas o se esconden en casas, salen a las tiendas (azules) por víveres, algunos ya traen arma o la toman en la armería (roja), hay grupos de 4 armados, una escuela, un supermercado y 10 policías; los zombis (3 balas, velocidad 0.5) infectan a quien muerden. Todo el que trae arma recarga cada 12 disparos (2 s) corriendo a cubrirse y nunca se queda sin balas. Límite de 150 000 mobs vivos en total (infectar no gasta lugar; las bombas lo liberan). `logica-ciudadzombi.js` es el núcleo sin pantalla (mobs en arreglos tipados, dos cuadrículas de búsqueda, alta/baja/infección/golpes/bomba/recarga y un paso de simulación provisional). `juego-ciudadzombi.js` hoy solo trae el menú principal estándar (Modo libre con tamaño de ciudad, cantidad de ciudadanos y 5 dificultades; Niveles; Mapa; Salir; 👤 Iniciar sesión), la pausa con copia de seguridad y el mapa estándar sin niveles; config en `localStorage` (`ciudadzombi_config_v1`, `{ lado, humanos, t }`) y progreso del mapa (`ciudadzombi_progreso_v1`, `{ max, hecho }`). Diseño completo en `README-ciudadzombi.md` |

## 2) Nota para la sección «Estado»

- Ciudad Zombi (16 nov 2026, `sw.js` `VERSION` = 183): hecho el menú principal estándar con ♾️ Modo libre (ciudad de 15×15, 30×30, 50×50 o 100×100 manzanas; 20 000, 30 000, 50 000 o 100 000 ciudadanos; 5 dificultades), 🪜 Niveles, 🗺️ Mapa (sin niveles todavía), 🚪 Salir, 👤 Iniciar sesión, fondo de madera y ☰ Pausa. La pantalla NO se ha probado en navegador/celular (solo se comprobó la sintaxis del JS). Al elegir una dificultad todavía no empieza ninguna partida. Núcleo de los mobs hecho y medido en Node con 150 000 mobs (≈ 7 ms por paso en 100×100; falta medirlo en celular y conectarlo a la pantalla). Pendiente: significado de cada dificultad, motor de la ciudad, ciudadanos, zombis, soldados, bombas, policía, armas y recarga (ver `README-ciudadzombi.md`), imagen de tarjeta y niveles del mapa.

## 3) `juegos.js`: línea nueva (al final de `JUEGOS`) y el id en `EN_DESARROLLO`

```js
  { id: "ciudadzombi", nombre: "Ciudad Zombi", icono: "🧟", descripcion: "Una ciudad vista desde el cielo con hasta 100 000 ciudadanos: suelta zombis sin límite, manda soldados y deja caer bombas mientras la gente huye, se esconde, busca víveres y se arma (por ahora solo el menú: tamaños de ciudad de 15×15 a 100×100 manzanas y cantidad de ciudadanos).", carpeta: "ciudadzombi" },
```

En `EN_DESARROLLO` agrega `"ciudadzombi"` al final de la lista.

## 4) `sw.js`

- Sube `const VERSION = 182;` a `183`.
- En `JUEGOS` agrega: `ciudadzombi: ["juego.js", "logica.js"],`
- Agrega al comentario de versiones: «Versión 183: se agregó «ciudadzombi» (Ciudad Zombi: por ahora solo el menú principal estándar con ♾️ Modo libre —tamaño de ciudad de 15×15 a 100×100 manzanas, 20 000 a 100 000 ciudadanos y 5 dificultades—, Niveles y Mapa estándar sin niveles todavía; en la zona «Juegos en desarrollo», sin imagen de tarjeta todavía).»
