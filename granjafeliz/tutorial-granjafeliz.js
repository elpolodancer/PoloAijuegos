// Ruta: granjafeliz/tutorial-granjafeliz.js   (PROYECTO: Portal Juegos · juego Granja feliz)
// TUTORIAL GUIADO de los primeros niveles. No usa Firebase ni document (solo localStorage dentro de try/catch): se puede probar en Node.
// Cómo funciona: cada nivel con tutorial (NIVELES_TUTORIAL) tiene una lista de PASOS en orden. En cada momento se muestra UN paso:
//   un cuadro con el texto (abajo al centro del escenario) y una flecha roja con un aro que señala lo que hay que tocar.
//   El paso avanza solo cuando el jugador HACE lo que pide (no por tiempo), salvo los pasos informativos (espera: segundos).
//   Los pasos URGENTES (cae un oso, se acaba el agua) interrumpen la lista y, al terminarlos, se sigue donde se iba.
// El juego le da el estado en cada cuadro (juego-granjafeliz.js → estadoTutorial()) y le pide dibujar al final de dibujar().
// Las posiciones salen de escena-granjafeliz.js (ES.CAJAS, ES.CAMPO, ES.botonComprar, ES.ranuraEdificio), así que si se mueve algo en la escena, las flechas lo siguen.
//
//   crearTutorial(n)            → objeto del tutorial del nivel n (o null si ese nivel no tiene)
//   t.actualizar(e, dt)         e = estado del juego (ver estadoTutorial). Llamar solo con el juego en marcha (sin pausa)
//   t.dibujar(ctx)              flecha + cuadro. Después de dibujar todo lo demás
//   t.tocar(x, y)               true si el toque fue en «Saltar ✕» (el juego no debe procesarlo)
//   t.terminar() / t.saltar()   marcan el nivel como visto (no vuelve a salir solo)
//   tutorialPendiente(n, estrellas)   ¿hay que mostrarlo? Solo si el nivel tiene tutorial, no se vio y todavía no se pasó
//
// Se guarda qué niveles ya se vieron en «granjafeliz_tutorial_v1» (termina en _v1: entra en la copia de seguridad de compartido/almacen.js).
// Si el jugador pasa el nivel o lo salta, no vuelve a salir; desde ☰ Pausa → «❓ Ver el tutorial» se puede repetir cuando quiera.
import * as ES from "./escena-granjafeliz.js";
import * as D from "./datos-granjafeliz.js";

export const CLAVE_VISTOS = "granjafeliz_tutorial_v1";   // { "1": 1, "2": 1 }
export const NIVELES_TUTORIAL = [1, 2, 3];
export const tieneTutorial = (n) => NIVELES_TUTORIAL.includes(n);

export function leerVistos() {
  try { const o = JSON.parse(localStorage.getItem(CLAVE_VISTOS)); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; }
}
export function marcarVisto(n) {
  try { const v = leerVistos(); v[n] = 1; localStorage.setItem(CLAVE_VISTOS, JSON.stringify(v)); } catch (e) {}
}
export const tutorialPendiente = (n, estrellas = 0) => tieneTutorial(n) && !(Number(estrellas) > 0) && !leerVistos()[n];

// ----- Ayudas para armar los pasos -----
const alrededor = (o, r = 18) => (o ? { x: o.x - r, y: o.y - r, w: r * 2, h: r * 2 } : null);
const huevoEnSuelo = (e) => e.suelo.find((s) => s.tipo === "huevo");
const productoEnSuelo = (e, tipo) => e.suelo.find((s) => s.tipo === tipo);
const jaulaEnSuelo = (e) => e.suelo.find((s) => s.jaula);
const centroCampo = () => ({ x: ES.CAMPO.x + ES.CAMPO.w / 2 - 44, y: ES.CAMPO.y + ES.CAMPO.h / 2 - 34, w: 88, h: 68 });
const PRECIO_GALLINA = D.ANIMALES.gallina.precio;
const COSTO_PLANTA = D.EDIFICIOS.panaderia.costo;
const fmt = (n) => Number(n).toLocaleString("es-MX");

