# 🚗 Estacionamiento — documento de diseño

Ruta: `estacionamiento/README.md`. Sirve para retomar el juego en cualquier sesión sin volver a explicarlo.
Todo lo que dice «Meta» es la visión final; lo que dice «Hoy» es lo que existe ahora.

## 1. Qué es el juego

Puzle isométrico: un estacionamiento cuadrado lleno de autos. Cada auto tiene una flecha; al tocarlo avanza hacia donde apunta y sale por la orilla. Se gana cuando no queda ningún auto. Si un auto tiene otro enfrente, no puede salir hasta que lo despejes.

- **Hoy (verificado en el código):** tablero de tamaño variable por nivel (de 5×5 a 10×10, siempre lleno), generado con semilla; todos los niveles tienen solución.
- **Total: 3 900 niveles** (desde el 24 nov 2026; antes eran 22 600): **195 países × 20 niveles**, empezando por México (país 1 = niveles 1–20). Mapa solo de países (`ESTANDARES-juegos.md`, sección 4 A-bis). Ver la sección 15.

Los niveles se desbloquean **en orden**; cada país se abre al terminar los 20 del anterior (los países bloqueados no se listan).

## 2. El mapa (pantalla de progreso)

Es el **mapa estándar de un solo país** (`compartido/mapa-niveles.js` con `unPais: true`, el mismo de Deslizante); el juego ya no tiene mapa propio.

- La vista principal es la **silueta del país donde va el jugador** (tierra verde con pasto, árboles y banderita), que se llena de **agua** un poco con cada nivel pasado; al pasar los 20 queda llena. El agua respeta `prefers-reduced-motion`.
- Botones: ◀ ▶ (países abiertos), 🗂️ **Niveles** (los 20 niveles del país, en 4 columnas; verde = medio, azul = difícil, con el tamaño del tablero), 🗺️ **Mapa** (el mundo con solo los países desbloqueados), **Continuar** e ℹ️ **Info**.
- Orden de los países: `PAISES_MUNDO` de `compartido/etapas-mapa.js` (México primero, luego Latinoamérica…). No se cambia.
- Al ganar un nivel, «Mapa» abre la botella del país para ver subir el agua.

## 3. Tamaño y dificultad de los niveles (rediseño «divertido y satisfactorio»)

Principio: **los niveles no deben ser complicados; deben ser divertidos, entretenidos y satisfactorios.** Por eso ya no hay tableros grandes ni dificultades altas.

- **Tamaño estándar: 10×10, siempre COMPLETAMENTE lleno** (100 % de las casillas ocupadas). Solo los **10 primeros niveles** van subiendo para aprender jugando: 6×6, 6×6, 7×7, 7×7, 8×8, 8×8, 9×9, 9×9, 10×10, 10×10. Del 11 al 3 900 todos son 10×10.
- **Dificultad: solo 1 y 2** (de una escala original de 5; las 3, 4 y 5 se descartaron). Ver sección 14.
- Todos los jugadores ven el mismo nivel N (todo sale de una semilla fija).

| Dificultad | Nombre | Qué se pide del tablero | Monedas | Corazones |
|---|---|---|---|---|
| 1 | Medio | ≥ 40 % de los autos pueden salir desde el primer toque · ninguna «ola» con menos de 3 autos · cadena de autos que se estorban ≤ 4 | 20 | 15 |
| 2 | Difícil | ≥ 28 % libres al inicio · ola mínima ≥ 2 · cadena ≤ 6 | 35 | 8 |

**Sorteo de la dificultad (hecho, sin generar tableros):** `dificultades-estacionamiento.js` guarda la dificultad de cada uno de los 3 900 niveles (39 líneas de 100 dígitos, un **tramo** de 100 niveles seguidos por línea —no coincide con un país, que tiene 20—; `1` = medio, `2` = difícil). Lo escribe `node sorteo-dificultades.mjs` con semilla fija (siempre da lo mismo). Reglas: los niveles 1–10 son siempre medios; cada tramo tiene un número EXACTO de difíciles, de 15 en el primero a 50 en el último (el 39); nunca más de 3 difíciles seguidos. Resultado: **2 632 medios y 1 268 difíciles (32.5 %)**; en México (niveles 1–20) 3 difíciles. Para cambiar un nivel a mano, cambia su dígito en esa línea.

## 4. Monedas

