<!-- Ruta: imperio/README.md (en el repo, guárdalo con ese nombre dentro de la carpeta imperio) -->
# 🏛️ Imperio

Estrategia isométrica estilo Age of Empires. **Tú eres siempre el equipo azul.** Frente a ti hay un castillo destruido; si lo reconstruyes antes que los rojos, ganas.

> **Estado.** Este documento describe el juego completo. Cada sección marca qué ya existe (✅) y qué falta por hacer (🔜), para que sirva también de plan de trabajo.

---

# 🆕 Nueva dirección: estilo Age of Empires II (notas del 10 nov 2026)

> **Nada de esta sección está programado todavía.** Es el plan. Donde choque con lo que dice el resto de este documento (el diseño anterior), **gana esta sección**; la tabla 2 lista los choques. Marcas: 🔜 por programar · ❓ por decidir · 💡 idea propuesta (no decidida, hay que confirmarla).

## 1. Idea general

- Inspiración: **Age of Empires II**. Partidas **largas**: el jugador hace crecer su reino y el **nivel del castillo** hasta cierto nivel; ahí se gana. 🔜
- Hay que construir una **economía con oficios** (leñadores, mineros, herreros, carpinteros, armeros, cultivadores…), un **gobierno** (ayuntamiento) que maneja el dinero, **tropas** de varias clases y **oleadas de enemigos cada 5 minutos**.
- ❓ **Cuántos niveles tiene el castillo.** 💡 Propuesta: **5 niveles**, igual que los 5 niveles de guerrero, y que cada nivel desbloquee edificios y tropas (como las «edades» de AoE2). Subir de nivel cuesta minerales.
- ✅ **Decidido (10 nov 2026): el castillo y el ayuntamiento son DOS edificios separados.** El **ayuntamiento** es el centro de la economía y del gobierno y siempre está de pie al empezar con 2000 de vida (como el Centro Urbano de AoE2). El **castillo en ruinas** es la meta de la partida y se reconstruye por niveles con minerales. Si el ayuntamiento cae, ❓ ver preguntas (sección 12).

## 2. Qué cambia respecto al diseño anterior

| Tema | Antes | Ahora |
|---|---|---|
| Cómo se gana | Entregar 1000 madera, 1000 piedra, 500 oro… y reconstruir el castillo antes que los rojos | **Subir el nivel del castillo** hasta el nivel meta. ❓ ¿Los rojos siguen existiendo como rival que también sube su castillo, o ahora el enemigo son solo las oleadas? |
| Minas | Se agotan (500 de material cada una) | **Infinitas.** Lo limitado es **dónde están** las minas, no cuánto dan |
| Animales | Oso, lobos y guepardo atacan | **Ningún animal ataca.** Para los humanos es muy fácil matarlos |
| Piedra | Sale de las minas | **Solo de las rocas del exterior** (no de las minas) |
| Dinero | 250 monedas iniciales y todo se paga con monedas | **Sistema de dinero real** manejado por el ayuntamiento (sección 5.4) |
| Tropas | Recolector, Constructor y Guerrero a $10 cada uno | Salen **gastando comida (vegetales)** y tienen oficios y dueños (secciones 6 y 7) |
| Edificios sobre árboles | Los árboles estorban | **Se puede construir aunque haya árboles** en el sitio |
| Postes de imperio | Marcan dónde poner cofres | **Banderas** que amplían la zona del reino (hace falta un carpintero) |

## 3. Control del jugador (como en AoE2)

- 🔜 **Selección por arrastre:** clic (o toque) y arrastrar dibuja un rectángulo; todos los soldados dentro quedan **seleccionados** y se les pueden dar órdenes.
- 🔜 **Órdenes con las tropas seleccionadas:**
  - Tocar otra parte del mapa → **caminan hacia allá** (en fila, ver «Grupos» en la sección de tropas).
  - Seleccionar **a uno solo** y luego tocar un **árbol** o una **roca** → se pone a **trabajar** en eso.
  - Tocar un enemigo → lo atacan. Tocar un edificio en obra → lo construyen.
