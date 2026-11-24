// Ruta: compartido/celebracion-estrellas.js
// CELEBRACIÓN DE ESTRELLAS al pasar un nivel (ESTANDARES-juegos.md, 13.5). Sale de la de Puzle deslizante (juego-5deslizante.js, función «celebrar»), pero genérica:
// la usa cualquier juego con mapa de un solo país (compartido/mapa-niveles.js con unPais). No importa Firebase: funciona sin internet.
// Trae sus PROPIOS estilos (los inyecta en <head>): no hace falta tocar ningún .css. (Deslizante todavía lleva su copia en su HTML; puede pasarse a este módulo.)
//
//   1) Las estrellas ganadas salen UNA TRAS OTRA del centro de la pantalla, giran y vuelan separadas a su lugar, arriba a la derecha, soltando brillos.
//   2) Ahí se quedan quietas un instante mientras sale el texto «N estrellas» (y las monedas ganadas); un velo oscuro cambia la escena y se abre el mapa del país.
//   3) Las estrellas caen una por una al centro del país, se encogen y el país hace «pop». Si hubo monedas, salen del centro del país (una por moneda) y se
//      deslizan al chip de monedas, que sube de 1 en 1. «Continuar» del centro del país reaparece con rebote al final.
//   Tocar la pantalla (con un toque NUEVO, no el que terminó el nivel) salta la animación.
//
// Uso:
//   import { crearCelebracion } from "../compartido/celebracion-estrellas.js";
//   const cel = crearCelebracion({
//     mapa,                                   // el que devuelve montarMapa({ unPais: true, … }): se usan retenerContinuar, centroPais y parpadear
//     chipMonedas: () => document.getElementById("monedas-barra"),   // el chip dorado de monedas (se mide al final, ya en su lugar de arriba a la derecha)
//     totalMonedas: () => saldoOTotal,        // el total YA con las monedas ganadas (el chip enseña el de antes y sube hasta este)
//     pintarMonedas: (valor) => { … },        // pinta el chip: un número (mientras viajan las monedas) o null = el total real
//   });
//   cel.celebrar({ estrellas: 1 a 3, moradas: 0 a 3, monedas: N (0 = sin monedas), lineas: ["🏆 ¡Nuevo récord!"], abrirMapa: () => { …abre el mapa del nivel… } });
//   cel.quitar() (al empezar o salir de un nivel: corta todo)  ·  cel.quitarTexto()  ·  cel.activa()
// Los tiempos están juntos en TIEMPOS (y RITMO multiplica todos: 2 = el doble de lento).

