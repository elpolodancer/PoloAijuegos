# Nota de sesión: progreso en la nube con uso sin internet

> Para Claude (próxima sesión): lee esto completo y luego el `README.md` (sobre todo «Plan: muchos juegos y uso sin internet», punto 4, y «Seguir el trabajo en otra sesión»). El dueño habla español. No hace falta que te vuelva a explicar el proyecto: continúa desde «Qué sigue».

## El proyecto en 6 líneas

- Portal de ~40 juegos (HTML/JS sin framework) en GitHub Pages, un solo repo. Cada juego vive en su carpeta (`botellascolores/index-botellascolores.html`, `juego-botellascolores.js`…) y lo común en `compartido/`.
- Es una app instalable que debe funcionar **sin internet** (`sw.js` guarda todo; hay que subir `VERSION` y anotar archivos nuevos en `ARCHIVOS`/`JUEGOS`).
- Firebase (proyecto `elpolodancer`): login con Google + Firestore. La config de `compartido/firebase.js` no es secreta; la seguridad está en `firestore.rules`.
- Los juegos guardan su avance en **el navegador** (`localStorage`, algunos IndexedDB). Los puntos al perfil se enviaban con `sumarPuntos()` (`compartido/jugador.js`), que necesita internet y sesión: si fallaba, esos puntos se perdían.
- Algunos juegos serán enormes: Botellas de colores ya tiene 3200 niveles (32 estados × 100), y se prevén mapas de 100 niveles por estado de México y por país.
- Decisión del dueño: **rankings serios y servidor van para una versión futura**. Por ahora lo importante es que cualquiera pueda entrar con su correo de Google y que su progreso se guarde y se recupere.

## Objetivo de esta tarea

Que cualquier persona juegue (con o sin internet), y que su avance y sus puntos se suban solos a su cuenta de Google cuando haya internet y sesión, y se recuperen en otro dispositivo. Diseño: **local primero, sincronizar después**.

## Qué se hizo (sesión 1)

Archivos nuevos o cambiados (se entregaron sueltos; la primera línea de cada uno dice su `Ruta:`):

| Archivo | Qué hace |
|---|---|
| `compartido/cola-puntos.js` (nuevo) | Cola local de puntos pendientes (`encolarPuntos(juego, puntos)`). **No importa Firebase**, para que anotar puntos funcione siempre. Divide en envíos de máx. 1000 y compacta si pasan de 300 eventos |
| `compartido/progreso.js` (nuevo) | `vaciarPuntos()` envía la cola con `sumarPuntos` (al iniciar sesión, al volver la conexión y al abrir páginas que lo cargan). `conectar(juego, {clave, fusionar, alCambiar})` sincroniza el progreso de un juego con Firestore: baja, **une** con lo local, guarda lo unido en local y sube si cambió. Trae 3 funciones para unir: `unirHechos` (niveles pasados, OR), `unirMaximos` (récords, el mayor) y `unirRecientes` (partida completa, gana la más reciente; el objeto debe traer `t = Date.now()`) |
| `firestore.rules` | Se añadió `progreso/{uid}/juegos/{juego}`: **privado** (solo el dueño lee/escribe/borra), campos `datos` (texto, máx. 300 000 caracteres) y `actualizado`, nombre del juego `^[a-z0-9-]+$` y ≤ 40 caracteres. **Hay que pegarlas en la consola de Firebase** |
| `sw.js` | `VERSION` 82 y los dos archivos nuevos en `ARCHIVOS` |
| `index.html` (portal) | Carga `progreso.js` tras el login para vaciar puntos pendientes |
| `botellascolores/juego-botellascolores.js` | Puntos por la cola; progreso (`botellas_progreso_v2`) sincronizado con `unirHechos` |
| `pelota/juego-pelota.js` | Antes **no guardaba progreso**: ahora guarda niveles pasados en `pelota_progreso_v1` (con ✓ en el menú) y los sincroniza; puntos por la cola |

### Patrón para migrar cada juego (3 cambios pequeños)

