# 🌲 Supervivencia

> Proyecto: **Juegos (portal)** · juego «Supervivencia» (id `supervivencia`, estilo Last Day on Earth)
> Ruta: `supervivencia/README-supervivencia.md`
> Archivos: `index-supervivencia.html`, `juego-supervivencia.js`
> Mundo: `localStorage` clave `supervivencia_mundo_v2` → `{ v: 2, n, piso, obj, dano, inv, herr, x, y, t }`
> Marcas: ✅ hecho · 🔜 por programar · ❓ por decidir

## 1. Estado actual (base)

- ✅ Mapa de **35×35** casillas en **vista isométrica** (rombos 2:1). Un solo `<canvas>` a pantalla completa y transparente (fuera del mapa se ve la madera del estándar). Borde de tierra al sur.
- ✅ **Piso**: madera, piedra y baldosas (losas de 4 px de grosor). Se coloca tocando o arrastrando; 🧽 lo quita. No se coloca sobre un recurso.
- ✅ **Recursos** (se generan al empezar; el centro queda despejado y cerca siempre hay piedras y fibra):

| Recurso | Golpes | Herramienta | Da | Bloquea el paso |
|---|---|---|---|---|
| Piedra suelta | 1 (se recoge) | a mano | 1 piedra | no |
| Fibra | 1 (se recoge) | a mano | 1-2 fibra | no |
| Arbusto de bayas | **5** | a mano | 3-4 bayas | sí |
| Árbol (roble / pino) | **10** | **hacha** (obligatoria) | 3-5 madera | sí |
| Vulto de piedra | **8** | **pico** (obligatorio) | 4-6 piedras | sí |

- ✅ **Cómo se trabaja un recurso**: se toca (o se pulsa Espacio / E para el más cercano) y el personaje camina hasta alcanzarlo y lo golpea solo, un golpe cada 0.55 s, con animación del brazo y la herramienta, sacudida del recurso, barra «golpes/total» y textos «+4 Madera». Si falta la herramienta avisa y no hace nada. Los golpes ya dados se guardan (un árbol a medio talar sigue a medio talar). Los árboles muestran una muesca que crece; los vultos, grietas; el arbusto va perdiendo bayas.
- ✅ **Fabricar** (botón 🛠️): hacha = 3 piedras + 3 fibras; pico = 4 piedras + 3 fibras (`RECETAS`). No piden madera porque al empezar solo hay piedras y fibra sueltas; se pueden cambiar.
- ✅ **Inventario** en chips arriba (Madera, Piedra, Fibra, Bayas y las herramientas que ya tienes). Por ahora los recursos solo se acumulan: todavía no se gastan en nada más que en fabricar.
- ✅ 🌳 ahora **solo planta** árboles en casillas vacías; talarlos exige el hacha.
- ✅ **Personaje**: camina tocando el suelo (rodea obstáculos y suaviza el camino) o con flechas / WASD (en la diagonal de la pantalla). Choca con los recursos que bloquean y con el borde. La cámara lo sigue.
- ✅ **Zoom**: dos dedos o rueda del ratón (0.55× a 1.8×).
- ✅ **Estándar del repo**: `🎮 Juegos` y `☰ Pausa` (Info, «Mundo nuevo» en dos toques, que también borra recursos y herramientas, y Salir), fondo de madera clara/oscura, ⛶ pantalla completa, esquinas reservadas respetadas.
- ✅ Guardado local (`supervivencia_mundo_v2`): mapa, piso, recursos, golpes, inventario, herramientas y posición. Se guarda al cambiar algo (0.8 s), cada 10 s si solo caminaste, al abrir ☰ Pausa y al cerrar o esconder la página. El guardado de la versión anterior (35×35, `_v1`) ya no se usa.

## 2. Cómo está hecho (para seguir construyendo)

- La lógica vive en un **mapa plano** (x, y en casillas; la casilla (i, j) ocupa x∈[i, i+1), y∈[j, j+1)); solo se proyecta con `SX(x, y)` / `SY(x, y, z)`. `aMundo(sx, sy)` es la inversa.
- Datos: `piso`, `objetos` y `dano` son `Uint8Array(1225)`, índice `j * N + i`. Pisos 1 madera, 2 piedra, 3 baldosa. **Todo recurso está en la tabla `OBJ`** (golpes, herramienta, qué suelta, si bloquea): para agregar uno nuevo se pone ahí, se dibuja en `dibujarObjeto()` y se genera en `generarMundo()`.
- Flujo de un golpe: `elegirObjetivo()` (valida herramienta y calcula el camino) → `trabajar(dt)` cada cuadro (si ya alcanza, golpea con `ENFRIAR`) → `golpear(k)` → `romper(k)`.
- Dibujo: borde, suelo por diagonales, cuadrícula/resaltado, y **recursos y personaje juntos ordenados por `x + y`**; la barra de golpes y los textos van encima. Cualquier objeto nuevo con altura entra en esa lista `ents`.
- Choques: `bloqueado(i, j)` y `libre(x, y)`. Rutas: búsqueda en anchura sobre las 1225 casillas + `suavizar()`.
- Todas las cifras (velocidad, golpes, recetas, probabilidades de aparición) son constantes al inicio de `juego-supervivencia.js` o de `generarMundo()`.
- El mundo guardado lleva `t` = `Date.now()` para poder usar `unirRecientes` de `compartido/progreso.js` cuando se sincronice con la cuenta.

## 3. Idea del juego (Last Day on Earth) — por decidir

> Armas, armaduras, recursos, refinados y objetos del Viejo Mundo: ver la **sección 5**.
> Zonas de farmeo (pino y caliza, tres niveles de dificultad): ver la **sección 6**.
> Tiempos de recolección y tamaños de mapa: ver la **sección 7**.
> Animales, lobos y zombis (vida, velocidad, daño y zonas): ver la **sección 8**.
> Botín de cofres, cajas especiales y drops de enemigos: ver la **sección 9**.
> Objetos creables y nivel en que se desbloquean: ver la **sección 10**.
> Experiencia (XP), niveles y multiplicadores: ver la **sección 11**.

Lo de esta base es solo el escenario. Lo que sigue, en el orden que parece más natural:

1. ✅ ~~Recursos y herramientas~~ (hecho: piedras, fibra, bayas, árboles con hacha, vultos con pico).
2. 🔜 **Construcción con costo**: el piso y las paredes gastan madera y piedra; paredes y puertas con altura (usar el mismo orden por profundidad).
3. 🔜 **Barras de vida, hambre y sed**: comer las bayas; agua.
   ❓ ¿Los recursos reaparecen con el tiempo? Hoy lo que se rompe no vuelve.
4. 🔜 **Enemigos (zombis)**, combate y armas; ciclo de día y noche.
5. 🔜 **Refugio y mapa más grande** (zonas, cuevas, casas para explorar).
6. ❓ ¿Cámara fija a la isométrica o poder girarla? ¿Mapa de 35×35 fijo o por zonas que se desbloquean?
7. ❓ ¿Cuenta (puntos) o solo avance local? Por ahora no usa Firebase ni puntos.

## 4. Pendiente de registrar en el repo

- `juegos.js` y `sw.js`: ya registrados (`sw.js` `VERSION` = 143).
- Imagen de tarjeta (`imagenes/supervivencia.webp`) y anotarla en `ARCHIVOS` de `sw.js`.
- Sin probar en navegador ni celular real: toques, pellizco para zoom, rendimiento (se dibujan solo las casillas visibles, pero no se midió) y tamaño de los botones en horizontal.

---

## 5. Armas, armaduras, recursos y objetos (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es la lista de objetos del estilo Last Day on Earth para ir metiéndola **poco a poco**. Se junta con el punto 2 (construcción), el 3 (hambre, sed y vida) y el 4 (enemigos) de la sección 3. Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida).

### 5.1 Recursos naturales

| Recurso | Hoy en el juego | Para después |
|---|---|---|
| Leño de pino | ✅ Los árboles ya son **roble o pino**, pero los dos dan «Madera» (3–5) | 💡 Que cada árbol dé su propio leño (`OBJ` ya distingue el dibujo; falta el botín) |
| Leño de roble | ✅ Igual que arriba | 💡 Ídem. ❓ ¿Se diferencian en algo (cantidad, uso) o solo en el nombre? |
| Piedra caliza | ✅ Piedra suelta (1 golpe) y vulto de piedra (8 golpes, pico) dan «Piedra» | 💡 Renombrar «Piedra» a «Piedra caliza» |
| Mineral de hierro | 🔜 No existe | 💡 Vulto nuevo (pico), con otro color; ❓ cuántos golpes y cuántos da |
| Cobre | 🔜 No existe | 💡 Vulto nuevo (pico). ❓ Para qué se usa (la lista no lo dice) |
| Piel de animal | 🔜 No existe | Hacen falta **animales**; hoy no hay ninguno (punto 4 de la sección 3) |

- ✅ Ya existen y **no están en esta lista**: **fibra** y **bayas**. ❓ ¿Se conservan? 💡 La fibra sirve para la cuerda y las bayas son comida.
- ❓ ¿Cuántos de cada recurso aparecen al generar el mundo y a qué distancia del inicio? Hoy siempre hay piedras y fibra cerca; los metales conviene dejarlos **más lejos** para que valga explorar (punto 5 de la sección 3).

### 5.2 Materiales refinados y componentes

| Tipo | Objetos | 💡 De dónde salen |
|---|---|---|
| Refinados | Tablones | Leño |
| | Ladrillos | Piedra caliza |
| | Acero | Mineral de hierro |
| | Cuerda | Fibra |
| | Aluminio | ❓ No hay mineral de aluminio en la lista: 💡 se **recicla** de la electrónica (5.5) |
| | Plástico | ❓ Igual: 💡 se recicla |
| Componentes mecánicos | Tornillos, cables de aluminio, piezas de goma, baterías | 💡 Se **fabrican** con refinados o se **reciclan** de objetos del Viejo Mundo |

- «Se refinan» pide un lugar y un proceso. 💡 Hoy fabricar se hace en el panel 🛠️ sin edificio. Para refinar convendría una **estación** (banco de trabajo u horno) que se construya con el piso y las paredes del punto 2 de la sección 3. ❓ ¿Una sola estación o varias? El original usa **varias** (ver 10.8).
- ❓ Cuánto tarda refinar (💡 instantáneo al principio; con tiempo cuando haya día y noche).

### 5.3 Armas

| Tipo | Objetos |
|---|---|
| Herramientas básicas | Martillo, Palanca |
| Cuerpo a cuerpo | Katana, Mazo con sierra |
| A distancia | Arco |
| Armas de fuego | Glock 17, AK-47, FN SCAR, VSS Vintorez, Minigun |

- ✅ Hoy solo hay dos herramientas: **hacha** (3 piedras + 3 fibras) y **pico** (4 piedras + 3 fibras). ❓ ¿El hacha y el pico también sirven de arma? (en este estilo de juego lo suelen hacer).
- 🔜 **Todas las armas esperan a los enemigos**: sin zombis ni animales no hay a quién pegar (punto 4 de la sección 3).
- 💡 Escala de poder, de menos a más: herramientas → cuerpo a cuerpo → arco → armas de fuego. El **Minigun** sería la última.
- ❓ **Munición:** las armas de fuego y el arco necesitan algo que gastar (flechas, balas). No aparece en la lista; 💡 flechas con madera y cuerda, balas con acero y componentes.
- ❓ **Durabilidad:** ¿las armas y herramientas se desgastan? Hoy el hacha y el pico duran para siempre.
- ❓ Daño, alcance, velocidad de golpe y receta de cada una.

### 5.4 Armaduras

| Nivel | Piezas |
|---|---|
| Básica | Camisa, pantalones cargo, zapatillas deportivas |
| Resistente | Gorro de lana, chaqueta gruesa, botas de trabajo |
| Militar / SWAT | Casco SWAT, chaleco antibalas SWAT, pantalones tácticos |
| Especial | Traje Kevlar (defensa muy poderosa) y ropa NRBQ (antirradiación de combate para el Búnker Bravo) |

- 💡 Cuatro **ranuras de equipo**: cabeza, torso, piernas y pies. No todos los niveles traen las cuatro: Básica no trae cabeza, Resistente no trae piernas y Especial es de cuerpo completo. ❓ ¿Se completan o se dejan así?
- 🔜 Depende del punto 3 de la sección 3 (barra de vida) y de los enemigos.
- ❓ Cuánto defiende cada pieza y si la defensa es un número que resta daño o un porcentaje.
- ❓ **Búnker Bravo y ropa NRBQ:** implica una **zona radiactiva** o un lugar especial del mapa. Con el mapa de 35×35 no cabe; 💡 va con el punto 5 de la sección 3 (mapa más grande o zonas).
- 💡 ¿Se ve la ropa en el personaje? Hoy se dibuja una figura sin equipo; dibujar cada pieza es mucho trabajo, así que 💡 empezar con que solo cuente para la defensa.

### 5.5 Objetos del Viejo Mundo

| Objeto | Para qué sirve (según la lista) | 💡 En el juego |
|---|---|---|
| Candado y llave | Asegurar bases o abrir cofres específicos | Va con la **construcción** (punto 2): puertas y cofres. 🔜 Hoy no hay cofres |
| Cigarrillos | Objeto de lujo o de intercambio | Moneda de trueque. ❓ Hace falta con quién intercambiar (personajes o comercio) |
| Cámaras, relojes caros, memorias USB | Valiosos para reciclar circuitos | Se **reciclan** y dan aluminio, plástico, cables y baterías (5.2) |
| Linternas | Electrónica | 💡 Sirve de luz cuando haya **día y noche** (punto 4) y también se puede reciclar |

- ❓ ¿Dónde se encuentran? 💡 En **casas, cuevas o ruinas** del mapa más grande (punto 5 de la sección 3), no por el terreno suelto.

