# Spider (id `spider`, carpeta `spider`)

Solitario Spider de 104 cartas, 10 columnas, 5 repartos de 10 y 8 series K→A. Menú principal estándar (**♾️ Modo libre · ▶ Continuar · 📋 Niveles · ℹ️ Info**), Modo libre de 5 dificultades × 1 a 4 palos y **campaña de 22 600 niveles** (100 por estado de México y por país) con monedas, boosts, **récord de tiempo y 3 estrellas por nivel**.

> **Estado (19 nov 2026).** En el código: economía, ayudas de pago, fin de nivel sobre el tablero, pausa estándar, **récord de tiempo y estrellas por nivel**, el **plan completo de los 22 600 niveles** y el **generador** de repartos. Los niveles con reparto comprobado se generan por cantidad de palos (sección 9). Lo marcado «⚠️ por confirmar» es una propuesta que falta que Polo apruebe.

## 1. Dificultades

Las 5 dificultades existen en el Modo libre y en la campaña. El reparto depende solo de `(palos, semilla)`; la dificultad dice qué tan complicado es el reparto (nodos del bot, `banco-spider.js`) y qué ayudas hay.

| # | Nombre | Color | Ayudas (ver sección 3) |
|---|---|---|---|
| 1 | 🟢 Fácil | `b-verde` | retroceder y pistas **gratis e ilimitados** |
| 2 | 🔵 Normal (el «medio») | `b-azul` | retroceder y pistas **gratis e ilimitados** |
| 3 | 🟣 Difícil | `b-morado` | retroceder y pistas son **boosts de pago, con tope por nivel** |
| 4 | 🟠 Experto | `b-oro` | igual, con topes más bajos |
| 5 | 🔴 Maestro | `b-rojo` | **sin retroceder** (⚠️ por confirmar); pistas de pago con tope muy bajo |

## 2. Campaña: 22 600 niveles

- 226 etapas (32 estados + 194 países) × 100 niveles. Mapa estándar (`crearEtapas({ porEtapa: 100 })` + `montarMapa`), ya montado en `juego-spider.js`. El mundo y el botón 🌍 solo aparecen al terminar México y los países sin desbloquear no se listan (revisado en `compartido/mapa-niveles.js`). Los niveles sin reparto salen «🚧 Los niveles todavía no están creados».
- **El plan** (`plan-niveles-spider.js`, siempre el mismo, con semillas fijas) dice qué dificultad y cuántos palos lleva cada nivel. Dificultad: el estándar de `ESTANDARES-juegos.md` sección 8 (fáciles 50 % → 25 %, normales 40 %, «difíciles» 10 % → 35 %, por tramos de 100, revueltos). La banda «difícil» se parte Maestro 5 % → 15 %, Experto 25 % → 35 % y Difícil el resto (promedio 60 / 30 / 10; ⚠️ por confirmar). Los niveles 1 a 5 son los de siempre (1 palo, Fácil).
- **Palos por dificultad** (⚠️ por confirmar; cada proporción sube poco a poco de principio a fin del mapa): Fácil 1 palo · Normal 1 y 2 (2 palos: 25 % → 55 %) · Difícil 2 · Experto 2 y 3 (3 palos: 20 % → 60 %) · Maestro 3 y 4 (4 palos: 25 % → 75 %).

| Combinación | Niveles |
|---|---|
| 🟢 Fácil · 1 palo | 8 475 |
| 🔵 Normal · 1 palo | 5 424 |
| 🔵 Normal · 2 palos | 3 616 |
| 🟣 Difícil · 2 palos | 2 952 |
| 🟠 Experto · 2 palos | 860 |
| 🟠 Experto · 3 palos | 710 |
| 🔴 Maestro · 3 palos | 228 |
| 🔴 Maestro · 4 palos | 335 |
| **Total** | **22 600** (por palos: 13 899 / 7 428 / 938 / 335) |

