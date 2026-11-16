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
| `salida-granjafeliz.js` | **Condición de derrota** (`sinSalida`): función pura, sin DOM, que dice si el jugador ya no tiene forma de avanzar. La revisa `juego-granjafeliz.js` cada 1 s. Se prueba con `prueba-salida-granjafeliz.mjs` (`node prueba-salida-granjafeliz.mjs`) |
| `economia-granjafeliz.js` | Estrellas y monedas por nivel y marca del modo libre; progreso `granjafeliz_progreso_v1` (`{ e: {nivel: estrellas}, gastado, libre?: {dificultad: marca}, t }`) sincronizado con `conectar()` |

## Fuente de las cifras
Precios, valores, costos de mejoras y edificios, metas y tiempos de oro/plata de los **niveles 1-10** salen de una guía de fans de Farm Frenzy 1 (Cyberly, Sandy L., 2008): son cifras de una guía, no del juego mismo. Lo que dice «mío» en este README o en los comentarios de `datos-granjafeliz.js` (pesos, capacidades, tiempos, velocidades, cifras de polar y panda, etc.) es propuesta de este proyecto y se puede ajustar.

## Cómo se juega
El **pozo** (arriba al centro) **empieza lleno y gratis**; cuando se vacía, tocarlo lo rellena (4 s, y cuesta $19 en el nivel base) → tocar el **campo** echa 1 de agua y brota una **zona de pasto** (un área de matas; máx. 12 zonas) → los animales con hambre corren a comerla y producen → tocar cada **producto del suelo** para llevarlo al **almacén** (la bodega de abajo; desaparece a los 12 s) → tocar el **camión** vende → **comprar** más animales (botones arriba a la izquierda). Con edificios, el producto se lleva a procesar antes de venderlo.

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
| Normal | $250, 2 gallinas | gallina, oveja, vaca; gato | los 4 (+ batidora y quesería en Mediano/Grande) | oso: 60 s, luego 45-60 s |
| Difícil | $150, 1 gallina | igual | los 4 (+ batidora y quesería en Mediano/Grande) | oso y polar: 40 s, luego 35-50 s |
| Experto | $100, 1 gallina | igual | los 4 (+ batidora y quesería en Mediano/Grande) | oso, polar y panda: 30 s, luego 25-40 s |

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
Valores de la versión 1. **Sesión 11:** cada producto tiene dos números: `espacio` (en el almacén; leche = 100) y `peso` (en el camión). El peso sale de las cajas de Farm Frenzy 1: una caja = 30 puntos y lleva un máximo de unidades, así que peso = 30 / máximo por caja. El espacio sigue el orden de la guía (cifras mías).

| Producto | Valor | Espacio (almacén) | Peso (camión) | Máx. por caja (guía) |
|---|---|---|---|---|
| 🥚 Huevo | $10 | 5 | 6 | 5 |
| 🧂 Polvo de huevo | $20 | 12 | 3 | 10 |
| 🧁 Pastelito (id `pan`) | $80 | 12 | 2 | 15 |
| 🧶 Lana | $100 | 30 | 10 | 3 |
| 🧵 Hilo | $200 | 30 | 6 | 5 |
| 🧣 Tela | $800 | 60 | 3 | 10 |
| 🥛 Leche | $1,000 | 100 | 15 | 2 |
| 🧈 Mantequilla | $2,000 | 100 (mío) | 6 | 5 |
| 🧀 Queso | $8,000 | 100 (mío) | 3 | 10 |
| 🐻 Oso enjaulado | $100 (la guía; antes $60) | 65 (el 65 % de la leche) | 30 | 1 |
| 🐻‍❄️ Polar enjaulado / 🐼 Panda enjaulado | $200 / $300 (míos) | 80 / 90 (míos) | 30 / 30 (míos) | — |

Los procesados rinden más por punto de peso: eso es del original y se conserva (ver «Carro (camión)»). Con el camión base de 60 cabe cualquier producto; con el almacén base de 100, la leche, la mantequilla o el queso lo llenan solos.


## Almacén, camión y mejoras dentro del nivel
- **Posiciones (sesión 7):** el **pozo** va **arriba al centro**; el **almacén** (antes una jaula arriba, que parecía jaula y no almacén) es ahora una **bodega de madera abajo al centro**, donde estaba el pozo, con cajas apiladas afuera según lo lleno que esté. El camión sigue abajo a la izquierda.
- **Almacén por espacio y camión por peso (sesión 11):** el almacén se llena con el `espacio` de cada producto y, lleno, no se recoge nada más. El camión lleva un tope de `peso` por viaje (se pueden mezclar productos); carga primero lo que más vale por peso y lo que no cabe se queda en el almacén. Si un producto pesa más que el camión avisa «No cabe en el camión».
- **Mejoras (almacén, camión y pozo):** cada caja tiene una franja «⬆ $costo · Nv N/5» al pie; tocarla paga la mejora con el dinero del nivel (dorada si alcanza; «Nivel máx.» al llegar al 5). Se reinician en cada nivel, igual que el dinero. Un nivel puede empezar con ellas ya compradas con `mejoras: { almacen, camion, pozo }`.

| Nivel | Almacén (capacidad · costo) | Camión (capacidad · viaje · costo) | Pozo (capacidad · costo) |
|---|---|---|---|
| 1 (base) | 100 · gratis | 60 · 20 s · gratis | 5 · gratis |
| 2 | 300 · $150 | 90 · 15 s · $300 | 9 · $300 |
| 3 | 1,000 · $500 | 120 · 12 s · $800 | 15 · $600 |
| 4 | 3,000 · $1,000 | 150 · 10 s · $1,500 | 25 · $1,200 |
| 5 (máx.) | 10,000 · $12,000 | 210 · 4 s · $5,000 | 50 · $5,000 |

Los costos son los de la versión 1; capacidades propias (sesión 11: el camión sale de las cajas de la guía, 2 / 3 / 4 / 5 / 7 cajas × 30, con sus tiempos de viaje; el almacén parte de 100). El costo es lo que se paga por subir A ese nivel.

- **Pozo con mejoras (sesión 4, actualizado en la sesión 8):** la capacidad es cuántas cargas de agua guarda (cada zona de pasto gasta 1). Mejorar sube la capacidad pero **no regala agua**. **El pozo empieza lleno y gratis en cada nivel** (`aguaInicial` ya no se usa). **Rellenarlo cuesta** $19 / $17 / $15 / $15 según el nivel de mejora (`MEJORAS.pozo.recarga`) y tarda 4 s (`SEG_POZO`) hasta su capacidad. El nivel base es **5** cargas. **Nivel 4 = rociador automático:** ya no hay agua ni que rellenar; cada parche de pasto cuesta **$7** (tocando el campo, o solo: ver «Pozo de agua» en la especificación). Con más de 12 de capacidad ya sobra agua para todas las zonas de pasto posibles (`MAX_PASTO` = 12). La caja del pozo se reacomodó para dejar sitio a la franja ⬆.

## Edificios de procesamiento
Cada nivel los lista en `NIVELES[n].edificios` (máx. 4 en los niveles, que usan el tamaño Original; el Modo libre llega a 6 en Mediano y 10 en Grande, ver «Tamaños de la granja») y aparecen como espacios vacíos en las columnas de los lados del campo (los animales y el pasto quedan entre ellas; ahí no se planta).

| Edificio (id) | Entra → Sale | Tiempo | Construcción → mejoras (costos) |
|---|---|---|---|
| 🏭 Planta de polvo (`panaderia`) | huevo → polvo | 3 s | $200 → 300 / 400 / 500 / 600 |
| 🧁 Panadería (`horno`) | polvo → pastelito | 6 s | $400 → 600 / 800 / 1,000 / 1,200 |
| 🧵 Hilandería (`hilanderia`) | lana → hilo | 4 s | $2,000 → 3,000 / 4,000 / 5,000 / 6,000 |
| 🧣 Tejeduría (`tejeduria`) | hilo → tela | 8 s | $4,000 → 6,000 / 8,000 / 10,000 / 12,000 |
| 🥣 Batidora (`batidora`) | leche → mantequilla | 10 s (mío) | $20,000 → 30,000 / 40,000 / 50,000 / 60,000 |
| 🧀 Quesería (`queseria`) | mantequilla → queso | 12 s (mío) | $40,000 → 60,000 / 80,000 / 100,000 / 120,000 |

