<!-- Ruta: imperio/README.md (en el repo, guárdalo con ese nombre dentro de la carpeta imperio) -->
# 🏛️ Imperio

Estrategia isométrica estilo Age of Empires. **Tú eres siempre el equipo azul.** Frente a ti hay un castillo destruido; si lo reconstruyes antes que los rojos, ganas.

> **Estado.** Este documento describe el juego completo. Cada sección marca qué ya existe (✅) y qué falta por hacer (🔜), para que sirva también de plan de trabajo.

## La meta

Al final de la partida el jugador tendrá construido algo bastante grande: un imperio con minas, huertos, defensas y tropas, alrededor de un castillo reparado.

- El **castillo destruido** está junto a tu base. Para dejarlo terminado necesitas juntar y entregar: 🔜
  | Material | Cantidad |
  |---|---|
  | 🪵 Madera | 1000 |
  | 🪨 Piedra | 1000 |
  | 🟡 Oro | 500 |
  | 🟠 Cobre | 500 |
  | 🧥 Piel | 500 |
  | 🥩 Carne | 500 |
  | 🥈 Plata | 500 |
  | ⚫ Carbón | 500 |
- **Ganas** cuando tu castillo queda reconstruido. **Pierdes** si el enemigo termina el suyo antes.
- **No hay límite de tiempo.**
- Puedes atacar y hasta destruir el castillo enemigo, pero eso **no te hace ganar**: solo lo retrasa. Para ganar tienes que reconstruir el tuyo.

## Cómo se empieza

- ✅ Empiezas con **250 monedas** y tu personaje junto al castillo destruido.
- ✅ A un lado del castillo hay un **⛺ refugio**. Las tropas se crean ahí: toca el refugio y elige Recolector, Constructor o Guerrero ($10 cada uno). Salen por su lado sur y caminan a su punto de reunión.
- ✅ Arriba a la izquierda están los botones **🎮 Juegos** y **☰ Menú** (pausa: Continuar / Salir), y a su derecha la barra de recursos: 🪙 monedas, 🥈 plata, 🟠 cobre, ⚫ carbón, 🪵 madera, 🧶 fibra, 🥩 carne y 🧥 piel (4 columnas × 2 filas).
- ✅ Partidas guardadas (varias), sincronizadas con tu cuenta de Google.

## Tu gente

- ✅ **Personaje**: lo mueves con flechas/WASD o tocando el mapa; pica árboles y rocas, fabrica tablones y construye postes, baúles y cajones.
- ✅ **Recolector** (azul, pico): junta recursos y los lleva al almacén.
- ✅ **Constructor** (naranja, martillo): construye y repara edificios.
- ✅ **Guerrero** (morado, espada y escudo): explora y pelea con animales.
- 🔜 **Tropas de exploración**: grupos que salen a pelear con animales para conseguir carne, piel y otros recursos (los guerreros ya pueden cazar; falta la parte de explorar en grupo con misiones).
- ✅ **Grupos**: hasta 15 tropas por grupo (`MAX_GRUPO`). Al reunirse forman una **fila ordenada** (primero guerreros, luego constructores y al final recolectores). En 🎯 los grupos son cuadrados de 4 columnas; con **Seleccionar grupo** tocas el mapa para mandarlo. Al tocar una tropa puedes elegirle grupo (o crear uno nuevo). Tarea de juntar madera o minerales. 🔜 Formar grupos mixtos a gusto (por ejemplo 10 guerreros, 1 constructor y 8 recolectores) con un editor de grupos.

## El mapa

- ✅ **98 × 98 casillas** (5 veces el área del mapa anterior, que era de 44 × 44). Se cambia en `AREA_X` al inicio de `juego-imperio.js`. Las partidas viejas se abren con su tamaño de 44 × 44.
- ✅ Tu base está arriba a la izquierda. Quedan reservados 4 sitios para bases enemigas (esquinas y centro): ahí no hay agua y siempre hay llanura, y se les tiende un puente de tierra si el mar las dejara en una isla.
- ✅ **Sin animales hostiles (oso, lobo, guepardo) a menos de 15 casillas de donde apareces.** Los animales que huyen (conejo, lagartija, gallina) sí pueden estar más cerca.