Por dificultad: Fácil 8 475 · Normal 9 040 · Difícil 2 952 · Experto 1 570 · Maestro 563.

- **Dentro de cada combinación, cada vez más difícil:** el generador ordena los repartos por nodos del bot (más nodos = más difícil) y los pone de principio a fin del mapa; entre combinaciones de los mismos palos, la dificultad más baja se queda con los repartos más fáciles.
- **Riesgo conocido:** los repartos de 3 y 4 palos casi no los resuelve el bot (sección 10). Por eso la campaña es casi toda de 1 y 2 palos, y 3 y 4 palos solo aparecen en Experto y Maestro (1 273 niveles).
- No se cambia el plan ni una semilla después de publicar. Mientras `spider` esté en `EN_DESARROLLO` se puede regenerar todo.
- Los niveles dan monedas **solo la primera vez que se pasan**. El Modo libre no da monedas, estrellas ni puntos.

## 3. Reglas de retroceder y pistas

| Dificultad | ↶ Retroceder | 💡 Pista |
|---|---|---|
| Fácil | gratis, ilimitado | gratis, ilimitada (sigue la pista automática a los 15 s sin mover) |
| Normal | gratis, ilimitado | gratis, ilimitada (igual) |
| Difícil | boost: **10** monedas por movimiento, hasta **10** por nivel | boost: **20** monedas, hasta **5** por nivel |
| Experto | boost: **10** monedas, hasta **6** por nivel | boost: **20** monedas, hasta **3** por nivel |
| Maestro | no hay | boost: **20** monedas, hasta **2** por nivel |

- «Completamente disponible» solo en Fácil y Normal. En las otras tres, la pista automática de 15 s se apaga y los botones ↶ y 💡 muestran su precio en la esquina (`.b-info`) y cuántos quedan junto al nombre. Si no alcanzan las monedas o se llegó al tope, el botón queda desactivado.
- Los topes son **por intento de nivel** y se reinician al reiniciar el nivel (las monedas gastadas no vuelven; la pausa lo avisa). La pista solo cobra si de verdad hubo una pista que mostrar.
- **Modo libre:** sin monedas. ↶ gratis salvo en Maestro (sin retroceder) y 💡 gratis, con pista automática.
- El saldo (`chip-monedas-juego`) solo se ve en partida cuando hay algo que comprar; en el resto, ese lugar lo ocupa el chip de estado («Nivel N · 🏆 3:41», «✔ Con solución» o «🎲 Al azar»).
- ⚠️ Interpreta el mensaje «pistas limitadas… excepto en niveles medios y difíciles, al igual que el botón de retroceder, solo completamente disponible en fáciles y medios» como: **fáciles y medios = todo libre; difíciles hacia arriba = de pago y con tope**.

## 4. Monedas

- Chip dorado estándar (`chip chip-monedas`) arriba a la derecha en el menú y en la barra inferior durante la partida.
- **Recompensa por pasar un nivel por primera vez (más difícil = más monedas):**

| Dificultad | Monedas |
|---|---|
| Fácil | 10 |
| Normal | 20 |
| Difícil | 40 |
| Experto | 70 |
| Maestro | 120 |

- Repetir un nivel ya pasado no da monedas. Las estrellas tampoco (así la economía de la sección 5 no cambia). Opción para más adelante: bono por estrellas o +25 % si se pasa un nivel difícil sin gastar boosts.
- **Cartera por dispositivo** (`economia-spider.js`): las monedas se gastan, así que **no se unen con «el mayor»**. Cada dispositivo lleva sus contadores `{ g: ganadas, s: gastadas }`; el saldo es Σ(g − s) y al unir dos copias se toma, por dispositivo, el mayor de cada contador. Forma guardada: `{ d: { "<id del dispositivo>": { g, s } } }` (id en `localStorage`, `spider_dispositivo`, no se sincroniza). Misma regla que `gominolas/cartera-gominolas.js`.
- El progreso completo se une con `unirProgresoSpider`: cartera por dispositivo, `ganadas` y `niv` = el mayor, `mejor` = el menor tiempo de cada combinación palos-dificultad, `rec` = récords y estrellas por nivel (sección 6), `opc` = la elegida más recientemente.
- Si cambias un precio, un tope o una recompensa, actualiza las secciones 3 a 5 y corre `node spider/prueba-economia-spider.mjs`.