Los nombres son los del original; **solo cambió el texto, los ids siguen siendo los de antes** (`panaderia` es la planta de polvo y `horno` la panadería). Los lotes 1 a 5 coinciden con el original. Costos de la batidora y la quesería: los de la versión 1; sus tiempos son propios (más largos mientras más arriba en la cadena).
- **Cadena de la leche (sesión 10):** vaca → 🥛 leche → 🥣 batidora → 🧈 mantequilla → 🧀 quesería → queso ($8,000 cada uno). Cada edificio se construye y se mejora igual que los demás (franja ⬆, lote de 1 a 5). Sus costos de hasta $120,000 achican la letra de la franja para que quepa (`txtFit` en `juego-granjafeliz.js`). Colores: batidora verde azulado, quesería ámbar (`ESTILOS` en `escena-granjafeliz.js`).
- **Dónde aparecen:** en los niveles solo si el nivel los lista en `edificios` (los niveles 1-10 no los usan). En el **Modo libre** van al final de la lista de Normal, Difícil y Experto (Fácil y Muy fácil no tienen vacas): el tamaño **Original** solo tiene 4 espacios, así que ahí no aparecen (`edificiosLibre` recorta la lista); en **Mediano** (6 espacios) salen los seis; en **Grande** (10) se repiten desde el principio.
- **Construir:** tocar el espacio vacío (paga `EDIFICIOS.costos[0]` con el dinero del nivel). `construidos: [ids]` deja edificios ya construidos al empezar.
- **Procesar:** tocar el edificio; descuenta del almacén hasta «lote» unidades, trabaja `seg` segundos y el producto sale al suelo junto al edificio (se recoge con un toque; si el almacén está lleno se queda en el suelo y desaparece a los 12 s).
- **Cola:** si ya está trabajando, cada toque agrega un lote (máx. 2, `MAX_COLA_EDIF`); los insumos se descuentan al tocar.
- **Mejorar:** franja «⬆ $costo · Nv N/5» al pie de cada edificio; sube el **lote** (`MEJORAS.fabricaN.lote`: 1, 2, 3, 4, 5 unidades por toque, mismo tiempo). `fabrica1` = planta de polvo, hilandería y batidora; `fabrica2` = panadería, tejeduría y quesería. Se reinicia en cada nivel.

## Osos, perro y gato
Un nivel activa los osos con `NIVELES[n].osos` y el gato con `regalo: ["gato"]`; el perro está en todo nivel con osos salvo que el nivel diga `perro: false` (los niveles 1-10 no lo tienen).
- **Osos:** entran por un lado del campo; van hacia el animal más cercano (si no hay, al pasto; si no, merodean). **Destruyen el pasto dentro de 2 casillas, eliminan los animales que tocan y borran los productos que pisan** (las jaulas no). Se capturan **tocándolos**: oso **3** toques, polar 9, panda 12 (barra amarilla de avance); al capturarlos dejan su **jaula**, que se recoge y se vende como producto (ver tabla de productos). La jaula del oso pesa 30 en el camión (una caja; cabe de sobra en el base, de 60) y ocupa 65 en el almacén (ver «Productos»).
- **Calendario de osos** (`osos.horario`): los osos caen en los segundos de la guía (repetir un número = dos a la vez); al acabarse la lista siguen cayendo cada `osos.cada` segundos. Sin él, el dinero de los niveles 5-9 no alcanzaba, porque en el original las jaulas ($100) son el ingreso principal. Sin `horario`, el primero cae en `primero` (por defecto 25 s) y luego cada 35-50 s.
- **Perro 🐕:** botón en la barra de arriba ($100 cada vez, solo si hay un oso suelto; gratis con `regalo: ["perro"]`). Llega en 2-3 s y deja quieto al oso 5-8 s. Un perro a la vez. En la versión 1 cuesta $2,600 y se compra una vez: aquí sigue en $100 por llamada (por decidir).
- **Gato 🐈:** botón en la barra de arriba ($2,500 una vez por nivel, como en la versión 1; gratis con `regalo: ["gato"]`, y entonces ya viene contigo). **Recoge solo los productos del suelo** hacia el almacén (no las jaulas; si el almacén está lleno no recoge). Para que también recoja jaulas, quitar el filtro `jaula` en `actualizarGato()`.
- **Míos, para confirmar:** 1 casilla = 32 px (el escenario no tiene casillas), la velocidad de cada oso, el costo del perro, los valores y pesos de polar y panda (polar y panda no existen en la versión 1) y los emojis (🐻‍❄️ puede verse como dos símbolos en sistemas viejos).

## Decisiones confirmadas
- **Tiempos: se quedan los propios del juego (más ágiles que el original de 2006), salvo el viaje del camión, que desde la sesión 11 es el de la guía (20 / 15 / 12 / 10 / 4 s).** Producto en el suelo: 12 s antes de desaparecer. Así la partida es activa y de clics rápidos, estilo arcade.
- Costos de mejoras y edificios, precios y valores: los de la versión 1 (ver tablas de arriba). Capacidades, tiempos y pesos: propios.
- Pozo: capacidad 5 / 9 / 15 / 25 / 50, llenado de 4 s; empieza lleno y gratis, rellenarlo cuesta $19 / $17 / $15 / $15 y con la mejora 4 hay rociador automático a $7 por parche (ver «Almacén, camión y mejoras»).

## Pruebas
- **Lógica en Node** (juego real, DOM falso): un jugador automático (2.5 y 1.5 toques/s, 3 partidas por nivel) ganó los niveles 1-10 en todas las corridas (el N6, de ~200-250 s, es el más largo; el N1, de ~9 s, el más corto). 35 comprobaciones de precios, costos, calendario de osos, regalos, venta y metas, todas bien. Antes se probaron también los animales (los cuatro producen y nadie pasa ~13 s seguido con hambre), los edificios (construir, sin dinero, sin insumos, cola, salida al suelo, mejora y lote) y los osos, perro y gato.
- **Pozo (sesión 4):** 13 comprobaciones con el juego real y un DOM falso, todas bien: base 3 / 3, la mejora cuesta $300 y no alcanza con $170, mejorar sube la capacidad sin dar agua, tocar la franja ⬆ no inicia el llenado, el llenado tarda 4 s hasta la nueva capacidad, plantar gasta agua, el nivel máximo dice «Nivel máx. 5/5» y se llena a 50 / 50, y `mejoras: { pozo: 2 }` empieza con capacidad 15.
- **Sesión 5 (juego real con DOM falso, 39 comprobaciones, todas bien):** datos coherentes (metas, tiempos oro < plata, ids que existen, máx. 4 edificios y 4 comprables, el pavo ya no está); estrellas y monedas (límites de medalla, 1★ → 3★ paga solo 30 más, repetir peor no paga ni baja la marca, tope de 45 por nivel, el mapa abre el siguiente nivel, gastar, fusionar dos progresos); modo libre (HUD sin metas ni medallas, no termina solo, la marca se guarda con la venta, no da estrellas ni monedas, Terminar partida, récord visible al volver y al empezar otra partida, Difícil y Experto con osos corren 45 s sin errores); y un nivel real jugado tres veces (2★ paga 30, 3★ paga 15 más, repetir con 2★ no baja ni paga).
- **Sesión 6 (navegador sin cabeza, 844×390):** pantallas de modos y ajustes sin errores de consola; la barra de dificultad y la de tamaño cambian los textos y el récord mostrado; con dinero distinto al de la dificultad sale «Prueba (sin récord)»; se jugó en los 3 tamaños y se construyó en todos los espacios (4 / 6 / 10); Pausa → Salir vuelve a los ajustes con lo elegido; el nivel 1 abre en el tamaño Original después de jugar en Grande. En Node: la geometría del tamaño Original es idéntica a la anterior y ningún tamaño tiene choques entre espacios, cajas, botones de compra y barra; las marcas con clave nueva se guardan, se fusionan y las claves inválidas se rechazan. **No se probó con dedos ni en un celular real** (tamaño táctil del punto de las barras y de las franjas ⬆ en el tamaño Grande).
- **Sesión 7 (Chromium real, 1000×560; juego con un gancho de prueba que avanza el reloj a mano):** hambre de 6 a 2 puntitos en 15.0 s y a 0 ocho segundos después, con la producción pausada en 0; la zona de pasto nace con 3 usos y tarda 2 s en crecer; con 4 animales con hambre y una zona de 3 usos solo 3 reservan, corren a 74.8 px/s (2.2 × 34), quedan en 6 puntitos y la zona desaparece; sin zona libre el animal con hambre sigue paseando. Capturas de los 3 tamaños, de los niveles 1 y 8 y de las dificultades Muy fácil, Normal y Difícil, sin errores de consola. Un jugador automático simple (toca huevos, vende, compra gallinas, atrapa osos) ganó el **nivel 1 en ~8.6 s** y el **nivel 2 en ~32.5 s** (oro 60 y 120).
- **Sin probar en celular.** El jugador automático es mejor que una persona novata: falta probar los niveles con personas y **ver el dibujo en pantalla**: tamaño táctil de las franjas ⬆ (28 en cajas, 26 en edificios) y de los espacios de edificio (138×70), los 3 botones de compra (gallina, oveja y vaca, ~38 de alto), los emojis grandes de vaca y oveja, la pista de 7 s, los nombres nuevos de edificios, el oso de 42 px con su jaula de barrotes, los botones 🐕/🐈 de 32 de alto la caja del pozo reacomodada (título arriba, agua en medio, franja ⬆ al pie) y los 5 botones de dificultad del modo libre en un celular horizontal (de poco alto se achican a 50 px).