const ESTILOS = `.cel-fondo { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: none; }
.cel-velo { position: absolute; inset: 0; background: rgba(10,10,12,.88); opacity: 0; transition: opacity .4s ease; }
.cel-velo.on { opacity: 1; }
.cel-fila { position: relative; display: flex; gap: 30px; --e: 52px; }   
.cel-e { width: var(--e); height: var(--e); }
.cel-txt { position: fixed; z-index: 60; text-align: center; white-space: nowrap; pointer-events: none; font-weight: 900; font-size: clamp(1.05rem, 4.2vw, 1.5rem); letter-spacing: .02em; color: #fff6b0; text-shadow: 0 2px 0 rgba(120,70,0,.85), 0 0 10px rgba(255,198,31,.9), 0 0 2px #000; }   
.cel-moneda { position: fixed; left: 0; top: 0; z-index: 61; margin: 0; font-size: 24px; pointer-events: none; will-change: transform; }   
.cel-txt2 { margin-top: 2px; font-size: .72em; color: #ffe9a6; }   
.est { position: relative; display: inline-block; flex: none; width: var(--e, 16px); height: var(--e, 16px); }
.est::before { content: ""; position: absolute; inset: 0;
clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
.est.vacia::before { background: rgba(255,255,255,.16); }
.est.oro { filter: drop-shadow(0 1px 1px rgba(0,0,0,.55)); }
.est.oro::before { background: linear-gradient(160deg, #fff6b0 0%, #ffc61f 45%, #c97a00 100%); }
.est.mor { filter: drop-shadow(0 0 3px rgba(200,130,255,.95)) drop-shadow(0 0 9px rgba(120,80,255,.6)); }
.est.mor::before {
background:
linear-gradient(115deg, transparent 38%, rgba(255,255,255,.95) 48%, rgba(255,255,255,0) 58%) 150% 0 / 260% 100% no-repeat, 
linear-gradient(135deg, rgba(255,70,200,.5), rgba(255,225,90,.42), rgba(70,255,170,.42), rgba(70,200,255,.5), rgba(180,70,255,.5), rgba(255,70,200,.5)) 0% 50% / 200% 200%, 
radial-gradient(circle at 35% 28%, #f0c8ff, #a52df0 50%, #5a0fa8);                                                                                                   
animation: reflejo 2.2s linear infinite; }
.est.mor::after { content: ""; position: absolute; inset: -35%; pointer-events: none; 
background:
radial-gradient(circle at 12% 22%, #fff 0 1px, transparent 1.7px),
radial-gradient(circle at 88% 30%, #ffd1f5 0 1px, transparent 1.7px),
radial-gradient(circle at 78% 86%, #c9f3ff 0 1px, transparent 1.7px),
radial-gradient(circle at 20% 80%, #fff2a8 0 1px, transparent 1.7px),
radial-gradient(circle at 50% 8%, #b8ffd9 0 1px, transparent 1.7px);
animation: centelleo 1.3s ease-in-out infinite alternate; }
Con «clip» (y un margen fijo de 9 px) lo que sobresale ya no cuenta como contenido: el tamaño de la pantalla no cambia mientras brillan. */
.est.mor { overflow: hidden; overflow: clip; overflow-clip-margin: 9px; }
@keyframes reflejo { to { background-position: -60% 0, 100% 50%, 0 0; } }
@keyframes centelleo { from { opacity: .2; transform: scale(.85) rotate(0deg); } to { opacity: 1; transform: scale(1.1) rotate(25deg); } }
.cel-chispa { position: absolute; width: var(--tam, 3px); height: var(--tam, 3px); border-radius: 50%; pointer-events: none; box-shadow: 0 0 6px 1px rgba(255,255,255,.9); animation: cel-estela .9s ease-out forwards; }
@keyframes cel-estela { from { opacity: 1; transform: translate(0,0) scale(1); } to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.2); } }`;

export const TIEMPOS = {
  entraSep: 90,       // ms entre una estrella y la siguiente al salir del centro
  entraDur: 280,      // lo que tarda cada una en volar del centro a su lugar (arriba a la derecha)
  quieta: 370,        // ya todas arriba: se quedan estáticas este rato (aquí sale el texto «N estrellas»)
  arriba: 100,        // y un instante más antes de que el velo cambie la escena
  texto: 4500,        // lo que dura el texto «N estrellas» (se queda sobre el mapa y se desvanece; desaparece al instante al empezar otro nivel)
  velo: 100,          // lo que tarda el velo en tapar (y en apartarse)
  espera: 120,        // país ya visible, antes de que empiece a caer la primera estrella
  caeSep: 150,        // ms entre una estrella y la siguiente al caer al país
  caeDur: 200,        // lo que dura la caída (y el encogerse) de cada estrella
  final: 100,         // tras el pop de la última, antes de quitar todo
  continuar: 90,      // tras entrar la última estrella, cuando aparece «Continuar» con su rebote
};
export const RITMO = 1;
const RESPETAR_MOVIMIENTO_REDUCIDO = false; // false = se ve siempre (en muchos equipos «reducir movimiento» viene activado sin que la persona lo sepa); true = con eso activado solo se abre el mapa