### 5.6 Consumibles y medicinas

| Tipo | Objetos |
|---|---|
| Alimentos | Judías en lata, Baozi, Cerveza |
| Medicinas | Antibióticos, Antídoto, Adrenalina |

- ✅ Las **bayas** ya son el primer alimento (todavía no se pueden comer).
- 🔜 Depende del punto 3 de la sección 3: **hambre, sed y vida**.
- ❓ Qué da cada uno. 💡 Judías y baozi quitan hambre; la cerveza quita sed pero ❓ ¿tiene un efecto malo?
- ❓ **Estados:** el **antídoto** y los **antibióticos** suponen **veneno** o **infección**, que hoy no existen. La **adrenalina** suena a mejora corta de velocidad o de vida. ❓ ¿Se agregan esos estados o se simplifican las medicinas a «curar vida»?

### 5.7 Cómo encaja en el código

- La lista pasa de **4 recursos + 2 herramientas** (chips arriba) a **unos 40 objetos distintos**: los chips ya no alcanzan. 🔜 **Mochila con ranuras**, como la de Imperio (varios objetos por ranura hasta un tope).
- 💡 Una tabla `ITEMS` (nombre, tipo, cuánto se apila, de dónde sale), igual que `OBJ` para los recursos del mapa y `RECETAS` para fabricar. Las armas, armaduras y consumibles serían filas de esa tabla.
- ⚠️ El guardado `supervivencia_mundo_v2` guarda el inventario como `inv` (cuatro cantidades) y `herr` (las herramientas). Al cambiar la mochila hay que pasar a **`v: 3`** y convertir los mundos guardados (que no se pierda lo que ya juntaron).
- Para recursos nuevos del mapa, el flujo ya está (sección 2): agregar a `OBJ`, dibujarlo en `dibujarObjeto()` y generarlo en `generarMundo()`.

### 5.8 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** la tabla `ITEMS` con todos los objetos de esta sección, sin cambiar el juego.
2. **Mochila con ranuras** y paso del guardado a `v: 3`.
3. **Recursos naturales nuevos:** leño de pino y de roble por separado, mineral de hierro y cobre.
4. **Refinar:** estación y recetas de tablones, ladrillos, acero y cuerda.
5. **Consumibles y barras** de vida, hambre y sed (sección 3, punto 3).
6. **Enemigos** y las primeras armas (hacha y pico como arma, martillo, palanca, katana, arco).
7. **Armaduras** con sus ranuras de equipo.
8. **Objetos del Viejo Mundo**, candado y llave, armas de fuego y zona NRBQ (con el mapa más grande).

### 5.9 Preguntas por decidir

1. ¿Se conservan la fibra y las bayas?
2. ¿Qué diferencia a los leños de pino y de roble?
3. ¿Para qué sirve el cobre?
4. ¿El aluminio y el plástico salen solo de reciclar?
5. ¿Hay una estación de refinar y se construye con el piso y paredes?
6. ¿Munición y durabilidad de armas y herramientas?
7. ¿Las armaduras tienen cuatro ranuras completas?
8. ¿Hay veneno e infección (antídoto, antibióticos) o se simplifican?
9. ¿Los cigarrillos se pueden intercambiar con alguien?
10. ¿Dónde está el Búnker Bravo y cómo se llega?

---

## 6. Zonas de farmeo (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es la referencia del estilo Last Day on Earth (zonas de recolección con tres niveles de dificultad) para ir llevándola al juego **poco a poco**. Se junta con el punto 5 de la sección 3 («refugio y mapa más grande», «¿mapa de 35×35 fijo o por zonas?») y con los objetos de la sección 5. Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida).

### 6.1 Idea general

- Hay **dos tipos de zona de farmeo** (**pino** y **caliza**), cada una con **3 niveles de dificultad**: 🟢 verde (fácil), 🟠 naranja (medio) y 🔴 roja (difícil). Son **6 zonas** en total.
- A mayor dificultad: **más recursos, mejor botín, más enemigos y mayor tamaño y distancia.**
- 🌲 Las zonas de pino quedan al **este de la base**; 🪨 las de caliza, al **oeste**.
- ✅ **Hoy en el juego:** un solo mundo de **35×35** donde empiezas en el centro; no hay base separada, zonas, viajes ni enemigos. Sí existen los recursos de las zonas fáciles: árboles (pino y roble), piedras sueltas, vultos de piedra, fibra y bayas (sección 1).

### 6.2 🌲 Zonas de pino (este de la base)

| Zona | Dificultad | Distancia (a pie) | Madera | Piedra | Hierro | Botín | Enemigos clave |
|---|---|---|---|---|---|---|---|
| Arbustos y Pinos | 🟢 Fácil | ~12 min | 51 + 19 leños | 9 + 21 caliza | — | Nivel 1, 2–3 cajas | Zombis errantes, mordedores rápidos, lobos grises |
| Arboleda de Pinos | 🟠 Medio | ~19 min | ~100 % más que Arbustos | Más que Arbustos | — | Nivel 2, 3–4 cajas | + Escupidores tóxicos y aplastadores orondos (1–2) |
| Bosque de Pinos | 🔴 Difícil | ~28+ min | Máxima | — | — | Nivel 3, 3–4 cajas | + **The Big One** (jefe, casi imposible de matar) |

- La **Arboleda de Pinos** se desbloquea desde el **nivel 10** (del jugador).
- **Arbustos y Pinos** en detalle: **27 árboles vivos** (51 leños) + **3 muertos** (9 leños) + **20 de fibra vegetal** + **30 bayas**.

### 6.3 🪨 Zonas de piedra caliza (oeste de la base)

| Zona | Dificultad | Distancia (a pie) | Piedra | Hierro | Madera | Botín | Enemigos clave |
|---|---|---|---|---|---|---|---|
| Risco de Caliza | 🟢 Fácil | ~12 min | 25 rocas + 20 sueltas (45) | 5 rocas de hierro | 7 árboles (10 leños) | Nivel 1, 3–4 cajas (comida, agua, recursos bajos) | Zombis errantes, mordedores rápidos, lobos grises |
| Acantilados de Caliza | 🟠 Medio | ~19 min | 20 rocas + 30 sueltas (50) | 30 rocas de hierro | 10 árboles (10 leños) | Nivel 2, 3–4 cajas | + Escupidores tóxicos (1–2), aplastadores orondos (1–2), lobos rabiosos |
| Torres de Caliza | 🔴 Difícil | ~28+ min | 100 % más que Acantilados | 66 % más que Acantilados | — | Nivel 3, 3–4 cajas (Katana, Glock 17, etc.) | Gran cantidad de zombis; solo para jugadores de nivel alto |

### 6.4 Diferencias clave entre niveles

- **Tamaño y distancia:** las zonas rojas son las más lejanas y grandes. A pie, de **12 min** (verde) a **28+ min** (roja). Con chopper, de **5 s a 11 s**.
- **Cantidad de recursos:** cada nivel tiene ~**100 % más** del recurso principal que el anterior (pino en zonas de pino, caliza en zonas de caliza).
- **Calidad del botín:**

  | Nivel de botín | Qué trae |
  |---|---|
  | 1 | Comida básica, herramientas de piedra |
  | 2 | Partes de armas, componentes |
  | 3 | Armas de fuego (Glock, Katana), materiales avanzados |

- **Enemigos:** 🟢 zombis básicos y lobos · 🟠 + escupidores tóxicos y aplastadores · 🔴 + **The Big One** (en pinos) u **hordas masivas** (en caliza).
- **Energía de viaje:** **15** (verde) → **22** (naranja) → **33** (roja).
- **Consejo del juego original:** las **naranjas** son las más eficientes (recursos abundantes con enemigos manejables); las verdes se agotan rápido y las rojas son arriesgadas sin buen equipo.

### 6.5 Cosas que no cuadran en los datos (❓ revisar)

1. **Leños de Arbustos y Pinos:** «51 + 19» suma 70, pero el detalle dice 51 (vivos) + 9 (muertos) = **60**. ¿El 19 es un error de escritura del 9?
2. **«~100 % más por nivel»:** en caliza no se cumple del verde al naranja: **45 → 50** de piedra (+11 %), y las rocas de piedra **bajan** de 25 a 20. Solo se cumple de naranja a rojo (Torres, +100 %). El hierro tampoco: **5 → 30** (×6) y luego +66 %.
3. **Piedra y hierro de pinos:** la tabla pone «—» en el Bosque de Pinos (piedra) y en todas el hierro. ¿Es que no hay o falta el dato?
4. **12 a 28 minutos a pie** no caben en nuestro mundo actual de 35×35 (cruzarlo toma segundos). Esos tiempos son del juego original y, para Supervivencia, ❓ **hay que decidir cuánto tarda de verdad el viaje** (ver 6.6).

### 6.6 Cómo llevarlo a Supervivencia

- **Mundo y zonas.** 💡 El mundo de 35×35 de hoy pasa a ser **la base** (el refugio, el punto 5 de la sección 3). Cada zona de farmeo sería **otro mapa aparte**, con su propio tamaño: verde más chico, rojo más grande. Hoy el tamaño `N = 35` es fija (`Uint8Array(1225)`); habría que hacerlo **variable por mapa**.
- **Viaje.** 🔜 Una **pantalla del mapa del mundo** con las 6 zonas (pinos al este, caliza al oeste de la base). Elegir una zona cuesta **energía** y hace el viaje. ❓ **Tiempo real del viaje:** 💡 comprimirlo (por ejemplo, 12 min → unos segundos de camino o una pantalla de carga) y dejar los minutos solo como *distancia relativa* verde < naranja < roja.
- **Energía.** 🔜 Un **recurso nuevo con barra** (15 / 22 / 33 por viaje). ❓ Cuánta energía máxima se tiene y cómo se recarga (💡 con tiempo y con comida de la sección 5.6).
- **Nivel del jugador.** 🔜 Hoy **no hay nivel ni experiencia**; para desbloquear la Arboleda (nivel 10) hace falta ese sistema. ❓ Cómo se gana el nivel (💡 por recursos juntados y enemigos derrotados). Datos del original en la **sección 11**.
- **Recursos.** ✅ Los de las zonas fáciles ya existen. 🔜 Faltan el **mineral de hierro** (vulto con pico; sección 5.1) y separar **leño de pino** y **de roble**. 💡 Los árboles de las zonas de pino dan leño de pino; los árboles de caliza, ❓ de roble o de pino. Un **árbol muerto** (9 leños en 3) sería un tipo nuevo de `OBJ`.
- **Cajas de botín.** 🔜 Objeto nuevo del mapa (como los vultos): se abre de un toque, da objetos según su nivel (1, 2 o 3) y **no reaparece** hasta que reaparezca la zona. ❓ Aparecen al generar la zona o se reponen.
- **Enemigos.** 🔜 Todo lo de **combate** depende del punto 4 de la sección 3. 💡 Tabla `ENEMIGOS`:

  | Enemigo | Aparece en | Qué hace (💡) |
  |---|---|---|
  | Zombi errante | 🟢🟠🔴 | Camina sin rumbo y ataca de cerca |
  | Mordedor rápido | 🟢🟠🔴 | Más rápido, poca vida |
  | Lobo gris | 🟢🟠🔴 | Animal que ataca en grupo |
  | Escupidor tóxico | 🟠🔴 | Ataca de lejos con veneno (❓ ver el estado de **veneno**, sección 5.6) |
  | Aplastador orondo | 🟠🔴 | Mucha vida y daño, lento |
  | Lobo rabioso | 🟠 (caliza) | Versión más fuerte del lobo |
  | The Big One | 🔴 pino | **Jefe**, casi imposible de matar |
  | Horda | 🔴 caliza | Muchísimos zombis a la vez |

- ✅ Ya existe lo necesario para que un enemigo camine y rodee obstáculos: la búsqueda en anchura + `suavizar()` de la sección 2 sirve también para ellos. ❓ Cuántos enemigos puede mover el juego sin bajar los cuadros por segundo (no se ha medido).
- **Tabla `ZONAS`.** 💡 Igual que `OBJ` y `RECETAS`, una tabla con: id, tipo (pino/caliza), nivel (verde/naranja/rojo), tamaño del mapa, cantidad de cada recurso, nivel y cantidad de cajas, lista de enemigos, energía de viaje y nivel de jugador requerido. Así cambiar una cifra es tocar una fila, no el código.
- ⚠️ **Guardado:** hoy `supervivencia_mundo_v2` guarda **un mundo**. Con zonas hay que guardar **varios mapas** (la base y cada zona visitada, con lo ya recogido) y la energía y el nivel. Eso entra en el `v: 3` que ya se propuso en 5.7: hacerlo **una sola vez** para ambas cosas.
- ❓ **¿Las zonas se reinician?** Hoy lo que se rompe **no vuelve** (sección 3, punto 3). 💡 Que cada zona se **reponga** al volver pasado un tiempo, o al salir y entrar, como en el juego original.

### 6.7 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** las tablas `ZONAS` y `ENEMIGOS` (con las 6 zonas de 6.2 y 6.3), sin cambiar el juego.
2. **Mapa de tamaño variable** y guardado de varios mapas (junto con el `v: 3` de la sección 5).
3. **La base** (el mundo actual) y una **pantalla del mapa del mundo** para elegir zona.
4. **Zonas verdes de pino y de caliza**, sin enemigos todavía, con los recursos de 6.2 y 6.3 (hierro y árbol muerto incluidos).
5. **Energía de viaje** y **tiempo de viaje comprimido.**
6. **Cajas de botín** de nivel 1.
7. **Enemigos básicos** (zombi errante, mordedor, lobo gris) y combate (sección 3, punto 4).
8. **Zonas naranjas y rojas**, enemigos especiales, jefe y hordas.
9. **Nivel del jugador** para desbloquear zonas y **reposición** de recursos.

### 6.8 Preguntas por decidir

