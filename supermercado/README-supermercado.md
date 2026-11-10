# 🛒 Supermercado

Juego de administración en **vista isométrica**: cultiva, cría animales, llena estanterías y atiende clientes.
Tiene dos modos: **Modo infinito** (sin fin) y **Modo niveles** (50 retos).

> Ruta: `supermercado/README.md`
> Archivos actuales: `index-supermercado.html`, `juego-supermercado.js`
> Marcas: ❓ = por decidir · 🔜 = por programar

---

## 1. Idea general

- El jugador camina por su centro comercial, recoge lo que producen los cultivos y animales y lo coloca en las estanterías.
- Los clientes llegan en grupos, toman productos y pagan en la caja.
- Con el dinero se compran más productos, más terreno, la granja y empleados que automatizan el trabajo.
- Vista **isométrica** 🔜, con la zona de alrededor decorada como **tramos de carretera** 🔜.

---

## 2. Modo infinito

### 2.1 Inicio de la partida
- Dinero: **$0**.
- Edificio de supermercado con:
  - 1 estantería (jitomate)
  - 1 caja de cobro
  - 1 computadora (mejoras y compras; también pedidos de paquetes)
- Zona de cultivos con la **zona de jitomates ya construida**.
- Llegan **3 clientes a la vez**.
- La **granja** empieza sin comprar.

### 2.2 Compras y ampliaciones

| Concepto | Precio inicial | Aumento por cada compra |
|---|---|---|
| Comprar la granja | 1000 | — |
| Agrandar mercado | 500 | +250 |
| Agrandar terreno (patio de cultivos) | 500 | +250 |
| Agrandar granja | 500 | +250 |
| Mejorar zona para +2 estanterías | 250 por zona | ❓ ¿sube? |

✅ Confirmado: **cada ampliación comprada sube en 250 el precio de la siguiente** (500 → 750 → 1000…).
❓ Falta decidir si cada tipo (mercado, terreno, granja) lleva su propio contador o es uno global.

### 2.3 Estanterías
- **Una estantería por producto** (cada producto tiene su propia estantería).
- Al ampliar el mercado se agrega una zona nueva; en cada zona caben **6 estanterías**.
- Cada zona se puede mejorar (**$250 por zona**) para colocar **2 estanterías más** (8 en total).
- Se puede comprar **un empleado por estantería** que la rellena.

### 2.4 Clientes que llegan a la vez

| Productos desbloqueados | Clientes por tanda |
|---|---|
| Inicio | 3 |
| 8 | 5 |
| 15 | 7 |
| 25 | 9 |
| 30 | 11 |
| 35 | 13 |
| 40 | 15 |

- **Límite del juego: 60 productos.**

---

## 3. Productos

### 3.1 Verduras (15)
Cada una más cara que la anterior. Las que ya tienes definidas:

1. Jitomate *(ya construida al inicio)*
2. Cilantro
3. Chile
4. Zanahoria
5. Papa
6. Calabacita (la verde, como en México)
7. Chayote
8. Brócoli
9. Cebolla
10. Lechuga
11. Pepino
12. Elote
13. Ajo
14. Betabel
15. Nopal

> El orden va de más barata a más cara. Es provisional: se puede reordenar al ajustar precios.

### 3.2 Frutas y cultivos (15)
Se desbloquean en la **misma zona de cultivos** que las verduras. Aunque algunos no son árboles, todos funcionan como cultivo.

1. Manzana
2. Plátano
3. Mango
4. Granada
5. Sandía
6. Melocotón
7. Uvas
8. Fresas
9. Caña de azúcar
10. Arroz
11. Champiñones
12. Naranja
13. Limón
14. Piña
15. Aguacate

> También van de más barato a más caro (provisional).

### 3.3 Cultivos: reglas
- Cada zona de cultivo está **rodeada de una valla**.
- Al **tocar o acercarse a la valla** se recolecta el producto.
- Mejoras: **producir más rápido** (solo velocidad).
- 🔜 **Calidad**: además del producto normal, a veces sale con calidad **bronce, plata u oro** (de menor a mayor), que da un pequeño aumento en el dinero cobrado.
  - ❓ Probabilidad de cada calidad y porcentaje de bono de cada una.

### 3.4 Productos por paquete (se piden desde la computadora)
Ejemplos: **cereal, golosinas, chocolates, pan, pastel**, y los que se agreguen. (La leche **no** va aquí: solo viene de las vacas.)
- Se compran en la **PC** y llegan en **paquetes**.
- Empleados específicos:
  - **Empleado comprador:** pide paquetes por ti.
  - **Empleado repartidor:** rellena las estanterías con lo comprado desde la PC.

---

## 4. Granja