## 5. Cálculo de la economía

Con las recompensas y precios de arriba y el plan real de la sección 2, un jugador que pase **los 22 600 niveles**:

| Concepto | Monedas |
|---|---|
| Fáciles (8 475 × 10) | 84 750 |
| Normales (9 040 × 20) | 180 800 |
| Difíciles (2 952 × 40) | 118 080 |
| Expertos (1 570 × 70) | 109 900 |
| Maestros (563 × 120) | 67 560 |
| **Total ganado** | **561 090** |

- **Gasto previsto** (Difícil: 1 pista + 3 retrocesos = 50 · Experto: 2 pistas + 5 retrocesos = 90 · Maestro: 3 pistas = 60): 322 680 (57.5 %). Sobran ≈ 238 000 para otros boosts o una tienda futura.
- Gastando **todo el tope** en cada nivel difícil serían 801 320: más de lo que gana. Elegir cuándo gastar importa y no se puede abusar.

| Tramo | Gana | Gasto previsto | Gasto máximo (topes) |
|---|---|---|---|
| 1 (niveles 1–100) | 1 870 | 630 | 1 600 |
| 113 (mitad del mapa) | 2 430 | 1 400 | 3 520 |
| 226 (últimos 100) | 3 210 | 2 280 | 5 240 |

- Sumando tramo por tramo, **el saldo acumulado nunca baja de 1 240 monedas** si gasta lo previsto (el mínimo está en el primer tramo): el dinero de los ≈ 17 500 niveles fáciles y normales (≈ 265 000) se acumula para cuando empiezan los difíciles.
- Todo lo ganado gastado solo en pistas serían ≈ 28 000; solo en retrocesos, ≈ 56 000 (por cada uno de los 5 085 niveles difíciles: unas 5 pistas u 11 retrocesos).
- Para ajustar: cambia recompensas, precios y topes (secciones 3 y 4); las cuentas se rehacen con el plan de la sección 2.

## 6. Récord de tiempo y estrellas

Cada nivel de la campaña guarda **el mejor tiempo** del jugador y tiene **3 estrellas** que se ganan por separado (en intentos distintos si hace falta; una estrella ganada nunca se pierde):

| ★ | Cómo se gana |
|---|---|
| ★ 1 | Pasar el nivel |
| ★ 2 | Pasarlo en menos del **tiempo par** del nivel |
| ★ 3 | Un **reto que cambia de nivel en nivel** (fijo para cada nivel, igual para todos): ⚡ en el 60 % del tiempo par · ↶ sin usar Deshacer · 💡 sin pedir pista · 🧠 sin Deshacer ni Pista |