1. ¿El mundo de 35×35 de hoy se convierte en la base?
2. ¿Qué tamaño tiene cada zona (en casillas)?
3. ¿Cuánto dura de verdad el viaje y qué se muestra mientras?
4. ¿Cuánta energía se tiene y cómo se recarga?
5. ¿Cómo se gana el nivel del jugador y qué más se desbloquea además de la Arboleda?
6. ¿Las zonas y las cajas se reponen?
7. ¿Los árboles de caliza dan leño de roble o de pino?
8. ¿Hay agua como objeto (el botín de Risco de Caliza la menciona y no está en 5.6)?
9. ¿Los números de 6.5 se corrigen (leños, +100 %, hierro)?
10. ¿Cuántos enemigos a la vez y con qué vida y daño cada uno?

---

## 7. Tiempos de recolección y tamaños de mapa (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Son las cifras de Last Day on Earth (tiempo de cada acción y tamaño de la base y las zonas) traducidas a lo que ya tiene Supervivencia, para ir metiéndolas **poco a poco**. Se junta con la sección 6 (zonas) y la 5 (herramientas y materiales). Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida).

### 7.1 Tiempos de recolección del juego original

El tiempo de una acción es **golpes ÷ velocidad de la herramienta** (golpes por segundo). Cada golpe tiene una animación de ~1 s. **No hay barra de progreso**: es golpe por golpe.

| Acción | Herramienta | Velocidad | Golpes | Tiempo aprox. |
|---|---|---|---|---|
| Talar pino | Hacha (piedra) | 0.9/s | 4 | ~4.4 s |
| Talar roble / fresno | Hacha de hierro | 1.1/s | 4 | ~3.6 s |
| Minar caliza | Pico (piedra) | 1.1/s | 1–3 | ~0.9–2.7 s |
| Minar hierro / cobre | Pico de hierro | 0.9/s | 2–4 | ~2.2–4.4 s |
| Recolectar fibra / bayas | Manos | — | 1 | ~1 s |

### 7.2 Cómo se compara con Supervivencia hoy

✅ Hoy un golpe sale cada **0.55 s** (`ENFRIAR`, ≈ 1.8 golpes por segundo) y hay **una sola** hacha y **un solo** pico (secciones 1 y 2).

| Recurso | Hoy: golpes | Hoy: tiempo (golpes × 0.55 s) | Original: golpes | Original: tiempo |
|---|---|---|---|---|
| Árbol (roble / pino) | 10 | 5.5 s | 4 | 3.6–4.4 s |
| Vulto de piedra | 8 | 4.4 s | 1–3 (caliza) | 0.9–2.7 s |
| Arbusto de bayas | 5 | 2.75 s | 1 | ~1 s |
| Piedra suelta y fibra | 1 (de un toque) | — | 1 | ~1 s |
| Hierro / cobre | 🔜 no existen | — | 2–4 | 2.2–4.4 s |

- Los **tiempos ya son parecidos** (el árbol tarda 5.5 s contra 4.4 s) aunque los golpes sean otros: en Supervivencia son más golpes y más rápidos, lo que da más movimiento en pantalla (animación del brazo, barra y grietas).
- 💡 **No cambiar los golpes** (ya probados y guardados en los mundos: un árbol a medio talar sigue a medio talar). Para acercarse al original, ajustar la **velocidad de cada herramienta**: `ENFRIAR = tiempo deseado ÷ golpes`. Ejemplo para el pino con 10 golpes y 4.4 s: 0.44 s por golpe.
- 🔜 **Herramientas por nivel** (el original tiene piedra y hierro):

  | Herramienta | En el original | 💡 En Supervivencia |
  |---|---|---|
  | Hacha de piedra | Pino | ✅ La «hacha» de hoy (3 piedras + 3 fibras) |
  | Hacha de hierro | Roble y fresno, más rápida | 🔜 Nueva: más rápida y **necesaria para el roble** (así pino y roble dejan de ser lo mismo; ver 5.1) |
  | Pico de piedra | Caliza | ✅ El «pico» de hoy (4 piedras + 3 fibras) |
  | Pico de hierro | Hierro y cobre | 🔜 Nuevo: necesario para hierro y cobre |

- ❓ Hoy ya hay **barra «golpes/total»** sobre el recurso. El original **no** la tiene. 💡 Dejarla: ayuda a saber cuánto falta, sobre todo con 10 golpes.

### 7.3 Cosas que no cuadran en los datos (❓ revisar)

1. **Velocidad por herramienta o por acción:** la tabla da 1.1/s al **pico de piedra** y 0.9/s al **pico de hierro** (más lento), y 0.9/s al hacha de piedra y 1.1/s al hacha de hierro (más rápida). Un pico de hierro más lento que el de piedra no tiene sentido; parece que la velocidad es **por material** (caliza, pino…) y no por herramienta. ❓ Aclarar antes de usar.
2. **Círculo de herramientas:** para minar hierro y cobre hace falta el **pico de hierro**, y para talar roble el **hacha de hierro**, pero el hierro sale justo de esas rocas (en la zona verde de caliza hay 5). ❓ ¿De dónde sale la **primera** herramienta de hierro? 💡 De una **caja de botín** de nivel 1 o 2, o se fabrica con **acero** que ya se tiene por otro camino. Dato nuevo: la *Scavenger's Crate* (evento) da hacha y pico de hierro (ver 9.8).
3. **Fresno:** aparece una tercera clase de árbol que **no está** en la sección 5.1 (solo pino y roble). ❓ ¿Se agrega?
4. **Bayas en 1 golpe:** hoy el arbusto cuesta 5 golpes (se talla a mano). ❓ ¿Se baja a 1?

### 7.4 Tamaños de mapa del juego original

El juego mide en **unidades** (u). No hay conversión oficial a metros.

| Zona | Tamaño (u) | Área (u²) |
|---|---|---|
| Base (Home) | 400 × 400 | 160 000 |
| Zonas verdes y naranjas | 600 × 600 | 360 000 |
| Zonas rojas | 800 × 800 | 640 000 |
| Minimapa (radio visible) | 100 u de radio | — |
| Bloque (pared) | 20 × 20 | 400 |

- **Velocidad de caminata:** 40 unidades por segundo (según la wiki).
- **Comparación con el mundo real** (si 40 u/s equivale a una caminata humana de ~1.4 m/s, **1 u ≈ 3.5 cm**):

  | Zona | Tamaño estimado |
  |---|---|
  | Base | ~14 × 14 m |
  | Verde / naranja | ~21 × 21 m |
  | Roja | ~28 × 28 m |
  | Minimapa | ~7 m de diámetro |

- ⚠️ Es una estimación: la escala real nunca se confirmó, y las zonas se sienten más grandes por el terreno, los obstáculos y el rodeo (no se camina en línea recta). Las comparaciones del texto original (apartamento, cancha de bádminton o de tenis) son aproximadas.
- ❓ **Cuadra con el viaje de la sección 6:** los **12 / 19 / 28 min** a pie son el viaje **entre la base y cada zona**, no dentro de ella. A 40 u/s son unas **28 800 / 45 600 / 67 200 unidades** (≈ **1.0 / 1.6 / 2.4 km** reales). Por eso el mapa completo equivale a varios km² aunque cada zona sea chica.

### 7.5 Traducción a casillas (💡)

Supervivencia mide en **casillas**. 💡 **1 casilla = 20 unidades**, que es justo el tamaño de un **bloque de pared** (así una pared ocupa una casilla; punto 2 de la sección 3):

| Zona | Unidades | 💡 Casillas | Casillas en total |
|---|---|---|---|
| Base | 400 × 400 | **20 × 20** | 400 |
| Verde / naranja | 600 × 600 | **30 × 30** | 900 |
| Roja | 800 × 800 | **40 × 40** | 1 600 |
| Minimapa (radio) | 100 | **5 casillas** de radio | — |
| Velocidad | 40 u/s | **2 casillas por segundo** | — |

- ✅ El mundo de hoy es de **35 × 35 = 1 225** casillas: queda **entre una zona verde y una roja**, y es mayor que la base propuesta (20 × 20). ❓ ¿Se convierte en la base (sección 6.6)? Entonces habría que **hacerlo más chico**, o subir la base a ~35 × 35 y las zonas en proporción (💡 verde/naranja 52 × 52, roja 70 × 70).
- ❓ **Velocidad del personaje:** el original es ≈ 2 casillas por segundo con esta escala. Habría que ver cuál es la de hoy en `juego-supervivencia.js` y compararla.
- Cruzar una zona a pie tomaría **10 s** (base), **15 s** (verde/naranja) y **20 s** (roja).
- 💡 **Tiempo para vaciar una zona verde de los recursos fáciles**, con las cifras del original: 27 pinos × 4.4 s ≈ **2 min** de golpes en Arbustos y Pinos; 25 rocas de caliza × ~1.8 s ≈ **45 s** y 5 de hierro × ~3.3 s ≈ **17 s** en el Risco de Caliza (sin contar la caminata). Sirve para ajustar cuánto «dura» una zona.
- ❓ **Minimapa:** hoy no hay. Con zonas de 30 × 30 a 40 × 40 y el zoom de dos dedos (0.55× a 1.8×), 💡 conviene un minimapa chico (radio de 5 casillas) en una esquina libre, respetando las esquinas reservadas del estándar.

### 7.6 Cómo encaja en el código

- 🔜 `HERR`: una tabla de herramientas (id, nivel, velocidad, qué recursos puede golpear), igual que `OBJ` y `RECETAS`. Hoy el pico y el hacha son dos banderas en `herr` y el golpe usa una sola constante `ENFRIAR`.
- 🔜 `OBJ` ya tiene golpes, herramienta y botín: se le agrega **qué nivel de herramienta pide** (hacha de piedra o de hierro, pico de piedra o de hierro).
- 🔜 `ZONAS` (sección 6.6) ganaría el **lado** del mapa (20, 30 o 40) en vez de usar un `N = 35` fijo.
- ⚠️ Guardado: las herramientas nuevas y los mapas de distinto tamaño entran en el **`v: 3`** que ya se propuso (secciones 5.7 y 6.6): hacerlo **una sola vez** para todo.

### 7.7 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** `HERR` y los lados de zona (20, 30, 40) en la tabla `ZONAS`, sin cambiar el juego.
2. **Velocidad por herramienta** (`ENFRIAR` por herramienta y por material), sin tocar los golpes de hoy.
3. **Herramientas de hierro** y **hierro y cobre** (depende de la sección 5.1 y de resolver el círculo de 7.3).
4. **Mapas de tamaño variable** (junto con las zonas de la sección 6.7).
5. **Minimapa.**

### 7.8 Preguntas por decidir

1. ¿La velocidad es por herramienta o por material (7.3, punto 1)?
2. ¿De dónde sale la primera herramienta de hierro?
3. ¿Se agrega el fresno?
4. ¿Se conservan los golpes de hoy (10 / 8 / 5) o se pasa a los del original (4, 1–3, 1)?
5. ¿El arbusto de bayas baja a 1 golpe?
6. ¿1 casilla = 20 unidades y qué tamaño final tienen la base y las zonas?
7. ¿El mundo de 35 × 35 se achica a 20 × 20 o la base sube a ~35 × 35?
8. ¿Hay minimapa y dónde?

---

## 8. Animales, lobos y zombis (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es el bestiario de Last Day on Earth (vida, velocidad, daño y dónde aparece cada uno) para ir llevándolo a Supervivencia **poco a poco**. Completa el punto 4 de la sección 3 y la tabla `ENEMIGOS` de 6.6. Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida). Los nombres van como en el original (inglés); entre paréntesis, el que parece ser su nombre en español de la sección 6.

### 8.1 Visión general

- Hay **4 animales pasivos**, **8 lobos**, **6 zombis comunes** (los de las zonas verde, amarilla y roja; la tabla 8.4 también trae 3 lobos, que ya están contados en los 8 lobos) y **18 zombis de ubicaciones especiales**.
- ✅ **Hoy en el juego no hay ningún animal ni enemigo.** Lo único «vivo» es el personaje.
- Los números son de la wiki del original. **Velocidad:** en unidades por segundo (u/s) del original; el jugador a pie va a **~39–40** (coincide con la caminata de 40 u/s de la sección 7.4).

### 8.2 Animales pasivos (no atacan)

| Animal | Vida | Velocidad | Zonas | Suelta |
|---|---|---|---|---|
| Ciervo | 25 | Muy rápida (al asustarse) | Todas las zonas de farmeo + Home | Carne cruda, cuero |
| Zorro | 50–80 | Rápida | Oak Bushes, zonas Frosty, zonas rojas | Carne, piel |
| Pavo silvestre | 35 | Muy rápida | Zonas amarillas y rojas | Carne |
| Carroña | 100 | — | Swamp Forest, Wild Bogs | — |

### 8.3 Lobos (hostiles)

| Lobo | Vida | Velocidad | Daño | Zonas |
|---|---|---|---|---|
| Lobo Gris | 40 | 45 (rápida) | 4 | Todas las zonas de farmeo (común en verdes) |
| Lobo Rabioso | 60 | 45 (muy rápida) | 8 | Zonas amarillas y rojas, Infected Forest, Airdrops |
| Lobo Alfa | 100 | 57 (muy rápida) | 30 | Pine Grove (raro, en manada de 3) |
| Lobo Enfermo | 100 | 57 | 30 | Zonas rojas, Infected Forest, Crooked Creek Farm |
| Lobo Infectado | 100 | 57 | 30 | Limestone Spires / Ridge (variante de Diseased) |
| Lobo de Esporas | — | — | — | Zonas de esporas (Old Mine, Sand Quarry) |
| Lobo Blanco | — | Muy rápida | 10 | Desolate Hills (zona Frosty) |
| Dire Wolf | — | — | — | Oak Bushes, Quarantine Zone |