Se ganan al **terminar un nivel por primera vez**: **20 monedas** en un nivel medio y **35** en uno difícil (`DIFICULTADES[...].premio`; promedio ≈ 25 por nivel). Repetir un nivel no da monedas. Las ganadas se calculan desde `prog.hecho` (no se guardan), y lo gastado se anota por dispositivo (ver el comentario de `juego-estacionamiento.js`), así que **al cambiar los premios cambia el saldo de quien ya tenía progreso**.

## 5. Corazones y boosts

### Corazones ❤️
Cada nivel trae corazones según su dificultad: **15 en los medios y 8 en los difíciles** (`DIFICULTADES[...].corazones`). **Se pierde un corazón al tocar un auto que tiene otro enfrente** (un doble toque mientras el auto rebota no cuenta dos veces). La vía de salida ocupada NO cuesta corazón. Con 0 corazones se pierde el nivel y sale la ventana «¡Sin corazones! 💔» (sobre el tablero, `#derrota`) con **Seguir con +3 ❤️ · 30🪙**, **Reintentar nivel** y **Mapa**. Los corazones se ven en un chip rojo (fila de arriba: monedas · tamaño · ❤️ · movs) que late cuando quedan 3 o menos.

### Boosts (se compran con monedas, abajo al centro)

| Boost | Precio | Efecto |
|---|---|---|
| 🚗 Quitar un auto | 30 🪙 | Elimina 1 auto a elección (se paga al usarlo, o gasta un uso ya comprado) |
| 📦 Paquete ×3 | 50 🪙 | 3 usos de «quitar un auto» (~16.7 🪙 c/u) |
| 💣 Bomba | 100 🪙 | Se toca un lugar: se marcan en rojo los **8 autos más cercanos** a ese punto (el que está debajo y los de alrededor); tocar otra vez el 💣 la suelta y **desaparecen** (con explosión). Si quedan menos de 8, se llevan todos. Se paga al soltarla |
| ❤️ Vida extra | 30 🪙 | **+3 corazones** (tope 30). También sirve para seguir jugando después de quedarte sin corazones |

Ritmo de la economía: un nivel da ~25 monedas en promedio, así que una bomba cuesta ≈ 4 niveles, una vida extra ≈ 1 y quitar un auto ≈ 1.

## 6. Interfaz y fondos (estándar de todos los juegos)

### Fondo de madera
- Clara por defecto: `imagenes/fondomaderaclara.webp`. Oscura (con luna): `imagenes/fondomaderaoscura.webp`.
- Lo pone solo `compartido/fondo-madera.js` (inyecta sus propios estilos). En el `<head>` va el script pequeño que evita el parpadeo en modo oscuro.
- **El `<canvas>` debe ser transparente** y el JS debe usar `clearRect` en cada cuadro, **no** `fillRect` con un color de fondo, para que la madera se vea detrás del tablero. Si el juego pinta un fondo propio, hay que quitarlo.
- Los textos que van directo sobre la madera usan `var(--txt-fondo)`, `var(--txt-fondo-suave)` y `var(--sombra-txt)`.

### Botones (distribución estándar)

| Lugar | Botón | Qué hace |
|---|---|---|
| Arriba izquierda | **🎮 Juegos** (`.b3d.txt.b-azuloscuro`, alargado) | Vuelve al portal (`href="../"`) |
| Arriba izquierda, justo debajo | **☰** (mismo ancho) | En una partida dice **«☰ Pausa»** y abre el menú de pausa. En el mapa/listas dice **«Menú principal»** y vuelve al menú del juego. En el menú principal del juego **no se muestra** |
| Abajo izquierda | **🌙 / ☀️** | Alterna madera clara y oscura (lo crea `fondo-madera.js`; no se pone a mano) |
| Abajo derecha | **⛶ / ✕** | Pantalla completa (lo crea `pantalla-completa.js`) |
| Arriba derecha | 🔄 Reiniciar, ➕, ➖, 🎯 | Controles del juego |
| Arriba centro | Chips `Autos` y `Movs` | Contadores |
| Abajo centro | Boosts | Quitar auto, paquete ×3, bomba |

Menú de pausa (`compartido/menu-pausa.js`): **▶ Continuar**, **🔄 Reiniciar nivel**, **🚪 Salir** (vuelve al mapa).

## 7. Archivos del juego

