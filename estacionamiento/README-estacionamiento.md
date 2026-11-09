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
| Arriba izquierda | **🎮 Juegos** (`.b3d.txt.b-gris`) | Vuelve al portal (`href="../"`) |
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
| `juego-estacionamiento.js` | Lógica, dibujo, niveles (por revisar y dividir cuando crezca) |
| `mapa.js` | **Aún no existe para este juego.** El `mapa_1.js` que se subió es el de Paperio (SVG: mundo → México → estado) y solo sirve de referencia |

Cuando el juego crezca conviene separar: `niveles.js` (generador por semilla + tabla de tamaños), `monedas.js` (premios y boosts), `mapa.js` (México/mundo + agua).

## 8. Notas técnicas para las próximas sesiones

1. **Niveles generados, no escritos a mano.** 22 600 niveles requieren un generador con semilla (`semilla = número de nivel`). Cada nivel debe tener **solución comprobada**: se construye al revés (se coloca cada auto con su salida libre respecto a los ya puestos) o se verifica con un solucionador.
2. **Rendimiento en 50×50.** Son hasta 2 500 casillas en vista isométrica. Hacen falta: dibujar solo lo visible, cachear el suelo en un canvas aparte y pellizco/zoom fluido en celulares.
3. **Guardado «local primero».** Guardar en `localStorage` y sincronizar con `compartido/progreso.js`. Como los niveles se abren en orden, basta guardar **«nivel más alto completado»** (no una lista de 22 600 booleanos). Las monedas se gastan, así que no se pueden fusionar con `unirMaximos`: hace falta una regla propia (por ejemplo, ganar la partida con `t` más reciente con `unirRecientes`).
4. **Registro del juego.** Cuando esté listo: quitar `estacionamiento` de `EN_DESARROLLO` en `juegos.js`, anotar sus archivos en `ARCHIVOS` de `sw.js` y subir `VERSION`.
5. **Puntos al perfil.** Usar `encolarPuntos("estacionamiento", n)` de `compartido/cola-puntos.js` (tope 1 000 por envío).

## 9. Orden de trabajo sugerido

1. Fondo de madera y botones estándar (hecho en el HTML).
2. Generador de niveles con tabla de tamaños (México, luego países) y solución comprobada.
3. Monedas y boosts.
4. Mapa de México con agua.
5. Guardado y sincronización.
6. Mapa mundial y desbloqueo tras el nivel 3 200.
7. Optimización para 50×50.

## 10. Qué hay que cambiar en el código actual (verificado)

1. **`N = 25` está fijo en muchos sitios.** Hay que volverlo una variable por nivel (`N` = tamaño del nivel) en: `generar`, `cargarNivel`, `caminoLibre`, `planear` (usa los números 26 / 52 / 78 / 104 y 25.5 para la vía y las esquinas: deben ser `N+1`, `2(N+1)`, `3(N+1)`, `4(N+1)` y `N+0.5`), `escalaAjustada` (usa 54 = 2N+4), `ajustarCamara`, `dibujarSuelo` (rectángulos, flechas de la vía, esquinas de SALIDA) y el cálculo de casillas al tocar (`soltar`).
2. **`NIVELES` de 5 entradas → función `configNivel(n)`** que devuelva `{ tam, seed, obj, p3, K, premio }` a partir del número de nivel (22 600), con las tablas de las secciones 3 y 4.
3. **Autos objetivo y esfuerzo del generador.** Hoy 25×25 usa 40–150 autos y `intento < 4000`. Para 50×50 hay que escalar el objetivo con el área (N²) y subir el tope de intentos.
4. **Rendimiento.** `dibujar()` filtra y ordena todos los autos en cada cuadro y `viaOcupada` recorre el tiempo en pasos de 0.04 s contra todos los autos en salida. Con 50×50 conviene cachear el suelo y revisar estas dos funciones.
5. **Selector de nivel `hudNiveles()`** (5 botones) se reemplaza por el mapa; `$("niveles")` desaparece.
6. **Progreso.** Hoy `prog = { max, hecho }`, guardado en `estacionamiento-progreso` y fusionado con `unirMaximos`: sirve tal cual para «nivel más alto». Las monedas y boosts necesitan otra regla de fusión (se gastan).
7. **Puntos.** Hoy `victoria()` da `100 × nivel` puntos la primera vez. En el nivel 22 600 serían 2 260 000 en un solo premio (la cola los parte de 1 000 en 1 000). Decidir si se cambian por la fórmula de monedas o se limitan.
8. **Fondo.** Ya cambiado: `dibujar()` usa `clearRect` en lugar de pintar `#1a1d26`.