- **Nota del original:** a **45** los lobos no se pueden escapar corriendo; los de **57** son aún más rápidos.

### 8.4 Zombis de las zonas de farmeo

Las cifras de cada zombi son **las mismas en todas las zonas**; cambia **cuánto aparece**. («Amarilla» es la dificultad media, la 🟠 **naranja** de la sección 6.)

| Zombi | Vida | Velocidad | Daño | Especial | 🟢 Verde | 🟠 Amarilla | 🔴 Roja |
|---|---|---|---|---|---|---|---|
| Zombie Errante | 40 | 14 (muy lenta) | 6 | — | ✔ | ✔ | ✔ |
| Fast Biter (mordedor rápido) | 80 | 43 (rápida) | 6 | — | raro | **amenaza principal** | minoría |
| Lobo Gris | 40 | 45 | 4 | — | ✔ | (ver 8.3) | (ver 8.3) |
| Floater Bloater (¿aplastador orondo?) | 240 | ~20–39 (lenta) | 10 | **30** (golpe de área) | raro | ✔ | ✔ |
| Toxic Spitter (escupidor tóxico) | 80 | 43 | 6 | **15** (escupe y deja un olor que atrae) | — | ✔ | **amenaza principal** |
| Toxic Abomination | 300 | Normal (~39) | 10 | Desgasta las armas | — | ✔ | ✔ |
| Lobo Rabioso | 60 | 45 | 8 | — | — | ✔ | ✔ |
| Lobo Enfermo | 100 | 57 | 30 | — | — | — | ✔ |
| The Big One | 1000 | Muy rápida | 50 | Armadura 300 (en rojas) | — | muy raro | ✔ |

### 8.5 Zombis de ubicaciones especiales

| Zombi | Vida | Velocidad | Daño | Ubicación |
|---|---|---|---|---|
| Frenzied Giant | 500 | Lenta / muy rápida (Hard) | 200 | Bunker Alfa, Destroyed Convoy |
| The Blind One | 1000 | 43 | 50 | Bunker Alfa (Hard Mode, F.3) |
| Brawler | 240 | — | 30 | Blackport PD |
| Explosive Zombie | 100–150 | — | 6 / 30 | Blackport PD, Bunker Bravo |
| Hungry Chomper | 240 | Normal → lenta | 15–30 | Blackport PD |
| Riot Zombie | 150 | Lenta | 20–30 | Blackport PD, Bunker Bravo |
| Infected Bull | 300 | 15 | 200 | Crooked Creek Farm |
| Savage Giant | 250 | 20 | 100 | Crooked Creek Farm, Basements |
| Ravager | 2000 | 9–43 | 20 | Crooked Creek Farm (jefe) |
| Rotten Yokel | 150 | 43 | 6 | Crooked Creek Farm |
| Crawler | 80 | — | 6 | Infected Forest, Basements |
| Witch | 2000 | Rápida | 30 | Infected Forest, Pine Bushes |
| Swamp Zombie | 100 | — | 6 | Swamp Forest, Wild Bogs |
| Screaker | 200 | — | 6 | Swamp Forest |
| Frozen Bloater | 300 | 20 | 15 | Wooded Foothills, Frosty Backwoods |
| Numb Zombie | 120 | 42 | 12 | Zonas Frosty, Bunker Alfa |
| Leshen | 1600 | — | — | Quarantine Zone (ritual) |
| Screech | 700 | — | — | Quarantine Zone (Army Base) |

- ❌ Casi todas estas ubicaciones **no existen** en Supervivencia (solo hay pino y caliza). Quedan como referencia para zonas futuras: 💡 los **búnkeres** (Alfa, Bravo) se juntan con la ropa NRBQ de la sección 5.4.

### 8.6 Resumen de velocidades

| Velocidad | Valor (u/s) | 💡 En casillas por segundo (1 casilla = 20 u, sección 7.5) | Quién la tiene |
|---|---|---|---|
| Muy lenta | 14 | 0.7 | Zombie Errante |
| Lenta | 20 | 1.0 | Floater Bloater, Frozen Bloater, Savage Giant, Infected Bull |
| Normal | ~39 | ~2.0 | Jugador a pie, Toxic Abomination |
| Rápida | 43–45 | 2.15–2.25 | Fast Biter, Toxic Spitter, Lobo Gris, Lobo Rabioso, Rotten Yokel |
| Muy rápida | 57 | 2.85 | Lobo Alfa, Lobo Enfermo, Lobo Infectado, The Big One |

- **Regla práctica del original:** con una caminata de ~40, los enemigos de **43+** te alcanzan corriendo y los de **57** te alcanzan incluso trotando. A los de **14–20** se les esquiva fácil.
- 💡 En números: un **lobo gris** (45) solo gana **0.25 casillas por segundo** al jugador (40); un **lobo alfa** (57), **0.85**. Aun así el lobo gris te da alcance, solo que despacio.

### 8.7 Cosas que no cuadran en los datos (❓ revisar)

1. **Nombres de dificultad:** aquí se dice «amarilla» y en la sección 6 «naranja». Es la misma. 💡 Dejar **naranja**.
2. **Qué sale en cada zona:** en 6.2 y 6.3 los **aplastadores orondos** (Floater Bloater) salen en la **naranja**, y aquí también aparecen «raro» en la **verde**. **The Big One** era solo del Bosque de Pinos (🔴), y aquí también sale «muy raro» en la amarilla.
3. **Lobos que la sección 6 no tiene:** el **Lobo Alfa** (manada de 3) vive en *Pine Grove*, que parece ser la **Arboleda de Pinos**; el **Lobo Infectado** vive en *Limestone Spires / Ridge*, o sea las **Torres** y el **Risco de Caliza**. ❓ ¿Se agregan?
4. **Witch en «Pine Bushes»:** una bruja de **2000 de vida** en *Pine Bushes* (¿las **Arbustos y Pinos**, que son la zona más fácil?). Parece otra zona del original; ❓ verificar antes de usarla.
5. **Velocidad del Floater Bloater:** «~20–39 (lenta)» en las tablas y «20» en el resumen.
6. **Datos faltantes:** Lobo de Esporas, Dire Wolf, Lobo Blanco (vida), Crawler, Swamp Zombie, Screaker y otros no traen velocidad o daño, y Leshen y Screech no traen daño. Hay que **inventarlos o dejarlos** hasta tenerlos.
7. **Sin vida del jugador ni daño de las armas:** los enemigos pegan **4 a 50** (y hasta 200), pero **no se dice cuánta vida tiene el jugador** ni cuánto daño hace cada arma. Sin eso no se puede balancear nada (ver 8.8).
8. **Nombre del cuero:** el ciervo suelta «cuero» y el zorro «piel»; la sección 5.1 solo tiene **Piel de animal**. ❓ ¿Es lo mismo?

### 8.8 Cómo llevarlo a Supervivencia

- **Tabla `ENEMIGOS`.** 💡 Completa la de 6.6: id, nombre, vida, **velocidad en casillas por segundo** (u/s ÷ 20), daño, rasgo especial, zonas y cuánto aparece en cada una. Hoy no existe.
- **Animales.** 🔜 Objetos que **se mueven**, no recursos fijos: el ciervo **huye** al acercarte (muy rápido solo al asustarse, mientras tanto camina despacio), el zorro y el pavo igual. Entran en la lista `ents` para ordenarse por profundidad. Al matarlos **sueltan** carne cruda y cuero o piel. ❓ **Con qué se cazan** (💡 arco o martillo; las manos no).
- **Carne cruda.** 🔜 Objeto nuevo. 💡 Comer cruda quita poco o enferma; cocinada (con fuego, sección 3 punto 2) alimenta. No está en la lista de consumibles de 5.6.
- **Comportamiento.** 💡 Tres estados para cualquier enemigo: **errante** (camina sin rumbo), **perseguir** (te vio, usa la búsqueda en anchura de la sección 2) y **atacar** (a tiro, golpea cada cierto tiempo). ❓ **A qué distancia te ven** (no hay dato) y cuándo te pierden.
- **Rasgos especiales que cada uno pide:**

  | Rasgo | Enemigo | Qué hace falta en el juego |
  |---|---|---|
  | Golpe de área | Floater Bloater | Daño a varias casillas alrededor |
  | Escupir de lejos + olor que atrae | Toxic Spitter | Ataque a distancia, **veneno** (sección 5.6) y un «olor» que llama a otros |
  | **Desgasta las armas** | Toxic Abomination | **Durabilidad** de armas (pregunta abierta en 5.3; aquí aparece de nuevo) |
  | Armadura del enemigo | The Big One (300) | Hoy **no hay armadura** de ningún tipo (sección 5.4) |
  | Explota | Explosive Zombie | Zona lejana; para después |

- **Vida del jugador y daño de armas.** ❓ Antes de programar combate hay que fijarlos. 💡 Punto de partida: vida **100**, y el daño del arma que ya existe como herramienta (hacha y pico) como arma inicial. Con esos números, un zombi errante (40 de vida, 6 de daño) o un lobo gris (40 de vida, 4 de daño) son manejables y el lobo alfa (30 por mordida) mata en 4.
- **Cuántos a la vez.** ❓ Sin medir. Una zona de 40×40 con decenas de zombis necesita que solo se muevan los **cercanos al jugador** (como hace Imperio con los animales a más de 36 casillas) para que no baje el rendimiento.
- ⚠️ **Guardado:** si los enemigos y animales **se guardan** con su vida y posición, entran en el **`v: 3`** que ya se propuso (secciones 5.7, 6.6 y 7.6): una sola vez para todo. 💡 Más simple: **no guardarlos**; al abrir la zona se vuelven a generar.
- **Qué suelta un zombi:** cuerda, tela y cupones, y los lobos carne cruda y cuero; con porcentajes en **9.6**. ❓ Falta decidir cuáles se usan.

### 8.9 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** la tabla `ENEMIGOS` con los de las zonas de pino y caliza (8.2, 8.3 y 8.4) y velocidades en casillas por segundo, sin cambiar el juego.
2. **Vida del jugador** y su barra (sección 3, punto 3), y **muerte y reaparición**.
3. **Animales pasivos** (ciervo, zorro, pavo): huir, cazar con arma y soltar carne cruda y cuero.
4. **Zombi errante y lobo gris** en las zonas verdes: errante, perseguir y atacar.
5. **Fast Biter** y **Lobo Rabioso** (zonas naranjas).
6. **Rasgos especiales:** golpe de área (Floater Bloater), escupir (Toxic Spitter), desgaste de armas (Toxic Abomination).
7. **Lobos pesados** (Alfa, Enfermo, Infectado) y **The Big One** en las zonas rojas.
8. **Ubicaciones especiales** (búnkeres y demás) cuando existan sus zonas.

### 8.10 Preguntas por decidir

1. ¿Cuánta vida tiene el jugador y qué daño hace cada arma?
2. ¿Se conserva la velocidad del original o se ajusta (casillas por segundo)?
3. ¿A qué distancia ven los enemigos al jugador?
4. ¿Con qué se cazan los animales?
5. ¿El cuero y la piel son el mismo objeto?
6. ¿Qué sale en cada zona: se corrigen las diferencias entre las secciones 6 y 8 (aplastadores, The Big One)?
7. ¿Se agregan el Lobo Alfa a la Arboleda de Pinos y el Lobo Infectado a la caliza?
8. ¿Qué sueltan los zombis?
9. ¿Los enemigos se guardan en el mundo o se vuelven a generar?
10. ¿Qué pasa cuando el jugador muere?

---

## 9. Botín: cofres, cajas y drops (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es la referencia de Last Day on Earth sobre qué trae cada cofre y caja y qué sueltan los enemigos, para ir llevándola a Supervivencia **poco a poco**. Completa las «cajas de botín» de 6.6, el «qué suelta un zombi» de 8.8 y las listas de objetos de la sección 5. Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida). Los nombres van como en el original (inglés); `(0-2)` significa «de 0 a 2 unidades».

### 9.1 Visión general

- El original **no publica** el % exacto de cada objeto. Lo **confirmado** es el **sistema de niveles**: el nivel de la zona (1, 2 o 3) decide **qué calidad** de objetos puede salir, no cuánta cantidad. Las frecuencias de las tablas 9.2 son **estimaciones de la comunidad**.
- Solo hay % exactos en dos casos: la **Weapon Crate** (9.5, medido con n = 200) y los **drops de enemigos** (9.6).
- Cada visita a una zona trae **~3–4 cofres**, y **cada cofre tiene ~25 % de salir vacío** («Nothing»).
- ✅ **Hoy en el juego no hay cofres, cajas ni drops de enemigos.** Lo único que se recoge son los recursos del mapa (piedra, fibra, bayas, madera) y no existen armas, comida ni medicinas como objetos.

### 9.2 Cofres de las zonas de farmeo

**🟢 Verde (nivel 1)**

| Item (cantidad) | Función | Frecuencia |
|---|---|---|
| Rope (0-2) | Fabricar cuerdas, arcos, redes | Alta |
| Piece of Cloth (0-2) | Fabricar vendas y ropa | Alta |
| Scrap Metal (0-2) | Reciclable → tornillos, cables | Alta |
| Duct Tape (0-1) | Reparar y fabricar | Media |
| Transistor (0-1) | Electrónica, circuitos | Media |
| Bolts (0-2) | Fabricación general | Alta |
| Bottle of Water (1-3) | Beber | Alta |
| Canned Food / Baked Beans (1-3) | Comer | Alta |
| Juicy Steak (1-2) | Comer (mejor que las latas) | Media |
| Bandages (2-5) | Curar heridas leves | Alta |
| Plant Fiber (1-3) | Fabricar cuerdas y vendas | Media |
| Baseball Bat | Arma cuerpo a cuerpo (daño 17) | Rara |
| Spear | Arma cuerpo a cuerpo (daño 20) | Rara |
| Hatchet / Pickaxe (de piedra) | Talar / minar | Rara |
| Ration Coupon (0-1) | Canjear en Bunker Alfa (20 = 1 caja) | Baja |
| Nothing | — | ~25 % |

