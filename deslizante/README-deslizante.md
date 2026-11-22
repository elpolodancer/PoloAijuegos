# Puzle deslizante

Ruta: `deslizante/README-deslizante.md` · Aquí se anotan las especificaciones del juego. Se va ampliando conforme se pidan cambios.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index-deslizante.html` | Las pantallas (juego con la barra de inicio, niveles, modo libre) y sus estilos |
| `juego-deslizante.js` | Lógica: menús, tablero, progreso y puntos |
| `niveles-deslizante.js` | Lista de niveles fijos (el orden de la lista es el orden de desbloqueo) |
| `verificar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): `node deslizante/verificar-niveles-deslizante.mjs` revisa que todos los niveles sean válidos y tengan solución |

## Pantallas
- **Inicio (juego ya cargado, con velo)**: al abrir el juego se ve directamente el nivel donde va el jugador (el primero si es nuevo; con sesión, el de su cuenta de Google; y su partida guardada si la tiene) **detrás de un velo negro transparente con un poco de difuminado** (`.velo-inicio` de `compartido/inmersivo.css`; `ESTANDARES-juegos.md`, 7.0 y 7.1). El juego se ve pero no responde (ni toques ni flechas) hasta tocar **Continuar**. En el centro de la pantalla, todo el grupo centrado: **Modo libre** y **Niveles** (cuadrados, juntos) un poco arriba y, debajo, **Jugar / Continuar** (verde, del doble de tamaño). No hay título ni texto de resumen.
  - *Jugar* / *Continuar* quita el velo y deja jugar el primer nivel sin pasar (dice «Continuar» si ya se pasó alguno), retomando su partida guardada. Si ya se pasaron todos, abre el último.
  - *Niveles* muestra los niveles agrupados por tamaño.
  - Mientras está el velo no se ve el ☰. Al volver al «menú principal» (☰) se vuelve a ver el juego cargado con el velo.
  - Si la nube trae un progreso más avanzado y el velo sigue puesto, el tablero de atrás se cambia al nivel de su cuenta.
- **Modo libre**: dificultad (5 emojis) + tamaño del 3×3 al 30×30; salen tableros al azar sin fin (ver «Modo libre»). No muestra niveles.
- **Niveles**: pasado = verde, disponible = azul, bloqueado = gris con 🔒.
- **Juego** (ya sin velo): arriba, un **botón verde con el nombre del nivel** («Nivel 3 · 4×4», o «♾️ Modo libre · 5×5 😐»); solo informa, no hace nada al tocarlo. **Justo debajo**, los tres cuadros de **Movimientos · Tiempo · Mejor tiempo**. El **tablero va centrado en la ventana** y en celular vertical ocupa todo el ancho (tapa la madera de los lados). Debajo del tablero: título del nivel, estrellas y avisos; abajo al centro, 🔄 para reiniciar. En celular horizontal bajo, el botón verde, los cuadros y los textos pasan a una columna a la izquierda.
  - Ya **no hay** botones de Modo libre y Niveles dentro de la partida, ni ◀ ▶ para cambiar de nivel. Se cambia de nivel con «Siguiente nivel» al ganar, o desde ☰ → menú principal → Niveles.

## Navegación (estándar de `compartido/inmersivo.css`)
- Arriba a la izquierda, **🎮** (vuelve al portal), siempre visible: botón **cuadrado de 40 px, azul oscuro** (`b-azuloscuro`), solo icono (el texto «Juegos» va en `title` y `aria-label`).
- Justo debajo, el botón **☰**, **cuadrado, verde claro** (`b-verdeclaro`) y solo icono, visible en todas las pantallas menos en el propio menú de inicio. En todas las pantallas, **también dentro de una partida**, vuelve al menú principal (el juego cargado con el velo y Modo libre · Niveles · Continuar). No hay menú de pausa.

## Fondo de madera
- Todas las pantallas (inicio, niveles, modo libre y partida) van sobre el fondo estándar de madera de `compartido/fondo-madera.js`: **madera clara** por defecto y **madera oscura con luna** con el botón **🌙/☀️** de abajo a la izquierda (`compartido/fondo-madera.js`; la elección se guarda en el dispositivo y vale para todos los juegos).
- Los textos sueltos sobre la madera (título, notas, encabezados de tamaño, título del nivel) usan `--txt-fondo`, `--txt-fondo-suave` y `--sombra-txt`; los paneles oscuros (datos, victoria, tablero) conservan sus colores.
- La página trae un `<script>` pequeño en el `<head>` que pone la clase `oscura` antes de pintar, para que no parpadee la madera clara.