| Archivo | Para qué |
|---|---|
| `index-estacionamiento.html` | Página, HUD y botones |
| `juego-estacionamiento.js` | Juego: dibujo, controles, salida de los autos en línea recta, progreso, Modo libre, partidas guardadas y Ajustes |
| `niveles-estacionamiento.js` | **Generador** de los 3 900 niveles (tamaños, autos, dificultad, monedas). No usa `document`: se prueba en Node |
| `dificultades-estacionamiento.js` | Sorteo de la dificultad de cada nivel (39 tramos de 100). Lo escribe `sorteo-dificultades.mjs` (solo consola) |
| `probar-niveles-estacionamiento.mjs` | Pruebas automáticas del generador (`node probar-niveles-estacionamiento.mjs`, Node 22+, junto a `niveles-estacionamiento.js`) |
| ~~`mapa-estacionamiento.js`, `etapas-estacionamiento.js`, `geografia-estacionamiento.js`~~ | **Borrados el 24 nov 2026**: el mapa es el compartido (`compartido/mapa-niveles.js`, `etapas-mapa.js`, `contornos-paises.js`, `posiciones-paises.js`) |

Cuando el juego crezca conviene separar también `monedas.js` (premios, tienda y boosts). El mapa, las etapas y la geografía están pensados para reutilizarse en otros juegos: ver `ESTANDARES-juegos.md`.
Recordatorio: `niveles-estacionamiento.js` debe ir en la lista `ARCHIVOS` de `sw.js` (y subir `VERSION`) para que funcione sin internet.

## 8. Notas técnicas para las próximas sesiones

1. **Niveles generados, no escritos a mano.** ✅ Hecho en `niveles-estacionamiento.js` (ver sección 10).
2. **Rendimiento.** Con tableros de máximo 10×10 (100 casillas) ya no es un problema; la vista es fija (sin zoom ni arrastre) y el tablero ocupa todo el ancho de la zona libre.
3. **Guardado «local primero».** Guardar en `localStorage` y sincronizar con `compartido/progreso.js`. Como los niveles se abren en orden, basta guardar **«nivel más alto completado»** (no una lista de 3 900 booleanos). Las monedas se gastan, así que no se pueden fusionar con `unirMaximos`: hace falta una regla propia (por ejemplo, ganar la partida con `t` más reciente con `unirRecientes`).
4. **Registro del juego.** Cuando esté listo: quitar `estacionamiento` de `EN_DESARROLLO` en `juegos.js`, anotar sus archivos en `ARCHIVOS` de `sw.js` y subir `VERSION`.
5. **Puntos al perfil.** Desde el 21 nov 2026: **1 punto por nivel pasado por primera vez**, con `encolarNivel("estacionamiento")` de `compartido/cola-puntos.js` (estándar, sección 12 de `ESTANDARES-juegos.md`). Antes se daban 200 (medio) o 350 (difícil) con `encolarPuntos`. Las monedas (20 o 35) no cambian.

## 9. Orden de trabajo sugerido

1. ✅ Fondo de madera y botones estándar.
2. ✅ Generador de niveles con tabla de tamaños (México y países) y solución comprobada (`niveles-estacionamiento.js`).
3. Monedas (cartera, premio al terminar un nivel) y boosts.
4. Mapa de México con agua.
5. Guardado y sincronización de monedas y boosts.
6. ✅ Mapa de un solo país con el mundo de países desbloqueados (24 nov 2026, sección 15).
7. ~~Optimización para 50×50~~ (ya no aplica: máximo 10×10).

## 10. El generador (`niveles-estacionamiento.js`)

`configNivel(n)` devuelve `{ n, etapa, k, tam, dificultad, seed, obj, p3, enredo, extra, premio, corazones }` y `generarNivel(cfg)` los autos. Todo depende solo de `n`, así que todos los jugadores ven el mismo tablero.