**🟠 Amarilla / naranja (nivel 2)**

| Item (cantidad) | Función | Frecuencia |
|---|---|---|
| Rope (0-3), Piece of Cloth (0-3), Scrap Metal (0-3), Bolts (0-3) | Fabricación y reciclaje | Alta |
| Duct Tape (0-2) | Reparar | Media |
| Transistor (0-2) | Electrónica | Media |
| Baked Beans / Jerky (2-5) | Comer | Alta |
| First Aid Kit (1-2) | Curar heridas graves | Media |
| Expensive Watches (0-1) | Reciclable → circuitos | Baja |
| Mobile Phone (0-1) | Reciclable → transistores | Baja |
| USB Drive (0-1) | Reciclable → circuitos | Baja |
| Survival Kit Coupon (0-1) | Canjear en Bunker Alfa (25 = 1 caja) | Baja |
| Ration Coupon (0-1) | Canjear en Bunker | Baja |
| Identification Tags (0-1) | Reputación en el búnker (Hard Mode) | Baja |
| Machete | Cuerpo a cuerpo (daño 22) | Rara |
| Crowbar | Cuerpo a cuerpo (daño 17) + abrir cosas | Rara |
| Cleaver | Cuerpo a cuerpo (daño 24) | Rara |
| Metal Pipe | Cuerpo a cuerpo (daño 26) | Rara |
| Nothing | — | ~25 % |

**🔴 Roja (nivel 3)**

| Item (cantidad) | Función | Frecuencia |
|---|---|---|
| Rope (0-5), Piece of Cloth (0-5), Scrap Metal (0-5) | Fabricación y reciclaje | Alta |
| First Aid Kit (1-3) | Curar | Media |
| Expensive Watches (0-1), USB Drive (0-1), Mobile Phone (0-1) | Reciclables | Media |
| Survival Kit Coupon (0-1) | Canjear en Bunker | Media |
| CAC Cards A-D (0-1) | Reputación en el búnker | Baja |
| Chevron (0-1) | Reputación Hard Mode | Baja |
| Combat Gear Coupon (0-1) | Canjear en Bunker (30 = 1 caja) | Muy baja |
| Military Notebook (0-1) | Reputación Hard Mode | Muy baja |
| Glock 17 | Arma de fuego (daño 20) | Rara |
| Katana | Cuerpo a cuerpo (daño 35) | Rara |
| Saw Blade Mace | Cuerpo a cuerpo (daño 30) | Rara |
| Skull Crusher | Cuerpo a cuerpo (daño 40) | Rara |
| Shotgun | Arma de fuego (daño 70) | Muy rara |
| M16 | Arma de fuego (daño 12) | Muy rara |
| Nothing | — | ~25 % |

### 9.3 Resumen: qué da cada zona

| Tipo de objeto | 🟢 Verde | 🟠 Naranja | 🔴 Roja |
|---|---|---|---|
| Comida básica (latas, agua) | ✅ | ✅ | ✅ |
| Curación | Vendas | First Aid Kit | First Aid Kit |
| Recursos básicos (rope, cloth, scrap) | ✅ | ✅ | ✅ (más cantidad) |
| Herramientas de piedra | ✅ | — | — |
| Cuerpo a cuerpo básicas (bate, lanza) | ✅ | — | — |
| Cuerpo a cuerpo intermedias (machete, palanca, cleaver) | — | ✅ | ✅ |
| Cuerpo a cuerpo avanzadas (tubo, katana, skull crusher) | — | Rara | ✅ |
| Armas de fuego (Glock, M16) | — | Muy rara | Rara |
| Armas de fuego pesadas (Shotgun, AK-47) | — | — | Muy rara |
| Cupones (Ration, Survival Kit) | Rara | Media | Media |
| Combat Gear Coupon | — | — | Muy rara (1 %) |
| CAC Cards | — | Baja | Media |
| ID Tags / Chevron (Hard Mode) | — | Baja | Media |

### 9.4 Daño de las armas que aparecen en los cofres

| Arma | Tipo | Daño | Dónde sale | ¿Ya está en 5.3? |
|---|---|---|---|---|
| Baseball Bat | Cuerpo a cuerpo | 17 | 🟢 | No |
| Spear | Cuerpo a cuerpo | 20 | 🟢 | No |
| Crowbar (Palanca) | Cuerpo a cuerpo | 17 | 🟠 | Sí |
| Machete | Cuerpo a cuerpo | 22 | 🟠 | No |
| Cleaver | Cuerpo a cuerpo | 24 | 🟠 | No |
| Metal Pipe | Cuerpo a cuerpo | 26 | 🟠 | No |
| Saw Blade Mace (Mazo con sierra) | Cuerpo a cuerpo | 30 | 🔴 | Sí |
| Katana | Cuerpo a cuerpo | 35 | 🔴 | Sí |
| Skull Crusher | Cuerpo a cuerpo | 40 | 🔴 | No |
| Glock 17 | Fuego | 20 | 🔴 | Sí |
| M16 | Fuego | 12 | 🔴 (muy rara) | No |
| Shotgun | Fuego | 70 | 🔴 (muy rara) | No |
| The Equalizer | Fuego | 15 | Cajas Sunken (reputación alta) | No |

- Esto da por fin **números de daño** (pregunta abierta de 5.3 y de 8.10). Sigue faltando la **vida del jugador** para balancearlos (8.7, punto 7).

### 9.5 Cajas especiales

| Caja | Cómo se consigue | Contenido |
|---|---|---|
| **Airdrop** | Cae al azar en zonas naranjas y rojas | 1 arma a ~50 % de durabilidad (Glock 17, Machete, Saw Blade Mace, Skull Crusher o Metal Pipe); 10 Pine Plank; 10 Iron Bar; 10 Stone Brick; Transistor 1-2; Bolts 1-2; Wiring 5/10/15; Ball Bearing 1-2; Rubber Parts 1-3; Iron Plate 1; pintura al azar (menos blanco) 1; Wrench 1; Truck Wheel 1; Duct Tape 1; patrón «Harvey» 1; Ration Coupon 1; Survival Kit Coupon 1 |
| **Sunken Box** | Entregas en Genesis | Glass 4-10; Fiberglass 1-5; Carbon Composite 1-4; Factory Parts 1-4; Gun Oil 1-3; Air Filter 1-2; Gasoline 2-5; Iron Plate 4-10; fragmentos del traje de titanio 2-5; First Aid Kit 2-5; Gas Mask 1; 1 pieza de set táctico o de set Hazmat (NRBQ); 1 arma de fuego (AK-47, Glock 17, M16, Mini Uzi o Shotgun); Electronic Circuit 1-2; Aluminium Plate 1-3; piezas y sensor de calor para torretas; Steel Plate 1-3; Propeller 1. Solo con reputación alta de entregas: **set SWAT completo** y **The Equalizer** |
| **Ration Box** | 20 Ration Coupons en Bunker Alfa | 1 arma o herramienta (AK-47, Baseball Bat, Crowbar, Glock 17, Golf Club, Mini Uzi, Shovel); 1 prenda básica (Beanie, Denim Jeans, Thick Jacket, Work Boots); First Aid Kit 1; Gasoline 1; pintura verde o roja 1; Iron Bar 5; Jerky 6-10; Lens 1; Nails 5; Spring 1; Thick Fabric 5; Wiring 5 |
| **Infected Box** | Infected Forest | 1-2 armas avanzadas (Colt Python, FN SCAR, Milkor MGL); Air Filter 1; Engine Part 1; Copper Bar 5; Iron Plate 10; Spring 5; Wrench 1; Gasoline 5; Gun Oil 3; First Aid Kit 10-15; pintura blanca 1; Steel Plate 2-5; Aluminium Bar 5; Aluminium Wire 10 |
| **Box of Spares** | Vehículos | Componentes electrónicos, mecánicos y de vehículo (cantidad variable) y 50 monedas |
| **Scavenger's Crate** | Evento | Bandages 3; Bolts 3; Duct Tape 3; Rubber Parts 3; Wiring 3; Transistor 3; Adhesive 3; Iron Bar 5; Common Plank 10; Stone Brick 10; Thick Fabric 3; Leather 3; Fur 3; **Iron Hatchet 1; Iron Pickaxe 1**; Shepherd Puppy 1; mochila «Sport» o «Neon» 1; Oak Plank 3 |
| **Present** (Navidad) | Evento | 🟩 Beanie, Thick Jacket, Denim Jeans, Work Boots, Cleaver, Metal Pipe, 10 Juicy Steak, 5 Bandages, 3 Plastic, 2 Spring · 🟦 set táctico completo, Machete, Winchester, 3 First Aid Kit, 3 Iron Plate, 2 Roasted Turkey · 🟪 set SWAT completo, Glock 17, Katana, Mini Uzi, Shotgun, 4 fragmentos de traje de titanio, 2 Steel Plate |
| **Key Card A+** | Bunker Alfa (Hard Mode) | 1 arma de fuego (Neutralizer, Mini Uzi, Glock 17, AK-47, M16, Ultimatum, Resonator o Protector); set CBRN completo (anti-radiación); a veces Reanimator; Inhaler 3-4; First Aid Kit 3-6; AntiRad 3-6 |
| **Floppy Crate** | Punto fijo del mapa original | Electronic Circuit 1; Air Filter 1; Engine Part 1; Copper Ore 10; Copper Bar 2; Iron Plate 10; Spring 2; Wrench 1; Gasoline 5; Gun Oil 3; Canned Food 10; Steel Plate 3; First Aid Kit 10; pintura blanca 1; Aluminium Plate 2; Aluminium Wire 10; set SWAT completo 1; AK-47 o VSS Vintorez 1; Gas Mask 1; C-4 Explosive 2; plano de mejora de arma 1; Lens 1 |
| **Weapon Crate** | Dealer Joe o eventos | Una sola arma con los % de abajo |
| **Survival Kit Box** | 25 Survival Kit Coupons en Bunker Alfa | Al azar, sin nada garantizado: armas de fuego (incluidas pesadas), partes de vehículos, provisiones médicas, equipo militar, patrones de color, recursos raros, gasolina |
| **Combat Gear Box** | 30 Combat Gear Coupons en Bunker Alfa | Al azar: armas modificadas y pesadas, partes de vehículos, equipo militar de alta durabilidad, patrones de color, recursos raros, gasolina |

**Weapon Crate (medido, n = 200):** Skull Crusher ~15.5 % · M16 ~13.5 % · Glock 17 ~13.5 % · Metal Pipe ~13.5 % · Machete ~13 % · Katana ~12 % · Shotgun ~9.5 % · Saw Blade Mace ~9.5 % (suman 100 %).

### 9.6 Drops de enemigos (no son cofres)

Los porcentajes van **en el mismo orden** que los objetos de cada fila.

| Enemigo | Objetos (en orden) | Probabilidades (en orden) |
|---|---|---|
| Roaming Zombie (Zombie Errante) | Rope 0-2, Cloth 0-2, Ration Coupon 0-1, ID Tags 0-1 | 50 / 25 / 25 / 15 % |
| Fast Biter | Rope 0-3, Cloth 0-3, Expensive Watches, CAC Cards, Ration Coupon, Survival Kit Coupon, ID Tags, Chevron (los seis últimos 0-1) | 50 / 25 / 15 / 15 / 25 / 5 / 25 / 15 % |
| Grey Wolf (Lobo Gris) | Raw Meat 0-1, Animal Rawhide 0-1 | 50 / 25 % |
| Rabid Wolf (Lobo Rabioso) | Raw Meat 0-1, Animal Rawhide 0-1 | 25 / 25 % |
| Floater Bloater | Rope 0-5, Cloth 0-5, Expensive Watches, CAC Cards A-D, Ration Coupon, Survival Kit Coupon, ID Tags, Chevron (los seis últimos 0-1) | 50 / 25 / 15 / 15 / 50 / 25 / 25 / 15 % |
| Toxic Spitter | Rope 0-5, Cloth 0-5, Expensive Watches, CAC Cards, Ration Coupon, Survival Kit Coupon, ID Tags, Chevron, Mobile Phone, USB Drive, Combat Gear Coupon (los nueve últimos 0-1) | 50 / 25 / 15 / 15 / 15 / 10 / 25 / 15 / 15 / 15 / 1 % |
| Toxic Abomination | Rope 0-6, Cloth 0-5, Expensive Watches, USB Drive, Mobile Phone, Ration Coupon, Survival Kit Coupon, Combat Gear Coupon (los seis últimos 0-1) | 50 / 50 / 15 / 15 / 15 / 50 / 25 / 15 % |

- Esto responde la pregunta de 8.8 y 8.10 («¿qué sueltan los zombis?»): **cuerda, tela y cupones**; los lobos sueltan **carne cruda y cuero** (el original le llama *Animal Rawhide*).
- Los **animales pasivos** (8.2) sueltan carne cruda, cuero o piel; aquí no hay tabla de % para ellos.

### 9.7 Cosas que no cuadran en los datos (❓ revisar)

