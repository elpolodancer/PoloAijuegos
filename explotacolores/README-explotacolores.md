# Explota colores (`explotacolores`)

Tablero de 10 columnas × 15 filas. Toca un grupo de 3 o más bloques del mismo color (unidos arriba/abajo/izquierda/derecha): se quita al instante, caen los de arriba y llegan bloques nuevos. Puntos por grupo = `n² × 10` (3 → 90, 6 → 360, 9 → 810, 15 → 2 250).

- **Rapidez:** la lógica se actualiza en el mismo toque; la animación (gravedad 170 filas/s², tope 45 filas/s, una columna cae en ~0,4 s) nunca bloquea el siguiente toque. Se toca el bloque que *se ve* bajo el dedo.
- **Ayudas:** los grupos jugables llevan borde blanco y los demás se ven más apagados; cada color tiene su figura (● ▲ ■ ◆ ★ ♥ ✚). Si por azar no quedara ninguna jugada, se pinta una (`asegurarJugada`).
- **Ronda de 60 s** que empieza con el primer toque (`SEGUNDOS` en `juego-explotacolores.js`).

## Inicio con mapa (24 nov 2026, `ESTANDARES-juegos.md` sección 13)
Se pasó al inicio «estilo Deslizante». Los estilos vienen de `compartido/inmersivo.css` (bloque «INICIO CON MAPA»: `.ini-menu`, `.barra-nivel`, `.cuadros-datos`, `.dif-fila`, `.libre-*`, `.aj-panel`); el HTML solo trae lo propio del juego (`#tablero`, `.fin`, `.aviso-niv`).
- **Pantalla de inicio** (una sola vez): ♾️ Modo libre (56) · ▶ Jugar (112) · 🗺️ Mapa (56) · ⚙️ Ajustes (44). Jugar abre el mapa en el nivel 1 mientras no se haya pasado ninguno.
- **Navegación:** 🎮 y ☰ cuadrados, solo icono (`nav-juego cuadrada`). ☰ oculto en el inicio y en la vista principal del mapa; «Atrás» en las vistas internas del mapa; «Volver al menú principal» en Modo libre (opciones) y en el resultado; «Pausa» en una ronda de Modo libre. Arriba a la derecha, `hud-der columna` con el chip de sesión («👤 Iniciar sesión» si no hay sesión; tocarlo inicia sesión).
- **Mapa:** `crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4, … })` = 195 países × 20 niveles = **3 900 niveles**, con el botón extra ♾️ Modo libre. **Los niveles todavía no existen**: cada botón muestra 🚧 y al tocar uno avisa «🚧 Los niveles todavía no están creados» (`NIVELES_CREADOS = 0`).
- **Progreso:** `explotacolores_progreso_v1` = `{ m: { "<colores>": mejor puntaje }, hechos, t }`. `hechos` (nuevo) es el nivel más alto pasado, un solo número; lo guardado antes se lee como 0. Sincronizado con `conectar()`: `unirMaximos` para los récords y el mayor para `hechos`.
- **Modo libre** (pantalla propia, `explotacolores_libre_v1` guarda la última dificultad): las 5 dificultades estándar = número de colores — 😁 Muy fácil 3 · 😬 Fácil 4 · 😐 Normal 5 · 😡 Difícil 6 · 😈 Demoníaco 7 (antes «Experto»; el récord se guarda por número de colores, así que no cambió). No hay grupo «Tablero» porque el tablero es fijo. Sin monedas ni puntos de portal. Pausa del Modo libre: Seguir jugando · Salir a elegir tablero (sin «Reiniciar», como pide 7.5). Fin de ronda: «Jugar otra vez» y «⚙️ Cambiar dificultad».
- **⚙️ Ajustes:** 🗑️ Borrar todo el historial (solo pruebas: `MOSTRAR_BORRAR_HISTORIAL = true` mientras el juego esté en `EN_DESARROLLO`; **ponerlo en `false` antes de publicar**) · 💾 Copia de seguridad (`almacen.js`) · Cerrar. No lleva «Instalar solo este juego» (opcional, 13.9).
- Ya preparado para los niveles: barra con 🗺️ + nombre verde, «¿Salir?» (`pausaSalir`) y `jugarNivel()` (hoy solo avisa 🚧).
- **Probado** con un navegador sin pantalla (Chromium): móvil vertical 390×780, horizontal 780×360 y PC 1280×720; sin errores de JavaScript; botones del inicio con los tamaños del estándar; el tablero queda centrado y no pisa la barra, los cuadros ni las esquinas; la pausa detiene el reloj; fin de ronda y récord guardado. **NO** probado con el dedo en un celular real, ni con sesión de Google, ni la copia de seguridad.