## Salir de una partida (sin menú de pausa)
- **☰** (arriba a la izquierda, bajo 🎮) vuelve directo al menú principal, también en plena partida. Ya no existe el menú de pausa (`compartido/menu-pausa.js` ya no se usa aquí) y la tecla **Esc** ya no hace nada.
- Al salir **no se guarda** lo que se avanzó en esa partida (movimientos y tiempo se pierden). Ya no existe «Guardar progreso de este nivel y salir».
- **Partidas guardadas de antes** (`parciales` en `deslizante_progreso`): siguen funcionando. Al abrir un nivel que tiene una, se retoma (el tiempo sigue desde lo guardado y el cronómetro arranca con el siguiente movimiento) y lleva 💾 en «Niveles». Se borra al resolver el nivel o al pulsar 🔄. Como ya no hay forma de crear partidas nuevas, solo quedan las viejas. «Continuar» sigue yendo al primer nivel sin pasar.

## Niveles
- 10 niveles por tamaño: del 3×3 al 30×30 (280 en total).
- Desbloqueo en orden: no se puede jugar un nivel sin pasar el anterior. El primer nivel del 4×4 se abre al pasar el 10 del 3×3, y así sucesivamente.
- **Los niveles son siempre fijos**: nada de aleatorio ni procedural en el juego. Cada tablero está escrito tal cual en `niveles-deslizante.js` (se generaron una sola vez, fuera del juego, y se pegaron). Todo nivel nuevo debe pasar la comprobación de paridad (ver más abajo) antes de agregarse.
- Los niveles son iguales para todos. Cada uno trae su mínimo posible de movimientos; deslizar varias fichas de una fila o columna cuenta como 1 movimiento.
- **Hechos:** 3×3 (10 niveles, mínimo de 4 a 22 movimientos) y 4×4 (10 niveles: del 1 al 7 con mínimo exacto de 4 a 16 movimientos; los niveles 8, 9 y 10 son mezclas largas sin mínimo calculado).
- 5×5 al 30×30 (10 niveles cada uno, 260 en total): mezclas con jugadas legales desde el tablero resuelto, sin mínimo calculado. Dentro de cada tamaño la dificultad sube con la distancia total de las fichas a su lugar (del ~12 % al ~90 % de un tablero totalmente revuelto).
- **Pendientes:** ninguno: los 280 niveles están hechos.

## Modo libre
- Pantalla de opciones (estándar 7.2), **sin niveles**: primero **Dificultad** (5 emojis), debajo **Tablero** (3×3 al 30×30), el «🏆 Récord» de la combinación elegida y **▶ Jugar**. Se recuerda la última selección (`deslizante_libre_v1`).
- **Dificultad** (qué tan revuelto sale el tablero; siempre con solución). Se arma desde el tablero resuelto con jugadas legales al azar (sin deshacer la anterior); `pasos` = jugadas por casilla (n·n) y se ajusta en `DIFICULTADES` (`juego-deslizante.js`):

| Emoji | Nombre | Cómo se mezcla |
|---|---|---|
| 😁 | Muy fácil | 0.5 × n² jugadas |
| 😬 | Fácil | 1.5 × n² jugadas |
| 😐 | Normal | 4 × n² jugadas |
| 😡 | Difícil | 12 × n² jugadas |
| 😈 | Demoníaco | totalmente al azar (hueco al final y número par de inversiones) |

- **Aleatorio e infinito** (es lo único del juego que sí lo es). Los niveles de «Niveles» siguen siendo fijos.
- **Qué tamaños se pueden elegir:** un tamaño se abre cuando se desbloquea su etapa (se pasaron los 10 del tamaño anterior). El 3×3 siempre está abierto; los demás salen con 🔒 y desactivados.
- **Guarda** por combinación (tamaño + dificultad) la mejor marca (menos movimientos; si empatan, menos tiempo) y cuántos tableros se resolvieron (`libre` dentro de `deslizante_progreso`, sincronizado con la cuenta). Clave: `"<tamaño>"` para 😈 (así se conservan los récords de antes) y `"<tamaño>-<0 a 3>"` para las otras cuatro.
- **Puntos:** el modo libre NO da puntos al perfil (así no se pueden repetir sin límite). Solo los da la primera vez que se pasa cada nivel de «Niveles».
- Al terminar un tablero: «Otro tablero» y «⚙️ Cambiar tablero» (vuelve a esta pantalla).

## Cómo se sabe que un nivel tiene solución
No hace falta probar jugadas ni hacer backtracking: la solubilidad depende solo de la paridad de las inversiones (parejas de fichas donde una mayor va antes que una menor) y, en tableros de lado par, de la fila del hueco. Medio total de las mezclas posibles NO tiene solución, así que un nivel armado a mano o al azar puede ser imposible; por eso se genera mezclando desde el tablero resuelto con jugadas válidas y se comprueba con `esResoluble()` (el juego avisa en consola si alguno falla).