1. **Cajas por visita:** aquí son **3–4** en las tres zonas, pero 6.2 dice **2–3** en Arbustos y Pinos.
2. **Botín por nivel:** 6.4 dice que el nivel 2 trae «partes de armas, componentes» y el 3 «armas de fuego (Glock, Katana)». Los cofres de 9.2 **no tienen partes de armas**, y la Katana es **cuerpo a cuerpo**, no de fuego.
3. **Resumen contra tabla:** el resumen 9.3 pone armas de fuego «muy rara» en la naranja, pero la tabla naranja **no tiene ninguna**. Y pone AK-47 como «muy rara» en la roja, pero el AK-47 **no sale en los cofres rojos** (solo en Ration Box, Sunken, Key Card y Floppy Crate).
4. **Daño del M16 (12)** es menor que el de la Glock (20) pese a ser más rara. Probablemente es **por bala** y el de la Shotgun (70) **por disparo completo**. ❓ Aclarar antes de usarlos.
5. **Frecuencias:** «Alta», «Media», etc. son estimaciones sin número. Hay que **inventar los pesos** (ver 9.8).
6. **Cuero:** ciervo suelta «cuero», zorro «piel», lobos «Animal Rawhide», y la Scavenger's Crate trae «Leather» y «Fur». ❓ ¿Son cuatro objetos o uno solo? (ya era la pregunta 8 de 8.7 y el «Piel de animal» de 5.1).
7. **Tablones:** el original distingue **Common, Pine y Oak Plank**; 5.2 tiene un solo «Tablones». ❓ ¿Uno o varios? (liga con el leño de pino y de roble de 5.1).
8. **Coordenadas reales:** la Floppy Crate trae una coordenada del mundo real; es un lugar del original y no se usa.
9. **Drops de enemigos:** los % vienen en lista aparte de los objetos, y es fácil desalinear uno. Por eso en 9.6 están en el mismo orden y conviene **revisarlos contra la wiki** antes de programarlos.

### 9.8 Cómo llevarlo a Supervivencia

- **Casi nada se puede usar ya.** Hoy solo existen fibra (✅ = Plant Fiber), piedra, madera y bayas. Lo demás depende de sistemas que no existen: mochila (5.7), vida, hambre y sed (3.3), armas y enemigos (3.4), reciclaje y refinado (5.2), búnker, reputación, entregas, vehículos, mascotas, torretas y pinturas.
- **Tabla `BOTIN`.** 💡 Igual que `OBJ` y `RECETAS`: por nivel (1, 2, 3), una lista de `{ item, min, max, peso }` y la probabilidad de «nada» (25 %). El rango «(0-2)» pasa a `min: 0, max: 2`.
- **Pesos.** 💡 Convertir las frecuencias en números: Alta 10 · Media 5 · Baja 2 · Rara 1 · Muy rara 0.5 (propuesta, se ajusta jugando). La **Weapon Crate** ya viene con % reales y sirve de primer ejemplo de tabla ponderada.
- **Cofre en el mapa.** 🔜 Objeto nuevo de `OBJ` (como los vultos): se abre con un toque, da objetos según su nivel y no reaparece (ver 6.6, «Cajas de botín»). ❓ La **Crowbar** del original «abre cosas»: 💡 candados y llaves de 5.5 para cajas cerradas.
- **Primer corte posible (nivel 1).** 💡 Un cofre verde con solo lo que ya tiene uso: Rope (= cuerda de 5.2), Plant Fiber, Scrap Metal, Duct Tape, Bolts y Cloth. El agua, las latas y las vendas esperan a hambre, sed y vida. ❓ Las herramientas de piedra (Hatchet / Pickaxe) **ya se fabrican** en 🛠️: ¿también salen de cofres?
- **Drops de enemigos.** 🔜 La tabla `ENEMIGOS` (6.6 y 8.8) gana el campo `suelta: [{ item, min, max, prob }]` con los % de 9.6.
- **Herramientas de hierro.** Ayuda a 7.3, punto 2 («¿de dónde sale la primera herramienta de hierro?»): la **Scavenger's Crate** (evento) da **hacha y pico de hierro**. 💡 Un cofre de nivel 2 o una caja de evento podría ser el primer camino.
- **Durabilidad.** El Airdrop da el arma **«a ~50 % de durabilidad»**: confirma que el original **sí** desgasta las armas (pregunta abierta de 5.3 y rasgo de la Toxic Abomination en 8.8).
- **Cupones, búnker y reputación.** ❓ Ration, Survival Kit y Combat Gear Coupons, CAC Cards, ID Tags y Chevron solo sirven en **Bunker Alfa**, que no existe. 💡 Dejarlos fuera hasta que haya una **estación de canje** en la base.
- **Airdrop.** 💡 Evento al azar en zonas naranjas y rojas; combina con el ciclo de día y noche (3.4) y con el Lobo Rabioso, que aparece en los airdrops (8.3).
- **Reciclar.** 💡 Scrap Metal, relojes, teléfonos y USB dan aluminio, plástico, cables y baterías (5.2 y 5.5).
- ⚠️ **Guardado:** los cofres ya abiertos por zona y los objetos nuevos entran en el **`v: 3`** que ya se propuso (5.7, 6.6, 7.6 y 8.8): **una sola vez** para todo.

### 9.9 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** `BOTIN` con los tres niveles de 9.2 y los drops de 9.6, sin cambiar el juego.
2. **Función `sacarBotin(nivel)`** con pesos y probabilidad de «nada», probada en Node (que ~25 % salga vacío).
3. **Cofre de nivel 1** en el mapa actual con objetos que ya tengan uso (necesita la mochila con ranuras de 5.8, paso 2).
4. **Drops de animales y zombis** cuando existan (8.9).
5. **Cofres de nivel 2 y 3** junto con las zonas naranja y roja (6.7).
6. **Reciclar** y las armas del botín (daño de 9.4).
7. **Cajas especiales y eventos:** airdrop, Weapon Crate, Scavenger's Crate.
8. **Lo lejano:** búnker, cupones, reputación, entregas, vehículos, mascotas, torretas, pinturas.

### 9.10 Preguntas por decidir

1. ¿Cuántos cofres por visita (6.2 dice 2–3 y 9.2 dice 3–4)?
2. ¿Se conserva el ~25 % de cofres vacíos y los pesos propuestos?
3. ¿Cómo se abre un cofre: un toque, con palanca o con llave?
4. ¿Los objetos llevan nombre en inglés o en español?
5. ¿Las herramientas de piedra salen de cofres aunque ya se fabrican?
6. ¿Se incluyen cupones y búnker, o quedan fuera por ahora?
7. ¿Cuero, piel, Animal Rawhide, Leather y Fur son uno o varios objetos?
8. ¿Hay durabilidad en armas (el Airdrop da armas a ~50 %)?
9. ¿Se agregan airdrops y cajas de evento o solo cofres de zona?
10. ¿Se usan los daños de 9.4 y el M16 con daño por bala?

---

## 10. Objetos creables y nivel en que se desbloquean (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es la lista de *blueprints* (planos) de Last Day on Earth con lo que cuesta cada objeto y el **nivel del jugador** en que se desbloquea, para ir llevándola a Supervivencia **poco a poco**. Completa el panel 🛠️ de la sección 1, las `RECETAS` de la sección 2, el «refinar» de 5.2 y el «nivel del jugador» de 6.6. Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida). Los nombres de materiales van como en el original (inglés); el objeto lleva su nombre en español entre paréntesis. ⚠️ en la tabla = pide un material que **no existe en el juego normal** (Titan Bar, Tungsten Bar, Ash Plank…) y puede no ser creable (ver 10.5).

### 10.1 Visión general

- El original tiene **~178 blueprints**; las fuentes traen **75** (los de abajo), repartidos en **17 niveles**. Los otros **~103** están en niveles que no se documentan.
- Los blueprints se desbloquean **por nivel del jugador** (0, 2, 6, 10, …, 88, casi siempre de 2 en 2 o de 4 en 4) y unos pocos **por misión**.
- ✅ **Hoy en el juego solo hay 2 recetas** (hacha y pico en 🛠️) y **no hay nivel ni experiencia**. Todo lo de esta sección **depende** de un nivel de jugador (6.6) y de una mochila (5.7).

### 10.2 Blueprints por nivel

| Nivel | Objeto | Materiales |
|---|---|---|
| **0** | Hatchet (Hacha de piedra) | 3 Pine Log, 3 Limestone |
| 0 | Pickaxe (Pico de piedra) | 3 Pine Log, 3 Limestone |
| 0 | Spear (Lanza) | 3 Pine Log |
| **2** | Small Box (Caja pequeña) | 3 Pine Log, 5 Plant Fiber |
| 2 | Campfire (Fogata) | 5 Pine Log, 5 Limestone, 1 Plant Fiber |
| 2 | Garden Bed (Huerto) | 5 Pine Log, 1 Plant Fiber |
| 2 | Basic Backpack (Mochila básica) | 2 Rope, 3 Plant Fiber |
| 2 | Woodworking Bench (Banco de carpintería) | 10 Pine Log, 5 Iron Ore |
| 2 | Shower (Ducha) | 10 Pine Log, 1 Piece of Cloth, 3 Iron Ore |
| **6** | Melting Furnace (Horno de fundición) | 10 Limestone, 5 Iron Ore |
| 6 | CB Radio (Radio CB) | 3 Pine Plank, 5 Iron Bar, 1 Wiring |
| 6 | Makeshift Bat (Bate improvisado) | 5 Pine Plank, 3 Duct Tape |
| 6 | Rain Catcher (Colector de lluvia) | 10 Pine Log, 3 Piece of Cloth, 2 Scrap Metal |
| 6 | Chopper (Motocicleta, fase 1) | 10 Pine Plank, 5 Iron Bar, 5 Bolts |
| **10** | Bandages (Vendas) | 5 Piece of Cloth |
| 10 | Bow (Arco) | 5 Pine Plank, 1 Iron Bar, 5 Rope, 3 Duct Tape |
| 10 | Dad Hat (Gorro) | 2 Plant Fiber, 1 Piece of Cloth |
| 10 | Shirt (Camisa) | 3 Plant Fiber, 3 Piece of Cloth |
| 10 | Cargo Pants (Pantalones cargo) | 3 Plant Fiber, 3 Piece of Cloth, 2 Rope |
| 10 | Sneakers (Zapatillas) | 2 Plant Fiber, 1 Piece of Cloth, 2 Rope |
| **14** | Stonecutter's Table (Mesa de cantería) | 20 Pine Plank, 10 Iron Bar, 5 Scrap Metal |
| 14 | Torch (Antorcha) | 5 Pine Log, 1 Animal Rawhide, 2 Rope |
| 14 | Chest (Cofre grande) | 10 Pine Plank, 2 Iron Bar, 4 Bolts, 1 Small Box |
| 14 | Iron Hatchet (Hacha de hierro) | 5 Iron Bar, 3 Pine Plank, 2 Nails, 5 Duct Tape |
| 14 | Iron Pickaxe (Pico de hierro) | 5 Iron Bar, 3 Pine Plank, 2 Nails, 5 Duct Tape |
| 14 | Meat Dryer (Secadero de carne) | 5 Pine Plank, 12 Rope, 10 Limestone |
| 14 | Tanning Rack (Marco de curtido) | 15 Pine Plank, 5 Iron Bar, 15 Rope, 5 Scrap Metal |
| **18** | Doormat (Felpudo) | 15 Plant Fiber, 5 Animal Rawhide, 10 Rope |
| 18 | Spike Trap (Trampa de pinchos) | 10 Pine Plank, 10 Rope, 2 Scrap Metal |
| 18 | Cleaver (Cuchillo carnicero) | 5 Iron Bar, 5 Leather, 4 Pine Plank |
| 18 | Sewing Table (Mesa de costura) | 20 Pine Plank, 15 Iron Bar, 5 Rubber Parts |
| 18 | ATV (Quad, fase 1) | 25 Iron Bar, 20 Pine Plank, 15 Wiring, 15 Bolts, 10 Duct Tape |
| **22** | Crowbar (Palanca) | 7 Iron Bar, 3 Leather |
| 22 | Beanie (Gorro de lana) | 3 Thick Fabric, 5 Rope, 5 Piece of Cloth |
| 22 | Thick Jacket (Chaqueta gruesa) | 5 Thick Fabric, 7 Rope, 5 Leather |
| 22 | Denim Jeans (Jeans) | 5 Thick Fabric, 7 Rope, 5 Leather |
| 22 | Work Boots (Botas de trabajo) | 1 Thick Fabric, 7 Rope, 8 Leather |
| 22 | Fishing Rod (Caña de pescar) | 3 Pine Plank, 5 Duct Tape, 5 Rope, 3 Adhesive |
| **28** | Workbench (Banco de trabajo) | 15 Pine Plank, 10 Iron Bar, 4 Stone Brick |
| 28 | Radio Tower ⚠️ (Torre de radio) | 8 Oak Plank, 10 Titan Bar, 15 Wiring, 25 Scrap Metal |
| 28 | Nail Board (Tablero de clavos) | 5 Pine Plank, 8 Nails, 3 Duct Tape |
| 28 | Floor Lamp (Lámpara de pie) | 7 Iron Bar, 1 Copper Bar, 5 Thick Fabric, 3 Wiring, 2 Duct Tape |
| 28 | Clan Banner ⚠️ (Banderín de clan) | 15 Thick Fabric, 20 Ash Plank, 10 Nails |
| 28 | Houseplant (Planta de interior) | 2 Pine Plank, 1 Empty Bottle, 5 Plant Fiber, 10 Carrot Seeds |
| **32** | Recycler (Reciclador) | 20 Pine Plank, 5 Iron Plate, 10 Duct Tape, 20 Bolts, 10 Rubber Parts |
| **34** | Shovel (Pala) | 8 Pine Plank, 7 Iron Bar, 5 Nails |
| 34 | Gunsmith Bench (Banco de armero, fase 1) | 15 Pine Plank, 25 Iron Bar, 20 Rubber Parts, 20 Nails |
| 34 | Zip Gun (Pistola casera) | 2 Steel Bar, 4 Weapon Parts, 5 Duct Tape, 3 Bolts, 1 Oak Plank |
| 34 | Trip Wire Trap (Trampa de alambre) | 5 Oak Plank, 3 Rope, 10 Empty Can |
| 34 | Spiked Devastator (Maza con pinchos) | 10 Iron Bar, 5 Empty Can, 5 Leather, 8 Nails |
| 34 | Medical Table (Mesa médica) | 20 Pine Plank, 15 Iron Bar, 7 Nails, 3 Duct Tape, 5 Iron Plate |
| 34 | First Aid Kit (Botiquín) | 2 Alcohol, 3 Bandages |
| 34 | Electric Generator (Generador eléctrico) | 10 Iron Plate, 15 Bolts, 5 Aluminium Bar, 5 Wrench |
| **40** | Dining Table (Mesa de comedor) | 15 Pine Plank, 15 Nails, 5 Empty Can |
| 40 | Kitchen Stove (Estufa de cocina) — se desbloquea con misión | 10 Iron Bar, 15 Pine Plank, 10 Stone Brick, 10 Scrap Metal, 5 Adhesive |
| **46** | Home Brewery (Cervecería casera) | 15 Steel Bar, 5 Oak Plank, 5 Empty Bottle, 10 Empty Can |
| **52** | Metal Pipe ⚠️ (Tubo de metal) | 10 Titan Bar |
| 52 | Machete | 15 Iron Bar, 3 Pine Plank, 12 Leather |
| 52 | Hand Pump ⚠️ (Bomba manual) | 15 Titan Bar, 10 Ash Plank, 12 Nails |
| 52 | Wiring (Cableado) | 1 Copper Bar, 1 Piece of Cloth, 1 Duct Tape |
| **64** | Saw Blade Mace (Maza con sierra) | 15 Iron Bar, 10 Pine Plank, 5 Duct Tape, 5 Scrap Metal, 12 Leather |
| **76** | M16 ⚠️ | 4 Weapon Parts, 8 Tungsten Bar, 5 Ash Plank |
| **82** | Assault Helmet ⚠️ (Casco de asalto) | 20 Thick Fabric, 5 Leather, 4 Titan Bar |
| 82 | Assault Body Armor ⚠️ (Chaleco de asalto) | 20 Thick Fabric, 7 Leather, 5 Titan Bar |
| 82 | Assault Trousers ⚠️ (Pantalones de asalto) | 20 Thick Fabric, 7 Leather, 5 Titan Bar |
| 82 | Assault Boots ⚠️ (Botas de asalto) | 18 Thick Fabric, 5 Leather, 3 Titan Bar |
| 82 | AK-47 ⚠️ | 4 Weapon Parts, 7 Tungsten Bar, 5 Ash Plank |
| 82 | Electronics Lab ⚠️ (Laboratorio electrónico) | 15 Tungsten Bar, 17 Ash Plank, 14 Wiring |
| 82 | Explosive Material (Material explosivo) | 10 Gunpowder, 5 Gasoline, 20 Aluminium Bar, 20 Duct Tape, 25 Plastic |
| **88** | Safe ⚠️ (Caja fuerte) | 20 Tungsten Bar, 5 Ash Plank, 7 Ball Bearing, 5 Hi-Tech Components |
| 88 | Electronic Circuit ⚠️ (Circuito electrónico) | 4 Tungsten Bar, 5 Wiring, 2 Hi-Tech Components, 5 Copper Bar |
| 88 | C-4 Explosive ⚠️ (Explosivo C-4) | 20 Tungsten Bar, 15 Weapon Parts, 20 Hi-Tech Components, 18 Explosive Material |
| 88 | The Dragunov ⚠️ (Francotirador) | 5 Weapon Parts, 10 Tungsten Bar, 5 Ash Plank |
| 88 | Turret ⚠️ (Torreta) | 8 Weapon Parts, 15 Tungsten Bar, 5 Hi-Tech Components, 10 Ball Bearing, 8 Wiring |
| 88 | Mortar ⚠️ (Mortero) | 8 Weapon Parts, 15 Tungsten Bar, 20 Ball Bearing, 15 Wiring |