## Antes de crear los niveles (sección 10)
1. **Falta definir qué es un nivel** y escribir como constantes al inicio de `logica-explotacolores.js` las mecánicas y metas (p. ej. «llega a N puntos», «quita N de un color», «limpia X bloques», con o sin tiempo, número de colores por tramo) y desde qué avance del mapa aparece cada una. Se anotan aquí.
2. **Estrellas y monedas** (si el juego las va a usar; 13.5 y sección 3). Hoy no hay ninguna.
3. **Recompensas:** 1 punto de portal por nivel la primera vez (`encolarNivel("explotacolores")`, sección 12); el Modo libre no da.
4. **Bot/verificador** `verificar-explotacolores.mjs` que cubra cada mecánica y meta; y solo entonces generar los 3 900 niveles con la dificultad de la sección 8.
5. Tras crearlos: subir `NIVELES_CREADOS`, completar `infoNivel` y `jugarNivel` (modo `"nivel"`, `pausaSalir`, ver el comentario en el código).

## Registro (secciones 5 y 13.11 de ESTANDARES-juegos.md)
- `sw.js`: `explotacolores: ["juego.js", "logica.js"]` ya está en `JUEGOS`; el mapa, `etapas-mapa.js`, `contornos-paises.js`, `posiciones-paises.js`, `almacen.js` y `cola-puntos.js` ya están en `ARCHIVOS`. Solo hay que **subir `VERSION` (225 → 226)**.
- `juegos.js`: sin cambios (sigue en `EN_DESARROLLO`).
- README principal: reemplazar la nota «Estado» de Explota colores por: «Explota colores (24 nov 2026, `sw.js` `VERSION` = 226): pasado al inicio con mapa (sección 13) con el mapa de países (3 900 niveles sin crear, 🚧), Modo libre con las 5 dificultades estándar y Ajustes. Probado en Chromium sin pantalla; NO en celular real. Pendiente: definir mecánicas/metas, estrellas y monedas, verificador y generar los niveles; imagen de tarjeta.»

## Instalar solo este juego (24 nov 2026, `ESTANDARES-juegos.md` 13.9)
Se puede instalar Explota colores como app propia, separada del portal.
- **Archivos nuevos (todos en `explotacolores/`):** `manifest-explotacolores.webmanifest` (id `juego-explotacolores-el-polo`, `scope` = esta carpeta, `start_url` con `?app=1`), `sw-explotacolores.js` (service worker propio, alcance = esta carpeta, caché `app-explotacolores-vN`) e íconos `icono-180/192/512-explotacolores.png` e `icono-maskable-512-explotacolores.png` (generados: bloques de colores con una explosión sobre madera; el «maskable» es opaco con el dibujo dentro del 80 % central). **Subir los 6 archivos nuevos juntos.**
- **Qué baja y qué no:** solo la página del juego, su lógica, el manifest, los íconos, los módulos de `compartido/` que usa (incluidos el mapa, los contornos y `almacen.js`), `juegos.js` y la madera. **Ningún otro juego del portal.** Las banderas del mapa (`imagenes-banderas/xx.svg`) se guardan al verlas; si quieres que ya estén todas sin internet hay que agregarlas a `ARCHIVOS` como en `sw-5deslizante.js`.
- **Botón «📲 Instalar solo este juego»** en ⚙️ Ajustes (primero de la lista; se oculta si ya estás dentro de una app instalada). Usa `beforeinstallprompt` (guardado en un `<script>` del `<head>`); si Chrome no lo ofrece, o en iPhone/iPad y navegadores internos, escribe las instrucciones a mano en la misma ventana.
- **App instalada sola (`ES_APP_SOLA`):** `display-mode: standalone` + `?app=1`. Ahí se oculta 🎮 (llevaría fuera de la app). El chip «👤 Iniciar sesión» ya es tocable en todos los casos, así que se puede entrar con Google dentro de la app.
- **Solo hay que subir `VERSION` de `sw-explotacolores.js`** si se agregan o quitan archivos de su lista (hoy 1). Si el juego importa un módulo nuevo de `compartido/`, anotarlo en su `ARCHIVOS`.
- **`sw.js` del portal:** no cambia (sus archivos de instalación no van en `JUEGOS`); solo subir `VERSION` (225 → 226) por los cambios del juego.
- **Probado** en Chromium sin pantalla: el manifest y los 3 íconos cargan, el service worker se activa con alcance `explotacolores/` y guarda 26 archivos (ninguno de otro juego), con el internet cortado el juego abre y se juega, y con `display-mode: standalone` simulado se oculta 🎮 y no sale el botón de instalar. **NO** probado: el aviso real de instalación de Chrome, ni en iPhone, ni con el APK. Prueba en celular real: abrir con internet unos segundos, Ajustes → Instalar, abrir desde el ícono, modo avión.
