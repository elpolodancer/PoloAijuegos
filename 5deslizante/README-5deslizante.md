# Puzle deslizante

Ruta: `5deslizante/README-5deslizante.md` · Aquí se anotan las especificaciones del juego. Se va ampliando conforme se pidan cambios.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index-5deslizante.html` | Las pantallas (juego con la barra de inicio, niveles, modo libre) y sus estilos |
| `juego-5deslizante.js` | Lógica: menús, tablero, progreso y puntos |
| `niveles-5deslizante.js` | Lista de niveles fijos (**los 3 900 ya creados**: el nivel N es `NIVELES[N - 1]`, el orden es el de desbloqueo) y las recompensas por tamaño (`monedasDe`, `puntosJuegoDe`). No se edita a mano: lo escribe el generador |
| `plan-niveles-deslizante.json` | El plan de los 3 900 niveles: tamaño (3×3 a 30×30) y dificultad (fácil/normal/difícil) de cada uno. Lo escribe `sortear-niveles-deslizante.mjs --guardar` |
| `sortear-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): sortea el plan con semilla fija y comprueba sus reglas (`node 5deslizante/sortear-niveles-deslizante.mjs`; con `--guardar` escribe el JSON) |
| `generar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): arma los tableros del plan y reescribe `NIVELES` en `niveles-5deslizante.js` (`node 5deslizante/generar-niveles-deslizante.mjs`; `--hasta N` para más niveles; `--probar` no escribe). Los niveles ya creados no cambian al agregar más |
| `verificar-niveles-deslizante.mjs` | Herramienta de desarrollo (no va en `sw.js`): `node 5deslizante/verificar-niveles-deslizante.mjs` revisa que todos los niveles sean válidos y tengan solución, que no haya huecos y que las recompensas estén en orden |

## Pantallas
- **Inicio = el mapa (23 nov 2026)**: al abrir el juego o recargar con F5 se ve directo el **mapa del país donde va el jugador** (el de su cuenta de Google si hay sesión). Ya NO hay velo ni nivel cargado detrás (se quitó `#velo-inicio` de `index-5deslizante.html`). El mapa **es** el menú principal:
  - *Continuar · Nivel N* (en el centro del país) abre el primer nivel sin pasar. Si ya se pasaron todos, abre el último.
  - *Mapa* y *Niveles* abren sus vistas (ver «Niveles»); *♾️ Modo libre* (botón morado, `botonesExtra` del mapa) abre el Modo libre.
  - En el mapa principal el ☰ no se ve. En las vistas internas del mapa (Mapa, Niveles) el ☰ dice «Atrás» y vuelve al país. Desde una partida o el Modo libre, el ☰ vuelve al mapa.
  - Si la nube trae un progreso más avanzado, el mapa se redibuja solo con el de su cuenta.
- **Modo libre**: dificultad (5 emojis) + tamaño del 3×3 al 30×30; salen tableros al azar sin fin (ver «Modo libre»). No muestra niveles.
- **Niveles**: el mapa estándar de países (`compartido/mapa-niveles.js`, modo `soloPaises`): ya NO hay mundo ni lista de países. Abre directo la «botella» del país donde vas (solo su contorno con trazo, que se llena de agua con cada nivel). Botones ◀ ▶ para ir de país en país (solo los ya abiertos), 🗂️ Niveles (los 20 niveles del país) y Continuar. Este mapa es el menú principal del juego.
- **Juego** (ya sin velo): arriba, un **botón verde con el nombre del nivel** («Nivel 3», o «♾️ Modo libre 😐» en Modo libre; **sin el tamaño**); al tocarlo pregunta si quieres salir (ver «Botón del nombre del nivel»). **Justo debajo**, los tres cuadros de **Movimientos · Tiempo · Mejor tiempo**, en **azul**, cada uno un poco más oscuro que el anterior. El **tablero va centrado en la ventana** y en celular vertical ocupa todo el ancho (tapa la madera de los lados). Debajo del tablero: **solo el tamaño** («4×4», sin el número de nivel; debajo, en chico, el mínimo y tu mejor), estrellas y avisos. **Ya no hay botón 🔄 de reiniciar**: para empezar de cero se sale con ☰ y se vuelve a entrar, o se usa «Repetir» al ganar. En celular horizontal bajo, el botón verde, los cuadros y los textos pasan a una columna a la izquierda.
  - Ya **no hay** botones de Modo libre y Niveles dentro de la partida, ni ◀ ▶ para cambiar de nivel. Se cambia de nivel con «Siguiente nivel» al ganar, o desde ☰ → menú principal → Niveles.