Terreno **al norte del patio**, pegado al centro comercial. Se compra por **$1000** en 🛠️ Mejoras (al comprarlo se abre el terreno y la calle se corre hacia el norte). Tiene un **corral por producto**, con valla, animales que caminan y su estantería fija.

> ✅ Implementado en `juego-supermercado.js`. Todos los números están al inicio del archivo (`GRANJA_DEF`, `CARGA_*`, `COSTOS_*`) para ajustarlos.

### 4.1 Producción continua (barata)
| Animal | Produce | Notas |
|---|---|---|
| Gallinas | Huevo 🥚 | Corral $200 · sale 1 cada 8 s · empleado $300 |
| Vacas | Leche 🥛 | Corral $400 · sale 1 cada 12 s · empleado $400 |

Mejora «más rápido»: 4 niveles ($150, $300, $600, $1200); cada uno multiplica el tiempo por 0.8.

### 4.2 Producción por carga (cara)
Cuestan **$2000** cada una. En lugar de entregar producto continuamente, entregan una **carga cada 10 minutos**:

| Zona | Animal | Produce |
|---|---|---|
| Pollo | Gallina | Pollo |
| Res | Vaca | Carne de res |
| Cerdo | Cerdo | Tocino |

- Cada carga inicial: **30 unidades**, que el jugador (o empleado) transporta poco a poco a la estantería. Al comprar el corral ya viene la primera carga lista.
- Si no recoges, se acumulan hasta **3 cargas** y luego el reloj se detiene.
- Mejoras (4 niveles cada una): **más carga** (+10 por nivel: $800, $1500, $2500, $4000) y **menos espera** (−1:30 por nivel, de 10:00 a 4:00: mismos precios).
- Empleado de cada corral de carga: $800.
- Pollo 🍗 $18 · Res 🥩 $24 · Tocino 🥓 $20 (precios de venta provisionales; huevo $8, leche $10).

### 4.3 Transporte
- Al inicio lo hace **el jugador**.
- Después se contratan **empleados de granja** que recogen y transportan todo a las estanterías.

---

## 5. Empleados

| Empleado | Función |
|---|---|
| De estantería (1 por estantería) | Rellena su estantería con lo producido |
| De granja | Transporta la producción de la granja |
| Comprador de paquetes | Hace los pedidos de la PC |
| Repartidor de paquetes | Coloca en estantería lo pedido en la PC |
| Cajero | Cobra en la caja (ya existe en la versión actual) |

---

## 6. Modo niveles

- **50 niveles** con misiones distintas.
- Misiones típicas: llegar a cierto número de productos, juntar cierta cantidad de dinero.
- 🔜 Por definir: lista de misiones, recompensas, condiciones de inicio de cada nivel, si hay límite de tiempo y si se desbloquean en orden.

---

## 7. Vista isométrica y entorno 🔜

- Pasar el dibujo del juego de vista cenital/plana a **isométrica** (rombos de 2:1).
- Alrededor del centro comercial: **tramos de carretera** (calles, líneas, banquetas, quizá autos decorativos).
- La cámara sigue al jugador (la pantalla no cambia de tamaño).
- Movimiento: tocar/arrastrar o flechas/WASD (el movimiento se convierte a coordenadas isométricas).

---

## 8. Pendientes de decisión (resumen)

0. **Agrandar granja ($500, +250):** hoy hay 5 corrales y espacio para 6, así que todavía no hace falta. ¿Qué debe dar al ampliar? (ideas: más animales por corral para producir más, corrales extra de otros animales como patos, cabras u ovejas).
1. Contador de precios de ampliaciones: por tipo o global.
2. Probabilidades y bono de precio de las calidades (bronce, plata, oro).
3. Cuáles son los 60 productos finales (30 cultivos + 5 de paquete + 5 de granja = 40; faltan 20 más).
4. Precios de venta de cada producto y precios de empleados.
5. Detalle de los 50 niveles.
6. Guardado de partida (local + nube con `compartido/progreso.js`, como los otros juegos).

---

## 9. Estado

- [x] Prototipo base (jardines, estantería, clientes, caja, mejoras, admin)
- [x] Vista isométrica y carreteras
- [ ] Modo infinito con las reglas de este documento
- [x] Granja: terreno, 5 corrales, animales, huevo/leche, cargas de pollo/res/tocino, empleados y mejoras
- [x] Botón ⏩ de velocidad (x1 a x8)
- [x] Estándar del repo: «🎮 Juegos» y «☰ Pausa», chip de monedas dorado, fondo de madera clara/oscura
- [ ] Agrandar granja
- [ ] Productos por paquete y PC
- [ ] Calidades
- [ ] Modo niveles (50)
