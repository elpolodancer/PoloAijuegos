# Spider (id `spider`, carpeta `spider`)

Solitario Spider de 104 cartas, 10 columnas, 5 repartos de 10 y 8 series K→A. **Inicio con mapa** (estándar de `ESTANDARES-juegos.md`, sección 13, igual que Deslizante: pantalla de inicio una sola vez → mapa de un país como menú principal), Modo libre de 5 dificultades × 1 a 4 palos y **campaña de 3 900 niveles** (195 países × 20) con monedas, boosts, **récord de tiempo y 3 estrellas por nivel**.

> **Estado (24 nov 2026).** Spider pasó al **mapa solo de países** (`crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4 })`) y a la **pantalla de inicio estándar** (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes). El plan, `estrellas-spider.js` y `niveles-spider.js` ya trabajan con **3 900** niveles (antes 22 600). `niveles-spider.js` trae **2 399 de 3 900 creados**: los 2 399 de **1 palo** (completos: el avance de 1 palo alcanzaba, 2 857 repartos para 2 394 necesarios). **Faltan los de 2, 3 y 4 palos: 1 280 + 163 + 58 = 1 501 niveles** (salen con 🚧). Las pruebas (`prueba-plan`, `prueba-economia`, `prueba-estrellas`) pasan y `verificar-campana-spider.mjs` resuelve la muestra. Probado en Chromium sin pantalla (celular vertical 390×780, horizontal 780×360 y PC 1280×720: inicio → mapa → nivel → «¿Salir?» → mapa → Modo libre → pausa → Ajustes, sin errores de JavaScript); **NO** con el dedo en un celular real. Mientras falten niveles, el juego se queda en `EN_DESARROLLO`.
>
> Lo marcado «⚠️ por confirmar» es una propuesta que falta que Polo apruebe.

## 1. Dificultades

Las 5 dificultades existen en el Modo libre y en la campaña. El reparto depende solo de `(palos, semilla)`; la dificultad dice qué tan complicado es el reparto (nodos del bot, `banco-spider.js`) y qué ayudas hay.

| # | Nombre | Color | Ayudas (ver sección 3) |
|---|---|---|---|
| 1 | 🟢 Fácil | `b-verde` | retroceder y pistas **gratis e ilimitados** |
| 2 | 🔵 Normal (el «medio») | `b-azul` | retroceder y pistas **gratis e ilimitados** |
| 3 | 🟣 Difícil | `b-morado` | retroceder y pistas son **boosts de pago, con tope por nivel** |
| 4 | 🟠 Experto | `b-oro` | igual, con topes más bajos |
| 5 | 🔴 Maestro | `b-rojo` | **sin retroceder** (⚠️ por confirmar); pistas de pago con tope muy bajo |

## 2. Campaña: 3 900 niveles

- **195 países × 20 niveles** (México primero, China último; orden fijo en `PAISES_MUNDO` de `compartido/etapas-mapa.js`). Mapa de un solo país (`unPais`): se ve el país donde va el jugador, 🗺️ Mapa = el mundo con los países abiertos, y cada país muestra sus 20 niveles en 4 columnas × 5 filas. Los niveles sin reparto salen «🚧 Los niveles todavía no están creados».
- **Cambio del 24 nov 2026:** antes eran 22 600 (32 estados + 194 países × 100). Se cambió el total en `plan-niveles-spider.js` (`TOTAL = 3900`) y `estrellas-spider.js` (`MAX_NIVEL = 3900`). **El progreso guardado con la numeración vieja no sirve** (los niveles 6 en adelante cambiaron de dificultad y palos): en pruebas, ⚙️ Ajustes → «Borrar todo el historial y reiniciar».
- **El plan** (`plan-niveles-spider.js`, siempre el mismo, con semillas fijas) dice qué dificultad y cuántos palos lleva cada nivel. El tramo del estándar de dificultad sigue siendo de **100 niveles** (hay 39 tramos): fáciles 50 % → 25 %, normales 40 %, «difíciles» 10 % → 35 %, revueltos. La banda «difícil» se parte Maestro 5 % → 15 %, Experto 25 % → 35 % y Difícil el resto (promedio 60 / 30 / 10; ⚠️ por confirmar). Los niveles 1 a 5 son los de siempre (1 palo, Fácil).
- **Palos por dificultad** (⚠️ por confirmar; cada proporción sube poco a poco de principio a fin del mapa): Fácil 1 palo · Normal 1 y 2 (2 palos: 25 % → 55 %) · Difícil 2 · Experto 2 y 3 (3 palos: 20 % → 60 %) · Maestro 3 y 4 (4 palos: 25 % → 75 %).

