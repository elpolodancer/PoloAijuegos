## 1) Fila nueva para la tabla «Mapa de archivos» (pégala junto a las filas de los demás juegos)

| `rubik/index-rubik.html`, `rubik/juego-rubik.js`, `rubik/logica-rubik.js`, `rubik/README-rubik.md` | Juego «Cubo de Rubik» (id de puntos `rubik`): cubos 2×2, 3×3 y 4×4 en 3D hecho con CSS (sin librerías). `logica-rubik.js` es solo la lógica de cualquier cubo n×n×n (piezas con posición `p` y orientación `M`, `girar`, `mover`, `mezcla`, `resuelto`); `juego-rubik.js` dibuja, maneja el arrastre (sobre una pegatina gira su capa, sobre el fondo gira la vista), los botones U R F D L B con ′ y «Ancho» (desde 4×4), la cola de animaciones, el cronómetro, el menú de pausa y el progreso. Puntos por tamaño en `TABLA` (base + bono por rapidez); progreso en `localStorage` (`rubik_progreso_v1`, `{ m: {"2","3","4"}, resueltos, t }`) sincronizado con `conectar()` (gana el mejor tiempo de cada tamaño). Plan de ~100 modelos en `README-rubik.md` |

## 2) Nota para la sección «Estado»

- Cubo de Rubik (9 nov 2026, `sw.js` `VERSION` = 130): hechos 2×2, 3×3 y 4×4 con el estándar inmersivo, menú de pausa, fondo de madera, puntos pendientes y récord por tamaño sincronizado con la cuenta. La lógica se probó en Node (giros, identidades, mezcla y deshacer en los tres tamaños); la pantalla NO se ha probado en navegador/celular (arrastre sobre pegatinas, rendimiento del 4×4 con 64 piezas, tamaño de los botones en horizontal). Pendiente: agregar la línea a `juegos.js` (y su id a `EN_DESARROLLO`), imagen de tarjeta (`imagenes/rubik.webp`, y anotarla en `ARCHIVOS` de `sw.js`), 5×5 a 8×8, selector con más modelos y el resto del catálogo de `README-rubik.md`.

## 3) Nota para la sección «Estado»: instalar el portal como app y usarlo sin internet (24 nov 2026, `sw.js` `VERSION` = 224)

**Meta:** que el portal se instale en Android y PC como lo hace Polo AI (la app de notas, que ya funciona: APK hecha con Capacitor, ver `INSTALAR-ANDROID.md` del otro proyecto) y que abra sin internet para cualquiera.

**Lo que se ve hoy:** al instalarlo desde el navegador queda un icono transparente con el logo pequeño de Google/Chrome en vez del logo del portal, y Chrome pide instalarlo directo desde el navegador (no hay APK de los juegos todavía).

**Hecho en la sesión del 24 nov (probado solo con un entorno simulado en Node; NO en celular):**
- `sw.js` v224: la instalación ya no se cae por un archivo suelto. Lo básico (`CRITICOS`: portal, estilos, iconos, `sin-internet.html`) se guarda primero y es estricto; los juegos se bajan después (límite 60 s al instalar) y se completan con `completarCopia()` cuando la página lo pide o vuelve la conexión. Las copias viejas (`juegos-vN`) se borran solo cuando la nueva está completa (marca `copia-completa.marca`).
- `sw.js`: copia primero para juegos, `compartido/` e imágenes; red primero (3 s) solo para `index.html`, `juegos.js` y el manifest.
- `sin-internet.html` nuevo (se agrega a `ARCHIVOS`); sale si abren una página sin copia y sin conexión.
- `index.html`: tras registrar el service worker pide «completar» a los 5 s y cada vez que vuelve la conexión.
- Subir juntos a la raíz: `sw.js`, `index.html`, `sin-internet.html`.

**Pendiente, en este orden:**
1. **Icono transparente.** Probar en el navegador que abren bien `iconos/icono-192.png`, `icono-512.png` y `icono-maskable-512.png`. Sospecha: el maskable tiene fondo transparente o el logo muy pequeño y Android lo usa para el icono adaptable. Un maskable bueno lleva fondo sólido (el azul `#0b0d3d`) y el logo dentro del 80 % central. Polo AI además declara `imagenes/perfil.webp` como icono «any» 512. Tras cambiar iconos hay que **desinstalar y volver a instalar** la app para ver el cambio.
2. **Probar sin internet de verdad:** abrir el portal con internet unos segundos, jugar un juego, activar modo avión, cerrar y abrir de nuevo. Revisar la consola por «archivos que no existen en el servidor» (corregir `JUEGOS` en `sw.js`).
3. **APK de los juegos con Capacitor** (como Polo AI). Cuidado con el inicio de sesión: `compartido/jugador.js` usa `signInWithPopup` y `signInWithRedirect`, que no funcionan bien dentro de un WebView de Android; hará falta un plugin de Google nativo y autorizar el dominio `localhost` en Firebase. Dentro de la APK el origen es `https://localhost`, así que el `localStorage` no se comparte con la web (el progreso se une con la nube vía `progreso.js`).
4. Si se prefiere TWA/PWABuilder: el `assetlinks.json` debe estar en la raíz del dominio, y un sitio de proyecto de GitHub Pages (`usuario.github.io/REPO/`) no lo permite.

**Para retomar en otra sesión, subir:** `sw.js`, `index.html`, `manifest.webmanifest`, `juegos.js`, `compartido/jugador.js`, la carpeta `iconos/` (o los tres PNG), `imagenes/logo-portal.webp`, y, si ya existe, la carpeta `android/` o `capacitor.config.*` de la APK.
