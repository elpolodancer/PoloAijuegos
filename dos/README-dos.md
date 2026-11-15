# Dos (`dos/`)

Juego de supervivencia inspirado en «60 Seconds», con casa, objetos y reglas propias. Id de puntos: `dos`. El título va en letra escrita (fuentes del sistema, funciona sin internet).

**Estado: solo la fase 1** (juntar cosas). La vida en el búnker (comer, beber, eventos, armas, etc.) viene después.

- `logica-dos.js`: lógica pura (sin `document`): casa de 2 pisos (800×450 cada una), paredes y muebles sólidos, `choca`, `mover`, reparto al azar `generarItems`, tabla `TIPOS` (nombre, valor, cuántos hay, en qué cuartos suelen estar).
- `juego-dos.js`: dibujo en canvas transparente, controles, inventario de 15 espacios, cuenta regresiva, final y progreso. Los iconos de los objetos están dibujados en código (sin emojis).
- `index-dos.html`: estándar inmersivo + inventario abajo al centro y botón «Recoger».

## Reglas
- 2 minutos. Al llegar a cero solo sobrevives si estás dentro del búnker (planta baja, a la izquierda). También puedes cerrar la puerta antes con «Cerrar la puerta del búnker».
- 15 espacios, 1 por objeto, sin apilar. Tocar un objeto del inventario lo suelta donde estás.
- 49 objetos repartidos al azar en cada partida (70 % en cuartos donde tiene sentido, 30 % en cualquiera): agua, 3 tipos de latas, hacha, escopeta y pistola (cada una con o sin balas, no se sabe hasta recogerla), cobija, toallitas, dulces, celular, cartas, juego de mesa, papel de baño, pasta de dientes, botiquín, extintor y máscara.
- Puntos (solo si sobrevives): suma del valor de lo que llevas + 50. Las armas con balas valen más. Se envían con `encolarPuntos`.
- Progreso: `localStorage` `dos_progreso_v1` = `{ mejor, partidas }`, sincronizado con `conectar()` (gana el mayor de cada campo).

## Controles
Flechas/WASD o arrastrar el dedo (joystick flotante); E, espacio o el botón «Recoger». Las escaleras (arriba a la derecha) cambian de piso al pisarlas.

## Vista
Cámara arriba y al **centro** de la casa, inclinada hacia el frente (no desde una esquina). La lógica sigue plana (`logica-dos.js` no cambió: posiciones, colisiones y reparto son los mismos); solo se proyecta al dibujar con `proy(x, y, z)` en `juego-dos.js`.
- Ajustes arriba de la sección «Dibujo»: `K` (inclinación: 1 = desde arriba, menos = más de frente), `ESC` (tamaño), `Q` (perspectiva desde el centro: 0 = sin perspectiva), `ALTO_PARED` y `ALTO_MUEBLE`.
- Las paredes son bajas a propósito para no tapar objetos. Lo que aun así quede tapado por una pared o un mueble se ve como silueta fantasma encima.
- Paredes, muebles, objetos y jugador se ordenan de atrás hacia delante por su borde sur (`dibujarEscena`). El joystick sigue usando coordenadas de pantalla: arriba en pantalla = norte en la casa.

## Pruebas
La casa y el reparto se probaron en Node: en 300 partidas simuladas (14 700 objetos) todos quedaron alcanzables desde la llegada de cada piso, y el búnker y las escaleras también. La vista inclinada se dibujó en Node (node-canvas) en los dos pisos para revisar la imagen; la pantalla NO se ha probado en navegador/celular (joystick, tamaño del inventario en horizontal, cuánto tapan las paredes).

## Pendiente
- Fase del búnker, más objetos y armas, más casas, sonido, imagen de tarjeta `imagenes/dos.webp`.

## Registro
- `juegos.js`: `{ id: "dos", nombre: "Dos", icono: "🏚️", descripcion: "...", carpeta: "dos" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `dos: ["juego.js", "logica.js"],` en `JUEGOS` y subir `VERSION`.
- README principal: fila en «Mapa de archivos» y nota en «Estado».
