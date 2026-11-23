# Puzle deslizante

Ruta: `deslizante/README-deslizante.md` · Aquí se anotan las especificaciones del juego. Se va ampliando conforme se pidan cambios.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index-deslizante.html` | Las pantallas (juego con la barra de inicio, niveles, modo libre) y sus estilos |
| `juego-deslizante.js` | Lógica: menús, tablero, progreso y puntos |
| `niveles-deslizante.js` | Lista de niveles fijos (**los primeros 2000 ya creados** de 3 900: el nivel N es `NIVELES[N - 1]`, el orden es el de desbloqueo) y las recompensas por tamaño (`monedasDe`, `puntosJuegoDe`). No se edita a mano: lo escribe el generador |
| `plan-niveles-deslizante.json` | El plan de los 3 900 niveles: tamaño (3×3 a 30×30) y dificultad (fácil/normal/difícil) de cada uno. Lo escribe `sortear-niveles-deslizante.mjs --guardar` |
| `sortear-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): sortea el plan con semilla fija y comprueba sus reglas (`node deslizante/sortear-niveles-deslizante.mjs`; con `--guardar` escribe el JSON) |
| `generar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): arma los tableros del plan y reescribe `NIVELES` en `niveles-deslizante.js` (`node deslizante/generar-niveles-deslizante.mjs`; `--hasta N` para más niveles; `--probar` no escribe). Los niveles ya creados no cambian al agregar más |
| `verificar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): `node deslizante/verificar-niveles-deslizante.mjs` revisa que todos los niveles sean válidos y tengan solución, que no haya huecos y que las recompensas estén en orden |

## Pantallas
- **Inicio (juego ya cargado, con velo)**: al abrir el juego se ve directamente el nivel donde va el jugador (el primero si es nuevo; con sesión, el de su cuenta de Google; y su partida guardada si la tiene) **detrás de un velo negro transparente con un poco de difuminado** (`.velo-inicio` de `compartido/inmersivo.css`; `ESTANDARES-juegos.md`, 7.0 y 7.1). El juego se ve pero no responde (ni toques ni flechas) hasta tocar **Continuar**. En el centro de la pantalla, todo el grupo centrado: **Modo libre** y **Niveles** (cuadrados, juntos) un poco arriba y, debajo, **Jugar / Continuar** (verde, del doble de tamaño). No hay título ni texto de resumen.
  - *Jugar* / *Continuar* quita el velo y deja jugar el primer nivel sin pasar (dice «Continuar» si ya se pasó alguno). Si ya se pasaron todos, abre el último. **Mientras no existan niveles, juega el modo libre** (con el último tamaño y dificultad elegidos).
  - *Niveles* abre el **mapa estándar** (ver «Niveles»).
  - Mientras está el velo no se ve el ☰. Al volver al «menú principal» (☰) se vuelve a ver el juego cargado con el velo.
  - Si la nube trae un progreso más avanzado y el velo sigue puesto, el tablero de atrás se cambia al nivel de su cuenta.
- **Modo libre**: dificultad (5 emojis) + tamaño del 3×3 al 30×30; salen tableros al azar sin fin (ver «Modo libre»). No muestra niveles.
- **Niveles**: el mapa estándar de países (`compartido/mapa-niveles.js`, modo `soloPaises`): ya NO hay mundo ni lista de países. Abre directo la «botella» del país donde vas (solo su contorno con trazo, que se llena de agua con cada nivel). Botones ◀ ▶ para ir de país en país (solo los ya abiertos), 🗂️ Niveles (los 20 niveles del país) y Continuar. Con ☰ se sale al menú principal.
- **Juego** (ya sin velo): arriba, un **botón verde con el nombre del nivel** («Nivel 3», o «♾️ Modo libre 😐» en Modo libre; **sin el tamaño**); solo informa, no hace nada al tocarlo. **Justo debajo**, los tres cuadros de **Movimientos · Tiempo · Mejor tiempo**, en **azul**, cada uno un poco más oscuro que el anterior. El **tablero va centrado en la ventana** y en celular vertical ocupa todo el ancho (tapa la madera de los lados). Debajo del tablero: **solo el tamaño** («4×4», sin el número de nivel; debajo, en chico, el mínimo y tu mejor), estrellas y avisos. **Ya no hay botón 🔄 de reiniciar**: para empezar de cero se sale con ☰ y se vuelve a entrar, o se usa «Repetir» al ganar. En celular horizontal bajo, el botón verde, los cuadros y los textos pasan a una columna a la izquierda.
  - Ya **no hay** botones de Modo libre y Niveles dentro de la partida, ni ◀ ▶ para cambiar de nivel. Se cambia de nivel con «Siguiente nivel» al ganar, o desde ☰ → menú principal → Niveles.

