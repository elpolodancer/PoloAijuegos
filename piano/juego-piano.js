// Ruta: piano/juego-piano.js (lógica del juego «piano»: tocar las teclas negras que bajan, estilo Piano Tiles)

import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID = "piano"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar"), btnMenu = $("btn-menu");
const menu = $("menu"), rejilla = $("rejilla"), alMenu = $("alMenu");
const COLS = 4, CW = W / COLS, RH = H / 4; // 4 columnas y 4 filas visibles
const TIEMPO = 60; // segundos de partida; el reloj arranca al acertar la primera tecla
// Frecuencia (Hz) de una nota por su nombre ("C4", "F#4", "Bb4"…), con La4 = 440 Hz. Sirve cualquier nota: no hay que registrarla antes
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function frecuencia(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) { console.warn("Piano: nota desconocida «" + n + "»"); return null; }
  return 440 * 2 ** ((SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12 * (+m[3] + 1) - 69) / 12);
}
// Melodías de dominio público (música clásica). Cada acierto toca la siguiente nota. Para agregar otra: copia una línea y cambia nombre y notas
const nt = (txt) => txt.trim().split(/\s+/).map(frecuencia).filter(Boolean); // convierte "E4 D4" en frecuencias (la herramienta midi-a-notas.py genera estas líneas desde un archivo .mid)
const MELODIAS = [
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
  { nombre: "Vocalise (Rachmaninoff, inicio)", notas: nt("E4 D4 C4 D4 E4 F4 E4 G4 A4 B4 A4 G4 F#4 G4 G4 A4 B4 C5 B4 A4 G4 F4 E4 E4 D4 E4 F4 G4 G4 F4 E4 D4 C4") },
];
let melodia = MELODIAS[0].notas, ultimaMelodia = -1, modo = null; // modo: null = aleatorio, o el número de la canción elegida
let usuario = null, filas = [], puntos = 0, vivo = false, ultimo = 0, error = null, audio = null, avance = 0, inicio = 0, restante = TIEMPO;
let actual = 0, vueltas = 0; // canción en juego y vueltas completas de la melodía en esta partida
let pausado = false, tPausa = 0, raf = 0, partida = 0; // ☰ Pausa; cuadro de animación pendiente; nº de partida (para ignorar respuestas tardías de una anterior)

// ---- Progreso por canción: se guarda siempre en el navegador (localStorage) ----
// Por canción: mejor puntaje, partidas jugadas y vueltas completas (⭐ si completaste la melodía alguna vez)
const CLAVE = "piano:progreso";
const cargarLocal = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
let nube = null; // se llena cuando carga compartido/progreso.js (el juego nunca depende de Firebase)
const guardarLocal = () => { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} if (nube) nube.guardado(); };
// Une dos progresos {canción: {mejor, partidas, vueltas}}: de cada dato se queda con el mayor (así nada se cuenta dos veces)
function unirPiano(a, b) {
  const ok = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (!ok(a) && !ok(b)) return null;
  const r = {};
  for (const x of [b, a]) {
    if (!ok(x)) continue;
    for (const k in x) {
      const q = x[k]; if (!ok(q)) continue;
      const o = r[k] || { mejor: 0, partidas: 0, vueltas: 0 };
      r[k] = { mejor: Math.max(o.mejor, Number(q.mejor) || 0), partidas: Math.max(o.partidas, Number(q.partidas) || 0), vueltas: Math.max(o.vueltas, Number(q.vueltas) || 0) };
    }
  }
  return r;
}
let progreso = cargarLocal();
const botones = [];
// Cada canción es un cuadro del menú: nota, nombre corto (sin el autor entre paréntesis) y, si ya la jugaste, tu mejor puntaje (⭐ si la completaste)
const corto = (k) => MELODIAS[k].nombre.replace(/\s*\([^)]*\)\s*$/, "");
function pintarCuadro(b, k) {
  const p = progreso[MELODIAS[k].nombre];
  b.innerHTML = "<span class=\"nota\">🎵</span><b></b><small></small>";
  b.querySelector("b").textContent = corto(k);
  b.querySelector("small").textContent = p ? (p.vueltas ? "⭐ " : "") + p.mejor : "";
  b.title = MELODIAS[k].nombre + (p ? " · mejor " + p.mejor : "");
}
function registrar() {
  const nombre = MELODIAS[actual].nombre;
  const p = progreso[nombre] || { mejor: 0, partidas: 0, vueltas: 0 };
  p.partidas++; p.vueltas += vueltas; p.mejor = Math.max(p.mejor, puntos);
  progreso[nombre] = p;
  guardarLocal();
  botones.forEach((b, k) => pintarCuadro(b, k));
}

