// Ruta: piano/juego.js (lógica del juego «piano»: tocar las teclas negras que bajan, estilo Piano Tiles)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "piano"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");
const menu = $("menu"), listaCanc = $("canciones"), alMenu = $("alMenu");
const COLS = 4, CW = W / COLS, RH = H / 4; // 4 columnas y 4 filas visibles
const TIEMPO = 60; // segundos de partida; el reloj arranca al acertar la primera tecla
// Frecuencias (Hz) de las notas que usan las melodías. Para una nota nueva, añádela aquí (ej. "A4": 440)
const FREQ = { G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25,
  "F#4": 369.99, "G#4": 415.3, D5: 587.33, "D#5": 622.25, E5: 659.25, "F#5": 739.99, G5: 783.99,
  "C#5": 554.37, "D#4": 311.13, Bb4: 466.16, "G#3": 207.65, "C#4": 277.18, "G#5": 830.61, F5: 698.46, A5: 880, B5: 987.77, C6: 1046.5 };
// Melodías de dominio público (música clásica). Cada acierto toca la siguiente nota. Para agregar otra: copia una línea y cambia nombre y notas
const nt = (txt) => txt.trim().split(/\s+/).map((n) => FREQ[n]); // convierte "E4 D4" en frecuencias
const MELODIAS = [
  { nombre: "Oda a la Alegría (Beethoven)", notas: nt("E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4  E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4  D4 D4 E4 C4 D4 E4 F4 E4 C4 D4 E4 F4 E4 D4 C4 D4 G3  E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4") },
  { nombre: "Para Elisa (Beethoven)", notas: nt("E5 D#5 E5 D#5 E5 B4 D5 C5 A4  C4 E4 A4 B4  E4 G#4 B4 C5  E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4  C4 E4 A4 B4  E4 C5 B4 A4") },
  { nombre: "Minueto en Sol (Petzold/Bach)", notas: nt("D5 G4 A4 B4 C5 D5 G4 G4  E5 C5 D5 E5 F#5 G5 G4 G4  C5 D5 C5 B4 A4  B4 C5 B4 A4 G4  F#4 G4 A4 B4 G4 B4 A4 G4") },
  { nombre: "Canon en Re (Pachelbel)", notas: nt("F#5 E5 D5 C#5 B4 A4 B4 C#5  D5 C#5 B4 A4 G4 F#4 G4 E4  D5 F#5 A5 G5 F#5 D5 F#5 E5 D5 B4 D5 A4") },
  { nombre: "Eine kleine Nachtmusik (Mozart)", notas: nt("G4 D4 G4 D4 G4 D4 G4 B4 D5  C5 C5 A4 C5 A4 F#4 A4 F#4 D4") },
  { nombre: "Marcha Turca (Mozart)", notas: nt("B4 A4 G#4 A4 C5  D5 C5 B4 C5 E5  F5 E5 D#5 E5 B5 A5 G#5 A5 B5 A5 G#5 A5 C6 B5 A5 G#5 A5") },
  { nombre: "Greensleeves (tradicional inglés)", notas: nt("A4 C5 D5 E5 F5 E5 D5 B4 G4 A4 B4 C5 A4 A4 G#4 A4 B4 G#4 E4") },
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
  { nombre: "Jingle Bells (popular, 1857)", notas: nt("E4 E4 E4  E4 E4 E4  E4 G4 C4 D4 E4  F4 F4 F4 F4 F4 E4 E4 E4 E4 D4 D4 E4 D4 G4") },
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
let melodia = MELODIAS[0].notas, ultimaMelodia = -1, modo = null; // modo: null = aleatorio, o el número de la canción elegida
let usuario = null, filas = [], puntos = 0, vivo = false, ultimo = 0, error = null, audio = null, avance = 0, inicio = 0, restante = TIEMPO;
let actual = 0, vueltas = 0; // canción en juego y vueltas completas de la melodía en esta partida

// ---- Progreso por canción: se guarda siempre en el navegador (localStorage) ----
// Por canción: mejor puntaje, partidas jugadas y vueltas completas (⭐ si completaste la melodía alguna vez)
const CLAVE = "piano:progreso";
const cargarLocal = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } };
const guardarLocal = () => { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} };
let progreso = cargarLocal();
const botones = [];
function etiqueta(k) {
  const p = progreso[MELODIAS[k].nombre];
  return "🎵 " + MELODIAS[k].nombre + (p ? " · mejor " + p.mejor + (p.vueltas ? " ⭐" : "") : "");
}
function registrar() {
  const nombre = MELODIAS[actual].nombre;
  const p = progreso[nombre] || { mejor: 0, partidas: 0, vueltas: 0 };
  p.partidas++; p.vueltas += vueltas; p.mejor = Math.max(p.mejor, puntos);
  progreso[nombre] = p;
  guardarLocal();
  botones.forEach((b, k) => { b.textContent = etiqueta(k); });
  sincronizarNube();
}
function sincronizarNube() {} // gancho: aquí se respaldará el progreso en Firestore cuando haya sesión

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