## Navegación (estándar de `compartido/inmersivo.css`)
- Arriba a la derecha: el nombre del jugador y, **debajo de él**, el chip de monedas 💰 y el de puntos del juego 🏅 (en columna, no a su izquierda).
- Arriba a la izquierda, **🎮** (vuelve al portal), siempre visible: botón **cuadrado de 40 px, azul oscuro** (`b-azuloscuro`), solo icono (el texto «Juegos» va en `title` y `aria-label`).
- Justo debajo, el botón **☰**, **cuadrado, verde claro** (`b-verdeclaro`) y solo icono, visible en todas las pantallas menos en el mapa principal (en las vistas internas del mapa dice «Atrás»). **También dentro de una partida** vuelve al menú principal (el mapa). No hay menú de pausa.

## Fondo de madera
- Todas las pantallas (inicio, niveles, modo libre y partida) van sobre el fondo estándar de madera de `compartido/fondo-madera.js`: **madera clara** por defecto y **madera oscura con luna** con el botón **🌙/☀️** de abajo a la izquierda (`compartido/fondo-madera.js`; la elección se guarda en el dispositivo y vale para todos los juegos). **En Deslizante el botón flotante está oculto** (`data-madera-boton="oculto"` en `<body>`; lo respeta `compartido/fondo-madera.js`) y el cambio quedará en la zona de pausa, que aún no existe en este juego: `alternarMadera()` ya está exportada para conectarla.
- Los textos sueltos sobre la madera (título, notas, encabezados de tamaño, título del nivel) usan `--txt-fondo`, `--txt-fondo-suave` y `--sombra-txt`; los paneles oscuros (datos, victoria, tablero) conservan sus colores.
- La página trae un `<script>` pequeño en el `<head>` que pone la clase `oscura` antes de pintar, para que no parpadee la madera clara.

## Salir de una partida (sin menú de pausa)
- **☰** (arriba a la izquierda, bajo 🎮) vuelve directo al menú principal, también en plena partida. No hay menú de pausa general; solo la ventana de salida del botón verde del nombre (usa `compartido/menu-pausa.js`), que también se abre/cierra con **Esc** dentro de una partida.
- Al salir **no se guarda** lo que se avanzó en esa partida (movimientos y tiempo se pierden).