// La sesión y los puntos (Firebase) se cargan aparte: si no hay conexión o Firebase falla, el juego igual funciona (solo sin puntos en el perfil)
let entrarGoogle = null;
import("../compartido/jugador.js").then((m) => {
  entrarGoogle = m.entrar;
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
}).catch((e) => { console.warn("Piano: sesión no disponible", e); });
btnEntrar.addEventListener("click", () => { if (entrarGoogle) entrarGoogle().catch((e) => { estado.textContent = e.message; }); });

// ---- Sonido: piano sintetizado con Web Audio (sin archivos, funciona sin internet) ----
// Cada nota suma varios armónicos que se apagan a distinta velocidad (los agudos primero), con dos cuerdas apenas desafinadas (el
// «cuerpo» del piano), un golpe de martillo y un filtro que va cerrando el brillo. Todo pasa por una reverberación suave y un compresor.
// Para afinar el sonido a tu gusto cambia estas constantes:
const SON = { duracion: 2.4, volumen: 0.32, brillo: 7, reverb: 0.22, inarmonia: 0.0004 }; // duración base (s), volumen, brillo inicial (× la nota), cantidad de reverb, «metálico» de las cuerdas
const ARMONICOS = [1, 0.6, 0.34, 0.2, 0.12, 0.07]; // fuerza de cada armónico (el primero es la nota base)
let bus = null, ruido = null;
function prepararAudio() {
  if (audio) { if (audio.state === "suspended") audio.resume(); return; } // Safari/iOS lo dejan suspendido hasta el primer toque
  audio = new AudioContext();
  const comp = audio.createDynamicsCompressor(); // evita que se sature cuando suenan varias notas juntas
  comp.threshold.value = -20; comp.knee.value = 24; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
  comp.connect(audio.destination);
  bus = audio.createGain(); bus.connect(comp);
  // Reverberación: una «respuesta de sala» de ruido que se apaga sola
  const n = Math.floor(audio.sampleRate * 1.8), imp = audio.createBuffer(2, n, audio.sampleRate);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  const conv = audio.createConvolver(); conv.buffer = imp;
  const mojado = audio.createGain(); mojado.gain.value = SON.reverb;
  bus.connect(conv); conv.connect(mojado); mojado.connect(comp);
  // Golpe seco del martillo (ruido de 40 ms)
  const m = Math.floor(audio.sampleRate * 0.04);
  ruido = audio.createBuffer(1, m, audio.sampleRate);
  const r = ruido.getChannelData(0); for (let i = 0; i < m; i++) r[i] = (Math.random() * 2 - 1) * (1 - i / m);
}
function sonarNota(f) {
  const t = audio.currentTime, vol = SON.volumen;
  const dur = SON.duracion * Math.min(1.5, Math.max(0.5, 1.6 - Math.log2(f / 130) * 0.25)); // los graves duran más que los agudos
  const filtro = audio.createBiquadFilter(); // al inicio brilla y luego se va apagando, como un piano real
  filtro.type = "lowpass"; filtro.Q.value = 0.5;
  filtro.frequency.setValueAtTime(Math.min(f * SON.brillo, 10000), t);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 500), t + dur * 0.5);
  const env = audio.createGain(); // ataque rápido, caída inicial y cola larga
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(vol, t + 0.005);
  env.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  filtro.connect(env); env.connect(bus);
  ARMONICOS.forEach((a, i) => {
    const k = i + 1, fk = f * k * Math.sqrt(1 + SON.inarmonia * k * k); // las cuerdas reales no son perfectamente armónicas
    if (fk > 12000) return;
    for (const cents of [-3, 3]) { // dos cuerdas por nota, apenas desafinadas: da el «cuerpo» y un leve vibrato natural
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = fk; o.detune.value = cents;
      g.gain.setValueAtTime(a / 2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.6)); // los armónicos agudos se apagan antes
      o.connect(g); g.connect(filtro);
      o.start(t); o.stop(t + dur + 0.05);
    }
  });
  const h = audio.createBufferSource(), bp = audio.createBiquadFilter(), gh = audio.createGain();
  h.buffer = ruido; bp.type = "bandpass"; bp.frequency.value = Math.min(f * 3, 5000); bp.Q.value = 0.8; gh.gain.value = vol * 0.6;
  h.connect(bp); bp.connect(gh); gh.connect(bus); h.start(t);
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
function nota() {
  try { prepararAudio(); sonarNota(melodia[puntos % melodia.length]); } catch (e) {} // al terminar la melodía, vuelve a empezar
}
const columna = () => Math.floor(Math.random() * COLS);
function empezar() {
  filas = [];
  for (let i = 0; i < 6; i++) filas.push({ c: columna(), y: H - RH * (i + 2), hit: false });
  puntos = 0; avance = 0; inicio = 0; restante = TIEMPO; error = null; vivo = true; ultimo = performance.now();
  partida++; pausado = false; cancelAnimationFrame(raf);
  jugar.hidden = true; alMenu.hidden = true; menu.hidden = true; cv.hidden = false; btnMenu.hidden = false; scrollTo(0, 0);
  document.body.classList.add("jugando"); // el CSS usa esta clase para mover el texto y dejar libre el lienzo
  let k = modo; // canción elegida en el menú...
  if (k === null) { do { k = Math.floor(Math.random() * MELODIAS.length); } while (k === ultimaMelodia && MELODIAS.length > 1); } // ...o al azar, sin repetir la anterior
  ultimaMelodia = k;
  melodia = MELODIAS[k].notas; actual = k; vueltas = 0;
  estado.textContent = "🎼 " + MELODIAS[k].nombre;
  raf = requestAnimationFrame(ciclo);
}
// Menú principal: botón «Modo aleatorio» y una rejilla de 4 columnas con un cuadro cuadrado (1:1) por canción
function mostrarMenu() {
  document.body.classList.remove("jugando");
  menu.hidden = false; cv.hidden = true; jugar.hidden = true; alMenu.hidden = true; btnMenu.hidden = true; // el ☰ no se muestra en el menú principal
  estado.textContent = "Toca una canción para empezar, o juega al azar. Tienes 1 minuto; si tocas una tecla equivocada, pierdes.";
}
MELODIAS.forEach((m, k) => {
  const b = document.createElement("button");
  b.className = "cuadro"; b.type = "button";
  const h = (k * 47) % 360; // un color distinto por canción
  b.style.setProperty("--c1", "hsl(" + h + ",55%,40%)"); b.style.setProperty("--c2", "hsl(" + ((h + 40) % 360) + ",55%,24%)");
  pintarCuadro(b, k);
  b.addEventListener("click", () => { modo = k; empezar(); });
  rejilla.appendChild(b); botones.push(b);
});
$("modoAzar").addEventListener("click", () => { modo = null; empezar(); });
alMenu.addEventListener("click", mostrarMenu);
function dibujar() {
  const osc = document.documentElement.classList.contains("oscura"); // madera oscura: colores claros para verse sobre ella
  const linea = osc ? "rgba(241,242,244,.3)" : "rgba(74,42,16,.35)";
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
  cx.fillStyle = osc ? "#f1f2f4" : "#4a2a10"; cx.font = "bold 36px system-ui"; cx.textAlign = "center";
  cx.strokeText(String(puntos), W / 2, 50); cx.fillText(String(puntos), W / 2, 50);
  cx.font = "bold 20px system-ui"; cx.textAlign = "right";
  cx.fillStyle = restante <= 10 ? "#e53935" : (osc ? "#f1f2f4" : "#4a2a10");
  const s = Math.ceil(Math.max(restante, 0));
  const reloj = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  cx.strokeText(reloj, W - 10, 30); cx.fillText(reloj, W - 10, 30);
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
  if (inicio) restante = TIEMPO - (t - inicio) / 1000; // el tiempo corre solo después de la primera tecla
  if (restante <= 0) { restante = 0; fin("Se acabó el minuto."); }
  dibujar();
  if (vivo && !pausado) raf = requestAnimationFrame(ciclo);
}
function tocar(e) {
  if (!vivo || pausado) return;
  const col = Math.min(COLS - 1, Math.floor(((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width) * COLS));
  // Siempre se toca la tecla negra más baja que aún no se ha tocado
  const objetivo = filas.filter((f) => !f.hit).sort((a, b) => b.y - a.y)[0];
  if (!objetivo) return;
  if (objetivo.c === col) { if (!inicio) inicio = performance.now(); objetivo.hit = true; nota(); puntos++; avance += RH;
    if (puntos % melodia.length === 0) { // melodía completa: vuelve a empezar en bucle y el reloj se reinicia
      vueltas++; inicio = performance.now(); restante = TIEMPO;
      estado.textContent = "🎼 " + MELODIAS[actual].nombre + " · 🔁 vuelta " + (vueltas + 1);
    }
  }
  else { error = { c: col, y: objetivo.y }; sonarError(); fin("Tocaste la tecla equivocada."); dibujar(); }
}
async function fin(motivo) {
  vivo = false; cancelAnimationFrame(raf); btnMenu.hidden = true;
  const esta = partida; // si ya empezó otra partida (o se volvió al menú) cuando responda Firebase, no se toca el texto
  document.body.classList.remove("jugando");
  jugar.hidden = false; alMenu.hidden = false;
  jugar.textContent = "Jugar otra vez"; // repite el mismo modo (aleatorio o la misma canción)
  registrar();
  estado.textContent = motivo + " Hiciste " + puntos + " puntos" + (vueltas ? " (" + vueltas + " vuelta" + (vueltas > 1 ? "s" : "") + " completa" + (vueltas > 1 ? "s" : "") + " 🔁)" : "") + ". Tu mejor en esta canción: " + progreso[MELODIAS[actual].nombre].mejor + ".";
  if (!puntos) return;
  // Los puntos se anotan SIEMPRE en el dispositivo y se envían al perfil cuando haya internet y sesión
  encolarPuntos(ID, puntos);
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  if (esta !== partida || vivo || !menu.hidden) return;
  estado.textContent += pendientes === 0 ? " Guardados ✓" : " Puntos anotados: se enviarán a tu perfil cuando haya internet y sesión.";
}
// Nube: el progreso por canción se une con el de la cuenta
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: unirPiano, alCambiar: (v) => { progreso = v; botones.forEach((b, k) => pintarCuadro(b, k)); } });
}).catch(() => {});
// Menú de pausa estándar (☰): congela la partida (y el reloj); «Empezar de nuevo» repite el modo y «Salir» vuelve al menú de canciones
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
  alSalir: () => { vivo = false; pausado = false; mostrarMenu(); },
  ayudaSalir: "Pierdes los puntos de esta partida.",
});
document.addEventListener("visibilitychange", () => { if (document.hidden && vivo && !pausado) pausa.abrir(); }); // al cambiar de pestaña se pausa solo
cv.addEventListener("pointerdown", tocar);
jugar.addEventListener("click", empezar);
mostrarMenu();
dibujar(); // pantalla inicial
