# Dos (`dos/`)

Juego de supervivencia inspirado en «60 Seconds», con casa, objetos y reglas propias. Id de puntos: `dos`. El título va en letra escrita (fuentes del sistema, funciona sin internet).

**Estado: fase 1 (juntar cosas) y el refugio** (la habitación de abajo, con estantes y mesa). La vida en el búnker (comer, beber, eventos, armas, etc.) viene después.

- `logica-dos.js`: lógica pura (sin `document`): casa de 2 pisos (800×450 cada una), paredes y muebles sólidos, `choca`, `mover`, reparto al azar `generarItems`, tabla `TIPOS` (nombre, valor, cuántos hay, en qué cuartos suelen estar).
- `juego-dos.js`: dibujo en canvas transparente, controles, inventario de 15 espacios, cuenta regresiva, final y progreso. Los iconos de los objetos están dibujados en código (sin emojis).
- `index-dos.html`: estándar inmersivo + inventario abajo al centro y botón «Recoger».

## Reglas
- 2 minutos. Al llegar a cero solo sobrevives si estás dentro del búnker (planta baja, **en el centro de la casa**). También puedes cerrar la puerta antes con «Cerrar la puerta del búnker».
- 15 espacios, 1 por objeto, sin apilar. Tocar un objeto del inventario lo suelta donde estás.
- 53 objetos repartidos al azar en cada partida (70 % en cuartos donde tiene sentido, 30 % en cualquiera): agua, 3 tipos de latas, hacha, escopeta y pistola (cada una con o sin balas, no se sabe hasta recogerla), cobija, toallitas, dulces, celular, cartas, juego de mesa, papel de baño, pasta de dientes, botiquín, extintor, máscara, cigarros y encendedor.
- Puntos (solo si sobrevives): suma del valor de lo que llevas encima más lo que soltaste en el piso del búnker, + 50. Las armas con balas valen más. Se envían con `encolarPuntos`.
- Progreso: `localStorage` `dos_progreso_v1` = `{ mejor, partidas }`, sincronizado con `conectar()` (gana el mayor de cada campo).

## La casa (planta baja)
El búnker (240×170, antes 130×170) está en el **centro** de la casa y las demás habitaciones lo rodean: almacén y comedor a la izquierda; cocina arriba y baño abajo; recibidor (con la escalera) y sala a la derecha. Su única puerta da a la sala (pared este, hueco `[215, 265]`; el umbral amarillo y negro se dibuja con `PUERTA_BUNKER`). Las demás puertas forman un circuito alrededor, así que se puede dar la vuelta a la casa. El piso de arriba no cambió. `BUNKER`, `PUERTA_BUNKER` y los cuartos están en `logica-dos.js`; `dentroBunker` pide estar un poco pasado el umbral.
**Contorno rojo:** sobre el borde de las paredes del búnker parpadea un trazo rojo (`ladoBunker` y `brilloBunker` en `juego-dos.js`; ahí se cambia el ritmo del parpadeo). Con «reducir movimiento» del sistema queda fijo y encendido.

## Controles
Flechas/WASD o arrastrar el dedo (joystick flotante); E, espacio, el botón «Recoger», o **clic/toque sobre el objeto** cuando estás muy cerca (menos de `ALCANCE` = 30; el objeto se resalta y con mouse sale la manita). Si tocas uno lejano avisa «Acércate más para recogerlo». Un toque sobre un objeto no mueve al personaje; en cualquier otro sitio funciona el joystick.

Las escaleras (arriba a la derecha) cambian de piso al pisarlas. Abajo se dibujan como peldaños que suben, con zancas y pasamanos; arriba, como un hueco oscuro con peldaños que bajan y barandales (`escaleraEscena` y `escaleraHueco` en `juego-dos.js`; `N_PELDANOS` y `SUBE` ajustan cuántos y qué tan altos). Solo es dibujo: la zona que cambia de piso sigue siendo `ESCALERA`.