| Combinación | Niveles |
|---|---|
| 🟢 Fácil · 1 palo | 1 463 |
| 🔵 Normal · 1 palo | 936 |
| 🔵 Normal · 2 palos | 624 |
| 🟣 Difícil · 2 palos | 509 |
| 🟠 Experto · 2 palos | 147 |
| 🟠 Experto · 3 palos | 124 |
| 🔴 Maestro · 3 palos | 39 |
| 🔴 Maestro · 4 palos | 58 |
| **Total** | **3 900** (por palos: 2 399 / 1 280 / 163 / 58) |

Por dificultad: Fácil 1 463 · Normal 1 560 · Difícil 509 · Experto 271 · Maestro 97.

- **Dentro de cada combinación, cada vez más difícil:** el generador ordena los repartos por nodos del bot (más nodos = más difícil) y los pone de principio a fin del mapa; entre combinaciones de los mismos palos, la dificultad más baja se queda con los repartos más fáciles.
- **Riesgo conocido:** los repartos de 3 y 4 palos casi no los resuelve el bot (sección 10). Son 221 niveles (163 + 58) y los 58 de 4 palos son todos Maestro: hay que darle presupuesto grande al bot (o aprovechar los 14 repartos de 4 palos y 30 de 3 que ya trae el banco del Modo libre, `repartos-spider.js`, si se acepta repetirlos).
- No se cambia el plan ni una semilla después de publicar. Mientras `spider` esté en `EN_DESARROLLO` se puede regenerar todo.
- Los niveles dan monedas y **1 punto del portal** (`encolarNivel("spider")`, estándar 12) **solo la primera vez que se pasan**. El Modo libre no da monedas, estrellas ni puntos.

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

Con las recompensas y precios de arriba y el plan real de la sección 2, un jugador que pase **los 3 900 niveles**:

| Concepto | Monedas |
|---|---|
| Fáciles (1 463 × 10) | 14 630 |
| Normales (1 560 × 20) | 31 200 |
| Difíciles (509 × 40) | 20 360 |
| Expertos (271 × 70) | 18 970 |
| Maestros (97 × 120) | 11 640 |
| **Total ganado** | **96 800** |

- **Gasto previsto** (Difícil: 1 pista + 3 retrocesos = 50 · Experto: 2 pistas + 5 retrocesos = 90 · Maestro: 3 pistas = 60): 55 660 (57.5 %). Sobran ≈ 41 000 para otros boosts o una tienda futura.
- Gastando **todo el tope** en cada nivel difícil serían 138 200: más de lo que gana. Elegir cuándo gastar importa y no se puede abusar.

| Tramo | Gana | Gasto previsto | Gasto máximo (topes) |
|---|---|---|---|
| 1 (niveles 1–100) | 1 870 | 630 | 1 600 |
| 20 (mitad del mapa) | 2 430 | 1 400 | 3 520 |
| 39 (últimos 100) | 3 210 | 2 280 | 5 240 |

- Sumando tramo por tramo, **el saldo acumulado nunca baja de 1 240 monedas** si gasta lo previsto (el mínimo está en el primer tramo). Las proporciones por tramo son las mismas que con 22 600 niveles: solo hay menos tramos.
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
- **Guardado:** `prog.rec = { "<nivel>": tiempo × 8 + máscara }` (máscara 1, 2, 4). Al unir con la cuenta: **menor tiempo** de cada nivel y **todas las estrellas** de cualquiera de las copias. Con los 3 900 niveles pasados ocupa ≈ 50 KB (cabe de sobra en `localStorage` y bajo el límite de un documento de Firestore).
- Las estrellas no dan monedas. El Modo libre no tiene estrellas; guarda su `mejor` tiempo por palos-dificultad como antes.

