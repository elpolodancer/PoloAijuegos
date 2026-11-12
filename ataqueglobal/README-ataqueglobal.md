# Ataque Global (`ataqueglobal/`)

Juego de guerra de misiles sobre el mapa del mundo, inspirado en *First Strike*. Id de puntos: `ataqueglobal`. Sigue los estándares de `ESTANDARES-juegos.md` (botones fijos, madera clara/oscura en los menús, mapa de niveles estándar).

> El nombre y la carpeta son provisionales: si quieres otro, se cambia en `juegos.js`, `sw.js`, la carpeta y los nombres de archivo.

## 1. Estado actual (fase 1)

Hecho: menú principal, el mundo con zoom y países seleccionables, y el mapa de niveles estándar.
**Todavía no hay bots que jueguen.** Fácil / Normal / Difícil abren el mundo (la dificultad se guarda en la variable `dificultad`, sin efecto), donde ya funciona el menú circular de tus países (expandir, misil nivel 1, investigar; sección 3.2) y los botones para apuntar y disparar con alcance y destrucción de países (sección 3.3). Los niveles muestran un aviso «se están preparando».

| Archivo | Qué es |
|---|---|
| `index-ataqueglobal.html` | Página: menú principal, lienzo del mundo, controles de zoom, ficha del país, aviso de niveles |
| `juego-ataqueglobal.js` | Pantallas (menú → mundo / niveles), menú de pausa, mapa de niveles (`montarMapa`) |
| `mapa-ataqueglobal.js` | El mundo: dibujo, zoom, gestos, selección, capas de conquista y destrucción |
| `paises-ataqueglobal.js` | **Generado.** Contornos de los 194 territorios (ver sección 2) |
| `menu-pais-ataqueglobal.js` | Menú circular de un país propio (botones con etiqueta curva que siguen al país), panel de lista y aviso corto (sección 3.2) |
| `armas-ataqueglobal.js` | Botones de ataque abajo a la derecha, aviso «elige el objetivo» y burbuja de confirmación (sección 3.3) |
| `investigacion-ataqueglobal.js` | Datos y reglas de las 8 mejoras y las 2 superarmas (solo lógica, sin pantalla) |
| `herramientas/generar-paises.mjs` | Genera `paises-ataqueglobal.js` sin internet (aproximado) |
| `herramientas/geojson-a-paises.mjs` | Lo regenera con fronteras reales desde un GeoJSON de Natural Earth |

Reutiliza de `compartido/`: `mapa-niveles.js`, `etapas-mapa.js`, `geografia-mapa.js`, `menu-pausa.js`, `fondo-madera.js`, `inmersivo.css`, `estilos.css`.
No usa Firebase todavía (no hay puntos ni progreso en la nube).

## 2. Los países del mundo

