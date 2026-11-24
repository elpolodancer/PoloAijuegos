# Estándares de todos los juegos del portal

Pegar en el README principal (o dejar como `ESTANDARES-juegos.md` en la raíz). La especificación de medidas y colores vive en `compartido/inmersivo.css`; aquí está lo que hay que respetar y por qué. Cada juego tiene su propio README con sus detalles.

Referencias: **2048** (capa «Comenzar», opciones dentro de ☰ Pausa y mapa con listas de 5 columnas: sección 7), **Conecta gominolas** (Modo libre, mapa, ☰ «Pausa/Atrás» y menú de pausa: secciones 1 y 7), **Slither** (juego a pantalla completa: Modo libre con las clases `.pant-menu`, fin «sobre el tablero» sin velo; secciones 6, 7 y 11), **Estacionamiento** (mapa, niveles, monedas) y **Rubik** (juego sin niveles). De **Puzle deslizante** se tomó la idea del botón azul oscuro del portal y el **inicio con mapa** (sección 13). El «velo de inicio» de las versiones anteriores de 7.0/7.1 se reemplazó por la capa «Comenzar» (ver el cambio de abajo).

**Cambio de estándar (21 nov 2026): el juego abre directo en el nivel y no hay pantalla de menú principal.** Al abrir se ve el juego ya cargado, tapado por una capa semitransparente con un solo botón verde **▶ Comenzar**. Las opciones (♾️ Modo libre, 📋 Niveles, 🔄 Reiniciar, 🚪 Menú principal) están en el menú del botón **☰ Pausa**. Esto reemplaza al velo con tres botones (♾️ · 🗂️ · ▶ Continuar) y a las columnas de botones del menú principal; ver secciones 7 y 9. Los juegos que todavía no se tocan (p. ej. Spider) siguen con el velo viejo hasta que se migren; Deslizante ya no usa el velo: tiene su propio inicio (sección 13). Referencia nueva: **2048** (Comenzar + ☰ Pausa con Modo libre y Niveles + mapa con listas de 5 columnas).

**Segundo estándar de inicio (23 nov 2026): «Inicio con mapa» (el de Puzle deslizante), sección 13.** Existen ahora DOS formas de abrir un juego: la capa «▶ Comenzar» (secciones 7 y 9, referencia 2048) y el **inicio con mapa** (pantalla con ♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes, y el mapa de un solo país como menú principal; referencia **Puzle deslizante**). Se usa el que se pida: cuando se diga «inicio con mapa» o «inicio estilo Deslizante» se aplica la sección 13 completa (con su revisión 13.11 en lugar de la 9) y, en ese juego, **manda la 13 sobre 1, 7 y 9 en lo que se contradigan** (los puntos donde difiere están en el recuadro 13.3). Sus estilos compartidos están al final de `compartido/inmersivo.css` (bloque «INICIO CON MAPA»).

## 1. Botones fijos (en TODOS los juegos)

| Botón | Esquina | Forma y color |
|---|---|---|
| **🎮 Portal de Juegos** (vuelve al portal, `href="../"`) | arriba-izquierda | **Alargado** (`b3d txt`), **azul oscuro** (`b-azuloscuro`: `#7d9cea → #3b63c4 → #1c3a82`). Siempre visible |
| **☰ Pausa / Atrás** | arriba-izquierda, justo debajo | **Alargado, del mismo ancho** que 🎮 Portal de Juegos, **azul cielo** (`b-cielo`: `#c4ecff → #4db8f0 → #1f72ab`). **Siempre visible**, también bajo la capa «Comenzar». Dice **«Pausa»** dentro de una partida (o bajo la capa «Comenzar») y **«Atrás»** en cualquier otra pantalla (sección 7.4) |
| **🌙 / ☀️** (madera clara / oscura) | abajo-izquierda | 40×40, oro. Lo crea `compartido/fondo-madera.js` |
| **⛶ / ✕** (pantalla completa) | abajo-derecha | 40×40, gris (el único gris fijo). Lo crea `compartido/pantalla-completa.js` |
| **👤 Iniciar sesión** | arriba-derecha | Alargado (`b3d txt`, alto 40), azul (`b-azul`). **Siempre** en esa esquina, lo más a la derecha de la fila `.hud-der` (sección 7) |

HTML del bloque de navegación (copiar tal cual):

```html
<nav class="nav-juego" aria-label="Navegación">
  <a class="b3d txt b-azuloscuro" href="../" title="Volver al portal de juegos"><span class="b-ico">🎮</span> Portal de Juegos</a>
  <button class="b3d txt b-cielo" id="btn-menu" type="button" title="Pausa"><span class="b-ico">☰</span> <span id="txt-menu">Pausa</span></button>
</nav>
```

- El azul oscuro es **un poco más claro** que el de Deslizante, sin llegar a ser azul claro. Se define una sola vez en `compartido/inmersivo.css` (`.b-azuloscuro`); los juegos no lo redefinen. Los dos botones toman el ancho del más largo (≈ 175 px) y la zona reservada de arriba-izquierda mide ≈ 190 × 92.
- **Azul cielo = el color de todo botón neutro** (`.b-cielo` en `compartido/inmersivo.css`): ☰ Pausa/Atrás, ℹ️ Info, las flechas «◀ México / ◀ Mundo» del mapa y las opciones sin elegir del Modo libre. **`b-gris` ya no se usa en menús**: queda solo para ⛶ y para botones desactivados (por ejemplo, un boost que no alcanza con las monedas).
- El ☰ es **un solo botón con dos funciones** (sección 7.4). Dentro de una partida (o bajo la capa «Comenzar») congela el juego y abre `compartido/menu-pausa.js`; fuera de ella («Niveles», «Modo libre», resultados) vuelve al juego con la capa «Comenzar».
- Zonas reservadas: el juego no pone nada interactivo en esas esquinas (medidas en `inmersivo.css`).

## 2. Fondo de madera (clara y oscura)

- `<html class="inmersivo">` y `<body class="inmersivo">`. El juego **no** pone fondo propio en `html` ni `body`.
- Madera **clara** por defecto; **oscura con luna** con el botón 🌙/☀️ (la elección se guarda en el dispositivo y vale para todos los juegos).
- En el `<head>`: `<script>try{if(localStorage.getItem("fondo_madera")==="oscura")document.documentElement.classList.add("oscura")}catch(e){}</script>` (evita el parpadeo de la madera clara).
- Al final del `<body>`: `<script type="module" src="../compartido/fondo-madera.js"></script>` y `pantalla-completa.js`.
- Los `<canvas>` van **transparentes** (`clearRect`, nunca `fillRect` de fondo) para que se vea la madera.
- Textos sueltos sobre la madera: `var(--txt-fondo)`, `var(--txt-fondo-suave)`, `var(--sombra-txt)`. Los paneles oscuros conservan su color.

## 3. Monedas

Casi todos los juegos tendrán monedas. El chip es siempre el mismo: **dorado** (`chip chip-monedas`) con la moneda dibujada en CSS (`<span class="moneda"></span>`), ya que el emoji 🪙 no se ve en sistemas viejos. Los estilos están en `compartido/inmersivo.css`.

```html
<span class="chip chip-monedas"><span class="moneda"></span>1 250</span>
```