```js
// 1. arriba:
import { encolarPuntos } from "../compartido/cola-puntos.js";
// 2. donde guarda en localStorage, avisar a la nube (nube es null hasta que cargue el módulo):
let nube = null;
const guardar = () => { /* localStorage.setItem(...) */ if (nube) nube.guardado(); };
// 3. donde daba puntos:
encolarPuntos(ID, PUNTOS);
try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
// 4. al final, tras cargar el progreso local:
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: m.unirHechos /* o unirMaximos / unirRecientes */, alCambiar: (v) => { /* recargar estado y repintar el menú */ } });
}).catch(() => {});
```

Regla de oro: **el juego nunca depende de Firebase** (todo `import()` dinámico con `catch`). Elegir `fusionar` según el tipo de dato: niveles pasados → `unirHechos`; récords/estrellas por clave → `unirMaximos`; partidas guardadas (Isla, Imperio, Restaurantes, Minas) → `unirRecientes` (añadir `t: Date.now()` al guardar; en Restaurantes son 3 ranuras, unir ranura por ranura).

## Decisiones y límites conocidos (no los «arregles» sin preguntar)

- Un progreso local **pertenece al dispositivo**: la primera cuenta que sincroniza lo «reclama». Si dos personas comparten celular, sus avances se mezclan. Mejora posible: guardar el `uid` junto al progreso local.
- «Mejor marca» por juego (`juegos/{juego}/jugadores`): como los puntos se envían en tandas, el «mejor» puede reflejar la tanda y no una partida. Es aceptable hasta rehacer rankings.
- Pelota da puntos **cada vez** que se pasa un nivel (como antes); Botellas solo la primera vez. Falta decidir si Pelota debe dar puntos solo la primera vez.
- Ventana pequeña de doble puntaje: si alguien juega un nivel nuevo antes de que termine la primera sincronización y ya lo había pasado en otro dispositivo, puede recibir esos puntos dos veces.
- Las reglas **no impiden** que alguien con la consola del navegador envíe muchos envíos de 1000 puntos (rankings falsificables). Se aceptó por ahora.
- `perfiles` y `jugadores` siguen con `allow read: if true` (nombre y foto de Google visibles para todos). Decidir si se limita antes de abrir al público.
- Opcional: en las reglas de `progreso`, sustituir la regex por una lista fija de juegos para impedir que alguien cree documentos con nombres inventados.
- El tope de 300 000 caracteres por juego puede quedarse corto para Imperio/Isla (límite real de Firestore ≈ 1 MB). Medir cuando se migren.
- **Pixelart** guarda en IndexedDB y **Rompecabezas** usa imágenes en imgbb: no encajan en este patrón (el Blob de la imagen no cabe en `datos`); se tratan aparte.
- Apps Script (`subir-imagen.gs`): si no existe la propiedad `CORREOS_PERMITIDOS`, cualquier usuario con sesión puede subir imágenes (10 por hora). Para abrirlo al público basta borrar esa propiedad; el costo del abuso va a la cuenta de imgbb del dueño.

## Pendientes del dueño (comprobar antes de seguir)

- [ ] Pegar `firestore.rules` nuevo en Firebase → Firestore → Reglas → Publicar.
- [ ] Authentication → Google activado, y el dominio de GitHub Pages en «Dominios autorizados» (el README aún los tiene sin marcar).
- [ ] Probar sin internet: abrir Botellas con internet una vez, activar modo avión, pasar un nivel, volver a conectar con sesión iniciada, y comprobar en Firestore que aparece `progreso/{uid}/juegos/botellas-colores` y que el total de puntos subió. Probar también que en un segundo dispositivo aparece el nivel.
- [ ] Subir los archivos (con `sw.js` en 82) a GitHub.

## Sesión 2 (7 nov 2026): Isla

Isla migrada con `unirRecientes` (`sw.js` en 88). Detalle clave: `t` solo sube si cambia el contenido (firma de inventario, herramientas, objetos, pisos y paredes), no en cada autoguardado; si no, un dispositivo viejo abierto sin jugar pisaría el avance. Mismo cuidado para Imperio, Restaurantes, Minas, Supermercado y Cavar. Medido: la isla pesa ~35 000 caracteres en `datos`. Pendiente del dueño: probar con dos dispositivos.

## Sesión 2 (7 nov 2026): Pantano

