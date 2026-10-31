// Ruta: supermercado/juego.js
// «Supermercado»: tienda pequeña y vacía. Compras una estantería y un jardín; en el jardín crecen verduras,
// las recoges y las colocas en las estanterías. Los clientes toman sus productos, van a la caja y pagan.
// Recoger, colocar y comprar lo básico es automático por cercanía. En la zona de mejoras 🛠️ compras
// un empleado de caja, más estanterías y un edificio más grande.

// ---------- Ajustes (cámbialos a gusto) ----------
const MUNDO = { w: 360, h: 560 };   // tamaño del mapa (se escala a la pantalla)
const DINERO_INICIAL = 15;          // alcanza justo para comprar la primera estantería y el jardín
const VELOCIDAD = 150;              // px/s del personaje
const CARGA_MAX = 4;                // productos que puedes cargar a la vez
const ESTANTE_CAP = 5;              // productos que caben en cada estantería
const CRECE_SEG = 4;                // cada cuántos segundos sale una verdura nueva en el jardín
const MADURA_SEG = 1.5;             // lo que tarda en madurar una verdura recién salida
const MAX_CLIENTES = 3;             // clientes a la vez en la tienda
const ESPERA_MIN = 3;               // segundos que tarda en llegar el siguiente cliente (al azar entre MIN y MAX)
const ESPERA_MAX = 6;
const CANT_MIN = 1;                 // unidades de cada producto en la lista de un cliente
const CANT_MAX = 3;
const TOMAR_SEG = 0.7;              // lo que tarda un cliente en tomar un producto de la estantería
const COBRO_SEG = 0.5;              // lo que tarda el cobro de cada producto en la caja
const TRASPASO_SEG = 0.2;           // un producto cada tanto al recoger del jardín / colocar en la estantería
const ALCANCE_ESTANTE = 40;         // distancia (px) a la que colocas productos
const ALCANCE_JARDIN = 22;          // distancia (px) a la que recoges del jardín
const ALCANCE_CAJA = 40;            // distancia (px) a la que cobras tú en la caja
const RADIO = 12;                   // tamaño del personaje

// Costos
const COSTO_PRIMER_ESTANTE = 10;
const COSTO_JARDIN = 5;
const COSTO_EMPLEADO = 30;
const COSTO_ESTANTE_EXTRA = (n) => 15 + 10 * n;   // n = estanterías extra que ya compraste
// Edificio: «top» es hasta dónde llega el edificio por arriba; cada nivel deja 2 estanterías más
const EDIFICIO = [
  { top: 254, costo: 0 },    // nivel 0 (el de inicio)
  { top: 150, costo: 40 },   // nivel 1
  { top: 46, costo: 80 },    // nivel 2
];

// Productos que existen (precio en dólares)
const PRODUCTOS = {
  tomate: { icono: "🍅", precio: 1 },
  zanahoria: { icono: "🥕", precio: 2 },
};
const IDS = Object.keys(PRODUCTOS);

// Lugares del mapa (x, y, w, h en unidades del mapa)
const ESTANTE_W = 120, ESTANTE_H = 44;
const MAX_ESTANTES = EDIFICIO.length * 2;
// La estantería número «i» (0, 1 abajo; 2, 3 en el nivel 1; 4, 5 en el nivel 2)
function rectEstante(i) {
  const fila = Math.floor(i / 2), col = i % 2;
  return { x: col ? 210 : 30, y: EDIFICIO[fila].top + 18, w: ESTANTE_W, h: ESTANTE_H };
}
const JARDIN = { x: 200, y: 372, w: 148, h: 90, cols: 3, filas: 2 };
const CAJA = { x: 12, y: 398, w: 58, h: 34 };
const SLOTS_CAJA = [{ x: 100, y: 415 }, { x: 128, y: 415 }, { x: 156, y: 415 }]; // la fila de la caja
const POS_EMPLEADO = { x: 41, y: 450 };
const MEJORAS_ZONA = { x: 10, y: 486, w: 108, h: 62 };
const PUERTA = { x: 186, y: MUNDO.h + 14 };       // por donde entran y salen los clientes
const PASILLO_X = 180;                            // pasillo central entre estanterías
// Franjas (en y) que ocupan las filas de estanterías: los clientes las cruzan por el pasillo
const BANDAS = EDIFICIO.map((n) => ({ a: n.top + 16, b: n.top + 18 + ESTANTE_H + 2 }));

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const elDinero = document.getElementById("dinero");
const elCarga = document.getElementById("carga");
const elEstante = document.getElementById("estante");
const elClientes = document.getElementById("clientes");
const ovl = document.getElementById("ovl");
const ovlBtn = document.getElementById("ovlBtn");
const panel = document.getElementById("mejoras");
const btnEmpleado = document.getElementById("mejEmpleado");
const btnEstante = document.getElementById("mejEstante");
const btnEdificio = document.getElementById("mejEdificio");

