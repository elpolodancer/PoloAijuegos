# Estándares de todos los juegos del portal

Pegar en el README principal (o dejar como `ESTANDARES-juegos.md` en la raíz). La especificación de medidas y colores vive en `compartido/inmersivo.css`; aquí está lo que hay que respetar y por qué. Cada juego tiene su propio README con sus detalles.

Referencias: **Conecta gominolas** (menú principal, Modo libre, mapa, botón ☰ «Pausa/Atrás» y menú de pausa: secciones 1 y 7), **Slither** (lo mismo con un juego a pantalla completa: menú y Modo libre con las clases `.pant-menu`, fin «sobre el tablero» sin velo; secciones 6, 7 y 11), **Estacionamiento** (mapa, niveles, monedas) y **Rubik** (juego sin niveles). De **Puzle deslizante** solo se tomó la idea del botón azul oscuro del portal.

## 1. Botones fijos (en TODOS los juegos)

| Botón | Esquina | Forma y color |
|---|---|---|
| **🎮 Portal de Juegos** (vuelve al portal, `href="../"`) | arriba-izquierda | **Alargado** (`b3d txt`), **azul oscuro** (`b-azuloscuro`: `#7d9cea → #3b63c4 → #1c3a82`). Siempre visible |
| **☰ Pausa / Atrás** | arriba-izquierda, justo debajo | **Alargado, del mismo ancho** que 🎮 Portal de Juegos, **azul cielo** (`b-cielo`: `#c4ecff → #4db8f0 → #1f72ab`). Oculto en la pantalla del menú principal. Dice **«Pausa»** dentro de una partida y **«Atrás»** en cualquier otra pantalla (sección 7.4) |
| **🌙 / ☀️** (madera clara / oscura) | abajo-izquierda | 40×40, oro. Lo crea `compartido/fondo-madera.js` |
| **⛶ / ✕** (pantalla completa) | abajo-derecha | 40×40, gris (el único gris fijo). Lo crea `compartido/pantalla-completa.js` |
| **👤 Iniciar sesión** | arriba-derecha | Alargado (`b3d txt`, alto 40), azul (`b-azul`). **Siempre** en esa esquina, lo más a la derecha de la fila `.hud-der` (sección 7) |

HTML del bloque de navegación (copiar tal cual; el ☰ nace oculto porque el juego abre en su menú principal):

```html
<nav class="nav-juego" aria-label="Navegación">
  <a class="b3d txt b-azuloscuro" href="../" title="Volver al portal de juegos"><span class="b-ico">🎮</span> Portal de Juegos</a>
  <button class="b3d txt b-cielo" id="btn-menu" type="button" title="Pausa" hidden><span class="b-ico">☰</span> <span id="txt-menu">Pausa</span></button>
</nav>
```

- El azul oscuro es **un poco más claro** que el de Deslizante, sin llegar a ser azul claro. Se define una sola vez en `compartido/inmersivo.css` (`.b-azuloscuro`); los juegos no lo redefinen. Los dos botones toman el ancho del más largo (≈ 175 px) y la zona reservada de arriba-izquierda mide ≈ 190 × 92.
- **Azul cielo = el color de todo botón neutro** (`.b-cielo` en `compartido/inmersivo.css`): ☰ Pausa/Atrás, ℹ️ Info, las flechas «◀ México / ◀ Mundo» del mapa y las opciones sin elegir del Modo libre. **`b-gris` ya no se usa en menús**: queda solo para ⛶ y para botones desactivados (por ejemplo, un boost que no alcanza con las monedas).
- El ☰ es **un solo botón con dos funciones** (sección 7.4). Dentro de una partida congela el juego y abre `compartido/menu-pausa.js`; fuera de ella vuelve al menú principal del juego.
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

**Menú de inicio.** Sustituido por el **menú principal estándar de la sección 7** (Modo libre · Continuar · Niveles · Info). Lo que sigue describe cómo era antes, cuando el mapa era la pantalla principal; al tocar un juego se migra a la sección 7:

**Menú de inicio** (el mapa es la pantalla principal) con estos botones, en este orden:

`▶ Continuar · nivel N` · **`♾️ Juego libre`** (a la derecha de Continuar) · `ℹ️ Info` · `🌍 Mundo` (solo cuando ya se desbloqueó).

- **Juego libre / infinito:** tableros al azar sin fin, sin mapa ni niveles. Propuesta general: **no da monedas ni puntos** (como el modo libre de Deslizante) para que no se pueda repetir sin límite; guarda mejor marca y cantidad resuelta. En Estacionamiento todavía está por hacer (ver su README, sección 12).

**Variante: juego con menú de inicio propio (Supermercado).** Si el juego ya tiene su menú (Nueva partida / Continuar / Niveles), el mapa NO es la pantalla principal: se abre con el botón «🗺️ Niveles». Dentro del mapa el ☰ dice «Pausa» (su «Salir» vuelve a ese menú), y junto a «Continuar · nivel N» va un botón «♾️ Modo infinito» que hace lo mismo (es el equivalente de «Juego libre»). Un nivel es una partida aparte con sus propias metas y restricciones; el juego solo guarda cuántos niveles lleva terminados.

Código reutilizable (ya está en `compartido/`, anotado en `ARCHIVOS` de `sw.js`):

| Archivo | Qué es |
|---|---|
| `compartido/mapa-niveles.js` | El mapa con agua. `montarMapa({ prefijo, etapas, progreso, jugarNivel, infoNivel, leyenda, botonesExtra, alInfo, avisoPrincipal, alCambiarVista })`. Sin Firebase ni red |
| `compartido/etapas-mapa.js` | Orden de los 32 estados y 194 países y cuentas de progreso: `crearEtapas({ porEtapa, primeros })` |
| `compartido/geografia-mapa.js` | Contornos de México, continentes y lagos |
| `compartido/dificultad-niveles.js` | Reparto de dificultad de los niveles (sección 8): `dificultadDeNivel(n, total)` → `"facil"`, `"normal"` o `"dificil"` |

El juego solo indica cuántos niveles tiene cada etapa (`porEtapa`), el progreso `{ max, hecho }` y qué hace `jugarNivel(n)`. Según `sw.js`, Estacionamiento todavía lista sus propias copias en `estacionamiento/` (`mapa-estacionamiento.js`, etc.).

### B) Juegos sin niveles (Rubik)

**No llevan mapa ni niveles.** Su menú principal sigue la sección 7 pero solo con «♾️ Modo libre» (y «ℹ️ Info» si la necesitan): no tienen Continuar ni Niveles. Antes tenía lo mínimo: el selector de lo que se juega (en Rubik, el modelo de cubo) y, dentro de la partida, el botón de revolver. Todo sobre el fondo de madera clara u oscura y con los botones fijos de la sección 1. Detalle en `rubik/README-rubik.md`.

## 5. Para registrar un juego nuevo o cambiado
Anotarlo en `juegos.js`, en `JUEGOS` de `sw.js`, subir `VERSION`, y agregar su fila y nota «Estado» al README principal. Para **pasarlo a la zona «Juegos» (terminado)** ver la sección 11.

## 6. Fin de nivel: «Siguiente nivel ▶» sobre el tablero

En todos los juegos con niveles, al terminar un nivel el botón **Siguiente nivel ▶** aparece **encima del cuadro del tablero**, centrado en él. No va abajo, ni arriba, ni en otra parte de la pantalla, ni en una ventana que tape todo con un velo oscuro.

- Es el **primer botón** de la ventana y el más grande (`b3d txt grande b-verde`). Debajo van, más chicos y en una fila, las demás opciones (Repetir nivel, Mapa…). Arriba, el título y el resultado dentro de un recuadro oscuro (`.sobre-texto`) para que se lea sobre cualquier tablero.
- Estilos en `compartido/inmersivo.css` (clase `.sobre-tablero`, con la estructura de ejemplo en el comentario). La ventana **no bloquea** el tablero (`pointer-events: none`; solo el texto y los botones reciben toques).
- El juego pone la ventana encima del tablero asignando `left`, `top`, `width` y `height` (px) = rectángulo del tablero en pantalla, recortado a la ventana; si el tablero casi no se ve (muy acercado o muy movido), toda la ventana. Si el jugador mueve o acerca la vista con la ventana abierta, el juego la recoloca. Ejemplo: `colocarVictoria()` en `estacionamiento/juego-estacionamiento.js`.
- En el último nivel del juego el botón «Siguiente» se oculta.
- **Juegos donde el tablero es toda la ventana** (Slither, Agario…): no se asignan `left/top/width/height`; la ventana cubre la pantalla y centra su contenido (sigue sin bloquear los toques). En el botón principal de la ventana, si no hay «Siguiente» (derrota, Modo libre), el primero y más grande es «Reintentar» / «Jugar otra vez»; las demás opciones (Mapa de niveles, Cambiar mapa y bots) van debajo en `.sobre-fila` y en `b-cielo`.