## Por resolver
1. **Pesos contra capacidades (sesión 11):** con camión base 60 caben todos los productos (el más pesado, la leche, pesa 15) y con el almacén base 100 cabe cualquiera (la leche, 100, llena el almacén). Falta volver a calibrar los niveles 1-10 con los números nuevos: el almacén base guarda 20 huevos (antes 30) y un polvo ocupa 12 contra 5 del huevo.
2. **Perro:** $100 por llamada (propuesta) o $2,600 una sola vez como en la versión 1.
3. **Edificios:** la cola (2 lotes) y los lotes por nivel (1 a 5) son propuesta mía en el modelo de cola; confirmar o cambiar en `MAX_COLA_EDIF` y `MEJORAS.fabricaN.lote`. Con los valores actuales procesar multiplica el valor de cada huevo pero también su peso: el camión pasa a ser el cuello de botella.
4. ~~**Pozo:** cobro por rellenar~~ **Resuelto (sesión 8):** el pozo cobra por rellenar ($19 / $17 / $15 / $15), empieza lleno gratis y la mejora 4 es un rociador automático a $7 por parche.
5. **Tabla de niveles desactualizada:** la tabla de «Niveles y metas» (oro/plata N1 40/90, N2 70/130, N3 100/160, N4 150/220, N9 200/280, N10 120/200) no coincide con `NIVELES` en `datos-granjafeliz.js` (N1 60/120, N2 120/180, N3 180/240, N4 210/270, N9 210/300, N10 210/270). El archivo de datos manda; falta decidir cuál es el bueno y corregir el otro.

6. **Calibración tras el nuevo hambre (sesión 7):** solo se re-probaron los niveles 1 y 2 con el jugador automático. Los niveles 3-10 y los tiempos de oro/plata se calibraron con el hambre vieja (por animal, con mordidas): hay que volver a pasarlos, sobre todo los que usan oveja y vaca (antes tenían hambre cada 24 y 40 s; ahora todos cada 15 s, y una vaca produce solo mientras le quede comida).
7. **Cifras mías del pasto:** `MAX_PASTO` = 12 zonas (antes 16 matas), `SEG_CRECE_PASTO` = 2 s y `CORRE` = 2.2. Los 15 s, los 6 → 2 puntitos y los 3 usos son de Polo. Por decidir: si un animal con hambre debería dejar de producir (hoy produce hasta llegar a 0 puntitos) y si dos toques de agua cerca deben juntarse en una zona.
8. **Almacén:** quedó como bodega abajo al centro en lugar de la jaula de arriba; si se prefiere otro sitio o dibujo, se cambia en `CAJAS` y `dibujarAlmacen` (`escena-granjafeliz.js`).

## Especificación de la versión original (notas del 14 nov 2026; para aplicar poco a poco)

**Criterio nuevo:** ya no hace falta que precios y tiempos de animales y edificios sean idénticos a Farm Frenzy (es difícil encontrar la cifra exacta). Lo que importa es que la **jugabilidad** sea la misma. Si una cifra exacta se consigue, bien; si no, se queda la propia. Estas notas describen solo el **juego original**; el **Mod de Polo** (modificaciones propias) se agrega después en su propia sección. Las cifras vienen de respuestas de Google, no del juego mismo.

Leyenda de estado frente al código de hoy: ✅ ya está · ⚠️ está distinto · ◻️ falta.

### Animales

| Animal (en el juego) | Compra | Venta | Produce | Estado |
|---|---|---|---|---|
| Ganso (en el código, «gallina») | $100 | $50 | Huevo | ✅ precios y venta al 50 % (`VENTA_ANIMAL`) |
| Oveja | $1,000 | $500 | Lana | ✅ |
| Vaca | $10,000 | $5,000 | Leche | ✅ |
| Perro | $2,600 (se compra una vez) | no se vende | nada: **inmoviliza a los osos** para que no destruyan la granja | ⚠️ hoy cuesta $100 por llamada |
| Gato | $2,500 | no se vende | nada: **recoge solo los productos del campo** y los lleva al almacén | ✅ |

- Mascotas = perro y gato (no se compran ni se venden como los otros tres).
- La guía dice que cada animal tiene «capacidad máxima» de 5 cajas (ganso), 2 (oveja) y 1 (vaca). **No está claro qué significa** (parece mezclado con las cajas del camión). No aplicar hasta aclararlo.

### Productos y edificios (9 productos, 6 edificios)

Cadenas de producción (valor entre paréntesis):

- 🥚 Huevo ($10) → Polvo de huevo ($20) → Cupcake ($80)
- 🐑 Lana ($100) → Bobina de hilo ($200) → Tela ($800)
- 🐄 Leche ($1,000) → Mantequilla ($2,000) → Queso ($8,000)

| Edificio | Entrada | Salida | Construcción | Estado |
|---|---|---|---|---|
| Planta de polvo de huevo (*Egg Solids Plant*) | 1 huevo | 1 polvo de huevo | $200 | ✅ |
| Panadería (*Bakery*) | 1 polvo de huevo | 1 cupcake (en el código, «pastelito») | $400 | ✅ |
| Hilandería (*Spinnery*) | 1 lana | 1 bobina de hilo | $2,000 | ✅ |
| Tejeduría / telar (*Weaving Mill*) | 1 bobina de hilo | 1 tela | $4,000 | ✅ |
| Batidora (*Churn*) | 1 leche | 1 mantequilla | $20,000 | ✅ (sesión 10) |
| Quesería (*Cheese Dairy*) | 1 mantequilla | 1 queso | $40,000 | ✅ (sesión 10) |

- Tiempo de procesamiento: **de 15 a 25 s por ciclo**, según el nivel de mejora. ◻️ revisar los tiempos de `EDIFICIOS`.
- Cada edificio se mejora hasta procesar **5 unidades a la vez** (en vez de 1). Los costos de mejora van de **$300 a $120,000** según el edificio: la tabla completa está en «Edificios por dentro» (más abajo). ⚠️ hoy los costos de `EDIFICIOS[id].costos` van de $200 a $600 (planta), $400 a $1,200 (panadería), $2,000 a $6,000 (hilandería) y $4,000 a $12,000 (tejeduría): los extremos coinciden con la tabla (construcción → mejora 4); falta revisar los pasos intermedios.
- En el código, el edificio que procesa solo huevos da **1 bolsa de polvo por huevo** (con mejoras, N huevos dan N bolsas).