## Navegación (estándar de `compartido/inmersivo.css`)
- Arriba a la derecha: el nombre del jugador y, **debajo de él**, el chip de monedas 💰 y el de puntos del juego 🏅 (en columna, no a su izquierda).
- Arriba a la izquierda, **🎮** (vuelve al portal), siempre visible: botón **cuadrado de 40 px, azul oscuro** (`b-azuloscuro`), solo icono (el texto «Juegos» va en `title` y `aria-label`).
- Justo debajo, el botón **☰**, **cuadrado, verde claro** (`b-verdeclaro`) y solo icono, visible en todas las pantallas menos en el propio menú de inicio. En todas las pantallas, **también dentro de una partida**, vuelve al menú principal (el juego cargado con el velo y Modo libre · Niveles · Continuar). No hay menú de pausa.

## Fondo de madera
- Todas las pantallas (inicio, niveles, modo libre y partida) van sobre el fondo estándar de madera de `compartido/fondo-madera.js`: **madera clara** por defecto y **madera oscura con luna** con el botón **🌙/☀️** de abajo a la izquierda (`compartido/fondo-madera.js`; la elección se guarda en el dispositivo y vale para todos los juegos). **En Deslizante el botón flotante está oculto** (`data-madera-boton="oculto"` en `<body>`; lo respeta `compartido/fondo-madera.js`) y el cambio quedará en la zona de pausa, que aún no existe en este juego: `alternarMadera()` ya está exportada para conectarla.
- Los textos sueltos sobre la madera (título, notas, encabezados de tamaño, título del nivel) usan `--txt-fondo`, `--txt-fondo-suave` y `--sombra-txt`; los paneles oscuros (datos, victoria, tablero) conservan sus colores.
- La página trae un `<script>` pequeño en el `<head>` que pone la clase `oscura` antes de pintar, para que no parpadee la madera clara.

## Salir de una partida (sin menú de pausa)
- **☰** (arriba a la izquierda, bajo 🎮) vuelve directo al menú principal, también en plena partida. Ya no existe el menú de pausa (`compartido/menu-pausa.js` ya no se usa aquí) y la tecla **Esc** ya no hace nada.
- Al salir **no se guarda** lo que se avanzó en esa partida (movimientos y tiempo se pierden). Ya no existe «Guardar progreso de este nivel y salir».
- **Ya no hay partidas guardadas**: las de antes (`parciales`) eran de los niveles viejos y se descartaron con el reinicio.

