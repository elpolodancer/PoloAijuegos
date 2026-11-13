## Notas «Estado» (pegar en README-granjafeliz.md; reemplazan lo viejo de meta/tiempo, precios, «Nivel 1/2/3» y «Decisiones confirmadas» de costos)

### Sesión 1 — metas + medallas (base = Farm Frenzy 1)
- Sin perder por tiempo: cada nivel trae `oroSeg` y `plataSeg` (oro 3★, plata 2★, completado 1★; monedas 45/30/15).
- `NIVELES[n].metas` = lista; el nivel termina al cumplir TODAS. Tipos: `dinero` (ventas del camión), `producto` (unidades recogidas al almacén), `animal` (vivos a la vez), `edificio` (construido).

### Sesión 2 — condiciones de inicio y venta de animales
- `construidos: [ids]`, `regalo: ["gato","perro"]`, además de `dineroInicial`, `aguaInicial`, `animales`, `mejoras`.
- Zona 💲 en cada botón de compra: vende un animal por `VENTA_ANIMAL` (0.5) × precio. En la versión 1 también se venden a la mitad ($50 / $500 / $5,000), así que coincide.

### Sesión 3 — precios de la versión 1 y niveles 1-10 (14 nov 2026)
Fuente: guía de fans de Farm Frenzy 1 (Cyberly, Sandy L., 2008). Son cifras de una guía, no del juego mismo.
- **Animales:** gallina $100, oveja $1,000, vaca $10,000 (antes 100 / 10,000 / 100,000). El **pavo no existe** en la versión 1: se quedó en $1,000, por decidir si se quita.
- **Productos (valor):** huevo 10, polvo 20, pastelito 80 (antes «Pan» $100, ahora «Pastelito» 🧁), lana 100, hilo 200, tela 800, leche 1,000. Los **pesos** no cambiaron (no existen en el original). Faltan mantequilla ($2,000) y queso ($8,000).
- **Mejoras:** almacén $150/$500/$1,000/$2,000; camión $300/$800/$1,500/$5,000; pozo $300/$600/$1,200/$5,000 (el pozo aún no se aplica en el juego). Las capacidades y tiempos siguen siendo propios.
- **Edificios (costos propios por edificio, `EDIFICIOS[id].costos`):** planta de polvo $200→$600, panadería $400→$1,200, hilandería $2,000→$6,000, tejeduría $4,000→$12,000. Los lotes 1 a 5 coinciden con el original. **Cambio de nombres:** el id `panaderia` ahora se llama «Planta de polvo» 🏭 y el id `horno` se llama «Panadería» 🧁 (solo el texto; los ids no cambian). `MEJORAS.fabrica1/2` ya no tienen `costo`, solo `lote`.
- **Gato** $2,500 (antes $1,000). El **perro** de la versión 1 cuesta $2,600 y se compra una vez; aquí sigue en $100 por llamada (por decidir).
- **Niveles 1-10 = niveles 1-10 de la versión 1** (metas, dinero y animales de inicio, y oro/plata). «Pato» = gallina, «cupcake» = pastelito, «egg solids» = polvo. Las plantas se construyen dentro del nivel (en el original se compran en una tienda con estrellas). El nivel 9 empieza sin animales y con gato; el 8 empieza con una oveja (véndela por $500).
- **Calendario de osos** (`osos.horario`, nuevo): los osos caen en los segundos de la guía (repetir un número = dos a la vez); al acabarse la lista siguen cayendo cada `osos.cada` segundos. Sin él el dinero de los niveles 5-9 no alcanzaba, porque en el original las jaulas ($100) son el ingreso principal.
- **Otros campos nuevos:** `perro: false` (oculta el botón 🐕; los niveles 1-10 no lo tienen) y `pista: "texto"` (consejo de tutorial de 7 s debajo de las metas al empezar).
- **Ajustes míos para que funcione:** oso enjaulado pesa **10** (antes 15: no cabía en el camión base de 10) y vale $100; el oso se captura con **3** toques (antes 6). Polar y panda no existen en la versión 1: $200 / $300 y pesos 25 / 30 son míos.
- **Tiempos de oro/plata:** niveles 5-8 con los del original; 1-4, 9 y 10 más apretados porque el juego es más ágil (en el nivel 1 un jugador automático gana en ~9 s y el original da oro a los 60 s). Quedaron: N1 40/90 · N2 70/130 · N3 100/160 · N4 150/220 · N5 150/240 · N6 270/330 · N7 240/340 · N8 170/240 · N9 200/280 · N10 120/200.
- **Pruebas en Node** (juego real, DOM falso): un jugador automático (2.5 y 1.5 toques/s, 3 partidas por nivel) ganó los 10 niveles en todas las corridas (N6 ~200-250 s es el más largo; N1 ~9 s el más corto); 35 comprobaciones de precios, costos, calendario de osos, regalos, venta y metas, todas bien. El jugador automático es mejor que una persona novata: **falta probarlo con personas y ver el dibujo en pantalla**, sobre todo la pista de 7 s y los nombres nuevos de edificios.
- Se quitó el **nivel 3 de pruebas** (todos los animales, osos polar/panda, gato): ya no hay un nivel para probar vaca, tejeduría y osos grandes hasta que existan los niveles 11+.

### Siguiente (paso 6)
- `compartido/dificultad-niveles.js` (hay que subirlo) y el generador de niveles 11 a 22,600; luego queso/mantequilla, pozo con mejoras, modo libre, tienda y boosts.
