# Dos (`dos/`)

Juego de supervivencia inspirado en «60 Seconds», con casa, objetos y reglas propias. Id de puntos: `dos`. El título va en letra escrita (fuentes del sistema, funciona sin internet).

**Estado: fase 1 (juntar cosas guardadas dentro de los muebles) y el refugio** (la habitación de abajo, con baño, 4 estantes, mesa de ocio, «Almacén» y botón de **Pasar al siguiente día**). La vida en el refugio (comer, beber, necesidades, eventos), la exploración, la radiación y todo lo de la sección **«Plan»** viene después y por ahora solo está escrito aquí.

- `logica-dos.js`: lógica pura (sin `document`): casa de 2 pisos (800×450 cada una), paredes y muebles sólidos, `choca`, `mover`, tabla `TIPOS` (nombre, valor, cuántos hay, **en qué muebles están**), muebles con contenido (`CABE`, `MUEBLES`, `BUSCABLES`, `muebleCercano`) y el reparto al azar `repartirEnMuebles`.
- `juego-dos.js`: dibujo en canvas transparente (con capa estática, ver «Rendimiento»), controles, panel de cada mueble (se abre solo), inventario de 15 espacios, «Soltar todo», cuenta regresiva, refugio, Almacén, siguiente día, final y progreso. Los iconos de los objetos están dibujados en código (sin emojis).
- `index-dos.html`: estándar inmersivo + inventario abajo al centro, panel del mueble/Almacén arriba al centro, «Soltar todo» abajo a la izquierda, «Recoger / Abrir / Cerrar / Almacén» abajo a la derecha, «Cerrar la puerta del búnker» (casa) o «Pasar al siguiente día» (refugio) sobre el inventario.

## Reglas
- 2 minutos. Al llegar a cero solo sobrevives si estás dentro del búnker (planta baja, **en el centro de la casa**). También puedes cerrar la puerta antes con «Cerrar la puerta del búnker».
- 15 espacios, 1 por objeto, sin apilar. Tocar un objeto del inventario lo suelta junto a ti (queda **suelto en el piso**, nunca dentro de una pared o mueble; se recoge con E o tocándolo). **«⬇️ Soltar todo»** vacía la mochila de golpe: dentro del búnker deja todo **dentro del búnker** (para que cuente como salvado), repartido sin encimarse; en el refugio lo acomoda en los estantes o la mesa.
- 70 objetos por partida, **todos dentro de muebles** (ver «Muebles y contenido»): agua, 3 tipos de latas, hacha, escopeta y pistola (cada una con o sin balas, no se sabe hasta recogerla), cobija, toallitas húmedas, dulces, celular, cartas, juego de mesa, papel de baño, pasta de dientes, botiquín, extintor, máscara, cigarros y encendedor, más las **cosas de aseo**: cepillo de dientes, jabón, shampoo, desodorante, toalla de baño, perfume y bolsas de basura.
- Puntos (solo si sobrevives): suma del valor de lo que llevas encima más lo que soltaste en el piso del búnker, + 50. Las armas con balas valen más. Se envían con `encolarPuntos`. Lo que se queda dentro de un mueble de la casa se pierde.
- Progreso: `localStorage` `dos_progreso_v1` = `{ mejor, partidas }`, sincronizado con `conectar()` (gana el mayor de cada campo).