## Vista
Cámara arriba y al **centro** de la casa, inclinada hacia el frente (no desde una esquina). La lógica sigue plana (`logica-dos.js` no cambió: posiciones, colisiones y reparto son los mismos); solo se proyecta al dibujar con `proy(x, y, z)` en `juego-dos.js`.
- Ajustes arriba de la sección «Dibujo»: `K` (inclinación: 1 = desde arriba, menos = más de frente), `ESC` (tamaño), `Q` (perspectiva desde el centro: 0 = sin perspectiva), `ALTO_PARED` y `ALTO_MUEBLE`.
- Las paredes son bajas a propósito para no tapar objetos. Lo que aun así quede tapado por una pared o un mueble se ve como silueta fantasma encima.
- Paredes, muebles, objetos y jugador se ordenan de atrás hacia delante por su borde sur (`dibujarEscena`). El joystick sigue usando coordenadas de pantalla: arriba en pantalla = norte en la casa.

## Refugio (piso 2)
Al llegar a cero (o al pulsar «Cerrar la puerta») **dentro del búnker**, la pantalla se funde a negro («Bajas al refugio…») y se pasa a una habitación nueva, a la que se baja por las escaleras del búnker (`bajarAlRefugio`, `bajando` y `armarRefugio` en `juego-dos.js`). Fuera del búnker sigue siendo derrota.
- Se salva lo que llevas en la mochila **y lo que soltaste en el piso del búnker**; el resto de la casa se pierde. Los puntos se dan al bajar. La mochila queda vacía.
- Todo se acomoda solo (`acomodarEnRefugio`), agrupado por tipo (el orden de `TIPOS`): **5 estantes × 5 tablas × 5 huecos** (125 ranuras) contra la pared norte, y una **mesa de ocio** de 2 filas × 8 (16 ranuras). Cada ranura es un lugar fijo (`RANURAS`).
- Recoger funciona igual que en la casa (E, botón o tocar el objeto). Con E, si varios objetos están a la misma distancia (una columna de tablas), sale el de la tabla más baja; tocando uno eliges exactamente cuál.
- Tocar un objeto del inventario lo deja en la ranura libre más cercana de su zona (`ranuraLibre`): estante, o mesa si es de ocio. Si la mesa se llena, pasa a los estantes.
- Zona de cada objeto: campo `zona` en `TIPOS` (`"mesa"` en cartas, juego de mesa, cigarros y encendedor; lo demás, `"estante"`).
- Para cambiar algo: `ESTANTES` (cuántos, tablas, huecos, tamaños, alturas), `MESA`, `ESCALERA_REFUGIO` y `REFUGIO` (paredes y `solidos`) en `logica-dos.js`; el dibujo está en `dibujarEstante` y `dibujarMesa` de `juego-dos.js`. Un objeto nuevo de ocio: una línea en `TIPOS` con `zona: "mesa"` y su icono en `icono()`.
- Por ahora el refugio no tiene fin ni se puede volver a subir: es un cuarto para recorrer (se sale con ☰ → Salir).

## Pruebas
La casa y el reparto se probaron en Node: en 300 partidas simuladas (14 700 objetos) todos quedaron alcanzables desde la llegada de cada piso, y el búnker y las escaleras también. La vista inclinada se dibujó en Node (node-canvas) en los dos pisos para revisar la imagen; la pantalla NO se ha probado en navegador/celular (joystick, tamaño del inventario en horizontal, cuánto tapan las paredes).

## Pendiente
- Vida en el refugio (comer, beber, eventos), más cosas para la mesa y los estantes, más objetos y armas, más casas, sonido, imagen de tarjeta `imagenes/dos.webp`.

## Registro
- `juegos.js`: `{ id: "dos", nombre: "Dos", icono: "🏚️", descripcion: "...", carpeta: "dos" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `dos: ["juego.js", "logica.js"],` en `JUEGOS` y subir `VERSION`.
- README principal: fila en «Mapa de archivos» y nota en «Estado».
