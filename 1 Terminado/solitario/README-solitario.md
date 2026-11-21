# Solitario (`solitario/`)

Klondike clásico para el portal. Id de puntos: `solitario`. Está en `EN_DESARROLLO` (`juegos.js`), así que sus puntos no suman al total del perfil.

> Las partes marcadas **(propuesta)** son cifras o reglas que se calcularon aquí y todavía no están confirmadas ni aplicadas en el código.

## 1) Fila nueva para la tabla «Mapa de archivos»

| `solitario/index-solitario.html`, `juego-solitario.js`, `niveles-solitario.js`, `victoria-solitario.js`, `estilos-solitario.css`, `mesa-solitario.css`, `README-solitario.md` | Juego «Solitario» (id de puntos `solitario`). `index-solitario.html` trae el menú principal estándar (madera clara/oscura, 🎮 Portal de Juegos, ☰ Pausa/Atrás, ♾️ Modo libre · ▶ Continuar · 📋 Niveles · ℹ️ Info, chip de monedas y 👤 Iniciar sesión). `juego-solitario.js` tiene las reglas, el arrastre, «Rellenar todo», monedas, el boost ⚡ de deshacer, el Modo libre, el mapa (`compartido/mapa-niveles.js` con `crearEtapas({ porEtapa: 100 })`) y la pausa (`compartido/menu-pausa.js`). `niveles-solitario.js` guarda las 5 dificultades y las semillas de los niveles creados. `victoria-solitario.js` es la cascada de cartas al ganar. Progreso en `localStorage`: `solitario-niveles`, `solitario-tiempos`, `solitario-monedas`, `solitario-nube` (sincronizado con `conectar()`) y `solitario_libre_v1` (Modo libre) |

## 2) Resumen del juego

- **22 600 niveles**: 32 estados de México + 194 países, **100 niveles por estado o país** (`crearEtapas({ porEtapa: 100 })`). El mundo viene armado pero oculto hasta terminar los 32 estados; después los países se abren de uno en uno.
- **5 niveles de dificultad** (sección 3).
- **Monedas** (sección 6) para comprar boosts.
- **Boost ⚡ Deshacer**: regresar movimientos sin límite en un nivel difícil.
- **Boost 💡 Pistas**: pistas limitadas por nivel.
- **Modo libre**: repartos al azar sin fin, sin monedas ni puntos.

## 3) Las 5 dificultades

Qué cambia en cada una lo decide `DIFICULTADES` en `niveles-solitario.js`:

| Clave | Nombre | Color del botón | Robas | Reciclajes del mazo |
|---|---|---|---|---|
| `facil` | 🟢 Fácil | `b-verde` | 1 carta | sin límite |
| `media` | 🟡 Medio | `b-oro` | 1 carta | 3 |
| `dificil` | 🔴 Difícil | `b-rojo` | 3 cartas | sin límite |
| `muydificil` | 🟣 Muy difícil | `b-morado` | 3 cartas | 3 |
| `experto` | ⚫ Experto | `b-azuloscuro` | 3 cartas | 1 |

Las tres primeras ya existían (antes «Normal» se llamaba así; ahora «Medio»). **Muy difícil y Experto son una propuesta.**

### Reparto de las dificultades en el mapa (propuesta)

Este juego se aparta del reparto estándar de 3 tipos (`ESTANDARES-juegos.md`, sección 8) porque tiene 5. Igual que el estándar, el cambio es lineal por tramos de 100 niveles, revuelto con semilla fija e igual para todos:

| Tramo de 100 niveles | 🟢 Fácil | 🟡 Medio | 🔴 Difícil | 🟣 Muy difícil | ⚫ Experto |
|---|---|---|---|---|---|
| Primeros 100 (1-100) | 50 % | 40 % | 10 % | 0 % | 0 % |
| Últimos 100 (22 501-22 600) | 15 % | 30 % | 30 % | 15 % | 10 % |
| **Total en 22 600 niveles** | **7 345** | **7 910** | **4 520** | **1 695** | **1 130** |

Los fáciles y medios son el 67.5 % del juego; difíciles o más, el 32.5 % (7 345 niveles). El arranque es igual al estándar (sin muy difíciles ni expertos).

Como todo lo del estándar: **no cambiar las cifras ni la semilla después de publicar**.

## 4) Menú principal (hecho)

Sigue `ESTANDARES-juegos.md`, secciones 1, 2, 7 y 9, y la especificación de `compartido/inmersivo.css`.