## 7. Menú principal, Modo libre, mapa, ☰ y pausa (estándar de TODOS los juegos)

Referencia: **Conecta gominolas** (`gominolas/index-gominolas.html` y `juego-gominolas.js`). Cuando se pida «crear el menú como dicta el inmersivo», se copia su estructura, textos y colores. La especificación de medidas también está en `compartido/inmersivo.css`.

### 7.1 Menú principal

Pantalla de inicio: un título (`h1`, emoji + nombre del juego), una frase corta y, debajo, una columna de botones centrada sobre la madera, **en este orden**:

| # | Botón | Color | Qué hace |
|---|---|---|---|
| 1 | **♾️ Modo libre** | `b-morado`, `grande` | **Siempre el primero.** Abre la pantalla de Modo libre (7.2) |
| 2 | **▶ Continuar · nivel N** | `b-verde`, `grande` | Juega directo el nivel donde va el jugador. Solo juegos con niveles |
| 3 | **📋 Niveles** | `b-azul`, `grande` | Abre el mapa en la lista de niveles del estado o país donde va el jugador (`mapa.abrir(nivelActual)`). Solo juegos con niveles |
| 4 | **ℹ️ Info** | `b-cielo`, tamaño normal | Ventana «Cómo se juega» (estilos `.pausa-*`) con un botón verde «Entendido». Más chico que los otros tres |

- **Estilos ya hechos:** `compartido/inmersivo.css` trae `.pant-menu` (pantalla sobre la madera, texto con `--txt-fondo`, se desplaza si no cabe y deja libre la zona de 🎮 / ☰), `.menu-columna` (la columna de botones; los `.grande` miden igual, hasta 300 px) y, para el Modo libre, `.modo-grupo` y `.modo-fila`. El juego solo pone el HTML (ver el comentario de esas clases); no copia CSS propio.
- **No hay botón 🗺️ Mapa ni 🚪 Salir.** Al mapa se llega desde «Niveles» (con «◀ México» / «◀ Mundo») y al portal se sale con «🎮 Portal de Juegos».
- Juegos sin niveles (sección 4B): solo «♾️ Modo libre» (y «ℹ️ Info» si el juego la necesita).
- Si el juego aún no tiene niveles, «Continuar» y «Niveles» se muestran igual y al tocar un nivel inexistente se avisa con «🚧 Los niveles todavía no están creados».
- El ☰ no se ve en esta pantalla.
- **👤 Iniciar sesión**: botón alargado azul (`b3d txt b-azul`) **siempre en la esquina superior derecha** del menú principal, con las funciones de `compartido/jugador.js` (`alCambiarSesion`, `entrar`, `salir`) cargado con `import()` dinámico y `try/catch`, para que el menú funcione sin internet. Si el juego tiene monedas, sonido u otros chips arriba a la derecha, van a su izquierda: el de sesión es siempre el último de la fila.

### 7.2 Modo libre (pantalla propia, no desplegable)

