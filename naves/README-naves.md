# Naves (`naves/`)

Juego de naves: los enemigos bajan **en manada y en oleadas**; la nave dispara sola y tú la mueves de lado a lado (arrastrar el dedo, ← → o A D). id de puntos: `naves`. Tipo **A) por niveles** del estándar (mapa de México con agua) + **Taller** de armas.

## Archivos
| Archivo | Qué es |
|---|---|
| `logica-naves.js` | Simulación **determinista** (sin DOM, sin azar): campo 360×640, 60 pasos/s. Tablas `ARMAS` (50 tiers), `TIPOS` (5 comportamientos) y fórmulas de enemigos (`hpBase`, `velBase`). `crearEstado`, `clonar` y `paso` |
| `niveles-naves.js` | Generador con semilla: el nivel *n* es igual para todos. 320 niveles (32 estados × 10). `tierDe`, `monedasNivel`, `puntosNivel`. `FACIL` lo reescribe el verificador |
| `ia-naves.js` | **Bots** con backtracking (`verificar(niv)`). Corre en navegador y en Node |
| `verificar-naves.mjs` | Herramienta de desarrollo (no va a `sw.js`): pasa los bots por los niveles y reescribe `FACIL` |
| `juego-naves.js` | Pantalla: dibujo, entrada, Taller, mapa estándar, progreso |
| `index-naves.html`, `package.json` | Página; `package.json` (`{"type":"module"}`) solo sirve para correr el verificador en Node |

## Dificultad y mejoras «equiparadas» (50 tiers)
- **Enemigos:** tier 1..50. Vida base `4 × 1.13^(tier−1)`, velocidad `+1.2 %` por tier. 10 familias × 5 marcas (Larvas I…V, Avispas…). Tipos nuevos según el tier: Zángano (1), Zigzag (2), Rápido (4), Blindado (6), Tirador (9, dispara).
- **Armas:** tier 1..50, daño por segundo `6 × 1.13^(tier−1)`: **crece igual que la vida enemiga**, así tier de arma = tier de enemigo está parejo. Más tier = más cadencia, más balas en abanico (1→7), perforación (0→4) y daño. Costo `40 × 1.2^(k−2)` monedas.
- **Niveles:** el nivel *n* usa el tier `1 + (n−1)·49/319`. Cada nivel reparte un «presupuesto» de vida enemiga (`dps del arma de su tier × duración × ratio`) en 6–14 oleadas con formaciones (fila, V, columna, diagonal, enjambre).
- **Quien va con un arma de menos tier lo nota:** el juego avisa en el Taller, al iniciar y al perder.

## Bots (backtracking)
`verificar(niv)` hace una búsqueda en profundidad: cada 0.2 s elige entre 5 movimientos, simula cada uno sobre una copia del estado, descarta los que pierden, prueba primero el más prometedor y **retrocede** si más adelante no hay salida. Éxito = terminar con **≥3 vidas y ≤5 fugas** (más estricto que sobrevivir, para dejar margen a una persona). Estados repetidos no se re-exploran y hay tope de 150 000 nodos.

```
node naves/verificar-naves.mjs            # los 320 niveles; reescribe FACIL en niveles-naves.js (~3 min)
node naves/verificar-naves.mjs 1 40       # solo un rango (no reescribe)
node naves/verificar-naves.mjs --solo-base
```
Si un nivel no pasa, el verificador le baja un 10 % los enemigos hasta 10 veces y lo anota en `FACIL`. **Cualquier cambio a `logica-naves.js` o al generador obliga a volver a correrlo.**

### Calibración (`ESCALA`, 1.5)
Con `ESCALA = 1` todo era demasiado fácil (con el arma 4 tiers abajo aún pasaba casi todo). Pruebas con una muestra de 27 niveles (arma justa / jugada sin daño / arma −2 tiers / arma −4 tiers): 1.5 → 27 / 18 / 17 / 9; 2 → 24 / 15 / 11 / 6; 2.5 → 19 / 9 / 7 / 3. Se dejó **1.5**: todo es pasable con el arma de su tier y comprar mejoras se nota.
> Ojo: el bot es MEJOR que una persona (ve el futuro de la simulación). «Pasable por el bot» = «existe un camino», no «fácil». La dificultad real se afina jugando.

## Progreso
`localStorage` `naves_progreso_v1` = `{ max, hecho, arma, ganadas, gastadas, t }`, sincronizado con `compartido/progreso.js`. Monedas = `ganadas − gastadas`. Como cada dato solo sube, la fusión con la nube toma el **máximo de cada uno** (no hace falta una regla especial de cartera). Primera vez que pasas un nivel: monedas completas + puntos al perfil (`encolarPuntos`); repetirlo da la cuarta parte de monedas y 0 puntos.

## Pendiente
- **Jefes** (previstos, fuera de esta entrega). Ganchos: un tipo en `TIPOS` con vida enorme y su aparición en `niveles-naves.js` (el nivel 10 de cada estado).
- Mundo (194 países): `NIVELES` hoy es solo México. Para ampliar: subir `NIVELES` y revisar `tierDe`.
- Juego libre / infinito (estándar): no hecho.
- Sonido, imagen de tarjeta (`imagenes/naves.webp`), prueba en celular real.
- Equilibrar con jugadores reales (ver nota de los bots).