## Muebles y contenido
Los objetos **ya no están sueltos por la casa**: cada uno empieza dentro de un mueble.
- **Se abre solo:** al quedar a menos de `ALCANCE_MUEBLE` = 26 del borde de un mueble **que tenga cosas**, su panel aparece solo (`autoAbrir` en `juego-dos.js`). Si el mueble está vacío no se abre: solo se marca con ✓. Si estás entre dos muebles se abre el más cercano y solo cambia al otro cuando está claramente más cerca (histéresis de 6). El mueble a la mano se resalta con contorno blanco y rótulo «Lavabo · abrir».
- **Cerrar a mano:** con ✕, con **E** o tocando el mueble. Un panel cerrado a mano **no se reabre** mientras sigas junto a ese mueble; se reabre al alejarte y volver, o con **E**/botón («Abrir» ↔ «Cerrar»). Tocar un mueble lejano avisa «Acércate más para abrirlo».
- **Panel (`#mueble`, arriba al centro):** una tarjeta por objeto. Toca la tarjeta (o pulsa su número 1-9) para llevártelo; si la mochila está llena avisa y no lo saca. **El tiempo sigue corriendo** con el panel abierto. Se cierra solo al alejarte (más de 26), cambiar de piso, abrir la pausa o terminar. Las armas no muestran si traen balas hasta que las recoges.
- **Qué va en qué mueble:** cada objeto lista en `TIPOS[...].en` los tipos de mueble donde suele estar. Con probabilidad `PROB_FUERA_DE_LUGAR` (0.1) cae en un mueble cualquiera; en `0` todo queda estricto. Si todos sus muebles están llenos, también va a cualquiera con lugar.
- **Capacidad:** `CABE` dice cuántos objetos guarda cada tipo (123 lugares para 70 objetos). `tele` y `literas` no se abren, **ni los muebles del búnker** (ahí solo queda lo que sueltas). Los muebles del baño del refugio (inodoro, lavabo, regadera) tampoco. Cada mueble recibe un id `piso:posición` (p. ej. `0:14`).
- El baño de arriba tiene un **lavabo** (`468, 150`), así que hay lavabo en los dos pisos.
- Para agregar un objeto: una línea en `TIPOS` (`nombre`, `valor`, `n`, `en`), su dibujo en `icono()` de `juego-dos.js` y una fila en el catálogo. Para un mueble que se abre: su tipo en `CABE` y en `NOMBRE_MUEBLE` (y su alto en `ALTO_MUEBLE`).

## Catálogo de objetos (utilidad por definir)
Aquí va cada objeto con **para qué sirve**. Lo que ya se dijo está escrito; lo demás está en «por definir». Para completar la tabla, mándame por objeto:

```
Objeto — para qué sirve (o podría servir) — cuánto dura (usos) — cuándo se necesita — utilidad (0-100)
Ejemplo: Toallitas húmedas — quitan la radiación al volver de explorar — 20 por paquete — tras cada salida — 85
```
La **utilidad (0-100)** es un presentimiento de cuánto se va a usar: **no tiene que sumar 100** ni estar alineada con las demás. Más adelante se convierte a algo más real (probabilidades, puntos, cantidad por partida).

| Objeto (`id`) | Dónde está (muebles) | Para qué sirve | Usos | Utilidad |
|---|---|---|---|---|
| Agua (`agua`) | refrigerador, barra, trinchador, cajas, estante | Beber: cada personaje necesita un poco **cada 2 días** | por definir | — |
| Latas: atún, frijoles, tomates (`atun`, `frijoles`, `tomates`) | barra, trinchador, estante, cajas | Comer: cada personaje necesita comer **cada 3 o 4 días** | por definir | — |
| Toallitas húmedas (`toallitas`) | lavabo, bañera, clóset | Quitar la **contaminación radiactiva** al volver de explorar | **20** por paquete (`usos: 20` en `TIPOS`, aún sin efecto) | — |
| Bolsa de basura (`bolsa`) | barra, cajas, estante, lavabo | Contener las toallitas usadas y las cosas que traigan radiación | por definir | — |
| Cigarros (`cigarros`) | mesita, buró, escritorio, barra | **Relajarse** en momentos de estrés (llegan tras 4 o 5 días sin distraerse; ver «Estrés») | por definir | — |
| Encendedor (`encendedor`) | mesita, barra, escritorio, buró, trinchador | Va con los cigarros | por definir | — |
| Cepillo de dientes (`cepillo`) | lavabo, bañera | por definir | por definir | — |
| Jabón (`jabon`) | lavabo, bañera | por definir | por definir | — |
| Shampoo (`shampoo`) | bañera, lavabo | por definir | por definir | — |
| Desodorante (`desodorante`) | lavabo, clóset, buró | por definir | por definir | — |
| Toalla de baño (`toalla`) | bañera, clóset, lavabo | por definir | por definir | — |
| Perfume (`perfume`) | lavabo, buró, clóset | por definir | por definir | — |
| Pasta de dientes (`pasta`) | lavabo, bañera | por definir | por definir | — |
| Papel de baño (`papel`) | inodoro, lavabo, estante, cajas | por definir | por definir | — |
| Botiquín (`botiquin`) | lavabo, barra, cajas, clóset | por definir | por definir | — |
| Extintor (`extintor`) | barra, cajas, estante | por definir | por definir | — |
| Máscara contra polvo (`mascara`) | cajas, escritorio, clóset | por definir | por definir | — |
| Hacha (`hacha`) | cajas, estante, clóset | por definir | por definir | — |
| Escopeta (`escopeta`) | clóset, cama, librero | por definir (con o sin balas) | por definir | — |
| Pistola (`pistola`) | buró, escritorio, clóset | por definir (con o sin balas) | por definir | — |
| Cobija (`cobija`) | clóset, cama, sofá | por definir | por definir | — |
| Dulces (`dulces`) | mesita, barra, trinchador, buró, sofá | por definir | por definir | — |
| Celular (`celular`) | mesita, escritorio, buró, sofá, cama | por definir | por definir | — |
| Cartas de mesa (`cartas`) | mesita, mesa, trinchador, librero, repisa | por definir (¿distracción?) | por definir | — |
| Juego de mesa (`juego`) | librero, repisa, clóset, estante | por definir (¿distracción?) | por definir | — |

