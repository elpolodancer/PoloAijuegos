# Juegos

Portal con un juego por carpeta. Cada juego solo carga lo suyo y lo común vive en `compartido/`.

## Mapa de archivos

Cada archivo trae en su **primera línea** su ruta dentro del repo (`Ruta: ...`). Si los archivos se suben sueltos (sin carpetas), esa línea dice dónde va cada uno.

| Ruta | Para qué sirve |
|---|---|
| `index.html` | Portal: muestra la lista de juegos y la sesión con Google (en la raíz del repo) |
| `juegos.js` | Lista de juegos. Es lo único que se toca para agregar un juego al portal |
| `compartido/firebase.js` | Configuración de Firebase (se pega una sola vez) |
| `compartido/jugador.js` | Login con Google, puntos totales, mejor marca por juego y ranking |
| `compartido/estilos.css` | Estilos comunes de todos los juegos |
| `ejemplo/index.html` | Página del juego de plantilla «Reflejos» (no es el portal) |
| `ejemplo/juego.js` | Lógica de «Reflejos» |
| `doodle/index.html`, `doodle/juego.js` | Juego «Saltarín» (estilo Doodle Jump): plataformas normales, móviles, trampolín (salto doble), que se rompen y de un solo salto; enemigos, monedas, gorro de 100 m y marcador de metros. Los ajustes (gravedad, metros del gorro, puntos) están al inicio de `juego.js` |
| `piano/index.html`, `piano/juego.js` | Juego «Piano» (estilo Piano Tiles, con sonido) |
| `firestore.rules` | Reglas de seguridad; se pegan en la consola de Firebase |

**Regla de las carpetas:** cada juego vive en su carpeta (`nombre-del-juego/index.html` + sus archivos) y llama a lo común con `../compartido/...`. Esa ruta relativa en los `import` y en el `<link>` también indica dónde está cada archivo.

## Seguir el trabajo en otra sesión con Claude

1. Pasa **todos** los archivos que se van a tocar, y siempre este `README.md`.
2. Si los archivos llegan sin carpetas, avisa: «los archivos están sin carpetas; sigue el mapa del README». Si hay dos con el mismo nombre (`index.html`), se distinguen por la línea `Ruta:`.
3. Al terminar cada sesión, actualiza el **Estado** de abajo (o pídeselo a Claude) para que la siguiente sesión sepa dónde quedaste.

## Estado (actualízalo al terminar cada sesión)

- [x] Configuración de Firebase pegada en `compartido/firebase.js` (proyecto `elpolodancer`)
- [ ] Authentication (Google) y Firestore activados; reglas pegadas
- [ ] Dominio `tuusuario.github.io` agregado en dominios autorizados
- [ ] Repo publicado en GitHub Pages
- Saltarín mejorado (enemigos, monedas, plataformas especiales, gorro de 100 m, metros de altura): hecho, probado con simulación; falta probarlo a mano en el navegador
- Juegos: `ejemplo` (plantilla), `doodle`, `piano`. Pendientes: ajedrez (con puntos y ligas)
- Juegos en repo propio (con `url` en `juegos.js`): ninguno por ahora

## Puesta en marcha
1. Crea el repo en GitHub, sube estos archivos (con sus carpetas) y activa **Settings → Pages** (rama main, carpeta raíz).
2. En Firebase: activa **Authentication → Google** y **Firestore Database**.
3. Pega la configuración web de tu proyecto en `compartido/firebase.js`.
4. En Firestore → Reglas, pega el contenido de `firestore.rules`.
5. En Authentication → Configuración → Dominios autorizados, agrega `tuusuario.github.io`.

Para probar en tu PC no abras el archivo con doble clic (los módulos no funcionan con `file://`): usa Live Server de VS Code o `npx serve`.

## Agregar un juego
1. Copia la carpeta `ejemplo/` con otro nombre y cambia su `ID` en `juego.js` y la línea `Ruta:` de sus archivos.
2. Agrega una línea en `juegos.js`.
3. Si un juego se vuelve pesado, muévelo a su propio repo y en `juegos.js` usa `url` en lugar de `carpeta`.

Nota: los puntos los calcula el navegador, así que un jugador con conocimientos podría falsearlos. Para ligas serias, más adelante conviene validarlos con Cloud Functions.