Va en una zona libre: arriba-derecha con los demás chips (`.hud-der`, como en Gominolas) o, como en Estacionamiento, en una fila de información debajo de ☰. Las monedas se gastan, así que su progreso se sincroniza con una regla propia (no con `unirMaximos`); Estacionamiento lo resuelve con `unirCartera`.

## 4. Dos tipos de juego

### A) Juegos por niveles (Estacionamiento y los que se parezcan)

El menú de niveles **siempre es un mapa**:

1. **México de cerca**, sobre fondo blanco, con la silueta del país. Cada estado terminado (**32 estados**, 100 niveles en Estacionamiento) hace **subir agua azul clara** dentro de la silueta, con oleaje (quieta con `prefers-reduced-motion`).
2. Al terminar los 32 estados aparece el **mapa del mundo** (**194 países**), con el mismo efecto de agua por país. Hasta entonces el jugador no sabe que existe. **El mundo viene siempre armado desde el principio** (con `crearEtapas`: 32 estados + 194 países, 100 niveles cada uno), pero **oculto**: no aparece ni el botón 🌍 ni la lista de países. Al terminar el estado 32 se revela el mundo y **los países se abren de uno en uno**, en el orden de `PAISES_BASE` (el país 1 al terminar los 3 200 niveles de México; cada país siguiente al terminar los 100 niveles del anterior). Los países sin desbloquear no se listan.
3. Cada estado o país es un punto: al tocarlo se ven sus niveles. Cuántos niveles tiene cada etapa lo decide cada juego (en Estacionamiento son 100; en Supermercado y Zuma, 10).
4. Los niveles se abren en orden; se guarda «nivel más alto abierto» y «más alto terminado».

**Inicio.** Lo describe la sección 7: el juego abre cargado en el nivel donde va el jugador, con la capa **▶ Comenzar**, y Modo libre y Niveles están en el menú de ☰ Pausa. El mapa ya no es la pantalla principal: se abre desde «📋 Niveles».

- **Juego libre / infinito:** tableros al azar sin fin, sin mapa ni niveles. **No da monedas ni puntos** (como el modo libre de Deslizante) para que no se pueda repetir sin límite; guarda mejor marca y cantidad resuelta.

Código reutilizable (ya está en `compartido/`, anotado en `ARCHIVOS` de `sw.js`):

| Archivo | Qué es |
|---|---|
| `compartido/mapa-niveles.js` | El mapa con agua. `montarMapa({ prefijo, etapas, progreso, jugarNivel, infoNivel, leyenda, botonesExtra, alInfo, avisoPrincipal, alCambiarVista })`. Sin Firebase ni red |
| `compartido/etapas-mapa.js` | Orden de los 32 estados y 194 países y cuentas de progreso: `crearEtapas({ porEtapa, primeros })` |
| `compartido/geografia-mapa.js` | Contornos de México, continentes y lagos |
| `compartido/dificultad-niveles.js` | Reparto de dificultad de los niveles (sección 8): `dificultadDeNivel(n, total)` → `"facil"`, `"normal"` o `"dificil"` |

El juego solo indica cuántos niveles tiene cada etapa (`porEtapa`), el progreso `{ max, hecho }` y qué hace `jugarNivel(n)`. Según `sw.js`, Estacionamiento todavía lista sus propias copias en `estacionamiento/` (`mapa-estacionamiento.js`, etc.).

### A-bis) Mapa solo de países (estándar nuevo, 21 nov 2026)

Es el estándar para los juegos por niveles que se creen o se rehagan desde ahora. **Sustituye** al mapa de México con estados de la sección A **en cada juego que lo adopte**; los juegos que ya están terminados con el mapa de 32 estados + 194 países siguen como están hasta que se pasen al estándar nuevo (no se cambia la numeración de niveles de un juego ya publicado).

1. **Solo países, sin estados de México:** **195 países** (los 194 de `PAISES_BASE` + México) × **20 niveles por país = 3 900 niveles**.
2. **Orden fijo** (`PAISES_MUNDO` en `compartido/etapas-mapa.js`): el **1.º es México** (niveles 1 a 20, donde empieza el juego); del 2.º al 20.º el resto de Latinoamérica; del 21.º al 24.º Belice, Jamaica, Guyana y Surinam; el **25.º es Estados Unidos** (niveles 481 a 500); del 26.º al 194.º, al azar con semilla fija (20261121); el **último (195.º) es China**. No se cambia después de publicar un juego.
3. **Cómo se pide:** `crearEtapas({ porEtapa: 20, soloPaises: true })` y `montarMapa({ etapas, … })` como siempre. Con `soloPaises` el mapa **abre directo en el mundo** (con agua que sube un escalón por país terminado), que lleva «▶ Continuar», los botones extra (♾️ Modo libre) e «ℹ️ Info»; no hay México de cerca ni «◀ México». Los países se abren **de uno en uno** (el siguiente al terminar los 20 niveles del anterior); los bloqueados no se listan. El botón de atrás desde un país es «◀ Mundo». Sin la opción `soloPaises` todo funciona como antes.
4. **Progreso:** «nivel más alto terminado» como **un solo número** (los niveles se abren en orden, así que todos los anteriores están pasados), no una lista con un valor por nivel. Así el progreso cabe en la nube: con 3 900 niveles y un récord por nivel son ≈ 120 000 caracteres de los 300 000 que permite `firestore-unificado.rules` (un documento privado por jugador y por juego en `progreso/{uid}/juegos/{juego}`).
5. **Dificultad:** sigue la sección 8 (el tramo es de 100 niveles; con 3 900 son 39 tramos, de 50/40/10 % a 25/40/35 %). Los primeros niveles de cada juego pueden ser todos fáciles si el juego lo decide (Deslizante: los 20 de México).

### B) Juegos sin niveles (Rubik)

**No llevan mapa ni niveles.** Su inicio sigue la sección 7 (capa «Comenzar» sobre el juego cargado) pero el menú de ☰ Pausa lleva solo «♾️ Modo libre» (y «ℹ️ Info» si la necesitan): no tienen Niveles. Lo mínimo es: el selector de lo que se juega (en Rubik, el modelo de cubo) y, dentro de la partida, el botón de revolver. Todo sobre el fondo de madera clara u oscura y con los botones fijos de la sección 1. Detalle en `rubik/README-rubik.md`.

## 5. Para registrar un juego nuevo o cambiado
Anotarlo en `juegos.js`, en `JUEGOS` de `sw.js`, subir `VERSION`, y agregar su fila y nota «Estado» al README principal. Para **pasarlo a la zona «Juegos» (terminado)** ver la sección 11.

## 6. Fin de nivel: «Siguiente nivel ▶» sobre el tablero

En todos los juegos con niveles, al terminar un nivel el botón **Siguiente nivel ▶** aparece **encima del cuadro del tablero**, centrado en él. No va abajo, ni arriba, ni en otra parte de la pantalla, ni en una ventana que tape todo con un velo oscuro.

