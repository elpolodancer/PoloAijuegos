# Atasco (id de puntos: `atasco`)

Estacionamiento lleno: hay que **abrir paso al carro rojo** para que salga por el borde derecho. Todos los demás carros son grises. Estado al 24 nov 2026: **inicio con mapa estándar** (ESTANDARES-juegos.md, sección 13), menú de Modo libre, ⚙️ Ajustes y **todo el sistema de niveles** (reglas, plan, bot y verificador). Falta la pantalla de la partida. También se puede **instalar solo este juego** (sección 6).

## 1. Reglas (supuestos que se pueden cambiar ANTES de generar los niveles)
- Tablero n×n. Carros de **2 o 3 casillas**, horizontales o verticales; solo se deslizan a lo largo de su eje, cualquier distancia = **1 movimiento**.
- **Macetas** 🪴: ocupan 1 casilla, no se mueven y estorban. Nunca están en la fila de salida.
- Carro rojo: siempre de 2, horizontal, sale por el **borde derecho de su fila** (la fila varía de nivel en nivel). En esa fila solo puede haber carros verticales.
- Gana al llegar el frente del rojo a la última columna. Máximo 24 carros además del rojo.

## 2. Los 3 900 niveles fijos (cambio del 24 nov 2026: de 22 600 a 3 900)
Mapa **solo de países** (ESTANDARES-juegos.md, A-bis): `crearEtapas({ porEtapa: 20, soloPaises: true })` de `compartido/etapas-mapa.js` = **195 países × 20 niveles**, México primero (niveles 1–20), Estados Unidos 25.º y China último. Antes eran 226 etapas (32 estados + 194 países) × 100; como todavía no se había generado nada, se cambió aquí y en `logica-atasco.js` (`ETAPAS_TOTAL = 195`, `NIVELES_ETAPA = 20`).

- **Tamaños: de 4×4 a 10×10**, repartidos **dentro de cada país**: 20 = 7×2 + 6, o sea seis tamaños con 3 niveles y uno con 2; ese uno rota de país en país (total: 557 niveles de cada tamaño, 558 de 10×10).
- **Dificultad por país** (`mezclaEtapa`): **México es todo fácil** (20), como en Deslizante. Del país 2 al 195 hay siempre 8 medios; los difíciles suben de 2 a 7 y los fáciles bajan de 10 a 5 (≈ 50/40/10 % → 25/40/35 %, sección 8). Total: 1 475 fáciles, 1 552 medios y 873 difíciles.

| País | Fáciles | Medios | Difíciles |
|---|---|---|---|
| 1.º (México) | 20 | 0 | 0 |
| 2.º | 10 | 8 | 2 |
| 98.º (mitad) | 8 | 8 | 4 |
| 195.º (China) | 5 | 8 | 7 |

- **Orden dentro de cada país:** primero los 4×4, luego 5×5… hasta 10×10; dentro de cada tamaño, de fácil a difícil.
- **Cómo se mide la dificultad:** por los **movimientos mínimos** del bot, con umbrales por tamaño (`BANDAS` en `logica-atasco.js`, sin cambios):

| Tamaño | Fácil | Medio | Difícil |
|---|---|---|---|
| 4×4 | 2–3 | 4–5 | 6 o más |
| 5×5 a 8×8 | 3–5 | 6–8 | 9 o más |
| 9×9 y 10×10 | 3–5 | 6–7 | 8 o más |

- **Macetas:** 4 de cada 10 niveles las llevan, de 1 a `⌊n/3⌋`. Ajustes: `PROB_MACETAS` y `MAX_MACETAS` en `generador-atasco.js`.

## 3. El bot (backtracking)
`resolver(tablero)` en `logica-atasco.js`: búsqueda por **backtracking con profundidad creciente (IDA\*)**, poda con cota admisible (1 + carros verticales que tapan al rojo) y tabla de transposición (hash de Zobrist). Devuelve la **solución más corta** o `null` si no hay solución o se pasa del tope de nodos (por nodos, no por tiempo: mismo resultado en cualquier computadora).

`generador-atasco.js` arma un tablero al azar y lo **muta** (mueve carros, preferentemente los que usa la solución; mueve el rojo; agrega o quita) conservando los cambios que no bajan los movimientos mínimos; los medios y difíciles derivan de tableros buenos ya hechos. Un nivel se acepta solo si **el bot lo resuelve**, sus movimientos mínimos caen en la banda de su clase y tamaño y no está repetido.

## 4. Cómo generarlos (consola, Node 18+, desde la carpeta `atasco/`)
```
node generar-niveles-atasco.mjs --paralelo        # todas las etapas, un proceso por núcleo (se puede cortar y seguir)
node generar-niveles-atasco.mjs 1 30              # o solo los países 1 a 30, en un proceso
node generar-niveles-atasco.mjs --unir            # junta generados/*.json en datos-niveles-atasco.js (rehace repetidos entre procesos)
node generar-niveles-atasco.mjs --verificar       # vuelve a resolver los 3 900 y revisa plan, tamaños, mezcla, macetas y repetidos
```
Tiempo medido con el plan nuevo: el país 1 tarda menos de 1 s y el 195 unos 6 s, así que **todo el juego sale en unos minutos** (con `--paralelo`, menos). `generados/` debe estar **vacío**: las etapas 1 y 226 de muestra eran del plan viejo (100 niveles) y hay que borrarlas.

**Congelar antes de publicar:** el progreso de la gente va por número de nivel, así que una vez publicados no se vuelve a generar (ni se cambian `BANDAS`, el orden o la semilla). Si cambias algo del generador, borra `generados/` y empieza de nuevo.