// ---------- Estado ----------
let estado = "inicio";   // inicio | jugando
let dinero = DINERO_INICIAL;
const jugador = { x: 180, y: 360, cara: 1 };
let objetivo = null;     // {x, y}: hacia dónde camina (toque o arrastre)
let tocando = false;
let carga = [];          // ids de productos que llevas
let estantes = [];       // estanterías compradas: { slot, x, y, w, h, producto, items: [] }
const jardin = { comprado: false, parcelas: [], reloj: CRECE_SEG };
let empleado = false;    // ¿ya contrataste al de la caja?
let edificio = 0;        // nivel del edificio
let clientes = [];
let cola = [];           // clientes esperando en la caja, en orden
let espera = 2;          // segundos para que llegue el siguiente cliente
let traspasoT = 0;
let textos = [];
let escala = 1;
let enMejoras = false;
const teclas = {};

for (let i = 0; i < JARDIN.cols * JARDIN.filas; i++) jardin.parcelas.push({ t: -1, id: null }); // t < 0: vacía; si no, segundos creciendo

// ---------- Sonido ----------
let ac = null;
function tono(f, d = 0.1) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

// ---------- Utilidades ----------
const azar = (a, b) => a + Math.random() * (b - a);

function distRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
const cerca = (r, alcance) => distRect(jugador.x, jugador.y, r) <= alcance;
const choca = (x, y) => estantes.some((e) => distRect(x, y, e) < RADIO); // las estanterías no se pueden atravesar

function centroParcela(i) {
  const c = i % JARDIN.cols, f = Math.floor(i / JARDIN.cols);
  return { x: JARDIN.x + ((c + 0.5) * JARDIN.w) / JARDIN.cols, y: JARDIN.y + ((f + 0.5) * JARDIN.h) / JARDIN.filas };
}

const hayPrimerEstante = () => estantes.some((e) => e.slot === 0);
const centroSelector = (e) => ({ x: e.x + 12, y: e.y + e.h / 2 }); // botón ↻ de cada estantería

// Productos que existen en la tienda: los que llevan alguna estantería
function productosExistentes() {
  return [...new Set(estantes.map((e) => e.producto))];
}

function nuevoEstante(slot, producto) {
  estantes.push({ slot, ...rectEstante(slot), producto, items: [] });
}

function siguienteSlot() {
  for (let i = 1; i < MAX_ESTANTES; i++) if (!estantes.some((e) => e.slot === i)) return i;
  return -1;
}