- **212 territorios** (194 países, con EE. UU., Canadá y Rusia contados como 21 divisiones; ver abajo) = los 194 de `etapas-mapa.js` (195 con México, que ahí son sus 32 estados) **con Israel y Palestina unidos en uno solo llamado «Palestina/Israel»** (id `IL`; el id `PS` no existe en el mapa). México sí aparece como país (`MX`).
- Groenlandia se pinta como parte de Dinamarca; Taiwán, de China; Puerto Rico, de EE. UU.
- Los países diminutos o isleños (Vaticano, Mónaco, Malta, Singapur, Maldivas, islas del Pacífico…) salen como **marcadores**: un círculo con tamaño mínimo en pantalla para poder tocarlos.
- **Los contornos son aproximados**: se generaron con `herramientas/generar-paises.mjs` (reparte la tierra de `geografia-mapa.js` entre puntos semilla de cada país). Sirven para ver y elegir países, pero las fronteras no son las reales. Para el juego final conviene cambiarlas por Natural Earth (dominio público): bajar `ne_110m_admin_0_countries.geojson` y correr `node ataqueglobal/herramientas/geojson-a-paises.mjs archivo.geojson`.
- Para ver o corregir un país aproximado: editar sus semillas en `SEMILLAS` de `generar-paises.mjs` y volver a generar.
- **Países divididos (EE. UU., Canadá y Rusia).** Para que no se sientan enormes, estos tres NO existen como un solo territorio: cada uno está partido en **divisiones independientes**, con su propio id, dueño, color, selección, niebla y destrucción. Un bot puede nacer en una sola división y expandirse a las vecinas. Total: **212 territorios** (194 − 3 + 21).
  - **Estados Unidos (5):** `US1` Noroeste (con Alaska), `US2` Suroeste, `US3` Centro, `US4` Sureste (con Puerto Rico), `US5` Noreste.
  - **Canadá (9):** `CA1` Columbia Británica, `CA2` Alberta, `CA3` Saskatchewan, `CA4` Manitoba, `CA5` Ontario, `CA6` Quebec, `CA7` Provincias Atlánticas, `CA8` Yukón y Territorios del Noroeste, `CA9` Nunavut.
  - **Rusia (7):** `RU1` Centro, `RU2` Norte, `RU3` Sur y Cáucaso, `RU4` Urales y Siberia Occidental, `RU5` Siberia Central, `RU6` Siberia Oriental, `RU7` Extremo Oriente.
  - Se definen en `DIVISIONES` de `generar-paises.mjs` (id → `{ pais, nombre, corto, centro? }`) y sus semillas en `SEMILLAS` (códigos `US1`, `CA1`…). Para cambiar cuántas hay o dónde cortan, se editan ahí y se vuelve a generar. `centro` (solo `US1`) fija qué parte es «la principal» cuando hay partes separadas (Alaska).
  - En el código: `etiquetaTerritorio(id)` (rótulo corto del mapa), `paisDe(id)` («US3» → «US»; de ahí sale la bandera) y `divisionesDe("CA")` → `["CA1",…,"CA9"]`. Para el grafo de vecindad, cada división cuenta como un territorio más (las divisiones de un mismo país son vecinas entre sí).
  - El mapa de niveles estándar (`etapas-mapa.js`) NO cambia: sigue con EE. UU., Canadá y Rusia como un país cada uno.
  - ⚠️ `geojson-a-paises.mjs` (fronteras reales) todavía no parte las fronteras reales de estos tres países: los deja con su dibujo aproximado dividido. Pendiente recortarlos con las divisiones.
- ⚠️ El mapa de niveles estándar (`etapas-mapa.js`) todavía lista **Israel** y **Palestina** como dos países y usa los nombres de `Intl`. Al preparar los niveles hay que decidir si se agrega a `etapas-mapa.js` un nombre especial (sin romper otros juegos) o si este juego trae su propia lista (193 países → 22 500 niveles).

## 3. Pantallas

1. **Menú principal** (madera): título, «Partida libre» con el selector **Enemigos − N +** (de **1 a 15 bots**, se recuerda en el aparato; debajo, un punto del color de cada bot) y **Fácil · Normal · Difícil**, y **🗺️ Niveles**. Sin ☰ (estándar).
2. **Partida libre**: el mundo a pantalla completa. ☰ = «Pausa» (Continuar / Ver todo el mundo / Salir). Arriba a la derecha, un chip con el modo.
3. **Niveles**: mapa estándar (32 estados de México → al terminarlos, 194 países). ☰ = «Menú principal».

El mundo pinta su **propio fondo de espacio** (excepción al fondo de madera: es el cielo del planeta); los botones fijos de las esquinas se respetan. El zoom va a media altura del borde derecho para no ocupar las esquinas.

### 3.0 Colores, bots y botón Centrar (hecho)
- **Tierra:** todos los países son **verde oscuro de tierra con césped** (tres tonos casi iguales, `TIERRAS` en `mapa-ataqueglobal.js`; fronteras claras). El país seleccionado se aclara a verde césped con trazo blanco.
- **Hasta 15 bots**, cada uno con **su color propio** (`COLORES_BOTS` en `juego-ataqueglobal.js`, revisados para que se distingan entre sí, de tu amarillo y del verde): rojo, naranja, morado, rosa, azul, blanco, turquesa, guinda, celeste, magenta, café, gris plata, azul acero, salmón y lavanda. Un país de bot se tiñe fuerte de su color (`ALFA_BOT` = 0.72) y lleva un trazo de ese color. Los más parecidos entre sí son los tres azules (azul, celeste y azul acero).
- **Tu país:** sigue verde (apenas teñido, `ALFA_JUGADOR` = 0.12) pero con un **trazo amarillo brillante** (`COLOR_JUGADOR`), más grueso, con resplandor y un filo blanco: es el más brillante de todos. Ningún bot usa amarillo.
- La ficha de abajo dice «Tu país» o «Enemigo N» y su borde lleva el color del dueño.
- **Botón 🎯 Centrar** (o tecla `C`), en la columna de zoom: lleva la cámara **exactamente** al centro de tu país y lo acerca (`mundo.centrarEn(iso)`).
- ⚠️ **Provisional:** los bots aún no juegan. Cada uno ocupa un solo país elegido de la lista `PAISES_BOTS` (de los más cercanos a México a los más lejanos); la niebla los oculta salvo los que caen en tu visión. Se cambiará cuando existan los niveles y el grafo de vecindad.