function nota() {
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = melodia[puntos % melodia.length]; // al terminar la melodia, vuelve a empezar
    g.gain.setValueAtTime(0.3, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.35);
  } catch (e) {}
}
const columna = () => Math.floor(Math.random() * COLS);
function empezar() {
  filas = [];
  for (let i = 0; i < 6; i++) filas.push({ c: columna(), y: H - RH * (i + 2), hit: false });
  puntos = 0; avance = 0; inicio = 0; restante = TIEMPO; error = null; vivo = true; ultimo = performance.now();
  jugar.hidden = true; alMenu.hidden = true; menu.hidden = true; listaCanc.hidden = true;
  let k = modo; // canción elegida en el menú...
  if (k === null) { do { k = Math.floor(Math.random() * MELODIAS.length); } while (k === ultimaMelodia && MELODIAS.length > 1); } // ...o al azar, sin repetir la anterior
  ultimaMelodia = k;
  melodia = MELODIAS[k].notas; actual = k; vueltas = 0;
  estado.textContent = "🎼 " + MELODIAS[k].nombre;
  requestAnimationFrame(ciclo);
}
// Menú: «Modo aleatorio» o «Elegir canción» (lista con todas las melodías)
function mostrarMenu() {
  menu.hidden = false; listaCanc.hidden = true; jugar.hidden = true; alMenu.hidden = true;
  estado.textContent = "Elige cómo quieres jugar. Tienes 1 minuto; si tocas una tecla equivocada, pierdes.";
}
function mostrarLista() {
  menu.hidden = true; listaCanc.hidden = false;
  estado.textContent = "Elige una canción:";
}
MELODIAS.forEach((m, k) => {
  const b = document.createElement("button");
  b.className = "btn"; b.type = "button"; b.textContent = etiqueta(k);
  b.addEventListener("click", () => { modo = k; empezar(); });
  listaCanc.appendChild(b); botones.push(b);
});
const atras = document.createElement("button");
atras.className = "btn"; atras.type = "button"; atras.textContent = "‹ Volver";
atras.addEventListener("click", mostrarMenu);
listaCanc.appendChild(atras);
$("modoAzar").addEventListener("click", () => { modo = null; empezar(); });
$("modoLista").addEventListener("click", mostrarLista);
alMenu.addEventListener("click", mostrarMenu);
function dibujar() {
  cx.fillStyle = "#fff";
  cx.fillRect(0, 0, W, H);
  cx.strokeStyle = "#ccc";
  for (let i = 1; i < COLS; i++) { cx.beginPath(); cx.moveTo(i * CW, 0); cx.lineTo(i * CW, H); cx.stroke(); }
  filas.forEach((f) => {
    cx.fillStyle = f.hit ? "#b9b3ff" : "#111";
    cx.fillRect(f.c * CW + 2, f.y + 2, CW - 4, RH - 4);
  });
  if (error) { cx.fillStyle = "#e53935"; cx.fillRect(error.c * CW + 2, error.y + 2, CW - 4, RH - 4); }
  cx.fillStyle = "#7c5cff"; cx.font = "bold 36px system-ui"; cx.textAlign = "center";
  cx.fillText(String(puntos), W / 2, 50);
  cx.font = "bold 20px system-ui"; cx.textAlign = "right";
  cx.fillStyle = restante <= 10 ? "#e53935" : "#7c5cff";
  const s = Math.ceil(Math.max(restante, 0));
  cx.fillText(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"), W - 10, 30);
  cx.textAlign = "start";
}
function ciclo(t) {
  if (!vivo) return;
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
  if (vivo) requestAnimationFrame(ciclo);
}
function tocar(e) {
  if (!vivo) return;
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
  else { error = { c: col, y: objetivo.y }; fin("Tocaste la tecla equivocada."); dibujar(); }
}
async function fin(motivo) {
  vivo = false;
  jugar.hidden = false; alMenu.hidden = false;
  jugar.textContent = "Jugar otra vez"; // repite el mismo modo (aleatorio o la misma canción)
  registrar();
  estado.textContent = motivo + " Hiciste " + puntos + " puntos" + (vueltas ? " (" + vueltas + " vuelta" + (vueltas > 1 ? "s" : "") + " completa" + (vueltas > 1 ? "s" : "") + " 🔁)" : "") + ". Tu mejor en esta canción: " + progreso[MELODIAS[actual].nombre].mejor + ".";
  if (!usuario || !puntos) return;
  try { await sumarPuntos(ID, puntos); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
}
cv.addEventListener("pointerdown", tocar);
jugar.addEventListener("click", empezar);
mostrarMenu();
dibujar(); // pantalla inicial
