# 🚗 Estacionamiento — documento de diseño

Ruta: `estacionamiento/README.md`. Sirve para retomar el juego en cualquier sesión sin volver a explicarlo.
Todo lo que dice «Meta» es la visión final; lo que dice «Hoy» es lo que existe ahora.

## 1. Qué es el juego

Puzle isométrico: un estacionamiento cuadrado lleno de autos. Cada auto tiene una flecha; al tocarlo avanza hacia donde apunta y sale por la orilla. Se gana cuando no queda ningún auto. Si un auto tiene otro enfrente, no puede salir hasta que lo despejes.

- **Hoy (verificado en el código):** tablero de tamaño variable por nivel (de 5×5 a 10×10, siempre lleno), generado con semilla; todos los niveles tienen solución.
- **Meta:** **22 600 niveles** en total.

| Bloque | Niveles | Cuenta |
|---|---|---|
| México | 3 200 | 32 estados × 100 niveles |
| Mundo | 19 400 | 194 países × 100 niveles |

> Supuesto: «19400» son los niveles de todos los países juntos (194 × 100), sin contar México.

Los niveles se desbloquean **en orden**. Los de países **no se mencionan ni se ven** hasta terminar los 3 200 de México.

## 2. El mapa (pantalla de progreso)

Es el menú principal del juego. Estilo parecido al mapa de Paperio.

- Fondo **blanco**.
- Al inicio solo se ve **México, de cerca**, nada más. El jugador no sabe que hay más mundo.
- Cada estado terminado (100 niveles) hace subir un **líquido azul claro, tipo agua**, dentro de la silueta del país.
- El ascenso se divide en **32 escalones** (uno por estado). Con los 3 200 niveles terminados, México queda lleno.
- El agua **se mueve como agua real**, con un poco de oleaje y disturbio (decorativo, y debe respetar `prefers-reduced-motion`).
- Al terminar los 3 200, **se desbloquea el mapa mundial** (los 194 países, mismo efecto de agua por país, 100 niveles cada uno).

Pendientes por decidir: orden de los 32 estados; si el agua sube por escalón de estado o de forma continua nivel a nivel dentro del estado; cómo se elige un país en el mapa mundial.

## 3. Tamaño y dificultad de los niveles (rediseño «divertido y satisfactorio»)

Principio: **los niveles no deben ser complicados; deben ser divertidos, entretenidos y satisfactorios.** Por eso ya no hay tableros grandes ni dificultades altas.

- **Tamaño estándar: 10×10, siempre COMPLETAMENTE lleno** (100 % de las casillas ocupadas). Solo los **10 primeros niveles** van subiendo para aprender jugando: 6×6, 6×6, 7×7, 7×7, 8×8, 8×8, 9×9, 9×9, 10×10, 10×10. Del 11 al 22 600 todos son 10×10.
- **Dificultad: solo 1 y 2** (de una escala original de 5; las 3, 4 y 5 se descartaron). Ver sección 14.
- Todos los jugadores ven el mismo nivel N (todo sale de una semilla fija).

| Dificultad | Nombre | Qué se pide del tablero | Monedas | Corazones |
|---|---|---|---|---|
| 1 | Medio | ≥ 40 % de los autos pueden salir desde el primer toque · ninguna «ola» con menos de 3 autos · cadena de autos que se estorban ≤ 4 | 20 | 15 |
| 2 | Difícil | ≥ 28 % libres al inicio · ola mínima ≥ 2 · cadena ≤ 6 | 35 | 8 |