- Título «♾️ Modo libre», una frase y grupos con su rótulo («Tablero», «Dificultad»…). Cada grupo es una **fila de botones** `b3d txt` de 44 px: **el elegido es `b-oro on`** y los demás **`b-cielo`**.
- Debajo: una nota que explica qué cambia la dificultad, el «🏆 Récord» de la combinación elegida y, al final, **«▶ Jugar»** (`b3d txt grande b-verde`).
- Se recuerda la última selección. Cada juego decide qué grupos tiene y **cuántas dificultades** (Gominolas: 🙂 Fácil · 😐 Medio · 😈 Difícil, según cuántas negras nuevas salen por jugada fallida; ya no se exigen siempre las 5 de antes).
- Sin monedas ni **puntos de perfil** (como en la sección 4A) y sin barra de boosts: el Modo libre solo guarda el récord. Esto cuenta desde que el juego pasa a la zona «Juegos» (sección 11), porque desde ahí sus puntos suman al total de todos. Si el juego quiere apartarse, lo deja en una constante (`PUNTOS_LIBRE`, en Slither) y lo explica en su README. Al terminar una ronda, el botón del resultado dice «⚙️ Cambiar tablero» y vuelve a esta pantalla.
- El ☰ dice «Atrás» y vuelve al menú principal.

### 7.3 Niveles y mapa

- «Niveles» abre `compartido/mapa-niveles.js` directo en la lista de niveles de la etapa actual. Tras pasar el último nivel de una etapa, el juego vuelve al mapa con el agua subiendo (`mapa.abrir(n, true)`).
- La vista principal del mapa (México) lleva «▶ Continuar · nivel N», «ℹ️ Info» (`alInfo`) y, solo cuando se desbloquea, «🌍 Mundo». **No lleva «Modo libre»**: al modo libre solo se entra desde el menú principal.
- **Botón de atrás dentro del mapa:** «◀ México» (desde un estado o el mundo) y «◀ Mundo» (desde un país), `b-cielo`; suben un paso dentro del mapa y Esc hace lo mismo. El ☰ «Atrás» sale del mapa **siempre** al menú principal del juego (aunque se esté dentro de un estado o país), y Esc sube un paso dentro del mapa.
- Cada juego dice cómo se ve cada nivel con `infoNivel` (por ejemplo ★★☆ y 🎁) y llama a `menuBoton()` en `alCambiarVista` (7.4).
- El mundo (194 países) viene siempre armado pero oculto hasta terminar los 32 estados (secciones 4A y 9).

### 7.4 El botón ☰: «Pausa» dentro de la partida, «Atrás» fuera

Es el mismo botón y se rotula según la pantalla:

| Pantalla | ☰ | Al tocarlo |
|---|---|---|
| Menú principal | oculto | — |
| Niveles / mapa, Modo libre, resultado de un nivel o ronda | **◀ Atrás** | Vuelve al menú principal del juego |
| Partida en curso | **☰ Pausa** | Congela el juego y abre el menú de pausa (7.5) |

Patrón de código (copiar de `juego-gominolas.js`). Se llama a `menuBoton()` en **cada** cambio de pantalla (menú, mapa, modo libre, empezar, ganar, perder):

```js
function menuBoton() {
  const enMenu = !pantMenu.hidden;
  const enPartida = !enMenu && pantLibre.hidden && !mapa.abierto() && estado === "jugando";
  btnMenu.hidden = enMenu;
  document.getElementById("txt-menu").textContent = enPartida ? "Pausa" : "Atrás";
  btnMenu.title = enPartida ? "Pausa" : "Volver al menú principal";
}
// crearMenuPausa({ boton: btnMenu, puedeAbrir: () => estado === "jugando" && !mapa.abierto() && pantMenu.hidden && pantLibre.hidden, … })
btnMenu.addEventListener("click", () => { if (mapa.abierto() || !pantLibre.hidden || estado !== "jugando") mostrarMenu(); });
```

`puedeAbrir` **debe** dar `false` fuera de una partida: así el ☰ no abre la pausa sobre el mapa y la tecla Esc del mapa no choca con la de la pausa.

### 7.5 Menú de pausa (solo dentro de una partida)

Lo crea `compartido/menu-pausa.js`. En este orden:

1. **▶ Continuar** (`b-verde`, siempre primero).
2. Opciones del juego (`b-azul`, cada una con un texto de ayuda): en juegos con niveles, **🔄 Reiniciar nivel** («Vuelves a empezar este nivel con tus puntos de antes») y **📋 Niveles** («Vas a la zona de niveles. Se pierde lo avanzado en este nivel»).
3. **🚪 Menú principal** (`b-rojo`, siempre al final; es `textoSalir`, ya no dice «Salir»). Su ayuda avisa de lo que se pierde: «Se pierde lo avanzado en este nivel.»