- **Etapa:** `etapa` 0–194 = país (0 = México) y `k` 1–20 = nivel dentro del país (niveles 1–20 = México, 21–40 = el país 2…). El orden de los países lo da el mapa (`PAISES_MUNDO`).
- **Tamaño:** todos 10×10, salvo los 10 primeros niveles (6, 6, 7, 7, 8, 8, 9, 9, 10, 10). Constantes `TAM_ESTANDAR` y `TAMS_INICIALES`.
- **Dificultad (`dificultad`, 1 o 2):** tabla `DIFICULTADES` en `niveles-estacionamiento.js` (proporción de autos largos `p3`, «enredo», monedas y los mínimos que debe cumplir el tablero). Cuál nivel es medio y cuál difícil sale del sorteo (sección 3).
- **Tablero siempre COMPLETAMENTE lleno y amable.** `generarNivel` **tesela** el tablero con autos de 2 y 3 casillas y lo **desarma** prefiriendo los autos con menos estorbos (`desarmar`). Si sobra una casilla suelta, se atora y habría un hueco, o el tablero no cumple lo que pide su dificultad (`analizar`: autos libres al inicio, ola más chica y cadena más larga), se **descarta y se genera otro** con el siguiente tramo del mismo azar (máx. 3 000 intentos). Medido en los 3 900 niveles: 100 % llenos, 100 % resolubles, 0 fuera de meta. Un 10×10 trae ~43 autos.
- **Solución garantizada:** el orden en que se desarma el tablero es una solución (el primero en salir recibe el id más alto); se comprueba con `esResoluble` quitando los autos del último al primero. Probado en los 3 900 niveles. Si algún día el desarmado se atorara, se descarta un auto al azar (queda un hueco); en las pruebas no ha pasado.
- **Monedas por nivel** (`premioMonedas(dificultad)`): 20 (medio) / 35 (difícil). El color de los botones del mapa sale de eso (🟩 / 🟦).
- **Velocidad:** media 0.4 ms por nivel, máximo ~13 ms.

Para ajustar la dificultad, los números a tocar están en `DIFICULTADES` y en `sorteo-dificultades.mjs`.


## 11. Pendiente en el código del juego

1. ✅ `N` variable por nivel (vía, esquinas, suelo, cámara). Probado resolviendo niveles de 10×10 a 50×50 sin pantalla.
2. ✅ `NIVELES` de 5 entradas reemplazado por `configNivel(n)`.
3. ✅ Fondo transparente (`clearRect`).
4. ✅ Puntos: **1 punto por nivel pasado por primera vez** (`encolarNivel`, ver sección 8, punto 5). Antes fueron `100 × nivel` y luego `10 × monedas`.
5. **Selector de nivel.** ✅ Lo reemplazó el mapa (de un solo país desde el 24 nov 2026).
6. ✅ **Rendimiento.** Con máximo 10×10 ya no hace falta optimizar el dibujo.
7. **Progreso.** `prog = { max, hecho }` con `unirMaximos` sirve tal cual para «nivel más alto». Las monedas y boosts necesitan otra regla de fusión (se gastan).


## 12. Menú de inicio: «Continuar» y «Juego libre / infinito» (por hacer)

Hoy el juego abre directo en el mapa (la botella del país donde va el jugador; en su día era México de cerca) y ahí solo hay **▶ Continuar · nivel N** (más «Info» y, al terminar México, «Mundo»). Cambio pedido:

- Añadir el botón **♾️ Juego libre** (también se puede rotular «Infinito») **a la derecha de «Continuar · nivel N»**, en la vista principal del mapa (México y, ya desbloqueado, Mundo). Orden de la fila: `▶ Continuar` · `♾️ Juego libre` · `ℹ️ Info` · `🌍 Mundo`.
- **Qué es:** tableros al azar sin fin, sin pasar por el mapa ni por la lista de niveles. Se elige el tamaño (5×5 a 10×10) y salen tableros nuevos con solución garantizada (el mismo generador, con una semilla al azar en lugar del número de nivel).
- **Por decidir (propuesta entre paréntesis):** ¿qué tamaños se ofrecen (los que ya abriste por el mapa, o todos)? ¿da monedas y puntos? (propuesta: **no**, como el modo libre de Deslizante, para que no se puedan repetir sin límite). ¿se guarda algo? (propuesta: mejor marca y cantidad de tableros resueltos por tamaño).
- **Menú ☰ en el modo libre:** «Pausa» con Continuar / Reiniciar tablero / «Salir al mapa».
- Los boosts (quitar auto, paquete ×3, bomba) siguen funcionando con las monedas que ya tiene el jugador.

## 13. Autos con pared inferior y fin de nivel sobre el tablero