**Sorteo de la dificultad (hecho, sin generar tableros):** `dificultades-estacionamiento.js` guarda la dificultad de cada uno de los 22 600 niveles (una línea de 100 dígitos por etapa; `1` = medio, `2` = difícil). Lo escribe `node sorteo-dificultades.mjs` con semilla fija (siempre da lo mismo). Reglas: los niveles 1–10 son siempre medios; cada etapa tiene un número EXACTO de difíciles, de 15 en la primera etapa a 50 en la última (226); nunca más de 3 difíciles seguidos. Resultado: **15 255 medios y 7 345 difíciles (32.5 %)**; en México (3 200 niveles) 557 difíciles. Para cambiar un nivel a mano, cambia su dígito en esa línea.

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
| `juego-estacionamiento.js` | Juego: dibujo, controles, vía de salida, progreso. Ya usa tamaño de tablero variable |
| `niveles-estacionamiento.js` | **Generador** de los 22 600 niveles (tamaños, autos, dificultad, monedas). No usa `document`: se prueba en Node |
| `probar-niveles-estacionamiento.mjs` | Pruebas automáticas del generador (`node probar-niveles-estacionamiento.mjs`, Node 22+, junto a `niveles-estacionamiento.js`) |
| `mapa-estacionamiento.js` | **El mapa** (menú principal): México con agua que sube un escalón por estado, mapa del mundo (solo tras los 3 200 niveles), listas de 100 niveles. Se monta con `montarMapa({ progreso, jugarNivel, alInfo, alCambiarVista })` |
| `etapas-estacionamiento.js` | Orden de los 32 estados y los 194 países (con su lon/lat y código ISO) y cuentas de progreso (`resumen`, `etapaDe`) |
| `geografia-estacionamiento.js` | Contornos simplificados de México, continentes y lagos para dibujar el mapa |

Cuando el juego crezca conviene separar también `monedas.js` (premios, tienda y boosts). El mapa, las etapas y la geografía están pensados para reutilizarse en otros juegos: ver `ESTANDARES-juegos.md`.
Recordatorio: `niveles-estacionamiento.js` debe ir en la lista `ARCHIVOS` de `sw.js` (y subir `VERSION`) para que funcione sin internet.

## 8. Notas técnicas para las próximas sesiones

1. **Niveles generados, no escritos a mano.** ✅ Hecho en `niveles-estacionamiento.js` (ver sección 10).
2. **Rendimiento.** Con tableros de máximo 10×10 (100 casillas) ya no es un problema; la vista es fija (sin zoom ni arrastre) y la vía completa ocupa todo el ancho de la pantalla.
3. **Guardado «local primero».** Guardar en `localStorage` y sincronizar con `compartido/progreso.js`. Como los niveles se abren en orden, basta guardar **«nivel más alto completado»** (no una lista de 22 600 booleanos). Las monedas se gastan, así que no se pueden fusionar con `unirMaximos`: hace falta una regla propia (por ejemplo, ganar la partida con `t` más reciente con `unirRecientes`).
4. **Registro del juego.** Cuando esté listo: quitar `estacionamiento` de `EN_DESARROLLO` en `juegos.js`, anotar sus archivos en `ARCHIVOS` de `sw.js` y subir `VERSION`.
5. **Puntos al perfil.** Desde el 21 nov 2026: **1 punto por nivel pasado por primera vez**, con `encolarNivel("estacionamiento")` de `compartido/cola-puntos.js` (estándar, sección 12 de `ESTANDARES-juegos.md`). Antes se daban 200 (medio) o 350 (difícil) con `encolarPuntos`. Las monedas (20 o 35) no cambian.

## 9. Orden de trabajo sugerido

1. ✅ Fondo de madera y botones estándar.
2. ✅ Generador de niveles con tabla de tamaños (México y países) y solución comprobada (`niveles-estacionamiento.js`).
3. Monedas (cartera, premio al terminar un nivel) y boosts.
4. Mapa de México con agua.
5. Guardado y sincronización de monedas y boosts.
6. Mapa mundial y desbloqueo tras el nivel 3 200.
7. ~~Optimización para 50×50~~ (ya no aplica: máximo 10×10).

## 10. El generador (`niveles-estacionamiento.js`)

`configNivel(n)` devuelve `{ n, zona, etapa, k, tam, seed, obj, p3, enredo, premio, dif }` y `generarNivel(cfg)` los autos. Todo depende solo de `n`, así que todos los jugadores ven el mismo tablero.