## Niveles
- **3 900 niveles**: **20 por país × 195 países** (mapa solo de países, estándar nuevo del 21 nov 2026; ya no hay estados de México), con el mapa estándar (`compartido/mapa-niveles.js`, listas de 5 columnas; los países se abren de uno en uno). El nivel N es `NIVELES[N - 1]`.
- **Orden de los países** (fijo, `PAISES_MUNDO` en `compartido/etapas-mapa.js`): 1 México · 2 a 20 el resto de Latinoamérica (Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panamá, Cuba, Rep. Dominicana, Haití, Colombia, Venezuela, Ecuador, Perú, Brasil, Bolivia, Paraguay, Chile, Argentina, Uruguay) · 21 a 24 Belice, Jamaica, Guyana y Surinam · **25 Estados Unidos** · 26 a 194 al azar con semilla fija · **195 China** (último). Así, México son los niveles 1 a 20 y Estados Unidos los 481 a 500.
- **Hoy hay 2000 de 3 900 niveles creados** (del 3×3 al 11×11; los primeros 1000 no cambiaron al agregar los siguientes). Se borraron los 280 niveles viejos (21 nov 2026) y se generaron estos nuevos con `generar-niveles-deslizante.mjs`. Los que todavía no existen (2001 en adelante) muestran 🚧 y al tocarlos sale «🚧 Los niveles todavía no están creados». Se abre en orden: el siguiente al último terminado.
- **Los primeros 20 niveles (México 1 a 20) son siempre 3×3 muy fáciles**: de 2 a 12 movimientos de distancia a la solución, subiendo poco a poco.
- **Dificultad en el 3×3:** se mide con la distancia exacta a la solución (en jugadas de una ficha; el máximo posible es 31): fácil 10–16, normal 17–22, difícil 23–31. Del 4×4 en adelante, con el número de jugadas al azar desde el tablero resuelto (fácil 1.5 · normal 4 · difícil 12 × n²). **No hay límite de movimientos** en ningún nivel.
- **Los niveles son siempre fijos**: nada de aleatorio ni procedural en el juego. Cada tablero se escribe tal cual en `niveles-deslizante.js` (se generan una sola vez, fuera del juego, y se pegan). Todo nivel nuevo debe pasar `verificar-niveles-deslizante.mjs` (paridad de las inversiones: ver «Cómo se sabe que un nivel tiene solución»).
- Los niveles son iguales para todos. Cada uno puede traer su `optimo` (mínimo de movimientos; deslizar varias fichas de una fila o columna cuenta como 1).
- **Progreso:** `hechos` es **un solo número** = el nivel más alto pasado (0 = ninguno); como los niveles se abren en orden, todos los anteriores están pasados. Para el mapa: `hecho` = `hechos` y `max` = `hecho + 1`. (Antes era una lista con un `true` por nivel; la lista vieja se convierte sola.)
- **Orden de trabajo** (`ESTANDARES-juegos.md`, sección 10): primero se cierran las mecánicas, después se generan los niveles. Mientras el juego esté en `EN_DESARROLLO` se pueden borrar y regenerar.

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
- **Qué tamaños se pueden elegir:** **los 28 (3×3 a 30×30) están abiertos** mientras no existan los niveles (antes cada tamaño se abría al pasar su etapa de 10 niveles; esa regla se quitó con el reinicio). Cuando haya niveles se decide si se vuelve a bloquear por avance (`tamanoAbierto` en `juego-deslizante.js`).
- **Guarda** por combinación (tamaño + dificultad) la mejor marca (menos movimientos; si empatan, menos tiempo) y cuántos tableros se resolvieron (`libre` dentro de `deslizante_progreso`, sincronizado con la cuenta). Clave: `"<tamaño>"` para 😈 (así se conservan los récords de antes) y `"<tamaño>-<0 a 3>"` para las otras cuatro.
- **Recompensas:** el modo libre NO da monedas ni puntos al perfil (así no se pueden repetir sin límite). Sí da los **puntos del juego** (🏅, de 80 a 250 según el tablero; ver «Puntos y progreso»).
- Al terminar un tablero: «Otro tablero» y «⚙️ Cambiar tablero» (vuelve a esta pantalla).

## Plan: 3 900 niveles, monedas y boost (niveles en marcha; monedas y boost por hacer)
Lo de esta sección es lo que se acordó para la versión final. Los 280 niveles viejos ya se borraron; esto es lo que se va a crear. Se hará por partes (en varias sesiones), siguiendo `ESTANDARES-juegos.md` secciones 4A, 8, 9 y 10: **primero estándares y mecánicas completos, después se generan los niveles**.