- Es el **primer botón** de la ventana y el más grande (`b3d txt grande b-verde`). Debajo van, más chicos y en una fila, las demás opciones (Repetir nivel, Mapa…). Arriba, el título y el resultado dentro de un recuadro oscuro (`.sobre-texto`) para que se lea sobre cualquier tablero.
- Estilos en `compartido/inmersivo.css` (clase `.sobre-tablero`, con la estructura de ejemplo en el comentario). La ventana **no bloquea** el tablero (`pointer-events: none`; solo el texto y los botones reciben toques).
- El juego pone la ventana encima del tablero asignando `left`, `top`, `width` y `height` (px) = rectángulo del tablero en pantalla, recortado a la ventana; si el tablero casi no se ve (muy acercado o muy movido), toda la ventana. Si el jugador mueve o acerca la vista con la ventana abierta, el juego la recoloca. Ejemplo: `colocarVictoria()` en `estacionamiento/juego-estacionamiento.js`.
- En el último nivel del juego el botón «Siguiente» se oculta.
- **Juegos donde el tablero es toda la ventana** (Slither, Agario…): no se asignan `left/top/width/height`; la ventana cubre la pantalla y centra su contenido (sigue sin bloquear los toques). En el botón principal de la ventana, si no hay «Siguiente» (derrota, Modo libre), el primero y más grande es «Reintentar» / «Jugar otra vez»; las demás opciones (Mapa de niveles, Cambiar mapa y bots) van debajo en `.sobre-fila` y en `b-cielo`.

## 7. Inicio del juego, Modo libre, mapa, ☰ y pausa (estándar de TODOS los juegos)

Referencia: **2048** (`2048/index-2048.html` y `juego-2048.js`) para la capa «Comenzar», las opciones dentro de ☰ Pausa y el mapa con listas de 5 columnas; **Conecta gominolas** para el Modo libre y la pausa con niveles. La especificación de medidas y colores está en `compartido/inmersivo.css` (clase `.capa-comenzar`).

### 7.0 Al abrir un juego: el juego ya está cargado, con la capa «Comenzar» (regla general)

**Nunca se abre en una pantalla de menú.** Al abrir un juego se ve **el juego ya cargado** y, encima, una **capa semitransparente** (`.capa-comenzar`: negro al 38 % con 2 px de difuminado) con **un solo botón verde centrado: «▶ Comenzar»** (`b3d txt grande b-verde`). La capa deja ver el juego pero no deja jugar hasta tocar el botón. **No lleva título, resumen ni frases de instrucciones.** Qué se carga detrás depende del juego:

| Tipo de juego | Qué se ve detrás de la capa | Ejemplos |
|---|---|---|
| **A) Por niveles, jugable de inmediato** | El **primer nivel** (primera vez) o **el nivel donde va el jugador** (lo del dispositivo y, con sesión, lo que traiga su cuenta de Google). | Solitario, Gominolas, 2048 (hoy su última partida)… |
| **B) Tiempo real** | El nivel cargado con el mundo en marcha (los bots se mueven) pero **sin jugador**: aparece al tocar «Comenzar». | Slither, Agario… |
| **C) Varias partidas guardadas** | En lugar del juego, la **pantalla de partidas guardadas** (elegir, continuar o crear una). | Supervivencia y similares |

Reglas comunes:
- **Mientras está la capa:** el juego no responde (ni toques ni teclado), el cronómetro y los movimientos no corren y no se pierde nada. **🎮 Portal de Juegos y ☰ Pausa quedan visibles y usables** (la capa va por debajo de ellos).
- **Al tocar «Comenzar»:** la capa desaparece y el juego queda jugable. Si el juego reparte al azar, puede repartir de nuevo en ese momento (para que suenen sus avisos y salgan sus letreros); el reloj empieza ahí.
- **Cuándo sale:** solo al **abrir el juego** y al volver desde «Menú principal», «Atrás» de Niveles o «Atrás» de Modo libre. Entrar a un nivel desde Niveles, Reiniciar o los botones de fin de nivel empieza **directo, sin capa**.
- **Con sesión:** al llegar el progreso de la nube (`alCambiar` de `conectar()`), si la capa sigue puesta se recarga el nivel mostrado con el de la cuenta. Una vez tocado «Comenzar» no se le quita el tablero al jugador.
- Si el juego aún no tiene niveles, la capa sale igual sobre lo que haya (en 2048, el modo libre).

Código (patrón de `juego-2048.js`):

```html
<div id="comenzar" class="capa-comenzar" hidden>
  <button class="b3d txt grande b-verde" id="btn-comenzar" type="button"><span class="b-ico">▶</span> Comenzar</button>
</div>
```
```js
let esperando = true;   // al arrancar: cargar el juego, mostrar la capa y bloquear las entradas mientras sea true
$("btn-comenzar").addEventListener("click", () => { esperando = false; $("comenzar").hidden = true; /* y arrancar reloj / jugador */ });
```

### 7.1 No hay pantalla de menú principal

Las opciones que antes estaban en el menú principal (♾️ Modo libre, 📋 Niveles, ℹ️ Info, Continuar) **ya no son una pantalla ni un velo con botones**: viven en el **menú de ☰ Pausa** (7.5). «Continuar» es el propio «▶ Comenzar». Lo que ya no se usa en juegos migrados: la columna de botones `.menu-columna` como pantalla de inicio, el velo de tres botones (`.velo-inicio`) y la barra `.barra-juego`.

- **🚪 Menú principal** (último botón de la pausa) **no abre otra pantalla**: vuelve al juego cargado con la capa «Comenzar».
- **👤 Iniciar sesión**: botón alargado azul (`b3d txt b-azul`) **siempre en la esquina superior derecha**, con las funciones de `compartido/jugador.js` (`alCambiarSesion`, `entrar`, `salir`) cargado con `import()` dinámico y `try/catch`, para que el juego funcione sin internet. Los chips (monedas, sonido) van a su izquierda: el de sesión es siempre el último de la fila. Como ya no hay menú principal donde mostrarlo, el juego decide dónde cabe (en 2048 aún no lo tiene).
- **ℹ️ Info** (si el juego la necesita): opción `b-cielo` dentro del menú de pausa; abre la ventana «Cómo se juega» (`.pausa-*`) con «Entendido».

**Estado de migración (21 nov 2026).** 2048 ya cumple todo esto. **Solitario, Conecta gominolas y Slither** ya abren con «Comenzar», pero su «Menú principal» todavía abre la pantalla vieja (columna con Modo libre · Continuar · Niveles · Info) y su pausa aún no trae «♾️ Modo libre»: pendiente alinearlos con 7.5. Spider y los demás siguen con el velo viejo hasta que se toquen; Deslizante usa el inicio con mapa (sección 13).

### 7.2 Modo libre (pantalla propia, no desplegable)

- Se entra desde **☰ Pausa → ♾️ Modo libre**. **Es una pantalla de opciones y nada más: nunca muestra niveles, mapa ni listas de niveles** (los niveles solo se ven en 📋 Niveles). Título «♾️ Modo libre» y grupos con su rótulo, **en este orden: primero «Dificultad», debajo «Tablero» (o la medida/opción principal del juego) y después las demás opciones**. Cada grupo es una **fila de botones** `b3d txt` de 44 px: **el elegido es `b-oro on`** y los demás **`b-cielo`**. En 2048 el grupo es «las medidas del tablero» (4×4 a 8×8, cuadrados) y elegir una medida entra directo a jugar.
- Debajo de los grupos: una nota que explica qué cambia la dificultad, el «🏆 Récord» de la combinación elegida y, al final, **«▶ Jugar»** (`b3d txt grande b-verde`) cuando el juego tiene más de una opción que confirmar.
- Se recuerda la última selección (clave de `localStorage` terminada en `_v1`, para que entre en la copia de `almacen.js`). Cada juego decide qué grupos tiene y qué significa cada dificultad (lo explica en su README).
- **Dificultad: 5 opciones estándar** (grupo «Dificultad», siempre **el primero**, rótulo «Dificultad»). Son botones **solo con emoji** (`b3d txt`, el elegido `b-oro on`, los demás `b-cielo`; el nombre va en `title` y `aria-label`) y debajo, una línea con el emoji, el nombre y qué cambia. De la más fácil a la más difícil:

| # | Emoji | Nombre | Rostro |
|---|---|---|---|
| 1 | 😁 | Muy fácil | feliz (verde) |
| 2 | 😬 | Fácil | serio con dientes |
| 3 | 😐 | Normal | serio |
| 4 | 😡 | Difícil | enojado |
| 5 | 😈 | Demoníaco | endemoniado (el más difícil) |

  Los juegos que hoy tienen otro número de dificultades (Gominolas: 🙂 😐 😈) se alinean a estas 5 cuando se vuelvan a tocar. Si un juego conserva récords de antes, deja la clave vieja en la dificultad que ya equivalía (en Deslizante, «Demoníaco» = tablero totalmente al azar).
- El récord se guarda **por combinación** (dificultad + tablero); el «🏆 Récord» mostrado es el de lo elegido.
- Sin monedas ni **puntos de perfil** (como en la sección 4A) y sin barra de boosts: el Modo libre solo guarda el récord. Esto cuenta desde que el juego pasa a la zona «Juegos» (sección 11), porque desde ahí sus puntos suman al total de todos. Si el juego quiere apartarse, lo deja en una constante (`PUNTOS_LIBRE`, en Slither) y lo explica en su README. Al terminar una ronda, el botón del resultado dice «⚙️ Cambiar tablero» y vuelve a esta pantalla.
- El ☰ dice «Atrás» y vuelve al juego con la capa «Comenzar».

### 7.3 Niveles y mapa

- Se entra desde **☰ Pausa → 📋 Niveles**. Abre `compartido/mapa-niveles.js` directo en la lista de niveles de la etapa actual (`mapa.abrir(nivelActual)`). Tras pasar el último nivel de una etapa, el juego vuelve al mapa con el agua subiendo (`mapa.abrir(n, true)`).
- **Listas de niveles en 5 columnas, filas de 5 en 5.** El juego lo pide con `montarMapa({ …, columnas: 5 })` (opción nueva; sin ella el mapa usa las columnas que quepan en la pantalla, como en los juegos ya hechos). Los juegos nuevos usan `columnas: 5`.
- Con los 22 600 niveles: **32 estados × 100 + 194 países × 100**, el mundo armado pero oculto hasta terminar los 32 estados (secciones 4A y 9). Un juego sin niveles creados deja el mapa funcionando: sus botones muestran «🚧» (`infoNivel`) y al tocar uno se avisa «🚧 Los niveles todavía no están creados».
- La vista principal del mapa (México) lleva «▶ Continuar · nivel N», «ℹ️ Info» (`alInfo`, si el juego la tiene) y, solo cuando se desbloquea, «🌍 Mundo». **No lleva «Modo libre»**: al modo libre solo se entra desde el menú de ☰ Pausa.
- **Botón de atrás dentro del mapa:** «◀ México» (desde un estado o el mundo) y «◀ Mundo» (desde un país), `b-cielo`; suben un paso dentro del mapa y Esc hace lo mismo. El ☰ «Atrás» sale del mapa **siempre** al juego con la capa «Comenzar» (aunque se esté dentro de un estado o país).
- Cada juego dice cómo se ve cada nivel con `infoNivel` (por ejemplo ★★☆ y 🎁) y puede avisar de los cambios de vista con `alCambiarVista`.

### 7.4 El botón ☰: «Pausa» dentro de la partida, «Atrás» fuera

Es el mismo botón, **siempre visible**, y se rotula según la pantalla:

| Pantalla | ☰ | Al tocarlo |
|---|---|---|
| Juego cargado con la capa «Comenzar» | **☰ Pausa** | Abre el menú de pausa (7.5); el juego no corre |
| Partida en curso | **☰ Pausa** | Congela el juego y abre el menú de pausa (7.5) |
| Niveles / mapa, Modo libre, resultado de un nivel o ronda | **◀ Atrás** | Vuelve al juego con la capa «Comenzar» |

Patrón de código (de `juego-2048.js`; `puedeAbrir` **debe** dar `false` en el mapa y en Modo libre, para que el ☰ no abra la pausa ahí y la tecla Esc del mapa no choque con la de la pausa):

```js
function mostrar(p) {                        // p = «juego» | «tamanos» (Modo libre) | «niveles» (mapa)
  pantalla = p;
  if (p !== "juego") esperando = false;
  $("comenzar").hidden = !esperando;
  // … mostrar/ocultar cada pantalla; mapa.abrir(...) o mapa.cerrar() …
  $("txt-menu").textContent = $("btn-menu").title = p === "juego" ? "Pausa" : "Atrás";
}
function volverAlInicio() { esperando = true; mostrar("juego"); }
btnMenu.addEventListener("click", () => { if (pantalla === "juego") pausa.abrir(); else volverAlInicio(); });
// crearMenuPausa({ puedeAbrir: () => pantalla === "juego" && …, alSalir: volverAlInicio, … })
```

### 7.5 Menú de pausa

Lo crea `compartido/menu-pausa.js` (`extras`, `textoSalir`, `ayudaSalir`, `alSalir`). En este orden:

1. **▶ Continuar** (`b-verde`, siempre primero).
2. **♾️ Modo libre** (`b-morado`; ayuda: «Eliges las medidas del tablero. Tu partida queda guardada.») y **📋 Niveles** (`b-azul`; ayuda: «Lista de niveles. Tu partida queda guardada.»). Antes de abrirlos el juego guarda lo que lleva.
3. Si se está jugando un nivel: **🔄 Reiniciar nivel** («Vuelves a empezar este nivel con tus puntos de antes») y, en «Niveles», el aviso «Se pierde lo avanzado en este nivel» en lugar de «Tu partida queda guardada».
4. **ℹ️ Info** (`b-cielo`), si el juego tiene reglas que explicar.
5. **🚪 Menú principal** (`b-rojo`, siempre al final; es `textoSalir`): vuelve al juego con la capa «Comenzar» (7.0). Su ayuda avisa de lo que se pierde («Se pierde lo avanzado en este nivel.» o «Tu partida queda guardada en este dispositivo.»).

En una partida de **Modo libre** no hay opciones extra (reiniciar sería repetir la ronda sin costo): solo Continuar y **«Salir a elegir tablero»** (ayuda: «La partida termina; se guarda cuántas rondas superaste.»), que vuelve a la pantalla 7.2.

Los juegos ya hechos se pasan a este estándar cuando se vuelvan a tocar.

## 8. Dificultad de los niveles del mapa (reparto estándar)

En los juegos por niveles (sección 4A), la dificultad de los niveles **sube poco a poco** a lo largo del mapa, con este reparto. Aplica a **la mayoría de los juegos**; un juego solo se aparta si su README lo explica.

| Tramo de 100 niveles | Fáciles | Normales | Difíciles |
|---|---|---|---|
| **Primeros 100** (niveles 1-100) | **50 %** | **40 %** | **10 %** |
| Mitad del mapa (≈ nivel 11 300 de 22 600) | ≈ 38 % | 40 % | ≈ 22 % |
| **Últimos 100** (niveles 22 501-22 600) | **25 %** | **40 %** | **35 %** |