// Paso urgente común: se acabó el agua del pozo
const AGUA = {
  id: "agua", urgente: true,
  cuando: (e) => e.agua < 1 && !e.pozoLlenando,
  texto: "Se acabó el agua 💧. Toca el pozo para rellenarlo (cuesta unos pesos).",
  apunta: () => ES.CAJAS.pozo,
  listo: (e) => e.pozoLlenando || e.agua >= 1,
};

// ----- Pasos de cada nivel (en orden). Campos: id, texto (texto o función de e), apunta (función de e → rectángulo o null),
//       ya(e) = true si ya está hecho (se salta), listo(e, base) = true cuando el jugador lo hizo (base = estado al empezar el paso),
//       espera = segundos que se muestra un paso solo informativo. -----
const PASOS = {
  // NIVEL 1 (2 gallinas, $170): pasto → primer huevo → metas → comprar una gallina → despedida
  1: {
    linea: [
      { id: "pasto", texto: "Tus gallinas se mueren de hambre sin pasto 🌱. Toca el campo para regar un parche.",
        apunta: () => centroCampo(), listo: (e, b) => e.pasto > 0 || e.agua < b.agua },
      { id: "huevo", texto: "Las gallinas ponen huevos 🥚 (tardan unos segundos). Cuando veas uno, tócalo para recogerlo.",
        apunta: (e) => alrededor(huevoEnSuelo(e)), ya: (e) => e.rec.huevo >= 1, listo: (e) => e.rec.huevo >= 1 },
      { id: "metas", texto: "¡Muy bien! Los huevos van al almacén 📦. Arriba ves tu meta: junta 4 huevos para pasar el nivel.",
        apunta: (e) => e.metasRect, espera: 6 },
      { id: "gallina",
        texto: (e) => (e.dinero >= PRECIO_GALLINA ? "Más gallinas, más huevos 🐔. Toca el botón de la gallina para comprar otra ($" + PRECIO_GALLINA + ")." : "Junta $" + PRECIO_GALLINA + " para comprar otra gallina 🐔."),
        apunta: (e) => (e.dinero >= PRECIO_GALLINA ? ES.botonComprar(0) : alrededor(huevoEnSuelo(e))),
        ya: (e) => e.animales >= 3, listo: (e, b) => e.animales > b.animales },
      { id: "fin", texto: "¡Listo! Sigue recogiendo huevos hasta juntar 4. Si se acaba el agua 💧, toca el pozo. ¡Tú puedes!",
        apunta: () => ES.CAJAS.pozo, espera: 7 },
    ],
    urgentes: [AGUA],
  },

  // NIVEL 2 (2 gallinas, $190, un oso a los 31 s): recoger → camión → esperar el pago → comprar gallinas → osos
  2: {
    linea: [
      { id: "huevo", texto: "Toca los huevos 🥚 del suelo para llevarlos al almacén 📦 (si no los recoges, desaparecen).",
        apunta: (e) => alrededor(huevoEnSuelo(e)), ya: (e) => e.rec.huevo >= 1, listo: (e) => e.rec.huevo >= 1 },
      { id: "camion",
        texto: (e) => (e.pagoListo > 0 ? "Para ganar dinero hay que vender: toca el camión 🚚 y se lleva lo que hay en el almacén." : "Recoge otro huevo 🥚: el camión necesita algo que vender."),
        apunta: (e) => (e.pagoListo > 0 ? ES.CAJAS.camion : alrededor(huevoEnSuelo(e))),
        ya: (e) => e.camionViaje || e.ventas > 0, listo: (e) => e.camionViaje || e.ventas > 0 },
      { id: "pago", texto: "El camión tarda unos segundos en volver con tu dinero 💵. Mientras, sigue recogiendo huevos.",
        apunta: () => null, ya: (e) => e.ventas > 0, listo: (e) => e.ventas > 0 },
      { id: "gallina",
        texto: (e) => (e.dinero >= PRECIO_GALLINA ? "Con dinero compra más gallinas 🐔: necesitas 5 para pasar el nivel. Toca el botón de la gallina." : "Junta $" + PRECIO_GALLINA + " vendiendo huevos para comprar otra gallina 🐔."),
        apunta: (e) => (e.dinero >= PRECIO_GALLINA ? ES.botonComprar(0) : null),
        ya: (e) => e.animales >= 3, listo: (e, b) => e.animales > b.animales },
      { id: "fin", texto: "¡Eso es todo! Junta 10 huevos y 5 gallinas. Cuidado con los osos 🐻: se comen a tus animales.",
        apunta: (e) => e.metasRect, espera: 7 },
    ],
    urgentes: [
      { id: "oso", urgente: true, cuando: (e) => e.osos.length > 0,
        texto: "¡Un oso! 🐻 Tócalo varias veces para enjaularlo antes de que se coma a tus gallinas.",
        apunta: (e) => alrededor(e.osos[0], 26), listo: (e) => e.osos.length === 0 },
      { id: "jaula", urgente: true, antes: "oso", cuando: (e) => !!jaulaEnSuelo(e),
        texto: "¡Atrapado! Toca la jaula para guardarla en el almacén: se vende por dinero. ¡Rápido, que el oso se escapa!",
        apunta: (e) => alrededor(jaulaEnSuelo(e), 24), listo: (e) => !jaulaEnSuelo(e) },
      AGUA,
    ],
  },

  // NIVEL 3 (3 gallinas, $190): juntar $200 → construir la planta → convertir huevos en polvo → recoger el polvo
  3: {
    linea: [
      { id: "dinero",
        texto: (e) => "Para construir la planta de polvo 🏭 necesitas $" + fmt(COSTO_PLANTA) + ". Te faltan $" + fmt(Math.max(0, COSTO_PLANTA - e.dinero)) + ": recoge huevos 🥚 y véndelos con el camión 🚚.",
        apunta: (e) => (huevoEnSuelo(e) ? alrededor(huevoEnSuelo(e)) : e.pagoListo > 0 && !e.camionViaje ? ES.CAJAS.camion : null),
        ya: (e) => (e.edif[0] && e.edif[0].nivel >= 0) || e.dinero >= COSTO_PLANTA, listo: (e) => e.dinero >= COSTO_PLANTA },
      { id: "construir",
        texto: (e) => (e.dinero >= COSTO_PLANTA ? "¡Ya alcanza! Toca el espacio vacío de la planta 🏭 (arriba a la izquierda) para construirla." : "Aún faltan $" + fmt(COSTO_PLANTA - e.dinero) + " para la planta 🏭. Sigue vendiendo huevos."),
        apunta: (e) => (e.dinero >= COSTO_PLANTA ? ES.ranuraEdificio(0) : alrededor(huevoEnSuelo(e))),
        ya: (e) => e.edif[0] && e.edif[0].nivel >= 0, listo: (e) => e.edif[0] && e.edif[0].nivel >= 0 },
      { id: "procesar",
        texto: "¡Construida! Recoge huevos 🥚 y toca la planta: los convierte en polvo de huevo 🧂, que vale el doble.",
        apunta: (e) => ((e.almacen.huevo || 0) > 0 ? ES.ranuraEdificio(0) : alrededor(huevoEnSuelo(e))),
        ya: (e) => e.rec.polvo > 0 || !!productoEnSuelo(e, "polvo") || (e.edif[0] && (e.edif[0].trab > 0)),
        listo: (e) => e.rec.polvo > 0 || !!productoEnSuelo(e, "polvo") || (e.edif[0] && (e.edif[0].trab > 0)) },
      { id: "polvo", texto: "Espera a que termine: el polvo 🧂 sale junto a la planta. Tócalo para guardarlo en el almacén.",
        apunta: (e) => (productoEnSuelo(e, "polvo") ? alrededor(productoEnSuelo(e, "polvo")) : ES.ranuraEdificio(0)),
        ya: (e) => e.rec.polvo >= 1, listo: (e) => e.rec.polvo >= 1 },
      { id: "fin", texto: "Repite: huevos → planta → polvo, y vende con el camión hasta llegar a $300. ¡Ya sabes todo lo necesario!",
        apunta: (e) => e.metasRect, espera: 8 },
    ],
    urgentes: [
      { id: "oso", urgente: true, cuando: (e) => e.osos.length > 0,
        texto: "¡Un oso! 🐻 Tócalo varias veces para enjaularlo; la jaula también se vende.",
        apunta: (e) => alrededor(e.osos[0], 26), listo: (e) => e.osos.length === 0 },
      { id: "jaula", urgente: true, antes: "oso", cuando: (e) => !!jaulaEnSuelo(e),
        texto: "¡Atrapado! Toca la jaula para guardarla antes de que el oso se escape.",
        apunta: (e) => alrededor(jaulaEnSuelo(e), 24), listo: (e) => !jaulaEnSuelo(e) },
      AGUA,
    ],
  },
};