### Cantidad y mapa
- **3 900 niveles**: 20 por país × 195 países (México primero), con el mapa solo de países de `compartido/mapa-niveles.js` (listas de 5 columnas). *(Cambio del 21 nov 2026: antes se planeaban 22 600 con los 32 estados de México; ver «Cambios recientes».)* Fijos y con solución comprobada (paridad + `verificar-niveles-deslizante.mjs`), iguales para todos.

### Qué tamaños salen en cada tramo
| Niveles | Tableros |
|---|---|
| 1 – 1 700 | del 3×3 hasta **10×10** como máximo |
| 1 701 – 3 400 | hasta **15×15** como máximo |
| 3 401 – 3 900 (los últimos 500) | hay una **probabilidad creciente** de que salgan tableros de 16×16 a 25×25 (≈ 1 % en el país 171, curva p^2.5 hasta ≈ 75 % en el 195): en los primeros 5 de esos países casi no se notan (≈ 1) y en los últimos 5 son la mitad del país (10 a 17 de 20); hasta **30×30** |

- **26×26, 27×27, 28×28, 29×29 y 30×30 salen una sola vez cada uno** en todo el juego, y solo dentro de esos últimos 500 niveles (o sea 5 niveles en total, en lugares fijos de ese tramo, siempre difíciles: 3620, 3700, 3780, 3840 y el 30×30 en el 3 900, el último). *(Interpretación a confirmar: «cada tamaño una vez». Si en cambio se quiso un único nivel para los cinco tamaños juntos, hay que corregirlo aquí.)*
- **Dificultad por país** (21 nov 2026): México (niveles 1–20) es todo fácil; en los países 2 a 195 hay siempre 8 normales, y los fáciles bajan de 10 a 5 y los difíciles suben de 2 a 7 (≈ 50/40/10 % → 25/40/35 %). **Dentro de cada país los 20 niveles van de menor a mayor tamaño**, así el último es el «jefe» del país. Los tableros únicos quedan siempre al final de su país.
- Dentro de cada tramo la dificultad sube poco a poco (tamaño y revoltura). Los tamaños de 16×16 a 25×25 solo pueden salir en esos últimos 500, por probabilidad (que cada nivel ya generado quede fijo para todos). Las zonas son las mismas proporciones de antes (44 % · 44 % · 12 %) aplicadas a 3 900 niveles; los números exactos viven en `sortear-niveles-deslizante.mjs`.
- **Ya definido en el plan** (`plan-niveles-deslizante.json`): cuántos niveles de cada tamaño hay en cada tramo, la probabilidad del último tramo y el reparto fácil/normal/difícil de la sección 8 (50/40/10 % al inicio y 25/40/35 % al final; los 20 primeros siempre fáciles).

### Monedas
- **Cada nivel pasado da de 15 a 80 monedas según el tablero** (15 en 3×3, 80 en 30×30, en línea recta: ver «Puntos y progreso»). Se cobra **una sola vez por nivel** y no hay monedas en el Modo libre. *(Decidido el 21 nov 2026; reemplaza lo de «15 a 30» y la tabla por estrellas.)*

### Boost: «Eliminar un cuadro»
- **Es el único boost** y es **muy caro: 1 000 monedas**.
- Elimina **forzosamente solo el último número que exista en el nivel** (la ficha de número más alto que quede en el tablero); no se elige cuál.
- **Por definir:** si se puede usar una vez por nivel o varias, qué pasa con el hueco que deja la ficha (queda un segundo hueco, y el tablero sigue teniendo solución) y si el nivel conserva sus récords y estrellas al usarlo.
- Las monedas se gastan, así que su sincronización con la cuenta necesita una regla propia (como `unirCartera` de Estacionamiento), no `unirMaximos`.

