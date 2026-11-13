# Granja feliz (`granjafeliz`)

Juego estilo Farm Frenzy 1, **solo horizontal** (en vertical pide girar el celular). Id de puntos: `granjafeliz`. Sigue `ESTANDARES-juegos.md`: menú principal estándar (♾️ Modo libre · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), mapa de 22 600 niveles (100 por estado y por país), madera clara/oscura, ☰ Pausa, chip de monedas.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-granjafeliz.html` | Menús, canvas del escenario y aviso «gira el celular» |
| `juego-granjafeliz.js` | Menú, mapa, partida (simulación + dibujo en canvas transparente), fin de nivel «Siguiente nivel ▶» sobre el tablero |
| `datos-granjafeliz.js` | **Aquí se agrega lo nuevo**: `PRODUCTOS` (valor y peso), `ANIMALES`, `EDIFICIOS` (recetas y costos), `MEJORAS`, `OSOS`/`PERRO`/`GATO`, `NIVELES`, `LIBRE` (dificultades del modo libre) y constantes |
| `economia-granjafeliz.js` | Estrellas y monedas por nivel y marca del modo libre; progreso `granjafeliz_progreso_v1` (`{ e: {nivel: estrellas}, gastado, libre?: {dificultad: marca}, t }`) sincronizado con `conectar()` |

## Fuente de las cifras
Precios, valores, costos de mejoras y edificios, metas y tiempos de oro/plata de los **niveles 1-10** salen de una guía de fans de Farm Frenzy 1 (Cyberly, Sandy L., 2008): son cifras de una guía, no del juego mismo. Lo que dice «mío» en este README o en los comentarios de `datos-granjafeliz.js` (pesos, capacidades, tiempos, velocidades, cifras de polar y panda, etc.) es propuesta de este proyecto y se puede ajustar.

## Cómo se juega
Tocar el **pozo** (4 s) llena el agua → tocar el **campo** planta pasto (1 agua, máx. 16 matas) → los animales lo comen y producen → tocar cada **producto del suelo** para llevarlo al **almacén** (desaparece a los 12 s) → tocar el **camión** vende → **comprar** más animales. Con edificios, el producto se lleva a procesar antes de venderlo.

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

| Dificultad | Inicio | Se compra | Edificios | Osos |
|---|---|---|---|---|
| Muy fácil | $1,000, 4 gallinas; almacén, camión y pozo en nivel 2; gato de regalo | gallina, oveja | planta de polvo, panadería | no hay |
| Fácil | $500, 3 gallinas; almacén y camión en nivel 2 | gallina, oveja; gato | + hilandería | oso: primero a los 90 s, luego cada 60-90 s |
| Normal | $250, 2 gallinas | gallina, oveja, vaca; gato | los 4 | oso: 60 s, luego 45-60 s |
| Difícil | $150, 1 gallina | igual | los 4 | oso y polar: 40 s, luego 35-50 s |
| Experto | $100, 1 gallina | igual | los 4 | oso, polar y panda: 30 s, luego 25-40 s |

- **Marca:** lo máximo que has **vendido con el camión en una sola partida**, por dificultad (las ventas de animales no cuentan, igual que en la meta de dinero). Se anota **sola con cada venta** que supera la marca, sin tener que terminar la partida; la barra de arriba muestra «💰 Vendido» y «🏆 Récord», y sale «¡Nuevo récord!» al superar una marca anterior. Va en el mismo progreso (`libre`) y se sincroniza con la cuenta; si no hay marcas, `libre` no se guarda.
- **Pantalla de dificultades:** cada botón dice «Dificultad · récord $N» (o «sin récord»).
- **☰ Pausa en el libre:** Continuar · 🏁 Terminar partida (muestra lo vendido y el récord, con «Jugar otra vez ▶» y «Dificultades») · 🔄 Empezar de nuevo · Salir (vuelve a las dificultades).
- **Las cifras son mías** (propuesta): ajustarlas jugando. La leche y la tela pesan 50, así que de Normal en adelante hay que mejorar almacén y camión antes de venderlas.

## Animales
Todo sale de `ANIMALES` (el juego los trata por datos). Nunca mueren de hambre: les da hambre tras `segHambre` segundos produciendo, comen pasto (cada pasto da 4 mordidas; lo comido se conserva si el pasto se acaba a la mitad) y sin pasto se quedan quietos (😢) con su ciclo **pausado**. Cada animal reserva un pasto con mordidas suficientes (`pastoLibre()`) para no amontonarse.

| Animal | Precio | Máx. | Ciclo | Producto | Mordidas |
|---|---|---|---|---|---|
| 🐔 Gallina | $100 | 12 | 5 s | huevo | 2 |
| 🐑 Oveja | $1,000 | 6 | 12 s | lana | 4 |
| 🐄 Vaca | $10,000 | 4 | 20 s | leche | 5 |

- Animales y precios como en la versión 1: gallina, oveja y vaca. **El pavo se quitó** (no existe en la versión 1), junto con su huevo. Ciclo y producto de oveja y vaca vienen de una conversación anterior con Gemini (sin confirmar); mordidas, `segHambre` (= 2 × ciclo), velocidad, máximo, tamaño y emoji son míos.
- **Comprar:** cada nivel dice cuáles con `NIVELES[n].comprables` (por defecto solo la gallina). Con uno, botón «Comprar» grande; con 2 a 3, una columna de botones compactos (emoji, precio y `cantidad/máx`) bajo el camión.
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

- **Pozo con mejoras (sesión 4):** la capacidad es cuántas cargas de agua guarda (cada pasto gasta 1). Mejorar sube la capacidad pero **no regala agua**: hay que tocar el pozo y esperar para llenarlo. **Llenarlo siempre tarda 4 s** (`SEG_POZO`) hasta su capacidad, sea cual sea el nivel, y es gratis (el original cobra $1 por rellenar; aquí no). El nivel base es **3** y no 5 como decía la tabla vieja, para no cambiar los niveles 1-10 ya calibrados (empiezan con 3 cargas). Con más de 16 de capacidad ya sobra agua para todo el pasto posible (`MAX_PASTO` = 16): es el equivalente del «infinito / 50 usos» del original. La caja del pozo se reacomodó para dejar sitio a la franja ⬆.

## Edificios de procesamiento
Cada nivel los lista en `NIVELES[n].edificios` (máx. 4, de izquierda a derecha) y aparecen como espacios vacíos en una franja al pie del campo (los animales y el pasto quedan por encima; ahí no se planta).

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
- **Sin probar en navegador/celular.** El jugador automático es mejor que una persona novata: falta probar los niveles con personas y **ver el dibujo en pantalla**: tamaño táctil de las franjas ⬆ (28 en cajas, 26 en edificios) y de los espacios de edificio (138×70), los 3 botones de compra (gallina, oveja y vaca, ~38 de alto), los emojis grandes de vaca y oveja, la pista de 7 s, los nombres nuevos de edificios, el oso de 42 px con su jaula de barrotes, los botones 🐕/🐈 de 32 de alto la caja del pozo reacomodada (título arriba, agua en medio, franja ⬆ al pie) y los 5 botones de dificultad del modo libre en un celular horizontal (de poco alto se achican a 50 px).

## Por resolver
1. **Pesos contra capacidades:** la leche y la tela (50) no caben en el camión hasta su nivel 3 (100) ni en el almacén base (30) hasta el nivel 2; el pastelito (10) llena el camión base. Los niveles con esos productos deben dar antes las mejoras.
2. **Perro:** $100 por llamada (propuesta) o $2,600 una sola vez como en la versión 1.
3. **Edificios:** la cola (2 lotes) y los lotes por nivel (1 a 5) son propuesta mía en el modelo de cola; confirmar o cambiar en `MAX_COLA_EDIF` y `MEJORAS.fabricaN.lote`. Con los valores actuales procesar multiplica el valor de cada huevo pero también su peso: el camión pasa a ser el cuello de botella.
4. **Pozo:** si se quiere el cobro de $1 por rellenar del original, habría que agregarlo; hoy es gratis.

## Por construir poco a poco
1. **Paso siguiente:** subir `compartido/dificultad-niveles.js` y escribir el generador de niveles 11 a 22 600 (reparto de dificultad de la sección 8 del estándar: 50/40/10 al inicio hasta 25/40/35 al final). No cambiar después de publicar.
2. Queso y mantequilla (vaca), y pastelería / sastrería cuando haya receta cerrada.
3. Modo libre: ajustar las cifras de las 5 dificultades jugándolas, y decidir si lleva más opciones (hoy solo las 5 dificultades).
4. Tienda y boosts con `eco.gastar()`; más estrellas por otras metas.
5. Confirmar cifras (ver «Por resolver») y un dibujo mejor que el emoji para los animales.
6. Imagen de tarjeta (`imagenes/granjafeliz.webp`, anotarla en `ARCHIVOS` de `sw.js`), fila y nota «Estado» en el README principal.
7. Probar todo en navegador y celular (ver «Pruebas»).

## Historial
- **Sesión 1:** metas + medallas por tiempo (base = Farm Frenzy 1); el tiempo ya no hace perder el nivel.
- **Sesión 2:** condiciones de inicio (`construidos`, `regalo`) y venta de animales.
- **Sesión 3:** precios, costos y niveles 1-10 de la versión 1; calendario de osos; campos `perro: false` y `pista`; se quitó el nivel 3 de pruebas.
- **Sesión 4:** pozo con mejoras (franja ⬆ en la caja del pozo, capacidad 3 / 9 / 15 / 25 / 50, `mejoras.pozo` en los niveles) y README al día con las notas de las sesiones 1 a 3.
- **Sesión 5:** se quitó el pavo (como la versión 1); modo libre con 5 dificultades y marca por dificultad (`LIBRE`, `libre` en el progreso); revisión del sistema de estrellas (ventana de fin con «tu mejor» al repetir peor; pruebas de monedas, mapa y fusión).