- **Progresivo:** entre un extremo y otro el cambio es lineal, tramo por tramo (un tramo = 100 niveles seguidos). Los fáciles solo bajan, los difíciles solo suben y los normales se quedan en 40 %. Nunca hay saltos bruscos.
- **Revueltos pero iguales para todos:** dentro de cada tramo los fáciles, normales y difíciles van mezclados (no todos los difíciles al final), con una semilla fija: todos los jugadores ven el mismo nivel con la misma dificultad.
- **Código reutilizable:** `compartido/dificultad-niveles.js` (anotado en `ARCHIVOS` de `sw.js`). `dificultadDeNivel(n, ETAPAS.total)` devuelve la dificultad del nivel `n`; `repartoDeTramo(k, total)` da cuántos de cada tipo tiene el tramo `k`. Funciona con cualquier total (22 600, 3 200, 2 260…) y con cualquier `porEtapa`: el tramo siempre es de 100 niveles, no de una etapa.
- **Qué significa cada nivel de dificultad lo decide el juego** (tamaño del tablero, tiempo, enemigos, movimientos…) y lo explica en su README. Es independiente de las dificultades del Modo libre (sección 7.2): aquí son 3 tipos de nivel dentro del mapa.
- **No cambiar después de publicar:** si ya hay jugadores con progreso, cambiar los porcentajes o la semilla cambia la dificultad de niveles que ya jugaron.
- Totales de referencia con 22 600 niveles: ≈ 37.5 % fáciles (8 475), 40 % normales (9 040) y ≈ 22.5 % difíciles (5 085).

## 9. Al pedir «crear el menú principal» / «poner el inicio estándar» en un juego (revisión obligatoria)

> Esta lista es para el inicio con **capa «Comenzar»**. Si se pide el **inicio con mapa** («estilo Deslizante»), la revisión es la **13.11**.

Cuando se pida crear el menú principal (hoy: el inicio con «Comenzar» y las opciones en ☰ Pausa) en un juego que no lo tiene o que está desactualizado, **no basta con poner los botones**: se revisa y corrige todo lo siguiente, en este orden, contra `compartido/inmersivo.css` y la sección 7 (si algo no coincide, manda el CSS):

1. **Fondo de madera clara y oscura.** `<html class="inmersivo">` y `<body class="inmersivo">`; el script del `<head>` contra el parpadeo; `compartido/fondo-madera.js` al final del `<body>`; el botón **🌙 / ☀️** abajo a la izquierda; los `<canvas>` transparentes (`clearRect`); ningún fondo propio en `html`/`body`.
2. **Botón azul oscuro «🎮 Portal de Juegos»** (`b3d txt b-azuloscuro`, `href="../"`), arriba a la izquierda. Se eliminan las versiones viejas: «🎮 Juegos», flechas «←», botones de volver propios.
3. **Botón azul cielo «☰ Pausa / Atrás»** (`b3d txt b-cielo`, con el icono de las tres rayitas y un `<span id="txt-menu">`), justo debajo del anterior y del mismo ancho. Siempre visible (también bajo la capa «Comenzar»); dice «Pausa» en partida y «Atrás» en el resto (7.4).
4. **Inicio del juego y capa «Comenzar»** (7.0 y 7.1): el juego se abre ya cargado (nivel actual de la cuenta, o partidas guardadas, según el tipo) con la capa semitransparente y su único botón verde **▶ Comenzar**, centrado. Sin pantalla de menú, sin velo de tres botones, sin Mapa ni Salir. Mientras la capa está puesta el juego no responde y 🎮 / ☰ siguen usables.
5. **Botón «👤 Iniciar sesión»** siempre en la **esquina superior derecha** (7.1).
6. **Pantalla de Modo libre** (7.2), que se abre desde ☰ Pausa: filas de opciones (elegido `b-oro on`, resto `b-cielo`), nota, récord y «▶ Jugar».
7. **Mapa con México y mundo armados** (listas de niveles de 5 columnas con `columnas: 5`). El juego usa `crearEtapas` + `montarMapa` con las dos zonas completas desde el primer día: 32 estados y 194 países, cada uno con su cantidad de niveles. Se comprueba que (a) el mundo y el botón 🌍 **no se ven** hasta terminar todos los niveles de México, (b) después aparece **un país a la vez**, en el orden de `PAISES_BASE`, y los no desbloqueados no se listan, y (c) el progreso guarda «más alto abierto» y «más alto terminado». «Niveles» (en ☰ Pausa) abre el mapa en la etapa actual y «◀ México / ◀ Mundo» van en `b-cielo`. Esto se deja funcionando aunque el juego todavía no tenga niveles creados.
8. **Pausa** (7.5): `crearMenuPausa` con Continuar · ♾️ Modo libre · 📋 Niveles · Reiniciar nivel · Menú principal (y la versión corta del Modo libre), `puedeAbrir` en `false` fuera de una partida. «Menú principal» vuelve a la capa «Comenzar».
9. **Lo demás de los estándares**: botón ⛶ de pantalla completa abajo a la derecha; ningún control del juego dentro de las zonas reservadas de las esquinas (medidas en `inmersivo.css`); y **ningún `b-gris` en menús** (se cambia por `b-cielo`).

Al migrar un juego que ya tenía menú propio, **se conserva su lógica y su progreso** (claves de `localStorage`, `conectar()`, puntos pendientes): solo cambia la pantalla de inicio. Al terminar, se anota en el README del juego qué estaba desactualizado y qué se cambió, y se sube `VERSION` en `sw.js`.

## 10. Orden de trabajo: primero los estándares, después los niveles

**No se empiezan a generar los niveles de un juego hasta que estén completos sus estándares.** Si se generan antes, al cambiar una mecánica hay que borrarlos y rehacerlos. El orden es:

1. **Estándares del juego completos**: la revisión de la sección 9 (madera, 🎮 Portal de Juegos, ☰ Pausa/Atrás, inicio con «Comenzar» y opciones en ☰ Pausa de la sección 7, 👤 Iniciar sesión, pantalla de Modo libre, mapa de México y mundo armado con los países ocultos, ⛶ y pausa conectada), más monedas/estrellas si el juego las usa (sección 3), y su registro (sección 5).
2. **Mecánicas, metas y temas definidos como constantes** al inicio del archivo de lógica del juego, antes de cualquier generación: qué variantes existen, a partir de qué avance del mapa (`p`) aparecen y cómo se combinan por etapa. Se anotan en el README del juego.
3. **El bot de comprobación soporta todo lo anterior** (cada mecánica y cada meta) y pasa una muestra de niveles de todo el mapa.
4. **Solo entonces** se generan los niveles del mapa (con el estándar nuevo de la sección 4A-bis: 3 900 = 20 por país × 195 países; con el mapa anterior: 22 600 = 100 por estado y por país) con la dificultad de la sección 8.

Mientras un juego está en `EN_DESARROLLO` y sin publicar, sus niveles se pueden borrar y regenerar. Después de publicar **no se cambian** (cambiaría niveles que ya se pasaron).

## 11. Pasar un juego a la zona «Juegos» (terminado)

Mientras un juego está en `EN_DESARROLLO` (`juegos.js`) sus puntos **nunca suman al total** (`jugador.js`: solo guardan la mejor marca y, si juega el administrador, van a `totalPrueba`). Al pasarlo a «Juegos» **empiezan a contar para todos**, así que antes de pasarlo se revisa esta lista, en este orden:

1. **Estándares completos** (secciones 1, 2, 7 y 9; o 1, 2 y 13 si el juego usa el inicio con mapa): 🎮 Portal de Juegos, ☰ Pausa/Atrás en `b-cielo`, madera, ⛶, juego cargado al abrir con la capa **▶ Comenzar** (♾️ Modo libre y 📋 Niveles dentro de ☰ Pausa), 👤 Iniciar sesión, pantalla de Modo libre, mapa armado con el mundo oculto, pausa estándar y fin de nivel sobre el tablero (6). Ningún `b-gris` en menús ni `velo` oscuro propio: las pantallas de menú usan `.pant-menu` y la ayuda («Cómo se juega») la ventana `.pausa-*` con «Entendido».
2. **Puntos revisados.** El Modo libre no da puntos de perfil (7.2). Cada nivel da **1 punto al perfil, solo la primera vez** que se pasa (sección 12; `encolarNivel()` de `compartido/cola-puntos.js`), con tope por envío (`MAX_PUNTOS_POR_ENVIO` = 1000 en `jugador.js` y `cola-puntos.js`, igual que las reglas de Firestore). Se comprueba que no hay forma de repetir algo sin límite y que sume.
3. **Niveles completos y comprobados:** los 22 600 (o los que el juego declare) generados **después** de los estándares (sección 10), con su verificador en consola (`verificar-<juego>.mjs`, «Todo cumple»). Si el reparto de dificultad se aparta de la sección 8, el README del juego lo explica (Slither: 50/40/10 → 25/35/40).
4. **Progreso local primero** con `conectar()` y puntos pendientes con `encolarPuntos()`; `jugador.js` y `progreso.js` se cargan con `import()` y `try/catch` para que el juego abra sin internet.
5. **Probado:** flujo completo (menú → Modo libre → partida → pausa → salir; Niveles → mapa → nivel → ganar/perder → Mapa/Siguiente; recargar con progreso), en escritorio **y en celular real** (las pruebas con navegador sin pantalla no sustituyen tocar con el dedo).
6. **Registro:** quitar el id de `EN_DESARROLLO` en `juegos.js`; comprobar que su carpeta y archivos están en `JUEGOS` de `sw.js` (y que los de solo consola **no**); subir `VERSION` con una línea de «Última versión»; fila de «Mapa de archivos» y nota «Estado» en el README principal (con la fecha y qué falta, p. ej. sonido o imagen de tarjeta).
7. **Imagen de tarjeta** (`imagenes/<juego>.webp`, anotada en `ARCHIVOS` de `sw.js` y en el campo `imagen` de `juegos.js`): recomendada pero **no obligatoria**; sin ella el portal muestra el icono y el nombre. Si falta, se deja como pendiente en el README.

Pasar un juego a terminado **no cambia sus niveles** (sección 10): después de publicar ya no se tocan.

## 12. Recompensas: el punto del portal es 1 por nivel; lo demás es de cada juego (regla del 21 nov 2026)

Hay **tres** cosas distintas y no se mezclan:

| Qué | Dónde se ve | Cuánto | Quién lo decide |
|---|---|---|---|
| **Puntos del portal** (`perfiles/{uid}.total`, los que se ven fuera, en la pantalla con todos los juegos) | Portal | **Exactamente 1** por cada nivel pasado **por primera vez**, **en cualquier juego** | Estándar (aquí) |
| **Monedas** | Chip dorado del juego | Las fija cada juego (Deslizante: de 15 a 80 por nivel, según el tablero; el resto de los juegos, de 15 a 45) | El juego, en su README |
| **Puntos del juego** (marcador de dentro del juego) | Dentro del juego | Los fija cada juego (Deslizante: de 80 a 250 por partida ganada, según el tablero) | El juego, en su README |

- **Cómo se aplica:** al pasar un nivel por primera vez el juego llama `encolarNivel("<id>")` (`compartido/cola-puntos.js`; vale `PUNTOS_PORTAL_POR_NIVEL` = 1). **No** se llama a `encolarPuntos(id, N)` con otros valores para premiar niveles.
- **Una sola vez por nivel.** Repetir un nivel no da punto de portal. El Modo libre **nunca** da puntos al portal (7.2).
- Las monedas y los puntos del juego **no** suben el total del portal.
- Juegos que premian por **partida** y no por nivel (Slither, Agario…) siguen con su propia regla hasta que se revisen; si tienen niveles, sus niveles dan 1 punto como todos.
- **Juegos ya hechos:** pasan a esta regla cuando se vuelvan a tocar. Hasta entonces pueden dar otros valores por nivel (revisarlo en la lista de la sección 11 antes de publicar).
- Al cambiar de regla en un juego que ya tenía puntos, el total de los jugadores no baja solo (las reglas de Firestore impiden bajarlo desde el navegador); el reinicio se hace con `herramientas/reiniciar-puntos.mjs`.

## 13. Inicio con mapa (estándar «estilo Deslizante», 23 nov 2026)

Referencia: **Puzle deslizante** (`5deslizante/index-5deslizante.html`, `juego-5deslizante.js`). Se aplica **cuando se pide** («pon el inicio con mapa», «inicio estilo Deslizante») a juegos **por niveles con el mapa solo de países** (sección A-bis). Estilos compartidos: bloque «INICIO CON MAPA» al final de `compartido/inmersivo.css`. El mapa lo dibuja `compartido/mapa-niveles.js` con `unPais: true`.

### 13.1 Flujo de pantallas

```
Abrir el juego (o F5)
  └─ Pantalla de inicio  (se ve UNA sola vez; nada vuelve a ella)
        ├─ ▶ Jugar     → el nivel que toca (si no hay ninguno pasado: abre el mapa en el nivel 1)
        ├─ ♾️ Modo libre → pantalla de Modo libre (7.2)  → partida libre
        ├─ 🗺️ Mapa      → MAPA (menú principal)
        └─ ⚙️ Ajustes    → ventana de Ajustes (13.8)

MAPA = menú principal del juego (vista del país donde va el jugador)
  ├─ ▶ Continuar · Nivel N   (en el centro del país)  → nivel
  ├─ ♾️ Modo libre            (botón extra del mapa)   → Modo libre
  ├─ 🗺️ Mapa                  → el mundo con solo los países abiertos → tocar un país → sus 20 niveles
  └─ 🗂️ Niveles               → los 20 niveles del país
Niveles → partida → ganar → celebración de estrellas (13.5) → mapa con el agua subiendo
```

- **«inicio» siempre significa «abrir el mapa»**: el ☰, «Salir al mapa» y los botones de fin de nivel llevan al mapa, nunca a la pantalla de inicio.
- No hay capa «Comenzar» ni menú principal aparte: **el mapa es el menú principal**.

### 13.2 Pantalla de inicio

Va sobre la madera, sin velo y sin título (`<div class="pant-menu" id="pantalla-inicio">` con una columna `.ini-menu` dentro). De arriba abajo, siempre en este orden y con estos tamaños:

| # | Botón | Clase de color | Alto | Letra |
|---|---|---|---|---|
| 1 | **♾️ Modo libre** | `b-morado` | 56 | 20 |
| 2 | **▶ Jugar** | `b-verde` | **112** (el doble) | 30 |
| 3 | **🗺️ Mapa** | `b-azul` | 56 | 20 |
| 4 | **⚙️ Ajustes** | `b-cielo` | 44 | 16 |