## Objetos «inútiles» (pendientes: NO están en el juego todavía)
Cosas que casi nunca conviene llevarse (ocupan uno de los 15 espacios). Lo ya decidido sobre su uso:
- **Libretas:** sirven como **papel de baño**; casi nada más. Con lápices o colores se podría **dibujar en la libreta** para entretenerse (distracción).
- **Lapicera con lápices y colores:** sin uso por ahora; solo para dibujar en la libreta.
- **Agujas con hilo:** sin uso por ahora. **Agujas, clips y navaja:** sirven para la **habilidad de candados** (abrir casas aseguradas, ver «Plan»).
- **Cinta adhesiva** y **cuerda:** sin uso aún.
- **Cerillos y encendedores:** para **quemar las bolsas de basura** llenas.
- **Dinero:** sin uso ahora; **servirá en el futuro**.
- (Cigarros y encendedor ya existen en el juego: están en el catálogo de arriba.)
- Habrá más: se agregan aquí a medida que se vayan ocurriendo. Falta definir en qué muebles van y su utilidad (0-100).

## Personajes (1 a 8): diseño, todavía sin hacer
- Al empezar se elige jugar con **1, 2, 3, 4, 5, 6, 7 u 8 personajes**. **No es multijugador**: son personajes que aparecen en la historia.
- Todos necesitan recursos para sobrevivir: **un poco de agua cada 2 días** y **comer cada 3 o 4 días**.
- Al **salir a explorar** (y en otras acciones), el jugador principal toma el rol de **cualquiera** de ellos y lo controla.
- Preguntas abiertas: dónde están los demás durante los 2 minutos de la casa, si la mochila de 15 espacios es compartida o de cada uno, y cuánta agua/comida cuenta como «un poco» (por persona y por día).

## Exploraciones y radiación (futuro)
- En el futuro se podrá **salir a explorar**. Al regresar hay **probabilidad de contaminación radiactiva**.
- Las **toallitas húmedas** la quitan (20 usos por paquete) y las **bolsas de basura** contienen las toallitas usadas y lo que traiga radiación. Falta definir: cuántas toallitas gasta cada limpieza, la probabilidad de contaminarse y qué pasa si no te limpias.

## Estrés y distracción (futuro)
- Pasados **4 o 5 días** en que el jugador no hizo nada para divertirse o distraerse, llega un **momento de estrés**; **cigarros y encendedor** sirven para relajarse.
- Falta definir: cuánto estrés se quita, si otras cosas distraen igual (cartas, juego de mesa, mesa de ocio) y qué pasa si no se atiende.