### 3.1 Niebla de guerra (hecha)
- **TODA partida empieza con una niebla negra opaca** que tapa el planeta entero: no se ven países, fronteras, nombres ni destrucción, y **no se puede tocar nada** bajo ella (así tampoco se «descubre» el nombre de un país).
- El jugador empieza viendo el **10 %** de la superficie del planeta alrededor de su país; la **1.ª mejora de Inteligencia** lo sube al **50 %** (un hemisferio) y la **2.ª** al **100 %** (sin niebla). Constantes `VISION = [0.10, 0.50, 1]` en `juego-ataqueglobal.js`.
- La visión es un **casquete esférico** (círculo sobre el globo) alrededor de cada país propio, con el borde difuso. Medida en superficie: 10 % ≈ 37° de radio (unos 4 100 km), 50 % = hemisferio. **El propio país siempre se ve entero**, aunque sea más grande que el círculo (ej. Rusia). Con varios países propios, se suman las visiones.
- API en `mapa-ataqueglobal.js`: `mundo.setVision(["MX"], 0.10)`; sin llamarla el planeta queda totalmente tapado. En `juego-ataqueglobal.js`: `empezarPartida(paisesPropios)` (**toda partida, libre o de nivel, debe empezar por aquí**) y `mejorarVision()` (llamarla al terminar cada mejora de Inteligencia). Al volver al menú se vuelve a tapar todo.
- Por ahora el país inicial es **México** (`PAISES_INICIALES`, provisional hasta tener niveles y el grafo de vecindad).
- **El mouse no hace nada al pasar** (sin resaltado de países ni cambio de cursor); arrastrar, rueda y clic funcionan igual.

### 3.2 Menú circular de un país propio (hecho)
- Al **tocar un país tuyo** se resalta con anillos y salen sus botones en círculo, con la etiqueta curva (`menu-pais-ataqueglobal.js`). El menú **sigue al país** al girar o acercar el planeta (`alCuadro` y `mundo.posicion(iso)`). Al tocar **otro país** tuyo, el menú abierto se pliega y se abre el del nuevo; si el tocado no es tuyo (o es el mismo otra vez), solo se pliega. No existe el botón «Desmantelar» del juego de referencia.
- **Botones:** **Expandir** (solo si el país tiene vecinos sin dueño; si hay varios, abre una lista para elegir), **Misil nivel 1** (5 s; el número de la esquina son los misiles guardados, empiezan en 2) e **Investigar** (abre la lista de mejoras). Mientras el país hace algo, los botones se apagan y bajo el país se ve qué hace y cuánto falta.
- **Un país hace una sola cosa a la vez** (expandir 25 s, fabricar 5 s o investigar). El reloj se detiene con el menú de pausa y con la pestaña oculta. Con `?rapido` en la dirección todo dura la décima parte (para probar).
- **Investigación** (`investigacion-ataqueglobal.js`): 8 mejoras de 1 min; las 4 primeras disponibles y cada una desbloquea otra (1→5, 2→6, 3→7, 4→8). Con las 8 se desbloquean las **2 superarmas** (3 min). Hoy solo tiene efecto real la visión: **Inteligencia mejorada** (3) sube la niebla al 50 % e **Inteligencia superior** (7) al 100 %. El resto de efectos (tiempos −20 %, misiles nivel 2 y 3, SDA, capacidad…) siguen pendientes.
- ⚠️ **Vecindad provisional:** `vecinosDe(iso)` en `mapa-ataqueglobal.js` la calcula con los contornos (vértices a menos de ~1°; las islas se enlazan con las 2 más cercanas). Se cambiará por el grafo real de la fase 2.
- ⚠️ **Capacidad de misiles sin tope** hasta resolver la duda 2 de la sección 9. El botón **Atacar / Apuntar** y los misiles de nivel 2 y 3 todavía no tienen botón.