- Columna de `min(300px, 86vw)`, separación de 12 px, botones `b3d txt` de ancho completo y esquinas de 18 px, icono a la izquierda del texto.
- En celular horizontal bajo (`max-height: 560px`): 44 · 88 · 44 · 40 px y letras de 17 · 26 · 17 · 15 px.
- **Jugar** abre el nivel que toca; mientras no se haya pasado ninguno, abre el mapa en el nivel 1. En el centro del país del mapa, ese mismo botón dice «▶ Jugar» hasta pasar el primer nivel y «▶ Continuar» después (`etiquetaContinuar`).
- **Sin ☰ en esta pantalla.** Lo demás de las esquinas (🎮, 👤, ⛶) sí se ve.

### 13.3 Botones fijos en esta variante (⚠️ difiere de las secciones 1 y 7)

| Botón | Aquí | En las secciones 1 y 7 |
|---|---|---|
| **🎮 Portal de Juegos** | **Cuadrado 40 × 40, solo icono**, `b3d chico b-azuloscuro`; el texto va en `title` y `aria-label` («Juegos: volver al portal») | Alargado con texto |
| **☰** | **Cuadrado 40 × 40, solo icono**, `b3d chico b-verdeclaro`; el texto («Atrás», «Pausa», «Volver al menú principal») va en `title` y `aria-label` | Alargado, `b-cielo`, «Pausa/Atrás» |
| **Capa «▶ Comenzar»** | **No existe** | Obligatoria |

Se marca la `<nav>` con la clase `cuadrada` (`<nav class="nav-juego cuadrada">`) para el icono de 20 px.

**Cuándo se ve el ☰** (siempre rotulado para lectores de pantalla):

| Pantalla | ☰ | Al tocarlo |
|---|---|---|
| Pantalla de inicio | **oculto** | — |
| Mapa, vista principal (país) | **oculto** | — |
| Mapa, vistas internas (🗺️ Mapa, 🗂️ Niveles) | «Atrás» | vuelve a la vista del país |
| Pantalla de opciones del Modo libre | «Volver al menú principal» | abre el mapa |
| Partida de un nivel | «Volver al menú principal» | abre la ventana «¿Salir?» (13.6) |
| Partida de Modo libre | «Pausa» | abre la pausa del Modo libre (13.7) |

Esc abre y cierra las ventanas de pausa/«¿Salir?» y, dentro del mapa, sube un paso (como el ☰ «Atrás»). **🎮 se oculta** cuando el juego corre como app instalada sola (13.9).

**Arriba a la derecha** (`.hud.hud-der.columna`, en **columna** alineada a la derecha): primero el chip de sesión («Sin sesión» / nombre, recortado con «…»), **debajo** el chip de monedas (`chip chip-monedas`, sección 3) y debajo el de **puntos del juego** (🏅). En la app instalada sola el chip dice «👤 Iniciar sesión» y es tocable (`entrar()` de `compartido/jugador.js`).

### 13.4 El mapa (menú principal)

```js
const ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true });          // 195 países × 20 niveles (A-bis)
const mapa = montarMapa({
  prefijo: ID, etapas: ETAPAS,
  unPais: true,                       // abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos
  columnas: 4,                        // los 20 niveles de un país: 4 columnas × 5 filas (con 100 niveles por etapa se usan 5 columnas, 7.3)
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],
  alCambiarVista: (esPrincipal) => { /* el juego vuelve a rotular el ☰ (13.3) */ },
  progreso: () => ({ hecho, max: Math.min(TOTAL, hecho + 1) }),   // «hecho» = un solo número (A-bis, punto 4)
  jugarNivel: (n) => jugarNivel(n - 1),
  infoNivel: (n) => ({ sub, aria, estrellasHtml }),               // 🚧 si el nivel aún no existe
  resumenEstrellas: (desde, hasta) => html,                       // opcional: línea de estrellas del país
});
```

- **Vista del país («botella»)**: la silueta del país (tierra verde, playa, árboles, bandera en un poste) se llena de agua con cada nivel; **«Continuar» va dentro del país, en su centro**; arriba, el nombre del país y debajo «N de 20 niveles completados». Los botones extra (♾️ Modo libre), **🗺️ Mapa** y **🗂️ Niveles** van arriba; **Info** solo si el juego pasa `alInfo`.
- **🗺️ Mapa**: el mundo en blanco con **solo los países desbloqueados** (completo = dorado, el actual = naranja, el resto = verde; los muy chicos, un punto). Rueda o pellizco para acercar, arrastrar para mover; los nombres aparecen al acercar. **Tocar un país abre sus 20 niveles**; ahí, «🗺️ Mapa» vuelve al mundo y «◀ País» a la silueta de **ese** país.
- Los países se abren **de uno en uno** (sección A-bis). Los bloqueados no se dibujan.
- Hace falta cargar `compartido/contornos-paises.js` y `compartido/posiciones-paises.js` y anotarlos (y las banderas `imagenes-banderas/xx.svg`) en el `sw.js` del juego.

### 13.5 Celebración de estrellas (si el juego tiene estrellas)

Al pasar un nivel las estrellas ganadas salen del centro **una tras otra**, vuelan **separadas** a la esquina superior derecha y se quedan quietas un instante mientras sale el texto dorado «N estrellas» (con moradas: «3 estrellas · 1 morada»; solo la primera vez, una segunda línea «💰 +N monedas»). Después un velo oscuro cambia al país y las estrellas **caen una por una** a su centro, se encogen y **el país hace «pop»** (`mapa.parpadear(k)`, cada vez un poco más fuerte); «Continuar» está oculto durante todo esto (`mapa.retenerContinuar(true/false)`) y reaparece con un rebote.

- Los tiempos están juntos en una constante `TIEMPOS` al inicio del juego (y `RITMO`); no se reparten por el código.
- **Tocar salta la celebración, pero solo con un toque NUEVO** (`pointerdown` sobre ella): en celular el toque que movió la ficha no debe cerrarla.
- El texto «N estrellas» vive en `<body>` (`.cel-txt`, `z-index` 60): se queda ~4,5 s y **desaparece al instante** al empezar otro nivel.
- `RESPETAR_MOVIMIENTO_REDUCIDO = false` la muestra siempre (en Windows «reducir movimiento» suele estar activo sin querer); con `true` solo se abre el mapa.
- Las estrellas son **adorno**: no dan monedas ni puntos (sección 12). Los estilos (`.est`, `.fila-est`, `.cel-*`) todavía viven en `index-5deslizante.html`; **al pedir un segundo juego con estrellas se pasan a `inmersivo.css`** (pendiente).

### 13.6 Dentro de un nivel