## La casa (planta baja)
El búnker (240×170, antes 130×170) está en el **centro** de la casa y las demás habitaciones lo rodean: almacén y comedor a la izquierda; cocina arriba y baño abajo; recibidor (con la escalera) y sala a la derecha. Su única puerta da a la sala (pared este, hueco `[215, 265]`; el umbral amarillo y negro se dibuja con `PUERTA_BUNKER`). Las demás puertas forman un circuito alrededor, así que se puede dar la vuelta a la casa. El piso de arriba solo ganó el lavabo del baño. `BUNKER`, `PUERTA_BUNKER` y los cuartos están en `logica-dos.js`; `dentroBunker` pide estar un poco pasado el umbral.
**Contorno rojo:** sobre el borde de las paredes del búnker parpadea un trazo rojo (`ladoBunker` y `brilloBunker` en `juego-dos.js`; ahí se cambia el ritmo del parpadeo). Con «reducir movimiento» del sistema queda fijo y encendido.

## Controles
Flechas/WASD o arrastrar el dedo (joystick flotante). **E, espacio o el botón** de abajo a la derecha: en la casa dice «Recoger» (objeto suelto a la mano), «Abrir»/«Cerrar» (mueble) y en el refugio «Almacén». **⬇️ Soltar todo** (abajo a la izquierda, encima del 🌙). **Clic/toque** sobre un mueble o sobre un objeto suelto cuando estás muy cerca (menos de `ALCANCE` = 30 para objetos sueltos, `ALCANCE_MUEBLE` = 26 para muebles). En el refugio el toque sobre un objeto de los estantes lo recoge **desde cualquier distancia**. Con un panel abierto, los números 1-9 sacan ese objeto. Un toque sobre un objeto o mueble no mueve al personaje; en cualquier otro sitio funciona el joystick.

Las escaleras (arriba a la derecha) cambian de piso al pisarlas. Abajo se dibujan como peldaños que suben, con zancas y pasamanos; arriba, como un hueco oscuro con peldaños que bajan y barandales (`escaleraEscena` y `escaleraHueco`; `N_PELDANOS` y `SUBE` ajustan cuántos y qué tan altos). Solo es dibujo: la zona que cambia de piso sigue siendo `ESCALERA`.

## Vista
Cámara arriba y al **centro** de la casa, inclinada hacia el frente (no desde una esquina). La lógica sigue plana: posiciones y colisiones son planas; solo se proyecta al dibujar con `proy(x, y, z)` en `juego-dos.js`.
- Ajustes arriba de la sección «Dibujo»: `K` (inclinación: 1 = desde arriba, menos = más de frente), `ESC` (tamaño), `Q` (perspectiva desde el centro: 0 = sin perspectiva), `ALTO_PARED` y `ALTO_MUEBLE`.
- Las paredes son bajas a propósito para no tapar muebles ni objetos. Lo que aun así quede tapado por una pared o un mueble se ve como silueta fantasma encima.
- Paredes, muebles, objetos y jugador se ordenan de atrás hacia delante por su borde sur (`dibujarEscena`). El joystick sigue usando coordenadas de pantalla: arriba en pantalla = norte en la casa.