// ---------- Lógica ----------
function mover(dt) {
  let dx = 0, dy = 0;
  if (teclas.arrowleft || teclas.a) dx -= 1;
  if (teclas.arrowright || teclas.d) dx += 1;
  if (teclas.arrowup || teclas.w) dy -= 1;
  if (teclas.arrowdown || teclas.s) dy += 1;
  let paso = VELOCIDAD * dt;
  if (dx || dy) {
    objetivo = null;
    const l = Math.hypot(dx, dy);
    dx /= l; dy /= l;
  } else if (objetivo) {
    const vx = objetivo.x - jugador.x, vy = objetivo.y - jugador.y;
    const d = Math.hypot(vx, vy);
    if (d < 2) { objetivo = null; }
    else { dx = vx / d; dy = vy / d; paso = Math.min(paso, d); }
  }
  if (!dx && !dy) return;
  if (dx) jugador.cara = dx > 0 ? 1 : -1;
  const arriba = EDIFICIO[edificio].top + 14 + RADIO; // no sales del edificio
  const nx = Math.max(RADIO, Math.min(MUNDO.w - RADIO, jugador.x + dx * paso));
  const ny = Math.max(arriba, Math.min(MUNDO.h - RADIO, jugador.y + dy * paso));
  if (!choca(nx, jugador.y)) jugador.x = nx;
  if (!choca(jugador.x, ny)) jugador.y = ny;
}

function cobrarCompra(costo, x, y) {
  dinero -= costo;
  textos.push({ x, y, vida: 1.2, txt: "-$" + costo, col: "#ff8a8a" });
  tono(392, 0.1); setTimeout(() => tono(523, 0.15), 90);
}

// Primera estantería y jardín: se compran caminando hasta ellos
function comprarCosas() {
  const r0 = rectEstante(0);
  if (!hayPrimerEstante() && dinero >= COSTO_PRIMER_ESTANTE && cerca(r0, ALCANCE_ESTANTE)) {
    cobrarCompra(COSTO_PRIMER_ESTANTE, r0.x + r0.w / 2, r0.y + r0.h + 10);
    nuevoEstante(0, "tomate");
  }
  if (!jardin.comprado && dinero >= COSTO_JARDIN && cerca(JARDIN, ALCANCE_JARDIN)) {
    cobrarCompra(COSTO_JARDIN, JARDIN.x + JARDIN.w / 2, JARDIN.y - 6);
    jardin.comprado = true;
    jardin.reloj = CRECE_SEG;
  }
}

function crecerJardin(dt) {
  if (!jardin.comprado) return;
  const ex = productosExistentes();
  jardin.parcelas.forEach((p) => {
    if (p.t >= 0 && !ex.includes(p.id)) { p.t = -1; p.id = null; } // ya no hay estantería de eso: se pierde
    else if (p.t >= 0 && p.t < MADURA_SEG) p.t = Math.min(MADURA_SEG, p.t + dt);
  });
  jardin.reloj -= dt;
  if (jardin.reloj <= 0) {
    jardin.reloj = CRECE_SEG;
    const libres = jardin.parcelas.filter((p) => p.t < 0);
    if (libres.length && ex.length) {
      const p = libres[Math.floor(Math.random() * libres.length)];
      p.t = 0;
      p.id = ex[Math.floor(Math.random() * ex.length)]; // solo crece lo que tiene estantería
    }
  }
}

// Recoger del jardín y colocar en las estanterías, solos y de uno en uno
function traspasos(dt) {
  traspasoT -= dt;
  if (traspasoT > 0) return;
  traspasoT = TRASPASO_SEG;
  const ex = productosExistentes();
  if (jardin.comprado && carga.length < CARGA_MAX && cerca(JARDIN, ALCANCE_JARDIN)) {
    const p = jardin.parcelas.find((q) => q.t >= MADURA_SEG && ex.includes(q.id));
    if (p) { carga.push(p.id); p.t = -1; p.id = null; tono(660, 0.07); }
  }
  for (const e of estantes) {
    if (e.items.length >= ESTANTE_CAP || !cerca(e, ALCANCE_ESTANTE)) continue;
    const i = carga.indexOf(e.producto); // cada estantería solo recibe su producto
    if (i >= 0) { e.items.push(carga.splice(i, 1)[0]); tono(520, 0.07); break; }
  }
}