### Sobre cambiar los niveles (resuelto el 21 nov 2026)
- Se eligió la opción (a): **«deslizante» volvió a `EN_DESARROLLO`** y se **reinició el progreso** (los 280 niveles se borraron; el progreso viejo se descarta solo gracias al campo `v: 2`). Los récords del modo libre se conservaron. Desde que se vuelva a publicar, los niveles ya no se cambian (`ESTANDARES-juegos.md`, sección 10).
- **Resuelto (21 nov 2026):** el progreso se guarda como un solo documento por jugador en la nube (`progreso/{uid}/juegos/deslizante`, tope de 900 000 caracteres en `firestore-unificado.rules`, subido el 21 nov 2026; Firestore no permite más de 1 MiB por documento). Con 3 900 niveles y `hechos` como un solo número, un jugador que los pase todos con récord ocupa unos 120 000 caracteres (≈ 13 % del tope).

## Cómo se sabe que un nivel tiene solución
No hace falta probar jugadas ni hacer backtracking: la solubilidad depende solo de la paridad de las inversiones (parejas de fichas donde una mayor va antes que una menor) y, en tableros de lado par, de la fila del hueco. Medio total de las mezclas posibles NO tiene solución, así que un nivel armado a mano o al azar puede ser imposible; por eso se genera mezclando desde el tablero resuelto con jugadas válidas y se comprueba con `esResoluble()` (el juego avisa en consola si alguno falla).

## Tiempos y récords
- El cronómetro arranca con el **primer movimiento** (el tiempo de mirar el tablero no cuenta) y se muestra en décimas: `m:ss.d` (con horas si hace falta).
- Cada nivel guarda **dos récords independientes**: el **mejor tiempo** y el **menor número de movimientos** (pueden venir de partidas distintas). En el tablero se ve el mejor tiempo; el mejor en movimientos se ve en el título del nivel y al terminar.
- En el **mapa**, cada botón de nivel muestra su número y, debajo, su mejor tiempo (🚧 si el nivel aún no existe).
- Se guarda en milisegundos (`ms`). Los récords viejos en segundos (`seg`) se convierten solos.
- Al sincronizar con la cuenta se conserva el menor tiempo y los menos movimientos de cada nivel.

## Estrellas (solo adorno) y monedas
- **Monedas:** de **15** (3×3) a **80** (30×30) por cada nivel pasado, **una sola vez por nivel** (`monedasDe` en `niveles-deslizante.js`). El chip 💰 es la suma de lo que pagó cada nivel pasado (se calcula con `hechos`, así que se sincroniza sola con la cuenta). Todavía no se gastan en nada. Cuando exista el boost (1 000 monedas) habrá que guardar una cartera con regla propia (`unirCartera`, como Estacionamiento).
- **Estrellas:** **ya no dan monedas.** Quedan como adorno de los niveles 3×3 (6 escalones por tiempo: ★ pasarlo · ★★ menos de 2 min · ★★★ menos de 1 min · y 1, 2 o 3 moradas con menos de 40 s, 30 s y 20 s). Se activan por tamaño agregando su fila en `LIMITES`. Se guardan en `estrellas` (`{ "<nivel>": 1 a 6 }`) y gana el escalón mayor al sincronizar. Pendiente decidir si se rediseñan o se quitan.

## Puntos y progreso
Tres cosas distintas (`ESTANDARES-juegos.md`, sección 12). Todas se reparten **en línea recta** entre el 3×3 y el 30×30 (más tamaño = más recompensa):

| Tablero | 3×3 | 4×4 | 5×5 | 10×10 | 15×15 | 20×20 | 30×30 |
|---|---|---|---|---|---|---|---|
| 💰 Monedas por nivel (1.ª vez) | 15 | 17 | 20 | 32 | 44 | 56 | 80 |
| 🏅 Puntos del juego por partida ganada | 80 | 86 | 93 | 124 | 156 | 187 | 250 |