- ✅ Ya existe el panel 🎯 (grupos de hasta 15 y «Seleccionar grupo»): se conserva y sirve como ruta para pantalla táctil.
- 💡 Extras de AoE2 que valen la pena: **grupos de control** (Ctrl+número para guardar, número para llamar), **doble clic** para seleccionar todos del mismo tipo, botón **«obrero inactivo»**, **punto de reunión** por edificio y **cola de producción**.
- 💡 **Actitud de combate** por grupo: *agresiva* (persigue), *defensiva* (pelea cerca y vuelve), *no atacar*.
- ❓ En PC hoy las teclas WASD/flechas mueven al personaje. Con selección y órdenes habrá que decidir si WASD sigue moviendo al personaje o mueve la cámara (y habrá que hacer un **minimapa**: con 300 × 300 casillas ya no se puede ubicar uno sin él).

## 4. Cómo empieza la partida

- ✅ **Mapa de 300 × 300 casillas** (90 000), tu base arriba a la izquierda (ver sección 4.1 y «El mapa» más abajo).
- 🔜 El reino empieza con: el **castillo en ruinas**, el **ayuntamiento de pie con 2000 de vida**, **1 o 2 torres** y **un par de edificios más** (el refugio ya existe). Cada edificio nuevo que se agregue necesita **toda su estructura** (quién lo construye, qué vende o produce, cuánto almacena, sus niveles); se van haciendo de uno en uno.
- ❓ Cuáles son esos «par de edificios» iniciales. 💡 Sugerencia: casa (población) y el edificio de venta de leña.

### 4.1 Mapa de 300 × 300 y bases enemigas

- ✅ **Mapa de 300 × 300 casillas** (antes 98 × 98): 9 veces más área. Se cambia en `LADO_MAPA` al inicio de `juego-imperio.js`. Las partidas guardadas **conservan su tamaño** (44 × 44 o 98 × 98); solo las partidas nuevas son de 300.
- Distancias con la velocidad actual (2.3 casillas por segundo): de tu base al centro del mapa son unos **2 minutos** a pie y a la esquina opuesta unos **4 minutos**. Conviene tenerlo presente al pensar las oleadas de cada 5 minutos y cuánto tardan en llegar.
- Para que el mapa grande funcione bien se cambió por dentro: la generación tarda ~0.4 s (antes habría tardado 2.4 s), el dibujo solo recorre las casillas que caben en pantalla, los animales a más de 36 casillas de cualquiera de tus tropas o edificios se quedan quietos (hay ~1400) y árboles y rocas se guardan en formato compacto. Cada partida pesa unos **130 KB** (sin compactar serían ~480 KB).
- ⚠️ **Límite de la nube:** todas las partidas se sincronizan juntas en un solo documento de la cuenta, que admite 1 MB. Con ~130 KB por partida caben unas **7 partidas de 300 × 300** sincronizadas; si hay más, las demás se quedan solo en el dispositivo (el juego no falla). 💡 Solución futura si hace falta: guardar solo la **semilla del mapa** y lo que cambió.
- 🔜 **Varias bases enemigas pequeñas**, en **lugares aleatorios** del mapa, que **crecen poco a poco** (edificios y tropas). Se deja para después. Hoy el código solo reserva 5 sitios fijos (las 4 esquinas y el centro) donde no hay agua; esos sitios se sustituirían por las bases aleatorias.
  - ❓ Cuántas bases y a qué distancia mínima de la tuya (💡 con 300 × 300 caben unas 4 a 6, ninguna a menos de ~80 casillas).
  - ❓ Qué tan rápido crecen y hasta dónde (💡 que su tamaño dependa del tiempo de partida, para que las zonas lejanas se vuelvan más peligrosas con el tiempo).
  - ❓ Si **las oleadas de cada 5 minutos salen de estas bases** (💡 sí, y así destruir una base reduce las oleadas) y si se pueden destruir.
  - 💡 Que cada base tenga minas cerca, para que valga la pena atacarlas.