- **Tiempo par** = `PAR_BASE[palos] × FACTOR_DIF[dificultad]`: base 6, 9, 13 y 17 min para 1, 2, 3 y 4 palos; factor ×1, ×1.1, ×1.25, ×1.4 y ×1.6 de Fácil a Maestro (1 palo Fácil = 6:00; 2 palos Difícil = 11:20; 4 palos Maestro = 27:20). ⚠️ **Primera estimación, sin medir con jugadores**: se ajusta en `estrellas-spider.js` (`PAR_BASE`, `FACTOR_DIF`, `RAPIDO`) sin tocar los niveles.
- «Sin Deshacer» no sale en Maestro (no existe el botón). La pista automática de 15 s no cuenta como pista del jugador. «Pocos movimientos» no se usa: el bot gasta ≈ 330 jugadas por reparto (no es óptimo) y no sirve de referencia.
- Al empezar un nivel, un aviso muestra las metas de ★★ y ★★★. Al ganar, la ventana sobre el tablero muestra las 3 estrellas, cuáles son nuevas y el tiempo («⏱️ Primer tiempo», «🏆 ¡Nuevo récord! 3:41 (antes 4:05)» o «🏆 Tu récord»). El chip de la partida dice «Nivel N · 🏆 m:ss» cuando ya hay récord.
- En el mapa, un nivel pasado muestra sus estrellas (`★★☆`) en lugar de la dificultad; el color del botón sigue diciendo la dificultad.
- **Guardado:** `prog.rec = { "<nivel>": tiempo × 8 + máscara }` (máscara 1, 2, 4). Al unir con la cuenta: **menor tiempo** de cada nivel y **todas las estrellas** de cualquiera de las copias. Con los 22 600 niveles pasados ocupa ≈ 300 KB (cabe en `localStorage` y bajo el límite de 1 MiB de un documento de Firestore).
- Las estrellas no dan monedas. El Modo libre no tiene estrellas; guarda su `mejor` tiempo por palos-dificultad como antes.

## 7. Menú de inicio: revisión contra los estándares (sección 9)

| Punto | Estado |
|---|---|
| 1. Madera clara/oscura (`html`/`body` `inmersivo`, script del `<head>`, `fondo-madera.js`, sin fondo propio) | ✔ |
| 2. 🎮 Portal de Juegos (`b3d txt b-azuloscuro`, `href="../"`) | ✔ |
| 3. ☰ Pausa/Atrás (`b-cielo`, oculto en el menú, rótulo según pantalla, `puedeAbrir` en `false` fuera de partida) | ✔ |
| 4. Menú principal = velo de inicio (7.0 y 7.1): el nivel donde va el jugador cargado detrás de una capa negra transparente con difuminado; ♾️ Modo libre · 🗂️ Niveles · ▶ Continuar (o «Jugar») · ℹ️ Info | ✔ (21 nov) |
| 5. 👤 Iniciar sesión arriba a la derecha, último de `.hud-der`, `b3d chico txt` (40 px) | ✔ |
| 6. Modo libre: filas (`b-oro on` / `b-cielo`), nota, récord, ▶ Jugar | ✔ |
| 7. Mapa con México y mundo (`porEtapa: 100`), mundo oculto hasta terminar México | ✔ |
| 8. Pausa: Continuar · Reiniciar nivel · Niveles · Menú principal; en Modo libre «Salir a elegir tablero» | ✔ |
| 9. ⛶, zonas reservadas, sin `b-gris` en menús | ✔ |
| Fin de nivel «Siguiente nivel ▶» sobre el tablero (`.sobre-tablero`) | ✔ |

Hallazgos del 19 nov (ya corregidos): `index-spider.html` estaba desactualizado (faltaban `b-pista`, `chip-monedas-juego`, `monedas-juego`, `t-deshacer`, `p-deshacer`, `t-pista`, `p-pista`, que usa `juego-spider.js`); el texto de Info ya explica ayudas, monedas y estrellas; `sw.js` no listaba `economia-spider.js`. Sin probar: la pantalla en celular (botones ↶ 💡, chip de saldo y ventana de estrellas, en vertical y horizontal).