- **Autos con volumen.** Cada auto se dibuja con su techo y, debajo, **solo la pared que mira hacia abajo en la pantalla** (`dibujarPared` en `juego-estacionamiento.js`): si el auto apunta a la derecha o a la izquierda se ve su **costado** (ventanas y llantas, con el frente hacia donde apunta); si apunta hacia abajo, su **frente** (parabrisas, faros, parrilla); si apunta hacia arriba, su **parte de atrás** (luneta, luces, placa). Los autobuses (largo 3) llevan 4 ventanas y 3 llantas. En las curvas de la vía la pared sigue al auto con cualquier ángulo. Las proporciones están en `ALTO_PARED` y `SUBE_TECHO`. Con casillas chicas (menos de 14 px) la pared va lisa y de lejos es una franja oscura; el detalle completo solo se dibuja al acercar.
- **Orden de dibujo.** Los autos visibles se ordenan por su borde de abajo (`dibujar()`): el de más abajo tapa la pared del de arriba. Los toques siguen usando la casilla del suelo.
- **Fin de nivel.** La ventana de victoria usa el estándar `.sobre-tablero` (ver `ESTANDARES-juegos.md`, sección 6): «Siguiente nivel ▶» aparece **encima del cuadro del tablero** (`colocarVictoria()`), sin velo oscuro, y sigue al tablero si se mueve o acerca la vista.
- **Colores.** Los autos conservan sus 10 tonos pero más oscuros: `OSCURECER = 0.72` en `juego-estacionamiento.js` multiplica la luminosidad (1 = como antes).
- **Todos los tableros cambiaron.** Se mantienen los tamaños de cada nivel, las monedas y el progreso guardado (`max`, `hecho`), pero el tablero de cada nivel es nuevo: el nivel N ya no se parece al de antes.



## 14. Rediseño de dificultad (sesión del 21-nov-2026) — estado y pendientes

**Decisión del dueño del proyecto:** niveles de unos 10×10, completamente llenos; de una escala de 5 dificultades el juego solo usa la 1 y la 2; nada complicado, todo divertido, entretenido y satisfactorio.

### Ya hecho ✅
1. Vista fija en `juego-estacionamiento.js`: sin zoom ni arrastre; la vía completa ocupa todo el ancho de la pantalla y queda centrada (`escalaAjustada`, `ajustarCamara`). Si el celular está girado manda el alto.
2. `niveles-estacionamiento.js`: tamaño 10×10 estándar (los 10 primeros suben de 6×6), dificultad 1 y 2 (`DIFICULTADES`), tablero 100 % lleno garantizado, filtro de «amabilidad» por dificultad, función `analizar()` para medir cualquier tablero.
3. **Sorteo de dificultades** de los 22 600 niveles (sección 3). `configNivel` ya lo usa. Los tableros NO se volvieron a generar ni a probar después del sorteo: correr `node probar-niveles-estacionamiento.mjs`.
4. Los **10 primeros niveles** tienen semilla escogida a propósito (`SEMILLAS_INICIALES`; las busca `semillas-iniciales.mjs`). Curva: nivel 1–2 todos los autos salen de una (cadena 0); 3–8 cadena máxima 1; 9–10 cadena máxima 2. Todos distintos entre sí.
5. `mapa-estacionamiento.js`: color de los botones por monedas (🟩 15 / 🟦 25) y leyenda nueva. Texto de «Monedas» en la ventana Info.
6. `probar-niveles-estacionamiento.mjs` reescrito: tamaños, dificultades, monedas, determinismo, los 10 primeros y los 22 600 niveles (llenos, resolubles, dentro de meta).

7. **Corazones y boosts nuevos** (sección 5): 15 / 8 corazones por dificultad, ventana de derrota, bomba de «los 8 autos más cercanos» (reemplaza la de zona 5×5), boost de vida extra, premios 20 / 35. Probada con un script sin pantalla la selección de los 8 autos; **el juego completo en navegador NO se ha probado**.

