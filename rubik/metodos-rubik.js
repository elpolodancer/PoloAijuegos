// Ruta: rubik/metodos-rubik.js
// Guía de los dos métodos para resolver el cubo 3×3: el normal (capa por capa) y el Friedrich (escrito oficialmente «Fridrich», CFOP).
// Cada paso tiene un texto y, si hace falta, algoritmos: { n: nombre, a: movimientos en notación, d: ayuda }. El botón «Verlo» del juego
// arma el caso deshaciendo el algoritmo y luego lo reproduce (ver parsear e invertir en logica-rubik.js).
// Los algoritmos se comprueban con una prueba en Node (ver README-rubik.md): este archivo se puede ampliar sin tocar el juego.
export const NOTACION = "Cada letra es una cara: U arriba, D abajo, L izquierda, R derecha, F frente y B atrás. Una letra sola es un cuarto de vuelta a favor del reloj mirando esa cara; con ′ (apóstrofo) es al revés y con 2 es media vuelta. M, E y S son las capas del medio (giran como L, D y F). Una minúscula (r, f…) gira la cara y la capa del medio juntas. x, y y z giran todo el cubo (como R, U y F). Todos los algoritmos se leen con el cubo en la misma posición que lo ves en la demostración: amarillo arriba y verde al frente.";

