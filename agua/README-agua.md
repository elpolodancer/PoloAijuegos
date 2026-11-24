# Agua (`agua/`)

Juego de hacer pasar un flujo de agua por una zona tapada hasta que llegue a su objetivo. Id de puntos: `agua`.

## Estado
**Inicio con mapa** (sección 13 de `ESTANDARES-juegos.md`, igual que Puzle deslizante), **mapa solo de países: 195 países × 20 niveles = 3 900** (sección A-bis), **3 estrellas por nivel**, **monedas** y **tienda**. Todavía no existen la pantalla de nivel ni la partida del Modo libre: al tocarlos sale «🚧 … todavía no está creado». Los niveles ya los crea `generador-agua.js` (cada uno se comprueba con la simulación).

## Archivos
| Archivo | Qué es |
|---|---|
| `index-agua.html` | Página: navegación cuadrada (🎮 y ☰), chips de arriba a la derecha (sesión y monedas), pantalla de inicio, Modo libre (5 dificultades) y fondo de madera. **Casi no trae CSS propio**: todo sale de `compartido/inmersivo.css` (bloque «INICIO CON MAPA») |
| `juego-agua.js` | Inicio, mapa (`montarMapa` con `unPais`), Modo libre, ⚙️ Ajustes, tienda y `terminarNivel(n, resultado, metas)` que el juego llamará al ganar |
| `economia-agua.js` | Reglas de estrellas, monedas y tienda. Sin DOM ni Firebase (probado en Node) |
| `dificultad-agua.js` | Dificultad (fácil, medio, difícil) de cada nivel: `dificultadNivel(n)`. Sin DOM ni Firebase |
| `generador-agua.js` | Crea el nivel `n` al instante (`generarNivel(n)`), siempre igual y comprobado con la simulación |
| `logica-agua.js` | Simulación del agua por casillas (la usan el generador y, más adelante, la pantalla de juego) |
| `verificar-agua.mjs` | Prueba en consola: `node agua/verificar-agua.mjs` (reparto de dificultades y monedas). Solo consola: **no** va en la lista de `sw.js` |

## Pantallas y botones (sección 13)
```
Abrir el juego → Inicio (una sola vez): ♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes
Mapa = menú principal (el país donde vas): ▶ Continuar · ♾️ Modo libre · 🌍 Mundo · 🗂️ Niveles
```
- **Inicio:** botones de 56 · **112** · 56 · 44 px (en celular horizontal bajo, 44 · 88 · 44 · 40). **▶ Jugar** abre el mapa en el nivel 1 mientras no se haya pasado ninguno; después, el nivel que toca.
- **🎮 y ☰** son cuadrados de 40 × 40 con solo icono (`nav-juego cuadrada`). El ☰ está **oculto** en el inicio y en la vista del país; dice «Atrás» en el mundo y en la lista de niveles, y «Volver al menú principal» en el Modo libre (abre el mapa). Esc hace lo mismo.
- **Arriba a la derecha**, en columna: chip de sesión («Sin sesión» o el nombre, recortado con «…») y, debajo, el chip de monedas, que abre la **tienda**.
- **Mapa:** `crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4 })`. Cada botón de nivel tiene el color de su dificultad (🟢 / 🔵 / 🔴) y, si ya lo pasaste, sus estrellas debajo del número. Las estrellas de cada país salen bajo «N de 20 niveles completados».
- **Modo libre:** grupo «Dificultad» con 5 botones solo con emoji (😁 😬 😐 😡 😈). Se recuerda en `agua_libre_v1`. Falta lo propio del juego (qué cambia cada dificultad) y la partida.
- **⚙️ Ajustes:** por ahora solo «🗑️ Borrar todo el historial y reiniciar» (controlado por `MOSTRAR_BORRAR_HISTORIAL`, **debe quedar en `false` antes de publicar**) y «Cerrar». Agua no tiene app instalable propia (sección 13.9).

## Dificultad de los niveles
Sección 8 con **tramos de 100 niveles** (con 20 por país, un tramo = 5 países; 39 tramos): **primeros 100 = 50 fáciles · 40 medios · 10 difíciles**; **últimos 100 = 25 · 40 · 35**. Los medios se quedan en 40; los fáciles bajan y los difíciles suben en línea recta. En todo el juego: **1 463 fáciles, 1 560 medios y 877 difíciles**.
Dentro del tramo van revueltos pero parejos (cada grupo de 10 trae de cada tipo, máximo 4 difíciles seguidos), siempre igual para todos (semilla fija), y **el primer nivel de cada país es siempre fácil** (se intercambia con otro fácil del mismo grupo de 10). El generador pide `dificultadNivel(n)`. **No cambiar estas cifras después de publicar** (cambiarían niveles ya jugados).