### 10.3 Niveles sin datos

- No están documentados los niveles **26, 36, 38, 42, 44, 48, 50, 54 a 62, 66 a 74, 78, 80, 84 y 86**: se añadieron en actualizaciones posteriores a 2018. Hay que **inventarlos o dejarlos vacíos** hasta tener la lista completa (la mejor fuente es la wiki Fandom, que se actualiza con cada parche).

### 10.4 Blueprints que se desbloquean por misión (no por nivel)

| Objeto | Misión | Materiales |
|---|---|---|
| Sewing Table | «Self Defense» | 20 Pine Plank, 10 Iron Bar, 5 Rubber Parts, 5 Adhesive |
| Kitchen Stove | «My home is my fortress» | 10 Iron Bar, 15 Pine Plank, 10 Stone Brick, 10 Scrap Metal, 5 Adhesive |
| Laboratory | «The finish line» | 16 Oak Plank, 3 Titanium Alloy, 20 Wiring, 15 Protective Fabric, 16 Rubber, 5 Carbon Composite |
| Gunsmith Bench | Misión del Survivor's Path | 20 Pine Plank, 10 Iron Bar, 10 Rubber Parts, 5 Adhesive, 10 Bolts, 2 Small Box |

### 10.5 Objetos que no se pueden crear (solo botín o eventos)

| Objeto | Por qué |
|---|---|
| Glock 17 | Pide Gunpowder, que no se fabrica |
| Shotgun, M16, AK-47, The Dragunov | Tungsten Bar y Ash Plank |
| VSS Vintorez | Titanium Bar y Ash Plank |
| Kevlar Helmet / Armor / Trousers / Boots | Titanium Bar |
| Tactical Backpack, Bear Trap, Torture Device, Pipe, Horse Saddle | Titanium Bar |
| Land Mine | Tungsten Bar y Explosive Material |
| Mortar | Tungsten Bar |
| Mi-24 Helicopter | Tungsten Bar y Ash Plank |
| Repair Station, Zombie Truck, Chemistry Station | Titanium Bar y Ash Plank |

### 10.6 Cómo se compara con Supervivencia hoy

| | Hoy en Supervivencia | Original |
|---|---|---|
| Hacha | ✅ 3 piedras + 3 fibras | 3 Pine Log + 3 Limestone (nivel 0) |
| Pico | ✅ 4 piedras + 3 fibras | 3 Pine Log + 3 Limestone (nivel 0) |
| Hacha / pico de hierro | 🔜 No existen (7.2) | Nivel 14: 5 Iron Bar + 3 Pine Plank + 2 Nails + 5 Duct Tape |
| Lanza | 🔜 No existe | Nivel 0: 3 Pine Log |
| Cuerda | 🔜 No existe | Se usa en muchas recetas (refinada, ver 10.7) |
| Mochila | 🔜 No existe (5.7) | Nivel 2: 2 Rope + 3 Plant Fiber |
| Ropa «básica» | 🔜 No existe (5.4) | Nivel 10: Dad Hat, Shirt, Cargo Pants, Sneakers |
| Ropa «resistente» | 🔜 No existe | Nivel 22: Beanie, Thick Jacket, Denim Jeans, Work Boots |
| Arco | 🔜 No existe (5.3) | Nivel 10: 5 Pine Plank + 1 Iron Bar + 5 Rope + 3 Duct Tape |

- ✅ El panel 🛠️ de hoy ya sirve como base: una lista de recetas con costo. Lo que le falta es **nivel**, **estación** y los materiales refinados.

### 10.7 Cosas que no cuadran en los datos (❓ revisar)