## Recursos y minas

- ✅ Árboles y rocas por el mapa.
- ✅ **75 minas** repartidas por todo el mapa, separadas por al menos 6 casillas (nada de racimos) y siempre alcanzables a pie. Cada base tiene al menos 2 minas a 9–18 casillas.
- ✅ **Cada mina guarda 500 de material: 10 % oro (50), 20 % plata (100), 30 % cobre (150) y 40 % carbón (200).** Al picarla sale un material al azar en proporción a lo que le queda, y al agotarla desaparece. Cada viaje de un recolector lleva un solo material.
- ✅ **Por qué 75:** cada castillo pide 500 de oro y cada mina solo da 50, o sea 10 minas por castillo. Para 5 castillos (el tuyo y 4 enemigos) son 50 minas, más 50 % de margen = 75. Esas 75 dan 3750 de oro, 7500 de plata, 11 250 de cobre y 15 000 de carbón. Si cambias `CASTILLOS`, `MINA_TOTAL` o `MINA_REPARTO`, el número de minas se recalcula solo.
- ✅ **Plata** sale de las minas. 🔜 **Fibra** todavía no se puede conseguir (la barra de recursos la muestra en 0).
- 🔜 **Replantar árboles** con semillas: tardan **5 minutos** en dar frutos.

## Edificios

| Edificio | Qué hace | Estado |
|---|---|---|
| ⛺ Refugio | Aquí se crean las tropas | ✅ |
| 🚩 Poste de imperio | Marca la zona donde puedes poner cofres | ✅ |
| 📦 Baúl y cajones | Guardan materiales | ✅ |
| Almacén | Recibe lo que traen los recolectores | ✅ |
| Torre | Dispara a los enemigos ($120) | ✅ |
| 🏹 Torre de arqueros | $150. Dispara flechas a 9 casillas (10 de daño cada 0.7 s) a enemigos y animales hostiles, y ve más lejos en el mapa (11 casillas) | ✅ |
| 💣 Cañón con ruedas | $250. Dispara a 8 casillas (45 de daño cada 2.5 s) con daño en área: a los cercanos al impacto les hace el 60 % | ✅ |
| 🏥 Hospital | $200, ocupa 2×2. Cura 4 de vida por segundo a tus tropas a 5 casillas | ✅ |
| 🧱 Muros | De madera ($15, vida 150) o de piedra ($30, vida 400): bloquean el paso y se unen con los vecinos | ✅ |
| ⚒️ Herrero | $220, ocupa 2×2. Forja 5 espadas en orden (madera $80, cobre $160, plata $300, oro $500, diamante $800): cada una sube +25 % el golpe del personaje y las tropas | ✅ (🔜 herramientas y costo en materiales) |

### Herrero y mejoras
- ✅ El botón **🏗️ Edificios** (debajo de 🛠️) muestra todos los edificios en cuadrados de colores; los que no alcanzan por dinero llevan 🔒. Un Constructor libre los construye y puede hacer varias obras en fila.
- Entre las herramientas habrá **espadas de 5 niveles**: cada una cuesta más material que la anterior y es mejor.
- **Al mejorar el herrero mejoran las tropas.**
- Los demás edificios también se podrán mejorar poco a poco.

## Los rojos (el enemigo) 🔜

- Son **bots un poco lentos y torpes**, pero tienen **lo mismo que tú**: un castillo que están reconstruyendo y un imperio que crece. Siempre son los rojos.
- También **recogen recursos del mapa**.
- Por el mapa encontrarás **grupos de tropas rojas** que te atacan o te persiguen. Se mueven a tu misma velocidad y **a veces deciden pelear y a veces retirarse**.
- ✅ Hoy el mapa ya tiene animales con conducta propia: oso (te sigue), lobos (en manada), guepardo (decide pelear o huir) y animales que huyen (conejo, lagartija, gallina).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index-imperio.html` | Pantalla, botones y estilos |
| `juego-imperio.js` | Todo el juego: mapa, unidades, edificios, interfaz y guardado |
| `../compartido/` | Sesión, puntos, progreso en la nube, pantalla completa y estilos comunes (`inmersivo.css` trae los botones 🎮 y ☰) |