- **Arriba al centro** (`.barra-nivel`): **🗺️** (`b3d b-azul`, 50 px) a la izquierda y, pegado a él, el **botón verde con el nombre del nivel** (`b3d txt b-verde`: «Nivel 3»; en Modo libre «♾️ Modo libre 😐»; **sin el tamaño**). En celular vertical (< 640 px) baja 52 px para no chocar con 🎮 y la sesión; en horizontal bajo pasa a una columna a la izquierda.
- **Justo debajo**, tres cuadros azules (`.cuadros-datos`): **Movimientos · Tiempo · Mejor tiempo**, cada uno un poco más oscuro que el anterior. (Otro juego cambia los rótulos pero conserva la forma y los tres tonos.)
- **El tablero va centrado en la ventana** y en celular vertical ocupa todo el ancho (`--S`). Debajo: título corto («4×4»), estrellas y avisos. **No hay botón 🔄**: se reinicia saliendo y entrando, o con «Repetir» al ganar.
- **Tocar el botón verde o el 🗺️ abre «¿Salir?»** (`crearMenuPausa`): **▶ Seguir jugando** (verde) y **🚪 Salir al mapa** (rojo, ayuda «Se pierde lo avanzado en este tablero.»). Mientras está abierta el cronómetro y los toques se detienen; Esc la abre y la cierra. Salir **no guarda** lo avanzado en esa partida.
- El cronómetro arranca con el **primer movimiento**. Se guardan dos récords independientes: mejor tiempo y menos movimientos.
- El fin de nivel (ventana de victoria) cubre el tablero con sus datos y premios y los botones «Siguiente nivel», «Repetir» y «Mapa». ⚠️ Es una ventana **dentro** del tablero, no la `.sobre-tablero` de la sección 6: al migrar otros juegos con este inicio se usa la de la sección 6.

### 13.7 Modo libre en esta variante

Es la pantalla 7.2 con estos detalles (clases `.pant-menu`, `.modo-grupo`, `.modo-fila` y las nuevas `.dif-fila`, `.dif-nombre`, `.libre-nota`, `.libre-record`, `.libre-jugar`):

1. Título «♾️ Modo libre».
2. Grupo **Dificultad**: **5 botones solo con emoji** de 52 px y letra de 28 px (😁 😬 😐 😡 😈; el elegido `b-oro on`, el resto `b-cielo`), y **debajo el nombre** de la elegida.
3. Grupo **Tablero** (o la opción principal del juego) y, si el juego esconde medidas grandes, «➕ Mostrar más tableros» (`b-azul`).
4. La nota de lo que cambia la dificultad, el «🏆 Récord» de la combinación y, al final, una fila con **▶ Jugar** (`b-verde grande`) y **💾 Partidas guardadas N** (`b-azul grande`; hasta 20 partidas en el dispositivo, clave `_v1` para que entre en la copia de `almacen.js`).
5. **Pausa del Modo libre** (☰ «Pausa» o el botón verde): ▶ Seguir jugando · **💾 Guardar partida** (`b-oro`, con la ayuda «N de 20 partidas guardadas») · 🚪 Salir a elegir tablero.
6. Al terminar un tablero: «Otro tablero» (`b-verde`) y «⚙️ Cambiar tablero» (`b-cielo`). **Sin monedas ni puntos de portal** (7.2).

### 13.8 ⚙️ Ajustes

Ventana con el estilo de la pausa (`.pausa-fondo` + `.pausa-panel.aj-panel`, título «⚙️ Ajustes»; **no usa `confirm()`**). Se abre solo desde la pantalla de inicio. Se cierra con el botón **Cerrar**, con Esc o tocando fuera; el foco empieza en el primer botón y vuelve al ☰/⚙️ al cerrar. Contenido, en este orden:

1. **📲 Instalar solo este juego** (`b-azulmarino`): solo si el juego NO corre ya como app instalada (13.9). El resultado se escribe en una nota de la misma ventana (`.aj-nota`).
2. **🗑️ Borrar todo el historial y reiniciar** (`b-rojo`): **solo durante las pruebas**, controlado por una constante (`MOSTRAR_BORRAR_HISTORIAL`) que **debe quedar en `false` antes de publicar un juego nuevo**. Pide confirmar tocando dos veces (el texto cambia a «¿Seguro? Toca otra vez para borrar TODO» durante 5 s), borra este dispositivo y la cuenta y recarga.
3. **Cerrar** (`b-cielo`, siempre al final, sin icono).

**Recomendado, todavía NO está en Deslizante** (se agrega a la ventana, antes de «Cerrar», cuando se pida): **🌙/☀️ Madera clara/oscura** (`alternarMadera()` de `compartido/fondo-madera.js`; hoy el juego oculta el botón flotante con `data-madera-boton="oculto"` y no tiene otro lugar para cambiarla) y **💾 Copia de seguridad** (`abrirPanelCopias()` de `compartido/almacen.js`).

### 13.9 Instalar solo este juego (opcional por juego)

Cada juego con este inicio puede ofrecer su propia app instalable, separada del portal: `manifest-<carpeta>.webmanifest` (con `scope` = su carpeta y `start_url` con `?app=1`), `sw-<carpeta>.js` (service worker propio; su caché se llama `app-<id>-vN`, **no** empieza con `juegos-`, para que el `sw.js` del portal no la borre) e iconos `icono-180/192/512-<carpeta>.png` y `icono-maskable-512-<carpeta>.png`. El `<head>` captura `beforeinstallprompt` en `window.__pwa` por si llega antes que el módulo. Dentro de la app instalada sola (`display-mode: standalone` + `?app=1`) se oculta 🎮 y el chip de sesión pasa a «👤 Iniciar sesión». Solo se sube `VERSION` de ese `sw-*.js` si se agregan o quitan archivos de su lista. Detalle y pendientes (probar en celular real) en el README de Deslizante.

### 13.10 Progreso, puntos y recompensas

- Todo igual que en las secciones 4A-bis y 12: progreso local primero con `conectar()`, `hechos` = un solo número, **1 punto de portal por nivel la primera vez** (`encolarNivel`), monedas y puntos del juego propios de cada juego (y documentados en su README). El Modo libre no da puntos de portal.
- `jugador.js` y `progreso.js` se cargan con `import()` y `try/catch` para que el juego abra sin internet.

### 13.11 Revisión obligatoria al pedir «inicio con mapa» en un juego

Se revisa en este orden (si algo no coincide con `compartido/inmersivo.css`, manda el CSS):

1. **Madera clara y oscura** (sección 2) y canvas transparentes.
2. **Navegación 13.3**: 🎮 y ☰ cuadrados con solo icono, ☰ con el comportamiento de la tabla (oculto en inicio y en la vista principal del mapa), `hud-der` en columna, ⛶ abajo a la derecha.
3. **Pantalla de inicio 13.2**: los cuatro botones, en su orden, tamaños y colores; se ve una sola vez.
4. **Mapa 13.4**: `crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4, … })`; probar que sin sesión, con sesión y con progreso de la nube se ve el país correcto, que el mundo solo dibuja países abiertos y que «Continuar» queda dentro del país.
5. **Dentro del nivel 13.6**: barra 🗺️ + nombre, tres cuadros de datos, tablero centrado, «¿Salir?» y Esc.
6. **Modo libre 13.7** y su pausa; récord por combinación; clave `_v1`.
7. **Ajustes 13.8** con los botones en su orden y `MOSTRAR_BORRAR_HISTORIAL = false` si el juego ya se publica.
8. **Registro** (sección 5): `juegos.js`, `sw.js` (contornos, posiciones y banderas incluidos), README del juego y del portal.
9. **Probado en celular real**: vertical y horizontal, tablero grande, celebración, instalar (si aplica).

Al migrar un juego que ya tenía menú propio **se conserva su lógica y su progreso** (claves de `localStorage`, `conectar()`, puntos pendientes): solo cambia la pantalla de inicio y el mapa. Se anota en su README qué se cambió y se sube `VERSION` en `sw.js`.
