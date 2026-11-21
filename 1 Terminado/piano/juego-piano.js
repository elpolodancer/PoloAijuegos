// Ruta: piano/juego-piano.js (lógica del juego «piano»: tocar las teclas negras que bajan, estilo Piano Tiles)

import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { NIVELES, POR_ETAPA } from "./niveles-piano.js";

const ID = "piano"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar"), btnMenu = $("btn-menu");
const pInicio = $("inicio"), menu = $("menu"), rejilla = $("rejilla"), alMenu = $("alMenu"), panelRecords = $("records"), vacio = $("vacio");
const COLS = 4, CW = W / COLS, RH = H / 4; // 4 columnas y 4 filas visibles
const MARCAS = [60, 120, 180]; // SIN límite de tiempo: se anota el récord de puntos logrado dentro del minuto 1, 2 y 3 (el reloj arranca al acertar la primera tecla)
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA }); // mapa de niveles estándar: 30 niveles por estado de México y por país (los niveles van en niveles-piano.js)
// Frecuencia (Hz) de una nota por su nombre ("C4", "F#4", "Bb4"…), con La4 = 440 Hz. Sirve cualquier nota: no hay que registrarla antes
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function frecuencia(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) { console.warn("Piano: nota desconocida «" + n + "»"); return null; }
  return 440 * 2 ** ((SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12 * (+m[3] + 1) - 69) / 12);
}
// Melodías de dominio público (música clásica). Cada acierto toca la siguiente nota. Para agregar otra: copia una línea y cambia nombre y notas
const nt = (txt) => txt.trim().split(/\s+/).map(frecuencia).filter(Boolean); // convierte "E4 D4" en frecuencias (la herramienta midi-a-notas.py genera estas líneas desde un archivo .mid)
const MANUALES = [
  { nombre: "Oda a la Alegría (Beethoven)", notas: nt("E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4  E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4  D4 D4 E4 C4 D4 E4 F4 E4 C4 D4 E4 F4 E4 D4 C4 D4 G3  E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4") },
  { nombre: "Para Elisa (Beethoven)", notas: nt("E5 D#5 E5 D#5 E5 B4 D5 C5 A4  C4 E4 A4 B4  E4 G#4 B4 C5  E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4  C4 E4 A4 B4  E4 C5 B4 A4") },
  { nombre: "Minueto en Sol (Petzold/Bach)", notas: nt("D5 G4 A4 B4 C5 D5 G4 G4  E5 C5 D5 E5 F#5 G5 G4 G4  C5 D5 C5 B4 A4  B4 C5 B4 A4 G4  F#4 G4 A4 B4 G4 B4 A4 G4") },
  { nombre: "Canon en Re (Pachelbel)", notas: nt("F#5 E5 D5 C#5 B4 A4 B4 C#5  D5 C#5 B4 A4 G4 F#4 G4 E4  D5 F#5 A5 G5 F#5 D5 F#5 E5 D5 B4 D5 A4  F#5 F#5 E5 E5 D5 D5 C#5 C#5 B4 B4 A4 A4 B4 B4 C#5 C#5  D5 D5 C#5 C#5 B4 B4 A4 A4 G4 G4 F#4 F#4 G4 G4 E4 E4") },
  { nombre: "Eine kleine Nachtmusik (Mozart)", notas: nt("G4 D4 G4 D4 G4 D4 G4 B4 D5  C5 C5 A4 C5 A4 F#4 A4 F#4 D4") },
  { nombre: "Marcha Turca (Mozart)", notas: nt("B4 A4 G#4 A4 C5  D5 C5 B4 C5 E5  F5 E5 D#5 E5 B5 A5 G#5 A5 B5 A5 G#5 A5 C6 B5 A5 G#5 A5") },
  { nombre: "Greensleeves (tradicional inglés)", notas: nt("A4 C5 D5 E5 F5 E5 D5 B4 G4 A4 B4 C5 A4 A4 G#4 A4 B4 G#4 E4  A4 C5 D5 E5 F5 E5 D5 B4 G4 A4 B4 C5 B4 A4 G#4 F#4 G#4 A4") },
  { nombre: "Canción de cuna (Brahms)", notas: nt("E4 E4 G4  E4 E4 G4  E4 G4 C5 B4 A4 A4 G4  D4 E4 F4  D4 D4 E4 F4  D4 F4 B4 A4 G4 B4 C5") },
  { nombre: "Quinta Sinfonía (Beethoven)", notas: nt("G4 G4 G4 D#4  F4 F4 F4 D4  G4 G4 G4 D#4  F4 F4 F4 D4") },
  { nombre: "Preludio en Do (Bach)", notas: nt("C4 E4 G4 C5 E5 G4 C5 E5 C4 E4 G4 C5 E5 G4 C5 E5  C4 D4 A4 D5 F5 A4 D5 F5 C4 D4 A4 D5 F5 A4 D5 F5  B3 D4 G4 D5 F5 G4 D5 F5 B3 D4 G4 D5 F5 G4 D5 F5  C4 E4 G4 C5 E5 G4 C5 E5 C4 E4 G4 C5 E5 G4 C5 E5") },
  { nombre: "Estrellita (Mozart)", notas: nt("C4 C4 G4 G4 A4 A4 G4  F4 F4 E4 E4 D4 D4 C4  G4 G4 F4 F4 E4 E4 D4  G4 G4 F4 F4 E4 E4 D4  C4 C4 G4 G4 A4 A4 G4  F4 F4 E4 E4 D4 D4 C4") },
  { nombre: "En la gruta del rey de la montaña (Grieg)", notas: nt("B3 C#4 D4 E4 F#4 D4 F#4  F4 C#4 F4  E4 C4 E4  B3 C#4 D4 E4 F#4 D4 F#4 B4 A4 F#4 D4 F#4 A4") },
  { nombre: "Claro de luna (Beethoven, inicio)", notas: nt("G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 A3 C#4 E4 A3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4") },
  { nombre: "Tocata y fuga en Re menor (Bach)", notas: nt("A5 G5 A5 G5 F5 E5 D5 C#5 D5  A4 G4 A4 G4 F4 E4 D4 C#4 D4") },
  { nombre: "Au clair de la lune (tradicional francés)", notas: nt("C4 C4 C4 D4 E4 D4  C4 E4 D4 D4 C4  C4 C4 C4 D4 E4 D4  C4 E4 D4 D4 C4  D4 D4 D4 D4 A4 A4 D4 C4 B3 A3 G3  C4 C4 C4 D4 E4 D4  C4 E4 D4 D4 C4") },
  { nombre: "Frère Jacques (tradicional francés)", notas: nt("C4 D4 E4 C4  C4 D4 E4 C4  E4 F4 G4  E4 F4 G4  G4 A4 G4 F4 E4 C4  G4 A4 G4 F4 E4 C4  C4 G3 C4  C4 G3 C4") },
  { nombre: "Amazing Grace (tradicional)", notas: nt("D4 G4 B4 G4 B4 A4 G4 E4 D4  D4 G4 B4 G4 B4 A4 D5  D5 B4 D5 B4 G4 D4 E4 G4 G4  D4 G4 B4 G4 B4 A4 G4 E4 D4  D4 G4 B4 G4 B4 A4 G4") },
  { nombre: "La Cucaracha (tradicional mexicana)", notas: nt("C4 C4 C4 F4 A4  C4 C4 C4 F4 A4  F4 F4 E4 E4 D4 D4 C4  C4 C4 C4 F4 A4  C4 C4 C4 F4 A4  F4 F4 E4 E4 D4 D4 C4") },
  { nombre: "Noche de paz (Gruber)", notas: nt("G4 A4 G4 E4  G4 A4 G4 E4  D5 D5 B4  C5 C5 G4  A4 A4 C5 B4 A4 G4 A4 G4 E4  A4 A4 C5 B4 A4 G4 A4 G4 E4  D5 D5 F5 D5 B4 C5 E5  C5 G4 E4 G4 F4 D4 C4") },
  { nombre: "Jingle Bells (popular, 1857)", notas: nt("E4 E4 E4  E4 E4 E4  E4 G4 C4 D4 E4  F4 F4 F4 F4 F4 E4 E4 E4 E4 D4 D4 E4 D4 G4  E4 E4 E4  E4 E4 E4  E4 G4 C4 D4 E4  F4 F4 F4 F4 F4 E4 E4 E4 E4 G4 G4 F4 D4 C4") },
  { nombre: "Cumpleaños feliz (popular)", notas: nt("G4 G4 A4 G4 C5 B4  G4 G4 A4 G4 D5 C5  G4 G4 G5 E5 C5 B4 A4  F5 F5 E5 C5 D5 C5") },
  { nombre: "Oh! Susanna (Foster, 1848)", notas: nt("C4 D4 E4 G4 G4 A4 G4 E4 C4 D4 E4 E4 D4 C4 D4  C4 D4 E4 G4 G4 A4 G4 E4 C4 D4 E4 E4 D4 D4 C4") },
  { nombre: "Mary tenía un corderito (popular)", notas: nt("E4 D4 C4 D4 E4 E4 E4  D4 D4 D4  E4 G4 G4  E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4") },
  { nombre: "Sinfonía de la Sorpresa (Haydn)", notas: nt("C4 C4 E4 E4 G4 G4 E4  F4 F4 D4 D4 B3 B3 G3  C4 C4 E4 E4 G4 G4 E4  F4 F4 D4 D4 G3 C4") },
  { nombre: "Auld Lang Syne (tradicional escocés)", notas: nt("C4 F4 F4 F4 A4 G4 F4 G4 A4 F4 F4 A4 C5 D5  D5 C5 A4 A4 F4 G4 F4 G4 A4 F4 D4 D4 C4") },
  { nombre: "Joy to the World (Handel/Mason)", notas: nt("C5 B4 A4 G4 F4 E4 D4 C4  G4 A4 A4 B4 B4 C5 C5  C5 B4 A4 G4 G4 F4 E4  C5 C5 B4 A4 G4 G4 F4 E4  E4 E4 E4 E4 E4 F4 G4 F4 E4 D4  D4 D4 D4 D4 E4 F4 E4 D4 C4") },
  { nombre: "Puente de Londres (tradicional)", notas: nt("G4 A4 G4 F4 E4 F4 G4  D4 E4 F4  E4 F4 G4  G4 A4 G4 F4 E4 F4 G4  D4 G4 E4 C4") },
  { nombre: "Yankee Doodle (tradicional)", notas: nt("C4 C4 D4 E4 C4 E4 D4 G3  C4 C4 D4 E4 C4 B3  C4 C4 D4 E4 F4 E4 D4 C4 B3 G3 A3 B3 C4 C4") },
  { nombre: "Hot Cross Buns (tradicional)", notas: nt("E4 D4 C4  E4 D4 C4  C4 C4 C4 C4 D4 D4 D4 D4  E4 D4 C4") },
  { nombre: "Old MacDonald (tradicional)", notas: nt("C4 C4 C4 G4 A4 A4 G4  E4 E4 D4 D4 C4  C4 C4 C4 G4 A4 A4 G4  E4 E4 D4 D4 C4") },
  { nombre: "Rema, rema, rema tu bote (tradicional)", notas: nt("C4 C4 C4 D4 E4  E4 D4 E4 F4 G4  C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4  G4 F4 E4 D4 C4") },
  { nombre: "La araña pequeñita (tradicional)", notas: nt("G3 C4 C4 C4 D4 E4 E4 E4 D4 C4 D4 E4 C4") },
  { nombre: "Lightly Row (tradicional alemán)", notas: nt("G4 E4 E4 F4 D4 D4  C4 D4 E4 F4 G4 G4 G4  G4 E4 E4 F4 D4 D4  C4 E4 G4 G4 E4") },
  { nombre: "Deck the Halls (tradicional galés)", notas: nt("G5 F5 E5 D5 C5 D5 E5 C5  D5 E5 F5 D5 E5 D5 C5 B4 C5") },
  { nombre: "We Wish You a Merry Christmas (tradicional)", notas: nt("D4 G4 G4 A4 G4 F#4 E4  E4 A4 A4 B4 A4 G4 F#4  D4 B4 B4 C5 B4 A4 G4  E4 D4 D4 E4 A4 F#4 G4") },
  { nombre: "The Star-Spangled Banner (Smith, 1814)", notas: nt("G4 E4 C4 E4 G4 C5 E5  D5 C5 E4 F#4 G4") },
  { nombre: "God Save the King (tradicional)", notas: nt("G4 G4 A4 F#4 G4 A4  B4 B4 C5 B4 A4 G4 A4 G4 F#4 G4") },
  { nombre: "Cuando los santos (spiritual tradicional)", notas: nt("C4 E4 F4 G4  C4 E4 F4 G4  C4 E4 F4 G4 E4 C4 E4 D4 E4  C4 E4 F4 G4 E4 C4 D4 C4") },
  { nombre: "The Entertainer (Joplin, 1902)", notas: nt("D4 D#4 E4 C5 E4 C5 E4 C5  C5 D5 D#5 E5 C5 D5 E5 B4 D5 C5") },
  { nombre: "Los tres ratones ciegos (tradicional)", notas: nt("E4 D4 C4  E4 D4 C4  G4 F4 F4 E4  G4 F4 F4 E4") },
  { nombre: "O Tannenbaum (tradicional alemán)", notas: nt("C4 F4 F4 F4 G4 A4 A4  A4 G4 A4 Bb4 E4 G4 F4") },
  { nombre: "Sakura (tradicional japonés)", notas: nt("A4 A4 B4  A4 A4 B4  A4 B4 C5 B4 A4 B4 A4 F4 E4") },
  { nombre: "Amanecer (Grieg, Peer Gynt)", notas: nt("B4 G#4 F#4 E4 F#4 G#4  B4 G#4 F#4 E4 F#4 G#4  B4 G#4 F#4 E4") },
];
// Cada canción es { nombre, notas, midi }. «midi: true» = viene de un archivo .mid (melodias-piano.js); los dos botones de filtro del menú las separan.
const MELODIAS = MANUALES.map((c) => ({ ...c, midi: false }));
let filtro = null, soloFav = false; // filtro: null = todas, "midi" = solo las de un .mid, "sin" = solo las escritas a mano; soloFav = además, solo las favoritas
let melodia = MELODIAS[0].notas, ultimaMelodia = -1, modo = null; // modo: null = aleatorio, o el número de la canción elegida
let usuario = null, filas = [], puntos = 0, vivo = false, ultimo = 0, error = null, audio = null, avance = 0, inicio = 0, seg = 0, despl = 0, marcas = [null, null, null];
let actual = 0, vueltas = 0; // canción en juego y vueltas completas de la melodía en esta partida
let pantalla = "inicio", origen = "canciones", nivelActual = 0, meta = 0; // pantalla: inicio | canciones | niveles | juego | fin; origen: de dónde vino la partida; nivelActual/meta: si se juega un nivel del mapa (0 = no)
let pausado = false, tPausa = 0, raf = 0, partida = 0; // ☰ Pausa; cuadro de animación pendiente; nº de partida (para ignorar respuestas tardías de una anterior)