### Pozo de agua

Sirve para regar césped y alimentar a los animales. Tiene 4 mejoras que se compran en orden:

| Nivel | Costo de la mejora | Costo por recarga | Efecto |
|---|---|---|---|
| Base | — | $19 | Agua para 5 parches de césped |
| Mejora 1 | $300 | $17 | Más capacidad |
| Mejora 2 | $600 | $15 | Más capacidad |
| Mejora 3 | $1,200 | $15 | Más capacidad |
| Mejora 4 (máx.) | $5,000 | $7 por parche | **Rociador automático**: riega el campo solo, sin clic; si no hay dinero se detiene hasta poder pagar |

- ✅ **Aplicado (sesión 8):** base con recarga de **$19** y **5 usos** de agua; costos de mejora ($300 / $600 / $1,200 / $5,000); recarga por nivel **$17 / $15 / $15**; el pozo **empieza lleno gratis** en cada nivel; **rociador automático** en la mejora 4: ya no usa agua, riega solo cuando un animal con hambre no tiene pasto libre y cobra **$7 por parche** (tocar el campo también planta por $7); si no hay dinero se detiene hasta que lo haya. Las capacidades de las mejoras 1 a 3 (9 / 15 / 25 / 50) son propias.
- El **césped también desaparece con el tiempo**, aunque nadie lo coma. ◻️ **falta** (no hay duración en la guía; hay que elegir una, por ejemplo 20-30 s).
- Un animal come de **2 a 3 veces** de un mismo parche (✅ 3 usos). Ganso y oveja comen rápido, la vaca a velocidad media (en el original los cerdos más lento; aquí no hay cerdos). ◻️ la velocidad de comer hoy es igual para todos (5 s).
- Si no hay césped, el animal pierde salud (barra de diamantes azules) y muere de hambre. ✅ hecho con la barra de vida de 20 s (hambre a los 12 s, come 5 s).

### Almacén

4 mejoras. Guarda productos, osos capturados (y, según la guía, animales).

| Nivel | Costo | Efecto |
|---|---|---|
| Base | — | Capacidad inicial limitada |
| Mejora 1 | $150 | Más espacio |
| Mejora 2 | $500 | Más espacio |
| Mejora 3 | $1,000 | Más espacio |
| Mejora 4 (máx.) | $12,000 | Capacidad máxima |

- ✅ **Sesión 12:** la mejora 4 cuesta **$12,000** como dice la guía (antes $2,000). Costos del almacén: $150 / $500 / $1,000 / $12,000.
- ✅ **Sesión 11:** el almacén usa **espacio** en puntos con la leche como referencia (100): huevo 5 < polvo 12 = cupcake 12 < lana 30 = hilo 30 < tela 60 < leche 100 = mantequilla 100 = queso 100. Capacidades **100 / 300 / 1,000 / 3,000 / 10,000** (progresión ×3.3, cifras mías). El orden sale de la guía; los números exactos son míos.
- ✅ **Oso = 65 % de la leche = 65 de espacio** (la guía también dice «unas 3/4 partes»; antes era el 40 % de la capacidad, ya no). Polar 80 y panda 90 (míos). El almacén base guarda 1 oso; con la primera mejora (300) caben 4 (un par o más, como dice la guía).
- Sin mejora el espacio es muy limitado y **los productos se pierden si no caben** (✅ «Almacén lleno»).

### Carro (camión)

4 mejoras. Cada una sube el número de **cajas** y baja el tiempo de viaje a la ciudad. **Cada caja lleva un solo tipo de producto** (no se mezclan en la misma caja).

| Nivel | Costo | Cajas | Tiempo de viaje |
|---|---|---|---|
| Base (amarillo) | — | 2 | ~20 s |
| Mejora 1 (verde) | $300 | 3 | ~15 s |
| Mejora 2 (rojo) | $800 | 4 | ~12 s |
| Mejora 3 (azul) | $1,500 | 5 | ~10 s |
| Mejora 4 (máx.) | $5,000 | 7 | ~4 s |

Máximo de unidades **por caja**:

| Producto | Por caja |
|---|---|
| Huevo | 5 |
| Polvo de huevo | 10 |
| Cupcake | 15 |
| Lana | 3 |
| Bobina de hilo | 5 |
| Tela | 10 |
| Leche | 2 |
| Mantequilla | 5 |
| Queso | 10 |
| Oso | 1 |

- Ejemplo: con el carro base (2 cajas) se llevan máximo 2 tipos distintos (p. ej. 5 huevos + 2 leches); con el máximo (7 cajas), hasta 7 tipos.
- Consejo del juego: no siempre conviene cargar «todo» de un solo producto; a veces rinde más combinar varios de alto valor (queso, tela, cupcakes).
- ✅ Costos de mejora ($300 / $800 / $1,500 / $5,000) ya puestos.
- ✅ **Conversión a pesos (sesión 11, decisión de Polo: el sistema de cajas no gusta por poco preciso).** Una caja = 30 puntos (`CAJA_CAMION`); el peso de cada producto es 30 / su máximo por caja: huevo 6, polvo 3, cupcake 2, lana 10, hilo 6, tela 3, leche 15, mantequilla 6, queso 3, oso 30. El camión lleva cajas × 30 = **60 / 90 / 120 / 150 / 210** de peso. Una caja llena de un producto pesa justo 30, así que cargar un solo producto da lo mismo que en el original; la diferencia es que **aquí se puede mezclar**: el peso es de todo el camión (1 oso + 5 huevos = 60), y no se desperdicia el espacio de una caja a medias.
- Los productos procesados rinden más por punto de peso (valor de una caja llena: huevo $50 → polvo $200 → cupcake $1,200; lana $300 → hilo $1,000 → tela $8,000; leche $2,000 → mantequilla $10,000 → queso $80,000), igual que en el original.
- Opcional (no hecho): limitar los **tipos distintos por viaje** al número de cajas (2 / 3 / 4 / 5 / 7) para acercarse más a «una caja = un producto».
- ✅ **Tiempo de viaje como la guía (sesión 11):** 20 / 15 / 12 / 10 / 4 s (antes 15 / 5 / 4 / 3 / 2 s).

### Osos (Farm Frenzy 1)

- En FF1 existe **un solo tipo de oso** (el polar y el panda no están: son del Mod de Polo, aunque hoy ya están en el código).
- **Aparición:** cae «del cielo» en un punto al azar del campo, casi siempre cerca de la parte de arriba (donde está el pozo). Antes de aterrizar aparece su **sombra** en el campo y se oye un **rugido** cada vez más fuerte: el jugador tiene unos segundos para reaccionar.
- **Frecuencia (fija por nivel):** niveles iniciales (2-3), 1 oso cada ~30-50 s; niveles medios (10-11), 2 osos a la vez cada ~40 s; niveles avanzados, hasta 3 osos en un mismo drop.
- **Qué hace suelto:** camina al azar **sin objetivo fijo**; si un animal se cruza con él lo agarra y lo **lanza fuera de la granja** (se pierde para siempre en ese nivel y hay que comprarlo otra vez a precio completo) y sigue caminando; además **pisa y destruye al instante** los productos sueltos del suelo.
- **Cómo se neutraliza:** clics/toques repetidos sobre él (más rápidos = jaula más rápida). Al enjaularlo deja de hacer daño. La jaula se recoge y se guarda en el almacén (ver «Almacén» y «Carro»).
- **Jaula sin espacio:** si no hay lugar en el almacén y se deja la jaula demasiado tiempo, el oso sacude la jaula y **escapa**.
- Estado frente al código de hoy:
  - ✅ lanzar/eliminar animales y borrar productos pisados; jaulas que no se borran; jaula de **15 s** y el oso desaparece si no se guarda (decisión de Polo, 14 nov).
  - ⚠️ hoy el oso **entra por un lado y persigue al animal más cercano**, y además **destruye el pasto** a 2 casillas (eso no está en la guía; decidir si se quita). La guía: cae del cielo y camina al azar.
  - ⚠️ hoy el oso escapado **desaparece**; la guía dice que sigue suelto lanzando animales. Se queda lo de Polo.
  - ◻️ sombra y rugido antes de caer; hasta 3 osos por caída en niveles avanzados.
  - ⚠️ toques para atraparlo: 8 en el nivel normal (decisión de Polo), no los de la guía.