## Refugio (piso 2)
Al llegar a cero (o al pulsar «Cerrar la puerta») **dentro del búnker**, la pantalla se funde a negro («Bajas al refugio…») y se pasa a una habitación nueva, a la que se baja por las escaleras del búnker (`bajarAlRefugio`, `bajando` y `armarRefugio` en `juego-dos.js`). Fuera del búnker sigue siendo derrota.
- Se salva lo que llevas en la mochila **y lo que soltaste en el piso del búnker** (por eso existe «Soltar todo»); el resto de la casa (incluido lo que quedó dentro de los muebles) se pierde. Los puntos se dan al bajar. La mochila queda vacía.
- Todo se acomoda solo (`acomodarEnRefugio`), agrupado por tipo (orden de `TIPOS`): **4 estantes × 5 tablas × 5 huecos** (100 ranuras) contra la pared norte, y una **mesa de ocio** de 2 filas × 8 (16 ranuras). Cada ranura es un lugar fijo (`RANURAS`: 116 en total).
- **Baño** (`BANO` en `logica-dos.js`): cuarto pequeño en la esquina noroeste (x 60–176, y 110–200) con inodoro, lavabo y regadera, con su propia puerta en la pared sur (hueco `[96, 146]`). Ocupa el lugar del 5.º estante: los 4 estantes empiezan en `ESTANTES.x0 = 188`. **Por ahora solo está construido**; su uso (necesidades, bolsas de basura, aseo) está en «Plan».
- **Almacén (tomar desde cualquier parte):** en el refugio no hace falta acercarse a los estantes. Al llegar se abre solo el panel **«Almacén»**, que lista todo lo guardado **agrupado por tipo** (con ×cantidad; las armas con y sin balas van aparte). Toca una tarjeta (o su número 1-9) para llevarte uno. También puedes **tocar el objeto en el estante/mesa desde donde estés**. El botón de abajo a la derecha dice «Almacén» y abre/cierra el panel (E también). Ya no existe «el objeto más cercano» ni su resaltado en el refugio.
- **Soltar** (tocar un objeto de la mochila o «Soltar todo») lo deja en la ranura libre más cercana de su zona (`ranuraLibre`): estante, o mesa si es de ocio; si la mesa se llena, pasa a los estantes. Si no hay lugar libre avisa.
- **☀️ Pasar al siguiente día (`#btn-dia`, sobre el inventario):** fundido a negro «Pasa la noche…», a los 1.1 s el contador sube y aclara con «Día N». El chip **«Día N»** (arriba a la derecha) empieza en 1 al bajar. **Por ahora solo cambia el número**: no consume comida ni agua, no hay eventos ni cansancio (eso está en «Plan»). Los tiempos son `T_DIA_CORTE`, `T_DIA_NEGRO` y `T_DIA`.
- Zona de cada objeto: campo `zona` en `TIPOS` (`"mesa"` en cartas, juego de mesa, cigarros y encendedor; lo demás `"estante"`).
- Para cambiar algo: `ESTANTES` (cuántos, tablas, huecos, tamaños, alturas, `x0`), `MESA`, `BANO`, `ESCALERA_REFUGIO` y `REFUGIO` (paredes, muebles y `solidos`) en `logica-dos.js`; dibujo en `dibujarEstante` y `dibujarMesa`. Un objeto nuevo de ocio: una línea en `TIPOS` con `zona: "mesa"` y su icono en `icono()`.
- No se puede volver a subir a la casa: se sale con ☰ → Salir (se pierde lo del refugio, aún no se guarda).

## Rendimiento
Medido en Chromium (sin GPU, en un viewport de celular), antes → después: **hilo principal ocupado ≈ 40 % → ≈ 24 %** a velocidad normal, y con la CPU 6 veces más lenta (para imitar un celular) **≈ 23 → ≈ 44 fps**. Lo que se hizo:
- **Capa estática** (`capa`, `construirEstatico`, `dibujarEscena`): paredes, muebles, escalera, estantes y mesa son ~1 400 operaciones de canvas por cuadro y no se mueven. Cada piso se pinta **una vez** en un lienzo aparte y cada cuadro se copia de golpe; solo se repinta, exacto y en orden de profundidad, el rectángulo que rodea al jugador y a cada objeto suelto. La capa se rehace cuando cambia algo que lleva dentro (`versionEst`: ✓ de muebles, objetos de los estantes) o la resolución. Quedan fuera de la capa: el contorno rojo del búnker, el contorno blanco del mueble a la mano y los rótulos de cuartos.
- **Sin `shadowBlur`:** el brillo rojo del búnker usaba 4 trazos con desenfoque por cuadro (muy lento en celulares); ahora es un trazo ancho y transparente debajo del trazo rojo.
- **HUD** (`poner`): los chips solo se escriben cuando el texto cambia (antes ~3 escrituras al DOM por cuadro).
- **Sprites** (`sprite`, `dibujarIcono`): cada icono se dibuja una vez en un lienzo pequeño y luego se copia.
- **No se redibuja** en pausa, fin ni menú (`selloPintado` en `bucle`).
- **Resolución adaptativa:** si en 90 cuadros seguidos el promedio pasa de 28 ms, el lienzo baja de 1280×720 a 960×540 y luego a 800×450 (`CALIDADES`). No vuelve a subir en esa sesión.
- Otros ajustes: rótulos de muebles medidos una sola vez (`anchoRotulo`).
- **Si aún va lento en tu dispositivo:** dime el modelo y qué escena (casa, refugio) para medir; lo siguiente sería cachear también los rótulos y bajar el número de caras por pared.