1. **Hacha y pico de nivel 0 piden Pine Log**, pero en Supervivencia los árboles **solo se talan con hacha**: sin troncos no hay hacha. Por eso hoy se fabrican con piedra y fibra (secciones 1 y 7.2). ❓ ¿Se dejan así, o se agregan **troncos sueltos** (ramas caídas, árboles muertos de 6.6) para que la receta del original funcione?
2. **Objetos en las dos listas:** M16 (nivel 76), AK-47 (82), The Dragunov (88), Mortar (88) y Metal Pipe (52) salen como **creables** y también como **no creables**. La nota ⚠️ del original lo explica: piden materiales que en el juego normal no existen (Titan Bar, Tungsten Bar, Ash Plank), así que **no sirven**. 💡 Tratar todos los ⚠️ como **no creables** hasta decidir lo contrario.
3. **Nombres de material:** aparecen **Titan Bar** y **Titanium Bar** (¿el mismo?), **Titanium Alloy**, **Tungsten Bar**, **Ash Plank**, **Hi-Tech Components** y **Weapon Parts**, que no están en la sección 9 ni en la 5.2.
4. **Recetas repetidas con distinto costo:** la **Sewing Table** (nivel 18: 15 Iron Bar, sin Adhesive; misión: 10 Iron Bar + 5 Adhesive) y el **Gunsmith Bench** (nivel 34 «fase 1» y misión) no cuestan lo mismo. Parece que hay **fases** o dos versiones. ❓ Tomar la de nivel.
5. **Wiring llega tarde:** se fabrica en el nivel **52**, pero la Radio CB (6), el Quad (18) y la Lámpara (28) ya lo piden. Salvo que el cable también salga de **cofres** (sí sale, 9.5), el orden no cuadra.
6. **Faltan las recetas de refinado:** Pine Plank, Iron Bar, Stone Brick, Rope, Nails, Steel Bar, Leather, Thick Fabric, etc. **no están en la lista**. Lo que sí se ve son las estaciones (Woodworking Bench nivel 2, Melting Furnace nivel 6, Stonecutter's Table nivel 14, Sewing Table nivel 18), que sugieren de dónde salen. 💡 Estimar el costo mientras no haya datos.
7. **Ropa «resistente» con pantalones:** 5.4 dice que el nivel Resistente **no trae pantalones**; aquí sí existe el **Denim Jeans**. Y 5.4 dice que el nivel Básico **no trae cabeza**; aquí existe el **Dad Hat**. Con esto ya hay **cuatro ranuras completas** en ambos niveles (responde la pregunta 7 de 5.9).
8. **Total de blueprints:** el original dice ~178, pero las fuentes traen 75 (10.1). Los **103 restantes** están en los niveles sin datos o son items que no se documentan.
9. **Nivel 40:** el **Kitchen Stove** aparece en el nivel 40 «por misión» y otra vez en la lista de misiones. Es el mismo; hay que decidir **una sola vía** de desbloqueo.

### 10.8 Cómo llevarlo a Supervivencia

- **Tabla `RECETAS`.** 💡 La de hoy (id, costo) gana: `nivel` (0, 2, 6…), `estacion` (ninguna, banco de carpintería, horno, mesa de cantería, banco de trabajo…), `costo: [{ item, n }]` y `clase` (herramienta, arma, ropa, mueble, trampa, vehículo…). Cambiar un costo es tocar una fila.
- **Nivel y experiencia del jugador.** 🔜 Es lo que **desbloquea** todo esto y hoy **no existe** (6.6). ❓ Cómo se gana (💡 por recursos juntados y enemigos derrotados). Ver la **sección 11**. El nivel 0 (hacha, pico, lanza) ya es el estado actual del juego.
- **Estaciones.** Responde la pregunta de 5.2 («¿una sola estación o varias?»): el original usa **varias**, cada una con su nivel: Woodworking Bench (2), Melting Furnace (6), Stonecutter's Table (14), Sewing Table (18), Workbench (28), Recycler (32), Gunsmith Bench (34), Medical Table (34), Electric Generator (34), Kitchen Stove (40), Home Brewery (46). 💡 En Supervivencia serían **objetos del mapa** que se construyen en la base (punto 2 de la sección 3) y se **tocan** para abrir su panel de recetas.
- **Categorías nuevas.** 🔜 Hoy solo hay herramientas. Esta lista agrega: **base** (cajas, fogata, huerto, ducha, colector de lluvia, secadero, marco de curtido, mesas), **trampas** (pinchos, alambre, tablero de clavos), **ropa**, **armas**, **vehículos** (Chopper, ATV) y **electrónica**. 💡 Programar de la más simple (tablas y mochila) a la más compleja (vehículos, torreta).
- **Qué se puede usar ya con lo que existe.** Con piedra, fibra y madera de hoy: Small Box, Campfire, Garden Bed, Basic Backpack (necesita Rope = fibra refinada), Dad Hat, Shirt. Todo lo demás pide refinados de 5.2.
- **Huerto y comida.** El Garden Bed y las semillas (Houseplant pide Carrot Seeds) abren la **agricultura**, que 3.3 (hambre y sed) todavía no contempla. ❓ ¿Se incluye?
- **Hacha y pico de hierro.** Completan 7.2 y 7.3: se desbloquean en el **nivel 14** y piden Iron Bar (Melting Furnace, nivel 6) y Nails.
- **Armas.** 9.4 da el daño y esta sección el **cómo se fabrican** las que se pueden: Spear (0), Makeshift Bat (6), Bow (10), Cleaver (18), Crowbar (22), Spiked Devastator (34), Machete (52) y Saw Blade Mace (64). **Katana, Skull Crusher, Glock, Shotgun y las demás armas de fuego solo salen de cofres** (10.5).
- ⚠️ **Guardado:** guardar qué recetas están **desbloqueadas**, las estaciones construidas y el nivel entra en el **`v: 3`** que ya se propuso (5.7, 6.6, 7.6, 8.8 y 9.8): **una sola vez** para todo.

### 10.9 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** la tabla `RECETAS` ampliada con los niveles 0 a 34 de 10.2 (los ⚠️ quedan fuera), sin cambiar el juego.
2. **Nivel y experiencia del jugador** con su barra (junto con la vida de 3.3).
3. **Mochila con ranuras** (5.8, paso 2) y el guardado `v: 3`.
4. **Refinar** (5.2 y 5.8, paso 4) con una primera estación: Woodworking Bench (nivel 2).
5. **Niveles 2 a 14:** caja, fogata, huerto, mochila, horno, ropa básica, mesa de cantería y herramientas de hierro.
6. **Armas y trampas** (niveles 6, 10, 18, 22) cuando existan los enemigos (8.9).
7. **Niveles 28 a 34:** banco de trabajo, reciclador, mesa médica, generador, banco de armero.
8. **Vehículos** (Chopper, ATV) junto con las zonas lejanas (6.7).
9. **Niveles 40 en adelante** y los niveles sin datos (10.3), cuando haya fuente.

### 10.10 Preguntas por decidir

1. ¿Los blueprints se desbloquean por nivel de jugador, por misión o por una mezcla?
2. ¿Cómo se gana el nivel (recursos, enemigos, misiones)?
3. ¿Hacha y pico se quedan con piedra y fibra o se pasa a troncos (10.7, punto 1)?
4. ¿Los ⚠️ (Titan, Tungsten, Ash) quedan fuera o se inventan esos materiales?
5. ¿Una estación por categoría o un solo banco de trabajo?
6. ¿Cuál es el costo de los refinados (planks, bars, nails, cuerda) que no vienen en la lista?
7. ¿Hay agricultura (huerto y semillas)?
8. ¿Se incluyen vehículos (Chopper, ATV)?
9. ¿Se inventan los niveles sin datos (26, 36, 38…) o se dejan vacíos?
10. ¿Los nombres van en inglés o en español?

---

## 11. Sistema de experiencia (XP) (notas del 10 nov 2026)

> **Nada de esta sección está programado.** Es el sistema de experiencia de Last Day on Earth (de dónde sale la XP, cuánta hace falta por nivel y qué la multiplica), para ir llevándolo a Supervivencia **poco a poco**. Es lo que **desbloquea** los planos de la sección 10 y las zonas de la 6 (Arboleda de Pinos, nivel 10). Marcas: ✅ ya existe · 🔜 por programar · ❓ por decidir · 💡 propuesta (no decidida). Las cifras son de la comunidad y de la wiki: la XP de enemigos **cambió entre versiones** y el original **no publica** la tabla completa de niveles.

### 11.1 Visión general

- La XP sube el **nivel del jugador**; cada nivel desbloquea blueprints (sección 10) y zonas (sección 6).
- El **tope actual** del original es el **nivel 209**; los únicos datos de XP llegan hasta el **99**.
- ✅ **Hoy en el juego no hay nivel ni experiencia**: se recolecta, se fabrica y se camina sin ganar nada. Todo esto es nuevo.

### 11.2 De dónde sale la XP

| Acción | XP | Notas del original | XP ÷ vida del enemigo |
|---|---|---|---|
| Recolectar un recurso (1 leño, 1 piedra, 1 fibra, 1 baya) | 10 | Cada golpe a un árbol o piedra da 10 | — |
| Talar un árbol completo (4 golpes) | 40 | | — |
| Minar una piedra o mineral (5 golpes) | 50 | | — |
| Matar Zombie Errante (40 de vida) | 40–50 | Varía según la versión | 1.0–1.25 |
| Matar Fast Biter (80) | 100 | | 1.25 |
| Matar Toxic Spitter (80) | 150 | | 1.88 |
| Matar Floater Bloater (240) | ~200 | Estimado | 0.83 |
| Matar Toxic Abomination (300) | ~250 | Estimado | 0.83 |
| Matar Lobo Gris (40) | ~40 | | 1.0 |
| Matar Lobo Rabioso (60) | ~80 | | 1.33 |
| Matar Lobo Alfa / Enfermo (100) | ~150 | | 1.5 |
| Matar The Big One (1000) | 1 000 | | 1.0 |
| Matar Witch (2000) | 1 000 | | 0.5 |
| Matar Turret | 400 | | — |
| Matar Crowd Zombie | 1 | «No vale la pena» | — |
| Reciclar objetos (Recycler) | Varía por objeto | Ejemplo: una Glock da 100 | — |
| Fabricar (crafting) | **0** | ❌ No da experiencia | — |

### 11.3 Qué da y qué no da XP

| ✅ Sí da XP | ❌ No da XP |
|---|---|
| Recolectar recursos (cada golpe = 10) | Fabricar objetos |
| Matar enemigos (varía por tipo) | Construir en la base |
| Reciclar objetos en el Recycler | Moverse o explorar |
| Leer Survivor's Diaries y Magazines | |
| Misiones y contratos de temporada (dan **XP de temporada**, no de nivel) | |

- Las **notas de supervivientes** aparecen en las dos columnas en la fuente: dan XP, pero **solo una vez por nota** (ver 11.7).

### 11.4 XP necesaria por nivel

**Datos confirmados** (el original no publica la tabla completa):

| Dato | Valor | Fuente |
|---|---|---|
| Nivel 1 → 2 | ~100 XP | Comunidad (Reddit) |
| Nivel 40 → 41 | ~2 000 XP | Comunidad (Reddit) |
| Total hasta el nivel 99 | ~750 700 XP | GameGuardian |
| Tope de nivel | 209 | Centro de ayuda de Kefir |

**Curva estimada** (interpolada por la comunidad, no oficial): crece cada vez más; después del nivel 40 los incrementos son de miles de XP por nivel.

| Niveles | XP por nivel (aprox.) |
|---|---|
| 1–10 | 100 – 500 |
| 10–20 | 500 – 1 200 |
| 20–30 | 1 200 – 1 800 |
| 30–40 | 1 800 – 2 000 |
| 40–50 | 2 000 – 3 000 |
| 50–60 | 3 000 – 4 500 |
| 60–70 | 4 500 – 6 000 |
| 70–80 | 6 000 – 8 000 |
| 80–99 | 8 000 – 12 000 + |

💡 **Ritmo con esa tabla** (tomando el punto medio de cada rango; cálculo mío, no del original):

| Hasta el nivel | XP acumulada | Árboles de 40 XP |
|---|---|---|
| 10 | ~2 700 | ~68 |
| 20 | ~11 200 | ~280 |
| 30 | ~26 200 | ~655 |
| 40 | ~45 200 | ~1 130 |

### 11.5 Multiplicadores de XP

| Mejora | Efecto | Duración |
|---|---|---|
| Healer (semillas) | +100 % (doble) | 1 hora |
| B-Complex | +50 % | 1 hora |
| Perro con bono de XP | +5 % a +15 % | Permanente mientras el perro esté activo |
| Impulso de la tienda | +100 % | 24 horas (se paga con monedas) |
| Survivor's Diary | XP extra al leerlo | Instantáneo |
| Habilidad «Quick Learner» | +5 % por nivel (máx. 15 %) | Permanente |

- **Se suman**: Healer (+100) + B-Complex (+50) + perro (+15) = **+165 %**, o sea **~265 %** de XP (casi ×3). Es la forma más eficiente de farmear en el original.

### 11.6 Cómo se compara con Supervivencia hoy

Hoy cada recurso cuesta más golpes que en el original (secciones 1 y 7.2), así que dar **10 XP por golpe** pagaría mucho más:

| Recurso | Golpes hoy | XP a 10 por golpe | XP del original por recurso |
|---|---|---|---|
| Árbol (roble / pino) | 10 | **100** | 40 (4 golpes) |
| Vulto de piedra | 8 | **80** | 50 (5 golpes) |
| Arbusto de bayas | 5 | **50** | 10 por baya |
| Piedra suelta | 1 | 10 | 10 |
| Fibra | 1 | 10 | 10 |

- 💡 **Dar la XP por recurso terminado, no por golpe.** Así no hay que tocar los golpes (ya probados y guardados, 7.2) y se respetan las cifras del original: árbol 40, vulto 50, piedra y fibra 10, arbusto ❓ (10 por baya = 30–40 por arbusto, o 10 fijo).
- ✅ Ya existe el punto exacto donde se paga: `romper(k)` (sección 2) se llama al terminar de golpear, y el recoger piedra y fibra pasa por el mismo flujo.

### 11.7 Cosas que no cuadran en los datos (❓ revisar)

1. **La curva estimada no suma el total confirmado.** Con los puntos medios de cada rango, del 1 al 99 suma **~420 000 XP**, no los **750 700** de GameGuardian. Para llegar a ese total, del nivel 41 al 99 haría falta un promedio de **~12 000 XP por nivel**, más que el tope de «8 000 – 12 000 +» de la tabla. Es decir, la tabla estimada **se queda corta** o el total incluye algo más. Y una curva de segundo grado que pasara por los tres datos (100, 2 000 y 750 700) da **XP negativa** en los niveles bajos, así que no sirve.
2. **«Cada golpe da 10» o «cada recurso da 10»:** la fuente dice las dos cosas. Un árbol de 4 golpes da 40, lo que cuadra con «por golpe». ❓ Pero «recolectar 1 leño = 10» sugiere **por unidad**, y en Supervivencia un árbol da 3–5 de madera.
3. **Minar piedra:** aquí son **5 golpes (50 XP)**, pero 7.1 dice **1–3 golpes** en caliza y **2–4** en hierro y cobre. ❓ Cuál vale.
4. **Nivel de partida:** esta sección cuenta desde el **nivel 1** («1 → 2 = 100 XP») y la sección 10 empieza en el **nivel 0** (hacha, pico y lanza). ❓ Se empieza en 0 o en 1.
5. **Notas de supervivientes:** aparecen en «no da XP» y en «sí da XP, solo una vez». Parece que sí dan XP, una vez.
6. **XP contra vida:** no es proporcional (11.2). La **Witch** (2 000 de vida) da **1 000**, la mitad por punto de vida que el Zombie Errante, y el **Toxic Spitter** (80) da **150**, casi el doble. ❓ Los valores marcados «estimado» o «~» son aproximados y la propia fuente avisa que cambian entre versiones.
7. **Crowd Zombie** (1 XP) no está en la sección 8. ❓ Es un enemigo que no se documentó; por ahora se ignora.
8. **Tope 209 contra datos hasta 99:** de los niveles 100 al 209 no hay ninguna cifra, y la sección 10 llega solo al 88.
9. **Cálculo del +265 %:** supone que los bonos **se suman** (100 + 50 + 15). Si se multiplicaran (2 × 1.5 × 1.15) saldría ×3.45. ❓ La fuente no lo aclara.

### 11.8 Cómo llevarlo a Supervivencia

- **Recuento de XP.** 🔜 Un número `xp` y un `nivel` que se calcula a partir de él, más una barra de nivel. ❓ Dónde mostrarla: 💡 un chip en `.hud-info` (junto a los recursos), respetando las esquinas reservadas del estándar.
- **Tabla `XP`.** 💡 Igual que `OBJ`, `RECETAS` y `ENEMIGOS`: una tabla con la XP de cada recurso (11.6) y de cada enemigo (11.2). Para los enemigos, el campo `xp` va **dentro de la tabla `ENEMIGOS`** de 6.6 y 8.8, junto a vida, velocidad y daño. Cambiar una cifra es tocar una fila.
- **Tabla `NIVELES`.** 💡 Una lista con los XP por nivel (`xpPorNivel[n]`). Como el original no la publica, ❓ **hay que decidirla**: 💡 usar la tabla estimada de 11.4 (valores por tramo, o interpolados) y **subirla** si se quiere llegar a un total parecido a 750 700.
- **Dónde se da la XP.** 💡 En `romper(k)` (recursos), en la muerte de un enemigo (cuando existan, 8.9) y al **reciclar** (5.2 y estación Recycler del nivel 32 de la sección 10). **Fabricar no da XP**, así que el panel 🛠️ no cambia.
- **Qué se desbloquea con el nivel.** 🔜 Las recetas de la sección 10 (`RECETAS.nivel`), las zonas de la sección 6 y, si se agregan, las habilidades (Quick Learner). Hoy 🛠️ muestra solo hacha y pico: 💡 mostrar las recetas **bloqueadas** en gris con «Nivel N».
- **Multiplicadores.** ❓ Sin hambre, vida, perros ni tienda, hoy no hay con qué subirla. 💡 Dejarlos para después y empezar solo con la XP base. Las monedas del boost de tienda tampoco existen en este juego.
- **Cuenta y puntos.** Si algún día Supervivencia usa Firebase, la XP y el nivel entran en el progreso sincronizado (`unirRecientes` o un máximo de `xp`). Hoy el juego no usa puntos (sección 1).
- ⚠️ **Guardado:** `xp` (y `nivel`) entran en el **`v: 3`** que ya se propuso (5.7, 6.6, 7.6, 8.8, 9.8 y 10.8): **una sola vez** para todo.

### 11.9 Orden sugerido para programarlo (de uno en uno)

1. **Solo datos:** las tablas `XP` (recursos y enemigos) y `NIVELES` (XP por nivel), sin cambiar el juego.
2. **XP por recurso** en `romper(k)` con su texto flotante «+40 XP», y el contador guardado en `v: 3`.
3. **Nivel y barra de XP** en `.hud-info`.
4. **Recetas bloqueadas por nivel** en el panel 🛠️ (sección 10).
5. **XP al derrotar enemigos** cuando haya combate (8.9).
6. **Reciclar da XP** con el Recycler (nivel 32).
7. **Zonas por nivel** (Arboleda de Pinos en el nivel 10, sección 6) y habilidades.
8. **Multiplicadores** (Healer, B-Complex, perro, tienda, Quick Learner) si se agregan los sistemas que los sostienen.

### 11.10 Preguntas por decidir

1. ¿La XP se da por golpe o por recurso terminado (💡 por recurso)?
2. ¿Cuánta XP da cada recurso del juego (árbol 40, vulto 50, piedra y fibra 10) y cuánto el arbusto?
3. ¿Cuál es la tabla de XP por nivel y qué nivel máximo tiene el juego (el original llega a 209)?
4. ¿Se empieza en el nivel 0 o en el 1?
5. ¿Reciclar da XP y cuánta?
6. ¿Se incluyen los multiplicadores o se dejan para después?
7. ¿Las notas y diarios de supervivientes dan XP una sola vez?
8. ¿Los bonos de XP se suman o se multiplican?
9. ¿Cuánta XP da cada enemigo (los valores «estimados» de 11.2)?
10. ¿Dónde se ve la barra de nivel?