### 3.3 Botones de ataque (hecho)
- **Abajo a la derecha**, a la izquierda del ⛶ y de la columna de zoom (esa esquina es de los botones fijos). Cada uno lleva debajo su estado: **A PUNTO**, **SIN MISILES**, **BLOQUEADA**, **SIN INVESTIGAR** o **INVESTIGANDO** (con anillo de progreso).
- **💀 Calavera:** apunta **todos** los misiles (niveles 1, 2 y 3). **✈ Naves:** apunta solo los de **nivel 1**. No se hizo el botón del ojo (sin función).
- **Flujo:** pulsas el botón → aviso «Elige el objetivo» → tocas un país (no se puede tocar bajo la niebla) → aparece la mira y una burbuja con «N de M misiles llegan» → **DISPARAR** o **✕**. Tocar el mapa lejos de la burbuja (más de 110 px), pulsar otra vez el botón o `Esc` cancela. Mientras apuntas puedes girar y acercar el mundo.
- **Alcance:** solo salen los misiles cuyo país de origen llega al objetivo. Se mide como fracción de la superficie del planeta desde el centro del país (igual que la niebla): `ALCANCE = { 1: 10 %, 2: 50 %, 3: 66 % }` en `juego-ataqueglobal.js`. ❓ El 10 % del nivel 1 es provisional (el README solo dice «corto») y el del nivel 3 es la duda 1 de la sección 9.
- **Vuelo e impacto:** cada misil tarda 5 s, sale con un pequeño desfase y se dibuja con cola y explosión (`mundo.lanzar`, se detiene con la pausa). Un país cae con **2 misiles en el centro o 3 en el borde** (más allá del 60 % de su radio: provisional, hasta tener el radio de la fase 2). Al caer se pinta destruido, deja de ser de su dueño y se puede volver a conquistar expandiéndote hacia él.
- **🧪 Dos botones de superarmas** (arriba a la izquierda del grupo): reflejan las investigaciones 9 y 10 (bloqueadas hasta completar las 8 mejoras). Con la investigación lista dicen «A PUNTO», pero **todavía no hacen nada**: la lista de superarmas está pendiente.
- ⚠️ Los misiles de nivel 2 y 3 todavía no se pueden fabricar (no hay botón), por eso hoy solo salen los de nivel 1. Un país recién conquistado empieza con 2 misiles, como los demás (revisar con la duda 2).

### Controles del mundo
Rueda / pellizco / botones **+ − 🌍** (o teclas `+ - 0`) para el zoom; arrastrar para recorrer; tocar un país lo selecciona (y su nombre aparece en la ficha de abajo); tocar el mismo país o el mar lo suelta. En celular vertical se empieza más cerca (África y Europa) y **🌍** muestra todo el mundo.

## 4. Aspecto del mundo (especificación visual)

- **Fondo del universo:** azul muy oscuro (`#030918`) con estrellas tenues.
- **Planeta:** azul oscuro con degradado, y alrededor una **aurora azul claro del tamaño de la capa de ozono** que respira suavemente: parece un escudo planetario (quieta con `prefers-reduced-motion`).
- **Países:** todos azul oscuro; solo se distinguen por un **trazo fino de un color propio** (estable por país, calculado a partir de su código).
- **País conquistado (aliado):** no se repinta: se coloca **encima una capa del mismo contorno, medio transparente, del color del jugador** (alpha 0.4), para conservar la oscuridad de fondo. `mundo.setDueno(iso, color)` ya la dibuja.
- **País destruido:** deja de ser tuyo; se pinta **negro con pequeñas grietas rojas** y a su alrededor queda **una mancha carbonizada**, poca pero visible, que cae un poco encima de los países vecinos. `mundo.setDestruido(iso, true)` ya lo dibuja (versión simple: se afinará con tus capturas de referencia).
- Esa mancha tiene un efecto de juego importante: engaña. Si el bot de resistencia ×4 (sección 8) pierde su primer país con 2 misiles, la zona negra hace pensar que «ya explotó todo», pero sus extensiones siguen vivas.
- 📸 **Pendiente:** adjuntar capturas del juego original de una zona destruida (grietas y mancha) para igualar el aspecto.

