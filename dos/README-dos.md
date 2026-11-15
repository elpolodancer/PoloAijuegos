# Dos (`dos/`)

Juego de supervivencia inspirado en «60 Seconds», con casa, objetos y reglas propias. Id de puntos: `dos`. El título va en letra escrita (fuentes del sistema, funciona sin internet).

**Estado: fase 1 (juntar cosas, ahora guardadas dentro de los muebles) y el refugio** (la habitación de abajo, con estantes y mesa). La vida en el búnker (comer, beber, eventos, armas, personajes, etc.) viene después.

- `logica-dos.js`: lógica pura (sin `document`): casa de 2 pisos (800×450 cada una), paredes y muebles sólidos, `choca`, `mover`, tabla `TIPOS` (nombre, valor, cuántos hay, **en qué muebles están**), muebles con contenido (`CABE`, `MUEBLES`, `BUSCABLES`, `muebleCercano`) y el reparto al azar `repartirEnMuebles`.
- `juego-dos.js`: dibujo en canvas transparente, controles, panel de cada mueble, inventario de 15 espacios, cuenta regresiva, final y progreso. Los iconos de los objetos están dibujados en código (sin emojis).
- `index-dos.html`: estándar inmersivo + inventario abajo al centro, panel del mueble arriba al centro y botón «Recoger / Abrir».

## Reglas
- 2 minutos. Al llegar a cero solo sobrevives si estás dentro del búnker (planta baja, **en el centro de la casa**). También puedes cerrar la puerta antes con «Cerrar la puerta del búnker».
- 15 espacios, 1 por objeto, sin apilar. Tocar un objeto del inventario lo suelta donde estás (queda **suelto en el piso**; se recoge con E o tocándolo).
- 70 objetos por partida, **todos dentro de muebles** (ver «Muebles y contenido»): agua, 3 tipos de latas, hacha, escopeta y pistola (cada una con o sin balas, no se sabe hasta recogerla), cobija, toallitas húmedas, dulces, celular, cartas, juego de mesa, papel de baño, pasta de dientes, botiquín, extintor, máscara, cigarros y encendedor, más las **cosas de aseo**: cepillo de dientes, jabón, shampoo, desodorante, toalla de baño, perfume y bolsas de basura.
- Puntos (solo si sobrevives): suma del valor de lo que llevas encima más lo que soltaste en el piso del búnker, + 50. Las armas con balas valen más. Se envían con `encolarPuntos`. Lo que se queda dentro de un mueble de la casa se pierde.
- Progreso: `localStorage` `dos_progreso_v1` = `{ mejor, partidas }`, sincronizado con `conectar()` (gana el mayor de cada campo).