Pantano migrado (`sw.js` en 90). Puntos por `encolarPuntos` (1 por cada 20 del juego; se anotan aunque no haya sesión). El progreso vive en las claves de siempre (`pantano_monedas`, `_mejoras`, `_armas`, `_progreso`, `_mejor`) y se copia en `pantano_nube`, que es la que sincroniza `conectar` con `unirPantano`: la copia más reciente manda en monedas; niveles, estrellas, récord, mejoras y armas compradas se juntan de las dos. `t` solo sube si cambia ese contenido. Límite conocido: dos dispositivos jugando a la vez pueden gastar las mismas monedas (las compras se conservan en ambos). Quien ya traía avance y abre la nueva versión gana sobre una cuenta vacía.

## Sesión 2 (7 nov 2026): Rana

Rana migrada (`sw.js` en 91). Puntos por `encolarPuntos` (se anotan aunque no haya sesión; sigue dando puntos en cada nivel pasado, igual que antes, y el aviso del menú dice si ya se enviaron o quedan pendientes). El progreso es solo el nivel desbloqueado: `rana-nivel` guarda un número, y `conectar` lo une con `Math.max` (JSON de un número es válido para `conectar`). `alCambiar` sube `progreso` y, si estás en el menú inicial, te deja el nivel más alto elegido. Pendiente del dueño: probar con dos dispositivos.

## Sesión 3 (7 nov 2026): Pequeños puzles, Piano, Paperio, Minero Tycoon, Pixelart (y Pelota, que ya estaba)

`sw.js` en 92. Pelota ya estaba migrada desde la sesión 1 (los archivos que llegaron eran los mismos).
- **Pequeños puzles**: `unirPuzles` (niveles pasados + menor tiempo por nivel). Puntos por la cola.
- **Piano**: `unirPiano` (mayor de cada dato por canción). Se quitó el gancho vacío `sincronizarNube`. Los puntos ya no dependen de tener sesión al terminar la partida.
- **Paperio**: copia `paperio_nube`; nivel y récord por máximo, monedas/boosts por la copia más reciente (`t` solo cambia con la tienda). `guardarNube(false)` en el arranque crea la copia la primera vez solo si ya hay algo guardado.
- **Minero Tycoon**: copia compacta `minas_nube` (~8 caracteres por pozo, 81 000 en el peor caso) con `aInstantanea` / `deInstantanea` / `huella` / `unirMinas` en `logica-minas.js`. `t` sube solo si cambia la `huella` (lo comprado), no con el dinero. Se mantuvo aparte el `t` de la partida local (`minas_partida3`), que sirve para las ganancias sin conexión. Mismo patrón recomendado para Imperio, Restaurantes, Supermercado y Cavar: copia compacta, no el estado entero.
- **Pixelart**: solo puntos (IndexedDB y galería quedan para después).
- Límites conocidos nuevos: Minero Tycoon pierde al restaurar los viajes en curso y la carga de los depósitos; si se abre en un dispositivo nuevo y se juega antes de que termine la primera sincronización, ese dispositivo puede ganar sobre la cuenta.

## Qué sigue (orden sugerido)

1. Confirmar con el dueño que la prueba de arriba funcionó (si falla, pedir la consola del navegador: `progreso.js` escribe `console.warn("progreso (juego): …")`).
2. Migrar lo que falta. Según el historial de `sw.js` (versiones 82 a 92) ya están: Botellas, Pelota, Rana, 2048, Agario, Ajedrez, Burbujas, Buscaminas, Cadena de números, Cavar, Corredor, Defensa, Dulces, Deslizante, Doodle, Estacionamiento, Fichas, Devorador, Hoyo, Imperio, Isla, Pantano, Pequeños puzles, Piano, Paperio, Minero Tycoon y Pixelart (solo puntos). **Parece que faltan** (confirmar mirando si su `juego-*.js` ya usa `encolarPuntos`): Pradera, Jardín contra zombis, Zuma, Gominolas, Lluvia de globos, Rompe Ladrillos, Solitario, Supermercado, Restaurantes, Ladrillos numerados, Fusiona números, Jetpack y Rompecabezas (este con imgbb, aparte).
3. Después los de partida completa con `unirRecientes`: Restaurantes, Imperio, Isla, Minero Tycoon, Supermercado, Cavar.
4. Más adelante: Pixelart/Rompecabezas offline con IndexedDB, y la versión con servidor y rankings.
5. Cada juego migrado: subir `VERSION` en `sw.js`, y añadir una nota en «Estado» del README.