- **Fondo y botones fijos:** `<html class="inmersivo">`, madera clara/oscura (`fondo-madera.js`, con el script anti-parpadeo en el `<head>`), `🎮 Portal de Juegos` (`b-azuloscuro`) y `☰` (`b-cielo`) arriba a la izquierda en `.nav-juego`, `⛶` abajo a la derecha, 🌙/☀️ abajo a la izquierda.
- **Arriba a la derecha:** chip dorado de monedas (`chip chip-monedas` con la moneda dibujada en CSS) y, siempre al final, `👤 Iniciar sesión` (`b3d txt b-azul`). Solo aparece en el menú; en partida se oculta para dejar sitio a los marcadores.
- **Botones del menú, en este orden:** `♾️ Modo libre` (`b-morado`, grande) · `▶ Continuar · nivel N` (`b-verde`, grande; N = primer nivel sin superar) · `📋 Niveles` (`b-azul`, grande; abre el mapa en la etapa donde vas) · `ℹ️ Info` (`b-cielo`, chico). No hay botón Mapa ni Salir.
- **☰:** oculto en el menú principal; dice «Pausa» en partida y «Atrás» en el mapa, el Modo libre y los resultados (`menuBoton()`).
- **Modo libre:** pantalla propia con la fila «Dificultad» (elegido `b-oro on`, resto `b-cielo`), nota de lo que cambia, «🏆 Récord» (mejor tiempo y partidas ganadas de esa dificultad) y `▶ Jugar`. Recuerda la última dificultad. No da monedas ni puntos.
- **Niveles:** `compartido/mapa-niveles.js` con los 22 600 niveles. Hoy solo hay 500 creados (niveles 1-500, del plan viejo de 3 tipos); tocar uno no creado avisa «🚧 Los niveles todavía no están creados». Al terminar el nivel 100, 200… el botón ➡️ lleva al mapa con el agua subiendo.
- **Pausa** (`compartido/menu-pausa.js`): `▶ Continuar · 🔄 Reiniciar nivel · 📋 Niveles · 🚪 Menú principal`. En Modo libre solo `▶ Continuar` y «Salir a elegir tablero». El reloj no cuenta el tiempo en pausa.

## 5) Disponibilidad de deshacer y pistas por dificultad (propuesta, por confirmar)

| | 🟢 Fácil | 🟡 Medio | 🔴 Difícil | 🟣 Muy difícil | ⚫ Experto |
|---|---|---|---|---|---|
| **↩️ Deshacer** | sin límite | sin límite | 1 vez seguida; ⚡ boost para sin límite | igual | igual |
| **💡 Pistas** | sin límite | sin límite | limitadas por nivel; 💡 boost para tener más | igual | igual |

- Fáciles y medios: botón de retroceder y pistas **completamente disponibles**.
- Difíciles o más: ahí entran los boosts, que cuestan monedas.

Hoy el código limita el deshacer a «1 vez seguida» en **todos** los niveles y el boost ⚡ cuesta 10 🪙; la tabla de arriba todavía no está aplicada.

## 6) Economía de monedas (propuesta)

### Qué se calculó

Se quiere que quien llega hasta el final pueda comprar muchos boosts sin que sobren de sobra. La cuenta usa la distribución de la sección 3.

**Cuántas monedas se ganan por nivel (solo la primera vez que se supera):**

| Dificultad | Premio |
|---|---|
| 🟢 Fácil | 10 🪙 |
| 🟡 Medio | 15 🪙 |
| 🔴 Difícil | 25 🪙 |
| 🟣 Muy difícil | 35 🪙 |
| ⚫ Experto | 50 🪙 |

Repetir un nivel ya superado y el Modo libre no dan monedas (así no se puede repetir sin límite). Hoy el código da 50 🪙 fijos por nivel superado, sin importar la dificultad.

**Precios (para usar en niveles 🔴 o más):**

| Boost | Qué hace | Precio |
|---|---|---|
| ⚡ Deshacer | Deshacer sin límite en ese nivel | 30 🪙 |
| 💡 Pistas | +3 pistas en ese nivel | 15 🪙 |

**Resultado con los 22 600 niveles superados una vez:**

| Concepto | Monedas |
|---|---|
| Ingreso total | ≈ 420 900 |
| Niveles 🔴 o más (7 345) con ⚡ + 💡 en **todos** (45 🪙 c/u) | ≈ 330 500 |
| Sobrante (≈ 21 % del ingreso) | ≈ 90 400 |
| Con ⚡ en todos y 💡 en la mitad | ≈ 275 400 |