const clonar = (o) => JSON.parse(JSON.stringify(o));
const choca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ----- Dibujo -----
function envolver(ctx, texto, ancho) {
  const lineas = []; let linea = "";
  for (const p of String(texto).split(" ")) {
    const prueba = linea ? linea + " " + p : p;
    if (linea && ctx.measureText(prueba).width > ancho) { lineas.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  return lineas;
}
// Flecha roja que rebota + aro que parpadea alrededor de r. Si el objetivo está arriba de la pantalla, la flecha viene desde abajo.
function flecha(ctx, r, reloj) {
  const abajo = r.y < 100, cx = r.x + r.w / 2, rebote = Math.sin(reloj * 6) * 4;
  ctx.save();
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(reloj * 5);
  ctx.strokeStyle = "#ff3b30"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 12); ctx.stroke();
  ctx.globalAlpha = 1;
  const punta = abajo ? r.y + r.h + 6 + rebote : r.y - 6 - rebote, d = abajo ? 1 : -1;   // d = hacia dónde se aleja la cola
  ctx.fillStyle = "#ff3b30"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx, punta);
  ctx.lineTo(cx - 13, punta + d * 18); ctx.lineTo(cx - 5, punta + d * 18); ctx.lineTo(cx - 5, punta + d * 40);
  ctx.lineTo(cx + 5, punta + d * 40); ctx.lineTo(cx + 5, punta + d * 18); ctx.lineTo(cx + 13, punta + d * 18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function zonaFlecha(r) { return r.y < 100 ? { x: r.x - 16, y: r.y - 6, w: r.w + 32, h: r.h + 60 } : { x: r.x - 16, y: r.y - 56, w: r.w + 32, h: r.h + 60 }; }

// ----- El tutorial de un nivel -----
export function crearTutorial(n) {
  const def = PASOS[n];
  if (!def) return null;
  const linea = def.linea, urgentes = def.urgentes || [];
  const hechos = new Set(), bases = new Map(), segs = new Map();
  let i = 0, cur = null, fin = false, lineaLista = false, vista = null, btn = null;

  const t = {
    n,
    get vista() { return vista; },          // { texto, apunta, num, total } del paso que se muestra (null = nada)
    get terminado() { return fin; },
    get lineaLista() { return lineaLista; },
    actualizar(e, dt = 0) {
      if (fin) return;
      while (i < linea.length && linea[i].ya && linea[i].ya(e)) { hechos.add(linea[i].id); i++; }      // lo que ya está hecho se salta
      if (i >= linea.length && !lineaLista) { lineaLista = true; marcarVisto(n); }                      // la lista principal terminó: ya no vuelve a salir sola
      // Un paso urgente que ya se estaba mostrando se queda hasta cumplirse (aunque su condición de aparición ya no sea cierta: p. ej. el oso ya está enjaulado)
      const sigue = cur && cur.urgente && !hechos.has(cur.id) ? cur : null;
      const paso = sigue || urgentes.find((p) => !hechos.has(p.id) && (!p.antes || hechos.has(p.antes)) && p.cuando(e)) || (i < linea.length ? linea[i] : null);
      cur = paso;
      if (!cur) { vista = null; return; }
      if (!bases.has(cur.id)) bases.set(cur.id, clonar(e));
      const seg = (segs.get(cur.id) || 0) + dt; segs.set(cur.id, seg);
      const listo = (cur.listo && cur.listo(e, bases.get(cur.id))) || (cur.espera != null && seg >= cur.espera);
      if (listo) {
        hechos.add(cur.id);
        if (cur === linea[i]) i++;
        return this.actualizar(e, 0);       // pasa de inmediato al siguiente paso (sin un cuadro vacío en medio)
      }
      vista = { texto: typeof cur.texto === "function" ? cur.texto(e) : cur.texto, apunta: cur.apunta ? cur.apunta(e) : null, num: cur.urgente ? 0 : i + 1, total: linea.length };
    },
    dibujar(ctx, reloj = Date.now() / 1000) {
      btn = null;
      if (fin || !vista) return;
      const W = ES.LAYOUT.ANCHO, ancho = 300;
      ctx.save();
      ctx.font = "700 13px system-ui,sans-serif";
      const lineas = envolver(ctx, vista.texto, ancho - 20), alto = 30 + lineas.length * 17;
      let zona = null;
      if (vista.apunta) { flecha(ctx, vista.apunta, reloj); zona = zonaFlecha(vista.apunta); }
      // Posición del cuadro: abajo al centro sobre el almacén; si estorba a la flecha, arriba a la izquierda o a la derecha del campo
      const opciones = [{ x: W / 2 - ancho / 2, y: ES.CAJAS.almacen.y - alto - 8 }, { x: ES.CAMPO.x + 8, y: ES.CAMPO.y + 6 }, { x: ES.CAMPO.x + ES.CAMPO.w - ancho - 8, y: ES.CAMPO.y + 6 }];
      const p = opciones.find((o) => !zona || !choca({ x: o.x, y: o.y, w: ancho, h: alto }, zona)) || opciones[0];
      ctx.fillStyle = "rgba(20,20,24,.9)"; ctx.strokeStyle = "#ffcf3a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(p.x, p.y, ancho, alto, 12); ctx.fill(); ctx.stroke();
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.font = "700 11px system-ui,sans-serif"; ctx.fillStyle = "#ffcf3a";
      ctx.fillText(vista.num ? "🎓 Tutorial · paso " + vista.num + "/" + vista.total : "💡 Consejo", p.x + 10, p.y + 12);
      btn = { x: p.x + ancho - 74, y: p.y + 4, w: 68, h: 18 };
      ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 9); ctx.fill();
      ctx.fillStyle = "#e8e8ee"; ctx.textAlign = "center"; ctx.fillText("Saltar ✕", btn.x + btn.w / 2, btn.y + 9);
      ctx.font = "700 13px system-ui,sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "left";
      lineas.forEach((l, k) => ctx.fillText(l, p.x + 10, p.y + 34 + k * 17));
      ctx.restore();
    },
    tocar(x, y) {
      if (fin || !vista || !btn || x < btn.x || x > btn.x + btn.w || y < btn.y || y > btn.y + btn.h) return false;
      this.saltar();
      return true;
    },
    saltar() { fin = true; vista = null; btn = null; marcarVisto(n); },
    terminar() { fin = true; vista = null; btn = null; marcarVisto(n); },
  };
  return t;
}
