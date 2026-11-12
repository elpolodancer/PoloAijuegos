## 1) Fila nueva para la tabla «Mapa de archivos»

| `torrepasteles/index-torrepasteles.html`, `torrepasteles/juego-torrepasteles.js`, `torrepasteles/README-torrepasteles.md` | Juego «Torre de pasteles» (id `torrepasteles`, estilo apilar pasteles de Talking Angela). Por ahora solo el menú principal: mapa estándar de México y del mundo (`compartido/mapa-niveles.js`, 22 600 niveles por crear) y «♾️ Partida libre» como primer botón, con 5 dificultades y récord de pisos por dificultad (`torrepasteles_marcas_v1`). `iniciarPartida(dif)` es el punto donde entrará la partida |

## 2) Nota para la sección «Estado»

- Torre de pasteles (11 nov 2026, `sw.js` `VERSION` = 159): hecho el menú principal con el estándar inmersivo, mapa de 22 600 niveles sin niveles todavía, Partida libre con 5 dificultades e Info. `compartido/mapa-niveles.js` gana la opción `botonesAntes` (botones antes de «Continuar»; los demás juegos no cambian). Código revisado con `node --check`; la pantalla NO se ha probado en navegador/celular. Pendiente: la partida, reglas de cada dificultad, niveles, imagen de tarjeta (`imagenes/torrepasteles.webp` y `ARCHIVOS` de `sw.js`), puntos/monedas y sincronizar progreso con la cuenta.

## 3) Cambio en «compartido/mapa-niveles.js»
Se agregó la opción `botonesAntes: [{ icono, texto, clase, fn }]` (2 líneas: una en el comentario de uso y un `for` en `vistaMexico()` antes de `botonContinuar()`). Es opcional: sin ella el mapa se ve igual que siempre.