- Minas: siguen siendo 75 en todo el mapa (una por cada ~1200 casillas). Con minas infinitas ❓ habrá que decidir cuántas son (hoy hay una al menos a 6 casillas de otra).

## 5. Economía

### 5.1 Recursos
- Madera, piedra, comida (vegetales y carne), y minerales: **oro, metal y cobre** (por ahora).
- ❓ **«Metal»:** ¿es el hierro? Antes había plata, carbón, fibra y piel. 💡 Propuesta: oro, hierro (el «metal»), cobre y piedra como base; plata, carbón, fibra y piel se reservan para niveles altos de mejoras.

### 5.2 Minas (infinitas, pero escasas)
- Dan recurso **sin agotarse**. Lo que limita es la **ubicación**: pocas minas y lejos, y hay que protegerlas.
- Producción de partida (cifras provisionales): **3 de oro, 6 de metal y 10 de cobre por minuto**.
- **En los primeros niveles es extremadamente lenta**; mejorar el edificio de mineros la acelera.
- ❓ ¿Esas cifras son **por mina** o **por minero**? 💡 Propuesta: por mina con **1 minero**, y cada minero extra (hasta un tope) suma, para que tener más minas o mineros sea la forma de crecer.
- Las minas son **solo de minerales**: no dan piedra.

### 5.3 Piedra y madera
- La piedra solo sale de las **rocas del exterior**. Cada roca dura **2000 golpes** y cada golpe da **3 de piedra** (6000 por roca).
- Los **mineros** pican y, cuando su inventario llega a **50**, lo descargan en el **ayuntamiento** (el edificio principal). Cuando exista el **edificio de venta de mineral y piedra** de los mineros, será el punto de descarga. 💡 Y lo mismo para los leñadores: el edificio de venta de leña/tablones es donde descargan, como el *Lumber Camp* de AoE2.
- Los **leñadores** tienen su propio edificio de venta de **leña o tablones**; el **carpintero** les compra mucha madera.
- ❓ Cuánta madera da un árbol y si los árboles se replantan (el plan viejo ya dice 5 minutos para dar frutos).

### 5.4 Dinero y gobierno 🔜
- El **ayuntamiento** es el gobierno y trabaja aparte: **paga a los herreros para convertir oro en monedas**, **fija el valor de la moneda** y con ella **paga a los mineros y a los guerreros**.
- Debe haber un **conteo real del dinero**: cuánto oro hay, cuántas monedas se acuñaron, cuánto se pagó.
- **Gasto por existir:** cada cierto tiempo las tropas y los obreros cuestan recursos (sueldo o comida). Los recursos deben ser **abundantes**: el gasto existe, pero nunca asfixia. 💡 Para no caer en un círculo vicioso (sin monedas, nadie trabaja, menos monedas): si falta dinero, las tropas **trabajan más lento** o dejan de ganar mejoras, pero **no mueren ni se van**.
- 💡 **Impuesto:** el ayuntamiento se queda un porcentaje de cada venta entre oficios. Así el jugador tiene ingreso propio y el gobierno puede pagar sueldos.
- 💡 **Mercado** (como el de AoE2): cambiar un recurso por otro con un precio que mueve el ayuntamiento.

### 5.5 Límites de espacio y población 🔜
- El **nivel del ayuntamiento** fija el **tope de recursos** que se pueden acumular y cuánta **gente** cabe. Con ayuntamiento bajo hay poca gente; al subirlo se pueden crear **más trabajadores**.
- Después hay que construir **casas** donde caben varias personas (obreros y guerreros).
- ❓ Topes por nivel (por ejemplo población 10 / 20 / 35 / 50 / 75 y almacén x2 por nivel).

### 5.6 Métricas 🔜
- Medir **cuántos recursos se obtienen y se gastan** por minuto y por tipo de unidad (obreros, soldados), visible en una pantalla de estadísticas y al terminar la partida. Sirve para balancear y para que el jugador vea su avance.