## Muebles y contenido
Los objetos **ya no están sueltos por la casa**: cada uno empieza dentro de un mueble, y hay que abrir el mueble para verlo.
- **Abrir:** acércate (menos de `ALCANCE_MUEBLE` = 26 del borde del mueble) y toca el mueble, o pulsa **E** / espacio / el botón (que dice «Abrir» cuando hay un mueble a la mano). El mueble más cercano se resalta con un contorno blanco y un rótulo «Lavabo · abrir». Si tocas uno lejano avisa «Acércate más para abrirlo». Un toque sobre un mueble lo abre **al soltar** y solo si no arrastraste, así el joystick sigue funcionando encima de los muebles.
- **Panel (`#mueble`, arriba al centro):** una tarjeta por objeto. Toca la tarjeta (o pulsa su número 1-9) para llevártelo a la mochila; si la mochila está llena avisa y no lo saca. **El tiempo sigue corriendo** mientras el panel está abierto. Se cierra solo al alejarte, cambiar de piso, abrir la pausa o terminar; también con ✕ o volviendo a pulsar E.
- Un mueble que ya abriste y quedó vacío se marca con ✓ en la tapa. Las armas no muestran si traen balas hasta que las recoges.
- **Qué va en qué mueble:** cada objeto lista en `TIPOS[...].en` los tipos de mueble donde suele estar (la `t` de cada mueble: `lavabo`, `closet`, `barra`…). Con probabilidad `PROB_FUERA_DE_LUGAR` (0.1: 1 de cada 10) cae en un mueble cualquiera, para que haya sorpresas; en `0` todo queda estricto. Si todos sus muebles están llenos, también se va a cualquiera con lugar.
- **Capacidad:** `CABE` dice cuántos objetos guarda cada tipo de mueble (123 lugares para 70 objetos). `tele` y `literas` no se abren, y **los muebles del búnker tampoco** (ahí solo queda lo que sueltas). Cada mueble recibe un id `piso:posición` (por ejemplo `0:14`).
- El baño de arriba ganó un **lavabo** (`468, 150`) para que haya lavabo en los dos pisos; es el único cambio a la casa.
- Para agregar un objeto: una línea en `TIPOS` (`nombre`, `valor`, `n`, `en`), su dibujo en `icono()` de `juego-dos.js`, y una fila en el catálogo de abajo. Para agregar un mueble que se abre: su tipo en `CABE` y en `NOMBRE_MUEBLE`.

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
Cosas que casi nunca conviene llevarse (ocupan uno de los 15 espacios) pero que en algún caso podrían servir. Falta definir para qué podrían servir, en qué muebles van y su utilidad (0-100):
- Dinero
- Agujas
- Lapicera con lápices y colores
- Libretas
- (Cigarros y encendedor ya existen en el juego: están en el catálogo de arriba.)
- Habrá más: se agregan aquí a medida que se vayan ocurriendo.

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
Flechas/WASD o arrastrar el dedo (joystick flotante); **E, espacio o el botón** («Recoger» si hay un objeto suelto a la mano, «Abrir» si hay un mueble); **clic/toque** sobre un mueble o sobre un objeto suelto cuando estás muy cerca (menos de `ALCANCE` = 30 para objetos sueltos, `ALCANCE_MUEBLE` = 26 para muebles; el objeto o mueble se resalta y con mouse sale la manita). Con un panel abierto, los números 1-9 sacan ese objeto. Si tocas uno lejano avisa «Acércate más…». Un toque sobre un objeto suelto no mueve al personaje; en cualquier otro sitio funciona el joystick.

Las escaleras (arriba a la derecha) cambian de piso al pisarlas. Abajo se dibujan como peldaños que suben, con zancas y pasamanos; arriba, como un hueco oscuro con peldaños que bajan y barandales (`escaleraEscena` y `escaleraHueco` en `juego-dos.js`; `N_PELDANOS` y `SUBE` ajustan cuántos y qué tan altos). Solo es dibujo: la zona que cambia de piso sigue siendo `ESCALERA`.

## Vista
Cámara arriba y al **centro** de la casa, inclinada hacia el frente (no desde una esquina). La lógica sigue plana: posiciones y colisiones son planas; solo se proyecta al dibujar con `proy(x, y, z)` en `juego-dos.js`.
- Ajustes arriba de la sección «Dibujo»: `K` (inclinación: 1 = desde arriba, menos = más de frente), `ESC` (tamaño), `Q` (perspectiva desde el centro: 0 = sin perspectiva), `ALTO_PARED` y `ALTO_MUEBLE`.
- Las paredes son bajas a propósito para no tapar muebles ni objetos. Lo que aun así quede tapado por una pared o un mueble se ve como silueta fantasma encima.
- Paredes, muebles, objetos y jugador se ordenan de atrás hacia delante por su borde sur (`dibujarEscena`). El joystick sigue usando coordenadas de pantalla: arriba en pantalla = norte en la casa.