Cambios del 21 nov (estándar del velo de inicio, secciones 7.0 y 7.1): el menú principal ya no es una pantalla aparte; al abrir Spider (o volver con ☰ «Atrás» / «Menú principal») se ve **el tablero del nivel donde va el jugador** detrás del velo, con ♾️ Modo libre · 🗂️ Niveles · ▶ Continuar. Con sesión, si llega el progreso de la cuenta mientras el velo sigue puesto, el nivel de fondo se recarga con el de la cuenta (`alCambiar`). Mientras está el velo el juego no responde (`inert` en `#juego` + comprobación de `pantalla` en `tocar`, repartir, pista y deshacer) y se ocultan los marcadores y los botones ↶ / 💡. Si el nivel donde va el jugador todavía no está creado (hay huecos en `niveles-spider.js`), de fondo se ve el último creado antes y «Continuar» avisa «🚧 Los niveles todavía no están creados». El tablero ocupa **todo el ancho** (`#tablero` con `left: 0; right: 0`; en horizontal se sigue dejando libre la zona de 🎮 + ☰ a la izquierda) y las cartas dejan solo 3 px a cada lado para que el recuadro rojo/verde de las columnas de los extremos no se corte. `sw.js` (versión 194) suma `estrellas-spider.js`, que el juego importa y faltaba. **Pendiente de este estándar:** la barra de juego (`.barra-juego`: ♾️ Modo libre y 🗂️ Niveles) dentro de la partida y los cuadros de datos justo debajo. **Sin probar** en celular real.

## 8. Archivos
- `logica-spider.js` lógica pura (cartas, reparto con semilla, jugadas, series, repartir). Sin DOM.
- `ia-spider.js` **bot de backtracking**: `resolver`, `comprobar`, `verificar(palos, semilla)`, `generarVerificada`, `AJUSTES`.
- `repartos-spider.js` + `banco-spider.js` **banco del Modo libre** (`BANCO[palos][dif]`: 200 / 150 / 30 / 14 repartos comprobados) y su selector.
- `economia-spider.js` economía (recompensas, ayudas, cartera por dispositivo, `unirProgresoSpider`). Prueba: `node spider/prueba-economia-spider.mjs`.
- `estrellas-spider.js` récord y estrellas (sección 6). Prueba: `node spider/prueba-estrellas-spider.mjs`.
- `plan-niveles-spider.js` plan de los 22 600 niveles. Prueba: `node spider/prueba-plan-spider.mjs`.
- `generar-niveles-spider.mjs`, `reserva-spider-<palos>.json`, `verificar-campana-spider.mjs` generador, su avance y el comprobador (sección 9). Solo consola.
- `niveles-spider.js` **GENERADO** por `ensamblar`: un número por nivel (`semilla × 20 + (palos − 1) × 5 + (dificultad − 1)`, 0 = no creado) y `nivelDe(n)`, `creados()`, `TOTAL`. ≈ 150 KB. No editar a mano.
- `verificar-spider.mjs` consola: `node spider/verificar-spider.mjs [cuantas] [semilla] [maxMs] [maxNodos]`.
- `juego-spider.js`, `index-spider.html` menú, partida, mapa, ayudas de pago, estrellas y fin de nivel.

## 9. Generar los 22 600 niveles

Dos pasos con avance guardado (Ctrl+C y se sigue después; cada cantidad de palos usa su archivo y pueden correr a la vez, uno por núcleo):

```
node spider/generar-niveles-spider.mjs plan                 # cuántos repartos hacen falta y cuántos llevas
node spider/generar-niveles-spider.mjs generar 1            # repartos de 1 palo (700 ms por intento)
node spider/generar-niveles-spider.mjs generar 2            # …de 2 palos
node spider/generar-niveles-spider.mjs generar 3 3000       # …de 3 palos (más tiempo por intento)
node spider/generar-niveles-spider.mjs generar 4 20000      # …de 4 palos (presupuesto grande)
node spider/generar-niveles-spider.mjs ensamblar            # escribe niveles-spider.js con lo que haya
node spider/verificar-campana-spider.mjs 300                # plan, repartos únicos y que el bot los resuelva (muestra de 300)
```

