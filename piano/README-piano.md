# Piano (`piano/`)

Toca las teclas negras que bajan; cada acierto toca la siguiente nota de la canción (estilo Piano Tiles). Si tocas una tecla equivocada, la partida termina. Id de puntos: `piano`.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-piano.html` | Página: menú principal, lista de canciones (con filtros y favoritas), lienzo 320×520 y cuadro de récords |
| `juego-piano.js` | Toda la lógica: pantallas, sonido (Web Audio sin archivos), récords, favoritas, mapa de niveles y progreso |
| `melodias-piano.js` | Canciones convertidas desde `.mid` (`MELODIAS_MIDI`) |
| `niveles-piano.js` | Niveles del mapa (`NIVELES`, hoy vacío) y cuántos hay por etapa (`POR_ETAPA = 30`) |
| `midi-a-notas.py` | Herramienta del programador (NO se sube): convierte un `.mid` en una línea para `melodias-piano.js` |

## Pantallas
1. **Menú principal** (sin ☰): botón 1 **🗺️ Niveles**, botón 2 **🎵 Canciones**.
2. **Niveles**: el mapa estándar del portal (`compartido/mapa-niveles.js`): México con agua, 32 estados × 30 niveles y, al terminarlos, el mundo con 194 países × 30 = **6780 niveles**. Ya funciona; **todavía no tiene ningún nivel** (el nivel 1 avisa «todavía no está listo»). El ☰ dice «Menú principal».
3. **Canciones**: «🎲 Modo aleatorio», filtros **Con MIDI · Sin MIDI · ⭐ Favoritas** (Favoritas se combina con los otros dos) y un cuadro por canción con su estrellita ☆/⭐ para marcarla. El modo aleatorio respeta los filtros.
4. **Partida**: ☰ dice «Pausa» (Continuar / Empezar de nuevo / Salir). «Salir» y «Volver» regresan a donde se empezó (canciones o mapa).

## Sin límite de tiempo y récords a 1, 2 y 3 minutos
- Ya no hay minuto de partida: se juega hasta equivocarse. El reloj cuenta hacia arriba desde la primera tecla y la pausa no cuenta.
- Por canción se guarda `r1`, `r2` y `r3` = **la mayor cantidad de teclas tocadas dentro del minuto 1, 2 y 3**. Si la partida termina antes de ese minuto, cuenta lo que llevabas.
- Se ven en el lienzo (arriba a la izquierda, en verde mientras los superas) y, al terminar, en el cuadro «¡Récord!».
- Las canciones largas ya no reinician el reloj al dar la vuelta: la melodía se repite en bucle.

## Sonido
- Cada canción se baja por **octavas completas** si su nota media pasa de Fa4 (sin que su nota más grave baje de Mi2), para que no suene chillona sin deformar la melodía. Ajustes en `SON` (`juego-piano.js`): `mediaMax`, `graveMin` y `transponer` (semitonos para todas por igual; `-2` = un tono más grave).

## Progreso (`localStorage` `piano:progreso`, sincronizado con `conectar()`)
```
{ "<canción>": { mejor, partidas, vueltas, r1, r2, r3 },
  "_niv": { max, hecho },                      // mapa: nivel más alto abierto / terminado
  "_fav": { "<canción>": { f: 1|0, t: hora } } }  // favoritas: gana el cambio más reciente
```
`unirPiano` une local y nube (mayor de cada número; favoritas por fecha). Los progresos viejos (sin `r1…r3`) se abren sin problema.

## Cómo agregar niveles (cuando quieras)
En `niveles-piano.js`: `NIVELES = [{ cancion: "Estrellita (Mozart)", puntos: 30 }, …]`. El elemento 0 es el nivel 1. Al llegar a `puntos` se gana el nivel y se abre el siguiente. El orden de estados/países viene de `compartido/etapas-mapa.js` (no lo cambies después de publicar).

## Estado
Probado con un simulador en Node (pantallas, filtros, favoritas, récords a 1/2/3 min con reloj falso, pausa, mapa, nivel de prueba, unión con la nube y octavas). **No probado en navegador ni celular:** diseño de los 3 filtros en pantallas muy angostas, estrellitas con el dedo y cómo suena el tono nuevo en bocinas de celular.
