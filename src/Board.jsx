import React from 'react';
import './board.css';
import { axialToPixelFlat, hexPointsFlat, GRID } from './shared/hexGrid';
import { legalMovesFromCells, isBackRank, colorOf, glyphOf } from './shared/rules';

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
    return this.props.ctx?.phase === 'setup';
  }

  getCurrentColor() {
    return this.props.ctx?.currentPlayer === '0' ? 'W' : 'B';
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
    const pieceCode = G.cells[id];

    // 1) select your own piece
    if (pieceCode && colorOf(pieceCode) === myColor) {
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

    const canBulkPlace = setupPool.length > 0; // enable only if pieces remain

    return (
      <div className="setup-panel">
        <div className="setup-hint">Setup: {color === 'W' ? 'White' : 'Black'}</div>
        <div className="setup-hint">
          {setupTarget == null ? 'Click an empty back-rank hex' : `Target: ${setupTarget + 1}`}
        </div>
        <div className="setup-pieces">
          {setupPool.map((pieceCode) => (
            <button
              key={pieceCode}
              disabled={setupTarget == null}
              onClick={() => this.props.moves.placePiece(setupTarget, pieceCode)}
              title={pieceCode}
              className="setup-piece-btn"
            >
              {glyphOf(pieceCode)}
            </button>
          ))}
        </div>
        <div className="setup-actions">
          <button
            disabled={!canBulkPlace}
            onClick={() => this.props.moves.placeAllFixed()}
            title="Place all remaining pieces in a fixed layout"
          >
            Place All (Fixed)
          </button>
          <button
            disabled={!canBulkPlace}
            onClick={() => this.props.moves.placeAllRandom()}
            title="Place all remaining pieces randomly"
          >
            Place All (Random)
          </button>
        </div>
      </div>
    );
  }

  renderSidePanel() {
    const playerLabel = this.props.ctx.currentPlayer === '0' ? 'White' : 'Black';
    const rows = [];
    for (let i = 0; i < this.props.G.movesLog.length; i += 2) {
      rows.push({
        turn: i / 2 + 1,
        W: this.props.G.movesLog[i] ?? null,
        B: this.props.G.movesLog[i + 1] ?? null,
      });
    }
    const lastIndex = this.props.G.movesLog.length - 1;

    return (
      <aside className="side-panel">
        <div className="turn-banner">
          <span>{playerLabel} to move</span>
        </div>
        <table className="move-table">
          <thead>
            <tr>
              <th className="col-turn">Turn</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const whiteIndex = rowIndex * 2;
              const blackIndex = whiteIndex + 1;
              const whiteActive = lastIndex === whiteIndex;
              const blackActive = lastIndex === blackIndex;
              return (
                <tr key={rowIndex}>
                  <td className="col-turn">{row.turn}</td>
                  <td className={`mv ${whiteActive ? 'active' : ''}`}>{row.W}</td>
                  <td className={`mv ${blackActive ? 'active' : ''}`}>{row.B}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </aside>
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
          <div className="match-result">Winner: {this.props.ctx.gameover.winner}</div>
        ) : (
          <div className="match-result">Draw!</div>
        );
    }

    const { selectedIndex, legalTargets, setupTarget } = this.state;

    return (
      <div className="game-layout">
        <div className="board">
          <svg
            viewBox={viewBox}
            width={Math.min(640, maxX - minX)}
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          >
            {centers.map(({ x, y }, id) => {
              const pieceCode = this.props.G?.cells?.[id] ?? null;

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
                      `cell-${id % 2}`,
                      isSelected && 'selected',
                      canPlaceHere && 'setup-target',
                      setupTarget === id && 'setup-selected',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    points={hexPointsFlat(x, y, size)}
                  />

                  {/* label 1..37 (optional) */}
                  <text className="index" x={x} y={y + size * 0.75} textAnchor="middle">
                    {id + 1}
                  </text>

                  {/* legal target dot */}
                  {isLegalMove ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={size * 0.25}
                      fill="#9aa0a6"
                      pointerEvents="none"
                    />
                  ) : null}

                  {/* piece */}
                  {pieceCode ? (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={size * 1.2}
                      pointerEvents="none"
                    >
                      {glyphOf(pieceCode)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {this.renderSetupPanel()}
        </div>
        {this.renderSidePanel()}
        {matchResult}
      </div>
    );
  }
}
