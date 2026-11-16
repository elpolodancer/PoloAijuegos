# Almacenamiento 🎒 de Supervivencia — notas para pegar en los README

## Fila nueva para «Mapa de archivos» (junto a la de supervivencia)

| `supervivencia/equipo-supervivencia.js`, `supervivencia/panel-mochila-supervivencia.js` | Almacenamiento 🎒 estilo Last Day on Earth. `equipo-supervivencia.js` es solo lógica (sin `document`): lugares `{ z, i }` (`grid` = ranura de la mochila, `cabeza`, `torso`, `piernas`, `pies`, `espalda`, `manos`, `bolsillos`), reglas de qué va dónde (`acepta`), `moverItem` (mueve, intercambia o junta; todo o nada), `alternarItem` («Equipar» de un toque), `guardarEnMochila`, `cuentaTodo`, `hayEspacio` y `sanearMochila` / `sanearEquipo` (leen el guardado sin fiarse). Los trajes de cuerpo completo (Kevlar, NRBQ) van en el torso y tapan cabeza, piernas y pies. `SLOTS_MANO` y `SLOTS_BOLSILLO` (hoy 2 y 2, 💡 est) se cambian en ese archivo. `panel-mochila-supervivencia.js` dibuja la pantalla (inyecta sus estilos): tocar un objeto y luego su lugar; con `pruebas` muestra «🧪 Objetos de prueba» (`modoPruebas` de `compartido/configs.js`). El juego guarda `v: 3` con `mochila` y `equipo` (los mundos `v: 2` se convierten solos con `migrarV2aV3`); la clave sigue siendo `supervivencia_mundo_v2`. Pruebas: `prueba-equipo.mjs` y `prueba-panel.mjs` (Node) |

## Nota para «Estado»

- Supervivencia, almacenamiento 🎒: el botón 🎒 (o la tecla I / B) abre la mochila de 20 ranuras con ropa (4 ranuras), mochila en la espalda, 2 manos y 2 bolsillos. La mochila reemplaza a `inv` y `herr`: lo recogido cae en las ranuras, las recetas se pagan de ahí (todo o nada) y, si no cabe lo que suelta un recurso, no se rompe («La mochila está llena»). Las herramientas funcionan desde la mochila, las manos o los bolsillos. Lógica probada en Node (reglas, intercambios, traje de cuerpo completo, mochila llena, guardado dañado, ida y vuelta por JSON) y el panel con un DOM simulado; NO probado en navegador ni celular (aspecto, tamaño de los espacios, toques). Pendiente: confirmar con capturas cuántas manos y bolsillos tiene el original, que la mochila de la espalda agregue espacio, fabricar la ropa y la mochila (hoy solo existen en `ITEMS`; se consiguen con «🧪 Objetos de prueba»), comer y usar medicinas desde el bolsillo, arrastrar y soltar, y un guardado `v: 2` con más de ~1000 recursos (no cabría en 20 ranuras).

## Para `sw.js` (se necesita para que abra sin internet)

En `JUEGOS`, la línea de supervivencia hoy solo trae `"juego.js"`; faltan los módulos (que ya importa el juego) y los nuevos. Con nombre completo:
`supervivencia: ["juego.js", "datos-supervivencia.js", "mochila-supervivencia.js", "equipo-supervivencia.js", "panel-mochila-supervivencia.js", "zonas-supervivencia.js", "mapa-general-supervivencia.js", "dibujo-mapa-mundo.js"],` y subir `VERSION`.