### Perro (Farm Frenzy 1)

- Cuesta **$2,600** y se compra **una vez**. Es un **ancla permanente**, no un efecto con tiempo: cuando llega al oso lo deja inmóvil **hasta que lo enjaules o termine el nivel**; el oso queda «pegado» donde lo alcanzó.
- **Un perro inmoviliza un solo oso.** Si caen varios osos, los que no tengan perro siguen sueltos (se pueden comprar varios perros).
- El oso inmóvil **sigue lanzando a los animales que se acerquen** a él: no hay escudo alrededor.
- El perro **no enjaula**: el jugador toca al oso para construir la jaula; el perro solo da tiempo.
- Puede ser un ítem inicial en ciertos niveles (aprox. 5-6 en adelante).
- ⚠️ Hoy: $100 por llamada, solo si hay un oso suelto; llega en 2-3 s y lo deja quieto 5-8 s; un perro a la vez. Pasarlo a $2,600 una vez, ancla permanente y varios perros.

### Gato (Farm Frenzy 1)

- Cuesta **$2,500**. Velocidad **fija** (en FF1 no hay mejoras de gato; ver «Datos contradictorios»).
- Ciclo: en cuanto aparece un producto en el campo (de un animal o de una fábrica) **corre a él, lo recoge al instante, lo lleva al almacén y repite**. Lleva **un producto a la vez**; en niveles con mucha producción hacen falta **varios gatos** (cada uno trabaja por su cuenta).
- Va al producto **más cercano a donde está**, sin prioridad por valor.
- Restricciones: no recoge osos enjaulados; no puede recoger si el almacén está lleno; un oso suelto puede lanzarlo (se pierde y hay que recomprarlo); no come ni muere de hambre.
- ✅ precio y recoger productos (no jaulas; no recoge con el almacén lleno). ⚠️ hoy se compra una vez por nivel: la guía permite varios gatos.

### Producción de los animales

- Gallina (ganso), oveja y vaca comparten el mismo rango: **un producto cada 15 a 25 s, al azar** (sin diferencia por especie). El **primer** producto también sale entre 15 y 25 s después de comprar al animal.
- Cada animal tiene su ciclo independiente. En FF1 **no hay mejoras de velocidad** de animales.
- **La producción no depende del hambre** (sistema binario): con pasto produce normal aunque su barra esté baja; sin pasto la barra baja hasta la muerte pero sigue produciendo mientras viva. No existe «producción reducida».
- **No hay límite fijo de animales** (en FF2 sí: 20). Solo limitan el dinero, el pasto y el espacio del almacén.
- ⚠️ Hoy: gallina **20 s fijos** (pedido de Polo, 14 nov; primer huevo entre 10 y 20 s), oveja 12 s y vaca 20 s. Falta decidir si se pasa a 15-25 s al azar para todos. ✅ la producción no depende del hambre (corre mientras el animal viva). ◻️ verificar que no haya tope de animales en el código.

### Productos en el suelo

- Duran **~10-15 s** y desaparecen para siempre si nadie los recoge; los últimos **2-3 s parpadean**. No hay contador visible. Todos los productos (crudos y procesados) duran igual; la salida de una fábrica dura lo mismo que la de un animal.
- Con el almacén lleno el producto no entra: sigue su ciclo, parpadea y desaparece sin compensación (no hay cola ni se regenera).
- Se recogen **uno por uno** (un clic cada uno; no hay selección en grupo en FF1), con el gato, o con clic en el producto y luego en una fábrica (va directo a procesar sin pasar por el almacén).
- Un oso suelto que lo pisa lo destruye al instante.
- ✅ 12 s en el suelo (`SEG_SUELO`), jaulas parpadean los últimos 3 s. ◻️ verificar el parpadeo en productos normales y el envío directo a fábrica (opcional).

### Edificios por dentro (6 edificios, FF1)

- **Meter producto:** un solo clic en la fábrica; los materiales salen solos del almacén (no hay arrastre).
- Puede procesar menos que su máximo (si procesa 5 y hay 3, procesa 3). **Solo 1 ciclo a la vez**, sin cola; pero se puede empezar el siguiente ciclo mientras la salida anterior sigue en el suelo sin recoger.
- **La salida cae al suelo** frente a la fábrica; hay que recogerla (clic o gato), no va directo al almacén. (Clics rápidos sobre la fábrica la aceleran un poco: opcional.)
- Procesar 5 a la vez tarda lo mismo que procesar 1.
- **Tiempo por ciclo: igual para todos los edificios**, depende solo del nivel de mejora:

| Nivel | Unidades por ciclo | Tiempo |
|---|---|---|
| Base | 1 | ~25 s |
| Mejora 1 | 2 | ~22 s |
| Mejora 2 | 3 | ~20 s |
| Mejora 3 | 4 | ~17 s |
| Mejora 4 (máx.) | 5 | ~15 s |

- **Costos** (monedas, dentro del nivel):

| Edificio | Construcción | Mejora 1 (2) | Mejora 2 (3) | Mejora 3 (4) | Mejora 4 (5) |
|---|---|---|---|---|---|
| Planta de polvo | $200 | $300 | $400 | $500 | $600 |
| Panadería | $400 | $600 | $800 | $1,000 | $1,200 |
| Hilandería | $2,000 | $3,000 | $4,000 | $5,000 | $6,000 |
| Tejeduría | $4,000 | $6,000 | $8,000 | $10,000 | $12,000 |
| Batidora | $20,000 | $30,000 | $40,000 | $50,000 | $60,000 |
| Quesería | $40,000 | $60,000 | $80,000 | $100,000 | $120,000 |

- **Las mejoras de fábrica no se conservan:** se reinician en cada nivel y se vuelven a comprar. (El pozo, el almacén y el carro tampoco: cada nivel empieza en su nivel base y se mejoran pagando monedas; la tienda de estrellas solo da el *permiso*. Excepción: la jaula.)
- ⚠️ Hoy hay **cola de 2 lotes** (`MAX_COLA_EDIF`); la guía dice 1 ciclo a la vez. ◻️ revisar que el tiempo por ciclo sea el de la tabla (25 → 15 s) en los 4 edificios que ya existen. ✅ la salida cae al suelo. ✅ Batidora y quesería (sesión 10).

### Tiempo y medallas (FF1)

- El reloj **cuenta hacia arriba**. Hay un **tiempo de oro** y uno de **plata**. Terminar antes del oro = oro; antes de la plata = plata; después de ambos = nivel completado sin medalla. **No hay tiempo máximo.**
- Estrellas ⭐: base por completar (varía por nivel) + bono por medalla. Ejemplo del nivel 1: completar 30, plata +10, oro +20.
- Se pueden repetir niveles las veces que se quiera y **las estrellas se acumulan**.
- El reloj **no corre** en pausa, mientras se carga el camión ni en la tienda.
- Tiempos de oro: niveles iniciales ~1-2 min; los finales 10 min o más.
- ✅ medallas por tiempo sin perder el nivel; el reloj se detiene con la ventana «Enviar productos» (pausa). ⚠️ hoy cada nivel da 1/2/3★ y paga **15 / 30 / 45** monedas solo la **diferencia** al mejorar (no se acumula al repetir, para que no se pueda «cultivar»). Ver «Economía fuera del nivel».

### Economía fuera del nivel (FF1)

