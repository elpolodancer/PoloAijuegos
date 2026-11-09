# 🚗 Estacionamiento — documento de diseño

Ruta: `estacionamiento/README.md`. Sirve para retomar el juego en cualquier sesión sin volver a explicarlo.
Todo lo que dice «Meta» es la visión final; lo que dice «Hoy» es lo que existe ahora.

## 1. Qué es el juego

Puzle isométrico: un estacionamiento cuadrado lleno de autos. Cada auto tiene una flecha; al tocarlo avanza hacia donde apunta y sale por la orilla. Se gana cuando no queda ningún auto. Si un auto tiene otro enfrente, no puede salir hasta que lo despejes.

- **Hoy (verificado en el código):** cuadrícula fija de 25×25 (`const N = 25`) y 5 niveles escritos a mano en `NIVELES` (semilla, autos objetivo, proporción de autos largos y «desorden»). Los niveles ya se generan con semilla y siempre tienen solución.
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

## 3. Tamaño de los niveles

La cuadrícula es siempre cuadrada (N×N). Dentro de cada rango, el tamaño de cada nivel lo decide una semilla fija, para que **todos los jugadores vean el mismo nivel N**.

### México

| Niveles | Tamaño |
|---|---|
| 1 – 100 | 10×10 a 15×15 |
| 101 – 300 | 12×12 a 20×20 |
| 301 – 600 | 15×15 a 22×22 |
| 601 – 1 000 | 17×17 a 25×25 |
| 1 001 – 2 000 | 25×25 a 35×35 |
| 2 001 – 3 000 | 27×27 a 40×40 |
| 3 001 – 3 200 | **50×50** (todos) |

### Países (100 niveles por país)

Al azar (con semilla), pero con proporciones fijas **dentro de cada país**: exactamente 40 / 30 / 20 / 10 niveles, mezclados.

| Proporción | Tamaño | Niveles por país |
|---|---|---|
| 40 % | 40×40 a 50×50 | 40 |
| 30 % | 30×30 a 39×39 | 30 |
| 20 % | 20×20 a 29×29 | 20 |
| 10 % | 10×10 a 19×19 | 10 |

## 4. Monedas

Se ganan al **terminar un nivel**, según su tamaño:

| Tamaño | Monedas |
|---|---|
| 10×10 a 19×19 | 15 |
| 20×20 a 29×29 | 25 |
| 30×30 a 39×39 | 35 |
| 40×40 a 45×45 | 45 |
| 46×46 a 50×50 | 60 |

Por decidir: si las monedas se dan solo la primera vez que se pasa el nivel (recomendado, para que repetirlo no sea una fábrica de monedas).

## 5. Boosts (se compran con monedas)

| Boost | Precio | Efecto |
|---|---|---|
| Quitar un auto | 30 🪙 | Elimina 1 auto a elección |
| Paquete ×3 | 50 🪙 | 3 usos de «quitar un auto» (sale a ~16.7 🪙 c/u) |
| Bomba | 100 🪙 | Cae en una zona de **5×5 casillas** y elimina todos los autos de esa área |

Interfaz sugerida: botones `.b3d` en la parte baja central (ver sección 6), con la cantidad disponible en la etiqueta `.b-info` (`×2`) y el precio cuando aún no se tiene (`30🪙`, clase `.sin`), como ya define `inmersivo.css`. Al activar la bomba, mostrar sobre el tablero el cuadro de 5×5 que se va a borrar.

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
2. **Rendimiento en 50×50.** Son hasta 2 500 casillas en vista isométrica. Hacen falta: dibujar solo lo visible, cachear el suelo en un canvas aparte y pellizco/zoom fluido en celulares.
3. **Guardado «local primero».** Guardar en `localStorage` y sincronizar con `compartido/progreso.js`. Como los niveles se abren en orden, basta guardar **«nivel más alto completado»** (no una lista de 22 600 booleanos). Las monedas se gastan, así que no se pueden fusionar con `unirMaximos`: hace falta una regla propia (por ejemplo, ganar la partida con `t` más reciente con `unirRecientes`).
4. **Registro del juego.** Cuando esté listo: quitar `estacionamiento` de `EN_DESARROLLO` en `juegos.js`, anotar sus archivos en `ARCHIVOS` de `sw.js` y subir `VERSION`.
5. **Puntos al perfil.** Usar `encolarPuntos("estacionamiento", n)` de `compartido/cola-puntos.js` (tope 1 000 por envío).

## 9. Orden de trabajo sugerido

1. ✅ Fondo de madera y botones estándar.
2. ✅ Generador de niveles con tabla de tamaños (México y países) y solución comprobada (`niveles-estacionamiento.js`).
3. Monedas (cartera, premio al terminar un nivel) y boosts.
4. Mapa de México con agua.
5. Guardado y sincronización de monedas y boosts.
6. Mapa mundial y desbloqueo tras el nivel 3 200.
7. Optimización para 50×50 (dibujo).