## Estrellas
★1 llegar a la meta · ★2 que llegue ≥ 60 % del agua · ★3 ≥ 90 % (cada nivel puede traer sus metas `{ p2, p3 }`). `fraccion` = agua que llegó ÷ agua que salió.

## Monedas
- Solo se pagan las estrellas **nuevas**: ★1 = 10, ★2 = +15, ★3 = +25 (50 por nivel). Repetir un nivel no da nada; el Modo libre tampoco.
- Bonos únicos: **+200 al pasar los 20 niveles de un país**, +500 si todos tienen 3 estrellas. Máximo por país: 20 × 50 + 700 = 1 700; en todo el juego, 331 500. ⚠️ Los bonos se dejaron como estaban cuando el país tenía 100 niveles: ahora pesan mucho más (700 de 1 700). Revisarlos si se quiere otro equilibrio.
- Se gastan en la **tienda** (chip dorado): 💡 Pista (40), ⏭️ Saltar nivel (150: pasa con 1★, sin monedas), y colores de agua 🟢 🌸 (200) y 🌈 (500), solo estéticos.

## Progreso y nube
Todo en una clave: `agua_progreso_v1` = `{ max, hecho, est, ganadas, gastadas, bon, comp, usa, skin, t }`. Como las monedas se gastan, se guardan como dos contadores que solo suben (`ganadas`, `gastadas`; saldo = diferencia), igual que lo comprado y lo usado. Así `fusionar` (gana el mayor de cada contador) nunca pierde ni duplica monedas entre dispositivos. `hecho` es un solo número (A-bis, punto 4).

## Cambios del 24 nov 2026 (migración al inicio con mapa, revisión 13.11)
Estaba desactualizado y se cambió:
- **Mapa:** de «32 estados + 194 países × 100 = 22 600» a «195 países × 20 = 3 900». `economia-agua.js` (`POR_ETAPA = 20`, `TOTAL` = países × 20), `dificultad-agua.js` (reparto por tramos de 100) y `verificar-agua.mjs`. No había progreso que migrar: no existía la pantalla de nivel.
- **Inicio:** se quitó la capa «▶ Comenzar» y el ☰ Pausa (con Modo libre y Niveles dentro). Ahora hay pantalla de inicio de cuatro botones y el mapa es el menú principal.
- **Botones:** 🎮 y ☰ pasaron de alargados (con texto) a cuadrados con solo icono; el ☰ de `b-cielo` a `b-verdeclaro`. Se quitó `compartido/menu-pausa.js` del juego (volverá con «¿Salir?», 13.6, cuando exista el nivel).
- **Arriba a la derecha:** el botón «👤 Iniciar sesión» (con doble toque para cerrar sesión) pasó a chip de sesión, y el chip ⭐ de estrellas totales se quitó (las estrellas se ven por país en el mapa). Se inicia sesión en el portal.
- **Modo libre:** de 5 botones grandes de colores («Muy fácil … Experto») a los 5 emojis estándar con «Demoníaco» como la más difícil.
- **CSS:** se quitó todo el CSS duplicado del HTML; los chips tocables y el chip de sesión recortable pasaron a `compartido/inmersivo.css`.

## Pendiente
- **Pantalla de nivel** (13.6: barra con 🗺️ + nombre, tres cuadros de datos, «¿Salir?» con `crearMenuPausa`, el chip de monedas pasa a la barra) y **partida del Modo libre** (con su pausa y partidas guardadas, 13.7).
- **Fin de nivel y celebración de estrellas** (secciones 6 y 13.5), mostrando `terminarNivel(...)`; usar las pistas (`E.usar(d, "pista")`), `E.saltarNivel` y `E.colorAgua(d)` dentro de la partida.
- ⚠️ **Puntos del portal (sección 12):** `terminarNivel` manda `encolarPuntos("agua", monedas)`; el estándar pide **1 punto por nivel la primera vez** con `encolarNivel("agua")`. Cambiarlo antes de publicar.
- Recomendado en ⚙️ Ajustes (13.8): 🌙/☀️ madera y 💾 Copia de seguridad.
- `MOSTRAR_BORRAR_HISTORIAL = false` antes de publicar.
- Registro (sección 5): fila en `juegos.js` (hoy no está) y carpeta en `JUEGOS` de `sw.js` (con `contornos-paises.js`, `posiciones-paises.js` y las banderas `imagenes-banderas/xx.svg` si no están ya); imagen de tarjeta (`imagenes/agua.webp`); confirmar que `firestore-unificado.rules` permite `progreso/{uid}/juegos/agua` y `juegos/agua/jugadores`; fila en «Mapa de archivos» del README principal y nota «Estado». Al registrarlo, subir `VERSION` en `sw.js`.
- Probar en celular real (vertical y horizontal).