## Pruebas
- **Muebles (Node, sin navegador):** en 500 partidas simuladas (35 000 objetos) ningún mueble pasó de su `CABE`, siempre quedaron los 70 objetos dentro de muebles, ~92 % en un mueble de los suyos, y los 28 muebles que se abren se alcanzan caminando desde el inicio. Ningún mueble del búnker se abre.
- **Refugio (Node):** búsqueda por cuadrícula con la colisión real: el baño (por su puerta), el frente de cada uno de los 4 estantes y de la mesa son alcanzables; ningún sólido se solapa; los 70 objetos caben.
- **Pantalla (DOM simulado, 28 comprobaciones):** el panel se abre solo; cerrado con ✕ no se reabre; E lo reabre; sacar objetos; «Soltar todo» dentro del búnker y bajada al refugio con los puntos correctos (todo lo soltado cuenta); el Almacén se abre solo y se toma desde lejos; «Soltar todo» en el refugio; Día 1 → 2 → 3; sin `shadowBlur`; en pausa no se repinta.
- **«Soltar todo» (210 casos):** 150 posiciones al azar dentro del búnker con la mochila llena y 60 por la casa con 1 a 15 objetos: todos quedaron fuera de paredes y muebles, dentro del búnker cuando se soltó ahí, y separados (≥ 10).
- **Navegador real (Chromium headless):** la casa y el refugio se dibujan sin errores de ejecución y la imagen es la misma que la original salvo los botones nuevos. **NO** se ha probado en un celular real ni con dedo: falta ver el tamaño de las tarjetas con el dedo, que el panel no tape el joystick, el inventario en horizontal y cuánto tapan las paredes.

## Plan (decidido, TODAVÍA NO está en el juego)
Todo lo de esta sección está pedido pero sin construir. Va ordenado por tema.

### Salir a explorar
- Si el jugador decide **salir a explorar** habrá un **mapa** con **casas para buscar objetos**.
- Habrá un **aparato para medir la radiación**.
- Al volver al búnker hay **probabilidad de contaminación radiactiva** (ver «Radiación»).

### Radiación
- **Barra de radiación** que **sube con el tiempo** fuera. Si llega **muy alto**, el personaje **muere y deja sus cosas en esa zona del mapa**; **otro personaje puede ir a recogerlas**.
- Hay un **botón para correr**.
- **Zonas del mapa con mucha radiación**: la barra sube **el doble o el triple de rápido**. Se ven como **humo verde en toda la pantalla** del jugador.
- **Los objetos no tendrán radiación**: solo las personas.

### Trajes anti radiación
- El búnker tiene **2 trajes de cuerpo completo**, de **unos 15 usos** antes de romperse (≈ 15 salidas cada uno). Con ellos las salidas tienen **límite de tiempo** marcado por la barra de radiación.

### Esclusa (habitación principal del búnker)
- Al llegar al búnker hay una **habitación principal** para **limpiarse la radiación antes de entrar a la zona habitable**. Ahí se **deja el traje**.
- Al quitarse el traje, desde que se entra al búnker la radiación **baja un 75 %** del nivel que tuviera la barra. Si queda algo, se quita con **toallitas húmedas** (20 usos por paquete).
- Las bolsas de basura contienen las toallitas usadas.

### Armas, cartuchos y mochilas
- Las armas **usan cartuchos**: hay que conseguir **cartuchos de pistola y de escopeta** (esto reemplazará el «con o sin balas» actual).
- El inventario tendrá **dos zonas aparte, como cuadros**, una para **cartuchos de bala (pistola)** y otra para **cartuchos de escopeta**.
- **Mochila nivel 1 y nivel 2** para cargar más cosas que los 15 espacios actuales.

