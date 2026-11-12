## 1) Fila nueva para la tabla «Mapa de archivos»

| `batallanaval/index-batallanaval.html`, `batallanaval/juego-batallanaval.js`, `batallanaval/logica-batallanaval.js`, `batallanaval/README-batallanaval.md` | Juego «Batalla naval» (id `batallanaval`): por ahora solo el menú principal. Mapa estándar de México y del mundo (`compartido/mapa-niveles.js`, 100 niveles por estado y país = 22 600, sin niveles todavía) y, como PRIMER botón (`botonesAntes`), «♾️ Partida libre»: 5 dificultades del rival y tableros de 15×15, 20×20, 30×30 y 50×50 con más barcos entre más grande (`TAMANOS`, `DIFICULTADES`). Sin límite de tiradas ni de tiempo. Elección guardada en `batallanaval_libre_v1`; progreso del mapa en `batallanaval_progreso_v1` (`{ max, hecho }`) |

## 2) Nota para la sección «Estado»

- Batalla naval (11 nov 2026, `sw.js` `VERSION` = 162): menú principal con mapa y Partida libre (elección de dificultad y tamaño). «Comenzar» solo avisa que falta la colocación de barcos y la batalla. NO probado en navegador/celular. `compartido/mapa-niveles.js` ganó la opción `botonesAntes` (botones antes de «Continuar»). Pendiente: tablero, colocación de flota, bot por dificultad, puntos (cola-puntos), niveles, imagen de tarjeta.

## 3) Registro
- `juegos.js`: `{ id: "batallanaval", nombre: "Batalla naval", icono: "🚢", descripcion: "Hunde la flota del rival eligiendo casillas en el tablero, sin límite de tiradas ni de tiempo: partida libre con 5 dificultades y tableros de 15×15 a 50×50 (más barcos en los grandes), y un mapa de 22 600 niveles (100 por estado de México y por país).", carpeta: "batallanaval" },` y agregar `"batallanaval"` a `EN_DESARROLLO`.
- `sw.js`: en `JUEGOS` → `batallanaval: ["juego.js", "logica.js"],`; subir `VERSION` a 162 y anotarlo en el comentario.

## 4) Estrellas, monedas, boosts y escudos (`logica-batallanaval.js`, lógica pura probada en Node)

- **Estrellas por nivel** (la Partida libre no da estrellas ni monedas): ★ ganar · ★★ ganar con precisión ≥ 35 % · ★★★ ganar con precisión ≥ 50 % y conservar la mitad de tu flota. Umbrales en `UMBRALES` (propuesta, hay que calibrarlos con el juego jugable).
- **Monedas**: 10 / 25 / 50 por 1 / 2 / 3 estrellas (`MONEDAS_POR_ESTRELLAS`). Al repetir un nivel solo se paga la diferencia con la mejor marca. Las monedas **no se guardan**: se calculan (estrellas − compras), por eso la nube solo toma el máximo de cada dato (`fusionar`) y nunca duplica monedas.
- **Boosts** (se compran al usarlos si no tienes; no gastan turno): 🔍 Revelar ubicación 100 (una casilla con barco del rival) · 🛡️ Doble defensa 100 (una casilla tuya con barco) · 👁️ Revelar todo 1 000 (todos los barcos y escudos del rival).
- **Escudo**: el primer disparo se ve como acierto pero solo rompe el escudo; la casilla sigue sin destruir y se puede volver a disparar (`resolverDisparo` → `"escudo"`). El bot anota esas casillas y las reataca con 90 % de probabilidad por turno (`PROB_REATAQUE`, `elegirReataque`).
- **Escudos del bot**: `nivelTieneEscudos(n)` marca EXACTAMENTE 5 650 de los 22 600 niveles (25 %, barajado fijo igual para todos). En esos niveles `escudosDelBot(n, casillas)` protege entre 20 % y 40 % de las casillas de barco del rival (mínimo 1, nunca todas), siempre las mismas por nivel.
- Progreso: `batallanaval_progreso_v1` = `{ max, hecho, e: {nivel: estrellas}, c: comprados, u: usados, t }`, sincronizado con `conectar()`. El menú ya muestra las estrellas en los botones de nivel y el chip dorado de monedas arriba a la derecha.
- Pendiente: usar todo esto en la partida (tablero, colocación, turnos y botones de boosts con «×N» o precio).