// ---- Progreso por canción: se guarda siempre en el navegador (localStorage) ----
// Por canción: mejor puntaje, partidas jugadas, vueltas completas (⭐ si completaste la melodía alguna vez) y los récords r1, r2 y r3
// (la mayor cantidad de teclas tocadas dentro del minuto 1, 2 y 3). Claves reservadas (empiezan con «_»): _niv = { max, hecho } del mapa de
// niveles y _fav = { "nombre de la canción": { f: 1 | 0, t: hora } } (favoritas; gana el cambio más reciente al unir con la nube)
const CLAVE = "piano:progreso";
const cargarLocal = () => { try { const o = JSON.parse(localStorage.getItem(CLAVE)); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
let nube = null; // se llena cuando carga compartido/progreso.js (el juego nunca depende de Firebase)
const guardarLocal = () => { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} if (nube) nube.guardado(); };
// Une dos progresos: de cada número se queda con el mayor (así nada se cuenta dos veces); de cada favorita, con el cambio más reciente
function unirPiano(a, b) {
  const ok = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (!ok(a) && !ok(b)) return null;
  const n = (v) => Math.max(0, Math.floor(Number(v)) || 0);
  const r = {};
  for (const x of [b, a]) {
    if (!ok(x)) continue;
    for (const k in x) {
      const q = x[k]; if (!ok(q)) continue;
      if (k === "_niv") { const o = r._niv || { max: 1, hecho: 0 }; r._niv = { max: Math.max(o.max, n(q.max), 1), hecho: Math.max(o.hecho, n(q.hecho)) }; continue; }
      if (k === "_fav") {
        const o = r._fav || {};
        for (const nombre in q) { const v = q[nombre]; if (ok(v) && (!o[nombre] || n(v.t) > o[nombre].t)) o[nombre] = { f: v.f ? 1 : 0, t: n(v.t) }; }
        r._fav = o; continue;
      }
      const o = r[k] || { mejor: 0, partidas: 0, vueltas: 0, r1: 0, r2: 0, r3: 0 };
      r[k] = { mejor: Math.max(o.mejor, n(q.mejor)), partidas: Math.max(o.partidas, n(q.partidas)), vueltas: Math.max(o.vueltas, n(q.vueltas)),
        r1: Math.max(o.r1, n(q.r1)), r2: Math.max(o.r2, n(q.r2)), r3: Math.max(o.r3, n(q.r3)) };
    }
  }
  return r;
}
let progreso = cargarLocal();
const botones = [], favs = [], celdas = []; // por canción: su cuadro, su estrellita ☆/⭐ y el contenedor de ambos
// Cada canción es un cuadro del menú: nota, nombre corto (sin el autor entre paréntesis) y, si ya la jugaste, tu mejor puntaje (⭐ si la completaste)
const corto = (k) => MELODIAS[k].nombre.replace(/\s*\([^)]*\)\s*$/, "");
function pintarCuadro(b, k) {
  const p = progreso[MELODIAS[k].nombre];
  b.innerHTML = "<span class=\"nota\">🎵</span><b></b><small></small>";
  b.querySelector("b").textContent = corto(k);
  b.querySelector("small").textContent = p ? (p.vueltas ? "⭐ " : "") + p.mejor : "";
  b.title = MELODIAS[k].nombre + (p ? " · mejor " + p.mejor : "");
}
// Récords (1, 2 y 3 minutos) de una canción
const recordsDe = (k) => { const p = progreso[MELODIAS[k].nombre] || {}; return [p.r1, p.r2, p.r3].map((x) => Math.max(0, Math.floor(Number(x)) || 0)); };
function registrar() {
  const nombre = MELODIAS[actual].nombre;
  const p = progreso[nombre] || { mejor: 0, partidas: 0, vueltas: 0, r1: 0, r2: 0, r3: 0 };
  p.partidas++; p.vueltas += vueltas; p.mejor = Math.max(p.mejor, puntos);
  const rec = recordsDe(actual);
  MARCAS.forEach((_, i) => { p["r" + (i + 1)] = Math.max(rec[i], marcas[i] || 0); });
  progreso[nombre] = p;
  guardarLocal();
  botones.forEach((b, k) => pintarCuadro(b, k));
}
// Favoritas
const esFav = (k) => { const q = progreso._fav && progreso._fav[MELODIAS[k].nombre]; return !!(q && q.f); };
function pintarFav(k) {
  const f = favs[k], si = esFav(k), t = (si ? "Quitar de favoritas: " : "Añadir a favoritas: ") + corto(k);
  f.textContent = si ? "⭐" : "☆";
  f.classList.toggle("on", si);
  f.title = t; f.setAttribute("aria-label", t); f.setAttribute("aria-pressed", String(si));
}
function alternarFav(k) {
  if (!progreso._fav || typeof progreso._fav !== "object") progreso._fav = {};
  progreso._fav[MELODIAS[k].nombre] = { f: esFav(k) ? 0 : 1, t: Date.now() };
  guardarLocal(); pintarFav(k); aplicarFiltro();
}
// Avance en el mapa de niveles: max = nivel más alto abierto, hecho = nivel más alto terminado
const nivProg = () => { const q = progreso._niv || {}; return { max: Math.max(1, Math.floor(Number(q.max)) || 1), hecho: Math.max(0, Math.floor(Number(q.hecho)) || 0) }; };
function ganarNivel(n) {
  const q = nivProg();
  progreso._niv = { max: Math.min(ETAPAS.total, Math.max(q.max, n + 1)), hecho: Math.max(q.hecho, n) };
  guardarLocal();
}