## Tiempos y récords
- El cronómetro arranca con el **primer movimiento** (el tiempo de mirar el tablero no cuenta) y se muestra en décimas: `m:ss.d` (con horas si hace falta).
- Cada nivel guarda **dos récords independientes**: el **mejor tiempo** y el **menor número de movimientos** (pueden venir de partidas distintas). En el tablero se ve el mejor tiempo; el mejor en movimientos se ve en el título del nivel y al terminar.
- En la pantalla de **Niveles** cada botón es cuadrado y muestra el número del nivel y su mejor tiempo (`–` si aún no se pasa). Los niveles bloqueados solo muestran 🔒.
- Se guarda en milisegundos (`ms`). Los récords viejos en segundos (`seg`) se convierten solos.
- Al sincronizar con la cuenta se conserva el menor tiempo y los menos movimientos de cada nivel.

## Estrellas y monedas
- **Solo en los niveles 3×3 por ahora**: los demás tamaños no dan estrellas ni monedas hasta calcular sus tiempos. Se activan por tamaño agregando su fila en `LIMITES` (arriba de `juego-deslizante.js`, ahí también se cambian los tiempos). El modo libre no da estrellas ni monedas.
- Cada nivel tiene **6 escalones** según el tiempo (el cronómetro cuenta desde el primer movimiento y se pide «menos de»). Las 3 estrellas moradas reemplazan a las doradas una por una:

| Escalón | Estrellas | Tiempo | Monedas del nivel (total) |
|---|---|---|---|
| 1 | ★ dorada | pasarlo | 8 |
| 2 | ★★ doradas | menos de 2 min | 15 |
| 3 | ★★★ doradas | menos de 1 min | 25 |
| 4 | 1 morada | menos de 40 s | 40 |
| 5 | 2 moradas | menos de 30 s | 50 |
| 6 | 3 moradas | menos de 20 s | 80 |

- **Las monedas de un nivel nunca se pagan dos veces**: se guarda el mejor escalón y, al mejorarlo, solo se cobra la diferencia (de 15 a 25 = +10; de 25 a 40 = +15). Los escalones se pueden conseguir por separado en intentos distintos.
- **Total de monedas** = suma de lo que ya pagó cada nivel (💰 arriba a la derecha). Todavía no se gastan en nada.
- Dónde se ven: en cada botón de «Niveles» (3×3), bajo el título dentro del nivel (con lo que falta para la siguiente estrella) y en la pantalla de victoria. Las moradas llevan brillo con reflejo de arcoíris, centelleo y estela de brillantina (se apaga con «reducir movimiento» del sistema).
- Se guarda en `estrellas` dentro de `deslizante_progreso` (`{ "<número de nivel>": escalón 1 a 6 }`) y se sincroniza con la cuenta: de cada nivel gana el escalón mayor. Los niveles 3×3 que ya estaban pasados antes de este sistema reciben sus estrellas según su mejor tiempo.
- Pendiente: tiempos de los demás tamaños y en qué se gastan las monedas.

## Puntos y progreso
- Los puntos se dan **solo la primera vez** que se pasa un nivel: `max(2, redondear(n·n / 4))` (3×3 = 2, 4×4 = 4, 10×10 = 25, 30×30 = 225). Se anotan con `encolarPuntos` y se envían al perfil cuando hay internet y sesión.
- Progreso en `localStorage` con la clave `deslizante_progreso`: `{ hechos, mejores, libre, estrellas, parciales }`. Se sincroniza con la cuenta (`compartido/progreso.js`): un nivel pasado en cualquier sitio cuenta como pasado, y de cada récord se queda el mejor (ver «Tiempos y récords»).
- Los récords sueltos por tamaño de la versión anterior (modo libre 3×3 a 8×8) ya no se usan.

## Pendiente / ideas
- Que los tableros grandes (del ~15×15 en adelante) se puedan usar en celular: zoom/desplazamiento o pellizcar para acercar.
- Correr siempre el verificador antes de subir cualquier nivel nuevo.
- Nombre definitivo del juego (se busca el del juguete de plástico mexicano).

## Cambios recientes
- **Sin pausa ni barra en partida**: se quitaron Modo libre · Niveles de la zona de juego, el menú de pausa (☰ ahora vuelve al menú principal) y los botones ◀ ▶. En su lugar, botón verde con el nombre del nivel. NO probado en navegador/celular (revisar que el botón no choque con los cuadros de datos en vertical y horizontal).
- **Modo libre nuevo**: grupo «Dificultad» (😁 😬 😐 😡 😈) arriba y «Tablero» debajo, con «▶ Jugar»; ya no sale ninguna lista de niveles. Récords por combinación. Estándar anotado en `ESTANDARES-juegos.md` (7.2) y `inmersivo.css`. NO probado en navegador/celular.
- **Velo de inicio** (estándar 7.0/7.1): el juego abre cargado detrás de un velo difuminado con Modo libre · Niveles · Continuar centrados. Sin resumen ni textos. Ya en el juego: barra con Modo libre y Niveles + cuadros de datos debajo + tablero centrado a todo el ancho. Se quitó el mensaje «Toca una ficha…».