Hay **dos monedas independientes** que nunca se convierten una en otra:

| Moneda | Se gana | Se gasta |
|---|---|---|
| Estrellas ⭐ | al completar niveles (más con oro/plata) | solo en la **tienda** entre niveles |
| Monedas 🪙 / dinero | vendiendo con el carro dentro del nivel | solo dentro del nivel (animales, edificios, mejoras) |

- **No existen «monedas ganadas por estrellas» ni boosts** en FF1 (no hay power-ups ni consumibles). Lo parecido: repetir niveles para juntar estrellas, la jaula mejorada y el pozo automático.
- **La tienda vende *permisos* (licencias)**, no mejoras ya puestas: da el derecho a construir o mejorar algo **dentro del nivel pagando monedas cada vez**. Excepciones permanentes: **jaula** (se aplica en todos los niveles sin pagar monedas) y las mejoras de **perro y gato**.
- Flujo: completar nivel → estrellas → tienda (permisos) → nivel (pagar monedas por construir/mejorar) → vender con el carro → completar objetivo → más estrellas.
- Consejo del juego: primero la jaula; luego pozo y carro; las fábricas cuando un nivel las exija.

Costos en estrellas:

| Permiso | 1.ª | 2.ª | 3.ª | 4.ª | 5.ª |
|---|---|---|---|---|---|
| Planta de polvo | 100 | 120 | 130 | 140 | 150 |
| Panadería | 120 | 130 | 140 | 150 | 160 |
| Hilandería | 1,000 | 1,200 | 1,300 | 1,400 | 1,500 |
| Tejeduría | 1,200 | 1,300 | 1,400 | 1,500 | 1,600 |
| Batidora | 10,000 | 12,000 | 13,000 | 14,000 | 15,000 |
| Quesería | 12,000 | 13,000 | 14,000 | 15,000 | 16,000 |

(Las copias 2.ª a 5.ª permiten tener varias del mismo edificio en un nivel, p. ej. 2 plantas de polvo a la vez.)

| Equipo | Mejora 1 | Mejora 2 | Mejora 3 | Mejora 4 |
|---|---|---|---|---|
| Pozo | 200 | 400 | 800 | 8,000 (riego automático) |
| Almacén | 150 | 300 | 2,000 | 10,000 |
| Carro | 100 | 500 | 2,000 | 15,000 |
| Jaula (permanente) | 100 | 500 | 5,000 | — (solo 3) |

- Las mejoras de equipo son opcionales (no bloquean niveles) pero facilitan mucho.
- **Animales:** siempre se pueden comprar con monedas; la progresión los introduce: gallina desde el nivel 1; oveja ~6; vaca ~8-9; perro y gato como ítems iniciales de ciertos niveles (~5-6).
- En el original un nivel con una «X» en el mapa pide comprar un permiso antes de jugarlo.
- ⚠️ **Por decidir:** hoy el juego usa 🪙 monedas del portal (15/30/45 por nivel) y `eco.gastar()` para una tienda futura. Propuesta: que las 🪙 del chip del portal **sean las estrellas de la tienda** (así el estándar de monedas y la tienda de FF1 son lo mismo) y que el dinero del nivel siga siendo aparte ($). Falta decidir también si repetir un nivel acumula estrellas (FF1) o solo paga la mejora (hoy).
- ◻️ tienda de permisos, copias de edificios y los permisos por nivel. El original tiene 48 niveles en 3 filas; aquí el mapa es de México y el mundo, así que los niveles donde se piden permisos se definen en el generador.

### Interfaz y controles (FF1)

- **Barra de arriba:** a la izquierda los 5 animales con su precio (gallina $100, oveja $1,000, vaca $10,000, perro $2,600, gato $2,500); también los iconos de los edificios, pozo, almacén y carro para mejorarlos pagando. Abajo: el almacén y el carro (con una animación del viaje a la ciudad).
- **Comprar un animal:** un solo clic en su icono; si hay dinero cae al campo al instante y empieza a producir. Sin menú ni confirmación.
- **Vender animales:** clic en el almacén o el carro → pestaña de **animales** → elegir cuál y cuántos → se venden al **50 %**. ✅ **Sesión 13:** la ventana del almacén tiene las pestañas «📦 Productos» y «🐾 Animales» (izquierda los de la granja, derecha los que vas a vender, botones «1» y «todo», total y «Vender ▶»); se vende primero el que lleva menos producción a medias. La zona 💲 de cada botón de compra se conserva.
- **Controles:** todo es de **clic/toque** (regar tocando el suelo cerca del pozo, recoger tocando el producto, procesar tocando la fábrica, enjaular tocando repetidamente al oso, mejorar tocando el icono). Sin atajos de teclado, salvo **Esc** = pausa/menú. En móvil los toques equivalen al clic.
- **Pistas (no hay tutorial guiado):** una **flecha roja** apunta a lo que toca hacer (el pozo si hay que regar, el almacén si está lleno, o que falta dinero); **tooltips** al pasar el cursor; **pantalla de objetivos** al empezar el nivel.
- **Pantalla de fin de nivel:** medalla (oro/plata/ninguna), estrellas ganadas (base + bono), tiempo total, objetivos con ✓ y botón **Continuar**.
- ✅ pantalla de fin sobre el tablero (estándar del portal, sección 6), pausa con ☰/Esc, pista de 7 s. ◻️ flechas rojas de pista, tooltips. En FF1 **no hay pantalla de derrota**; aquí sí (ver abajo).

### Condición de derrota (decisión de Polo; no existe en el original) — ✅ hecha (sesión 9)

- El nivel **nunca se pierde por tiempo.** Se pierde **solo si el jugador perdió toda forma de avanzar**. Código: `sinSalida()` en `salida-granjafeliz.js`; el juego la revisa cada `SEG_REVISAR` = 1 s (`revisarSalida`) y pide `SEG_CONFIRMAR` = **3 s seguidos** de «sin salida» antes de mostrar la pantalla (así un producto que acaba de desaparecer no causa una derrota de un instante). Con el juego en pausa o con la ventana «Enviar productos» abierta no se revisa. Si en el mismo instante se cumplen las metas, **gana la victoria**.
- Se pierde cuando se cumplen **las tres**:
  1. **No hay ingreso en camino:** nada en el camión de viaje (el pago pendiente cuenta), nada en el suelo (productos o jaulas), ningún edificio trabajando o con cola, y nada vendible en el almacén. Un producto más pesado que el camión (p. ej. leche de 50 con camión de 10) **no cuenta** como vendible, salvo que el dinero alcance para mejorar el camión.
  2. **No queda ningún animal vivo** (cualquiera produce algo que vale dinero).
  3. **El dinero no alcanza para el mínimo indispensable:** el animal **más barato que se pueda comprar en el nivel** (`comprables`, por defecto la gallina) **más** lo que cuesta regar el pasto si no hay pasto con usos ni agua en el pozo (`extraPasto`: $19 de recarga, o $7 por parche con el rociador). Tampoco se pierde si las metas que faltan son solo animales/edificios y el dinero alcanza para pagarlas directo.
- **Osos (decisión mía, cambiar en `salida-granjafeliz.js`):** un oso **suelto** en el campo cuenta como ingreso (se enjaula con 3 toques y su jaula vale dinero), así que mientras haya uno sin capturar no se pierde (`OSOS_SUELTOS_CUENTAN = true`). Los osos que **todavía no caen** no cuentan (`OSOS_FUTUROS_CUENTAN = false`): si no te queda nada, no se espera a un oso que quizá llegue. Con `true` ningún nivel con osos se perdería nunca, porque siempre vuelven a caer.
- **Cota inferior a propósito:** ante la duda **no** declara derrota (perder por error es peor que tardar unos segundos en perder). Casos que no detecta: animales vivos que van a morir de hambre sin pasto (cuando mueren, entonces sí), o un camión que necesitaría varias mejoras para cargar un producto pesado.
- Ejemplos: **pierde** si no hay animales ni nada que vender y el dinero es $40 con la gallina a $100 (y no hay ningún oso suelto). **No pierde** si no hay animales pero hay $100, o una caja de huevos vendible. El nivel 9 empieza sin animales y no se pierde porque sus $220 alcanzan para una gallina.
- **Pantalla:** «Ya no hay forma de avanzar», con el motivo («Ya no te quedan animales ni nada que vender, y con $40 no alcanza para comprar una gallina ($100).»), el tiempo, **Reintentar ▶** y **Mapa**. No da estrellas ni monedas y no toca el progreso guardado.
- **Modo libre:** también aplica (no tiene metas): la partida termina con el mismo mensaje, lo vendido y el récord (que ya se guardó con cada venta), con «Jugar otra vez ▶» y «Ajustes».

