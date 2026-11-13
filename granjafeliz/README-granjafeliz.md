# Granja feliz (`granjafeliz`)

Juego estilo Farm Frenzy 1, **solo horizontal** (en vertical pide girar el celular). Id de puntos: `granjafeliz`. Sigue `ESTANDARES-juegos.md`: menú principal estándar (♾️ Modo libre · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), mapa de 22 600 niveles (100 por estado y por país), madera clara/oscura, ☰ Pausa, chip de monedas.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-granjafeliz.html` | Menús, canvas del escenario y aviso «gira el celular» |
| `juego-granjafeliz.js` | Menú, mapa, **Modo libre (modos + pantalla de ajustes)**, partida (simulación + dibujo en canvas transparente), fin de nivel «Siguiente nivel ▶» sobre el tablero |
| `escena-granjafeliz.js` | Aspecto y posiciones del escenario. **`TAMANOS`** (original / mediano / grande) y `usarTamano(id)`, que reacomoda campo, cajas, espacios de edificio y botones de compra; dibuja fondo, casas, **pozo (arriba al centro), almacén (bodega, abajo al centro)**, camión, **zonas de pasto** (`dibujarPasto`) y **puntitos de hambre** (`dibujarPuntos`); `botonComprar` = botones de compra arriba a la izquierda |
| `tiempos-granjafeliz.js` | Fórmula de oro/plata para los niveles 11 en adelante (los 10 primeros llevan los tiempos escritos a mano) |
| `datos-granjafeliz.js` | **Aquí se agrega lo nuevo**: `PRODUCTOS` (valor y peso), `ANIMALES`, `EDIFICIOS` (recetas y costos), `MEJORAS`, `OSOS`/`PERRO`/`GATO`, `NIVELES`, `LIBRE` (las 5 dificultades del modo libre), `MODOS` (Juego original / Mod de Polo) y constantes (incluidas las del **hambre y el pasto**: `PUNTOS_COMIDA`, `PUNTOS_HAMBRE`, `SEG_HAMBRE`, `USOS_PASTO`, `SEG_CRECE_PASTO`, `CORRE`, `MAX_PASTO`) |
| `economia-granjafeliz.js` | Estrellas y monedas por nivel y marca del modo libre; progreso `granjafeliz_progreso_v1` (`{ e: {nivel: estrellas}, gastado, libre?: {dificultad: marca}, t }`) sincronizado con `conectar()` |

## Fuente de las cifras
Precios, valores, costos de mejoras y edificios, metas y tiempos de oro/plata de los **niveles 1-10** salen de una guía de fans de Farm Frenzy 1 (Cyberly, Sandy L., 2008): son cifras de una guía, no del juego mismo. Lo que dice «mío» en este README o en los comentarios de `datos-granjafeliz.js` (pesos, capacidades, tiempos, velocidades, cifras de polar y panda, etc.) es propuesta de este proyecto y se puede ajustar.

## Cómo se juega
Tocar el **pozo** (arriba al centro, 4 s) llena el agua → tocar el **campo** echa 1 de agua y brota una **zona de pasto** (un área de matas; máx. 12 zonas) → los animales con hambre corren a comerla y producen → tocar cada **producto del suelo** para llevarlo al **almacén** (la bodega de abajo; desaparece a los 12 s) → tocar el **camión** vende → **comprar** más animales (botones arriba a la izquierda). Con edificios, el producto se lleva a procesar antes de venderlo.

## Niveles y metas
- **Modelo del original:** el tiempo **no** hace perder el nivel. Cada nivel trae una lista de `metas` y termina al cumplir TODAS. Tipos: `dinero` (ventas del camión), `producto` (unidades recogidas al almacén; cuenta lo recogido aunque luego se venda, y lo que recoge el gato), `animal` (vivos a la vez), `edificio` (construido).
- **Condiciones de inicio** (opcionales, ver el comentario de `NIVELES` en `datos-granjafeliz.js`): `dineroInicial`, `aguaInicial`, `animales`, `edificios`, `construidos`, `regalo: ["gato","perro"]`, `mejoras: { almacen, camion, pozo }`, `comprables`, `osos`, `perro: false` y `pista` (consejo de 7 s debajo de las metas al empezar).
- **Existen los niveles 1 a 10 = niveles 1 a 10 de Farm Frenzy 1** (mismas metas, dinero y animales de inicio, y oro/plata; «pato» = gallina, «cupcake» = pastelito, «egg solids» = polvo). Del 11 en adelante avisa «todavía no está creado». Las plantas se construyen dentro del nivel (en el original se compran en una tienda con estrellas).

| Nivel | Metas | Inicio | Oro / Plata (s) |
|---|---|---|---|
| 1 | 4 huevos | $170, 2 gallinas | 40 / 90 |
| 2 | 10 huevos, 5 gallinas | $190, 2 gallinas; osos | 70 / 130 |
| 3 | 4 polvo, vender $300 | $190, 3 gallinas; planta de polvo | 100 / 160 |
| 4 | 2 gallinas, 10 polvo, vender $500 | $290, 1 gallina | 150 / 220 |
| 5 | 3 pastelitos, 6 gallinas | $190, 2 gallinas; planta y panadería | 150 / 240 |
| 6 | 5 gallinas, 15 polvo, 12 pastelitos | $240, 1 gallina | 270 / 330 |
| 7 | 10 polvo, 30 huevos, 1 oveja | $290, 3 gallinas; se compra oveja | 240 / 340 |
| 8 | 2 pastelitos, 7 gallinas | $20, 1 oveja (véndela por $500) | 170 / 240 |
| 9 | 1 oveja | $220, sin animales, con gato | 200 / 280 |
| 10 | 20 huevos, 5 polvo, 8 gallinas | $40, 6 gallinas; planta de polvo | 120 / 200 |

- **Calibración:** niveles 5-8 con los tiempos del original; 1-4, 9 y 10 más apretados porque este juego es más ágil (en el nivel 1 un jugador automático gana en ~9 s y el original da oro a los 60 s). **Falta probarlos con personas.**
- Se quitó el nivel 3 de pruebas (todos los animales, osos polar/panda, gato): ya no hay un nivel para probar vaca, tejeduría y osos grandes hasta que existan los niveles 11+.

## Estrellas y monedas
- **Medalla por tiempo:** oro (3★) si terminas en `oroSeg` o menos, plata (2★) en `plataSeg` o menos, completado (1★) si tardas más. Cada nivel trae sus dos tiempos. El tiempo cuenta con el juego en marcha (la pausa lo detiene) y se redondea hacia arriba en segundos: 40.0 s es oro, 40.01 s es plata. La barra de arriba muestra el reloj y la medalla que llevas en ese momento.
- **Monedas del portal:** 15 / 30 / 45 por nivel según la medalla; si mejoras solo pagan la diferencia. Repetir sin mejorar no da nada. **El Modo libre no da monedas ni estrellas.**
- Las monedas ganadas no se guardan como número: salen de las estrellas. Solo se guarda lo gastado (para la tienda y los boosts que vengan).
- **Al repetir un nivel** con una medalla peor que la que ya tienes, la ventana de fin muestra la de esa partida y añade «tu mejor: ★★★»; la marca guardada nunca baja y no se paga de nuevo.
- **Los niveles se abren en orden:** el mapa abre el siguiente a partir del más alto con alguna estrella (`avanceMapa`).

## Modo libre (♾️)
Partida **sin metas y sin límite de tiempo** sobre el mismo escenario. **No da monedas ni estrellas** (estándar del portal). Cada dificultad es un «nivel» a medida en `LIBRE` (`datos-granjafeliz.js`), con los mismos campos que `NIVELES`.

**Flujo (sesión 6):** ♾️ Modo libre → **dos botones: «🌾 Juego original» y «🛠️ Mod de Polo»** → **pantalla de ajustes** → ▶ Jugar. En la pantalla de ajustes, ☰ dice «Menú principal» (vuelve al menú); dentro de la partida, ☰ Pausa → Salir vuelve a los ajustes (se conservan las elecciones mientras la página siga abierta) y el fin de partida trae «Ajustes».

**Pantalla de ajustes:**
- **Barra de dificultad:** un punto que se desliza de izquierda a derecha por 5 pasos (Muy fácil · Fácil · Normal · Difícil · Experto = las 5 entradas de `LIBRE`); debajo sale la descripción (`pista`) de la dificultad elegida. Barra de colores verde → rojo.
- **Barra de tamaño de la granja:** 3 pasos (Original · Mediano · Grande), ver «Tamaños de la granja». El Juego original empieza en **Original**; el Mod de Polo en **Grande**; se puede cambiar en los dos.
- **Dinero inicial (solo pruebas):** caja para escribir (0 a 1 000 000 000), con ↺ para volver al dinero de la dificultad. **Si el dinero no es el de la dificultad, la partida es de prueba y NO guarda récord** (la barra de arriba dice «🧪 Prueba (sin récord)»). Así no se puede inflar el récord con dinero regalado.
- Muestra el **récord de esa combinación** (modo + tamaño + dificultad).

| Dificultad | Inicio | Se compra | Edificios | Osos |
|---|---|---|---|---|
| Muy fácil | $1,000, 4 gallinas; almacén, camión y pozo en nivel 2; gato de regalo | gallina, oveja | planta de polvo, panadería | no hay |
| Fácil | $500, 3 gallinas; almacén y camión en nivel 2 | gallina, oveja; gato | + hilandería | oso: primero a los 90 s, luego cada 60-90 s |
| Normal | $250, 2 gallinas | gallina, oveja, vaca; gato | los 4 | oso: 60 s, luego 45-60 s |
| Difícil | $150, 1 gallina | igual | los 4 | oso y polar: 40 s, luego 35-50 s |
| Experto | $100, 1 gallina | igual | los 4 | oso, polar y panda: 30 s, luego 25-40 s |

- **Edificios según el tamaño:** en tamaño Original son los de la dificultad (como antes). En Mediano y Grande **se llenan todos los espacios repitiendo en orden los edificios de la dificultad** (por ahora solo existen 4 tipos; se pueden tener varias plantas de polvo, por ejemplo). Los edificios nuevos llegan con el Mod de Polo.
- **Marca:** lo máximo que has **vendido con el camión en una sola partida** (las ventas de animales no cuentan). Se anota **sola con cada venta** que supera la marca, sin tener que terminar la partida; la barra de arriba muestra «💰 Vendido» y «🏆 Récord», y sale «¡Nuevo récord!» al superar una marca anterior. **Una marca por combinación:** la clave es solo la dificultad (`muyfacil`…) para Juego original + tamaño Original (las marcas que ya existían se conservan) y `modo_tamaño_dificultad` (`polo_grande_normal`, `original_mediano_facil`) para las demás. Va en el mismo progreso (`libre`) y se sincroniza con la cuenta; si no hay marcas, `libre` no se guarda.
- **☰ Pausa en el libre:** Continuar · 🏁 Terminar partida (muestra lo vendido y el récord, con «Jugar otra vez ▶» y «Ajustes») · 🔄 Empezar de nuevo · Salir (vuelve a los ajustes).
- **Las cifras son mías** (propuesta): ajustarlas jugando. La leche y la tela pesan 50, así que de Normal en adelante hay que mejorar almacén y camión antes de venderlas.

## Tamaños de la granja (sesión 6)
La granja tiene 3 tamaños, todos 16:9, definidos en `TAMANOS` (`escena-granjafeliz.js`). **Los niveles del mapa (México y mundo) usan siempre el Original (800×450, 4 espacios)**, que es el escenario con el que se calibraron; los otros dos solo existen en el Modo libre por ahora.

| Tamaño | Escenario | Espacios de edificio | Notas |
|---|---|---|---|
| Original (`pequeno`) | 800×450 | 4 (2 filas por lado) | Idéntico al escenario anterior (se comprobó: mismas medidas de campo, cajas, espacios y botones) |
| Mediano (`mediano`) | 960×540 | 6 (3 filas por lado) | Campo más ancho y alto |
| Grande (`grande`) | 1120×630 | **10** (4 filas por lado + 2 arriba, a los lados del pozo) | El campo empieza más abajo (y = 176) porque arriba hay espacios |

- Orden de los espacios: pares = columna izquierda, impares = derecha, de arriba abajo (0-1, 2-3, 4-5, 6-7); el 8 y el 9 están arriba a los lados del pozo (solo en Grande).
- `usarTamano(id)` cambia en el sitio `ESCENA`, `CAMPO`, `CAJAS` y `LAYOUT` (los que importan el módulo los ven al día); `juego-granjafeliz.js` lo llama en `aplicarTamano()` al empezar cada partida, que también cambia el tamaño del lienzo y las franjas ⬆.
- **Compromiso:** un escenario más grande se ve más pequeño en la pantalla (en un celular horizontal de 844×390, el Grande se dibuja a ~0.61 del tamaño real, contra ~0.84 del Original), así que los botones táctiles quedan más chicos. Si no se pueden tocar bien, la salida es agregar zoom/desplazamiento o subir el alto de las franjas.
- **Medido y probado:** las posiciones no se encimen entre sí ni con las cajas, los botones de compra, la barra de arriba o el campo (comprobación en Node, los 3 tamaños); en un navegador sin cabeza se construyó en los 10 espacios del Grande y en los de los otros dos tamaños, y el nivel 1 vuelve al Original después de jugar en Grande.
- El **chip de monedas del portal** (arriba a la derecha) cae encima de la barra del juego en pantallas bajas: el reloj ⏱ ahora se mueve a la izquierda del chip para no quedar tapado (`medirReserva()`).

## Mod de Polo (plan; solo el botón y el tamaño Grande están hechos)
Segundo botón del Modo libre. Es la versión «con más de todo»; lo que **ya existe**: el botón, la pantalla de ajustes y el tamaño Grande (10 espacios). Lo demás está **por construir**, tal como lo pidió Polo:
1. **Más animales y más productos** que el juego original (ahora solo gallina, oveja y vaca; huevo, polvo, pastelito, lana, hilo, tela, leche).
2. **Más almacenamiento.**
3. **Segunda vista (otro terreno):** un **botón-flecha a la derecha, al centro de la pantalla**, que apunta a la derecha y lleva a otra zona de campo, un terreno aparte (flecha de regreso a la primera). Ahí van:
   - **Bodegas para productos específicos**, para almacenar mucho material (una bodega por producto).
   - **Camiones de envío de un solo producto** (cada uno vende solo su producto).
4. **Los edificios tendrán unas 20 mejoras en total** (hoy tienen 4, de Nv 1 a 5). Por decidir: qué mejora cada nivel (lote, velocidad, cola, capacidad…) y cuánto cuesta.
5. **Edificios nuevos** para llenar los 10 espacios (hoy hay 4 tipos; en Mediano y Grande se repiten). Ligados a los productos nuevos (queso, mantequilla…).
- **Por decidir antes de construir:** si la segunda vista es otro escenario con sus propios espacios de edificio o si los 10 espacios de la primera ya bastan; si las bodegas y los camiones por producto reemplazan al almacén y camión únicos o conviven con ellos; y si el Mod de Polo tiene niveles/mapa propio o solo Modo libre.

## Niveles de México = los del juego original
Decisión de Polo: la zona de **México** (32 estados × 100 niveles) debe quedar **igual a los niveles originales de Farm Frenzy, o lo más parecida posible**. Hoy están los niveles 1 a 10 tomados de la guía de la versión 1 (ver «Niveles y metas»). **Pendiente:** ver un gameplay del original para contrastar metas, dinero y animales de inicio, tiempos y calendario de osos, y ajustar `NIVELES`; después seguir con los niveles 11 en adelante manteniendo ese estilo (el reparto de dificultad del estándar, sección 8, se aplica sobre el mismo mapa). Todos usan el tamaño de granja Original.

## Animales
Todo sale de `ANIMALES` (el juego los trata por datos). Nunca mueren de hambre.

**Hambre y pasto (sesión 7, como lo pidió Polo; constantes en `datos-granjafeliz.js`):**
- Cada animal trae **6 puntitos de comida** bajo las patas (verdes; se vuelven **rojos** con hambre). Bajan de 6 a **2 en 15 s** (`SEG_HAMBRE`, igual para todos los animales).
- Con **2 puntitos o menos** el animal deja de pasear al azar y **corre** (`CORRE` = 2.2 × su velocidad) hacia la zona de pasto libre más cercana. Si no hay pasto libre sigue paseando.
- Al **echar agua** no brota una mata, sino una **zona de pasto** (óvalo de 9 matas) que tarda 2 s en crecer (`SEG_CRECE_PASTO`; hasta entonces nadie come de ella). Cada zona se puede comer **3 veces** (`USOS_PASTO`), por animales distintos o el mismo: cada uso llena al animal (**vuelve a 6 puntitos**) y quita matas de la zona; al 3.er uso desaparece.
- Cada animal que va hacia una zona (o come de ella) **reserva un uso** (`pastoLibre()`): con 3 usos y 4 animales con hambre, solo 3 reservan.
- Sin pasto los puntitos siguen bajando hasta **0**: ahí el animal se queda quieto (😢) y su producción se **pausa** (mientras le quede algún puntito, produce). Los osos destruyen las zonas dentro de 2 casillas.

| Animal | Precio | Máx. | Ciclo | Producto |
|---|---|---|---|---|
| 🐔 Gallina | $100 | 12 | 5 s | huevo |
| 🐑 Oveja | $1,000 | 6 | 12 s | lana |
| 🐄 Vaca | $10,000 | 4 | 20 s | leche |

- Animales y precios como en la versión 1: gallina, oveja y vaca. **El pavo se quitó** (no existe en la versión 1), junto con su huevo. Ciclo y producto de oveja y vaca vienen de una conversación anterior con Gemini (sin confirmar); velocidad, máximo, tamaño y emoji son míos. Los campos `mordidas` y `segHambre` de cada animal **ya no existen** (ahora el hambre es igual para todos).
- **Comprar:** cada nivel dice cuáles con `NIVELES[n].comprables` (por defecto solo la gallina). Los botones van **arriba a la izquierda**, sobre la barra, como en Farm Frenzy (`ES.botonComprar`): uno por animal, de 58×52; los 32 de arriba **compran** (emoji, `cantidad/máx` y precio) y los 20 de abajo **venden**. El dinero, las metas, 🐕/🐈 y el reloj se recorren a la derecha (el dinero empieza después del último botón).
- **Vender animales:** cada botón de compra trae una zona 💲 que vende un animal por `VENTA_ANIMAL` (0.5) × precio. Coincide con la versión 1 ($50 / $500 / $5,000).

## Productos (valor / peso)
Valores de la versión 1; los **pesos son míos** (no existen en el original).

| Producto | Valor | Peso |
|---|---|---|
| 🥚 Huevo | $10 | 1 |
| 🧂 Polvo de huevo | $20 | 2 |
| 🧁 Pastelito (id `pan`) | $80 | 10 |
| 🧶 Lana | $100 | 10 |
| 🧵 Hilo | $200 | 20 |
| 🧣 Tela | $800 | 50 |
| 🥛 Leche | $1,000 | 50 |
| 🐻 Oso enjaulado | $100 | 10 |
| 🐻‍❄️ Polar enjaulado / 🐼 Panda enjaulado | $200 / $300 (míos) | 25 / 30 (míos) |

Faltan mantequilla ($2,000) y queso ($8,000) de la versión 1.

## Almacén, camión y mejoras dentro del nivel
- **Posiciones (sesión 7):** el **pozo** va **arriba al centro**; el **almacén** (antes una jaula arriba, que parecía jaula y no almacén) es ahora una **bodega de madera abajo al centro**, donde estaba el pozo, con cajas apiladas afuera según lo lleno que esté. El camión sigue abajo a la izquierda.
- **Almacén por peso:** lleno = no se recoge nada más. **Camión:** lleva un tope de peso por viaje; carga primero lo que más vale por peso y lo que no cabe se queda en el almacén. Si un producto pesa más que el camión avisa «No cabe en el camión».
- **Mejoras (almacén, camión y pozo):** cada caja tiene una franja «⬆ $costo · Nv N/5» al pie; tocarla paga la mejora con el dinero del nivel (dorada si alcanza; «Nivel máx.» al llegar al 5). Se reinician en cada nivel, igual que el dinero. Un nivel puede empezar con ellas ya compradas con `mejoras: { almacen, camion, pozo }`.

| Nivel | Almacén (capacidad · costo) | Camión (capacidad · viaje · costo) | Pozo (capacidad · costo) |
|---|---|---|---|
| 1 (base) | 30 · gratis | 10 · 6 s · gratis | 3 · gratis |
| 2 | 100 · $150 | 30 · 5 s · $300 | 9 · $300 |
| 3 | 300 · $500 | 100 · 4 s · $800 | 15 · $600 |
| 4 | 1,000 · $1,000 | 500 · 3 s · $1,500 | 25 · $1,200 |
| 5 (máx.) | 3,000 · $2,000 | 2,000 · 2 s · $5,000 | 50 · $5,000 |

Los costos son los de la versión 1; capacidades y tiempos son propios. El costo es lo que se paga por subir A ese nivel.

- **Pozo con mejoras (sesión 4):** la capacidad es cuántas cargas de agua guarda (cada zona de pasto gasta 1). Mejorar sube la capacidad pero **no regala agua**: hay que tocar el pozo y esperar para llenarlo. **Llenarlo siempre tarda 4 s** (`SEG_POZO`) hasta su capacidad, sea cual sea el nivel, y es gratis (el original cobra $1 por rellenar; aquí no). El nivel base es **3** y no 5 como decía la tabla vieja, para no cambiar los niveles 1-10 ya calibrados (empiezan con 3 cargas). Con más de 12 de capacidad ya sobra agua para todas las zonas de pasto posibles (`MAX_PASTO` = 12): es el equivalente del «infinito / 50 usos» del original. La caja del pozo se reacomodó para dejar sitio a la franja ⬆.

## Edificios de procesamiento
Cada nivel los lista en `NIVELES[n].edificios` (máx. 4 en los niveles, que usan el tamaño Original; el Modo libre llega a 6 en Mediano y 10 en Grande, ver «Tamaños de la granja») y aparecen como espacios vacíos en las columnas de los lados del campo (los animales y el pasto quedan entre ellas; ahí no se planta).

| Edificio (id) | Entra → Sale | Tiempo | Construcción → mejoras (costos) |
|---|---|---|---|
| 🏭 Planta de polvo (`panaderia`) | huevo → polvo | 3 s | $200 → 300 / 400 / 500 / 600 |
| 🧁 Panadería (`horno`) | polvo → pastelito | 6 s | $400 → 600 / 800 / 1,000 / 1,200 |
| 🧵 Hilandería (`hilanderia`) | lana → hilo | 4 s | $2,000 → 3,000 / 4,000 / 5,000 / 6,000 |
| 🧣 Tejeduría (`tejeduria`) | hilo → tela | 8 s | $4,000 → 6,000 / 8,000 / 10,000 / 12,000 |

Los nombres son los del original; **solo cambió el texto, los ids siguen siendo los de antes** (`panaderia` es la planta de polvo y `horno` la panadería). Los lotes 1 a 5 coinciden con el original.
- **Construir:** tocar el espacio vacío (paga `EDIFICIOS.costos[0]` con el dinero del nivel). `construidos: [ids]` deja edificios ya construidos al empezar.
- **Procesar:** tocar el edificio; descuenta del almacén hasta «lote» unidades, trabaja `seg` segundos y el producto sale al suelo junto al edificio (se recoge con un toque; si el almacén está lleno se queda en el suelo y desaparece a los 12 s).
- **Cola:** si ya está trabajando, cada toque agrega un lote (máx. 2, `MAX_COLA_EDIF`); los insumos se descuentan al tocar.
- **Mejorar:** franja «⬆ $costo · Nv N/5» al pie de cada edificio; sube el **lote** (`MEJORAS.fabricaN.lote`: 1, 2, 3, 4, 5 unidades por toque, mismo tiempo). `fabrica1` = planta de polvo e hilandería; `fabrica2` = panadería y tejeduría. Se reinicia en cada nivel.

## Osos, perro y gato
Un nivel activa los osos con `NIVELES[n].osos` y el gato con `regalo: ["gato"]`; el perro está en todo nivel con osos salvo que el nivel diga `perro: false` (los niveles 1-10 no lo tienen).
- **Osos:** entran por un lado del campo; van hacia el animal más cercano (si no hay, al pasto; si no, merodean). **Destruyen el pasto dentro de 2 casillas, eliminan los animales que tocan y borran los productos que pisan** (las jaulas no). Se capturan **tocándolos**: oso **3** toques, polar 9, panda 12 (barra amarilla de avance); al capturarlos dejan su **jaula**, que se recoge y se vende como producto (ver tabla de productos). La jaula del oso pesa 10 para que quepa en el camión base.
- **Calendario de osos** (`osos.horario`): los osos caen en los segundos de la guía (repetir un número = dos a la vez); al acabarse la lista siguen cayendo cada `osos.cada` segundos. Sin él, el dinero de los niveles 5-9 no alcanzaba, porque en el original las jaulas ($100) son el ingreso principal. Sin `horario`, el primero cae en `primero` (por defecto 25 s) y luego cada 35-50 s.
- **Perro 🐕:** botón en la barra de arriba ($100 cada vez, solo si hay un oso suelto; gratis con `regalo: ["perro"]`). Llega en 2-3 s y deja quieto al oso 5-8 s. Un perro a la vez. En la versión 1 cuesta $2,600 y se compra una vez: aquí sigue en $100 por llamada (por decidir).
- **Gato 🐈:** botón en la barra de arriba ($2,500 una vez por nivel, como en la versión 1; gratis con `regalo: ["gato"]`, y entonces ya viene contigo). **Recoge solo los productos del suelo** hacia el almacén (no las jaulas; si el almacén está lleno no recoge). Para que también recoja jaulas, quitar el filtro `jaula` en `actualizarGato()`.
- **Míos, para confirmar:** 1 casilla = 32 px (el escenario no tiene casillas), la velocidad de cada oso, el costo del perro, los valores y pesos de polar y panda (polar y panda no existen en la versión 1) y los emojis (🐻‍❄️ puede verse como dos símbolos en sistemas viejos).

## Decisiones confirmadas
- **Tiempos: se quedan los propios del juego (más ágiles que el original de 2006).** Camión: 6 s de ida y vuelta en el nivel base. Producto en el suelo: 12 s antes de desaparecer. Así la partida es activa y de clics rápidos, estilo arcade.
- Costos de mejoras y edificios, precios y valores: los de la versión 1 (ver tablas de arriba). Capacidades, tiempos y pesos: propios.
- Pozo: capacidad 3 / 9 / 15 / 25 / 50, llenado de 4 s y gratis (ver «Almacén, camión y mejoras»).

## Pruebas
- **Lógica en Node** (juego real, DOM falso): un jugador automático (2.5 y 1.5 toques/s, 3 partidas por nivel) ganó los niveles 1-10 en todas las corridas (el N6, de ~200-250 s, es el más largo; el N1, de ~9 s, el más corto). 35 comprobaciones de precios, costos, calendario de osos, regalos, venta y metas, todas bien. Antes se probaron también los animales (los cuatro producen y nadie pasa ~13 s seguido con hambre), los edificios (construir, sin dinero, sin insumos, cola, salida al suelo, mejora y lote) y los osos, perro y gato.
- **Pozo (sesión 4):** 13 comprobaciones con el juego real y un DOM falso, todas bien: base 3 / 3, la mejora cuesta $300 y no alcanza con $170, mejorar sube la capacidad sin dar agua, tocar la franja ⬆ no inicia el llenado, el llenado tarda 4 s hasta la nueva capacidad, plantar gasta agua, el nivel máximo dice «Nivel máx. 5/5» y se llena a 50 / 50, y `mejoras: { pozo: 2 }` empieza con capacidad 15.
- **Sesión 5 (juego real con DOM falso, 39 comprobaciones, todas bien):** datos coherentes (metas, tiempos oro < plata, ids que existen, máx. 4 edificios y 4 comprables, el pavo ya no está); estrellas y monedas (límites de medalla, 1★ → 3★ paga solo 30 más, repetir peor no paga ni baja la marca, tope de 45 por nivel, el mapa abre el siguiente nivel, gastar, fusionar dos progresos); modo libre (HUD sin metas ni medallas, no termina solo, la marca se guarda con la venta, no da estrellas ni monedas, Terminar partida, récord visible al volver y al empezar otra partida, Difícil y Experto con osos corren 45 s sin errores); y un nivel real jugado tres veces (2★ paga 30, 3★ paga 15 más, repetir con 2★ no baja ni paga).
- **Sesión 6 (navegador sin cabeza, 844×390):** pantallas de modos y ajustes sin errores de consola; la barra de dificultad y la de tamaño cambian los textos y el récord mostrado; con dinero distinto al de la dificultad sale «Prueba (sin récord)»; se jugó en los 3 tamaños y se construyó en todos los espacios (4 / 6 / 10); Pausa → Salir vuelve a los ajustes con lo elegido; el nivel 1 abre en el tamaño Original después de jugar en Grande. En Node: la geometría del tamaño Original es idéntica a la anterior y ningún tamaño tiene choques entre espacios, cajas, botones de compra y barra; las marcas con clave nueva se guardan, se fusionan y las claves inválidas se rechazan. **No se probó con dedos ni en un celular real** (tamaño táctil del punto de las barras y de las franjas ⬆ en el tamaño Grande).
- **Sesión 7 (Chromium real, 1000×560; juego con un gancho de prueba que avanza el reloj a mano):** hambre de 6 a 2 puntitos en 15.0 s y a 0 ocho segundos después, con la producción pausada en 0; la zona de pasto nace con 3 usos y tarda 2 s en crecer; con 4 animales con hambre y una zona de 3 usos solo 3 reservan, corren a 74.8 px/s (2.2 × 34), quedan en 6 puntitos y la zona desaparece; sin zona libre el animal con hambre sigue paseando. Capturas de los 3 tamaños, de los niveles 1 y 8 y de las dificultades Muy fácil, Normal y Difícil, sin errores de consola. Un jugador automático simple (toca huevos, vende, compra gallinas, atrapa osos) ganó el **nivel 1 en ~8.6 s** y el **nivel 2 en ~32.5 s** (oro 60 y 120).
- **Sin probar en celular.** El jugador automático es mejor que una persona novata: falta probar los niveles con personas y **ver el dibujo en pantalla**: tamaño táctil de las franjas ⬆ (28 en cajas, 26 en edificios) y de los espacios de edificio (138×70), los 3 botones de compra (gallina, oveja y vaca, ~38 de alto), los emojis grandes de vaca y oveja, la pista de 7 s, los nombres nuevos de edificios, el oso de 42 px con su jaula de barrotes, los botones 🐕/🐈 de 32 de alto la caja del pozo reacomodada (título arriba, agua en medio, franja ⬆ al pie) y los 5 botones de dificultad del modo libre en un celular horizontal (de poco alto se achican a 50 px).

## Por resolver
1. **Pesos contra capacidades:** la leche y la tela (50) no caben en el camión hasta su nivel 3 (100) ni en el almacén base (30) hasta el nivel 2; el pastelito (10) llena el camión base. Los niveles con esos productos deben dar antes las mejoras.
2. **Perro:** $100 por llamada (propuesta) o $2,600 una sola vez como en la versión 1.
3. **Edificios:** la cola (2 lotes) y los lotes por nivel (1 a 5) son propuesta mía en el modelo de cola; confirmar o cambiar en `MAX_COLA_EDIF` y `MEJORAS.fabricaN.lote`. Con los valores actuales procesar multiplica el valor de cada huevo pero también su peso: el camión pasa a ser el cuello de botella.
4. **Pozo:** si se quiere el cobro de $1 por rellenar del original, habría que agregarlo; hoy es gratis.
5. **Tabla de niveles desactualizada:** la tabla de «Niveles y metas» (oro/plata N1 40/90, N2 70/130, N3 100/160, N4 150/220, N9 200/280, N10 120/200) no coincide con `NIVELES` en `datos-granjafeliz.js` (N1 60/120, N2 120/180, N3 180/240, N4 210/270, N9 210/300, N10 210/270). El archivo de datos manda; falta decidir cuál es el bueno y corregir el otro.

6. **Calibración tras el nuevo hambre (sesión 7):** solo se re-probaron los niveles 1 y 2 con el jugador automático. Los niveles 3-10 y los tiempos de oro/plata se calibraron con el hambre vieja (por animal, con mordidas): hay que volver a pasarlos, sobre todo los que usan oveja y vaca (antes tenían hambre cada 24 y 40 s; ahora todos cada 15 s, y una vaca produce solo mientras le quede comida).
7. **Cifras mías del pasto:** `MAX_PASTO` = 12 zonas (antes 16 matas), `SEG_CRECE_PASTO` = 2 s y `CORRE` = 2.2. Los 15 s, los 6 → 2 puntitos y los 3 usos son de Polo. Por decidir: si un animal con hambre debería dejar de producir (hoy produce hasta llegar a 0 puntitos) y si dos toques de agua cerca deben juntarse en una zona.
8. **Almacén:** quedó como bodega abajo al centro en lugar de la jaula de arriba; si se prefiere otro sitio o dibujo, se cambia en `CAJAS` y `dibujarAlmacen` (`escena-granjafeliz.js`).

## Por construir poco a poco
1. **Paso siguiente:** subir `compartido/dificultad-niveles.js` y escribir el generador de niveles 11 a 22 600 (reparto de dificultad de la sección 8 del estándar: 50/40/10 al inicio hasta 25/40/35 al final). No cambiar después de publicar.
2. Queso y mantequilla (vaca), y pastelería / sastrería cuando haya receta cerrada.
3. Modo libre: ajustar las cifras de las 5 dificultades jugándolas. Ya tiene modos, barra de dificultad, tamaño y dinero de pruebas (sesión 6); falta el contenido del Mod de Polo (ver «Mod de Polo»).
4. Tienda y boosts con `eco.gastar()`; más estrellas por otras metas.
5. Confirmar cifras (ver «Por resolver») y un dibujo mejor que el emoji para los animales.
6. Imagen de tarjeta (`imagenes/granjafeliz.webp`, anotarla en `ARCHIVOS` de `sw.js`), fila y nota «Estado» en el README principal.
7. Probar todo en navegador y celular (ver «Pruebas»).

## Historial
- **Sesión 7:** sistema de **hambre** (6 puntitos bajo cada animal: de 6 a 2 en 15 s; con 2 corre a comer) y **pasto en zonas** (un área de matas con 3 usos, que crece en 2 s; cada uso llena al animal); el **pozo pasa arriba al centro** y el **almacén** es una bodega abajo al centro (se quita la jaula); botones de **comprar animales arriba a la izquierda**, con 🐕/🐈 y las metas recorridos; arreglo de los emojis de animales y productos, que se dibujaban casi transparentes (`emo()` ahora fija un `fillStyle` opaco).
- **Sesión 6:** Modo libre con dos botones (Juego original / Mod de Polo) y pantalla de ajustes: barra de dificultad con punto deslizante, barra de tamaño de la granja y dinero inicial de pruebas (sin récord); `TAMANOS` y `usarTamano()` en la escena (Original 4 / Mediano 6 / Grande 10 espacios de edificio); marcas del modo libre por modo, tamaño y dificultad; el reloj ya no queda bajo el chip de monedas; README con el plan del Mod de Polo y de los niveles de México.
- **Sesión 1:** metas + medallas por tiempo (base = Farm Frenzy 1); el tiempo ya no hace perder el nivel.
- **Sesión 2:** condiciones de inicio (`construidos`, `regalo`) y venta de animales.
- **Sesión 3:** precios, costos y niveles 1-10 de la versión 1; calendario de osos; campos `perro: false` y `pista`; se quitó el nivel 3 de pruebas.
- **Sesión 4:** pozo con mejoras (franja ⬆ en la caja del pozo, capacidad 3 / 9 / 15 / 25 / 50, `mejoras.pozo` en los niveles) y README al día con las notas de las sesiones 1 a 3.
- **Sesión 5:** se quitó el pavo (como la versión 1); modo libre con 5 dificultades y marca por dificultad (`LIBRE`, `libre` en el progreso); revisión del sistema de estrellas (ventana de fin con «tu mejor» al repetir peor; pruebas de monedas, mapa y fusión).
