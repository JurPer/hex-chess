import React from "react";
import "./board.css";
import { PIECES } from "./Game";

import { axialToPixelFlat, hexPointsFlat, hexagonStarAxial } from "./hexGrid";

const GRID = hexagonStarAxial(2);

export default class HexChessBoard extends React.Component {
  /* ****** Helper ****** */
  isSetupPhase() {
    return this.props.ctx?.phase === "setup";
  }
  currentColor() {
    return this.props.ctx?.currentPlayer === "0" ? "W" : "B";
  }
  isBackRankCell(id) {
    const back = this.currentColor() === "W" ? [3, 10, 16, 21, 27] : [9, 15, 20, 26, 33];
    return back.includes(id);
  }
  state = { setupTarget: null };
  componentDidUpdate(prevProps) {
    if (prevProps.G?.setupPool !== this.props.G?.setupPool && this.state.setupTarget != null) {
      this.setState({ setupTarget: null });
    }
  }

  /**
   * Event handler for a click on a cell
   * @param {*} id
   */
  onClick = (id) => {
    if (this.isSetupPhase()) {
      const isEmpty = this.props.G.cells[id] == null;
      if (isEmpty && this.isBackRankCell(id)) {
        this.setState({ setupTarget: id }); // pick target cell
      }
      return;
    }
    // normal play:
    this.props.moves.clickCell(id);
  };
  renderSetupPanel() {
    if (!this.isSetupPhase()) return null;
    const color = this.currentColor();
    const bag = this.props.G.setupPool[color]; // ['WR','WN','WB','WQ','WK']
    const { setupTarget } = this.state;

    return (
      <div className="setup-panel">
        <div>Setup-pool: {color === "W" ? "White" : "Black"} </div>
        <div className="setup-pieces">
          {bag.map((code) => (
            <button
              key={code}
              disabled={setupTarget == null}
              onClick={() => this.props.moves.placePiece(setupTarget, code)}
              title={code}
              className="setup-piece-btn"
            >
              {PIECES[code].glyph}
            </button>
          ))}
        </div>
        <div className="setup-hint">
          {setupTarget == null ? "Click an empty back-rank hex" : `Target: ${setupTarget + 1}`}
        </div>
      </div>
    );
  }

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
            // setup
            const setupTarget = this.state.setupTarget;
            const canPlaceHere =
              this.isSetupPhase() && this.isBackRankCell(id) && this.props.G.cells[id] == null;

            <polygon
              className={[
                canPlaceHere && "setup-target",
                setupTarget === id && "setup-selected",
              ]
                .filter(Boolean)
                .join(" ")}
              /* ...other props... */
            />;

            const piece = this.props.G?.cells?.[id] ?? null;
            const selected = this.props.G.selected === id;
            //const isLegalMove = this.props.G.legalMoves.includes(id);
            const isLegalMove =
              Array.isArray(this.props.G?.legalMoves) && this.props.G.legalMoves.includes(id);

            return (
              <g key={id} onClick={() => this.onClick(id)}>
                {/* cell */}
                <polygon
                  key={id}
                  className={selected ? "selected" : ""}
                  points={hexPointsFlat(x, y, size)}
                />
                {/* label 1..37 (optional) */}
                <text className="index" x={x} y={y + size * 0.75} textAnchor="middle">
                  {id + 1}
                </text>
                {
                  /* small circle at the center of a legal target cell */
                  isLegalMove ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={size * 0.25}
                      fill={"#9aa0a6"}
                      pointerEvents="none"
                    ></circle>
                  ) : null
                }
                {
                  /* piece */
                  piece ? (
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
                  ) : null
                }
              </g>
            );
          })}
        </svg>
        {this.renderSetupPanel()}
        {winner}
      </div>
    );
  }
}