### Niveles: los primeros 10, las ranuras de edificios y de ahí en adelante

**Primeros 10 niveles (decisión de Polo, 15 nov):** deben ser **muy sencillos** y servir para mostrar cómo funcionan las características principales. Esto **reemplaza** la idea de «Niveles de México = los del juego original» para los niveles 1 a 10 (del 11 en adelante se retoma).

Propuesta mía de temario (para confirmar):

| Nivel | Enseña | Edificios |
|---|---|---|
| 1 | gallinas, pasto, pozo, recoger huevos y vender con el camión | ninguno |
| 2 | almacén y camión (mejorarlos) con meta de dinero | ninguno |
| 3 | primer oso: enjaularlo y vender la jaula | ninguno |
| 4 | planta de polvo: huevo → polvo | 1 |
| 5 | panadería: polvo → cupcake | 2 |
| 6 | gato (regalo) recogiendo solo | 1-2 |
| 7 | oveja + hilandería: lana → hilo | 1 |
| 8 | perro contra osos | 1 |
| 9 | vaca y leche | ninguno |
| 10 | «examen»: mezcla de lo anterior | 3 |

**Ranuras de edificios:** hoy el campo siempre muestra 6 zonas de tierra (círculos) para 6 edificios. Nuevo: **solo aparecen las zonas de tierra de los edificios que el nivel necesita** (`edificios` + `construidos` de `NIVELES[n]`); donde no hay edificio el campo es un **círculo completo de pasto**. Un nivel de 1 o 2 edificios muestra 1 o 2 zonas; el nivel 1 ninguna. ◻️ por hacer en `escena-granjafeliz.js` (posiciones de `ranuraEdificio`) y en `NIVELES`.

**Del nivel 11 en adelante:** retos variados repartidos al azar (con semilla fija, iguales para todos). La dificultad sube de **dos formas**:
- **Pesados:** metas grandes o largas, que se sientan complicadas de lograr.
- **De tiempo:** el tiempo de oro es estresantemente exigente para quien quiera todas las medallas de oro.
- Retos posibles (propuesta): meta de dinero grande, cadena larga de productos, muchos osos, dinero inicial muy bajo, pocos animales de inicio, pasto escaso.
- Se aplica el reparto 50/40/10 → 25/40/35 del estándar (sección 8) con `compartido/dificultad-niveles.js` (**falta subirlo**).

**Cómo medir que un nivel es posible y justo (bot de backtracking, por hacer):**
- El bot busca con retroceso entre decisiones (comprar, construir, mejorar, procesar, enviar) y da dos cosas: si el nivel **se puede ganar** y el **tiempo mínimo** (cota inferior).
- Problema conocido: los bots anteriores marcaron como «fáciles» niveles que a Polo le resultaron difíciles. Por eso el bot no decide solo; se calibra con **tres perfiles**: bot óptimo (cota de «imposible»), bot de persona normal (~1.5-2.5 toques/s con retraso de reacción, como el jugador automático de la sesión 3) y **tiempos reales de Polo** en niveles de muestra (p. ej. 1 de cada 100) para sacar un factor humano/bot por tramo.
- Reglas: **oro** nunca por debajo del tiempo del bot óptimo con ≥ 10-15 % de margen y entre 45 y 420 s (`PISO_ORO` y `TOPE_ORO` de `tiempos-granjafeliz.js`: ni larguísimo ni absurdo); **plata** alcanzable por una persona normal con esfuerzo; **completar** siempre alcanzable. Para niveles de tiempo: oro ≈ el tiempo de un jugador ágil + un pequeño margen.
- Ningún nivel se publica sin pasar el bot **y** una prueba humana de muestra. Los niveles son para público (juego algo infantil): reto sí, frustración no.

### Modo libre: dificultades (cifras mías; Polo me dejó elegirlas)

La dificultad sube/baja **precios, osos y toques para atrapar**. El modo libre sigue sin dar monedas ni estrellas.

| | Muy fácil | Fácil | Normal | Difícil | Experto |
|---|---|---|---|---|---|
| Precio de animales, edificios y mejoras | ×0.5 | ×0.75 | ×1 | ×1.5 | ×2 |
| Frecuencia de osos | ×0.5 | ×0.75 | ×1 | ×2 | ×3 |
| Valor de la jaula del oso | $120 | $90 | $60 | $40 | $20 |
| Toques para atrapar al oso | 3 | 4 | 8 | 15 | 20 |

- Lógica: en Experto caen el triple de osos pero cada jaula vale tres veces menos (más pérdida de animales, el mismo ingreso por oso); en Muy fácil hay la mitad, valen el doble y casi no cuesta atraparlos. «Precio» no cambia el valor de lo que se vende (huevo, lana…), solo lo que se compra.
- Ideas extra, opcionales y por confirmar: duración de los productos en el suelo (15 / 13 / 12 / 10 / 8 s), viaje del camión (más rápido en fácil, más lento en difícil), dinero inicial según la dificultad (ya existe).
- ◻️ falta aplicar la tabla (hoy las 5 dificultades solo cambian el dinero inicial y la marca).

### Mod de Polo (solo nota)

Traerá una **granja más grande** por el aumento de edificios, además de **edificios y animales nuevos**. Por ahora no se planea (ver «Mod de Polo» más arriba); primero se termina el juego original.

### Datos contradictorios de la guía (resolver al aplicar)

1. **Oso y edificios:** una respuesta dice que el oso escapado destruye edificios; el detalle de FF1 dice que **no** (eso es de FF2). Se toma «no destruye edificios».
2. **Mejoras de gato y perro:** una respuesta dice que en FF1 el gato no tiene mejoras; otra que las de perro y gato se compran con estrellas. Por decidir (sugiero sin mejoras de gato/perro hasta el Mod de Polo).
3. **Gato y jaulas:** «no recoge productos si hay osos enjaulados en el campo» no está claro; se mantiene que no recoge jaulas pero sí productos.
4. **Capacidad de animales** (5 / 2 / 1 cajas): sin significado claro; no aplicar.
5. **Tiempo del camión:** la guía ~20 s en el nivel base; Polo pidió 15 s.
6. **Oso:** la guía 65 % de una leche en el almacén; hoy 40 % de la capacidad del almacén (pedido de Polo).

### Orden sugerido para aplicarlo

1. ~~**Condición de derrota** (`sinSalida` + pantalla)~~ **Hecha (sesión 9)**. Falta: **niveles 1 a 10** nuevos con las **ranuras de tierra** solo para los edificios necesarios.
2. Pozo: recarga por nivel, empezar lleno gratis y riego automático.
3. Osos como en FF1 (caída con sombra, caminar al azar), perro de $2,600 como ancla y varios gatos.
4. Producción 15-25 s al azar (decidir contra los 20 s de hoy) y edificios por dentro (1 ciclo, tiempos 25 → 15 s, costos por paso).
5. ~~Camión por cajas~~ **Hecho en la sesión 11 como pesos** (caja = 30 puntos; ver «Carro (camión)»). Falta la pestaña «Animales» en la ventana del almacén.
6. ~~Batidora y quesería (mantequilla y queso).~~ **Hecho (sesión 10).**
7. Almacén (mejora 4 y tamaños relativos, decidir el oso).
8. Modo libre con la tabla de dificultades.
9. Tienda de estrellas con permisos.
10. Generador de niveles 11 a 22,600 y bot de backtracking.

