// Ruta: sudoku/juego.js
// Sudoku: tablero generado al azar con solución única, notas, deshacer, pistas y 3 dificultades.

// ----- Ajustes -----
const ID = "sudoku";
const PISTAS_INICIALES = { facil: 40, medio: 33, dificil: 27 }; // números que se ven al empezar
const PUNTOS = { facil: 10, medio: 20, dificil: 40 };           // puntos al perfil al resolverlo
const PUNTOS_POR_PISTA = 3;                                     // lo que se resta por cada pista usada
const CLAVE = "sudoku_partida";
const CLAVE_MEJOR = "sudoku_mejor";

// ----- Reglas -----
const caja = (i) => ((((i / 9) | 0) / 3) | 0) * 3 + (((i % 9) / 3) | 0);
const bits = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const barajar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Cuenta soluciones (hasta «limite»). Con azar=true prueba los dígitos en desorden y devuelve la primera solución.
function resolver(g, limite, azar) {
  const fi = Array(9).fill(0), co = Array(9).fill(0), ca = Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; fi[(i / 9) | 0] |= b; co[i % 9] |= b; ca[caja(i)] |= b; }
  const orden = azar ? barajar([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let n = 0, sol = null;
  const rec = () => {
    let mejor = -1, mm = 0, mc = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ~(fi[(i / 9) | 0] | co[i % 9] | ca[caja(i)]) & 0x3fe;
      const c = bits(m);
      if (c < mc) { mc = c; mejor = i; mm = m; if (c <= 1) break; }
    }
    if (mejor < 0) { n++; if (!sol) sol = g.slice(); return; }
    if (mc === 0) return;
    const r = (mejor / 9) | 0, c = mejor % 9, k = caja(mejor);
    for (const d of orden) {
      if (n >= limite) return;
      const b = 1 << d;
      if (!(mm & b)) continue;
      g[mejor] = d; fi[r] |= b; co[c] |= b; ca[k] |= b;
      rec();
      g[mejor] = 0; fi[r] &= ~b; co[c] &= ~b; ca[k] &= ~b;
    }
  };
  rec();
  return { n, sol };
}

function generar(dif) {
  const sol = resolver(Array(81).fill(0), 1, true).sol;
  const g = sol.slice();
  let quedan = 81;
  for (const i of barajar([...Array(81).keys()])) {
    if (quedan <= PISTAS_INICIALES[dif]) break;
    const v = g[i];
    g[i] = 0;
    if (resolver(g.slice(), 2, false).n !== 1) g[i] = v; // si deja de ser única, se devuelve
    else quedan--;
  }
  return { sol, dado: g.map((v) => v !== 0), val: g };
}

// ----- Estado -----
let E = null; // { dif, sol, dado, val, notas, hist, seg, errores, pistas, terminado, pagado }
let sel = -1, lapiz = false, reloj = null;
const $ = (id) => document.getElementById(id);
const celdas = [];

const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) {} };
const fmt = (s) => String((s / 60) | 0).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const leerMejor = () => { try { return JSON.parse(localStorage.getItem(CLAVE_MEJOR)) || {}; } catch (e) { return {}; } };

function nueva(dif) {
  const p = generar(dif);
  E = { dif, sol: p.sol, dado: p.dado, val: p.val, notas: Array(81).fill(0), hist: [], seg: 0, errores: 0, pistas: 0, terminado: false, pagado: false };
  sel = -1;
  $("msg").textContent = "";
  guardar();
  pintar();
}

// ----- Pantalla -----
function construir() {
  const t = $("tablero");
  for (let i = 0; i < 81; i++) {
    const b = document.createElement("button");
    b.className = "cel" + (i % 9 === 2 || i % 9 === 5 ? " c3" : "") + ((((i / 9) | 0) === 2) || (((i / 9) | 0) === 5) ? " f3" : "");
    b.addEventListener("click", () => { sel = i; pintar(); });
    t.appendChild(b);
    celdas.push(b);
  }
  const k = $("teclado");
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement("button");
    b.textContent = d;
    b.addEventListener("click", () => poner(d));
    k.appendChild(b);
  }
}

function pintar() {
  const vs = sel >= 0 ? E.val[sel] : 0;
  const cuenta = Array(10).fill(0);
  for (let i = 0; i < 81; i++) {
    const c = celdas[i], v = E.val[i];
    if (v && v === E.sol[i]) cuenta[v]++;
    c.className = c.className.replace(/ ?(dado|rel|igual|sel|mal)\b/g, "");
    if (E.dado[i]) c.classList.add("dado");
    if (sel >= 0 && i !== sel && ((i / 9 | 0) === (sel / 9 | 0) || i % 9 === sel % 9 || caja(i) === caja(sel))) c.classList.add("rel");
    if (vs && v === vs) c.classList.add("igual");
    if (i === sel) c.classList.add("sel");
    if (v && v !== E.sol[i]) c.classList.add("mal");
    if (v) c.textContent = v;
    else if (E.notas[i]) {
      let h = '<div class="notas">';
      for (let d = 1; d <= 9; d++) h += "<span>" + (E.notas[i] & (1 << d) ? d : "") + "</span>";
      c.innerHTML = h + "</div>";
    } else c.textContent = "";
  }
  [...$("teclado").children].forEach((b, i) => (b.disabled = cuenta[i + 1] >= 9 || E.terminado));
  $("errores").textContent = "Errores: " + E.errores;
  $("tiempo").textContent = fmt(E.seg);
  $("lapiz").classList.toggle("on", lapiz);
  const m = leerMejor()[E.dif];
  $("mejor").textContent = m ? "Mejor: " + fmt(m) : "";
}