En **Modo libre** no hay opciones extra (reiniciar sería repetir la ronda sin costo): solo Continuar y **«Salir a elegir tablero»** (ayuda: «La partida termina; se guarda cuántas rondas superaste.»), que vuelve a la pantalla 7.2.

Los juegos ya hechos (Estacionamiento, Supermercado, Batalla naval…) se pasan a este estándar cuando se vuelvan a tocar.

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

## 9. Al pedir «crear el menú principal» en un juego (revisión obligatoria)

Cuando se pida crear el menú principal en un juego que no lo tiene o que está desactualizado, **no basta con poner los botones**: se revisa y corrige todo lo siguiente, en este orden, contra `compartido/inmersivo.css` y la sección 7 (si algo no coincide, manda el CSS):

1. **Fondo de madera clara y oscura.** `<html class="inmersivo">` y `<body class="inmersivo">`; el script del `<head>` contra el parpadeo; `compartido/fondo-madera.js` al final del `<body>`; el botón **🌙 / ☀️** abajo a la izquierda; los `<canvas>` transparentes (`clearRect`); ningún fondo propio en `html`/`body`.
2. **Botón azul oscuro «🎮 Portal de Juegos»** (`b3d txt b-azuloscuro`, `href="../"`), arriba a la izquierda. Se eliminan las versiones viejas: «🎮 Juegos», flechas «←», botones de volver propios.
3. **Botón azul cielo «☰ Pausa / Atrás»** (`b3d txt b-cielo`, con el icono de las tres rayitas y un `<span id="txt-menu">`), justo debajo del anterior y del mismo ancho. Oculto en el menú principal; dice «Pausa» en partida y «Atrás» en el resto (7.4, con `menuBoton()`).
4. **Menú principal** (7.1): título, frase y columna centrada de botones **♾️ Modo libre · ▶ Continuar · 📋 Niveles · ℹ️ Info** (sin Mapa ni Salir; sin Continuar ni Niveles si el juego no tiene niveles).
5. **Botón «👤 Iniciar sesión»** siempre en la **esquina superior derecha** (7.1).
6. **Pantalla de Modo libre** (7.2): filas de opciones (elegido `b-oro on`, resto `b-cielo`), nota, récord y «▶ Jugar».
7. **Mapa con México y mundo armados.** El juego usa `crearEtapas` + `montarMapa` con las dos zonas completas desde el primer día: 32 estados y 194 países, cada uno con su cantidad de niveles. Se comprueba que (a) el mundo y el botón 🌍 **no se ven** hasta terminar todos los niveles de México, (b) después aparece **un país a la vez**, en el orden de `PAISES_BASE`, y los no desbloqueados no se listan, y (c) el progreso guarda «más alto abierto» y «más alto terminado». «Niveles» abre el mapa en la etapa actual y «◀ México / ◀ Mundo» van en `b-cielo`. Esto se deja funcionando aunque el juego todavía no tenga niveles creados.
8. **Pausa** (7.5): `crearMenuPausa` con Continuar · Reiniciar nivel · Niveles · Menú principal (y la versión corta del Modo libre), `puedeAbrir` en `false` fuera de una partida.
9. **Lo demás de los estándares**: botón ⛶ de pantalla completa abajo a la derecha; ningún control del juego dentro de las zonas reservadas de las esquinas (medidas en `inmersivo.css`); y **ningún `b-gris` en menús** (se cambia por `b-cielo`).

Al migrar un juego que ya tenía menú propio, **se conserva su lógica y su progreso** (claves de `localStorage`, `conectar()`, puntos pendientes): solo cambia la pantalla de inicio. Al terminar, se anota en el README del juego qué estaba desactualizado y qué se cambió, y se sube `VERSION` en `sw.js`.

## 10. Orden de trabajo: primero los estándares, después los niveles

**No se empiezan a generar los niveles de un juego hasta que estén completos sus estándares.** Si se generan antes, al cambiar una mecánica hay que borrarlos y rehacerlos. El orden es:

1. **Estándares del juego completos**: la revisión de la sección 9 (madera, 🎮 Portal de Juegos, ☰ Pausa/Atrás, menú principal de la sección 7, 👤 Iniciar sesión, pantalla de Modo libre, mapa de México y mundo armado con los países ocultos, ⛶ y pausa conectada), más monedas/estrellas si el juego las usa (sección 3), y su registro (sección 5).
2. **Mecánicas, metas y temas definidos como constantes** al inicio del archivo de lógica del juego, antes de cualquier generación: qué variantes existen, a partir de qué avance del mapa (`p`) aparecen y cómo se combinan por etapa. Se anotan en el README del juego.
3. **El bot de comprobación soporta todo lo anterior** (cada mecánica y cada meta) y pasa una muestra de niveles de todo el mapa.
4. **Solo entonces** se generan los 22 600 niveles (100 por estado y por país) con la dificultad de la sección 8.

Mientras un juego está en `EN_DESARROLLO` y sin publicar, sus niveles se pueden borrar y regenerar. Después de publicar **no se cambian** (cambiaría niveles que ya se pasaron).

## 11. Pasar un juego a la zona «Juegos» (terminado)

Mientras un juego está en `EN_DESARROLLO` (`juegos.js`) sus puntos **nunca suman al total** (`jugador.js`: solo guardan la mejor marca y, si juega el administrador, van a `totalPrueba`). Al pasarlo a «Juegos» **empiezan a contar para todos**, así que antes de pasarlo se revisa esta lista, en este orden:

1. **Estándares completos** (secciones 1, 2, 7 y 9): 🎮 Portal de Juegos, ☰ Pausa/Atrás en `b-cielo`, madera, ⛶, menú principal con **♾️ Modo libre · ▶ Continuar · 📋 Niveles · ℹ️ Info**, 👤 Iniciar sesión, pantalla de Modo libre, mapa armado con el mundo oculto, pausa estándar y fin de nivel sobre el tablero (6). Ningún `b-gris` en menús ni `velo` oscuro propio: las pantallas de menú usan `.pant-menu` y la ayuda («Cómo se juega») la ventana `.pausa-*` con «Entendido».
2. **Puntos revisados.** El Modo libre no da puntos de perfil (7.2). Los niveles dan puntos **solo la primera vez** que se pasan y con tope por envío (`MAX_PUNTOS_POR_ENVIO` = 1000 en `jugador.js` y `cola-puntos.js`, igual que las reglas de Firestore). Se comprueba que no hay forma de repetir algo sin límite y que sume.
3. **Niveles completos y comprobados:** los 22 600 (o los que el juego declare) generados **después** de los estándares (sección 10), con su verificador en consola (`verificar-<juego>.mjs`, «Todo cumple»). Si el reparto de dificultad se aparta de la sección 8, el README del juego lo explica (Slither: 50/40/10 → 25/35/40).
4. **Progreso local primero** con `conectar()` y puntos pendientes con `encolarPuntos()`; `jugador.js` y `progreso.js` se cargan con `import()` y `try/catch` para que el juego abra sin internet.
5. **Probado:** flujo completo (menú → Modo libre → partida → pausa → salir; Niveles → mapa → nivel → ganar/perder → Mapa/Siguiente; recargar con progreso), en escritorio **y en celular real** (las pruebas con navegador sin pantalla no sustituyen tocar con el dedo).
6. **Registro:** quitar el id de `EN_DESARROLLO` en `juegos.js`; comprobar que su carpeta y archivos están en `JUEGOS` de `sw.js` (y que los de solo consola **no**); subir `VERSION` con una línea de «Última versión»; fila de «Mapa de archivos» y nota «Estado» en el README principal (con la fecha y qué falta, p. ej. sonido o imagen de tarjeta).
7. **Imagen de tarjeta** (`imagenes/<juego>.webp`, anotada en `ARCHIVOS` de `sw.js` y en el campo `imagen` de `juegos.js`): recomendada pero **no obligatoria**; sin ella el portal muestra el icono y el nombre. Si falta, se deja como pendiente en el README.

Pasar un juego a terminado **no cambia sus niveles** (sección 10): después de publicar ya no se tocan.