## 7. Inicio con mapa: revisión contra la sección 13 de los estándares (24 nov 2026)

| Punto (13.11) | Estado |
|---|---|
| 1. Madera clara/oscura | ✔ sin cambios (el botón 🌙/☀️ sigue abajo a la izquierda) |
| 2. Navegación 13.3: 🎮 y ☰ cuadrados, solo icono; ☰ oculto en el inicio y en la vista principal del mapa; `hud-der` en columna | ✔ (☰: «Atrás» en las vistas internas del mapa, «Volver al menú principal» en las opciones del Modo libre y en un nivel, «Pausa» en una partida libre) |
| 3. Pantalla de inicio 13.2: ♾️ Modo libre · ▶ Jugar (el doble de alto) · 🗺️ Mapa · ⚙️ Ajustes, una sola vez | ✔ (reemplaza al velo de tres botones; se quitó del HTML) |
| 4. Mapa 13.4: `crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4 })`, «Jugar/Continuar» dentro del país, ♾️ Modo libre como botón extra, Info | ✔ |
| 5. Dentro del nivel 13.6: chip de monedas + 🗺️ + botón verde con el nombre («Nivel 3 · México»), tres cuadros (Movimientos · Tiempo · Mejor tiempo), «¿Salir?» con Esc | ✔ Se quitó el chip «Series» de arriba (queda «Series 0/8» junto a los botones de abajo) |
| 6. Modo libre 13.7: Dificultad (5 botones solo con emoji + nombre debajo), Palos, nota, récord, ▶ Jugar | ✔ salvo «💾 Partidas guardadas» (Spider no guarda partidas del Modo libre). Los emojis de dificultad son los círculos 🟢🔵🟣🟠🔴 de Spider (no las caritas de Deslizante) para coincidir con el color de los niveles del mapa |
| 7. Ajustes 13.8: ℹ️ Cómo se juega · 💾 Copia de seguridad (`almacen.js`) · 🗑️ Borrar historial (pruebas) · Cerrar | ✔ **`MOSTRAR_BORRAR_HISTORIAL = true`: ponerlo en `false` antes de pasar Spider a «Juegos»** |
| 8. Registro: `sw.js` ya trae contornos, posiciones y banderas | ✔ Falta subir `VERSION` y anotar `economia`/`estrellas` ya listados; la fila del README principal debe decir 3 900 niveles |
| 9. Celebración de estrellas (13.5) | ❌ No portada: Spider conserva su ventana «¡Ganaste!» sobre el tablero (con las 3 estrellas y el récord) y el botón «🗺️ Mapa» abre el país del nivel para ver subir el agua. Portar la celebración de Deslizante requiere pasar `.est`/`.cel-*` a `inmersivo.css` |
| 10. Probado en celular real | ❌ Pendiente |

Cambios de comportamiento a tener en cuenta:
- **Se quitó «🔄 Reiniciar nivel» de la pausa** (el estándar 13.6 solo tiene «Seguir jugando» y «Salir al mapa»): para reiniciar se sale al mapa y se vuelve a entrar, o se usa «Repetir nivel» al ganar. Los topes de los boosts se reinician igual.
- El chip de sesión ahora es tocable cuando no hay sesión («👤 Iniciar sesión»); antes era un botón aparte.
- **Puntos del portal:** Spider ya llama `encolarNivel("spider")` al pasar un nivel por primera vez (estándar 12). Mientras esté en `EN_DESARROLLO` no suma al total de nadie.
- El nombre del nivel es el del país («Nivel 3 · México», 1 a 20), no el número global.