## 10. El generador (`niveles-estacionamiento.js`)

`configNivel(n)` devuelve `{ n, zona, etapa, k, tam, seed, obj, p3, K, premio, dif }` y `generarNivel(cfg)` los autos. Todo depende solo de `n`, así que todos los jugadores ven el mismo tablero.

- **Zona y etapa:** niveles 1–3200 = México (`etapa` 0–31 = estado, `k` 1–100); 3201–22600 = mundo (`etapa` 0–193 = país). El orden de estados y países queda para el mapa.
- **Tamaño en México:** dentro de cada tramo sube poco a poco con un poco de azar (`tamanoMexico`), siempre dentro del rango pedido. Los últimos 200 son 50×50.
- **Tamaño en países:** en cada país salen exactamente 40 niveles de 40–50, 30 de 30–39, 20 de 20–29 y 10 de 10–19, en orden aleatorio fijo por país (comprobado en los 194 países).
- **Dificultad (`dif`, 0–1):** en México crece con el número de nivel (0.1 → 0.85, y 0.9 en los últimos 200); en países depende del tamaño. De ella salen la proporción de autos largos (`p3`), el «desorden» (`K`) y la densidad.
- **Tope de autos por tamaño:** mientras más grande el tablero, más largo el camino de cada auto hasta la orilla y menos caben (medido: ocupación máxima ≈74 % en 10×10, ≈52 % en 25×25, ≈36 % en 50×50). Por eso la densidad pedida tiene un tope `0.245 + 4.25 / tam`. Un 50×50 trae ~320 autos; un 25×25 difícil, ~160.
- **Solución garantizada:** se comprueba con `esResoluble` quitando los autos del último al primero. Probado en los 22 600 niveles.
- **Monedas por nivel** (`premioMonedas`): 15 / 25 / 35 / 45 / 60 según el tamaño. El juego ya las muestra en el selector, pero **todavía no las suma** (paso 3).
- **Velocidad:** el peor nivel se genera en ~20 ms.

Para ajustar la dificultad, los números a tocar están en `configNivel` (`dif`, `p3`, `K`, `dens`).


## 11. Pendiente en el código del juego

1. ✅ `N` variable por nivel (vía, esquinas, suelo, cámara). Probado resolviendo niveles de 10×10 a 50×50 sin pantalla.
2. ✅ `NIVELES` de 5 entradas reemplazado por `configNivel(n)`.
3. ✅ Fondo transparente (`clearRect`).
4. ✅ Puntos: ahora `10 × monedas del nivel` (150–600) en vez de `100 × nivel`. Fácil de cambiar en `victoria()`.
5. **Selector de nivel.** Es provisional (◀ Nivel ▶ con tamaño y premio). El mapa lo reemplaza.
6. **Rendimiento en 50×50.** `dibujar()` filtra y ordena todos los autos en cada cuadro y dibuja el suelo casilla a casilla. Pendiente de medir en un celular real; si va lento: cachear el suelo en un canvas aparte y dibujar solo lo visible.
7. **Progreso.** `prog = { max, hecho }` con `unirMaximos` sirve tal cual para «nivel más alto». Las monedas y boosts necesitan otra regla de fusión (se gastan).


## 12. Menú de inicio: «Continuar» y «Juego libre / infinito» (por hacer)

Hoy el juego abre directo en el mapa de México y ahí solo hay **▶ Continuar · nivel N** (más «Info» y, al terminar México, «Mundo»). Cambio pedido:

- Añadir el botón **♾️ Juego libre** (también se puede rotular «Infinito») **a la derecha de «Continuar · nivel N»**, en la vista principal del mapa (México y, ya desbloqueado, Mundo). Orden de la fila: `▶ Continuar` · `♾️ Juego libre` · `ℹ️ Info` · `🌍 Mundo`.
- **Qué es:** tableros al azar sin fin, sin pasar por el mapa ni por la lista de niveles. Se elige el tamaño (10×10 a 50×50) y salen tableros nuevos con solución garantizada (el mismo generador, con una semilla al azar en lugar del número de nivel).
- **Por decidir (propuesta entre paréntesis):** ¿qué tamaños se ofrecen (los que ya abriste por el mapa, o todos)? ¿da monedas y puntos? (propuesta: **no**, como el modo libre de Deslizante, para que no se puedan repetir sin límite). ¿se guarda algo? (propuesta: mejor marca y cantidad de tableros resueltos por tamaño).
- **Menú ☰ en el modo libre:** «Pausa» con Continuar / Reiniciar tablero / «Salir al mapa».
- Los boosts (quitar auto, paquete ×3, bomba) siguen funcionando con las monedas que ya tiene el jugador.