## Niveles
- **3 900 niveles**: **20 por país × 195 países** (mapa solo de países, estándar nuevo del 21 nov 2026; ya no hay estados de México), con el mapa estándar (`compartido/mapa-niveles.js`, listas de 5 columnas; los países se abren de uno en uno). El nivel N es `NIVELES[N - 1]`.
- **Orden de los países** (fijo, `PAISES_MUNDO` en `compartido/etapas-mapa.js`): 1 México · 2 a 20 el resto de Latinoamérica (Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panamá, Cuba, Rep. Dominicana, Haití, Colombia, Venezuela, Ecuador, Perú, Brasil, Bolivia, Paraguay, Chile, Argentina, Uruguay) · 21 a 24 Belice, Jamaica, Guyana y Surinam · **25 Estados Unidos** · 26 a 194 al azar con semilla fija · **195 China** (último). Así, México son los niveles 1 a 20 y Estados Unidos los 481 a 500.
- **Los 3 900 niveles están creados** (del 3×3 al 30×30), generados con `generar-niveles-deslizante.mjs`. (Si algún día falta alguno, el mapa muestra 🚧 y al tocarlo sale «🚧 Los niveles todavía no están creados».) Se abren en orden: el siguiente al último terminado.
- **Los primeros 20 niveles (México 1 a 20) son siempre 3×3 muy fáciles**: de 2 a 12 movimientos de distancia a la solución, subiendo poco a poco.
- **Dificultad en el 3×3:** se mide con la distancia exacta a la solución (en jugadas de una ficha; el máximo posible es 31): fácil 10–16, normal 17–22, difícil 23–31. Del 4×4 en adelante, con el número de jugadas al azar desde el tablero resuelto (fácil 1.5 · normal 4 · difícil 12 × n²). **No hay límite de movimientos** en ningún nivel.
- **Los niveles son siempre fijos**: nada de aleatorio ni procedural en el juego. Cada tablero se escribe tal cual en `niveles-5deslizante.js` (se generan una sola vez, fuera del juego, y se pegan). Todo nivel nuevo debe pasar `verificar-niveles-deslizante.mjs` (paridad de las inversiones: ver «Cómo se sabe que un nivel tiene solución»).
- Los niveles son iguales para todos. Cada uno puede traer su `optimo` (mínimo de movimientos; deslizar varias fichas de una fila o columna cuenta como 1).
- **Progreso:** `hechos` es **un solo número** = el nivel más alto pasado (0 = ninguno); como los niveles se abren en orden, todos los anteriores están pasados. Para el mapa: `hecho` = `hechos` y `max` = `hecho + 1`. (Antes era una lista con un `true` por nivel; la lista vieja se convierte sola.)
- **Niveles fijos desde la publicación (23 nov 2026):** ya no se borran ni se regeneran (`ESTANDARES-juegos.md`, sección 10).

## Modo libre
- Pantalla de opciones (estándar 7.2), **sin niveles**: primero **Dificultad** (5 emojis), debajo **Tablero** (3×3 al 30×30), el «🏆 Récord» de la combinación elegida y **▶ Jugar**. Se recuerda la última selección (`deslizante_libre_v1`).
- **Dificultad** (qué tan revuelto sale el tablero; siempre con solución). Se arma desde el tablero resuelto con jugadas legales al azar (sin deshacer la anterior); `pasos` = jugadas por casilla (n·n) y se ajusta en `DIFICULTADES` (`juego-5deslizante.js`):

| Emoji | Nombre | Cómo se mezcla |
|---|---|---|
| 😁 | Muy fácil | 0.5 × n² jugadas |
| 😬 | Fácil | 1.5 × n² jugadas |
| 😐 | Normal | 4 × n² jugadas |
| 😡 | Difícil | 12 × n² jugadas |
| 😈 | Demoníaco | totalmente al azar (hueco al final y número par de inversiones) |

- **Aleatorio e infinito** (es lo único del juego que sí lo es). Los niveles de «Niveles» siguen siendo fijos.
- **Qué tamaños se pueden elegir:** **los 28 (3×3 a 30×30) están abiertos** (`tamanoAbierto` en `juego-5deslizante.js`).
- **Guarda** por combinación (tamaño + dificultad) la mejor marca (menos movimientos; si empatan, menos tiempo) y cuántos tableros se resolvieron (`libre` dentro de `deslizante_progreso`, sincronizado con la cuenta). Clave: `"<tamaño>"` para 😈 (así se conservan los récords de antes) y `"<tamaño>-<0 a 3>"` para las otras cuatro.
- **Recompensas:** el modo libre NO da monedas ni puntos al perfil (así no se pueden repetir sin límite). Sí da los **puntos del juego** (🏅, de 80 a 250 según el tablero; ver «Puntos y progreso»).
- Al terminar un tablero: «Otro tablero» y «⚙️ Cambiar tablero» (vuelve a esta pantalla).

## Plan: 3 900 niveles, monedas y boost (niveles y monedas hechos; boost por hacer)
Lo de esta sección es lo acordado para la versión final (`ESTANDARES-juegos.md`, secciones 4A, 8, 9 y 10). Los 3 900 niveles ya están creados.

