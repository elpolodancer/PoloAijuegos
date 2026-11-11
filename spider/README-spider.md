# Spider (id `spider`, carpeta `spider`)

Solitario Spider de 104 cartas, 10 columnas, 5 repartos de 10 y 8 series K→A. Menú principal con **♾️ Modo libre**, **🎯 Niveles** (5 niveles Fácil por ahora, `niveles-spider.js`) y **🗺️ Mapa** (México + mundo estándar). Modo libre: no da puntos ni monedas, guarda mejor tiempo por dificultad.

## Dificultades
| # | Nombre | Palos | Notas |
|---|---|---|---|
| 1 | Fácil | 1 | con deshacer |
| 2 | Normal | 2 | con deshacer |
| 3 | Difícil | 3 | series 3+3+2; con deshacer |
| 4 | Experto | 4 | con deshacer |
| 5 | Maestro | 4 | **sin deshacer** |

## Archivos
- `logica-spider.js` lógica pura (cartas, reparto con semilla, jugadas, series, repartir). Sin DOM.
- `ia-spider.js` **bot de backtracking**: `resolver`, `comprobar` (repite la solución con las reglas del juego), `verificar(dif, semilla)`, `generarVerificada(dif, semilla)`, `AJUSTES` por dificultad.
- `verificar-spider.mjs` consola: `node spider/verificar-spider.mjs [cuantas] [semilla] [maxMs] [maxNodos]`.
- `niveles-spider.js` niveles fijos `{ dif, semilla, nodos }`, todos comprobados con el bot. No cambiar semillas ya publicadas.
- `juego-spider.js`, `index-spider.html` menú, partida (toca un tramo y luego la columna destino) y mapa.

## El bot: qué garantiza y qué no
- Ve todas las cartas (ganable con información perfecta). Si dice «resuelto», la solución está re-comprobada: **es fiable**. Si no, dice «no se sabe», nunca «imposible» (poda de jugadas inútiles; búsqueda con reinicios al azar).
- Resultados medidos (`verificar-spider.mjs 6 1 3000 400000`): 1 palo 6/6, 2 palos 6/6, 3 palos ~1/6, 4 palos 0–1/6. Para niveles fijos de 3 y 4 palos hay que **probar muchas semillas y quedarse con las que resuelve** (`generarVerificada` lo hace), con presupuestos grandes y fuera del juego.
- En el modo libre el bot corre un instante antes de repartir: sale «✔ Con solución» si halló una; si no, «🎲 Al azar» (la mayoría de las veces en 3 y 4 palos).

## Pendiente
Más niveles (el mapa tiene `porEtapa: 10`, provisional; los que faltan salen bloqueados), bot en Web Worker y pista 💡, arrastrar cartas, sonidos, imagen de tarjeta, probar la pantalla en celular (no se ha probado en navegador; la lógica y el bot sí en Node).

## Registro en el portal
`juegos.js`, dentro de `JUEGOS`:
```js
  { id: "spider", nombre: "Spider", icono: "🕷️", descripcion: "Solitario Spider de 104 cartas con 5 dificultades (de 1 a 4 palos y un modo Maestro sin deshacer), modo libre y mapa de México y del mundo para los niveles que vendrán.", carpeta: "spider" },
```
y `"spider"` en `EN_DESARROLLO`. `sw.js`, dentro de `JUEGOS`: `spider: ["juego.js", "logica.js", "ia.js", "niveles.js"],` y `VERSION = 153` (+ nota «153 = se agregó «spider»»).

README principal, fila: `spider/index-spider.html`, `juego-spider.js`, `logica-spider.js`, `ia-spider.js`, `verificar-spider.mjs`, `README-spider.md` — Solitario Spider (id de puntos `spider`); lógica pura, bot de backtracking y progreso en `localStorage` (`spider_progreso_v1`, mejor tiempo por dificultad, sincronizado con `conectar()`).
Nota «Estado»: Spider (11 nov 2026): menú, modo libre con 5 dificultades y mapa sin niveles; bot probado en Node, pantalla sin probar en celular.