function inyectarEstilos() {
  if (document.getElementById("cel-estilos")) return;
  const e = document.createElement("style");
  e.id = "cel-estilos";
  e.textContent = ESTILOS;
  document.head.appendChild(e);
}

function chisporroteo(v, x, y, cuantas, colores) {
  for (let k = 0; k < cuantas; k++) {
    const ang = (k / cuantas) * Math.PI * 2 + Math.random() * 0.5, dist = 26 + Math.random() * 34;
    const p = document.createElement("i");
    p.className = "cel-chispa";
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    p.style.setProperty("--tam", 3 + Math.random() * 4 + "px");
    p.style.background = colores[Math.floor(Math.random() * colores.length)];
    p.addEventListener("animationend", () => p.remove());
    v.appendChild(p);
  }
}
const ORO = ["#fff6b0", "#ffc61f", "#ffffff"], MORADO = ["#ffffff", "#ffd1f5", "#d9c2ff", "#c9f3ff"];
const fmtNum = (x) => Number(x).toLocaleString("es-MX");

export function crearCelebracion({ mapa, chipMonedas, totalMonedas, pintarMonedas }) {
  const T = {}; for (const k in TIEMPOS) T[k] = Math.round(TIEMPOS[k] * RITMO);
  let celId = 0, celTimers = [], celEl = null, textoCel = null, monedasVis = null;

  function quitarTexto() { if (textoCel) { textoCel.remove(); textoCel = null; } }
  function quitar() {
    celId++;
    celTimers.forEach(clearTimeout); celTimers = [];
    if (celEl) { celEl.remove(); celEl = null; }
    if (monedasVis !== null) { monedasVis = null; pintarMonedas(null); }   // si se salta o se corta, el chip muestra de inmediato el total real
    mapa.retenerContinuar(false);                                          // «Continuar» vuelve a verse
  }

  function celebrar({ estrellas = 1, moradas = 0, monedas = 0, lineas = [], abrirMapa }) {
    inyectarEstilos();
    quitar(); quitarTexto();
    const id = celId;
    const tras = (ms, fn) => celTimers.push(setTimeout(() => { if (id === celId) fn(); }, ms));
    let abierto = false;
    const abrir = () => { if (!abierto) { abierto = true; abrirMapa(); } };
    if (RESPETAR_MOVIMIENTO_REDUCIDO && matchMedia("(prefers-reduced-motion: reduce)").matches) { abrir(); return; }

    if (monedas > 0) { monedasVis = Math.max(0, totalMonedas() - monedas); pintarMonedas(monedasVis); }   // el chip enseña el total de antes: sube al llegar cada moneda
    const cuantas = Math.max(1, Math.min(3, Math.floor(estrellas) || 1)), mor = Math.max(0, Math.min(cuantas, Math.floor(moradas) || 0));
    // Solo doradas → «N estrellas doradas»; las 3 moradas → «3 estrellas moradas»; mezcladas → solo la cantidad
    const una = cuantas === 1, color = mor === 0 ? (una ? " dorada" : " doradas") : mor === 3 ? " moradas" : "";
    const textoEst = cuantas + (una ? " estrella" : " estrellas") + color;
    const ov = document.createElement("div");
    ov.className = "cel-fondo";
    const velo = document.createElement("div");
    velo.className = "cel-velo";
    velo.style.transition = "opacity " + T.velo + "ms ease";
    const fila = document.createElement("div");
    fila.className = "cel-fila";
    const ests = [];
    for (let k = 0; k < cuantas; k++) {
      const w = document.createElement("div"), e = document.createElement("span");
      w.className = "cel-e";
      e.className = "est " + (k < mor ? "mor" : "oro");
      w.appendChild(e); fila.appendChild(w); ests.push(w);
    }
    ov.append(velo, fila);
    document.body.appendChild(ov);
    celEl = ov;
    // Tocar = saltar, pero solo con un toque NUEVO sobre la celebración (en celulares el «clic» del dedo que terminó el nivel la cerraba al instante)
    let tocado = false;
    ov.addEventListener("pointerdown", () => { tocado = true; });
    ov.addEventListener("click", () => { if (!tocado) return; abrir(); quitar(); });
    const colores = (w) => (w.firstChild.classList.contains("mor") ? MORADO : ORO);
    const centro = (w) => { const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

    // 1) la fila se coloca en su lugar final (arriba a la derecha) y cada estrella sale del centro de la pantalla y vuela hasta ahí soltando brillos
    const rf = fila.getBoundingClientRect(), cxFila = rf.left + rf.width / 2, cyFila = rf.top + rf.height / 2;
    const tx = Math.min(innerWidth * 0.78, innerWidth - rf.width / 2 - 28), ty = Math.max(innerHeight * (innerWidth < 640 ? 0.3 : 0.2), rf.height / 2 + 80);
    fila.style.transform = "translate(" + (tx - cxFila) + "px," + (ty - cyFila) + "px)";
    const cxPantalla = innerWidth / 2, cyPantalla = innerHeight / 2;
    ests.forEach((w, k) => {
      const r = w.getBoundingClientRect(), dx = cxPantalla - (r.left + r.width / 2), dy = cyPantalla - (r.top + r.height / 2);
      w.animate([
        { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(-200deg)", opacity: 0, offset: 0 },
        { transform: "translate(" + dx * 0.8 + "px," + dy * 0.8 + "px) scale(1.3) rotate(-120deg)", opacity: 1, offset: 0.18 },
        { transform: "none", opacity: 1, offset: 1 },
      ], { duration: T.entraDur, delay: k * T.entraSep, easing: "cubic-bezier(.25,.9,.35,1.15)", fill: "backwards" });
      for (const f of [0.3, 0.6]) tras(k * T.entraSep + T.entraDur * f, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 4, colores(w)); });
      tras(k * T.entraSep + T.entraDur, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 8, colores(w)); });
    });

    // 2) cambio de escena: con todas ya arriba, el velo cubre, se abre el mapa debajo y el velo se aparta
    const tLlega = (cuantas - 1) * T.entraSep + T.entraDur;
    const tVelo = tLlega + T.quieta + T.arriba, tMapa = tVelo + T.velo;
    tras(tVelo, () => velo.classList.add("on"));
    tras(tMapa, () => { mapa.retenerContinuar(true); abrir(); velo.classList.remove("on"); });

    // 2b) texto «N estrellas» (y monedas / líneas extra): sale de las estrellas, se coloca encima y se queda ~4,5 s desvaneciéndose (en <body>, sobre el mapa)
    tras(tLlega, () => {
      const r = fila.getBoundingClientRect();
      const txt = document.createElement("div");
      txt.className = "cel-txt";
      const l1 = document.createElement("div");
      l1.textContent = textoEst;
      txt.appendChild(l1);
      const extra = [...(monedas > 0 ? ["💰 +" + fmtNum(monedas) + " monedas"] : []), ...lineas];
      for (const t of extra) { const l = document.createElement("div"); l.className = "cel-txt2"; l.textContent = t; txt.appendChild(l); }
      txt.style.left = r.left + r.width / 2 + "px"; txt.style.top = r.top + r.height / 2 + "px";
      document.body.appendChild(txt);
      textoCel = txt;
      const base = r.height / 2 + txt.offsetHeight / 2 + 12;
      const pos = (dy, s) => "translate(-50%,-50%) translateY(" + dy + "px) scale(" + s + ")";
      const colocado = Math.min(0.2, 180 / T.texto);
      txt.animate([
        { transform: pos(0, 0.3), opacity: 0, offset: 0, easing: "cubic-bezier(.2,.9,.3,1.2)" },
        { transform: pos(-base, 1), opacity: 1, offset: colocado, easing: "linear" },
        { transform: pos(-base - 8, 1.08), opacity: 1, offset: 0.6, easing: "linear" },
        { transform: pos(-base - 16, 1.15), opacity: 0, offset: 1 },
      ], { duration: T.texto, fill: "forwards" }).onfinish = () => { txt.remove(); if (textoCel === txt) textoCel = null; };
    });

    // 4) monedas: salen del centro del país y se deslizan una tras otra al chip de monedas; el chip sube de 1 en 1
    const lanzarMonedas = (c) => {
      const chip = chipMonedas(), n = monedas, base = monedasVis;
      if (!chip) { mapa.retenerContinuar(false); tras(T.final, quitar); return; }
      const rd = chip.getBoundingClientRect(), dx = rd.left + rd.width / 2, dy = rd.top + rd.height / 2;
      const sep = Math.min(45, 1100 / n), dur = 650, mitad = 12;
      let llegadas = 0;
      for (let k = 0; k < n; k++) {
        const m = document.createElement("i");
        m.className = "moneda cel-moneda";
        ov.appendChild(m);
        const ang = Math.random() * Math.PI * 2, rad = 10 + Math.random() * 34;
        m.animate([
          { transform: "translate(" + (c.x - mitad) + "px," + (c.y - mitad) + "px) scale(.4)", opacity: 0, offset: 0 },
          { transform: "translate(" + (c.x - mitad + Math.cos(ang) * rad) + "px," + (c.y - mitad + Math.sin(ang) * rad) + "px) scale(1)", opacity: 1, offset: 0.18 },
          { transform: "translate(" + (dx - mitad) + "px," + (dy - mitad) + "px) scale(.7)", opacity: 1, offset: 1 },
        ], { duration: dur, delay: k * sep, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" }).onfinish = () => {
          m.remove();
          if (id !== celId) return;
          llegadas++;
          monedasVis = base + llegadas; pintarMonedas(monedasVis);
          chip.animate([{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 160 });
          if (llegadas === n) {
            chisporroteo(ov, dx, dy, 10, ORO);
            mapa.retenerContinuar(false);                  // aparece «Continuar» con su rebote
            tras(T.final + 150, quitar);                   // y se limpia todo (esto también deja el chip con el total real)
          }
        };
      }
    };

    // 3) una por una: cada estrella cae al centro del país, se encoge hasta desaparecer y el país hace «pop»
    const T0 = tMapa + T.velo + T.espera;
    ests.forEach((w, k) => tras(T0 + k * T.caeSep, () => {
      const c = mapa.centroPais(), r = w.getBoundingClientRect(), sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      if (!c) { w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }); return; }
      const dx = c.x - sx, dy = c.y - sy, ultima = k === cuantas - 1;
      w.animate([
        { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1, offset: 0 },
        { transform: "translate(" + dx * 0.3 + "px," + (dy * 0.3 - 60) + "px) scale(1.2) rotate(120deg)", opacity: 1, offset: 0.3 },
        { transform: "translate(" + dx * 0.85 + "px," + dy * 0.85 + "px) scale(.55) rotate(300deg)", opacity: 1, offset: 0.75 },
        { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(420deg)", opacity: 0.8, offset: 1 },
      ], { duration: T.caeDur, easing: "ease-in", fill: "forwards" }).onfinish = () => {
        if (id !== celId) return;
        w.style.visibility = "hidden";
        mapa.parpadear(k);
        chisporroteo(ov, c.x, c.y, ultima ? 16 : 10, ORO);
        if (ultima) { if (monedas > 0) lanzarMonedas(c); else tras(T.continuar, () => mapa.retenerContinuar(false)); }
      };
    }));
    tras(T0 + (cuantas - 1) * T.caeSep + T.caeDur + T.final + (monedas > 0 ? 4000 : 0), quitar);   // con monedas, este es solo el seguro
  }
  return { celebrar, quitar, quitarTexto, activa: () => !!celEl };
}