**Para cada tanda, el dueño debe pasar:** este archivo, `README.md`, `compartido/progreso.js`, `compartido/cola-puntos.js`, `sw.js`, y SOLO los archivos `juego-<carpeta>.js` (e `index`/`logica` si hacen falta) de los juegos de esa tanda. No hace falta pasar los 40 juegos. Si los archivos llegan sin carpetas, guiarse por la línea `Ruta:` de cada uno.

## Texto para pegar en el README

**En el «Mapa de archivos» (dos filas nuevas):**

| `compartido/cola-puntos.js` | Cola local de puntos pendientes (`encolarPuntos`). No usa Firebase: funciona sin internet |
|---|---|
| `compartido/progreso.js` | Envía los puntos pendientes y sincroniza el progreso de cada juego con la cuenta (`progreso/{uid}/juegos/{juego}`): local primero, une con la nube (`unirHechos`, `unirMaximos`, `unirRecientes`). Se importa siempre con `import()` y `catch` |

**En «Plan», punto 4 (sustituir el «Pendiente»):** Los puntos se anotan en `cola-puntos.js` y se envían al haber internet y sesión (hecho en Botellas y Pelota; falta migrar el resto). El progreso de cada juego se sincroniza con `progreso.js`. Ver `NOTA-SESION.md`.

## Sesión 4 (7 nov 2026): Jardín contra zombis

`sw.js` en 93. Puntos por `encolarPuntos` (antes dependían de tener sesión al terminar). Progreso: `jardin_progreso` (número) y `jardin_record_N` siguen siendo lo que lee el juego; se copian en `jardin_nube` `{p, r}` y `conectar` las une con `unirJardin` (el mayor de cada dato; sin `t`). El récord del nivel 1 incluye el viejo `jardin_record`. Si la nube trae algo mayor, `aplicarNube` lo escribe en las claves normales y repinta. Pendiente del dueño: probar con dos dispositivos. Ojo: en `juegos.js` la carpeta es `plantasvszombies` (el README antiguo dice `jardin/`).
Faltan por migrar (confirmar): Pradera, Zuma, Gominolas, Lluvia de globos, Rompe Ladrillos, Solitario, Supermercado, Restaurantes, Ladrillos numerados, Fusiona números, Jetpack y Rompecabezas (aparte).

## Sesión 5 (7 nov 2026): Pradera, Restaurantes, Rompecabezas

`sw.js` en 94.
- **Pradera**: puntos por la cola; el récord (`pradera:record`, un número) se sincroniza con el mayor.
- **Restaurantes**: puntos por la cola (se conserva `puntosEnviados` por partida). Se sincroniza `restaurantes_partidas` entera con `unirPartidas`: por ranura, `t` (solo cambia si cambia la `huella` de lo comprado, no con el dinero ni el tiempo); misma huella → más `reloj`. `puntosEnviados` = máximo de ambas copias (acotado a lo ganado) para no duplicar puntos. Borrar deja `borradas[i]` para que no reviva. Récord aparte (`restaurantes-record`). Subida limitada a ~1 cada 20 s. Si la nube trae un avance distinto de la partida abierta, se carga (`alLlegarNube`). Límites: dos dispositivos que compran distinto en la misma ranura → gana la última compra y se pierde lo comprado en la otra; las partidas viejas sin `t` usan `fecha`.
- **Rompecabezas**: solo puntos por la cola. La galería (URLs de imgbb) y las partidas guardadas siguen locales; son lo siguiente si se quiere.
Faltan por migrar: Zuma, Gominolas, Lluvia de globos, Rompe Ladrillos, Solitario, Supermercado, Ladrillos numerados, Fusiona números y Jetpack. Pendiente del dueño: probar con dos dispositivos (sobre todo Restaurantes).

