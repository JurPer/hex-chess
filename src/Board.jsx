import React from "react";
import "./board.css";
import { PIECES, legalMovesFromCells } from "./Game";
import { axialToPixelFlat, hexPointsFlat, hexagonStarAxial } from "./hexGrid";
import { isBackRank } from "./shared/rules";

/**
 * Hexagonal grid as array of axial coordinates
 *
 * @type {Array<[number, number]}
 */
const GRID = hexagonStarAxial(2);

/**
 * Handles the UI for the Hex Chess game.
 *
 * @export
 * @class HexChessBoard
 * @extends {React.Component}
 */
export default class HexChessBoard extends React.Component {
  state = { setupTarget: null, selectedIndex: null, legalTargets: [] };

  /* ****** Helpers ****** */
  isSetupPhase() {
    return this.props.ctx?.phase === "setup";
  }

  getCurrentColor() {
    return this.props.ctx?.currentPlayer === "0" ? "W" : "B";
  }

  componentDidUpdate(prevProps) {
    // Clear setup target when the pool changes (placement done)
    if (prevProps.G?.setupPool !== this.props.G?.setupPool && this.state.setupTarget != null) {
      this.setState({ setupTarget: null });
    }
    // Clear selection on phase change / turn change if you like
    if (
      prevProps.ctx?.phase !== this.props.ctx?.phase ||
      prevProps.ctx?.currentPlayer !== this.props.ctx?.currentPlayer
    ) {
      this.setState({ selectedIndex: null, legalTargets: [] });
    }
  }

  /**
   * Handles clicks on the board
   *
   * @param {number} id of the clicked cell
   */
  onHexClick = (id) => {
    const { G } = this.props;
    const myColor = this.getCurrentColor();
    if (this.isSetupPhase()) {
      if (G.cells[id] == null && isBackRank(myColor, id)) {
        this.setState({ setupTarget: id });
      }
      return;
    }

    // Play phase: selection and commit are local UI
    const piece = G.cells[id];

    // 1) select your own piece
    if (piece && piece.color === myColor) {
      const legalTargets = legalMovesFromCells(G.cells, id);
      this.setState({ selectedIndex: id, legalTargets });
      return;
    }

    // 2) commit if clicking a legal target
    const { selectedIndex, legalTargets } = this.state;
    if (selectedIndex != null && legalTargets.includes(id)) {
      this.props.moves.play(selectedIndex, id);
      this.setState({ selectedIndex: null, legalTargets: [] });
      return;
    }

    // 3) otherwise clear selection
    this.setState({ selectedIndex: null, legalTargets: [] });
  };

  renderSetupPanel() {
    if (!this.isSetupPhase()) return null;
    const color = this.getCurrentColor();
    const setupPool = this.props.G.setupPool[color]; // ['WR','WN','WB','WQ','WK']
    const { setupTarget } = this.state;

    return (
      <div className="setup-panel">
        <div className="setup-hint">Setup: {color === "W" ? "White" : "Black"}</div>
        <div className="setup-pieces">
          {setupPool.map((code) => (
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

    // match result banner
    let matchResult = null;
    if (this.props.ctx?.gameover) {
      matchResult =
        this.props.ctx.gameover.winner !== undefined ? (
          <div id="match-result">Winner: {this.props.ctx.gameover.winner}</div>
        ) : (
          <div id="match-result">Draw!</div>
        );
    }

    const { selectedIndex, legalTargets, setupTarget } = this.state;

    return (
      <div id="board">
        <svg
          viewBox={viewBox}
          width={Math.min(640, maxX - minX)}
          style={{ maxWidth: "100%", height: "auto", display: "block" }}
        >
          {centers.map(({ x, y }, id) => {
            const piece = this.props.G?.cells?.[id] ?? null;

            const canPlaceHere =
              this.isSetupPhase() &&
              isBackRank(this.getCurrentColor(), id) &&
              this.props.G.cells[id] == null;

            const isSelected = selectedIndex === id;
            const isLegalMove = legalTargets.includes(id);

            return (
              <g key={id} onClick={() => this.onHexClick(id)}>
                {/* cell */}
                <polygon
                  className={[
                    isSelected && "selected",
                    canPlaceHere && "setup-target",
                    setupTarget === id && "setup-selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  points={hexPointsFlat(x, y, size)}
                />

                {/* label 1..37 (optional) */}
                <text className="index" x={x} y={y + size * 0.75} textAnchor="middle">
                  {id + 1}
                </text>

                {/* legal target dot */}
                {isLegalMove ? (
                  <circle cx={x} cy={y} r={size * 0.25} fill="#9aa0a6" pointerEvents="none" />
                ) : null}

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
        {this.renderSetupPanel()}
        {matchResult}
      </div>
    );
  }
}