- **Puntos del portal** (los de fuera, `perfiles.total`): **1 por nivel**, solo la primera vez que se pasa (`encolarNivel` de `compartido/cola-puntos.js`; se envían al perfil cuando hay internet y sesión). El Modo libre no da. Desde el 23 nov 2026 el juego está en la zona «Juegos», así que ese punto sí suma al total (antes, mientras estuvo en `EN_DESARROLLO`, no sumaba al total de nadie).
- **Monedas:** ver «Estrellas (solo adorno) y monedas».
- **Puntos del juego** 🏅 (chip bajo las monedas): se suman en **cada partida ganada**, sea nivel (también al repetirlo) o Modo libre: `puntosJuegoDe(n)`. Se guardan en `puntos` y al sincronizar gana el mayor de los dos (un marcador acumulado no se puede sumar entre dispositivos sin duplicar). Son solo un marcador del juego: no suben el total del portal.
- Progreso en `localStorage` con la clave `deslizante_progreso`: `{ v: 2, hechos (número), mejores, libre, estrellas, puntos }`. Se sincroniza con la cuenta (`compartido/progreso.js`): un nivel pasado en cualquier sitio cuenta como pasado y de cada récord se queda el mejor (ver «Tiempos y récords»).
- **Reinicio (21 nov 2026):** lo guardado sin `v: 2` solo conserva los récords del modo libre; niveles, estrellas y partidas guardadas se descartan. Una sola vez por dispositivo (`deslizante_reinicio_v1`) se quitan de la cola los puntos pendientes de este juego. En la nube, los puntos y datos viejos se borran con `herramientas/reiniciar-puntos.mjs` (simulacro por defecto).

## Pendiente / ideas
- Crear los niveles 2001 a 3900 (`node deslizante/generar-niveles-deslizante.mjs --hasta 3900`); los ya creados no cambian. Mientras tanto salen con 🚧.
- Boost «Eliminar un cuadro» (ver «Plan») y revisar que las monedas coincidan con lo anotado.
- Probar con el dedo en celular real: la celebración de estrellas, el botón «Continuar» en el centro del país y los tableros 10×10 y 11×11.
- Si se vuelve a correr `generar-contornos-paises.mjs`, Australia vuelve a salir como rectángulo: repetir el arreglo a mano anotado en la cabecera de `contornos-paises.js`.
- Que los tableros grandes (del ~15×15 en adelante) se puedan usar en celular: zoom/desplazamiento o pellizcar para acercar.
- Correr siempre el verificador antes de subir cualquier nivel nuevo.
- Nombre definitivo del juego (se busca el del juguete de plástico mexicano).

