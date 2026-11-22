# Estándares de todos los juegos del portal

Pegar en el README principal (o dejar como `ESTANDARES-juegos.md` en la raíz). La especificación de medidas y colores vive en `compartido/inmersivo.css`; aquí está lo que hay que respetar y por qué. Cada juego tiene su propio README con sus detalles.

Referencias: **2048** (capa «Comenzar», opciones dentro de ☰ Pausa y mapa con listas de 5 columnas: sección 7), **Conecta gominolas** (Modo libre, mapa, ☰ «Pausa/Atrás» y menú de pausa: secciones 1 y 7), **Slither** (juego a pantalla completa: Modo libre con las clases `.pant-menu`, fin «sobre el tablero» sin velo; secciones 6, 7 y 11), **Estacionamiento** (mapa, niveles, monedas) y **Rubik** (juego sin niveles). De **Puzle deslizante** se tomó la idea del botón azul oscuro del portal. El «velo de inicio» de las versiones anteriores de 7.0/7.1 se reemplazó por la capa «Comenzar» (ver el cambio de abajo).

**Cambio de estándar (21 nov 2026): el juego abre directo en el nivel y no hay pantalla de menú principal.** Al abrir se ve el juego ya cargado, tapado por una capa semitransparente con un solo botón verde **▶ Comenzar**. Las opciones (♾️ Modo libre, 📋 Niveles, 🔄 Reiniciar, 🚪 Menú principal) están en el menú del botón **☰ Pausa**. Esto reemplaza al velo con tres botones (♾️ · 🗂️ · ▶ Continuar) y a las columnas de botones del menú principal; ver secciones 7 y 9. Los juegos que todavía no se tocan (p. ej. Deslizante, Spider) siguen con el velo viejo hasta que se migren. Referencia nueva: **2048** (Comenzar + ☰ Pausa con Modo libre y Niveles + mapa con listas de 5 columnas).

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

**Estado de migración (21 nov 2026).** 2048 ya cumple todo esto. **Solitario, Conecta gominolas y Slither** ya abren con «Comenzar», pero su «Menú principal» todavía abre la pantalla vieja (columna con Modo libre · Continuar · Niveles · Info) y su pausa aún no trae «♾️ Modo libre»: pendiente alinearlos con 7.5. Deslizante, Spider y los demás siguen con el velo viejo hasta que se toquen.

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
4. **Solo entonces** se generan los 22 600 niveles (100 por estado y por país) con la dificultad de la sección 8.

Mientras un juego está en `EN_DESARROLLO` y sin publicar, sus niveles se pueden borrar y regenerar. Después de publicar **no se cambian** (cambiaría niveles que ya se pasaron).

## 11. Pasar un juego a la zona «Juegos» (terminado)

Mientras un juego está en `EN_DESARROLLO` (`juegos.js`) sus puntos **nunca suman al total** (`jugador.js`: solo guardan la mejor marca y, si juega el administrador, van a `totalPrueba`). Al pasarlo a «Juegos» **empiezan a contar para todos**, así que antes de pasarlo se revisa esta lista, en este orden:

1. **Estándares completos** (secciones 1, 2, 7 y 9): 🎮 Portal de Juegos, ☰ Pausa/Atrás en `b-cielo`, madera, ⛶, juego cargado al abrir con la capa **▶ Comenzar** (♾️ Modo libre y 📋 Niveles dentro de ☰ Pausa), 👤 Iniciar sesión, pantalla de Modo libre, mapa armado con el mundo oculto, pausa estándar y fin de nivel sobre el tablero (6). Ningún `b-gris` en menús ni `velo` oscuro propio: las pantallas de menú usan `.pant-menu` y la ayuda («Cómo se juega») la ventana `.pausa-*` con «Entendido».
2. **Puntos revisados.** El Modo libre no da puntos de perfil (7.2). Los niveles dan puntos **solo la primera vez** que se pasan y con tope por envío (`MAX_PUNTOS_POR_ENVIO` = 1000 en `jugador.js` y `cola-puntos.js`, igual que las reglas de Firestore). Se comprueba que no hay forma de repetir algo sin límite y que sume.
3. **Niveles completos y comprobados:** los 22 600 (o los que el juego declare) generados **después** de los estándares (sección 10), con su verificador en consola (`verificar-<juego>.mjs`, «Todo cumple»). Si el reparto de dificultad se aparta de la sección 8, el README del juego lo explica (Slither: 50/40/10 → 25/35/40).
4. **Progreso local primero** con `conectar()` y puntos pendientes con `encolarPuntos()`; `jugador.js` y `progreso.js` se cargan con `import()` y `try/catch` para que el juego abra sin internet.
5. **Probado:** flujo completo (menú → Modo libre → partida → pausa → salir; Niveles → mapa → nivel → ganar/perder → Mapa/Siguiente; recargar con progreso), en escritorio **y en celular real** (las pruebas con navegador sin pantalla no sustituyen tocar con el dedo).
6. **Registro:** quitar el id de `EN_DESARROLLO` en `juegos.js`; comprobar que su carpeta y archivos están en `JUEGOS` de `sw.js` (y que los de solo consola **no**); subir `VERSION` con una línea de «Última versión»; fila de «Mapa de archivos» y nota «Estado» en el README principal (con la fecha y qué falta, p. ej. sonido o imagen de tarjeta).
7. **Imagen de tarjeta** (`imagenes/<juego>.webp`, anotada en `ARCHIVOS` de `sw.js` y en el campo `imagen` de `juegos.js`): recomendada pero **no obligatoria**; sin ella el portal muestra el icono y el nombre. Si falta, se deja como pendiente en el README.

Pasar un juego a terminado **no cambia sus niveles** (sección 10): después de publicar ya no se tocan.