## 8. Archivos
- `logica-spider.js` lógica pura (cartas, reparto con semilla, jugadas, series, repartir). Sin DOM.
- `ia-spider.js` **bot de backtracking**: `resolver`, `comprobar`, `verificar(palos, semilla)`, `generarVerificada`, `AJUSTES`.
- `repartos-spider.js` + `banco-spider.js` **banco del Modo libre** (`BANCO[palos][dif]`: 200 / 150 / 30 / 14 repartos comprobados) y su selector.
- `economia-spider.js` economía (recompensas, ayudas, cartera por dispositivo, `unirProgresoSpider`). Prueba: `node spider/prueba-economia-spider.mjs`.
- `estrellas-spider.js` récord y estrellas (sección 6). Prueba: `node spider/prueba-estrellas-spider.mjs`.
- `plan-niveles-spider.js` plan de los 3 900 niveles. Prueba: `node spider/prueba-plan-spider.mjs`.
- `generar-niveles-spider.mjs`, `reserva-spider-<palos>.json`, `verificar-campana-spider.mjs` generador, su avance y el comprobador (sección 9). Solo consola.
- `niveles-spider.js` **GENERADO** por `ensamblar`: un número por nivel (`semilla × 20 + (palos − 1) × 5 + (dificultad − 1)`, 0 = no creado) y `nivelDe(n)`, `creados()`, `TOTAL`. ≈ 25 KB con los 3 900 (hoy 2 399 creados). No editar a mano.
- `verificar-spider.mjs` consola: `node spider/verificar-spider.mjs [cuantas] [semilla] [maxMs] [maxNodos]`.
- `juego-spider.js`, `index-spider.html` menú, partida, mapa, ayudas de pago, estrellas y fin de nivel.

## 9. Generar los 3 900 niveles

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

- Hacen falta **2 394** repartos de 1 palo (los 5 niveles de siempre no cuentan; **ya están**), **1 280** de 2, **163** de 3 y **58** de 4. Cada uno se acepta solo si el bot lo resuelve y la solución se repite jugada por jugada con las reglas del juego (`comprobar`). Semillas desde 1000 (2000 en 4 palos), lejos del banco del Modo libre.
- Tiempos medidos (un núcleo): 1 palo ≈ 0.1 s por reparto (≈ 5 min en total); 2 palos ≈ 1.3 s por reparto resuelto (≈ 30 min, estimado); 3 palos ≈ 6 s (≈ 16 min, estimado); en 4 palos el bot no resolvió ninguno de 12 con 3 s, así que **no hay estimación**: hay que medirlo con presupuestos grandes o mejorar el bot.
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

Pendiente aparte: bot en Web Worker, arrastrar cartas, sonidos, imagen de tarjeta (`imagenes/spider.webp`, y anotarla en `ARCHIVOS` de `sw.js`), probar en celular, y **puntos del portal**: hoy Spider no suma nada al perfil (solo da monedas). Por el estándar (`ESTANDARES-juegos.md`, sección 12) debe dar **1 punto por nivel pasado la primera vez**, con `encolarNivel("spider")` de `compartido/cola-puntos.js`, nunca con `encolarPuntos` y otros valores. Mientras esté en `EN_DESARROLLO` ese punto no suma al total de nadie; hay que agregarlo antes de pasarlo a «Juegos».

## 12. Registro en el portal
`juegos.js`: la línea de `spider` en `JUEGOS` y `"spider"` en `EN_DESARROLLO` (al terminar, quitar el id de `EN_DESARROLLO` y actualizar la descripción). `sw.js`:
`spider: ["juego.js", "logica.js", "ia.js", "niveles.js", "economia-spider.js", "estrellas-spider.js", "banco-spider.js", "repartos-spider.js"]` (los cuatro últimos con nombre completo; generador, plan, pruebas, reservas y `verificar-*.mjs` son solo de consola y no se guardan sin internet), `VERSION` 189 o la que siga.

README principal, fila: `spider/index-spider.html`, `juego-spider.js`, `logica-spider.js`, `ia-spider.js`, `banco-spider.js`, `repartos-spider.js`, `economia-spider.js`, `estrellas-spider.js`, `plan-niveles-spider.js`, `niveles-spider.js`, `generar-niveles-spider.mjs`, `verificar-campana-spider.mjs`, `verificar-spider.mjs`, pruebas `prueba-*-spider.mjs`, `reserva-spider-*.json`, `README-spider.md` — Solitario Spider (id de puntos `spider`); lógica pura, bot de backtracking, 3 900 niveles (plan + generador), economía de monedas con cartera por dispositivo, récord y estrellas por nivel, y progreso en `localStorage` (`spider_progreso_v1`: `{ cartera, ganadas, mejor, niv, rec, opc, t }`) sincronizado con `conectar()`.