## 6. Oficios y edificios

| Edificio / oficio | Qué hace | Estado |
|---|---|---|
| 🏛️ **Ayuntamiento** | Edificio principal, 2000 de vida, siempre de pie al empezar. Recibe lo que descargan los mineros. Fija el dinero y paga sueldos. Su nivel limita recursos y población | 🔜 |
| 🥕 **Tienda de vegetales** | La construye un Constructor y **ese constructor queda como dueño**. Compra vegetales a los dueños de cosechas, los almacena (mucho) y los vende. Sube de nivel y almacena más | 🔜 |
| 🌾 **Cosecha** | Se crea dándole la misión a un Constructor; **él es el dueño y la trabaja**. Cultiva variedad y la vende **en cajas** por cantidades a las tiendas de vegetales | 🔜 |
| 💡 **Molino** | Punto de entrega de las cosechas y bono de rendimiento (como el *Mill* de AoE2) | 🔜 |
| 🏠 **Casas** | Alojan obreros y guerreros; suben el tope de población | 🔜 |
| 🪓 **Leñadores y su venta** | Edificio propio de venta de leña/tablones | 🔜 |
| ⛏️ **Mineros y su venta** | Edificio propio de venta de mineral y piedra | 🔜 |
| ⚒️ **Herrero** | Funde oro en monedas (le paga el ayuntamiento), fabrica armas y las **vende al armero**. Ya existe una versión con 5 espadas | ✅ base · 🔜 conectarlo a esta economía |
| 🛡️ **Armero** | **Compra recursos y armas al herrero**. Vende **edificios de armas y armas grandes** (se irán definiendo) y las armaduras | 🔜 |
| 🪚 **Carpintero** | Fabrica **arcos y banderas**; compra mucha madera | 🔜 |
| 🚩 **Bandera** | **Amplía la zona del reino** para construir lejos de la base | 🔜 |
| 🗼 **Torres de ataque** | Ya hay torre ($120) y torre de arqueros ($150). El reino empieza con 1 o 2 | ✅ |
| 🪨 **Arma de balanza (de madera)** | Edificio defensivo que **lanza rocas**, cubre un área y ataca a los enemigos que se paren en ella | 🔜 |
| 💣 **Cañón** | Cuesta **madera y metal**. Ya existe el cañón con ruedas ($250); falta pasarlo a ese costo | ✅ base · 🔜 costo |
| 🏥 **Hospital** | Cura tropas cercanas | ✅ |
| 🧱 **Muros** | De madera o piedra | ✅ |

- **Edificios nuevos programados (10 nov 2026, versión inicial, costos provisionales):** se construyen desde 🏗️ Edificios, todos 2×2.
  | Edificio | Costo | Qué hace hoy | Falta (🔜) |
  |---|---|---|---|
  | ⛏️ **Casa de piedra y minerales** (`minera`) | $180 | Punto de entrega de piedra y minerales: los recolectores que cargan eso van a la más cercana (también sirven el castillo y el almacén) | Que sea el único comprador, niveles y mineros propios |
  | 🏦 **Tesorería del ayuntamiento** (`tesoro`) | $300 | Junta un 10 % **extra** de cada entrega de recursos (tope 500). Se recoge con el botón «💰 Recoger impuestos». El montón de monedas del dibujo crece con lo juntado | Pasarla al ayuntamiento real (todavía no existe), pagar sueldos y fijar el valor de la moneda, niveles |
  | 🥕 **Tienda de vegetales** (`verduras`) | $120 | Solo la estructura: dibujo, vida y capacidad de 200 vegetales | Dueño (el constructor), cosechas que le vendan, vender comida para crear soldados, niveles |
  | 🛡️ **Armería** (`armeria`) | $260 | Vende una armadura por tropa ($60): **duplica su vida** (se guarda en la partida) | Que compre armas al herrero, catapultas y armas grandes, dibujar la armadura en la tropa |
  - El ⚒️ **Herrero** ya existía (5 espadas). Sigue igual; pendiente conectarlo con la armería y con la economía de oro y monedas.
  - ❓ Cuántas armaduras por tropa, si la tesorería debe **quitar** el impuesto en vez de sumarlo, y de dónde sale el vegetal de la tienda.
