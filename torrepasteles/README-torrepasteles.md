# Torre de pasteles (`torrepasteles`)

Juego estilo «apilar pasteles» de Talking Angela: un pastel se acerca a una torre cuadrada en el centro, hay que detenerlo lo más centrado posible y lo que sobresale se corta (el pastel queda del tamaño de lo que sí se apoyó).

**Estado: menú principal + sistema de estrellas, monedas y boosts.** La partida y los niveles se programan en pasos siguientes.

## Menú principal (hecho)
- Mapa estándar de México con agua y, al terminar México, el mundo (`compartido/mapa-niveles.js`): 226 etapas × 100 niveles = **22 600 niveles**, todavía sin niveles.
- Botones, en este orden: **♾️ Partida libre** (primero, como en Deslizante; usa la opción `botonesAntes` del mapa) · Continuar · nivel N · ℹ️ Info · 🌍 Mundo (cuando se desbloquea).
- **Partida libre**: 5 dificultades (1 Muy fácil … 5 Experto) con récord de pisos por dificultad (`torrepasteles_marcas_v1`). Al elegir una se llama a `iniciarPartida(dif)`, que por ahora solo avisa. **No da estrellas ni monedas.**
- ☰ «Menú principal» solo aparece fuera del menú principal.

## Estrellas, monedas y boosts (hecho; reglas en `logica-torrepasteles.js`)
- **Estrellas por pisos apilados** (`UMBRALES`, provisional): ★1 = 10, ★2 = 20, ★3 = 30 (doradas, siempre visibles como 3 espacios) y **★4 = 50, ★5 = 70, ★6 = 100** (moradas con brillitos, **ocultas**: no se mencionan en el juego y solo aparecen cuando se consiguen). Una estrella conseguida no se pierde.
- **Monedas** al pasar un nivel (`MONEDAS_POR_ESTRELLAS`): 15, 20, 25, 30, 35 y 40 según 1 a 6 estrellas. **Se cobran una sola vez por nivel**: repetirlo o mejorar las estrellas después no da más monedas.
- **Boosts** (`BOOSTS`): 🍰 **Agrandar pastel** (100 monedas) y 🎯 **Precisión mejorada** (10 segundos; precio provisional: 50). Se compran por adelantado en 🎁 (arriba a la derecha) y quedan en la mochila; si se usan sin tenerlos se compran en ese momento (`usar`).
- Pantalla: chip dorado de monedas y 🎁 arriba a la derecha; estrellas bajo el número de cada nivel del mapa (el botón se pone morado con ★4 o más); ventana de resultado `mostrarResultado()`.
- **Para probarlo sin la partida**: abrir `index-torrepasteles.html?prueba` y tocar 🧪 (simula terminar un nivel con X pisos, da 500 monedas o borra los datos).
- Cuando exista la partida: al terminar un nivel, `const res = L.terminarNivel(datos, n, pisos); persistir(res.datos); mostrarResultado(res, n, pisos);` y subir `hecho`/`max` en `torrepasteles_progreso_v1`.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-torrepasteles.html` | Página con el estándar inmersivo (🎮 Juegos, ☰, 🌙/☀️, ⛶) |
| `juego-torrepasteles.js` | Pantalla: mapa, Partida libre, Info, monedas, Boosts, estrellas, resultado y panel de prueba |
| `logica-torrepasteles.js` | Solo reglas (sin `document`): estrellas, monedas sin doble cobro, compra y uso de boosts, guardado |

## localStorage
- `torrepasteles_datos_v1` → `{ v, m: monedas, b: { agrandar, precision }, e: { "nivel": estrellas } }` (un solo objeto: monedas y estrellas se guardan juntas). Aún no se sincroniza con la cuenta.
- `torrepasteles_progreso_v1` → `{ max, hecho }` (nivel más alto abierto / terminado)
- `torrepasteles_marcas_v1` → `{ "1": pisos, … "5": pisos }`
- `torrepasteles_dificultad` → última dificultad elegida

## Pendiente
Partida (movimiento del pastel, corte, torre), velocidad y reglas de cada dificultad, efecto exacto y duración de «Agrandar pastel», umbrales definitivos (y si cambian por nivel: `umbralesDe`), niveles, imagen de tarjeta (`imagenes/torrepasteles.webp` y anotarla en `ARCHIVOS` de `sw.js`), puntos del perfil (`encolarPuntos("torrepasteles", n)`) y sincronizar datos y progreso con la cuenta (`conectar()`; las monedas se gastan, así que necesitan una regla propia como `unirCartera` de Estacionamiento, y no `unirMaximos`).