### Cantidad y mapa
- **3 900 niveles**: 20 por país × 195 países (México primero), con el mapa solo de países de `compartido/mapa-niveles.js` (listas de 5 columnas). Fijos y con solución comprobada (paridad + `verificar-niveles-deslizante.mjs`), iguales para todos.

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
- **Cada nivel pasado da de 15 a 80 monedas según el tablero** (15 en 3×3, 80 en 30×30, en línea recta: ver «Puntos y progreso»). Se cobra **una sola vez por nivel** y no hay monedas en el Modo libre.

### Boost: «Eliminar un cuadro»
- **Es el único boost** y es **muy caro: 1 000 monedas**.
- Elimina **forzosamente solo el último número que exista en el nivel** (la ficha de número más alto que quede en el tablero); no se elige cuál.
- **Por definir:** si se puede usar una vez por nivel o varias, qué pasa con el hueco que deja la ficha (queda un segundo hueco, y el tablero sigue teniendo solución) y si el nivel conserva sus récords y estrellas al usarlo.
- Las monedas se gastan, así que su sincronización con la cuenta necesita una regla propia (como `unirCartera` de Estacionamiento), no `unirMaximos`.

### Niveles fijos y progreso en la nube
- Desde que el juego se publicó (23 nov 2026) los niveles ya no se cambian (`ESTANDARES-juegos.md`, sección 10).
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
- **Monedas:** de **15** (3×3) a **80** (30×30) por cada nivel pasado, **una sola vez por nivel** (`monedasDe` en `niveles-5deslizante.js`). El chip 💰 es la suma de lo que pagó cada nivel pasado (se calcula con `hechos`, así que se sincroniza sola con la cuenta). Todavía no se gastan en nada. Cuando exista el boost (1 000 monedas) habrá que guardar una cartera con regla propia (`unirCartera`, como Estacionamiento).
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
- Boost «Eliminar un cuadro» (ver «Plan») y revisar que las monedas coincidan con lo anotado.
- Si se vuelve a correr `generar-contornos-paises.mjs`, Australia vuelve a salir como rectángulo: repetir el arreglo a mano anotado en la cabecera de `contornos-paises.js`.
- Que los tableros grandes (del ~15×15 en adelante) se puedan usar en celular: zoom/desplazamiento o pellizcar para acercar.
- Correr siempre el verificador antes de subir cualquier nivel nuevo.
- Nombre definitivo del juego (se busca el del juguete de plástico mexicano).

