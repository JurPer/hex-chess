// geometry (flat-top hexes) 
const SQRT3 = Math.sqrt(3);

export function axialToPixelFlat(q, r, size) {
  const x = size * (3 / 2) * q;
  const y = size * SQRT3 * (r + q / 2);
  return { x, y };
}

export function hexPointsFlat(cx, cy, size) {
  // flat-top corners at 0°, 60°, …, 300°
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
  }
  return pts.join(" ");
}

// Flat-top hex grid for your 37-cell star (R=2) + helpers.
// Everything is plain arrays/objects (serializable-friendly).

// cube helpers (orientation-agnostic) 
const DIR = [
  [0, 1, -1], // 0
  [-1, 1, 0], // 1
  [-1, 0, 1], // 2
  [0, -1, 1], // 3
  [1, -1, 0], // 4
  [1, 0, -1], // 5
];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const toAxial = ([x, , z]) => ({ q: x, r: z });
const cubeKey = (c) => `${c[0]},${c[1]},${c[2]}`;

/* radius-2 hex (19 cells) in cube coords */
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

// Build hex star (flat-top)
export function hexagonStarAxial(R = 2) {
  const base = hexagonCube(R);
  const out = new Map(base.map((c) => [cubeKey(c), c])); // dedupe

  for (let s = 0; s < 6; s++) {
    const dirOut = DIR[s];
    const dirIn = mul(dirOut, -1);
    const dirSide = DIR[(s + 1) % 6];
    const corner = mul(dirOut, R);

    // scale for larger star shaped boards
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