// La sesión y los puntos (Firebase) se cargan aparte: si no hay conexión o Firebase falla, el juego igual funciona (solo sin puntos en el perfil)
let entrarGoogle = null;
import("../compartido/jugador.js").then((m) => {
  entrarGoogle = m.entrar;
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
}).catch((e) => { console.warn("Piano: sesión no disponible", e); });
btnEntrar.addEventListener("click", () => { if (entrarGoogle) entrarGoogle().catch((e) => { estado.textContent = e.message; }); });

// ---- Sonido: piano sintetizado con Web Audio (sin archivos, funciona sin internet) ----
// Versión ligera para celulares modestos: UN oscilador por nota con una onda de armónicos precalculada, sin reverberación ni ruido de
// martillo, notas más cortas y un máximo de notas sonando a la vez (si entra una más, la más antigua se apaga con un desvanecimiento).
// Para afinar el sonido a tu gusto cambia estas constantes:
// Para que no suenen chillonas: cada canción se baja por OCTAVAS COMPLETAS (la melodía no se deforma) hasta que su nota media quede en
// «mediaMax» (65 = Fa4) o más abajo, sin que su nota más grave pase de «graveMin» (40 = Mi2). Las canciones que ya eran graves no se tocan.
// «transponer» baja o sube TODAS por igual en semitonos (por ejemplo -2 = un tono más grave).
const SON = { duracion: 1.4, volumen: 0.4, voces: 4, transponer: 0, mediaMax: 65, graveMin: 40 }; // duración base (s), volumen, notas simultáneas máximas, ajuste de tono
const ARMONICOS = [1, 0.5, 0.25, 0.12]; // fuerza de cada armónico (el primero es la nota base)
let bus = null, onda = null, vivas = [];
function prepararAudio() {
  if (audio) { if (audio.state !== "running") audio.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Este navegador no soporta Web Audio");
  audio = new AC();
  const comp = audio.createDynamicsCompressor(); // evita que se sature cuando suenan varias notas juntas
  comp.threshold.value = -20; comp.knee.value = 24; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
  comp.connect(audio.destination);
  bus = audio.createGain(); bus.connect(comp);
  // Una sola onda con todos los armónicos: 1 oscilador por nota en lugar de 12
  const real = new Float32Array(ARMONICOS.length + 1), imag = new Float32Array(ARMONICOS.length + 1);
  ARMONICOS.forEach((a, i) => { imag[i + 1] = a; });
  onda = audio.createPeriodicWave(real, imag);
  // Desbloqueo para Android/iOS: un sonido silencioso de 1 muestra
  const s = audio.createBufferSource();
  s.buffer = audio.createBuffer(1, 1, 22050);
  s.connect(audio.destination); s.start(0);
  if (audio.state !== "running") audio.resume().catch(() => {});
}
function sonarNota(f) {
  const t = audio.currentTime, vol = SON.volumen;
  const dur = SON.duracion * Math.min(1.5, Math.max(0.5, 1.6 - Math.log2(f / 130) * 0.25)); // los graves duran más que los agudos
  while (vivas.length >= SON.voces) { // demasiadas notas a la vez: se apaga la más antigua
    const v = vivas.shift();
    try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.02); v.o.stop(t + 0.15); } catch (e) {}
  }
  const o = audio.createOscillator(), g = audio.createGain();
  o.setPeriodicWave(onda); o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
  const v = { o, g };
  vivas.push(v);
  o.onended = () => { g.disconnect(); const i = vivas.indexOf(v); if (i >= 0) vivas.splice(i, 1); };
}
function sonarError() { // golpe grave y corto al tocar la tecla equivocada
  try {
    prepararAudio();
    const t = audio.currentTime, o = audio.createOscillator(), f = audio.createBiquadFilter(), g = audio.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    f.type = "lowpass"; f.frequency.value = 420;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(f); f.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.3);
  } catch (e) {}
}
const midiDe = (f) => 69 + 12 * Math.log2(f / 440);
// Cuántos semitonos (0, -12, -24…) hay que bajar una melodía para que no suene aguda (ver SON.mediaMax y SON.graveMin)
function octavasAbajo(notas) {
  if (!notas.length) return 0;
  const ms = notas.map(midiDe), media = ms.reduce((a, b) => a + b, 0) / ms.length, grave = Math.min(...ms);
  let d = 0;
  while (media + d > SON.mediaMax && grave + d - 12 >= SON.graveMin) d -= 12;
  return d;
}
function nota() {
  try {
    prepararAudio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    sonarNota(melodia[puntos % melodia.length] * 2 ** ((despl + SON.transponer) / 12)); // al terminar la melodía, vuelve a empezar
  } catch (e) { console.warn("Piano: no se pudo sonar la nota", e); }
}
const columna = () => Math.floor(Math.random() * COLS);
const fmt = (s) => { s = Math.floor(Math.max(0, s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

// ---- Pantallas: inicio (menú principal) · canciones · niveles (mapa estándar) · juego · fin ----
// El ☰ de arriba a la izquierda: oculto en el menú principal; «Menú principal» en las listas y al terminar; «Pausa» durante la partida
function rotularMenu(modo) {
  btnMenu.hidden = modo === "oculto";
  btnMenu.innerHTML = "<span class=\"b-ico\">☰</span> " + (modo === "pausa" ? "Pausa" : "Menú principal");
  btnMenu.title = modo === "pausa" ? "Pausa" : "Volver al menú principal";
}
function ponerPantalla(p) {
  pantalla = p;
  document.body.classList.toggle("jugando", p === "juego"); // el CSS usa esta clase para mover el texto y dejar libre el lienzo
  pInicio.hidden = p !== "inicio";
  menu.hidden = p !== "canciones";
  cv.hidden = p !== "juego" && p !== "fin";
  jugar.hidden = alMenu.hidden = p !== "fin";
  if (p !== "fin") panelRecords.hidden = true;
  rotularMenu(p === "inicio" ? "oculto" : p === "juego" ? "pausa" : "menu");
  scrollTo(0, 0);
}
function irInicio() {
  mapa.cerrar();
  vivo = false; pausado = false; cancelAnimationFrame(raf);
  ponerPantalla("inicio");
  estado.textContent = "Toca las teclas negras que bajan, al ritmo de la melodía. No hay límite de tiempo: sigue hasta equivocarte y anota tu récord a 1, 2 y 3 minutos.";
}
function mostrarCanciones() {
  origen = "canciones";
  ponerPantalla("canciones");
  estado.textContent = "Elige una canción o juega al azar. Toca ☆ para guardarla en tus favoritas.";
}
function abrirNiveles(n) {
  origen = "niveles";
  ponerPantalla("niveles");
  estado.textContent = "";
  mapa.abrir(n);
}
const volverOrigen = () => (origen === "niveles" ? abrirNiveles(nivelActual || undefined) : mostrarCanciones());

// Aviso corto flotante (sobre el mapa y los botones fijos)
let tAviso = 0;
function aviso(texto) {
  let d = document.getElementById("aviso-piano");
  if (!d) { d = document.createElement("div"); d.id = "aviso-piano"; d.className = "aviso"; d.setAttribute("role", "status"); document.body.appendChild(d); }
  d.textContent = texto; d.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => { d.hidden = true; }, 2800);
}

// ---- Mapa de niveles estándar (compartido/mapa-niveles.js): 30 niveles por estado de México y por país del mundo ----
// Los niveles se definen en niveles-piano.js (NIVELES[n - 1] = { cancion, puntos }); por ahora está vacío.
function jugarNivel(n) {
  const def = NIVELES[n - 1];
  if (!def) { aviso("Este nivel todavía no está listo. ¡Pronto habrá más!"); return; }
  const k = MELODIAS.findIndex((c) => c.nombre === def.cancion);
  if (k < 0) { aviso("No se encontró la canción de este nivel."); return; }
  origen = "niveles"; nivelActual = n; meta = Math.max(0, Math.floor(Number(def.puntos)) || 0); modo = k;
  empezar();
}
const mapa = montarMapa({
  prefijo: "piano",
  etapas: ETAPAS,
  progreso: nivProg,
  jugarNivel,
  avisoPrincipal: () => (NIVELES.length ? "" : "Los niveles llegan pronto 🎹"),
  leyenda: NIVELES.length ? "" : "Todavía no hay niveles en esta etapa.",
  infoNivel: (n) => ({ sub: NIVELES[n - 1] ? "" : "pronto" }),
});

function textoJuego() { // texto de la píldora de arriba a la derecha durante la partida
  const u = marcas.map((m, i) => (m === null ? null : (i + 1) + "′: " + m)).filter(Boolean).pop(); // último minuto ya cumplido
  estado.textContent = (u ? "⏱️ " + u + " · " : "") + (vueltas ? "🔁 " + (vueltas + 1) + " · " : "") + (nivelActual ? "Nivel " + nivelActual + " · " : "") + "🎼 " + MELODIAS[actual].nombre;
}
function empezar() {
  filas = [];
  for (let i = 0; i < 6; i++) filas.push({ c: columna(), y: H - RH * (i + 2), hit: false });
  puntos = 0; avance = 0; inicio = 0; seg = 0; marcas = [null, null, null]; error = null; vivo = true; ultimo = performance.now();
  partida++; pausado = false; cancelAnimationFrame(raf);
  mapa.cerrar();
  ponerPantalla("juego");
  let k = modo; // canción elegida en el menú...
  if (k === null) { // ...o al azar entre las canciones visibles (respeta los filtros del menú), sin repetir la anterior
    let lista = MELODIAS.map((_, i) => i).filter(visible);
    if (!lista.length) lista = MELODIAS.map((_, i) => i);
    if (lista.length > 1) lista = lista.filter((i) => i !== ultimaMelodia);
    k = lista[Math.floor(Math.random() * lista.length)];
  }
  ultimaMelodia = k;
  melodia = MELODIAS[k].notas; actual = k; vueltas = 0; despl = octavasAbajo(melodia);
  textoJuego();
  raf = requestAnimationFrame(ciclo);
}

// ---- Menú de canciones: un cuadro cuadrado por canción, con su estrellita de favorita ----
function agregarCuadro(m, k) {
  const celda = document.createElement("div");
  celda.className = "celda";
  const b = document.createElement("button");
  b.className = "cuadro"; b.type = "button";
  const h = (k * 47) % 360; // un color distinto por canción
  b.style.setProperty("--c1", "hsl(" + h + ",55%,40%)"); b.style.setProperty("--c2", "hsl(" + ((h + 40) % 360) + ",55%,24%)");
  pintarCuadro(b, k);
  b.addEventListener("click", () => { origen = "canciones"; nivelActual = 0; meta = 0; modo = k; empezar(); });
  const f = document.createElement("button");
  f.className = "fav"; f.type = "button";
  f.addEventListener("click", () => alternarFav(k));
  celda.append(b, f);
  rejilla.appendChild(celda); celdas.push(celda); botones.push(b); favs.push(f);
  pintarFav(k);
  celda.hidden = !visible(k);
}
// Filtros: «Con MIDI» / «Sin MIDI» (pulsar el activo vuelve a mostrar todas) y «Favoritas» (se combina con los otros). El modo aleatorio también los respeta.
const fMidi = $("fMidi"), fSin = $("fSin"), fFav = $("fFav");
function visible(k) { return (!filtro || MELODIAS[k].midi === (filtro === "midi")) && (!soloFav || esFav(k)); }
function aplicarFiltro() {
  let hay = 0, nFav = 0;
  celdas.forEach((c, k) => { const v = visible(k); c.hidden = !v; if (v) hay++; if (esFav(k)) nFav++; });
  for (const [b, activo] of [[fMidi, filtro === "midi"], [fSin, filtro === "sin"], [fFav, soloFav]]) { b.classList.toggle("on", activo); b.setAttribute("aria-pressed", String(activo)); }
  $("nMidi").textContent = MELODIAS.filter((c) => c.midi).length;
  $("nSin").textContent = MELODIAS.filter((c) => !c.midi).length;
  $("nFav").textContent = nFav;
  vacio.hidden = hay > 0;
  vacio.textContent = soloFav && !nFav ? "Aún no tienes favoritas: toca ☆ en una canción para guardarla aquí." : "No hay canciones con este filtro.";
}
fMidi.addEventListener("click", () => { filtro = filtro === "midi" ? null : "midi"; aplicarFiltro(); });
fSin.addEventListener("click", () => { filtro = filtro === "sin" ? null : "sin"; aplicarFiltro(); });
fFav.addEventListener("click", () => { soloFav = !soloFav; aplicarFiltro(); });
MELODIAS.forEach(agregarCuadro);
aplicarFiltro();
// Las canciones de los .mid se cargan aparte: si no se pudieran cargar (archivo ausente), el piano sigue con las escritas a mano
import("./melodias-piano.js").then((mod) => {
  for (const c of mod.MELODIAS_MIDI) { const o = { nombre: c.nombre, notas: nt(c.notas), midi: true }; MELODIAS.push(o); agregarCuadro(o, MELODIAS.length - 1); }
  fMidi.hidden = fSin.hidden = false; aplicarFiltro();
}).catch((e) => console.warn("Piano: no se pudieron cargar las canciones MIDI", e));

// ---- Botones del menú principal ----
$("bNiveles").addEventListener("click", () => abrirNiveles());
$("bCanciones").addEventListener("click", mostrarCanciones);
$("modoAzar").addEventListener("click", () => { origen = "canciones"; nivelActual = 0; meta = 0; modo = null; empezar(); });
alMenu.addEventListener("click", volverOrigen);
btnMenu.addEventListener("click", () => { if (pantalla !== "juego") irInicio(); }); // en partida el ☰ abre la pausa (más abajo); en las demás pantallas vuelve al menú principal

function dibujar() {
  const osc = document.documentElement.classList.contains("oscura"); // madera oscura: colores claros para verse sobre ella
  const linea = osc ? "rgba(241,242,244,.3)" : "rgba(74,42,16,.35)";
  const tinta = osc ? "#f1f2f4" : "#4a2a10";
  cx.clearRect(0, 0, W, H); // lienzo TRANSPARENTE: se ve la madera del fondo (estándar de los juegos)
  cx.lineWidth = 1; cx.strokeStyle = linea;
  cx.strokeRect(0.5, 0.5, W - 1, H - 1);
  for (let i = 1; i < COLS; i++) { cx.beginPath(); cx.moveTo(i * CW, 0); cx.lineTo(i * CW, H); cx.stroke(); }
  cx.lineWidth = 2; cx.strokeStyle = "rgba(255,244,194,.85)"; // borde claro: la tecla negra se ve también sobre la madera oscura
  const tecla = (c, y, color) => { cx.fillStyle = color; cx.fillRect(c * CW + 2, y + 2, CW - 4, RH - 4); cx.strokeRect(c * CW + 3, y + 3, CW - 6, RH - 6); };
  filas.forEach((f) => tecla(f.c, f.y, f.hit ? "#b9b3ff" : "#111"));
  if (error) tecla(error.c, error.y, "#e53935");
  // Textos sobre la madera: relleno + contorno de contraste
  cx.lineJoin = "round"; cx.lineWidth = 4; cx.strokeStyle = osc ? "rgba(0,0,0,.55)" : "rgba(255,240,210,.8)";
  cx.fillStyle = tinta; cx.font = "bold 36px system-ui"; cx.textAlign = "center";
  cx.strokeText(String(puntos), W / 2, 50); cx.fillText(String(puntos), W / 2, 50);
  cx.font = "bold 20px system-ui"; cx.textAlign = "right"; // reloj de la partida: cuenta hacia arriba desde la primera tecla
  const reloj = fmt(seg);
  cx.strokeText(reloj, W - 10, 30); cx.fillText(reloj, W - 10, 30);
  // Récords de esta canción a 1, 2 y 3 minutos (en verde mientras los superas; 🏆 si ya los superaste al cumplirse ese minuto)
  const rec = recordsDe(actual);
  cx.font = "bold 12px system-ui"; cx.textAlign = "left"; cx.lineWidth = 3;
  MARCAS.forEach((m, i) => {
    const t = (i + 1) + " min: " + rec[i] + (marcas[i] !== null && marcas[i] > rec[i] ? " 🏆" : "");
    cx.fillStyle = marcas[i] === null && puntos > rec[i] ? (osc ? "#5fe08a" : "#1b7a37") : tinta;
    cx.strokeText(t, 8, 18 + i * 15); cx.fillText(t, 8, 18 + i * 15);
  });
  cx.textAlign = "start";
}
function ciclo(t) {
  if (!vivo || pausado) return;
  const dt = Math.min((t - ultimo) / 1000, 0.05);
  ultimo = t;
  // La banda solo baja lo que falta por avanzar (se suma al acertar una tecla); si no hay nada pendiente, se queda quieta
  const paso = Math.min(avance, 1400 * dt);
  avance -= paso;
  filas.forEach((f) => { f.y += paso; });
  while (filas[filas.length - 1].y > -RH) filas.push({ c: columna(), y: filas[filas.length - 1].y - RH, hit: false });
  filas = filas.filter((f) => f.y < H + RH);
  seg = inicio ? Math.max(0, (t - inicio) / 1000) : 0; // el tiempo corre solo después de la primera tecla
  MARCAS.forEach((m, i) => { if (marcas[i] === null && seg >= m) { marcas[i] = puntos; textoJuego(); } }); // al cumplirse el minuto 1, 2 o 3 se anota el puntaje
  dibujar();
  if (vivo && !pausado) raf = requestAnimationFrame(ciclo);
}
function tocar(e) {
  if (!vivo || pausado) return;
  const col = Math.min(COLS - 1, Math.floor(((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width) * COLS));
  // Siempre se toca la tecla negra más baja que aún no se ha tocado
  const objetivo = filas.filter((f) => !f.hit).sort((a, b) => b.y - a.y)[0];
  if (!objetivo) return;
  if (objetivo.c === col) {
    if (!inicio) inicio = performance.now();
    objetivo.hit = true; nota(); puntos++; avance += RH;
    if (puntos % melodia.length === 0) { vueltas++; textoJuego(); } // melodía completa: vuelve a empezar en bucle (el reloj sigue corriendo)
    if (meta && puntos >= meta) { fin("¡Nivel completado!", true); dibujar(); } // partida de un nivel del mapa: se gana al llegar a la meta
  } else { error = { c: col, y: objetivo.y }; sonarError(); fin("Tocaste la tecla equivocada."); dibujar(); }
}
// Cuadro de récords al terminar: lo logrado en esta partida dentro de cada minuto frente al récord anterior
function mostrarRecords(previo) {
  panelRecords.replaceChildren();
  MARCAS.forEach((m, i) => {
    const nuevo = marcas[i] > previo[i];
    const c = document.createElement("div"); c.className = "rec" + (nuevo ? " nuevo" : "");
    const a = document.createElement("small"); a.textContent = (i + 1) + " min";
    const b = document.createElement("b"); b.textContent = String(marcas[i]);
    const r = document.createElement("span"); r.textContent = nuevo ? "🏆 ¡Récord!" : "Récord " + previo[i];
    c.append(a, b, r); panelRecords.appendChild(c);
  });
  panelRecords.hidden = false;
}
async function fin(motivo, gano) {
  vivo = false; cancelAnimationFrame(raf);
  const esta = partida; // si ya empezó otra partida (o se volvió al menú) cuando responda Firebase, no se toca el texto
  const dur = inicio ? (performance.now() - inicio) / 1000 : 0;
  MARCAS.forEach((m, i) => { if (marcas[i] === null) marcas[i] = puntos; }); // la partida terminó dentro de esa ventana de tiempo: cuenta lo que llevabas
  const previo = recordsDe(actual);
  ponerPantalla("fin");
  jugar.textContent = "Jugar otra vez"; // repite el mismo modo (aleatorio, la misma canción o el mismo nivel)
  registrar();
  mostrarRecords(previo);
  if (gano && nivelActual) ganarNivel(nivelActual);
  estado.textContent = motivo + " Hiciste " + puntos + " puntos" + (vueltas ? " (" + vueltas + " vuelta" + (vueltas > 1 ? "s" : "") + " completa" + (vueltas > 1 ? "s" : "") + " 🔁)" : "") + " en " + fmt(dur) + ". Tu mejor en esta canción: " + progreso[MELODIAS[actual].nombre].mejor + ".";
  if (!puntos) return;
  // Los puntos se anotan SIEMPRE en el dispositivo y se envían al perfil cuando haya internet y sesión
  encolarPuntos(ID, puntos);
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  if (esta !== partida || vivo || pantalla !== "fin") return;
  estado.textContent += pendientes === 0 ? " Guardados ✓" : " Puntos anotados: se enviarán a tu perfil cuando haya internet y sesión.";
}
// Nube: el progreso por canción (récords, favoritas y niveles) se une con el de la cuenta
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: unirPiano, alCambiar: (v) => {
    progreso = v;
    botones.forEach((b, k) => pintarCuadro(b, k)); favs.forEach((_, k) => pintarFav(k)); aplicarFiltro(); mapa.refrescar();
  } });
}).catch(() => {});
// Menú de pausa estándar (☰): congela la partida (y el reloj); «Empezar de nuevo» repite el modo y «Salir» vuelve a donde estabas (canciones o mapa)
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => vivo,
  alAbrir: () => { pausado = true; tPausa = performance.now(); cancelAnimationFrame(raf); },
  alContinuar: () => {
    if (!vivo) return;
    const ahora = performance.now();
    if (inicio) inicio += ahora - tPausa; // el tiempo en pausa no cuenta
    pausado = false; ultimo = ahora; raf = requestAnimationFrame(ciclo);
  },
  extras: () => [{ icono: "🔁", texto: "Empezar de nuevo", clase: "b-azul", alElegir: () => empezar() }],
  alSalir: () => { vivo = false; pausado = false; volverOrigen(); },
  ayudaSalir: "Pierdes los puntos de esta partida.",
});
document.addEventListener("visibilitychange", () => { if (document.hidden && vivo && !pausado) pausa.abrir(); }); // al cambiar de pestaña se pausa solo
// Desbloqueo del audio con el primer gesto real (touchend/click/keydown sí cuentan en Android y iOS)
const desbloquear = () => { try { prepararAudio(); } catch (e) { console.warn("Piano: audio", e); } };
["touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, desbloquear, { passive: true }));
cv.addEventListener("pointerdown", tocar);
jugar.addEventListener("click", empezar);
irInicio();
dibujar(); // pantalla inicial