### Pendiente ⏳ (para la próxima sesión)
- **Probar en el celular los corazones y la bomba:** que 4 botones de boost quepan abajo, que el chip ❤️ no desacomode la fila de arriba, que la ventana de derrota se vea sobre el tablero y que la vista previa de la bomba (8 autos en rojo) se entienda.
- **Ajustar números a gusto:** corazones (15 / 8), +3 por vida extra, precios y premios (20 / 35).
- **Probar en un celular real** el juego completo con tableros 10×10 y la vista fija (cuánto miden las casillas, que se toquen bien los autos, que la ventana de victoria `.sobre-tablero` quede bien).
- **Jugar los 10 primeros niveles** y ajustar a gusto: cambiar `TAMS_INICIALES`, el tope `MAX_CADENA` de `semillas-iniciales.mjs`, o correr el buscador de nuevo y pegar el resultado en `SEMILLAS_INICIALES`.
- **Revisar los niveles 11–100** (primer estado, Quintana Roo): ¿se sienten divertidos? Si hace falta, subir `minLibres` de la dificultad 1 o cambiar el número de difíciles por etapa en `sorteo-dificultades.mjs` (`DIF_PRIMERA`, `DIF_ULTIMA`).
- **Decidir si la dificultad 2 debe notarse más.** Hoy la diferencia es sutil (libres al inicio 45 % vs 38 %, cadena más larga media 3.0 vs 3.6) porque en un tablero lleno de 10×10 la geometría limita mucho. Ideas: más autos largos (`p3`), exigir menos autos libres (`minLibres`), o más 3 autos en cadena.
- **Mapa:** el número chico de cada botón ya es siempre «10×10» (salvo los 10 primeros); considerar mostrar otra cosa (por ejemplo ⭐ medio / ⭐⭐ difícil). (El botón sigue mostrando el tamaño, con el mapa compartido.)
- **Limpieza del README:** las secciones 11 y 12 mencionan «10×10 a 50×50» en pasos ya hechos; el modo ♾️ Juego libre (sección 12) debe ofrecer dificultad 1 o 2 en vez de tamaños 10 a 50.
- Pasos de siempre del README: monedas y boosts guardados con sincronización, registro en `juegos.js` y `sw.js` (subir `VERSION`).
- **El «cambio grande»** que el dueño del proyecto quiere hacer después: aún no explicado; anotarlo aquí cuando lo cuente.

### Descartado ❌
Tableros de 11×11 a 50×50 y las dificultades 3, 4 y 5. Las funciones `tamanoMexico`, `tamanosPais`, `REPARTO_PAIS` y `TRAMOS_MEXICO` se borraron de `niveles-estacionamiento.js`.

## 15. Cambio a 3 900 niveles: mapa solo de países (24 nov 2026)

**Decisión del dueño del proyecto:** pasar de 22 600 niveles (32 estados + 194 países × 100) a **3 900** según el estándar nuevo (`ESTANDARES-juegos.md`, sección 4 A-bis): México deja de ser 32 estados y es **un país más** (el 1.º), 195 países × 20 niveles.

### Qué cambió ✅
- `niveles-estacionamiento.js`: `NIVELES_POR_ETAPA = 20`, `PAISES = 195`, `TOTAL_NIVELES = 3 900`; `configNivel` ya no tiene `zona` (solo `etapa` 0–194 y `k` 1–20). Se quitaron `ESTADOS` y `NIVELES_MEXICO`. Semillas y tamaños de los niveles 1–3 900 **no cambiaron** (los 10 primeros siguen con sus semillas a mano).
- `sorteo-dificultades.mjs` / `dificultades-estacionamiento.js`: se volvió a sortear en **39 tramos de 100** (15 → 50 difíciles por tramo, misma curva que antes pero llegando a 50 en el nivel 3 900). Total 1 268 difíciles (32.5 %). Los niveles 1–100 salieron idénticos; **1 188 de los 3 900 niveles cambiaron de dificultad** (el primero, el 146) y con eso su tablero, premio (20/35) y corazones (15/8). Para conservar la dificultad que tenían, bastaría que `SORTEO` fuera los primeros 3 900 dígitos del archivo viejo, pero entonces la curva acabaría en ≈ 21 difíciles por tramo y no en 50.
- `juego-estacionamiento.js`: usa `compartido/mapa-niveles.js` con `crearEtapas({ porEtapa: 20, soloPaises: true })` y `unPais: true` (prefijo `estacionamiento-paises`, 4 columnas, color por dificultad con `infoNivel`). El progreso guardado se recorta a 3 900 (`normalizarProg`). «Mapa» al ganar abre la botella del país para ver subir el agua.
- Archivos **borrados**: `mapa-estacionamiento.js`, `etapas-estacionamiento.js`, `geografia-estacionamiento.js`. `sw.js` (VERSION 226): lista `["juego.js", "niveles.js", "dificultades-estacionamiento.js"]`.
- `probar-niveles-estacionamiento.mjs`: comprueba la numeración (y que coincide con `crearEtapas`), el sorteo (15 / 50, máx. 3 seguidos) y los 3 900 niveles. Resultado: **Todo correcto** (0 no resolubles, 0 no llenos, 0 fuera de meta).