// Cambiar el producto de una estantería (solo si está vacía)
function cambiarProducto(e) {
  if (e.items.length) {
    textos.push({ x: e.x + e.w / 2, y: e.y + e.h + 12, vida: 1.2, txt: "Primero vacíala", col: "#ffd24d" });
    return;
  }
  e.producto = IDS[(IDS.indexOf(e.producto) + 1) % IDS.length];
  tono(600, 0.08);
}

const hayCajero = () => empleado || cerca(CAJA, ALCANCE_CAJA);

function nuevoCliente() {
  const existentes = productosExistentes();
  if (!existentes.length) return;
  // lista de compra: solo productos que existen en la tienda
  const lista = {};
  const cuantos = Math.min(existentes.length, 1 + Math.floor(Math.random() * 2));
  existentes.slice().sort(() => Math.random() - 0.5).slice(0, cuantos).forEach((id) => {
    lista[id] = CANT_MIN + Math.floor(Math.random() * (CANT_MAX - CANT_MIN + 1));
  });
  const camisas = ["#4aa8ff", "#ff7aa8", "#ffa534", "#c07cff", "#4fd16b", "#ffe14d"];
  const pieles = ["#f5cfa0", "#d9a066", "#a8714a", "#7a4a2e"];
  clientes.push({
    x: PUERTA.x, y: PUERTA.y, estado: "comprando", lista, carrito: [], t: TOMAR_SEG, vel: azar(65, 90), off: azar(-30, 30),
    camisa: camisas[Math.floor(Math.random() * camisas.length)],
    piel: pieles[Math.floor(Math.random() * pieles.length)],
  });
}

function ir(c, d, dt) {
  const vx = d.x - c.x, vy = d.y - c.y;
  const dist = Math.hypot(vx, vy);
  const paso = c.vel * dt;
  if (dist <= paso) { c.x = d.x; c.y = d.y; return true; }
  c.x += (vx / dist) * paso;
  c.y += (vy / dist) * paso;
  return false;
}

// Igual que ir, pero para pasar de una fila de estanterías a otra se cruza por el pasillo del centro
function irPorPasillo(c, d, dt) {
  const cruza = BANDAS.some((b) => (c.y > b.b && d.y < b.a) || (c.y < b.a && d.y > b.b));
  if (cruza) {
    if (Math.abs(c.x - PASILLO_X) > 3) { ir(c, { x: PASILLO_X, y: c.y }, dt); return false; }
    ir(c, { x: PASILLO_X, y: d.y }, dt);
    return false;
  }
  return ir(c, d, dt);
}

const faltante = (c) => Object.keys(c.lista).find((id) => c.lista[id] > 0) || null;

// Estantería de ese producto: la que tenga existencias; si no, la primera que lo lleve
function estanteDe(id) {
  const m = estantes.filter((e) => e.producto === id);
  return m.find((e) => e.items.includes(id)) || m[0] || null;
}