## 5. Reglas de la partida (plan)

Todo esto está **planeado, no hecho**. Los tiempos y números son los que definiste; los marcados con ❓ están en la sección 9.

### 5.1 Territorios y regiones de guerra
- Cada **región de guerra** (en el código; el jugador no ve ese texto) es un bando: el jugador o un bot. Empieza con **2 o 3 países** y se **expande a países vecinos que estén vacíos** (sin dueño). México, por ejemplo, se comportaría como un bot individual que poco a poco toma los países que lo rodean.
- **Expandir a otro país tarda 25 s.** Mientras un país hace la expansión **no puede construir misiles ni investigar**.
- Si un país **es destruido, deja de ser tuyo**: hay que volver a expandirse hacia él (otros 25 s).
- Las regiones se definirán más adelante (lista pendiente del autor). Se necesita el **grafo de vecindad** entre países (fase 2 del plan).

### 5.2 Arsenal de misiles (por país)
| Nivel | Nombre | Alcance | Notas |
|---|---|---|---|
| 1 | Misil de crucero | corto | Se construye en **5 s**. Es el único al inicio |
| 2 | Balístico de medio alcance | **50 %** del mundo | **3 cabezas** para un ataque localizado. Se desbloquea investigando |
| 3 | Balístico intercontinental | **66 %** ❓ | Se desbloquea investigando |

- **Capacidad:** cada país guarda al inicio **2 misiles de nivel 1**. Se mejora el almacenaje (ver investigaciones y ❓).
- **Daño:** un país se destruye con **2 misiles** que caen en el centro; si el misil cae en el **borde** hacen falta **3**. Los bots tontos a veces apuntan mal y caen en el borde.
- **Resistencia a la radiación:** +50 % de puntos de impacto por país.

### 5.3 Investigación
Un país puede investigar desde el inicio (y queda ocupado mientras lo hace). **Cada mejora dura 1 minuto**, salvo las superarmas (3 min). Inician 4 disponibles:

| # | Mejora | Requiere | Efecto |
|---|---|---|---|
| 1 | **Eficiencia defensiva mejorada** | — | −20 % tiempos de construcción y espera; se construyen **2 misiles de crucero a la vez** |
| 2 | **Tecnología de misiles mejorada** | — | Desbloquea el misil de **nivel 2** |
| 3 | **Inteligencia mejorada** | — | Amplía la visión de la **niebla de guerra** del 10 % al **50 %** del planeta (ver 3.1); **aviso justo antes de una detonación** en uno de tus países |
| 4 | **Infraestructura mejorada** | — | **−50 % tiempo de conquista** de países nuevos; **+50 % puntos de impacto** por país |
| 5 | **Eficiencia defensiva superior** | 1 | −20 % más de tiempos; el **SDA** (defensa) se activa solo si un misil sobrevuela un país aliado ❓ |
| 6 | **Tecnología de misiles superior** | 2 | Desbloquea el misil de **nivel 3** intercontinental |
| 7 | **Inteligencia superior** | 3 | Visión al **100 %** (sin niebla). **Espionaje:** ver si un país está bloqueado. **Cálculo avanzado:** ver el punto de impacto de cada misil (avisa y tarda **5 s** en caer) |
| 8 | **Resiliencia suprema** | 4 | Nueva base de misiles: capacidad por país a **4**, y luego a **5** ❓ |
| 9 | **Primera superarma elegida** | 5 y 7 | Se puede investigar la primera de las 2 superarmas elegidas al inicio (**3 min**) |
| 10 | **Segunda superarma elegida** | 6 y 8 | Igual con la segunda (**3 min**) |

Es probable que se termine un nivel antes de completar muchas mejoras: está previsto así.

