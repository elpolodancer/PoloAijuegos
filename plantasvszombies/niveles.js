// Ruta: jardin/niveles.js
// Lista de niveles de «Jardín contra zombis». Para agregar uno: copia un bloque, cámbiale el nombre y ajusta los números.
// - filas: filas con pasto (0 a 4, de arriba abajo); el resto se ve como tierra y no se usa.
// - plantas: cartas disponibles (nombres de PLANTAS en juego.js), en el orden en que aparecen.
// - solInicial: soles con los que empieza.
// - oleadas: «en» = segundo en que sale; «zombis» = [[tipo, cantidad], ...] (tipos de ZOMBIS en juego.js);
//   «bandera: true» = gran oleada con aviso 🚩. Cada zombi sale en una fila al azar de las activas.
// Los niveles se desbloquean al ganar el anterior (el avance se guarda en el navegador).
export const NIVELES = [
  {
    nombre: "Día 1-1",
    filas: [1, 2, 3],
    plantas: ["girasol", "lanzaguisantes"],
    solInicial: 50,
    oleadas: [
      { en: 20, zombis: [["normal", 1]] },
      { en: 45, zombis: [["normal", 1]] },
      { en: 70, zombis: [["normal", 2]] },
      { en: 90, zombis: [["normal", 2]] },
      { en: 110, bandera: true, zombis: [["normal", 6]] },
    ],
  },
  {
    nombre: "Día 1-2",
    filas: [1, 2, 3],
    plantas: ["girasol", "lanzaguisantes"],
    solInicial: 50,
    oleadas: [
      { en: 15, zombis: [["normal", 1]] },
      { en: 35, zombis: [["normal", 2]] },
      { en: 60, zombis: [["normal", 2]] },
      { en: 85, zombis: [["normal", 3]] },
      { en: 110, bandera: true, zombis: [["normal", 8]] },
    ],
  },
  {
    // Estrena el petardo 🍒 y las 5 filas
    nombre: "Día 1-3",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo"],
    solInicial: 100,
    oleadas: [
      { en: 20, zombis: [["normal", 2]] },
      { en: 45, zombis: [["normal", 2]] },
      { en: 70, zombis: [["normal", 3]] },
      { en: 95, zombis: [["normal", 3], ["cono", 1]] },
      { en: 120, bandera: true, zombis: [["normal", 8]] },
    ],
  },
  {
    // Estrena la nuez 🌰 y los zombis con cono
    nombre: "Día 1-4",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 50,
    oleadas: [
      { en: 20, zombis: [["normal", 2]] },
      { en: 45, zombis: [["normal", 2], ["cono", 1]] },
      { en: 70, zombis: [["normal", 3], ["cono", 1]] },
      { en: 95, zombis: [["normal", 3], ["cono", 2]] },
      { en: 120, bandera: true, zombis: [["normal", 8], ["cono", 3]] },
    ],
  },
  {
    // Nivel largo con 2 banderas
    nombre: "Día 1-5",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 100,
    oleadas: [
      { en: 20, zombis: [["normal", 2]] },
      { en: 40, zombis: [["normal", 3], ["cono", 1]] },
      { en: 60, bandera: true, zombis: [["normal", 6], ["cono", 2]] },
      { en: 90, zombis: [["normal", 3], ["cono", 2]] },
      { en: 115, zombis: [["normal", 4], ["cono", 2]] },
      { en: 140, bandera: true, zombis: [["normal", 10], ["cono", 4]] },
    ],
  },
  // ===== Niveles 6 a 15 (usan solo plantas y zombis que ya existen en juego.js) =====
  {
    nombre: "Día 2-1",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 100,
    oleadas: [
      { en: 15, zombis: [["normal", 2]] },
      { en: 35, zombis: [["normal", 3]] },
      { en: 60, zombis: [["normal", 3], ["cono", 1]] },
      { en: 85, zombis: [["normal", 4], ["cono", 1]] },
      { en: 110, bandera: true, zombis: [["normal", 8], ["cono", 3]] },
    ],
  },
  {
    // Sin petardo: hay que apoyarse en las nueces
    nombre: "Día 2-2",
    filas: [1, 2, 3],
    plantas: ["girasol", "lanzaguisantes", "nuez"],
    solInicial: 150,
    oleadas: [
      { en: 15, zombis: [["normal", 2]] },
      { en: 35, zombis: [["normal", 2], ["cono", 1]] },
      { en: 55, zombis: [["normal", 3], ["cono", 2]] },
      { en: 80, zombis: [["normal", 4], ["cono", 2]] },
      { en: 105, bandera: true, zombis: [["normal", 8], ["cono", 4]] },
    ],
  },
  {
    // Sin nueces: los petardos son tu defensa
    nombre: "Día 2-3",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo"],
    solInicial: 100,
    oleadas: [
      { en: 15, zombis: [["normal", 3]] },
      { en: 35, zombis: [["normal", 3], ["cono", 1]] },
      { en: 60, zombis: [["normal", 4], ["cono", 2]] },
      { en: 85, zombis: [["normal", 4], ["cono", 2]] },
      { en: 110, bandera: true, zombis: [["normal", 10], ["cono", 4]] },
    ],
  },
  {
    // Filas separadas: 0, 2 y 4
    nombre: "Día 2-4",
    filas: [0, 2, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 100,
    oleadas: [
      { en: 15, zombis: [["normal", 3]] },
      { en: 35, zombis: [["normal", 3], ["cono", 1]] },
      { en: 55, zombis: [["normal", 4], ["cono", 2]] },
      { en: 80, zombis: [["normal", 5], ["cono", 2]] },
      { en: 105, bandera: true, zombis: [["normal", 10], ["cono", 4]] },
    ],
  },
  {
    // 2 banderas
    nombre: "Día 2-5",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 100,
    oleadas: [
      { en: 15, zombis: [["normal", 3]] },
      { en: 35, zombis: [["normal", 3], ["cono", 2]] },
      { en: 55, bandera: true, zombis: [["normal", 8], ["cono", 3]] },
      { en: 85, zombis: [["normal", 5], ["cono", 3]] },
      { en: 110, zombis: [["normal", 5], ["cono", 3]] },
      { en: 135, bandera: true, zombis: [["normal", 12], ["cono", 6]] },
    ],
  },
  {
    // Un solo carril: todos los zombis vienen por la fila del medio
    nombre: "Día 2-6",
    filas: [2],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 200,
    oleadas: [
      { en: 15, zombis: [["normal", 2]] },
      { en: 35, zombis: [["normal", 3]] },
      { en: 55, zombis: [["normal", 3], ["cono", 1]] },
      { en: 80, zombis: [["normal", 4], ["cono", 2]] },
      { en: 105, bandera: true, zombis: [["normal", 8], ["cono", 3]] },
    ],
  },
  {
    // Sin girasoles: solo cuentan los soles del cielo y los 300 iniciales
    nombre: "Día 2-7",
    filas: [0, 1, 2, 3, 4],
    plantas: ["lanzaguisantes", "petardo", "nuez"],
    solInicial: 300,
    oleadas: [
      { en: 20, zombis: [["normal", 2]] },
      { en: 45, zombis: [["normal", 3]] },
      { en: 70, zombis: [["normal", 3], ["cono", 2]] },
      { en: 95, zombis: [["normal", 4], ["cono", 2]] },
      { en: 120, bandera: true, zombis: [["normal", 8], ["cono", 4]] },
    ],
  },
  {
    // 4 filas y 3 banderas
    nombre: "Día 2-8",
    filas: [0, 1, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 100,
    oleadas: [
      { en: 15, zombis: [["normal", 3]] },
      { en: 30, bandera: true, zombis: [["normal", 6], ["cono", 2]] },
      { en: 60, zombis: [["normal", 4], ["cono", 2]] },
      { en: 85, bandera: true, zombis: [["normal", 8], ["cono", 3]] },
      { en: 115, zombis: [["normal", 5], ["cono", 3]] },
      { en: 140, bandera: true, zombis: [["normal", 12], ["cono", 5]] },
    ],
  },
  {
    // Oleadas seguidas, casi sin descanso
    nombre: "Día 2-9",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 150,
    oleadas: [
      { en: 12, zombis: [["normal", 3]] },
      { en: 27, zombis: [["normal", 3], ["cono", 1]] },
      { en: 42, zombis: [["normal", 4], ["cono", 2]] },
      { en: 57, bandera: true, zombis: [["normal", 8], ["cono", 4]] },
      { en: 77, zombis: [["normal", 5], ["cono", 3]] },
      { en: 92, zombis: [["normal", 5], ["cono", 3]] },
      { en: 112, bandera: true, zombis: [["normal", 12], ["cono", 6]] },
    ],
  },
  {
    // Jefe final: nivel largo con 3 banderas
    nombre: "Día 2-10",
    filas: [0, 1, 2, 3, 4],
    plantas: ["girasol", "lanzaguisantes", "petardo", "nuez"],
    solInicial: 150,
    oleadas: [
      { en: 15, zombis: [["normal", 3]] },
      { en: 35, zombis: [["normal", 4], ["cono", 2]] },
      { en: 55, bandera: true, zombis: [["normal", 8], ["cono", 4]] },
      { en: 85, zombis: [["normal", 5], ["cono", 3]] },
      { en: 110, zombis: [["normal", 6], ["cono", 4]] },
      { en: 135, bandera: true, zombis: [["normal", 12], ["cono", 6]] },
      { en: 165, zombis: [["normal", 6], ["cono", 4]] },
      { en: 190, bandera: true, zombis: [["normal", 16], ["cono", 10]] },
    ],
  },
];