// ----- Jugadas -----
function snapshot() {
  E.hist.push({ val: E.val.slice(), notas: E.notas.slice() });
  if (E.hist.length > 200) E.hist.shift();
}

function poner(d) {
  if (E.terminado || sel < 0 || E.dado[sel]) return;
  if (lapiz) {
    if (E.val[sel]) return;
    snapshot();
    E.notas[sel] ^= 1 << d;
  } else {
    if (E.val[sel] === d) return;
    snapshot();
    E.val[sel] = d;
    E.notas[sel] = 0;
    if (d !== E.sol[sel]) E.errores++;
    else quitarNotas(sel, d);
  }
  despues();
}

function quitarNotas(i, d) {
  for (let j = 0; j < 81; j++)
    if (j !== i && ((j / 9 | 0) === (i / 9 | 0) || j % 9 === i % 9 || caja(j) === caja(i))) E.notas[j] &= ~(1 << d);
}

function borrar() {
  if (E.terminado || sel < 0 || E.dado[sel] || (!E.val[sel] && !E.notas[sel])) return;
  snapshot();
  E.val[sel] = 0;
  E.notas[sel] = 0;
  despues();
}

function deshacer() {
  if (E.terminado || !E.hist.length) return;
  const s = E.hist.pop();
  E.val = s.val;
  E.notas = s.notas;
  despues();
}

function pista() {
  if (E.terminado) return;
  let i = sel;
  if (i < 0 || E.dado[i] || E.val[i] === E.sol[i]) {
    const malas = [...Array(81).keys()].filter((j) => E.val[j] !== E.sol[j]);
    i = malas[(Math.random() * malas.length) | 0];
  }
  snapshot();
  sel = i;
  E.val[i] = E.sol[i];
  E.notas[i] = 0;
  quitarNotas(i, E.sol[i]);
  E.pistas++;
  despues();
}

function despues() {
  guardar();
  pintar();
  if (E.val.every((v, i) => v === E.sol[i])) ganar();
}

async function ganar() {
  E.terminado = true;
  const mejor = leerMejor();
  let extra = "";
  if (!E.pistas && (!mejor[E.dif] || E.seg < mejor[E.dif])) {
    mejor[E.dif] = E.seg;
    try { localStorage.setItem(CLAVE_MEJOR, JSON.stringify(mejor)); } catch (e) {}
    extra = " ¡Nuevo récord!";
  }
  const pts = Math.max(1, PUNTOS[E.dif] - E.pistas * PUNTOS_POR_PISTA);
  $("msg").textContent = "🎉 ¡Resuelto en " + fmt(E.seg) + "!" + extra + " +" + pts + " pts";
  guardar();
  pintar();
  if (!E.pagado) {
    E.pagado = true;
    guardar();
    try {
      const { sumarPuntos } = await import("../compartido/jugador.js");
      await sumarPuntos(ID, pts); // solo guarda si hay sesión iniciada
    } catch (e) {}
  }
}

// ----- Arranque -----
construir();
$("nuevo").addEventListener("click", () => nueva($("dificultad").value));
$("lapiz").addEventListener("click", () => { lapiz = !lapiz; pintar(); });
$("borrar").addEventListener("click", borrar);
$("deshacer").addEventListener("click", deshacer);
$("pista").addEventListener("click", pista);

addEventListener("keydown", (e) => {
  if (!E || e.target.tagName === "SELECT") return;
  if (e.key >= "1" && e.key <= "9") poner(+e.key);
  else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") borrar();
  else if (e.key.toLowerCase() === "n") { lapiz = !lapiz; pintar(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); deshacer(); }
  else if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    let f = sel < 0 ? 4 : (sel / 9) | 0, c = sel < 0 ? 4 : sel % 9;
    if (sel >= 0) {
      if (e.key === "ArrowUp") f = Math.max(0, f - 1);
      if (e.key === "ArrowDown") f = Math.min(8, f + 1);
      if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
      if (e.key === "ArrowRight") c = Math.min(8, c + 1);
    }
    sel = f * 9 + c;
    pintar();
  }
});

setInterval(() => {
  if (!E || E.terminado || document.hidden) return;
  E.seg++;
  $("tiempo").textContent = fmt(E.seg);
  if (E.seg % 5 === 0) guardar();
}, 1000);

try {
  const g = JSON.parse(localStorage.getItem(CLAVE));
  if (g && g.sol && g.val && g.val.length === 81) { E = g; $("dificultad").value = E.dif; pintar(); if (E.terminado) $("msg").textContent = "Partida terminada: toca «Nueva partida»."; }
  else nueva("medio");
} catch (e) {
  nueva("medio");
}