## Por construir poco a poco
1. **Paso siguiente:** subir `compartido/dificultad-niveles.js` y escribir el generador de niveles 11 a 22 600 (reparto de dificultad de la sección 8 del estándar: 50/40/10 al inicio hasta 25/40/35 al final). No cambiar después de publicar.
2. ~~Queso y mantequilla (vaca)~~ hechos en la sesión 10. Pastelería / sastrería cuando haya receta cerrada.
3. Modo libre: ajustar las cifras de las 5 dificultades jugándolas. Ya tiene modos, barra de dificultad, tamaño y dinero de pruebas (sesión 6); falta el contenido del Mod de Polo (ver «Mod de Polo»).
4. Tienda y boosts con `eco.gastar()`; más estrellas por otras metas.
5. Confirmar cifras (ver «Por resolver») y un dibujo mejor que el emoji para los animales.
6. Imagen de tarjeta (`imagenes/granjafeliz.webp`, anotarla en `ARCHIVOS` de `sw.js`), fila y nota «Estado» en el README principal.
7. Probar todo en navegador y celular (ver «Pruebas»).
8. Aplicar poco a poco la lista de «Especificación de la versión original» (arriba) y, después, escribir la del Mod de Polo.

## Historial
- **Sesión 13 (15 nov 2026):** **pestaña «Animales» en la ventana del almacén** (`panel-almacen-granjafeliz.js`: opción `alVender` y dato `animales`; `juego-granjafeliz.js`: `animalesDelPanel()` y `venderSeleccion()`, que vuelve a validar y paga `VENTA_ANIMAL` × precio por cada uno). La pestaña sale siempre que se abre la ventana (sin animales dice «No tienes animales»). Probado: el panel con jsdom (15 + 6 comprobaciones) y el juego real en Modo libre con DOM falso (abrir el almacén, ir a la pestaña, vender 2 gallinas: $250 → $350). **Pendiente:** varios gatos (hoy uno por nivel) y probarlo en navegador y celular.
- **Sesión 12 (15 nov 2026):** cierre del almacenamiento. **Mejora 4 del almacén a $12,000** y **oso enjaulado a $100** (valores de la guía de Polo). La ventana «Enviar productos» ahora **explica siempre por qué algo no cabe** (texto fijo abajo: «No cabe más en el camión (60 / 60): Leche, Oso enjaulado…» o «El camión no puede con «Leche»… Mejora el camión»), porque los botones desactivados no reciben toques y los avisos de antes nunca salían. El rótulo del camión muestra «🚚 $pago · ⚖️ peso/capacidad» de lo que cargaría. Se quitaron las constantes sin uso `CAPACIDAD_ALMACEN` (30) y `CAPACIDAD_CAMION` (10). `sw.js` sube a la versión 178 (sin archivos nuevos). Pruebas: almacén y camión 66, derrota 43, tutorial 57 y el aviso de la ventana (6, con jsdom, no incluida). **Pendiente del almacén según la guía:** pestaña «Animales» (vender desde el almacén) y varios gatos; volver a calibrar los niveles 1-10 y probarlo todo en navegador y celular. Ojo: con el oso a $100 el nivel 10 (empieza con $40) se vuelve un poco más fácil; la tabla de dificultades del Modo libre (jaula $120 a $20) sigue siendo propuesta.
- **Sesión 11:** **almacén y camión convertidos de las cajas de Farm Frenzy 1 a puntos** (decisión de Polo: no usar cajas; sí un inventario con valor numérico por producto). Cada producto tiene `espacio` (almacén, leche = 100) y `peso` (camión = 30 / máximo por caja; caja = `CAJA_CAMION` = 30). Camión = cajas × 30 (60 / 90 / 120 / 150 / 210) con los **tiempos de viaje de la guía** (20 / 15 / 12 / 10 / 4 s); almacén 100 / 300 / 1,000 / 3,000 / 10,000. El oso pesa 30 (una caja) pero ya se puede **mezclar** con otros productos (1 oso + 5 huevos = camión base). Se quitó `fraccionAlmacen`. Pruebas: `prueba-almacen-camion-granjafeliz.mjs` (64 comprobaciones), `prueba-salida` actualizada (43) y la ventana «Enviar productos» (oso + huevos, leches, envío; con jsdom). **Pendiente:** volver a calibrar los niveles 1-10 (el almacén base guarda 20 huevos, el viaje base dura 5 s más) y confirmar la mejora 4 del almacén ($2,000 hoy, $12,000 en la guía).
- **Sesión 10:** **edificios que faltaban:** 🥣 Batidora (leche → mantequilla, $20,000 → $60,000) y 🧀 Quesería (mantequilla → queso, $40,000 → $120,000), con sus 4 mejoras (lote 1 a 5) y los productos 🧈 mantequilla ($2,000) y 🧀 queso ($8,000). Estilos de casa propios, textos de las franjas que se achican para costos de seis cifras, y en el Modo libre entran en Normal / Difícil / Experto (tamaños Mediano y Grande; el Original sigue con 4 espacios). Probado en Node con el juego real y DOM falso (54 comprobaciones: costos, cadena leche → mantequilla → queso, mejoras hasta el nivel máximo, lote de 5, sin dinero / sin insumos, espacios por tamaño). **Pendiente:** ningún nivel del mapa usa estos edificios todavía (los niveles 11 en adelante); los tiempos de 10 s y 12 s y el peso 50 son propuesta mía.
- **Sesión 9:** **condición de derrota**: `salida-granjafeliz.js` (`sinSalida`, función pura) revisada cada 1 s por el juego con 3 s de confirmación; pantalla «Ya no hay forma de avanzar» con Reintentar y Mapa; también termina el Modo libre. Prueba en Node de la regla (43 comprobaciones) y del juego real con DOM falso (17: derrota a los 3 s, texto, botones, sin estrellas, camión en camino, oso suelto, nivel 8 y 9 no empiezan perdidos, Modo libre).
- **Sesión 7:** sistema de **hambre** (6 puntitos bajo cada animal: de 6 a 2 en 15 s; con 2 corre a comer) y **pasto en zonas** (un área de matas con 3 usos, que crece en 2 s; cada uso llena al animal); el **pozo pasa arriba al centro** y el **almacén** es una bodega abajo al centro (se quita la jaula); botones de **comprar animales arriba a la izquierda**, con 🐕/🐈 y las metas recorridos; arreglo de los emojis de animales y productos, que se dibujaban casi transparentes (`emo()` ahora fija un `fillStyle` opaco).
- **Sesión 6:** Modo libre con dos botones (Juego original / Mod de Polo) y pantalla de ajustes: barra de dificultad con punto deslizante, barra de tamaño de la granja y dinero inicial de pruebas (sin récord); `TAMANOS` y `usarTamano()` en la escena (Original 4 / Mediano 6 / Grande 10 espacios de edificio); marcas del modo libre por modo, tamaño y dificultad; el reloj ya no queda bajo el chip de monedas; README con el plan del Mod de Polo y de los niveles de México.
- **Sesión 1:** metas + medallas por tiempo (base = Farm Frenzy 1); el tiempo ya no hace perder el nivel.
- **Sesión 2:** condiciones de inicio (`construidos`, `regalo`) y venta de animales.
- **Sesión 3:** precios, costos y niveles 1-10 de la versión 1; calendario de osos; campos `perro: false` y `pista`; se quitó el nivel 3 de pruebas.
- **Sesión 4:** pozo con mejoras (franja ⬆ en la caja del pozo, capacidad 3 / 9 / 15 / 25 / 50, `mejoras.pozo` en los niveles) y README al día con las notas de las sesiones 1 a 3.
- **Sesión 5:** se quitó el pavo (como la versión 1); modo libre con 5 dificultades y marca por dificultad (`LIBRE`, `libre` en el progreso); revisión del sistema de estrellas (ventana de fin con «tu mejor» al repetir peor; pruebas de monedas, mapa y fusión).
