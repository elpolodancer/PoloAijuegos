## 1) Fila para la tabla «Mapa de archivos» (reemplaza la fila actual de piano, si existe)

| `piano/index-piano.html`, `piano/juego-piano.js`, `piano/melodias-piano.js`, `piano/niveles-piano.js`, `piano/midi-a-notas.py`, `piano/README-piano.md` | Juego «Piano» (id de puntos `piano`): teclas negras que bajan (estilo Piano Tiles), sin límite de tiempo. Menú principal con «Niveles» (mapa estándar `compartido/mapa-niveles.js`, 30 niveles por estado y por país, `niveles-piano.js` aún vacío) y «Canciones» (62 canciones, filtros Con MIDI / Sin MIDI / Favoritas, modo aleatorio). Récord por canción a 1, 2 y 3 minutos (`r1`, `r2`, `r3`), favoritas y avance del mapa en `localStorage` `piano:progreso`, sincronizado con `conectar()` (`unirPiano`). Las canciones agudas se bajan por octavas (`SON` en `juego-piano.js`). `midi-a-notas.py` es solo del programador (no va en `sw.js`) |

## 2) Nota para la sección «Estado»

- Piano (11 nov 2026, `sw.js` `VERSION` = 151): pasa a la zona «Juegos» (terminado). Menú principal Niveles / Canciones, mapa estándar sin niveles todavía (30 por estado y país), favoritas junto a los filtros Con/Sin MIDI, sin límite de tiempo con récords a 1, 2 y 3 minutos y sonido una octava más grave en las canciones agudas. Probado con simulador en Node; NO probado en navegador/celular. Pendiente: agregar los niveles en `niveles-piano.js` y, si se quiere, un botón «Info».