- **Mejorar edificios:** al juntar **ciertas cantidades de minerales** se puede subir el nivel de un edificio (más almacén, más producción, más cosas que vender).
- **Colocar edificios:** se pueden poner **aunque estorben árboles** en el sitio. ❓ ¿Los árboles se talan solos, desaparecen o quedan «bajo» el edificio?

## 7. La cadena de los dueños (vegetales) 🔜

```
Constructor ──construye──▶ 🥕 Tienda de vegetales  (el constructor queda como DUEÑO)
Constructor ──recibe misión──▶ 🌾 Cosecha           (el constructor queda como DUEÑO y la trabaja)
Dueño de cosecha ──vende cajas──▶ Dueño de tienda   (cantidades fijas por caja)
Tienda de vegetales ──alimenta──▶ nacimiento de soldados (los soldados se crean con vegetales)
```

- Los **soldados se crean con productos como los vegetales** (comida como costo de las tropas).
- 💡 **Cómo mantenerlo manejable:** primera versión con **un dueño fijo por edificio** (un obrero asignado), **precios fijos** puestos por el ayuntamiento y las ventas como **traslados entre almacenes**. Los precios que suben y bajan se agregan después, junto con el mercado.
- 💡 Mostrar siempre **quién es dueño de qué** (nombre sobre el edificio) y cuánto produce; si no, el sistema se vuelve difícil de seguir.

## 8. Tropas

| Tropa | Notas |
|---|---|
| ⚔️ Guerrero de espada | Base |
| 🏹 Guerrero de arco | Ataca de lejos. Los arcos los hace el carpintero |
| 🔥 Guerrero de arco con fuego | Arco con flechas de fuego |
| 🔨 Guerrero musculoso con maza | Golpe fuerte |
| 🐎 Guerrero con caballo y espada (**jinete**) | Rápido. 💡 Sale de un establo |
| 🪨 **Catapulta con ruedas** | La vende el armero. Avanza y lanza rocas. **1000 de vida** |

- **Armadura:** a cada tropa se le puede comprar una armadura que le **duplica la vida**.
- **Daño por golpe según el nivel del guerrero** (solo existen estos 5 niveles; vale para los guerreros de cualquier bando):

  | Nivel | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | Daño por golpe | 1 | 1.5 | 2 | 2.5 | 3 |

- **Al mejorar el herrero mejoran las tropas** (se mantiene de antes).
- ❓ **Vida de cada tipo de tropa** y la de los enemigos (con 1 de daño por golpe hacen falta números de vida chicos o combates muy largos). ❓ Costo en comida, monedas y metal de cada una.
- 💡 **Contrarrestos** como en AoE2: jinetes ganan a arqueros, espadas y mazas ganan a jinetes, arqueros ganan a espadas desde lejos, la maza y la catapulta son buenas contra edificios. Así no basta con hacer una sola clase.
- 💡 **Guarnición:** meter tropas en torres para que disparen más y proteger a los obreros dentro del ayuntamiento durante una oleada.
- ✅ Los grupos de hasta 15 en fila (guerreros adelante, constructores, recolectores atrás) se conservan. 🔜 El editor de grupos mixtos sigue pendiente.

## 9. Animales y rebaños

- 🔜 **Ningún animal ataca** (oso, lobos y guepardo pasan a ser pasivos o de huida) y son **fáciles de matar** para los humanos. Siguen dando carne y piel.
- 🔜 **Rebaños de ovejas y vacas**: se quedan **siempre cerca de su cuidador**. **Siempre debe haber un cuidador** por rebaño; sin cuidador, el rebaño no se queda.
- ❓ Qué dan ovejas y vacas (carne, lana/fibra, leche) y si el cuidador también es dueño del rebaño como en las cosechas.