Eso equivale a poder usar **un deshacer ilimitado y pistas en todos los niveles difíciles del juego** (o, en bruto, ≈ 14 000 boosts ⚡ con todo lo ganado).

### Cómo avanza el saldo

La cuenta se hizo tramo por tramo (226 tramos de 100 niveles) y el saldo **nunca queda en negativo** aunque se compren ⚡ + 💡 en todos los niveles difíciles:

| Tramo | Ingreso del tramo | Niveles 🔴 o más | Gasto si se equipan todos | Saldo acumulado |
|---|---|---|---|---|
| 1 | 1 350 | 10 | 450 | 900 |
| 57 | 1 605 | 21 | 954 | ≈ 44 200 |
| 113 | 1 860 | 32 | 1 458 | ≈ 73 600 |
| 169 | 2 115 | 44 | 1 962 | ≈ 89 000 |
| 226 | 2 375 | 55 | 2 475 | ≈ 90 400 |

Al final el gasto de un tramo supera un poco su ingreso (2 475 contra 2 375), pero las monedas guardadas de antes lo cubren de sobra.

### Ajustes que se pueden mover

- **Más generoso:** subir los premios (por ejemplo, Difícil 30 en vez de 25) o bajar los precios.
- **Más escaso:** subir los precios; con ⚡ 40 y 💡 20 el equipamiento total cuesta ≈ 440 700 y ya no alcanza.
- **Regalo inicial (opcional):** 100 🪙 para estrenar boosts en los primeros difíciles. No está en la cuenta de arriba.
- **Duración del boost (opcional):** que el ⚡ dure hasta superar el nivel, aunque se reinicie, para no cobrar dos veces por el mismo intento. Hoy `nueva()` lo apaga al reiniciar.

Las monedas se gastan, así que su progreso no se une con `unirMaximos`. El código ya guarda monedas **ganadas** (`g`) y **gastadas** (`s`) y se une por el mayor de cada una (`unirSolitario`).

## 7) Pendientes

- Aplicar en el código la sección 5 (deshacer libre en 🟢🟡, límite en 🔴🟣⚫) y la sección 6 (premios por dificultad, precios y premio solo la primera vez).
- Boost 💡 de pistas: no existe todavía (hace falta un buscador de jugada válida, con la pista visible sobre el tablero).
- Pantalla de fin de nivel «sobre el tablero» (sección 6 de los estándares): hoy el resultado sigue saliendo en el mensaje flotante y el botón ➡️ sigue abajo.
- Generar los niveles. Los 500 actuales usan el plan viejo de 3 tipos y se pueden borrar y regenerar mientras el juego esté en `EN_DESARROLLO`. Antes (estándares, sección 10): dejar completas las mecánicas, el comprobador automático de que cada reparto se puede ganar con las reglas de su dificultad y el reparto de la sección 3.
- Confirmar las reglas de Muy difícil y Experto, y si los niveles 🔴🟣⚫ usan las dificultades tal cual están en el Modo libre.
- Las claves de `localStorage` `solitario-niveles`, `solitario-tiempos`, `solitario-monedas` y `solitario-nube` no terminan en `_v1`, así que la copia de seguridad de `compartido/almacen.js` (que solo copia claves con `_v1`, `_v2`…) no las incluye. Renombrarlas pide una migración para no perder el progreso de quien ya juega.
- Quitar de `estilos-solitario.css` las reglas que quedaron sin uso (`.nivel*`, `.rejilla-niveles`, `.nivel-pag`, `.leyenda`) de la lista de niveles vieja.

## 8) Nota para la sección «Estado»

- Solitario (menú principal estándar, `sw.js` `VERSION` por subir a 187): `index-solitario.html` y `juego-solitario.js` pasan al menú de la sección 7 (♾️ Modo libre · ▶ Continuar · 📋 Niveles · ℹ️ Info), con 🎮 Portal de Juegos, ☰ Pausa/Atrás, chip de monedas, 👤 Iniciar sesión, mapa con 22 600 niveles y pausa estándar. Se quitaron la «Partida rápida», la lista de niveles por páginas y los botones propios de salir y de iniciar sesión. Se probó en Chromium con pantalla de celular vertical (390 × 780): menú, Modo libre, partida, pausa, mapa e Info funcionan y sin errores de JavaScript. NO se probó en horizontal, en celular real, con sesión de Google ni con las imágenes de madera. Pendiente: lo de la sección 7 de este README.
