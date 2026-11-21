# Ajedrez (id de puntos `ajedrez`) — PROYECTO: Portal Juegos

## Cómo abre (estándar, secciones 7 y 9 de ESTANDARES-juegos.md)
- **No hay pantalla de menú principal.** Al abrir se ve el juego ya cargado tapado por la capa **▶ Comenzar**. **Excepción al estándar 7.0 (pedida por Polo, solo para el Ajedrez):** lo que se ve detrás NO es el nivel del mapa donde va el jugador, sino una **partida de Modo libre contra el bot nivel 2** (`NIVEL_INICIO = 2`, Novato), con el color que el jugador tenga guardado. Esa dificultad no se guarda: el Modo libre recuerda la que el jugador eligió. Los niveles se abren desde ☰ Pausa → 📋 Niveles.
- Mientras la capa está puesta el tablero no responde (`inert` + banderas) y la computadora no mueve; 🎮 Portal de Juegos, ☰ Pausa y 👤 siguen usables.
- La capa vuelve a salir al abrir el juego y con «🚪 Menú principal» o «◀ Atrás» desde Niveles / Modo libre. Entrar a un nivel desde Niveles, Reiniciar o «Siguiente nivel ▶» empieza directo.

## ☰ Pausa / ◀ Atrás
- En el juego dice «Pausa» (menú: ▶ Continuar · **🔄 Reiniciar nivel justo debajo de Continuar** («Nueva partida» si no se está en un nivel) · ♾️ Modo libre · 📋 Niveles · ℹ️ Info · 🚪 Menú principal). En Niveles y Modo libre dice «Atrás» y vuelve al juego con la capa.
- En una partida de **Modo libre** el menú solo trae Continuar y «Salir a elegir tablero».

## ♾️ Modo libre (pantalla propia)
- Filas de botones: **Dificultad** (5 niveles, ⭐ si ya se venció) y **Tu color** (♔ / ♚); elegido `b-oro on`, resto `b-cielo`. Se recuerda la última selección. Botón «▶ Jugar».
- `PUNTOS_LIBRE = true` (en `juego-ajedrez.js`): el estándar dice que el Modo libre no da puntos de perfil, pero el Ajedrez siempre dio ⭐ y puntos la primera vez que se vence cada dificultad y se conservó ese progreso. Cambiar a `false` para cumplir el estándar al pie de la letra. (Mientras `ajedrez` esté en `EN_DESARROLLO` esos puntos no suman al total de nadie.)

## Mapa de niveles
- `niveles-ajedrez.js`: `ETAPAS = crearEtapas({ porEtapa: 100 })` → 3 200 (México) + 19 400 (mundo) = **22 600**; el mundo y sus países salen ocultos hasta terminar los 32 estados (lo hace `mapa-niveles.js`).
- Listas de **5 columnas** (`columnas: 5`). Los niveles sin contenido muestran 🚧 y avisan «Los niveles todavía no están creados». «Modo libre» ya no está en el mapa.
- Progreso `{ max, hecho }` en `localStorage` `ajedrez:mapa`, sincronizado con `conectar("ajedrez-mapa", …)` (gana el más alto).
- Prueba: `index-ajedrez.html?dev=1` → al tocar un nivel sin contenido aparece «✅ Superar».
- NO cambiar el orden de estados/países ni `porEtapa` tras publicar.

## Fin de nivel / de partida
- Ventana **sobre el tablero** (sin velo; `.sobre-tablero`): «Siguiente nivel ▶» (grande, verde) · Repetir nivel · Niveles · 👁️ Ver tablero. Al terminar la etapa (nivel 100, 200…) el botón grande es «Ver el mapa» (el agua sube). En el último nivel con contenido el grande es «Repetir nivel». Derrota: «Reintentar». Modo libre: «Jugar otra vez» y «⚙️ Cambiar dificultad».

## Niveles hechos (etapa 1, Quintana Roo)
1-3 peón · 4-6 torre · 7-9 caballo · 10-12 alfil · 13-15 dama (el 15: jaque mate) · 16-18 rey (el 18: enroque) · 19-21 primeras partidas (dificultad 1, 1 y 2).
Son ejercicios de uso, no partidas: solo mueven las blancas. Datos en `LISTA` de `niveles-ajedrez.js`. Dificultad contra la computadora: **5 niveles** (Principiante, Novato, Aficionado, Avanzado, Maestro; antes eran 8) (`NIVELES` en `juego-ajedrez.js`).

## Qué estaba desactualizado y qué se cambió (21 nov 2026, `sw.js` VERSION 195)
- Menú principal = mapa → ahora capa «Comenzar» sobre el juego cargado; sin pantalla de menú.
- «🎮 Juegos» → «🎮 Portal de Juegos»; ☰ era `b-gris` y se escondía en el mapa → ahora `b-cielo`, siempre visible, «Pausa/Atrás».
- Botones de dificultad y color dentro de la partida (con `b-gris`) → pantalla de Modo libre.
- Añadido 👤 Iniciar sesión (arriba a la derecha) con `jugador.js` cargado con `import()`.
- Aviso/«Info» con velo oscuro propio → ventana `.pausa-*`. «Nivel superado» con velo → ventana sobre el tablero.
- Mapa en 5 columnas, sin «Modo libre» ni «Salir al mapa». Texto de Info corregido.
- `sw.js`: `niveles-ajedrez.js` faltaba en la lista de archivos sin internet (el juego lo importa) → agregado.
- Se conservó la lógica, las claves de `localStorage` (`ajedrez:nivel`, `ajedrez:color`, `ajedrez:ganados`, `ajedrez:mapa`), `conectar()` y los puntos pendientes.

## Pendiente
- Probar en navegador y **celular real** (no se probó la pantalla): capa «Comenzar», pausa, mapa de 5 columnas, ventana de fin sobre el tablero en vertical y horizontal, y 👤 arriba a la derecha sin tapar la descripción en horizontal con poco alto.
- Niveles del mapa del 22 en adelante (sección 10: primero estándares, después niveles). Plan de contenido: tácticas (mate en 1/2/3, ganar material, defender) con dificultad según `compartido/dificultad-niveles.js`, generadas y verificadas con `ia-ajedrez.js`.
- Puntos/monedas por nivel y por etapa; imagen de tarjeta.

## Cambios del 21 nov 2026 (segunda tanda)
- Pausa: «Reiniciar nivel» sube justo debajo de «Continuar».
- Inicio: partida de Modo libre contra el bot nivel 2 (ver arriba).
- Dificultad: **5 niveles** en lugar de 8. Se conservaron los tres primeros (los niveles 19-21 del mapa usan ia 1, 1 y 2) y los otros dos son Avanzado (antes 6) y Maestro (antes 8). Las ⭐ guardadas en `ajedrez:ganados` con las claves 4 a 8 del esquema viejo ya no corresponden a la misma dificultad (las claves 4 y 5 ahora se leen como Avanzado y Maestro).