### 5.4 Superarmas
- Existen **18 superarmas**; al **iniciar una partida se eligen 2**.
- Sin avance, solo hay **4 disponibles** (las más básicas, igualmente fuertes). El resto se desbloquea con el progreso.
- Su poder y la lista completa están **pendientes** (el autor las definirá).

### 5.5 Apuntar
Botón **Apuntar**: marca todos los misiles y permite **recorrer el mundo** para elegir una zona. Pide **confirmación**; si se toca **lejos de la zona de confirmación, se cancela**. Al confirmar, **solo salen los misiles cuyo alcance llega** hasta allá.

### 5.6 Diplomacia
- Botón **Diplomacia**: pedir una **tregua** a un bot. Solo se puede pedir **si nunca lo has atacado** (aunque él te haya atacado a ti). Con la tregua deja de atacarte.
- El jugador **puede romperla cuando quiera**, porque la victoria es cuando **todos se han rendido**.
- Los bots también hacen treguas entre sí y algunos se enfocan en varios enemigos.
- Un bot puede **rendirse** aunque le queden un par de países.

### 5.7 Bots
- En partidas iniciales hay **2 o 3 bots** que crean misiles y avanzan, **a propósito lentos**: en fácil no deben expandirse sin parar.
- Al reunir unos **10 misiles de nivel 1**, atacan al rival más cercano.
- Los bots tontos a veces lanzan **un solo misil** al azar y a veces apuntan al borde.

## 6. Dificultades

El menú muestra por ahora 3; el plan es de **5**.

| Dificultad | Países al inicio | Rivales |
|---|---|---|
| Fácil | **3** propios | 2–3 bots, lentos y torpes |
| Normal | por definir | por definir |
| Difícil | **1** propio | Rivales con **3–4** países, bots más hábiles, a veces lanzan un misil suelto |
| Muy difícil | por definir | Rivales con 4–5 países ya aliados desde el inicio |
| Extremo | por definir | Hasta **8 bots** (el selector del menú ya permite hasta 15); algunos con varios enemigos, otros con treguas entre sí |

## 7. Niveles

- **22 600 niveles** (el «más de 22 000» del diseño): **100 por cada estado de México (32)** y **100 por cada país (194)**.
- Los niveles son **fijos**: siempre el mismo país inicial, los mismos rivales y las mismas regiones, pero se **generan con aleatoriedad determinista** (una semilla por número de nivel), de modo que son idénticos para todos los jugadores y no hace falta guardarlos a mano.
- Cada nivel define: país con el que inicias, regiones rivales y sus países, dificultad, y si trae el bot oculto de la sección 8.
- La estructura de progreso es la del mapa estándar: `{ max, hecho }` en `localStorage` (`ataqueglobal_progreso_v1`), por ahora sin sincronizar con la cuenta.
- Qué relación tiene el estado/país de cada etapa con el nivel (¿solo agrupa, o condiciona el país inicial?) está en ❓.

## 8. El bot oculto de resistencia ×4

- Nadie sabe cuál es: **solo su país inicial** (su «capital») resiste **4 veces** lo normal (2 misiles → 8). **Sus extensiones son normales.**
- Prefiere **países muy pequeños** para esconderse y tiende a nacer en **Palestina/Israel** (y países parecidos de tamaño).
- Se **expande** como un bot de alto nivel.
- No es tan raro: aparece en unos **5 000 de los 22 600 niveles** (≈ 22 %). Se decide al generar el nivel (es fijo).
- Trampa buscada: tras destruir lo que parece su capital con 2 misiles, la mancha negra hace creer que todo explotó, pero el bot sigue vivo en otras zonas.

## 9. Por aclarar (dudas que encontré al escribir esto)

