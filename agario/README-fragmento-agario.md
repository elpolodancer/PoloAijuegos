# Agario: inicio con mapa (24 nov 2026)

Se aplicó el **inicio con mapa** (ESTANDARES-juegos.md, sección 13) y la configuración inmersiva. **Los niveles todavía no están creados** (sección 10: primero los estándares).

## Qué cambió
- **Pantalla de inicio** (una sola vez): ♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes. Ya no hay velo oscuro ni mundo corriendo detrás del menú.
- **Mapa de países** (`crearEtapas({ porEtapa: 20, soloPaises: true })` + `montarMapa({ unPais: true, columnas: 4 })`): 195 países × 20 niveles = 3 900. Cada botón de nivel muestra 🚧 y al tocarlo avisa «Los niveles todavía no están creados». Incluye ♾️ Modo libre e ℹ️ Info.
- **Navegación cuadrada** (🎮 y ☰ solo icono), 👤 sesión y 🪙 monedas arriba a la derecha en columna, madera clara/oscura y canvas transparente (fuera de la arena se ve la madera).
- **Modo libre** = la partida de siempre, con las 5 dificultades estándar (cambian número de bots, cuánto te persiguen a ti y su velocidad). Dentro: botón verde con el nombre (abre la pausa), cuadros Masa · Tiempo · Récord y ☰ «Pausa». La pausa **congela el mundo** (Seguir jugando · ℹ️ Cómo se juega · Salir a elegir dificultad). Al morir: «Jugar otra vez» y «⚙️ Cambiar dificultad».
- **⚙️ Ajustes**: 📲 Instalar solo este juego (ver abajo), 💾 Copia de seguridad y, solo con `MOSTRAR_BORRAR_HISTORIAL = true`, 🗑️ Borrar historial (queda en `false`).
- **No se incluyó** «Partidas guardadas» (no aplica a una partida en tiempo real).

## Instalar solo este juego (13.9, 24 nov 2026)
Se puede instalar **por separado del portal**: otra app, con su ícono, y al abrirla solo existe Agario.
- **Archivos nuevos (todos en `agario/`):** `manifest-agario.webmanifest` (id `juego-agario-el-polo`, `scope` = esta carpeta, `start_url` con `?app=1`), `sw-agario.js` (service worker propio, alcance = esta carpeta) e íconos `icono-180/192/512-agario.png` y `icono-maskable-512-agario.png` (célula morada con ojos sobre madera, hechos con un script; se pueden cambiar por arte propio con los mismos nombres y tamaños).
- **Qué baja:** su página, `juego-agario.js`, `niveles-agario.js`, los módulos de `compartido/` que usa (incluido `almacen.js`), `juegos.js`, la madera y las 195 banderas. **Ningún otro juego.** Caché `app-agario-vN` (no empieza con `juegos-`, así `sw.js` del portal no la borra).
- **Dos service workers conviven** (portal en la raíz, el del juego en `agario/`): para las páginas de esta carpeta manda el del juego. Ambos usan «primero red, luego copia». **Solo se sube `VERSION` de `sw-agario.js` si se agregan o quitan archivos de su lista**; si el juego importa un módulo nuevo de `compartido/`, anotarlo en `ARCHIVOS`.
- **Botón «📲 Instalar solo este juego»** en ⚙️ Ajustes (se oculta si ya estás en una app instalada). Usa `beforeinstallprompt`; en iPhone/iPad y navegadores internos muestra instrucciones.
- **App instalada sola (`ES_APP_SOLA`):** se detecta por `display-mode: standalone` + `?app=1`. Ahí se oculta 🎮 y el chip «Sin sesión» pasa a «👤 Iniciar sesión» tocable (`entrar()` de `jugador.js`).
- **Pendiente:** probar en celular real (instalar en Android y iPhone, abrir sin internet, iniciar sesión dentro de la app).

## Progreso
- Clave nueva `agario_progreso`: `{ v: 1, hechos: <número>, libre: { "<dificultad 0-4>": masa máxima } }`.
- El récord viejo (`agario_record`, un número, también en la nube) **se migra solo a «Normal» (2)** y la clave vieja se borra. La nube entiende los dos formatos.
- Modo libre: `PUNTOS_LIBRE = true` conserva los puntos de perfil por masa máxima (1 por cada 10, menos el primero), como antes (sección 12 deja a Agario con su regla). Ponerlo en `false` los quita (estándar 7.2).
- Monedas: `monedasDe` en `niveles-agario.js` es **provisional** (15 por nivel); el chip vale 0 mientras no haya niveles.

## Registro (pendiente en el portal)
- `sw.js`: en `JUEGOS` cambiar `agario: ["juego.js"]` por `agario: ["juego.js", "niveles.js"]` y subir `VERSION` (226) con su línea de «Última versión». `contornos-paises.js` y `posiciones-paises.js` ya están en la lista; las banderas se guardan solas.
- `juegos.js`: sin cambios (Agario ya está publicado, no está en `EN_DESARROLLO`). Opcional: actualizar su descripción (mapa por países, 5 dificultades).
- README principal: fila de «Mapa de archivos» (`niveles-agario.js`) y nota «Estado».

## Siguiente (sección 10)
Definir mecánicas y metas de los niveles como constantes, bot de comprobación y, solo entonces, generar los 3 900 niveles (dificultad de la sección 8).
