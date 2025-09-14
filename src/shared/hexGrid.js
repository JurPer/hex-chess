/**
 * Converts axial coordinates to pixel coordinates for a flat topped hexagon
 *
 * @export
 * @param {number} q 
 * @param {number} r 
 * @param {number} size 
 * @returns {{ x: number; y: number; }} 
 */
export function axialToPixelFlat(q, r, size) {
  const x = size * (3 / 2) * q;
  const y = size * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

/**
 * Calculates the points / vertices of a flat-topped hexagon
 *
 * @export
 * @param {number} cx 
 * @param {number} cy 
 * @param {number} size 
 * @returns {String} "x1,y1 x2,y2 x3,y3 ..."
 */
export function hexPointsFlat(cx, cy, size) {
  // flat-top corners at 0°, 60°, …, 300°
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
  }
  return pts.join(" ");
}

/**
 * Six cube orthogonal directions (flat-top hexes).
 * - 0: N | 1: NW | 2: SW | 3: S | 4: SE | 5: NE
 * @type {[number,number, number][]} 
 */
const CUBE_DIRS = [
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
  [1, -1, 0],
  [1, 0, -1],
];

/**
 * Six axial orthogonal directions (flat-top hexes).
 * - 0: N | 1: NW | 2: SW | 3: S | 4: SE | 5: NE
 * @type {[number,number][]}
 */
export const AXIAL_DIRS = [
  [0, -1], [-1, 0], [-1, 1],
  [0, 1], [1, 0], [1, -1],
];

/**
 * Adds two vectors
 *
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number[]} 
 */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Multiplies a vector with a number (scalar)
 *
 * @param {number[]} a 
 * @param {number} k 
 * @returns {number[]} 
 */
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/**
 * Converts cube coordinates (x, y, z) to axial coordinates (simply drops y because y=-x-z)
 *
 * @param {[number, number, number]} cube 
 * @returns {{ q: number; r: number; }} 
 */
const toAxial = ([x, , z]) => ({ q: x, r: z });

/**
 * Creates a key out of cube coordinates (used for storing coordinates in a map)
 *
 * @param {number[]} c 
 * @returns {string} 
 */
const cubeKey = (c) => `${c[0]},${c[1]},${c[2]}`;

/**
 * Creates a hexagonal grid in cube coords (default with radius 2 = 19 cells)
 *
 * @param {number} [R=2] Hex radius (number of rings around the origin)
 * @returns {Array<[number, number, number]>} Array of cube coordinates [x, y, z]
 */
function hexagonCube(R = 2) {
  const cells = [];
  for (let x = -R; x <= R; x++) {
    const yMin = Math.max(-R, -x - R);
    const yMax = Math.min(R, -x + R);
    for (let y = yMin; y <= yMax; y++) {
      const z = -x - y;
      cells.push([x, y, z]);
    }
  }
  return cells;
}

/**
 * Creates a star-shaped grid of flat-topped hexagons. Starts with a basic hexagonal grid (radius R) 
 * and then adds a triangle of hexagons on each side
 *
 * @param {number} [R=2] Hex radius (number of rings around the origin)
 * @returns {Array<[number, number]>} Array of flat-topped hexagon coordinates [q, r]
 */
function createHexagram(R = 2) {
  const base = hexagonCube(R);
  const out = new Map(base.map((c) => [cubeKey(c), c])); // dedupe

  for (let s = 0; s < 6; s++) {
    const dirOut = CUBE_DIRS[s];
    const dirIn = mul(dirOut, -1);
    const dirSide = CUBE_DIRS[(s + 1) % 6];
    const corner = mul(dirOut, R);

    for (let steps = 0; steps < R; steps++) {
      const hexSide = add(corner, mul(dirSide, steps + 1));

      for (let row = 1; row <= steps; row++) {
        const hexInside = add(hexSide, mul(dirIn, row));
        out.set(cubeKey(hexInside), hexInside);
      }

      out.set(cubeKey(hexSide), hexSide);
    }
  }

  const axial = Array.from(out.values()).map(toAxial);
  // Expected total: 6R^2 + 6R + 1
  const expected = 6 * R * R + 6 * R + 1;
  if (axial.length !== expected) {
    console.warn(`Expected ${expected} cells, got`, axial.length);
  }

  // column order: left→right by q, bottom→top by r (desc)
  axial.sort((a, b) => a.q - b.q || b.r - a.r);
  return axial;
}

/**
 * Star-shaped hex grid (axial coordinates) used by this game.
 * Built for radius `R=2`, yielding 37 cells in a hex-star shape.
 * @type {{q:number, r:number}[]}
 */
export const GRID = createHexagram(2);

/**
 * Fast lookup from axial `"q,r"` to GRID index.
 * Keys are stringified axial coords, values are 0-based indices.
 * @type {Map<string, number>}
 */
const IDX_BY_QR = new Map(GRID.map((c, i) => [`${c.q},${c.r}`, i]));

/**
 * Convert axial coords to a GRID index (or `null` if off-board).
 * @export
 * @param {number} q
 * @param {number} r
 * @returns {number|null}
 */
export const getIndexOf = (q, r) => {
  const index = IDX_BY_QR.get(`${q},${r}`);
  return index === undefined ? null : index;
};