## 10. Oleadas de enemigos 🔜

- Una oleada de atacantes **cada 5 minutos**.
- 💡 Ayudas para que se sienta justo: **cuenta regresiva** a la siguiente oleada, una **flecha o aviso** del lado por donde viene y oleadas que **crecen** con el tiempo (más tropas y nivel más alto de guerrero enemigo).
- ❓ De dónde salen: ¿del campamento rojo que sigue existiendo en el mapa o aparecen por los bordes? ❓ ¿Qué pasa si destruyen el ayuntamiento (derrota inmediata)?

## 11. Ideas de AoE2 que propongo agregar (💡 por confirmar)

1. **Edades = niveles del castillo/ayuntamiento** (5 niveles) como motor de la partida.
2. **Edificios de entrega junto al recurso** (leña, mineral, molino) para acortar los viajes.
3. **Un edificio por clase de tropa**: cuartel (espada/maza), arquería, establo (jinetes) y taller de asedio (catapultas), cada uno con cola y punto de reunión.
4. **Cambio automático de obrero:** al agotarse un árbol o roca, busca otro cercano en lugar de quedarse parado.
5. **Niebla de guerra y minimapa** (ya hay niebla de lo explorado; el minimapa hace falta con 300 × 300).
6. **Pantalla de estadísticas** al final (recursos, bajas, tiempo) y una puntuación.
7. **Dificultad** de las oleadas (fácil / normal / difícil) y partidas con un nivel meta distinto.
8. **Granjas que no se acaban** si se replantan (en AoE2 se reponen con comida), compatible con las cosechas de los dueños.
9. **Ataque a edificios y asedio:** que la maza y la catapulta hagan más daño a edificios, y las murallas tengan puertas.

## 12. Preguntas por decidir (resumen)

1. ~~¿Castillo en ruinas y ayuntamiento son dos edificios distintos?~~ ✅ **Sí, son dos.** Queda ❓ qué pasa si el ayuntamiento cae (derrota inmediata o se reconstruye).
2. ¿Cuántos niveles tiene el castillo y qué cuesta cada uno?
3. ¿Los rojos siguen como rival que reconstruye su castillo, o solo hay oleadas?
4. «Metal»: ¿es hierro? ¿Qué pasa con plata, carbón, fibra y piel?
5. ¿Las cifras de las minas (3 / 6 / 10 por minuto) son por mina o por minero?
6. Vida y costo de cada tropa, y de los enemigos.
7. Topes de población y almacén por nivel del ayuntamiento.
8. Qué pasa con los árboles al construir encima.
9. Qué da cada rebaño y quién es su dueño.
10. WASD: ¿mueve al personaje o a la cámara cuando ya haya selección por arrastre?
11. Bases enemigas pequeñas: cuántas, a qué distancia mínima de tu base y si las oleadas salen de ellas (ver 4.1).

## 13. Orden de trabajo sugerido

1. **Control:** selección por arrastre, mover y ordenar trabajo (lo que más cambia cómo se siente el juego y no depende de lo demás).
2. **Combate y animales:** animales pasivos, daño por nivel de guerrero, jinete, torres iniciales.
3. **Economía base:** ayuntamiento, minas infinitas, piedra por golpes, población y casas, edificios de entrega.
4. **Oficios:** leñador, minero, herrero, carpintero, armero y banderas.
5. **Dueños y comida:** tienda de vegetales, cosechas, molino, soldados con comida y rebaños con cuidador.
6. **Meta y presión:** niveles del castillo, oleadas cada 5 minutos y estadísticas.

---

# Diseño anterior (versión 1)

> Lo que sigue es el diseño que ya estaba escrito. Se ajustará a la nueva dirección de arriba conforme se programe; mientras tanto, si algo contradice a la sección anterior, vale la sección anterior.