1. **Alcance del misil de nivel 3:** dice «66 %» y también «capaz de llegar a cualquier lugar del mundo». ¿Es 66 % o 100 %?
2. **Capacidad por país:** se habló de mejorar hasta **8** misiles, pero *Resiliencia suprema* da **4** y luego **5** (máximo). ¿La capacidad máxima es 5 u 8? ¿Hay otras mejoras de almacenaje (de pago) aparte de la investigación?
3. **«4 % más de resistencia»:** entendí **×4** (4 veces). Confírmalo.
4. **SDA:** supongo que es el sistema de defensa aérea que derriba misiles que sobrevuelan un país aliado. ¿Es así, y con qué probabilidad / límite funciona?
5. **«Resiliencia suprema»** aparece con dos frases (capacidad 4 y luego máximo 5): ¿son dos niveles de la misma mejora?
6. **Tiempos** de construcción de los misiles de nivel 2 y 3, y de cada superarma al usarse.
7. **Relación etapa ↔ nivel:** el estado o país del mapa de niveles, ¿solo agrupa 100 niveles o define el país inicial?
8. **Dificultad dentro de los niveles:** ¿sube con el número de nivel (de Fácil a Extremo) o cada nivel trae la suya?
9. **Palestina/Israel en la lista de niveles** (ver sección 2).
10. **Sistema monetario, regiones de guerra, las 18 superarmas y sus efectos:** pendientes (ya avisaste que los pasarás).

## 10. Orden recomendado de desarrollo

Para no construirlo «de pies a cabeza», cada fase se puede probar sola:

1. ✅ **Mundo y menús** (hecho).
2. **Datos del mapa:** fronteras reales (Natural Earth), **grafo de vecindad** (qué países se tocan; para islas, los más cercanos), punto central de cada país y un «radio» (para distinguir centro y borde). Todo lo demás depende de esto.
3. **Motor de la partida, sin enemigos:** reloj propio con pausa, país propio, **expandir** (25 s) con su barra de progreso, panel del país seleccionado con sus acciones (Expandir / Misiles / Investigar). Aquí se pinta ya la capa de conquista.
4. **Misiles y destrucción:** construir (5 s, capacidad 2), **Apuntar → confirmar/cancelar**, vuelo animado, impacto, 2 misiles (3 en el borde), país destruido con grietas y mancha. Con un país «de práctica» inmóvil.
5. **Un solo bot fácil:** expande despacio, junta ~10 misiles, ataca al más cercano; **niebla de guerra**; victoria y derrota.
6. **Investigación:** las 4 mejoras iniciales, luego las superiores; ocupar el país 1 min.
7. **Diplomacia, rendición y varios bots**, y los **5 niveles de dificultad** (propios/rivales/velocidad/puntería).
8. **Superarmas:** pantalla de elección de 2 (4 disponibles al inicio) y su investigación de 3 min. Empezar por 2 o 3 y sumar el resto.
9. **Niveles fijos:** generador con semilla (22 600), el bot oculto ×4, progreso `{ max, hecho }`, y después **monedas/puntos** (`encolarPuntos`) y sincronización con la cuenta (`progreso.js`).
10. **Pulido:** igualar el aspecto de destrucción con tus capturas, sonido, tutorial, balance de números y rendimiento en celulares.

## 11. Para pegar en el README principal

**Fila para «Mapa de archivos»:**

| `ataqueglobal/index-ataqueglobal.html`, `juego-ataqueglobal.js`, `mapa-ataqueglobal.js`, `paises-ataqueglobal.js`, `herramientas/*.mjs`, `README-ataqueglobal.md` | Juego «Ataque Global» (id `ataqueglobal`), estilo First Strike. Fase 1: menú principal (Partida libre Fácil/Normal/Difícil + Niveles), mundo en `<canvas>` con zoom, gestos y países seleccionables (194 territorios; Israel y Palestina unidos como «Palestina/Israel»), capas de conquista y destrucción ya dibujadas, y el mapa de niveles estándar (`compartido/mapa-niveles.js`). `paises-ataqueglobal.js` es GENERADO (contornos aproximados) por `herramientas/generar-paises.mjs`; `geojson-a-paises.mjs` lo cambia por fronteras reales. Plan completo en `README-ataqueglobal.md` |

**Nota para «Estado»:**

- Ataque Global (11 nov 2026, `sw.js` `VERSION` = 151): fase 1 hecha y probada en Chromium (menú, partida libre, zoom con rueda, selección de países, pausa, mapa de niveles, celular vertical). NO hay partida todavía. Pendiente: imagen de tarjeta (`imagenes/ataqueglobal.webp`), fronteras reales, grafo de vecindad y todo lo del plan (sección 10). La pantalla no se ha probado en un celular real (gestos de pellizco, rendimiento).
