import React from "react";
import "./board.css";

/* ---------- geometry (flat-top hexes) ---------- */
const SQRT3 = Math.sqrt(3);

function axialToPixelFlat(q, r, size) {
  // q to the right, r down-right (60°)
  const x = size * (3 / 2) * q;
  const y = size * SQRT3 * (r + q / 2);
  return { x, y };
}

function hexPointsFlat(cx, cy, size) {
  // flat-top corners at 0°, 60°, …, 300°
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function sortColsBottomToTopFlat(coords) {
  // flat-top layout ⇒ x depends only on q, so q sorts columns left→right.
  // within same column, larger r is lower on screen ⇒ sort r DESC (bottom→top).
  return [...coords].sort((a, b) => a.q - b.q || b.r - a.r);
}

/* cube helpers (orientation-agnostic) */
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

/**
 * Build hex star (flat-top)
 */
function hexagonStarAxial(R = 2) {
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

  //axial.sort((a, b) => a.r - b.r || a.q - b.q);

  return sortColsBottomToTopFlat(axial);
}

export default class HexChessBoard extends React.Component {
  onClick = (id) => {
    if (this.props.moves?.clickCell) {
      this.props.moves.clickCell(id);
    }
  };

  render() {
    const COORDS = hexagonStarAxial(2);
    const size = 35; // hex size in px

    // centers for each hex
    const centers = COORDS.map(({ q, r }) => axialToPixelFlat(q, r, size));

    // auto-fit viewBox
    const xs = centers.map((c) => c.x);
    const ys = centers.map((c) => c.y);
    const pad = size + 3;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

    // winner banner (optional)
    let winner = null;
    if (this.props.ctx?.gameover) {
      winner =
        this.props.ctx.gameover.winner !== undefined ? (
          <div id="winner">Winner: {this.props.ctx.gameover.winner}</div>
        ) : (
          <div id="winner">Draw!</div>
        );
    }

    return (
      //<div style={{ width: "100%", display: "grid", placeItems: "center" }}>
      <div id="board">
        <svg
          viewBox={viewBox}
          width={Math.min(640, maxX - minX)}
          style={{ maxWidth: "100%", height: "auto", display: "block" }}
        >
          {centers.map(({ x, y }, id) => {
            const piece = this.props.G?.cells?.[id] ?? null;
            const selected = this.props.G.selected === id;

            return (
              <g key={id} onClick={() => this.onClick(id)}>
                <polygon
                  key={id}
                  className={selected ? "selected" : ""}
                  points={hexPointsFlat(x, y, size)}
                />
                {/* label 1..19 (remove if not needed) */}
                <text className="index" x={x} y={y + size * 0.75} textAnchor="middle">
                  {id + 1}
                </text>

                {/* piece layer (optional) */}
                {piece ? (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 1.2}
                    pointerEvents="none"
                  >
                    {piece}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {winner}
      </div>
    );
  }
}