## Refugio (piso 2)
Al llegar a cero (o al pulsar «Cerrar la puerta») **dentro del búnker**, la pantalla se funde a negro («Bajas al refugio…») y se pasa a una habitación nueva, a la que se baja por las escaleras del búnker (`bajarAlRefugio`, `bajando` y `armarRefugio` en `juego-dos.js`). Fuera del búnker sigue siendo derrota.
- Se salva lo que llevas en la mochila **y lo que soltaste en el piso del búnker**; el resto de la casa (incluido lo que quedó dentro de los muebles) se pierde. Los puntos se dan al bajar. La mochila queda vacía.
- Todo se acomoda solo (`acomodarEnRefugio`), agrupado por tipo (el orden de `TIPOS`): **5 estantes × 5 tablas × 5 huecos** (125 ranuras) contra la pared norte, y una **mesa de ocio** de 2 filas × 8 (16 ranuras). Cada ranura es un lugar fijo (`RANURAS`).
- Recoger funciona allí como antes: E, botón o tocar el objeto (en el refugio los objetos están sobre estantes y mesa, no dentro de muebles). Con E, si varios objetos están a la misma distancia (una columna de tablas), sale el de la tabla más baja; tocando uno eliges exactamente cuál.
- Tocar un objeto del inventario lo deja en la ranura libre más cercana de su zona (`ranuraLibre`): estante, o mesa si es de ocio. Si la mesa se llena, pasa a los estantes.
- Zona de cada objeto: campo `zona` en `TIPOS` (`"mesa"` en cartas, juego de mesa, cigarros y encendedor; lo demás, `"estante"`).
- Para cambiar algo: `ESTANTES` (cuántos, tablas, huecos, tamaños, alturas), `MESA`, `ESCALERA_REFUGIO` y `REFUGIO` (paredes y `solidos`) en `logica-dos.js`; el dibujo está en `dibujarEstante` y `dibujarMesa` de `juego-dos.js`. Un objeto nuevo de ocio: una línea en `TIPOS` con `zona: "mesa"` y su icono en `icono()`.
- Por ahora el refugio no tiene fin ni se puede volver a subir: es un cuarto para recorrer (se sale con ☰ → Salir).

## Pruebas
- **Muebles (en Node, sin navegador):** en 500 partidas simuladas (35 000 objetos) ningún mueble pasó de su `CABE`, siempre quedaron los 70 objetos dentro de muebles, ~92 % en un mueble de los suyos (el resto es el `PROB_FUERA_DE_LUGAR`), y los 28 muebles que se abren se pueden alcanzar caminando desde el inicio (también los del piso de arriba, subiendo por la escalera). Ningún mueble del búnker se abre.
- **Pantalla (navegador simulado jsdom con canvas falso):** se abrió un mueble con E y con un toque, se sacaron objetos con clic y con el número, se cerró solo al alejarse y con ✕, el toque lejano avisó sin abrir, se soltó un objeto y se abrió la pausa, sin errores de ejecución.
- La vista inclinada se dibujó en Node (node-canvas) en los dos pisos en una versión anterior. La pantalla real **NO** se ha probado en navegador/celular: falta ver cómo se ve el panel del mueble sobre la casa en horizontal, el tamaño de las tarjetas con el dedo, que el panel no tape el joystick, el joystick, el inventario en horizontal y cuánto tapan las paredes.

## Pendiente
- Definir la utilidad de cada objeto del catálogo (y su utilidad 0-100) y pasarla a algo más real.
- Objetos «inútiles» (dinero, agujas, lapicera con lápices y colores, libretas…).
- Elegir 1 a 8 personajes con sus necesidades de agua y comida; cambiar de personaje al explorar.
- Exploraciones y radiación (toallitas, bolsas de basura); estrés y distracción (cigarros, encendedor).
- Vida en el refugio (comer, beber, eventos), más cosas para la mesa y los estantes, más objetos y armas, más casas, sonido, imagen de tarjeta `imagenes/dos.webp`.
- Ideas sin decidir: poder guardar objetos en los muebles; muebles con llave o atorados; abrir los muebles del búnker.

## Registro
- `juegos.js`: `{ id: "dos", nombre: "Dos", icono: "🏚️", descripcion: "...", carpeta: "dos" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `dos: ["juego.js", "logica.js"],` en `JUEGOS` y subir `VERSION`.
- README principal: fila en «Mapa de archivos» y nota en «Estado».