## Cambios recientes
- **La celebración ya se ve en PC con «reducir movimiento» (23 nov 2026):** la celebración de estrellas se saltaba sola cuando el sistema tenía activado «reducir movimiento» (en Windows basta con tener los efectos de animación apagados) y solo abría el mapa; además el CSS apagaba sus chispas. Ahora la constante `RESPETAR_MOVIMIENTO_REDUCIDO = false` (en `juego-deslizante.js`, junto a `TIEMPOS`) la muestra siempre, como en el Solitario; poner `true` vuelve al comportamiento anterior. La ventana del Modo libre sigue respetando esa opción. `sw.js` sube a 206. Reproducido y comprobado en Chromium con y sin esa opción.
- **Mapa del país afinado (23 nov 2026):** el nombre del país va grande justo arriba del contorno y «N de 20 niveles completados» debajo, separado (se quitó «País x de 195»); «Continuar» en dos líneas (Continuar / Nivel n); el botón ◀ de países anteriores (y el ▶) se reemplazó por **🗺️ Mapa**: lista de todos los países abiertos, cada uno con sus 20 niveles en cuadrícula de 5 columnas × 4 filas; tocar el nombre de un país abre su mapa, y ◀ País regresa. En 🗂️ Niveles el botón de regreso ahora dice «País». Código en `compartido/mapa-niveles.js` (opción `unPais`). `sw.js` sube a 205. Probado en navegador sin pantalla (PC y celular simulado); NO con el dedo en celular real.
- **Celebración de estrellas rehecha (23 nov 2026):** al pasar un nivel las estrellas ganadas salen del centro de la pantalla **una tras otra**, giran y se deslizan **separadas entre sí** a su lugar dejando brillos, y se quedan moviéndose un rato. Luego un velo oscuro cambia la escena al contorno del país y las estrellas **caen una por una** hacia su centro, **se encogen hasta desaparecer** y, cada vez que una entra, **el país hace «pop»** (se hincha, destella y rebota; cada pop un poco más fuerte). El botón «Continuar» del centro queda oculto durante todo esto y aparece al final con un rebote. Tocar la pantalla salta la animación; con «reducir movimiento» solo se abre el mapa. Los tiempos están juntos en `TIEMPOS` (`juego-deslizante.js`) para ajustarlos. En `compartido/mapa-niveles.js` (opción `unPais`) se suman `retenerContinuar(true/false)` y `parpadear(k)`. `sw.js` sube a 204. Probado en navegador sin pantalla (PC 1280×720 y celular 390×780, 3 y 2 estrellas, sin errores de JavaScript); NO con el dedo en celular real.
- **Pasa a la zona «Juegos» (terminado) y mapa afinado (23 nov 2026):** se quitó `deslizante` de `EN_DESARROLLO` (`juegos.js`) y `sw.js` sube a 203: desde ahora **el punto de portal por nivel sí suma al total de los jugadores**. En `compartido/mapa-niveles.js` (opción `unPais`): «▶ Continuar · nivel N» va **dentro del país, en su centro** (se recoloca al girar o cambiar el tamaño de la ventana; las flechas ◀ ▶, 🗂️ Niveles e Info siguen arriba); mientras llega `contornos-paises.js` no se dibuja nada (antes salía la gota de respaldo, que parece un círculo) y, si ese archivo no carga (p. ej. no está en `compartido/`), se avisa en la consola y se usa la gota. En `compartido/contornos-paises.js` se corrigió **Australia** (salía como un rectángulo; ahora usa el contorno de `geografia-mapa.js`). **Vaticano** (`VA`) sigue con la gota: Natural Earth 10m no lo trae. Probado en navegador sin pantalla (PC 1280×720 y celular 390×780; El Salvador, Chile, Vaticano y Estados Unidos); NO probado con el dedo en celular real. **Ojo:** quedan sin crear los niveles 2001 a 3900 (salen con 🚧), el boost «Eliminar un cuadro» y las monedas del plan siguen pendientes (ver «Pendiente»).
- **Niveles 1001 a 2000 (23 nov 2026):** `node deslizante/generar-niveles-deslizante.mjs --hasta 2000` (tableros del 3×3 al 11×11; el 11×11 aparece desde el nivel 1720, dentro de lo previsto para el tramo 1 701–3 400). Los 1000 primeros salieron idénticos (se comprobó), no hay tableros repetidos y `verificar-niveles-deslizante.mjs` los da por buenos (2000 de 3 900, con solución). NO probados todavía en navegador ni en celular: revisar cómo se ven los 10×10 y 11×11 en pantalla vertical angosta.
- **Tableros grandes progresivos y límite de la nube (21 nov 2026):** en los últimos 25 países (niveles 3401–3900) los tableros de 16×16 a 25×25 salen cada vez más (curva suave, casi nada al inicio y la mitad del país al final; `CURVA_GRANDE` en `sortear-niveles-deslizante.mjs`). Solo cambian los niveles 3450 en adelante: los 1 000 ya creados quedan idénticos. `sw.js` pasa a la versión 198 y el tope de `progreso` en `firestore-unificado.rules` sube de 300 000 a 900 000 caracteres (hay que republicar las reglas en la consola de Firebase).
- **Dificultad por país y niveles ordenados (21 nov 2026):** el sorteo de dificultad pasó de tramos de 100 niveles a un reparto por país (20 niveles), con México todo fácil, y cada país ordena sus niveles de menor a mayor tamaño. Se volvió a sortear el plan y se regeneraron los primeros 1000 niveles (3×3 al 7×7, todos verificados). Probado solo con scripts de Node; NO jugado en navegador ni en celular.
- **Mapa de un solo país (23 nov 2026):** se quitaron la lista de países y el mundo del mapa de este juego; «Niveles» y «💧 Mapa» abren la botella del país actual (◀ ▶ para otros países abiertos, 🗂️ para sus 20 niveles). México es el país 1 (niveles 1 a 20) y ya no hay estados. En `compartido/mapa-niveles.js` es la opción `unPais: true` (solo la pide este juego): los demás juegos con mapa de países siguen con su lista y el modo clásico con estados sigue igual. `sw.js` subió a la versión 202 para que todos descarguen los archivos nuevos. Ventana de victoria rehecha (cuadros de datos grises, premios amarillos, botones abajo) con animación de estrellas, confeti y conteo de puntos. Sin probar en navegador ni celular.
- **Mapa solo de países y primeros 1000 niveles (21 nov 2026):** se quitaron los 32 estados de México del mapa: ahora son **195 países × 20 niveles = 3 900 niveles**, con México primero, el resto de Latinoamérica después, Estados Unidos en el lugar 25 y China al final (`PAISES_MUNDO` en `compartido/etapas-mapa.js`, opción `crearEtapas({ porEtapa: 20, soloPaises: true })`; `compartido/mapa-niveles.js` abre directo en el mundo con esa opción y sigue igual sin ella, para los juegos que todavía no pasan al estándar nuevo). El plan y los tamaños se reescalaron a 3 900 (los 20 primeros niveles son 3×3 muy fáciles) y se generaron los **primeros 1000 niveles** (del 3×3 al 7×7, todos con solución comprobada). `hechos` pasó de lista a un solo número. Probado con scripts de Node y un DOM simulado; NO probado en navegador ni en celular.
- **Reinicio y nuevas recompensas (21 nov 2026):** se borraron los 280 niveles; «Niveles» pasó a ser el mapa estándar (hoy es el mapa solo de países: 3 900 niveles; los estados de México ya no existen en este juego); monedas de 15 a 80 por nivel, puntos del juego de 80 a 250 por partida, y 1 punto de portal por nivel (estándar nuevo, sección 12). El juego volvió a `EN_DESARROLLO`. Se quitaron la lista de niveles por tamaño, las partidas guardadas y el pago de monedas por estrellas. Probado en navegador sin pantalla (mapa, aviso 🚧, ganar con niveles de prueba, repetir, modo libre, fin de etapa); NO probado con el dedo en celular real.
- **Sin 🔄 ni 🌙/☀️ flotantes**: se quitó el botón de reiniciar y el de madera clara/oscura (este se oculta con `data-madera-boton="oculto"`; `fondo-madera.js` exporta `alternarMadera()` y `maderaOscura()`). OJO: mientras no haya zona de pausa no hay forma de cambiar la madera desde el juego.
- **Sin pausa ni barra en partida**: se quitaron Modo libre · Niveles de la zona de juego, el menú de pausa (☰ ahora vuelve al menú principal) y los botones ◀ ▶. En su lugar, botón verde con el nombre del nivel. NO probado en navegador/celular (revisar que el botón no choque con los cuadros de datos en vertical y horizontal).
- **Modo libre nuevo**: grupo «Dificultad» (😁 😬 😐 😡 😈) arriba y «Tablero» debajo, con «▶ Jugar»; ya no sale ninguna lista de niveles. Récords por combinación. Estándar anotado en `ESTANDARES-juegos.md` (7.2) y `inmersivo.css`. NO probado en navegador/celular.
- **Velo de inicio** (estándar 7.0/7.1): el juego abre cargado detrás de un velo difuminado con Modo libre · Niveles · Continuar centrados. Sin resumen ni textos. Ya en el juego: barra con Modo libre y Niveles + cuadros de datos debajo + tablero centrado a todo el ancho. Se quitó el mensaje «Toca una ficha…».
