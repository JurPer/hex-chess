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

function hexagonAxial(R) {
  const cells = [];
  for (let q = -R; q <= R; q++) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R, -q + R);
    for (let r = rMin; r <= rMax; r++) cells.push({ q, r });
  }
  return cells; // 1 + 3R(R+1) -> 19 when R=2
}

const RADIUS = 2;
const COORDS = hexagonAxial(RADIUS); // 19 axial coords

export default class HexChessBoard extends React.Component {
  static defaultProps = { size: 35 }; // hex radius in px

  onClick = (id) => {
    if (this.isActive(id) && this.props.moves?.clickCell) {
      this.props.moves.clickCell(id);
    }
  };

  isActive(id) {
    if (!this.props.isActive) return false;
    if (this.props.G?.cells?.[id] !== null) return false;
    return true;
  }

  render() {
    const size = this.props.size;

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
            const active = this.isActive(id);
            const piece = this.props.G?.cells?.[id] ?? null;

            return (
              <g key={id} onClick={() => this.onClick(id)}>
                <polygon
                  key={id}
                  className={active ? "active" : ""}
                  points={hexPointsFlat(x, y, size)}
                />
                {/* label 1..19 (remove if not needed) */}
                <text className="index" x={x} y={y + size * 0.55} textAnchor="middle">
                  {id + 1}
                </text>

                {/* piece layer (optional) */}
                {piece ? (
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={size * 0.9}
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