### Efecto en quien ya tenía progreso (el juego ya estaba publicado)
- El número de nivel se conserva: quien iba en el 120 sigue en el 120 (ahora es el país 6). Quien pasó del 3 900 queda en «todo terminado».
- Las **monedas ganadas** salen de `prog.hecho` y los premios de cada nivel, así que su saldo cambia un poco (con 1 000 niveles pasados: +540; con 3 900: +8 520). Lo gastado no cambia. Los puntos del portal ya enviados no se tocan (nadie pierde ni gana puntos).

### Pendiente ⏳
- Probar en navegador y celular real el mapa nuevo dentro del juego (la lógica de niveles sí se probó en Node; el mapa y el flujo ganar → Mapa → Continuar no).
- ✅ Inicio estándar con mapa hecho (sección 16).
- Imagen de tarjeta.

## 16. Inicio con mapa (estándar de la sección 13 de `ESTANDARES-juegos.md`, 24 nov 2026)

Estacionamiento sigue el estándar «estilo Deslizante». Lo que cambió respecto a la versión anterior (que abría directo en el mapa, con «☰ Pausa», botones 🔄 y 🎮 alargados):

### Flujo
`Abrir el juego → Pantalla de inicio (una sola vez) → [♾️ Modo libre | ▶ Jugar | 🗺️ Mapa | ⚙️ Ajustes]`. El **mapa de un país es el menú principal** (☰, «Salir al mapa» y los botones de fin de nivel llevan al mapa, nunca al inicio). «Jugar» abre el nivel que toca; mientras no se haya pasado ninguno, abre el mapa en el nivel 1 (el botón del centro del país dice «▶ Jugar» y luego «▶ Continuar»).

### Dentro de un nivel (13.6)
- Barra arriba al centro: chip de monedas · 🗺️ · botón verde «Nivel N» (sin el tamaño). Tocar el verde, el 🗺️ o el ☰ abre «¿Salir?» (▶ Seguir jugando · 🚪 Salir al mapa). **Ya no hay botón 🔄**: se reinicia con «Repetir nivel» al ganar o «Reintentar nivel» al perder.
- Tres cuadros azules: **Movimientos · Corazones ❤️ · Autos** (los que faltan por sacar). Los corazones laten con 3 o menos.
- El tablero se encuadra en la zona libre entre la barra/cuadros y los boosts (`zonaTablero()`); en celular horizontal bajo, barra y cuadros pasan a una columna a la izquierda.
- Con la ventana de pausa abierta **todo se congela** (autos, animaciones, toques).
- Fin de nivel: sigue siendo la ventana «sobre el tablero» (sección 6), con Siguiente nivel · Repetir nivel · 🗺️ Mapa.

### ♾️ Modo libre (13.7)
- Dificultad: **😐 Medio** o **😡 Difícil** (solo hay 2; el estándar trae 5 emojis). Tablero: **5×5, 6×6, 7×7, 8×8, 9×9 o 10×10**. Cada «Jugar» genera un tablero nuevo con una semilla al azar (el mismo generador, siempre lleno y con solución).
- **No da monedas ni puntos de portal**; los boosts sí gastan monedas. Récord = **tableros resueltos por combinación** (`"10-1"` = 10×10 medio).
- **Pausa del Modo libre** (☰ «Pausa» o el botón verde): ▶ Seguir jugando · 💾 Guardar partida · 🚪 Salir a elegir tablero.
- **Partidas guardadas** (hasta 20, solo en el dispositivo): clave `estacionamiento_partidas_v1` = `{ v, t, partidas: [{ id, g, tam, dif, seed, q, v, mov }] }`. Como el tablero sale de su semilla, basta anotar cuáles autos ya salieron (`q`); al cargar se regenera y se quitan. Se validan al leer. Al terminar una partida guardada se borra de la lista.
- Al ganar: «Otro tablero ▶» · «Repetir tablero» · «⚙️ Cambiar tablero».

### Datos que se guardan (todo local primero, con `conectar()`)
| Clave de `localStorage` | Documento en la nube | Contenido | Regla de unión |
|---|---|---|---|
| `estacionamiento-progreso` | `estacionamiento` | `{ max, hecho }` | el mayor de cada uno |
| `estacionamiento-cartera` | `estacionamiento-cartera` | gastado / compradas / usadas por dispositivo | el mayor por dispositivo |
| `estacionamiento_libre_v1` | `estacionamiento-libre` | `{ v, dif, tam, ganados }` | de cada combinación, el mayor |
| `estacionamiento_partidas_v1` | (no se sube) | partidas guardadas | — |

