# Puzle deslizante

Ruta: `deslizante/README-deslizante.md` · Aquí se anotan las especificaciones del juego. Se va ampliando conforme se pidan cambios.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index-deslizante.html` | Las 3 pantallas (inicio, niveles, juego) y sus estilos |
| `juego-deslizante.js` | Lógica: menús, tablero, progreso y puntos |
| `niveles-deslizante.js` | Lista de niveles fijos (el orden de la lista es el orden de desbloqueo) |
| `verificar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): `node deslizante/verificar-niveles-deslizante.mjs` revisa que todos los niveles sean válidos y tengan solución |

## Pantallas
- **Menú de inicio**: botones **Jugar**, **Niveles** y **Modo libre**.
  - *Jugar* abre el primer nivel sin pasar (dice «Continuar» si ya se pasó alguno). Si ya se pasaron todos los que existen, abre el último.
  - *Niveles* muestra los niveles agrupados por tamaño.
- **Modo libre**: lista los tamaños del 3×3 al 30×30; se elige uno y salen tableros al azar sin fin.
- **Niveles**: pasado = verde, disponible = azul, bloqueado = gris con 🔒.
- **Juego**: tablero, movimientos, tiempo, mejor marca del nivel y botón 🔄 para reiniciarlo.

## Navegación (estándar de `compartido/inmersivo.css`)
- Arriba a la izquierda, **🎮 Juegos** (vuelve al portal), siempre visible.
- Justo debajo, **☰ Menú principal** (vuelve al menú de inicio), visible en todas las pantallas menos en el propio menú de inicio.

## Niveles
- 10 niveles por tamaño: del 3×3 al 30×30 (280 en total).
- Desbloqueo en orden: no se puede jugar un nivel sin pasar el anterior. El primer nivel del 4×4 se abre al pasar el 10 del 3×3, y así sucesivamente.
- **Los niveles son siempre fijos**: nada de aleatorio ni procedural en el juego. Cada tablero está escrito tal cual en `niveles-deslizante.js` (se generaron una sola vez, fuera del juego, y se pegaron). Todo nivel nuevo debe pasar la comprobación de paridad (ver más abajo) antes de agregarse.
- Los niveles son iguales para todos. Cada uno trae su mínimo posible de movimientos; deslizar varias fichas de una fila o columna cuenta como 1 movimiento.
- **Hechos:** 3×3 (10 niveles, mínimo de 4 a 22 movimientos) y 4×4 (10 niveles: del 1 al 7 con mínimo exacto de 4 a 16 movimientos; los niveles 8, 9 y 10 son mezclas largas sin mínimo calculado).
- 5×5 al 30×30 (10 niveles cada uno, 260 en total): mezclas con jugadas legales desde el tablero resuelto, sin mínimo calculado. Dentro de cada tamaño la dificultad sube con la distancia total de las fichas a su lugar (del ~12 % al ~90 % de un tablero totalmente revuelto).
- **Pendientes:** ninguno: los 280 niveles están hechos.

## Modo libre
- **Aleatorio e infinito** (es lo único del juego que sí lo es): cada tablero se mezcla al momento con solución garantizada (hueco al final y número par de inversiones). Los niveles de «Niveles» siguen siendo fijos.
- **Qué tamaños se pueden elegir:** un tamaño se abre cuando se desbloquea su etapa, es decir, cuando se puede jugar el primer nivel de ese tamaño (se pasaron los 10 del tamaño anterior). El 3×3 siempre está abierto. Los demás salen con 🔒.
- **Guarda** por tamaño la mejor marca (menos movimientos; si empatan, menos tiempo) y cuántos tableros se resolvieron (`libre` dentro de `deslizante_progreso`, también sincronizado con la cuenta).
- **Puntos:** el modo libre NO da puntos al perfil (así no se pueden repetir sin límite). Solo los da la primera vez que se pasa cada nivel de «Niveles».
- Los tableros grandes al azar quedan totalmente revueltos, así que son mucho más difíciles que los niveles del mismo tamaño.

## Cómo se sabe que un nivel tiene solución
No hace falta probar jugadas ni hacer backtracking: la solubilidad depende solo de la paridad de las inversiones (parejas de fichas donde una mayor va antes que una menor) y, en tableros de lado par, de la fila del hueco. Medio total de las mezclas posibles NO tiene solución, así que un nivel armado a mano o al azar puede ser imposible; por eso se genera mezclando desde el tablero resuelto con jugadas válidas y se comprueba con `esResoluble()` (el juego avisa en consola si alguno falla).

## Tiempos y récords
- El cronómetro arranca con el **primer movimiento** (el tiempo de mirar el tablero no cuenta) y se muestra en décimas: `m:ss.d` (con horas si hace falta).
- Cada nivel guarda **dos récords independientes**: el **mejor tiempo** y el **menor número de movimientos** (pueden venir de partidas distintas). En el tablero se ve el mejor tiempo; el mejor en movimientos se ve en el título del nivel y al terminar.
- En la pantalla de **Niveles** cada botón es cuadrado y muestra el número del nivel y su mejor tiempo (`–` si aún no se pasa). Los niveles bloqueados solo muestran 🔒.
- Se guarda en milisegundos (`ms`). Los récords viejos en segundos (`seg`) se convierten solos.
- Al sincronizar con la cuenta se conserva el menor tiempo y los menos movimientos de cada nivel.

## Estrellas y monedas (pendiente)
- Idea: 15 a 30 monedas por nivel según 3 estrellas por tiempo.
- Falta definir los **tiempos límite** de cada estrella; se decidirán a partir de los mejores tiempos que se vayan viendo en la pantalla de Niveles.

## Puntos y progreso
- Los puntos se dan **solo la primera vez** que se pasa un nivel: `max(2, redondear(n·n / 4))` (3×3 = 2, 4×4 = 4, 10×10 = 25, 30×30 = 225). Se anotan con `encolarPuntos` y se envían al perfil cuando hay internet y sesión.
- Progreso en `localStorage` con la clave `deslizante_progreso`: `{ hechos, mejores, libre }`. Se sincroniza con la cuenta (`compartido/progreso.js`): un nivel pasado en cualquier sitio cuenta como pasado, y de cada récord se queda el mejor (ver «Tiempos y récords»).
- Los récords sueltos por tamaño de la versión anterior (modo libre 3×3 a 8×8) ya no se usan.

## Pendiente / ideas
- Que los tableros grandes (del ~15×15 en adelante) se puedan usar en celular: zoom/desplazamiento o pellizcar para acercar.
- Correr siempre el verificador antes de subir cualquier nivel nuevo.
- Nombre definitivo del juego (se busca el del juguete de plástico mexicano).
