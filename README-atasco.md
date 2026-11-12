# Atasco (id de puntos: `atasco`)

Estacionamiento lleno: hay que **abrir paso al carro rojo** para que salga por el borde derecho. Todos los demás carros son grises. Estado al 12 nov 2026: menú principal y **todo el sistema de niveles** (reglas, plan, bot y verificador). Falta la pantalla de la partida y el mapa.

## 1. Reglas (supuestos que se pueden cambiar ANTES de generar los niveles)
- Tablero n×n. Carros de **2 o 3 casillas**, horizontales o verticales; solo se deslizan a lo largo de su eje, cualquier distancia = **1 movimiento**.
- **Macetas** 🪴: ocupan 1 casilla, no se mueven y estorban. Nunca están en la fila de salida.
- Carro rojo: siempre de 2, horizontal, sale por el **borde derecho de su fila** (la fila varía de nivel en nivel). En esa fila solo puede haber carros verticales.
- Gana al llegar el frente del rojo a la última columna. Máximo 24 carros además del rojo.

## 2. Los 22 600 niveles fijos
226 etapas (32 estados + 194 países, `crearEtapas({ porEtapa: 100 })` de `compartido/etapas-mapa.js`) × 100 niveles.

- **Tamaños: solo de 4×4 a 10×10**, repartidos por igual **dentro de cada etapa de 100** (no por bloques de 1000): 100 = 7×14 + 2, así que cada etapa tiene 14 niveles de cada tamaño y dos tamaños con 15; esos dos **rotan** de etapa en etapa (en total: 3 229 niveles de 4×4 a 7×7 y 3 228 de 8×8 a 10×10).
- **Dificultad por etapa**, subiendo parejo (la clase «difícil» sube de 10 a 35 y la «fácil» baja de 50 a 25; la «media» es siempre 40):

| Etapa | Fáciles | Medios | Difíciles |
|---|---|---|---|
| 1.ª (nivel 1–100) | 50 | 40 | 10 |
| 113.ª (mitad) | 38 | 40 | 22 |
| 226.ª (últimos 100) | 25 | 40 | 35 |

- **Orden dentro de cada etapa:** primero los 4×4, luego 5×5… hasta 10×10; dentro de cada tamaño, de fácil a difícil. Las clases se reparten parejo entre los tamaños.
- **Cómo se mide la dificultad:** por los **movimientos mínimos** que calcula el bot (solución más corta), con umbrales por tamaño (`BANDAS` en `logica-atasco.js`):

| Tamaño | Fácil | Medio | Difícil |
|---|---|---|---|
| 4×4 | 2–3 | 4–5 | 6 o más |
| 5×5 a 8×8 | 3–5 | 6–8 | 9 o más |
| 9×9 y 10×10 | 3–5 | 6–7 | 8 o más |

- **Macetas:** 4 de cada 10 niveles las llevan, de 1 a `⌊n/3⌋` (4×4: 1 … 10×10: hasta 3). Ajustes: `PROB_MACETAS` y `MAX_MACETAS` en `generador-atasco.js`.

## 3. El bot (backtracking)
`resolver(tablero)` en `logica-atasco.js`: búsqueda por **backtracking con profundidad creciente (IDA\*)**, poda con cota admisible (1 + carros verticales que tapan al rojo) y tabla de transposición (hash de Zobrist). Devuelve la **solución más corta** o `null` si no hay solución o se pasa del tope de nodos (por nodos, no por tiempo: mismo resultado en cualquier computadora).

`generador-atasco.js` arma un tablero al azar y lo **muta** (mueve carros, preferentemente los que usa la solución; mueve el rojo; agrega o quita) conservando los cambios que no bajan los movimientos mínimos; los medios y difíciles derivan de tableros buenos ya hechos. Un nivel se acepta solo si **el bot lo resuelve**, sus movimientos mínimos caen en la banda de su clase y tamaño y no está repetido.

## 4. Cómo generarlos (consola, Node 18+, desde la carpeta `atasco/`)
```
node generar-niveles-atasco.mjs --paralelo        # todas las etapas, un proceso por núcleo (se puede cortar y seguir)
node generar-niveles-atasco.mjs 1 30              # o solo las etapas 1 a 30, en un proceso
node generar-niveles-atasco.mjs --unir            # junta generados/*.json en datos-niveles-atasco.js (rehace repetidos entre procesos)
node generar-niveles-atasco.mjs --verificar       # vuelve a resolver los 22 600 y revisa plan, tamaños, mezcla, macetas y repetidos
```
Tiempo medido (1 núcleo): ~20 s la etapa 1 y ~60 s la 226 → **unas 2 a 3 horas con un solo núcleo**; con `--paralelo` se divide casi entre el número de núcleos (8 núcleos ≈ 20–25 min). `generados/` trae como muestra las etapas **1 y 226** (ya verificadas: 0 problemas); el script las salta.

**Congelar antes de publicar:** el progreso de la gente va por número de nivel, así que una vez publicados no se vuelve a generar (ni se cambian `BANDAS`, el orden o la semilla). Si cambias algo del generador, borra `generados/` y empieza de nuevo.

## 5. Archivos
| Archivo | Qué es |
|---|---|
| `index-atasco.html`, `juego-atasco.js` | Menú principal (Modo libre: 5 dificultades y tableros 4×4 a 13×13) |
| `logica-atasco.js` | Reglas, texto del tablero (`aTexto`/`deTexto`), `resolver`, `BANDAS`, plan de etapas (`planEtapa`, `mezclaEtapa`, `tamanosEtapa`) |
| `generador-atasco.js` | Fábrica de tableros (mutación + solucionador) |
| `niveles-atasco.js` | `nivel(n)` → `{ n, tablero, minimo, clase }` leyendo `datos-niveles-atasco.js` |
| `datos-niveles-atasco.js` | **Generado** (`--unir`): 226 cadenas de 100 líneas `tablero|mínimo` |
| `generar-niveles-atasco.mjs` | Bot generador/verificador, solo consola (no va en `sw.js` ni lo usa el juego) |
| `generados/` | Una etapa por archivo (trabajo intermedio; no va en `sw.js`) |

Texto del tablero: n×n caracteres por filas; `.` libre, `#` maceta, `R` rojo, `a`…`x` los demás carros.

## 6. Pendientes
- Correr el bot completo, `--unir` y `--verificar`; luego agregar a `JUEGOS` de `sw.js`: `atasco: ["juego.js", "logica.js", "niveles.js", "generador-atasco.js", "datos-niveles-atasco.js"]` y subir `VERSION` (**no antes de que exista `datos-niveles-atasco.js`**: si falta un archivo de la lista, el service worker no se instala).
- Pantalla de la partida (tablero, arrastre de carros, contador de movimientos, macetas, victoria «sobre el tablero» del estándar), mapa de niveles (`montarMapa`), progreso con `conectar()` + `unirHechos`/`unirMaximos`, monedas.
- Modo libre: generar tableros de 4×4 a 13×13 en las 5 dificultades al vuelo con `generador-atasco.js` (en 11×11 a 13×13 el bot puede tardar: habrá que usar un tope y reintentar).
- Imagen de tarjeta `imagenes/atasco.webp`.
