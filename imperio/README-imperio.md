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
- ✅ **Grupos**: hasta 10 tropas por grupo, con tarea de juntar madera o minerales. 🔜 Formar grupos mixtos a gusto (por ejemplo 10 guerreros, 1 constructor y 8 recolectores).

## Recursos y minas

- ✅ Árboles y rocas por el mapa; minerales (carbón, cobre, hierro, oro, diamante) en zonas rocosas, más raros mientras más lejos de la base.
- 🔜 **Minas** con recursos **limitados** (se acaban después de extraerlos), así que habrá varias. Se explotan en dos pasos:
  1. Llevar un **constructor** al punto de mina para que construya la mina.
  2. Enviar **recolectores** a sacar el material poco a poco.
- 🔜 **Plata y fibra** todavía no se pueden conseguir (la barra de recursos ya las muestra, en 0).
- 🔜 **Replantar árboles** con semillas: tardan **5 minutos** en dar frutos.

## Edificios

| Edificio | Qué hace | Estado |
|---|---|---|
| ⛺ Refugio | Aquí se crean las tropas | ✅ |
| 🚩 Poste de imperio | Marca la zona donde puedes poner cofres | ✅ |
| 📦 Baúl y cajones | Guardan materiales | ✅ |
| Almacén | Recibe lo que traen los recolectores | ✅ |
| Torre | Dispara a los enemigos | ✅ |
| 🏹 Torre de arqueros | Defiende y extiende un poco la visión del mapa | 🔜 |
| 💣 Cañón con ruedas | Cuida el reino | 🔜 |
| 🏥 Hospital | Cura a las tropas | 🔜 |
| 🧱 Muros | De madera o de piedra | 🔜 |
| 🔨 Herrero | Fabrica mejores herramientas y armas | 🔜 |

### Herrero y mejoras 🔜
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