### El búnker / refugio ampliado
- **Más habitaciones**; **un par con 4 camas** para que duerman las personas.
- **Objetos que ya vienen en el búnker:** **5 latas de tomates**, **5 latas de frijoles**, **generador eléctrico con parrilla eléctrica**, **aceite** y **arroz**.
- **Zona de cocina** bien acomodada para hacer platillos que alimenten **más que las simples latas**.
- **Un par de sofás** para descansar (se anotó «en la casa»; por confirmar si es en la casa o en el refugio).
- El **baño** ya existe (ver «Refugio»); falta su uso.

### Generador y dificultad
- **Fácil:** el generador **no se descompone**. **Difícil:** **se descompone** y hay que tener **habilidad** (electricidad) para arreglarlo.

### Habilidades y libros
- Habrá **libros de habilidades**: **cocina**, **electricidad**, **candados**…

### Casas con candado
- Habrá **casas aseguradas con candados** y un **libro de habilidad** para abrirlos. El libro **no puede aparecer en una zona que ya exija esa habilidad**: se encuentra en una zona alcanzable desde el principio.
- Para la habilidad de candados sirven **navaja, agujas y clips**.

### El día, el cansancio y la oscuridad
- **Cada día dura ≈ 20 minutos reales** antes de que el jugador se canse y se **quede dormido**: las **24 horas del día** se reparten en esos 20 minutos (1 min real ≈ 72 min de juego; 1 s real ≈ 1.2 min de juego). Es una presión para ir a dormir y **obliga a cambiar de día**. El botón «Pasar al siguiente día» (ya hecho) será la forma voluntaria de hacerlo.
- **Después de las 6:00 pm** (18:00 → minuto 15 del día real) las calles están oscuras y se necesita **linterna**; **dentro de las casas también**. A oscuras hay **probabilidad de lastimarse**.
- **Vida:** **10 corazones** por jugador.
- **Energía:** la **barra energética** y la **comida** dan un **pequeño aumento de energía**, pero **no cambian los 20 minutos** del día.

### Basura, necesidades y el gato
- **Bolsas de basura:** se llenan con **20 usos**, con **desperdicios humanos** (la popó va ahí). **Cerillos y encendedores** sirven para **quemar** las bolsas.
- Las personas hacen popó **cada 2 días**, en horarios distintos.
- Habrá la opción de **salvar a un gato** en la casa. También hace popó **cada 2 días**. **Si no lo salvas el primer día no vuelve a aparecer.**

### Preguntas abiertas
- ¿A qué hora del día empieza la partida y cómo se relacionan los **2 minutos** de la casa con los **20 minutos** del día?
- ¿Qué pasa exactamente al dormirse por cansancio (se pierde lo que se hacía, se come/bebe solo, hay eventos)?
- ¿Cuántos cartuchos por arma, tamaño de las mochilas 1 y 2, número de camas/habitaciones y dónde van los sofás?

## Pendiente
- Definir la utilidad de cada objeto del catálogo (y su utilidad 0-100) y pasarla a algo más real.
- Construir lo de «Plan» (por partes: lo más cercano al juego actual es la vida en el refugio y el uso del baño).
- Objetos «inútiles» (dinero, agujas, lapicera, libretas, cinta, cuerda, cerillos…).
- Elegir 1 a 8 personajes con sus necesidades de agua y comida; cambiar de personaje al explorar.
- Vida en el refugio (comer, beber, eventos), más cosas para la mesa y los estantes, más objetos y armas, más casas, sonido, imagen de tarjeta `imagenes/dos.webp`.
- Ideas sin decidir: poder guardar objetos en los muebles; muebles con llave o atorados; abrir los muebles del búnker.
- Probar en un celular real (rendimiento y tamaño de botones y tarjetas).

## Registro
- `juegos.js`: `{ id: "dos", nombre: "Dos", icono: "🏚️", descripcion: "...", carpeta: "dos" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `dos: ["juego.js", "logica.js"],` en `JUEGOS` y subir `VERSION`.
- README principal: fila en «Mapa de archivos» y nota en «Estado».