## La meta

Al final de la partida el jugador tendrá construido algo bastante grande: un imperio con minas, huertos, defensas y tropas, alrededor de un castillo reparado.

- El **castillo destruido** está junto a tu base. Para dejarlo terminado necesitas juntar y entregar: 🔜
  | Material | Cantidad |
  |---|---|
  | 🪵 Madera | 1000 |
  | 🪨 Piedra | 1000 |
  | 🟡 Oro | 500 |
  | 🟠 Cobre | 500 |
  | 🧥 Piel | 500 |
  | 🥩 Carne | 500 |
  | 🥈 Plata | 500 |
  | ⚫ Carbón | 500 |
- **Ganas** cuando tu castillo queda reconstruido. **Pierdes** si el enemigo termina el suyo antes.
- **No hay límite de tiempo.**
- Puedes atacar y hasta destruir el castillo enemigo, pero eso **no te hace ganar**: solo lo retrasa. Para ganar tienes que reconstruir el tuyo.

## Cómo se empieza

- ✅ Empiezas con **250 monedas** y tu personaje junto al castillo destruido.
- ✅ A un lado del castillo hay un **⛺ refugio**. Las tropas se crean ahí: toca el refugio y elige Recolector, Constructor o Guerrero ($10 cada uno). Salen por su lado sur y caminan a su punto de reunión.
- ✅ Arriba a la izquierda están los botones **🎮 Juegos** y **☰ Menú** (pausa: Continuar / Salir), y a su derecha la barra de recursos: 🪙 monedas, 🥈 plata, 🟠 cobre, ⚫ carbón, 🪵 madera, 🧶 fibra, 🥩 carne y 🧥 piel (4 columnas × 2 filas).
- ✅ Partidas guardadas (varias), sincronizadas con tu cuenta de Google.

## Tu gente

- ✅ **Personaje**: lo mueves con flechas/WASD o tocando el mapa; pica árboles y rocas, fabrica tablones y construye postes, baúles y cajones.
- ✅ **Recolector** (azul, pico): junta recursos y los lleva al almacén.
- ✅ **Constructor** (naranja, martillo): construye y repara edificios.
- ✅ **Guerrero** (morado, espada y escudo): explora y pelea con animales.
- 🔜 **Tropas de exploración**: grupos que salen a pelear con animales para conseguir carne, piel y otros recursos (los guerreros ya pueden cazar; falta la parte de explorar en grupo con misiones).
- ✅ **Grupos**: hasta 15 tropas por grupo (`MAX_GRUPO`). Al reunirse forman una **fila ordenada** (primero guerreros, luego constructores y al final recolectores). En 🎯 los grupos son cuadrados de 4 columnas; con **Seleccionar grupo** tocas el mapa para mandarlo. Al tocar una tropa puedes elegirle grupo (o crear uno nuevo). Tarea de juntar madera o minerales. 🔜 Formar grupos mixtos a gusto (por ejemplo 10 guerreros, 1 constructor y 8 recolectores) con un editor de grupos.

## El mapa

- ✅ **300 × 300 casillas** (antes 98 × 98, y antes 44 × 44). Se cambia en `LADO_MAPA` al inicio de `juego-imperio.js`. Las partidas viejas se abren con su tamaño (44 × 44 o 98 × 98).
- ✅ Tu base está arriba a la izquierda. Quedan reservados 4 sitios para bases enemigas (esquinas y centro): ahí no hay agua y siempre hay llanura, y se les tiende un puente de tierra si el mar las dejara en una isla.
- ✅ **Sin animales hostiles (oso, lobo, guepardo) a menos de 15 casillas de donde apareces.** Los animales que huyen (conejo, lagartija, gallina) sí pueden estar más cerca.

## Recursos y minas