- Hacen falta **13 894** repartos de 1 palo (los 5 niveles de siempre no cuentan), **7 428** de 2, **938** de 3 y **335** de 4. Cada uno se acepta solo si el bot lo resuelve y la solución se repite jugada por jugada con las reglas del juego (`comprobar`). Semillas desde 1000 (2000 en 4 palos), lejos del banco del Modo libre.
- Tiempos medidos (un núcleo): 1 palo ≈ 0.1 s por reparto (≈ 25 min en total); 2 palos ≈ 1.3 s por reparto resuelto (≈ 3 h, estimado); 3 palos ≈ 6 s (≈ 1.5 h, estimado); en 4 palos el bot no resolvió ninguno de 12 con 3 s, así que **no hay estimación**: hay que medirlo con presupuestos grandes o mejorar el bot.
- Un avance parcial se puede ensamblar para probar, pero **no lo publiques así**: (1) la campaña solo es jugable de corrido con todos los tipos, porque un nivel sin reparto bloquea a quien llegue hasta él; (2) `ensamblar` vuelve a ordenar TODOS los repartos por dificultad cada vez, así que al agregar más repartos cambian los repartos de niveles que ya existían. Genera todo, ensambla una sola vez y recién entonces publica.
- Estado de la generación: línea «Estado» del README principal.

## 10. El bot: qué garantiza y qué no
- Ve todas las cartas (ganable con información perfecta). Si dice «resuelto», la solución está re-comprobada: **es fiable**. Si no, dice «no se sabe», nunca «imposible».
- Medido (12 semillas por cantidad de palos, 3 s por reparto): 1 palo 12/12 (≈ 150 ms), 2 palos 9/12 (≈ 350 ms), 3 palos 4/12, 4 palos 0/12.
- En el Modo libre el bot corre un instante antes de repartir (si la casilla no tiene banco): «✔ Con solución» si halló una; si no, «🎲 Al azar».

## 11. Orden de trabajo (sección 10 de los estándares)
1. ✔ Estándares del menú y fin de nivel sobre el tablero.
2. ⚠️ Confirmar lo «por confirmar» (reparto 60/30/10, palos por dificultad, Maestro sin retroceder, recompensas, precios, topes y tiempos par).
3. ✔ Economía, ayudas con precio, récord y estrellas. Falta probar en celular.
4. ✔ Plan y generador. Generar por palos: 1 → 2 → 3 → 4.
5. Con todos los niveles: `ensamblar`, `verificar-campana-spider.mjs`, imagen de tarjeta y registro como terminado (sección 12).

Pendiente aparte: bot en Web Worker, arrastrar cartas, sonidos, imagen de tarjeta (`imagenes/spider.webp`, y anotarla en `ARCHIVOS` de `sw.js`), probar en celular, y decidir si Spider suma puntos al perfil (hoy no llama a `encolarPuntos`: solo da monedas).

## 12. Registro en el portal
`juegos.js`: la línea de `spider` en `JUEGOS` y `"spider"` en `EN_DESARROLLO` (al terminar, quitar el id de `EN_DESARROLLO` y actualizar la descripción). `sw.js`:
`spider: ["juego.js", "logica.js", "ia.js", "niveles.js", "economia-spider.js", "estrellas-spider.js", "banco-spider.js", "repartos-spider.js"]` (los cuatro últimos con nombre completo; generador, plan, pruebas, reservas y `verificar-*.mjs` son solo de consola y no se guardan sin internet), `VERSION` 189 o la que siga.

README principal, fila: `spider/index-spider.html`, `juego-spider.js`, `logica-spider.js`, `ia-spider.js`, `banco-spider.js`, `repartos-spider.js`, `economia-spider.js`, `estrellas-spider.js`, `plan-niveles-spider.js`, `niveles-spider.js`, `generar-niveles-spider.mjs`, `verificar-campana-spider.mjs`, `verificar-spider.mjs`, pruebas `prueba-*-spider.mjs`, `reserva-spider-*.json`, `README-spider.md` — Solitario Spider (id de puntos `spider`); lógica pura, bot de backtracking, 22 600 niveles (plan + generador), economía de monedas con cartera por dispositivo, récord y estrellas por nivel, y progreso en `localStorage` (`spider_progreso_v1`: `{ cartera, ganadas, mejor, niv, rec, opc, t }`) sincronizado con `conectar()`.