export const METODOS = [
  {
    id: "normal", nombre: "Método normal", sub: "Capa por capa · para empezar",
    intro: "Es el método que se enseña a quien resuelve por primera vez: 7 pasos y solo 6 algoritmos cortos. Se tarda más (unos 100 movimientos), pero casi todo se entiende viendo el cubo. Elige un color para la primera capa (aquí, blanco abajo): la última capa queda arriba y los algoritmos de los pasos 4 a 7 se hacen con ella arriba.",
    pasos: [
      { t: "1. Cruz de la primera capa", txt: "Ponla en la cara de abajo (D): 4 aristas blancas, y el otro color de cada una debe coincidir con el centro de su lado. No hay algoritmo: sube cada arista a la capa de arriba, gírala (U) hasta que quede sobre su sitio y bájala con media vuelta de su cara.", algs: [] },
      { t: "2. Esquinas de la primera capa", txt: "Pon una esquina blanca arriba, justo encima de su hueco (en la esquina frontal derecha, mirando al frente) y repite el movimiento «sexy» hasta que quede abajo con el blanco hacia abajo (de 1 a 5 veces). Si una esquina está abajo pero mal puesta, súbela primero con R U R′.", algs: [
        { n: "Movimiento «sexy»", a: "R U R' U'", d: "Repítelo hasta que la esquina baje bien." },
        { n: "Sacar una esquina mal puesta", a: "R U R'", d: "La sube a la capa de arriba para volver a colocarla." } ] },
      { t: "3. Segunda capa (aristas)", txt: "Busca una arista de la capa de arriba que NO tenga amarillo. Gira U hasta que el color del frente coincida con el centro del frente. Si su otro color manda a la derecha, usa el primer algoritmo; si manda a la izquierda, el segundo.", algs: [
        { n: "Arista hacia la derecha", a: "U R U' R' U' F' U F" },
        { n: "Arista hacia la izquierda", a: "U' L' U L U F U' F'" } ] },
      { t: "4. Cruz de la última capa", txt: "Mira las aristas amarillas de arriba: un punto (ninguna), una L (dos juntas) o una línea (dos opuestas). Con la línea en horizontal, o con la L en la parte de atrás a la izquierda, haz el algoritmo. Repite hasta que se forme la cruz amarilla (punto → L → línea → cruz).", algs: [
        { n: "Cruz amarilla", a: "F R U R' U' F'" } ] },
      { t: "5. Esquinas de arriba hacia arriba", txt: "Ahora haz que el amarillo mire hacia arriba en las cuatro esquinas (no importa si están fuera de lugar). Pon una esquina amarilla (o, si no hay ninguna, cualquiera) en la esquina frontal izquierda y haz Sune; repite, girando U entre cada vez, hasta que todas queden bien.", algs: [
        { n: "Sune", a: "R U R' U R U2 R'" } ] },
      { t: "6. Colocar las esquinas", txt: "Gira U hasta que al menos una esquina esté en su sitio (sus tres colores coinciden con los centros vecinos). Si solo una está bien, colócala atrás a la derecha y haz el algoritmo; repite hasta que las cuatro estén bien.", algs: [
        { n: "Esquinas en ciclo", a: "U R U' L' U R' U' L" } ] },
      { t: "7. Colocar las aristas", txt: "Gira U hasta que una arista esté bien. Si hay tres mal, pon la que está bien atrás y haz el algoritmo (si las tres giran al lado contrario, usa el segundo). Si ninguna está bien, haz el algoritmo una vez desde cualquier lado y vuelve a mirar. ¡Resuelto!", algs: [
        { n: "Aristas en ciclo (a)", a: "R U' R U R U R U' R' U' R2" },
        { n: "Aristas en ciclo (b)", a: "R2 U R U R' U' R' U' R' U R'" } ] },
    ],
  },
  {
    id: "friedrich", nombre: "Método Friedrich", sub: "CFOP · el más usado en competencias",
    intro: "Lo creó Jessica Fridrich a principios de los años 80 (su apellido se escribe así; por sus cuatro etapas también se llama CFOP: Cross, F2L, OLL, PLL). Resuelve el cubo en unos 55 movimientos, pero pide aprender más algoritmos y practicar mucho la vista y los dedos: la versión completa tiene 57 casos de OLL y 21 de PLL. Aquí tienes la versión «de dos pasadas», con 10 algoritmos de OLL y 6 de PLL.",
    pasos: [
      { t: "C · Cruz (Cross)", txt: "Haz la cruz de la capa de abajo (blanca) de forma eficiente: se puede resolver siempre en 8 movimientos o menos. Mira bien el cubo antes de empezar (en competencia se tienen 15 segundos de inspección) y planea la cruz entera sin mirar mientras la haces.", algs: [] },
      { t: "F · Primeras dos capas (F2L)", txt: "En vez de hacer primero esquinas y luego aristas, une cada esquina con su arista (un «par») en la capa de arriba y métela junta en su hueco. Son 4 pares y 41 casos posibles, pero se aprenden entendiendo cómo se mueven las piezas, no de memoria. Con estos movimientos básicos ya puedes resolver muchos pares.", algs: [
        { n: "Meter un par unido por la derecha", a: "U R U' R'" },
        { n: "Meter un par unido por el frente", a: "U' F' U F" },
        { n: "Sacar una esquina del hueco", a: "R U R'", d: "Sirve para separar un par mal metido y volver a armarlo." },
        { n: "Disparador «sexy»", a: "R U R' U'", d: "Aparece en muchos casos de F2L y de OLL." },
        { n: "Disparador «martillo»", a: "R' F R F'" } ] },
      { t: "O · Orientar la última capa (OLL)", txt: "Deja toda la cara de arriba amarilla; el orden de las piezas todavía no importa. En dos pasadas: primero la cruz amarilla (3 casos) y luego las esquinas (7 casos). Los casos de las esquinas se reconocen por cuántas esquinas amarillas ya miran arriba.", algs: [
        { n: "Cruz: línea", a: "F R U R' U' F'" },
        { n: "Cruz: L", a: "f R U R' U' f'" },
        { n: "Cruz: punto", a: "F R U R' U' F' f R U R' U' f'" },
        { n: "Esquinas: Sune", a: "R U R' U R U2 R'", d: "Una esquina amarilla ya arriba, a la izquierda." },
        { n: "Esquinas: Antisune", a: "R U2 R' U' R U' R'", d: "Una esquina amarilla ya arriba, a la derecha." },
        { n: "Esquinas: H", a: "F R U R' U' R U R' U' R U R' U' F'" },
        { n: "Esquinas: Pi", a: "R U2 R2 U' R2 U' R2 U2 R" },
        { n: "Esquinas: T", a: "r U R' U' r' F R F'" },
        { n: "Esquinas: U", a: "R2 D R' U2 R D' R' U2 R'" },
        { n: "Esquinas: L", a: "F R' F' r U R U' r'" } ] },
      { t: "P · Permutar la última capa (PLL)", txt: "Con todo el amarillo arriba, solo falta mover las piezas a su lugar. En dos pasadas: primero las esquinas (2 casos) y luego las aristas (4 casos). Si las esquinas ya están bien, salta ese paso; gira U al final para alinear la capa.", algs: [
        { n: "Esquinas: Aa (tres esquinas)", a: "x R' U R' D2 R U' R' D2 R2" },
        { n: "Esquinas: Y (dos esquinas en diagonal)", a: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
        { n: "Aristas: Ua", a: "R U' R U R U R U' R' U' R2" },
        { n: "Aristas: Ub", a: "R2 U R U R' U' R' U' R' U R'" },
        { n: "Aristas: H", a: "M2 U M2 U2 M2 U M2" },
        { n: "Aristas: Z", a: "M' U M2 U M2 U M' U2 M2" } ] },
      { t: "Normal frente a Friedrich", txt: "Normal: 7 pasos, 6 algoritmos y unos 100 movimientos; es fácil de aprender y tarda más. Friedrich: 4 etapas, 78 algoritmos en la versión completa (aquí 16) y unos 55 movimientos; pide práctica, pero es el que usan casi todos los campeones. Un buen camino: aprende el normal, cambia la cruz a «abajo», aprende F2L y luego OLL y PLL de dos pasadas.", algs: [] },
    ],
  },
];