- ✅ Árboles y rocas por el mapa.
- ✅ **75 minas** repartidas por todo el mapa, separadas por al menos 6 casillas (nada de racimos) y siempre alcanzables a pie. Cada base tiene al menos 2 minas a 9–18 casillas.
- ✅ **Cada mina guarda 500 de material: 10 % oro (50), 20 % plata (100), 30 % cobre (150) y 40 % carbón (200).** Al picarla sale un material al azar en proporción a lo que le queda, y al agotarla desaparece. Cada viaje de un recolector lleva un solo material.
- ✅ **Por qué 75:** cada castillo pide 500 de oro y cada mina solo da 50, o sea 10 minas por castillo. Para 5 castillos (el tuyo y 4 enemigos) son 50 minas, más 50 % de margen = 75. Esas 75 dan 3750 de oro, 7500 de plata, 11 250 de cobre y 15 000 de carbón. Si cambias `CASTILLOS`, `MINA_TOTAL` o `MINA_REPARTO`, el número de minas se recalcula solo.
- ✅ **Plata** sale de las minas. 🔜 **Fibra** todavía no se puede conseguir (la barra de recursos la muestra en 0).
- 🔜 **Replantar árboles** con semillas: tardan **5 minutos** en dar frutos.

## Edificios

| Edificio | Qué hace | Estado |
|---|---|---|
| ⛺ Refugio | Aquí se crean las tropas | ✅ |
| 🚩 Poste de imperio | Marca la zona donde puedes poner cofres | ✅ |
| 📦 Baúl y cajones | Guardan materiales | ✅ |
| Almacén | Recibe lo que traen los recolectores | ✅ |
| Torre | Dispara a los enemigos ($120) | ✅ |
| 🏹 Torre de arqueros | $150. Dispara flechas a 9 casillas (10 de daño cada 0.7 s) a enemigos y animales hostiles, y ve más lejos en el mapa (11 casillas) | ✅ |
| 💣 Cañón con ruedas | $250. Dispara a 8 casillas (45 de daño cada 2.5 s) con daño en área: a los cercanos al impacto les hace el 60 % | ✅ |
| 🏥 Hospital | $200, ocupa 2×2. Cura 4 de vida por segundo a tus tropas a 5 casillas | ✅ |
| 🧱 Muros | De madera ($15, vida 150) o de piedra ($30, vida 400): bloquean el paso y se unen con los vecinos | ✅ |
| ⚒️ Herrero | $220, ocupa 2×2. Forja 5 espadas en orden (madera $80, cobre $160, plata $300, oro $500, diamante $800): cada una sube +25 % el golpe del personaje y las tropas | ✅ (🔜 herramientas y costo en materiales) |

### Herrero y mejoras
- ✅ El botón **🏗️ Edificios** (debajo de 🛠️) muestra todos los edificios en cuadrados de colores; los que no alcanzan por dinero llevan 🔒. Un Constructor libre los construye y puede hacer varias obras en fila.
- Entre las herramientas habrá **espadas de 5 niveles**: cada una cuesta más material que la anterior y es mejor.
- **Al mejorar el herrero mejoran las tropas.**
- Los demás edificios también se podrán mejorar poco a poco.

## Los rojos (el enemigo) 🔜

- Son **bots un poco lentos y torpes**, pero tienen **lo mismo que tú**: un castillo que están reconstruyendo y un imperio que crece. Siempre son los rojos.
- También **recogen recursos del mapa**.
- Por el mapa encontrarás **grupos de tropas rojas** que te atacan o te persiguen. Se mueven a tu misma velocidad y **a veces deciden pelear y a veces retirarse**.
- ✅ Hoy el mapa ya tiene animales con conducta propia: oso (te sigue), lobos (en manada), guepardo (decide pelear o huir) y animales que huyen (conejo, lagartija, gallina).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index-imperio.html` | Pantalla, botones y estilos |
| `juego-imperio.js` | Todo el juego: mapa, unidades, edificios, interfaz y guardado |
| `../compartido/` | Sesión, puntos, progreso en la nube, pantalla completa y estilos comunes (`inmersivo.css` trae los botones 🎮 y ☰) |