## Sesión 6 (7 nov 2026): Solitario, Rompe Ladrillos, Sudoku (Supermercado: nada que migrar)

`sw.js` en 95.
- **Solitario** y **Rompe Ladrillos** importaban `jugador.js` de forma estática (el juego no abría sin el SDK de Firebase): ahora es `import()` con `catch`. Puntos por la cola.
- **Solitario**: copia `solitario-nube` `{n, t, g, s}` unida con `unirSolitario` (puntajes y totales por el mayor, tiempos por el menor; monedas = ganadas − gastadas). `guardarCopia()` deduce lo ganado/gastado comparando con las monedas actuales, así no hubo que tocar cada sitio que las cambia.
- **Rompe Ladrillos**: `rompeladrillos_mejor` por el mayor.
- **Sudoku**: apareció en esta tanda pero no está en `juegos.js` ni en `sw.js`. Se migraron puntos y mejores tiempos (menor). Pendiente decidir si se publica en el portal.
- **Supermercado**: no guarda nada ni da puntos (solo flags de Admin). No se tocó. Si se quiere sincronizar, primero hay que añadirle guardado: mismo patrón que Minero Tycoon (copia compacta de lo comprado, `t` solo si cambia).
Faltan por migrar: Zuma, Gominolas, Lluvia de globos, Ladrillos numerados, Fusiona números y Jetpack (más galería/partidas de Rompecabezas). Pendiente del dueño: probar con dos dispositivos (sobre todo Solitario, por las monedas).

## Sesión 7 (7 nov 2026): Zuma

`sw.js` en 96. Puntos por la cola. `zuma_progreso_v2` se sincroniza directo con `unirZuma`: estrellas y mejor por nivel = máximo; monedas se calculan (`ganadasPor(niveles) − gastadas`); `gastadas` es un campo nuevo que sube 30 por cada boost comprado (en datos viejos se deduce al cargar). Si la nube trae datos y estás en la pantalla de inicio, se recalcula el nivel sugerido.
Según la lista de la sesión 1, **no he visto aún**: Gominolas, Lluvia de globos, Ladrillos numerados, Fusiona números y Jetpack (confirmar si ya se hicieron en otra sesión mirando si su `juego-*.js` usa `encolarPuntos`). Más: galería y partidas de Rompecabezas; guardado de Supermercado (hoy no guarda nada); publicar Sudoku en `juegos.js`/`sw.js`. Pendiente del dueño: pruebas con dos dispositivos y los pendientes de la sesión 1.

## Sesión 8 (7 nov 2026): revisión general, Gominolas, Globos, Fusiona números, Rompe Ladrillos, Jetpack

`sw.js` en 98. **Las reglas vigentes son `firestore-unificado.rules` (ya publicadas); `firestore.rules` se borró.** Donde arriba dice «`firestore.rules`», léase `firestore-unificado.rules`.
- **Gominolas, Globos y Fusiona números** ya estaban migrados (no se habían anotado). **Rompe Ladrillos** también (sesión 6). **Jetpack** se migró ahora: `encolarPuntos` + `jetpack_mejor` por el mayor.
- Retoques: Rompe Ladrillos (audio en iOS, aviso tardío del perfil), Fusiona números (guarda el mejor puntaje al salir a medias).
- `progreso.js`: `vaciarPuntos` ya no se traba si el primer evento falla siempre (rechazos del servidor: al final de la cola, descarte tras 20). Los eventos de la cola pueden traer un campo `x` (intentos).
- Los archivos de `compartido/` (`cola-puntos.js`, `progreso.js`) van en la carpeta `compartido/`, no en la raíz.
**Faltan por migrar:** Ladrillos numerados (no se ha visto su código). Aparte: galería y partidas de Rompecabezas, guardado de Supermercado (hoy no guarda nada), publicar Sudoku en `juegos.js`/`sw.js`.
**Pendientes del dueño:** pruebas con dos dispositivos; Authentication → Google y dominio de GitHub Pages autorizado; restringir la `apiKey` por dominio en Google Cloud; decidir si Pelota da puntos solo la primera vez; decidir si `perfiles`/`jugadores` siguen con lectura pública; icono `maskable` propio en el manifest.