function actualizarClientes(dt) {
  // llega uno nuevo a los pocos segundos de haber espacio (nunca de inmediato)
  if (clientes.length < MAX_CLIENTES && estantes.length) {
    espera -= dt;
    if (espera <= 0) { nuevoCliente(); espera = azar(ESPERA_MIN, ESPERA_MAX); }
  }
  for (const c of clientes) {
    if (c.estado === "comprando") {
      const falta = faltante(c);
      if (!falta) {
        // ya tiene todo: va a la caja (o se va si no alcanzó a tomar nada)
        if (c.carrito.length) { c.estado = "cola"; c.t = COBRO_SEG; cola.push(c); }
        else c.estado = "saliendo";
        continue;
      }
      const e = estanteDe(falta);
      if (!e) { c.lista[falta] = 0; continue; } // ya no hay estantería de ese producto
      const x = Math.max(14, Math.min(MUNDO.w - 14, e.x + e.w / 2 + c.off));
      if (irPorPasillo(c, { x, y: e.y + e.h + 26 }, dt)) {
        c.t -= dt;
        if (c.t <= 0) {
          const i = e.items.indexOf(falta);
          if (i >= 0) {
            e.items.splice(i, 1);
            c.lista[falta]--;
            c.carrito.push(falta);
            tono(700, 0.05);
            c.t = TOMAR_SEG;
          } else c.t = 0.2; // todavía no hay en la estantería: espera
        }
      } else c.t = TOMAR_SEG;
    } else if (c.estado === "saliendo") {
      if (irPorPasillo(c, PUERTA, dt)) c.fuera = true;
    }
  }
  // la fila de la caja: solo cobra el primero, y solo si hay quien cobre (tú junto a la caja o el empleado)
  cola = cola.filter((c) => c.estado === "cola");
  cola.forEach((c, i) => {
    const llego = irPorPasillo(c, SLOTS_CAJA[i], dt);
    if (i !== 0 || !llego || !hayCajero()) return;
    c.t -= dt;
    if (c.t > 0) return;
    if (c.carrito.length) {
      const id = c.carrito.shift();
      dinero += PRODUCTOS[id].precio;
      textos.push({ x: c.x, y: c.y - 30, vida: 0.9, txt: "+$" + PRODUCTOS[id].precio, col: "#7dff9a" });
      tono(880, 0.06); setTimeout(() => tono(1175, 0.08), 60);
      c.t = COBRO_SEG;
    } else c.estado = "saliendo";
  });
  cola = cola.filter((c) => c.estado === "cola");
  clientes = clientes.filter((c) => !c.fuera);
}

// ---------- Mejoras ----------
function costoEstanteExtra() {
  return COSTO_ESTANTE_EXTRA(Math.max(0, estantes.length - 1));
}

function comprarMejora(tipo) {
  if (estado !== "jugando" || !enMejoras) return;
  const x = MEJORAS_ZONA.x + MEJORAS_ZONA.w / 2, y = MEJORAS_ZONA.y - 8;
  if (tipo === "empleado") {
    if (empleado || dinero < COSTO_EMPLEADO) return;
    cobrarCompra(COSTO_EMPLEADO, x, y);
    empleado = true;
  } else if (tipo === "estante") {
    const slot = siguienteSlot();
    if (!hayPrimerEstante() || slot < 0 || Math.floor(slot / 2) > edificio) return;
    const costo = costoEstanteExtra();
    if (dinero < costo) return;
    cobrarCompra(costo, x, y);
    // por defecto lleva un producto que todavía no tenga estantería (se puede cambiar con ↻)
    nuevoEstante(slot, IDS.find((id) => !productosExistentes().includes(id)) || IDS[0]);
  } else if (tipo === "edificio") {
    if (edificio >= EDIFICIO.length - 1) return;
    const costo = EDIFICIO[edificio + 1].costo;
    if (dinero < costo) return;
    cobrarCompra(costo, x, y);
    edificio++;
  }
}
btnEmpleado.addEventListener("click", () => comprarMejora("empleado"));
btnEstante.addEventListener("click", () => comprarMejora("estante"));
btnEdificio.addEventListener("click", () => comprarMejora("edificio"));

function pintarBoton(b, texto, precio, activo) {
  b.querySelector("span").textContent = texto;
  b.querySelector("b").textContent = precio;
  b.disabled = !activo;
}

function actualizarPanel() {
  enMejoras = estado === "jugando" && distRect(jugador.x, jugador.y, MEJORAS_ZONA) <= 4;
  panel.classList.toggle("oculto", !enMejoras);
  if (!enMejoras) return;
  pintarBoton(btnEmpleado, empleado ? "👷 Empleado de caja" : "👷 Contratar empleado de caja", empleado ? "✓" : "$" + COSTO_EMPLEADO, !empleado && dinero >= COSTO_EMPLEADO);
  const slot = siguienteSlot();
  if (!hayPrimerEstante()) pintarBoton(btnEstante, "🗄️ Primero compra la estantería", "", false);
  else if (slot < 0) pintarBoton(btnEstante, "🗄️ Estanterías al máximo", "", false);
  else if (Math.floor(slot / 2) > edificio) pintarBoton(btnEstante, "🗄️ Agranda el edificio para más", "", false);
  else pintarBoton(btnEstante, "🗄️ Estantería nueva", "$" + costoEstanteExtra(), dinero >= costoEstanteExtra());
  if (edificio >= EDIFICIO.length - 1) pintarBoton(btnEdificio, "🏗️ Edificio al máximo", "", false);
  else pintarBoton(btnEdificio, "🏗️ Agrandar edificio (nivel " + (edificio + 1) + ")", "$" + EDIFICIO[edificio + 1].costo, dinero >= EDIFICIO[edificio + 1].costo);
}