## 5. Archivos
| Archivo | Qué es |
|---|---|
| `index-atasco.html`, `juego-atasco.js` | Inicio con mapa (sección 13): pantalla de inicio (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes), mapa de países como menú principal, Modo libre (5 dificultades con emoji, tableros 4×4 a 13×13) y Ajustes (madera clara/oscura y copia de seguridad). Progreso `atasco_progreso_v1` = `{ v: 1, hechos }`, sincronizado con `conectar()`; sin los niveles generados el mapa muestra 🚧 |
| `logica-atasco.js` | Reglas, texto del tablero (`aTexto`/`deTexto`), `resolver`, `BANDAS`, plan de etapas (`planEtapa`, `mezclaEtapa`, `tamanosEtapa`) |
| `generador-atasco.js` | Fábrica de tableros (mutación + solucionador) |
| `niveles-atasco.js` | `nivel(n)` → `{ n, tablero, minimo, clase }` leyendo `datos-niveles-atasco.js` |
| `datos-niveles-atasco.js` | **Generado** (`--unir`): 195 cadenas de 20 líneas `tablero|mínimo` |
| `generar-niveles-atasco.mjs` | Bot generador/verificador, solo consola (no va en `sw.js` ni lo usa el juego) |
| `generados/` | Una etapa por archivo (trabajo intermedio; no va en `sw.js`) |

Texto del tablero: n×n caracteres por filas; `.` libre, `#` maceta, `R` rojo, `a`…`x` los demás carros.

## 6. Instalar SOLO este juego (24 nov 2026, ESTANDARES-juegos.md 13.9)
Atasco se puede instalar en el celular o la PC **por separado del portal**: otra app, con su propio ícono; al abrirla solo existe este juego.
- **Archivos (todos en `atasco/`):** `manifest-atasco.webmanifest` (id `juego-atasco-el-polo`, `scope` = esta carpeta, `start_url` con `?app=1`), `sw-atasco.js` (service worker propio) e íconos `icono-180/192/512-atasco.png` e `icono-maskable-512-atasco.png` (un estacionamiento 6×6 con el carro rojo y la flecha de salida; se pueden cambiar por arte propio con los mismos nombres y tamaños: el «maskable» lleva fondo sólido y el dibujo dentro del 80 % central).
- **Qué baja:** solo la página, `logica`, `generador`, `niveles` y `datos-niveles`, los módulos de `compartido/` que usa, `juegos.js`, la madera y (lo mejor posible) las 195 banderas. Ningún otro juego. Su caché es `app-atasco-vN` (no empieza con `juegos-`, así `sw.js` del portal no la borra). **`datos-niveles-atasco.js` todavía no existe:** en este service worker un 404 solo avisa en la consola y no cancela la instalación (una falla de red sí). Cuando se generen los niveles no hay que tocar nada más.
- **Botón «📲 Instalar solo este juego»** en ⚙️ Ajustes (se oculta dentro de una app ya instalada). Usa `beforeinstallprompt` y, si no hay, explica a mano (iPhone, navegador interno de otra app, o menú de Chrome).
- **App instalada sola (`ES_APP_SOLA` en `juego-atasco.js`):** `display-mode: standalone` + `?app=1`. Ahí se oculta 🎮 y el chip «Sin sesión» pasa a «👤 Iniciar sesión» (tocable).
- **Cuándo subir `VERSION` de `sw-atasco.js`:** solo si se agregan o quitan archivos de su lista (los que ya están se actualizan solos). Si el juego importa un módulo nuevo de `compartido/`, anotarlo en `ARCHIVOS`.
- **Para que el progreso se una entre la app y la web:** la cuenta de Google (`conectar()`); en iPhone/iPad los datos locales son aparte.
- **Falta probar en celular real:** instalar en Android y iPhone, abrir sin internet e iniciar sesión dentro de la app. Tras cambiar íconos hay que desinstalar y volver a instalar para verlos.

## 7. Pendientes (en este orden, ESTANDARES-juegos.md sección 10)
1. **Borrar `generados/etapa-001.json` y `etapa-226.json`** (plan viejo) y probar en celular real el inicio, el mapa, Modo libre y Ajustes.
2. Agregar a `JUEGOS` de `sw.js`: `atasco: ["juego.js", "logica.js", "niveles.js", "generador-atasco.js", "datos-niveles-atasco.js"]` y subir `VERSION` (**no antes de que exista `datos-niveles-atasco.js`**). El mapa de países necesita `compartido/contornos-paises.js`, `posiciones-paises.js`, `etapas-mapa.js`, `mapa-niveles.js`, `almacen.js` y las banderas (`imagenes-banderas/xx.svg`) en la lista del `sw.js`; ya están por Deslizante, comprobarlo.
3. Pantalla de la partida (tablero, arrastre de carros, movimientos, macetas), con la barra 🗺️ + nombre del nivel, «¿Salir?» (13.6) y el fin de nivel «sobre el tablero» (sección 6). Al hacerla: récords `mejores`/`libre` en el progreso, 1 punto de portal por nivel (`encolarNivel`), monedas, «Partidas guardadas» y pausa del Modo libre (13.7), y en Ajustes «🗑️ Borrar historial» (solo pruebas, `MOSTRAR_BORRAR_HISTORIAL`).
4. Modo libre: generar tableros de 4×4 a 13×13 en las 5 dificultades al vuelo con `generador-atasco.js` (en 11×11 a 13×13 el bot puede tardar: usar un tope y reintentar).
5. Correr el bot completo, `--unir` y `--verificar`; imagen de tarjeta `imagenes/atasco.webp`.