- **Zona y etapa:** niveles 1–3200 = México (`etapa` 0–31 = estado, `k` 1–100); 3201–22600 = mundo (`etapa` 0–193 = país). El orden de estados y países queda para el mapa.
- **Tamaño:** todos 10×10, salvo los 10 primeros niveles (6, 6, 7, 7, 8, 8, 9, 9, 10, 10). Constantes `TAM_ESTANDAR` y `TAMS_INICIALES`.
- **Países:** ya no tienen reparto de tamaños propio (los 194 países usan el mismo estándar 10×10).
- **Dificultad (`dificultad`, 1 o 2):** tabla `DIFICULTADES` en `niveles-estacionamiento.js` (proporción de autos largos `p3`, «enredo», monedas y los mínimos que debe cumplir el tablero). Cuál nivel es medio y cuál difícil sale del sorteo (sección 3).
- **Tablero siempre COMPLETAMENTE lleno y amable.** `generarNivel` **tesela** el tablero con autos de 2 y 3 casillas y lo **desarma** prefiriendo los autos con menos estorbos (`desarmar`). Si sobra una casilla suelta, se atora y habría un hueco, o el tablero no cumple lo que pide su dificultad (`analizar`: autos libres al inicio, ola más chica y cadena más larga), se **descarta y se genera otro** con el siguiente tramo del mismo azar (máx. 3 000 intentos). Medido en los 22 600 niveles: 100 % llenos, 100 % resolubles, 0 fuera de meta. Un 10×10 trae ~43 autos.
- **Solución garantizada:** el orden en que se desarma el tablero es una solución (el primero en salir recibe el id más alto); se comprueba con `esResoluble` quitando los autos del último al primero. Probado en los 22 600 niveles. Si algún día el desarmado se atorara, se descarta un auto al azar (queda un hueco); en las pruebas no ha pasado.
- **Monedas por nivel** (`premioMonedas(dificultad)`): 20 (medio) / 35 (difícil). El color de los botones del mapa sale de eso (🟩 / 🟦).
- **Velocidad:** media 0.4 ms por nivel, máximo ~13 ms.

Para ajustar la dificultad, los números a tocar están en `DIFICULTADES` y en `sorteo-dificultades.mjs`.


## 11. Pendiente en el código del juego

1. ✅ `N` variable por nivel (vía, esquinas, suelo, cámara). Probado resolviendo niveles de 10×10 a 50×50 sin pantalla.
2. ✅ `NIVELES` de 5 entradas reemplazado por `configNivel(n)`.
3. ✅ Fondo transparente (`clearRect`).
4. ✅ Puntos: **1 punto por nivel pasado por primera vez** (`encolarNivel`, ver sección 8, punto 5). Antes fueron `100 × nivel` y luego `10 × monedas`.
5. **Selector de nivel.** Es provisional (◀ Nivel ▶ con tamaño y premio). El mapa lo reemplaza.
6. ✅ **Rendimiento.** Con máximo 10×10 ya no hace falta optimizar el dibujo.
7. **Progreso.** `prog = { max, hecho }` con `unirMaximos` sirve tal cual para «nivel más alto». Las monedas y boosts necesitan otra regla de fusión (se gastan).


## 12. Menú de inicio: «Continuar» y «Juego libre / infinito» (por hacer)

Hoy el juego abre directo en el mapa de México y ahí solo hay **▶ Continuar · nivel N** (más «Info» y, al terminar México, «Mundo»). Cambio pedido:

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
- **Mapa:** el número chico de cada botón ya es siempre «10×10» (salvo los 10 primeros); considerar mostrar otra cosa (por ejemplo ⭐ medio / ⭐⭐ difícil).
- **Limpieza del README:** las secciones 11 y 12 mencionan «10×10 a 50×50» en pasos ya hechos; el modo ♾️ Juego libre (sección 12) debe ofrecer dificultad 1 o 2 en vez de tamaños 10 a 50.
- Pasos de siempre del README: monedas y boosts guardados con sincronización, mapa mundial tras el nivel 3 200, registro en `juegos.js` y `sw.js` (subir `VERSION`).
- **El «cambio grande»** que el dueño del proyecto quiere hacer después: aún no explicado; anotarlo aquí cuando lo cuente.

### Descartado ❌
Tableros de 11×11 a 50×50 y las dificultades 3, 4 y 5. Las funciones `tamanoMexico`, `tamanosPais`, `REPARTO_PAIS` y `TRAMOS_MEXICO` se borraron de `niveles-estacionamiento.js`.