### ⚙️ Ajustes (13.8)
🌙/☀️ **Madera clara/oscura** (el botón flotante está oculto con `data-madera-boton="oculto"`) · 💾 **Copia de seguridad** (`compartido/almacen.js`) · Cerrar. El botón «🗑️ Borrar todo el historial» existe pero `MOSTRAR_BORRAR_HISTORIAL = false` (el juego ya está publicado). **No** lleva «Instalar solo este juego» (13.9, opcional): no hay `manifest-estacionamiento.webmanifest` ni `sw-estacionamiento.js`.

### Copia de seguridad
`compartido/almacen.js` solo toma claves que terminan en `_v1`, `_v2`… (más `CLAVES_EXTRA`). Se agregaron a `CLAVES_EXTRA`: `estacionamiento-progreso`, `estacionamiento-cartera` y `deslizante_progreso` (el progreso principal de estos juegos no termina en `_vN`; sin esto la copia solo llevaría sus partidas guardadas y el Modo libre).

### Verificado ✅ (arnés en Node con un DOM simulado, NO en un navegador)
Inicio y chips; Jugar con y sin progreso; progreso de la versión de 22 600 niveles (se recorta a 3 900: 97 020 monedas ganadas y «Nivel 3900»); pausa «¿Salir?» (sin Guardar ni Reiniciar); Modo libre completo (elegir, jugar, guardar, salir, cargar, victoria que quita la partida de la lista y suma el récord, derrota con «Reintentar tablero» y «Cambiar tablero»); Ajustes (sin «Borrar»); el mapa abre desde el inicio. `probar-niveles-estacionamiento.mjs`: los 3 900 niveles y 1 200 tableros libres (5×5 a 10×10) correctos.

### Pendiente ⏳ (probar en celular real)
- Vertical y horizontal: que el tablero quede bien encuadrado entre la barra, los cuadros y los boosts (`zonaTablero()` usa márgenes fijos: 190 px arriba en celular vertical, 140 en pantalla ancha, 84 abajo; en horizontal bajo, 250 px a la izquierda).
- La ventana «Partidas guardadas» y Ajustes (estilos `.pg-*` van en el HTML, no en `inmersivo.css`; si otro juego los usa conviene pasarlos al CSS compartido).
- Mapa dentro del juego: «Continuar» en el centro del país, ♾️ Modo libre como botón extra, color de los niveles por dificultad.
- 📲 Instalar solo este juego (13.9): no hecho.

## 17. Salida en línea recta (24 nov 2026, `sw.js` v229)

**Por qué:** al salir, cada auto daba un giro a la derecha por una vía que rodeaba el tablero (con cuadros «SALIDA» en las esquinas y flechas amarillas). Si se tocaba rápido otro auto que debía pasar por esa zona, aparecía «La vía de salida está ocupada» y no podía salir.

**Qué cambió** (solo `juego-estacionamiento.js`; el HTML, el generador y los niveles no cambian):
- Ya no hay vía alrededor del tablero, ni cuadros «SALIDA», ni flechas amarillas. Queda el tablero con una sombra suave sobre la madera.
- Cada auto sale **en línea recta por su propia fila o columna**, siguiendo su flecha, y se desvanece al salir del tablero (`planear` devuelve `{ n, pts, acum, enBorde, tFin }`; la ruta tiene dos puntos).
- Se quitaron `viaOcupada`, `cobertura` y el aviso «La vía de salida está ocupada»: tocar autos rápido nunca los bloquea. Tocar un auto con otro enfrente sigue costando un corazón.
- El tablero se encuadra con media casilla de margen (`N + 1`, antes `N + 2` por la vía) dentro de la zona libre que dejan la barra de nivel, los cuadros de datos y los boosts (`zonaTablero`).
- Textos de la ventana Info actualizados.
- Probado en un navegador (celular simulado) con TODOS los archivos de la otra sesión: 8 autos tocados casi a la vez salen sin bloqueo y siempre derechos; un nivel de México y uno de Modo libre se resuelven hasta la ventana de victoria sin perder corazones. No probado en celular real.

**Nota:** dos autos que salen en direcciones perpendiculares podrían cruzarse por la misma casilla dentro del tablero y verse encimados un instante (ya pasaba antes). No se tocó.