## Cambios recientes
- **Celebración sin pausa, a la mitad y arreglada en celular (23 nov 2026):** (1) las estrellas salen del centro y **vuelan de inmediato a su lugar arriba a la derecha** (ya no se quedan quietas en el centro ni hay fase de «subida» aparte: se quitaron `quieta` y `sube` de `TIEMPOS`); (2) dura **la mitad**: ~1,5 s con 3 estrellas (antes ~2,9 s), con los tiempos escritos directamente en `TIEMPOS` y `RITMO = 1` (con `RITMO = 2` vuelve a ir al doble de lento); (3) **en celulares la celebración se cerraba sola**: las fichas se mueven al tocar (`pointerdown`), así que la celebración nacía bajo el dedo y el «clic» de ese mismo toque la tocaba y la saltaba; ahora solo salta con un toque NUEVO (`pointerdown` sobre la celebración). Las estrellas mostradas son las del escalón ganado: 1 a 3 doradas, o con moradas (4: 1 morada + 2 doradas · 5: 2 moradas + 1 dorada · 6: 3 moradas). `sw.js` sube a 214.
- **Texto «N estrellas» en la celebración (23 nov 2026):** mientras las estrellas esperan arriba a la derecha (antes de que el velo cambie al mapa), sale de ellas un texto dorado («1 estrella», «2 estrellas», «3 estrellas»; con moradas: «3 estrellas · 1 morada»), se coloca un poco encima, sube ~30 px creciendo ~20 % y se desvanece. Dura `TIEMPOS.texto` (480 ms). Código en `celebrar` de `juego-5deslizante.js`; estilo `.cel-txt` en `index-5deslizante.html`. Las estrellas mostradas son las ganadas (hasta 3); solo los tableros 3×3 pueden dar 2 o 3 (ver «Estrellas»). `sw.js` sube a 213.
- **Vaticano con su forma (23 nov 2026):** el Vaticano ya no es una gota: su contorno aproximado (dibujado a mano) está en `compartido/contornos-paises.js` y en `generar-contornos-paises.mjs` (constante `VATICANO`). Celebración, «Continuar» y tableros grandes probados en celular real. `sw.js` sube a 212.
- **Carpeta renombrada a `5deslizante` y limpieza de notas (23 nov 2026):** la carpeta, `index-5deslizante.html`, `juego-5deslizante.js`, `niveles-5deslizante.js` y este README pasan a llevar el 5. El `id` del juego sigue siendo `deslizante` (puntos y progreso de la cuenta no cambian). Es el 5.º juego de la zona «Juegos» (`juegos.js`). `sw.js` sube a 211. Se quitaron las notas de cambios ya cubiertas arriba (velo de inicio, reparto de dificultad, mapa de países, etc.).
- **La celebración ya se ve en PC con «reducir movimiento» (23 nov 2026):** la celebración de estrellas se saltaba sola cuando el sistema tenía activado «reducir movimiento» (en Windows basta con tener los efectos de animación apagados) y solo abría el mapa; además el CSS apagaba sus chispas. Ahora la constante `RESPETAR_MOVIMIENTO_REDUCIDO = false` (en `juego-5deslizante.js`, junto a `TIEMPOS`) la muestra siempre, como en el Solitario; poner `true` vuelve al comportamiento anterior. La ventana del Modo libre sigue respetando esa opción. `sw.js` sube a 206. Reproducido y comprobado en Chromium con y sin esa opción.
- **Jarra y oleaje al llenar el agua (23 nov 2026):** en el mapa de un país, antes de que el agua suba entra una jarra dibujada en vectores (en `crearAgua` de `compartido/mapa-niveles.js`), se inclina y de su pico cae el chorro; 1 s después empieza a subir el agua. Mientras cae, las olas se agitan hasta ~4,5 veces su tamaño normal (`ag`, con un oleaje rápido extra) y se calman solas; al terminar, la jarra se retira y recién entonces se avisa la llegada (bandera / «país completo»). La salpicadura también crece con la agitación. Ajustes: tamaño de la jarra = `escJarra`, altura de la boca = `yBoca` (ambos en la vista de país), agitación = el `3.5` de `turb` y el `0.9` del oleaje rápido en `crearAgua`. `sw.js` sube a 207. Comprobado en Chromium (PC 1280×720 y celular simulado 390×780) sin errores; no con el dedo en celular real.
- **Mapa del país afinado (23 nov 2026):** el nombre del país va grande justo arriba del contorno y «N de 20 niveles completados» debajo, separado (se quitó «País x de 195»); «Continuar» en dos líneas (Continuar / Nivel n); el botón ◀ de países anteriores (y el ▶) se reemplazó por **🗺️ Mapa**: lista de todos los países abiertos, cada uno con sus 20 niveles en cuadrícula de 5 columnas × 4 filas; tocar el nombre de un país abre su mapa, y ◀ País regresa. En 🗂️ Niveles el botón de regreso ahora dice «País». Código en `compartido/mapa-niveles.js` (opción `unPais`). `sw.js` sube a 205. Probado en navegador sin pantalla (PC y celular simulado); NO con el dedo en celular real.
- **Celebración de estrellas rehecha (23 nov 2026):** al pasar un nivel las estrellas ganadas salen del centro de la pantalla **una tras otra**, giran y se deslizan **separadas entre sí** a su lugar dejando brillos, y se quedan moviéndose un rato. Luego un velo oscuro cambia la escena al contorno del país y las estrellas **caen una por una** hacia su centro, **se encogen hasta desaparecer** y, cada vez que una entra, **el país hace «pop»** (se hincha, destella y rebota; cada pop un poco más fuerte). El botón «Continuar» del centro queda oculto durante todo esto y aparece al final con un rebote. Tocar la pantalla salta la animación; con «reducir movimiento» solo se abre el mapa. Los tiempos están juntos en `TIEMPOS` (`juego-5deslizante.js`) para ajustarlos. En `compartido/mapa-niveles.js` (opción `unPais`) se suman `retenerContinuar(true/false)` y `parpadear(k)`. `sw.js` sube a 204. Probado en navegador sin pantalla (PC 1280×720 y celular 390×780, 3 y 2 estrellas, sin errores de JavaScript); NO con el dedo en celular real.
- **Pasa a la zona «Juegos» (terminado) y mapa afinado (23 nov 2026):** se quitó `deslizante` de `EN_DESARROLLO` (`juegos.js`) y `sw.js` sube a 203: desde ahora **el punto de portal por nivel sí suma al total de los jugadores**. En `compartido/mapa-niveles.js` (opción `unPais`): «▶ Continuar · nivel N» va **dentro del país, en su centro** (se recoloca al girar o cambiar el tamaño de la ventana; las flechas ◀ ▶, 🗂️ Niveles e Info siguen arriba); mientras llega `contornos-paises.js` no se dibuja nada (antes salía la gota de respaldo, que parece un círculo) y, si ese archivo no carga (p. ej. no está en `compartido/`), se avisa en la consola y se usa la gota. En `compartido/contornos-paises.js` se corrigió **Australia** (salía como un rectángulo; ahora usa el contorno de `geografia-mapa.js`). **Vaticano** (`VA`) sigue con la gota: Natural Earth 10m no lo trae. Probado en navegador sin pantalla (PC 1280×720 y celular 390×780; El Salvador, Chile, Vaticano y Estados Unidos); NO probado con el dedo en celular real. **Ojo:** quedan sin crear los niveles 2001 a 3900 (salen con 🚧), el boost «Eliminar un cuadro» y las monedas del plan siguen pendientes (ver «Pendiente»).
- **Botón del nombre del nivel = salir al mapa, y estrella que sube a la esquina (23 nov 2026):**
  - *Botón del nombre del nivel*: el botón verde de arriba («Nivel 20 · El Salvador») ahora se puede tocar. Abre una ventana «¿Salir?» (`crearMenuPausa` de `compartido/menu-pausa.js`) con **▶ Seguir jugando** (verde) y **🚪 Salir al mapa** (rojo, con el aviso «Se pierde lo avanzado en este tablero»). Mientras está abierta el cronómetro se detiene y los toques/flechas no mueven fichas; con «Seguir jugando» (o Esc, o tocar fuera) continúa donde iba. En Modo libre el botón dice «Salir a elegir tablero» y lleva a la pantalla del Modo libre. El código está en `juego-5deslizante.js` (`opcionesSalir`, `pausaSalir`); el estilo del botón (ya sin `pointer-events: none`) en `index-5deslizante.html`.
  - *Celebración*: ver la entrada «Celebración sin pausa y a la mitad» (la subida a la esquina ya no es una fase aparte).
  - Probado en Chromium (PC 1280×720 y celular simulado 390×780): ventana de salida, cronómetro detenido y reanudado, salir al mapa y celebración completa sin errores. NO con el dedo en celular real.
- **Niveles 2001 a 3900 (23 nov 2026):** `node 5deslizante/generar-niveles-deslizante.mjs --hasta 3900`. Ya están los 3 900 (del 3×3 al 30×30; el 12×12 aparece hacia el nivel 2000, el 16×16 en adelante solo en el último tramo). Los 2000 primeros salieron idénticos (se comprobó), no hay tableros repetidos y `verificar-niveles-deslizante.mjs` da los 3 900 por buenos (con solución). `niveles-5deslizante.js` pasa de ~234 KB a ~1,1 MB. `sw.js` sube a 208. Probado en Node y en Chromium (niveles grandes en PC y celular simulado); NO jugado con el dedo en celular real.
- **Sin 🔄 ni 🌙/☀️ flotantes**: se quitó el botón de reiniciar y el de madera clara/oscura (este se oculta con `data-madera-boton="oculto"`; `fondo-madera.js` exporta `alternarMadera()` y `maderaOscura()`). OJO: mientras no haya zona de pausa no hay forma de cambiar la madera desde el juego.