function actualizar(dt) {
  mover(dt);
  comprarCosas();
  crecerJardin(dt);
  traspasos(dt);
  actualizarClientes(dt);
  textos.forEach((t) => { t.y -= 28 * dt; t.vida -= dt; });
  textos = textos.filter((t) => t.vida > 0);
}

function actualizarHud() {
  elDinero.textContent = "$" + dinero;
  elCarga.textContent = carga.length + "/" + CARGA_MAX;
  elEstante.textContent = estantes.length ? estantes.reduce((s, e) => s + e.items.length, 0) + "/" + estantes.length * ESTANTE_CAP : "—";
  elClientes.textContent = clientes.length + "/" + MAX_CLIENTES;
  actualizarPanel();
}

// ---------- Entrada ----------
function posicion(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * MUNDO.w, y: ((ev.clientY - r.top) / r.height) * MUNDO.h };
}
lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando") return;
  const p = posicion(ev);
  // botón ↻ de una estantería: cambia su producto (no te mueve)
  const e = estantes.find((q) => Math.hypot(p.x - centroSelector(q).x, p.y - centroSelector(q).y) <= 18);
  if (e) { cambiarProducto(e); return; }
  lienzo.setPointerCapture(ev.pointerId);
  tocando = true;
  objetivo = p;
});
lienzo.addEventListener("pointermove", (ev) => { if (tocando) objetivo = posicion(ev); });
lienzo.addEventListener("pointerup", () => { tocando = false; });
lienzo.addEventListener("pointercancel", () => { tocando = false; });
window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k.startsWith("arrow")) ev.preventDefault();
  teclas[k] = true;
});
window.addEventListener("keyup", (ev) => { teclas[ev.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

ovlBtn.addEventListener("click", () => {
  estado = "jugando";
  ovl.classList.add("oculto");
  tono(440, 0.12);
});

// ---------- Dibujo ----------
function ajustar() {
  const dpr = window.devicePixelRatio || 1;
  const w = lienzo.clientWidth;
  escala = w / MUNDO.w;
  lienzo.style.height = MUNDO.h * escala + "px";
  lienzo.width = Math.round(w * dpr);
  lienzo.height = Math.round(MUNDO.h * escala * dpr);
  ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
}
window.addEventListener("resize", ajustar);

function caja(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function emoji(txt, x, y, tam) {
  ctx.font = tam + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(txt, x, y);
}

function etiqueta(txt, x, y, col, tam = 13) {
  ctx.font = "bold " + tam + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 4; ctx.strokeStyle = "#0008";
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = col || "#fff";
  ctx.fillText(txt, x, y);
}

function persona(x, y, camisa, piel, delantal) {
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.beginPath(); ctx.ellipse(x, y + 12, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = camisa;
  caja(x - 9, y - 4, 18, 18, 7); ctx.fill();
  if (delantal) { ctx.fillStyle = "#ffffffcc"; caja(x - 6, y + 1, 12, 12, 4); ctx.fill(); }
  ctx.fillStyle = piel;
  ctx.beginPath(); ctx.arc(x, y - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2b1a3a";
  ctx.beginPath(); ctx.arc(x - 3, y - 11, 1.4, 0, Math.PI * 2); ctx.arc(x + 3, y - 11, 1.4, 0, Math.PI * 2); ctx.fill();
}

function dibujarSuelo() {
  const top = EDIFICIO[edificio].top;
  // afuera: pasto (ahí crece el edificio cuando lo agrandas)
  ctx.fillStyle = "#9bd27f";
  ctx.fillRect(0, 0, MUNDO.w, MUNDO.h);
  ctx.fillStyle = "#efe3c8";
  ctx.fillRect(0, top, MUNDO.w, MUNDO.h - top);
  ctx.fillStyle = "rgba(0,0,0,.04)";
  const t = 40;
  for (let f = 0; f < MUNDO.h / t; f++)
    for (let c = 0; c < MUNDO.w / t; c++) if ((f + c) % 2 && f * t >= top - 1) ctx.fillRect(c * t, f * t, t, t);
  // paredes y puerta
  ctx.fillStyle = "#b9885a";
  ctx.fillRect(0, top, MUNDO.w, 14);
  ctx.fillRect(0, top, 4, MUNDO.h - top);
  ctx.fillRect(MUNDO.w - 4, top, 4, MUNDO.h - top);
  ctx.fillStyle = "#8f6ad0"; caja(PUERTA.x - 30, MUNDO.h - 14, 60, 14, 4); ctx.fill();
  etiqueta("Entrada", PUERTA.x, MUNDO.h - 26, "#6a4a1a");
}

function dibujarMejoras() {
  const { x, y, w, h } = MEJORAS_ZONA;
  ctx.fillStyle = enMejoras ? "#8fb8ff" : "#b9cdf0";
  caja(x, y, w, h, 10); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#4a6fb5"; caja(x, y, w, h, 10); ctx.stroke();
  etiqueta("🛠️ Mejoras", x + w / 2, y + h / 2, "#fff");
}

function dibujarCaja() {
  const { x, y, w, h } = CAJA;
  ctx.fillStyle = "#5a6577"; caja(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = "#cfd8e6"; caja(x + 4, y + 4, w - 8, h - 8, 4); ctx.fill();
  emoji("🧾", x + w / 2, y + h / 2 + 1, 18);
  if (empleado) {
    persona(POS_EMPLEADO.x, POS_EMPLEADO.y, "#d9534f", "#d9a066", true);
  } else if (cola.length) {
    etiqueta("¡Cobra aquí!", x + w / 2, y - 10, "#ffd24d");
  }
}

function dibujarEstantes() {
  // lugar de la primera estantería, mientras no se compra
  if (!hayPrimerEstante()) {
    const { x, y, w, h } = rectEstante(0);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = dinero >= COSTO_PRIMER_ESTANTE ? "#2e9d4a" : "#999";
    caja(x, y, w, h, 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 8); ctx.fill();
    const col = dinero >= COSTO_PRIMER_ESTANTE ? "#bfffcf" : "#fff";
    etiqueta("🥬 Estantería", x + w / 2, y + 14, col);
    etiqueta("$" + COSTO_PRIMER_ESTANTE, x + w / 2, y + 31, col);
  }
  for (const e of estantes) {
    const { x, y, w, h } = e;
    ctx.fillStyle = "#9a6b3c"; caja(x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = "#c79055"; caja(x + 24, y + 4, w - 28, h - 8, 6); ctx.fill();
    // botón ↻ con el producto que lleva (toca para cambiarlo)
    ctx.fillStyle = "#f3e0c2"; caja(x + 3, y + 4, 20, h - 8, 6); ctx.fill();
    emoji(PRODUCTOS[e.producto].icono, x + 13, y + h / 2 - 5, 14);
    etiqueta("↻", x + 13, y + h / 2 + 11, "#6a4a1a", 11);
    const ancho = (w - 28) / ESTANTE_CAP;
    for (let i = 0; i < ESTANTE_CAP; i++) {
      const cx = x + 24 + (i + 0.5) * ancho, cy = y + h / 2;
      ctx.fillStyle = "rgba(0,0,0,.12)"; caja(cx - ancho / 2 + 1.5, cy - 14, ancho - 3, 28, 5); ctx.fill();
      if (e.items[i]) emoji(PRODUCTOS[e.items[i]].icono, cx, cy + 1, 16);
      else { ctx.globalAlpha = 0.22; emoji(PRODUCTOS[e.producto].icono, cx, cy + 1, 14); ctx.globalAlpha = 1; }
    }
  }
}

function dibujarJardin() {
  const { x, y, w, h } = JARDIN;
  if (!jardin.comprado) {
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = dinero >= COSTO_JARDIN ? "#2e9d4a" : "#999";
    caja(x, y, w, h, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 10); ctx.fill();
    etiqueta("🌱 Jardín  $" + COSTO_JARDIN, x + w / 2, y + h / 2, dinero >= COSTO_JARDIN ? "#bfffcf" : "#fff");
    return;
  }
  ctx.fillStyle = "#6fae52"; caja(x, y, w, h, 10); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#8a5a2b"; caja(x, y, w, h, 10); ctx.stroke();
  jardin.parcelas.forEach((p, i) => {
    const c = centroParcela(i);
    ctx.fillStyle = "#6b4426";
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 21, 18, 0, 0, Math.PI * 2); ctx.fill();
    if (p.t < 0) return;
    const k = Math.min(1, p.t / MADURA_SEG);
    if (k < 1) {
      // brote: crece de a poco
      ctx.fillStyle = "#3f9a3a";
      ctx.beginPath(); ctx.arc(c.x, c.y, 3 + 9 * k, 0, Math.PI * 2); ctx.fill();
    } else {
      emoji(PRODUCTOS[p.id].icono, c.x, c.y + 1, 26);
    }
  });
}

function dibujarPersonajes() {
  const todos = [{ y: jugador.y, f: () => dibujarJugador() }];
  clientes.forEach((c) => todos.push({ y: c.y, f: () => dibujarCliente(c) }));
  todos.sort((a, b) => a.y - b.y).forEach((o) => o.f());
}

function dibujarJugador() {
  persona(jugador.x, jugador.y, "#2e9d4a", "#f5cfa0", true);
  // lo que cargas, encima de la cabeza
  carga.forEach((id, i) => emoji(PRODUCTOS[id].icono, jugador.x + (i - (carga.length - 1) / 2) * 15, jugador.y - 30, 15));
}

function dibujarCliente(c) {
  persona(c.x, c.y, c.camisa, c.piel, false);
  // burbuja: lo que le falta por tomar, lo que va a pagar o ✅ al salir
  let txt;
  if (c.estado === "comprando") {
    txt = Object.keys(c.lista).filter((id) => c.lista[id] > 0).map((id) => PRODUCTOS[id].icono + "×" + c.lista[id]).join(" ");
  } else if (c.estado === "cola") {
    txt = "💲" + c.carrito.reduce((s, id) => s + PRODUCTOS[id].precio, 0);
  } else txt = "✅";
  if (!txt) return;
  ctx.font = "13px system-ui, sans-serif";
  const w = ctx.measureText(txt).width + 14;
  ctx.fillStyle = "#fff"; caja(c.x - w / 2, c.y - 44, w, 20, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(c.x - 4, c.y - 24); ctx.lineTo(c.x + 4, c.y - 24); ctx.lineTo(c.x, c.y - 19); ctx.fill();
  ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, c.x, c.y - 33);
}

function dibujar() {
  dibujarSuelo();
  dibujarMejoras();
  dibujarJardin();
  dibujarCaja();
  dibujarEstantes();
  dibujarPersonajes();
  // marca del lugar al que caminas
  if (objetivo && estado === "jugando") {
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(objetivo.x, objetivo.y, 8, 0, Math.PI * 2); ctx.stroke();
  }
  for (const t of textos) {
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "#0009"; ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- Bucle ----------
let ultimo = 0;
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;
  if (estado === "jugando") actualizar(dt);
  actualizarHud();
  dibujar();
  requestAnimationFrame(bucle);
}

ajustar();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });
