import React from "react";
import "./board.css";

import { axialToPixelFlat, hexPointsFlat, hexagonStarAxial } from "./hexGrid";

const GRID = hexagonStarAxial(2);

export default class HexChessBoard extends React.Component {
  onClick = (id) => {
    if (this.props.moves?.clickCell) {
      this.props.moves.clickCell(id);
    }
  };

  render() {
    const size = 35; // hex size in px

    // centers for each hex
    const centers = GRID.map(({ q, r }) => axialToPixelFlat(q, r, size));

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
                {/* label 1..37 (optional) */}
                <text className="index" x={x} y={y + size * 0.75} textAnchor="middle">
                  {id + 1}
                </text>

                {/* piece */}
                {piece ? (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 1.2}
                    pointerEvents="none"
                  >
                    {piece.glyph}
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
