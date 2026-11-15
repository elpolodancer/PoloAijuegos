# Informe del bot · Granja feliz · niveles 1–10 · OSO = 3 TOQUES (lo que dicen el README y la nota de la sesión 3)

Reglas vigentes leídas de `datos-granjafeliz.js`: vida de animales 20 s (hambre a los 12 s, comen 5 s, 3 usos por pasto) · oso: **3 toques** para enjaularlo · gallina 20 s por huevo · almacén base 100 de espacio · camión base 60 de peso, viaje 20 s · edificios 25 s por ciclo, lote 1.

Perfiles: novato (1.2 toques/s, reacción 1 s, 10% de toques perdidos) · normal (2 toques/s, reacción 0.5 s, 4% de toques perdidos) · experto (3.5 toques/s, reacción 0.25 s, 1% de toques perdidos) · agresivo (3.5 toques/s, reacción 0.25 s, 1% de toques perdidos). 8 partidas por nivel y perfil, tope 900 s.

## Resumen por nivel

_Cota por ciclos = lo mínimo que tardan los edificios en fabricar lo que piden las metas, sin mejorarlos (lote 1, 25 s por ciclo). Si es mayor que el oro, el oro solo se logra mejorando edificios a tiempo. «Toques sin usar» = parte de la capacidad de toques del jugador que no hizo falta: si es alta, tocar más rápido no acorta el nivel._

| Nivel | Oro / Plata del juego | Cota por ciclos | novato: gana · mediana | normal: gana · mediana | experto: gana · mediana | agresivo: gana · mediana | Medallas del normal (3★/2★/1★) | Toques sin usar | Veredicto |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 60 / 120 | — | 100% · 0:37 | 100% · 0:36 | 100% · 0:36 | 100% · 0:33 | 100% / 0% / 0% | 89% | ⏳ lo mandan los ciclos y el dinero, no los toques (89% sin usar) |
| 2 | 120 / 180 | — | 100% · 1:03 | 100% · 1:08 | 100% · 1:01 | 100% · 1:01 | 100% / 0% / 0% | 76% | 🐇 el oro sobra; ⏳ lo mandan los ciclos y el dinero, no los toques (76% sin usar) |
| 3 | 180 / 240 | 100 s | 100% · 2:24 | 100% · 2:20 | 100% · 2:18 | 100% · 2:18 | 100% / 0% / 0% | 77% | ⏳ lo mandan los ciclos y el dinero, no los toques (77% sin usar) |
| 4 | 210 / 270 | 250 s | 100% · 4:34 | 100% · 4:29 | 100% · 4:27 | 100% · 4:28 | 0% / 75% / 25% | 79% | oro difícil para el normal; ⛔ ningún perfil llega al oro (el mejor: 4:27); ⏳ lo mandan los ciclos y el dinero, no los toques (79% sin usar); 🔧 el oro no cabe en los ciclos de los edificios |
| 5 | 150 / 240 | 100 s | 100% · 3:29 | 100% · 3:15 | 100% · 3:11 | 100% · 3:11 | 0% / 100% / 0% | 70% | oro difícil para el normal; ⛔ ningún perfil llega al oro (el mejor: 3:11); ⏳ lo mandan los ciclos y el dinero, no los toques (70% sin usar) |
| 6 | 270 / 330 | 375 s | 100% · 9:22 | 100% · 7:48 | 100% · 7:36 | 88% · 7:32 | 0% / 0% / 100% | 65% | 🐢 el normal tarda más que la plata; ⛔ ningún perfil llega al oro (el mejor: 7:32); ⏳ lo mandan los ciclos y el dinero, no los toques (65% sin usar); 🔧 ni la plata cabe en los ciclos de los edificios; 🐻 los osos se comen animales |
| 7 | 240 / 340 | 250 s | 88% · 5:54 | 100% · 5:26 | 100% · 5:57 | 100% · 6:39 | 0% / 75% / 25% | 71% | oro difícil para el normal; ⛔ ningún perfil llega al oro (el mejor: 5:26); ⏳ lo mandan los ciclos y el dinero, no los toques (71% sin usar); 🔧 el oro no cabe en los ciclos de los edificios |
| 8 | 170 / 240 | 75 s | 100% · 4:15 | 100% · 3:13 | 100% · 3:05 | 100% · 3:05 | 0% / 88% / 13% | 66% | oro difícil para el normal; ⛔ ningún perfil llega al oro (el mejor: 3:05); ⏳ lo mandan los ciclos y el dinero, no los toques (66% sin usar) |
| 9 | 210 / 300 | — | 100% · 4:27 | 100% · 4:51 | 100% · 4:48 | 100% · 5:23 | 0% / 75% / 25% | 68% | oro difícil para el normal; ⛔ ningún perfil llega al oro (el mejor: 4:48); ⏳ lo mandan los ciclos y el dinero, no los toques (68% sin usar); 🐻 los osos se comen animales |
| 10 | 210 / 270 | 125 s | 100% · 3:38 | 100% · 3:26 | 100% · 3:22 | 100% · 3:22 | 63% / 38% / 0% | 59% | ⏳ lo mandan los ciclos y el dinero, no los toques (59% sin usar); 🍂 mueren animales de hambre |

## Qué muerde en cada nivel (promedio por partida del perfil «normal»)

| Nivel | 🍂 muertos de hambre | 🐻 comidos por oso | 🥚 productos caducados | 🔒 jaulas escapadas | «Almacén lleno» | toques sin efecto |
|---|---|---|---|---|---|---|
| 1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 3 | 0.0 | 0.1 | 0.0 | 0.0 | 0.0 | 0.0 |
| 4 | 0.1 | 0.1 | 0.1 | 0.0 | 0.0 | 0.0 |
| 5 | 0.3 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 |
| 6 | 0.8 | 1.1 | 3.1 | 3.9 | 0.0 | 0.0 |
| 7 | 0.5 | 0.6 | 2.4 | 1.0 | 0.0 | 0.0 |
| 8 | 0.0 | 0.5 | 3.8 | 1.0 | 0.4 | 0.4 |
| 9 | 0.1 | 1.0 | 0.0 | 0.5 | 0.0 | 0.0 |
| 10 | 1.3 | 0.9 | 1.1 | 0.8 | 0.0 | 0.0 |

## Por qué se pierde (si pasa)

- Nivel 6 · agresivo: 1 de 8 — no termina en 900 s: espiral (compra animales y los pierde, o el dinero no alcanza para avanzar) sin llegar a la derrota
- Nivel 7 · novato: 1 de 8 — no termina en 900 s: espiral (compra animales y los pierde, o el dinero no alcanza para avanzar) sin llegar a la derrota

## Curva de dificultad (mediana del perfil «normal»)

N 1 ███                                      0:36   (oro 1:00)
N 2 ██████                                   1:08   (oro 2:00)
N 3 ████████████                             2:20   (oro 3:00)
N 4 ███████████████████████                  4:29   (oro 3:30)
N 5 █████████████████                        3:15   (oro 2:30)
N 6 ████████████████████████████████████████ 7:48   (oro 4:30)
N 7 ████████████████████████████             5:26   (oro 4:00)
N 8 ████████████████                         3:13   (oro 2:50)
N 9 █████████████████████████                4:51   (oro 3:30)
N10 ██████████████████                       3:26   (oro 3:30)

Bajan de golpe respecto al nivel anterior: N5 (más corto que N4), N7 (más corto que N6), N8 (más corto que N7), N10 (más corto que N9). Si no es intencional, la curva no sube poco a poco.

## Tiempos sugeridos (solo propuesta; no cambia ningún archivo)

Misma idea que `tiempos-granjafeliz.js`: oro = 1.1 × la mediana del perfil «normal»; plata = oro + margen (35 %, entre 60 y 120 s), y nunca menos que el percentil 90 del novato. Solo vale si el nivel se juega con los toques de oso que quieras de verdad. Comparado con lo que hay hoy en `NIVELES`:

| Nivel | oroSeg hoy → sugerido | plataSeg hoy → sugerida | Cota por ciclos |
|---|---|---|---|
| 1 | 60 → 40 | 120 → 100 | — |
| 2 | 120 → 75 | 180 → 135 | — |
| 3 | 180 → 155 | 240 → 215 | 100 |
| 4 | 210 → 295 | 270 → 400 | 250 |
| 5 | 150 → 215 | 240 → 290 | 100 |
| 6 | 270 → 515 | 330 → 890 | 375 |
| 7 | 240 → 360 | 340 → 480 | 250 |
| 8 | 170 → 210 | 240 → 325 | 75 |
| 9 | 210 → 320 | 300 → 430 | — |
| 10 | 210 → 225 | 270 → 390 | 125 |

_Generado con 320 partidas simuladas en 4 s._
