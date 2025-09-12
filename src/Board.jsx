import React from 'react';
import './board.css';
import { axialToPixelFlat, hexPointsFlat, GRID } from './shared/hexGrid';
import { legalMovesFromCells, isBackRank, colorOf, glyphOf } from './shared/rules';

const colorIndex = (i) => (((GRID[i].q - GRID[i].r) % 3) + 3) % 3;

/**
 * Handles the UI for the Hex Chess game.
 *
 * @export
 * @class HexChessBoard
 * @extends {React.Component}
 */
export default class HexChessBoard extends React.Component {
  state = {
    setupTarget: null,
    selectedIndex: null,
    legalTargets: [],
    lastColor: null,
    lastWhiteIndex: null,
    lastBlackIndex: null,
  };

  /* ****** Helpers ****** */
  isSetupPhase() {
    return this.props.ctx?.phase === 'setup';
  }

  getCurrentColor() {
    return this.props.ctx?.currentPlayer === '0' ? 'W' : 'B';
  }

  setLastmove(color) {
    const movesLog = this.props.G.movesLog;
    let index = 0;
    for (let i = 0; i < movesLog.length; i++) {
      if (movesLog[i][color] != null) {
        index = i;
      }
    }

    this.setState({ lastColor: color });
    if (color === 'W') {
      this.setState({ lastWhiteIndex: index });
    } else {
      this.setState({ lastBlackIndex: index });
    }
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
      this.setState({
        selectedIndex: null,
        legalTargets: [],
      });
      this.setLastmove(prevProps.ctx?.currentPlayer === '0' ? 'W' : 'B');
    }
  }

  /**
   * Handles clicks on the board
   *
   * @param {number} id of the clicked cell
   */
  onHexClick = (id) => {
    const { G } = this.props;
    const color = this.getCurrentColor();
    if (this.isSetupPhase()) {
      if (G.cells[id] == null && isBackRank(color, id)) {
        this.setState({ setupTarget: id });
      }
      return;
    }

    // Play phase: selection and commit are local UI
    const pieceCode = G.cells[id];

    // 1) select your own piece
    if (pieceCode && colorOf(pieceCode) === color) {
      const legalTargets = legalMovesFromCells(G.cells, id);
      this.setState({ selectedIndex: id, legalTargets });
      return;
    }

    // 2) commit if clicking a legal target
    const { selectedIndex, legalTargets } = this.state;
    if (selectedIndex != null && legalTargets.includes(id)) {
      this.props.moves.play(selectedIndex, id);
      this.setState({
        selectedIndex: null,
        legalTargets: [],
      });
      this.setLastmove(color);
      return;
    }

    // 3) otherwise clear selection
    this.setState({ selectedIndex: null, legalTargets: [] });
  };

  renderSetupPanel() {
    if (!this.isSetupPhase()) return null;
    const color = this.getCurrentColor();
    const setupPool = this.props.G.setupPool[color];
    const { setupTarget } = this.state;

    const canBulkPlace = setupPool.length > 0;

    return (
      <div className="setup-panel">
        <div className="setup-hint">Setup: {color === 'W' ? 'White' : 'Black'}</div>
        <div className="setup-hint">
          {setupTarget == null
            ? 'Click an empty back-rank hex'
            : `Selected: ${setupTarget + 1}`}
        </div>
        <div className="setup-pieces">
          {setupPool.map((pieceCode) => (
            <button
              key={pieceCode}
              disabled={setupTarget == null}
              onClick={() => {
                this.props.moves.placePiece(setupTarget, pieceCode);
                this.setLastmove(color);
              }}
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
            onClick={() => {
              this.props.moves.placeAllFixed();
              this.setLastmove(color);
            }}
            title="Place all remaining pieces in a fixed layout"
          >
            Place All (Fixed)
          </button>
          <button
            disabled={!canBulkPlace}
            onClick={() => {
              this.props.moves.placeAllRandom();
              this.setLastmove(color);
            }}
            title="Place all remaining pieces randomly"
          >
            Place All (Random)
          </button>
        </div>
      </div>
    );
  }

  renderSidePanel() {
    const color = this.getCurrentColor();
    const playerLabel = color === 'W' ? 'White' : 'Black';
    const { lastColor, lastWhiteIndex, lastBlackIndex } = this.state;

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
            {this.props.G.movesLog.map((row, index) => {
              const isWhiteActive = index === lastWhiteIndex && lastColor === 'W';
              const isBlackActive = index === lastBlackIndex && lastColor === 'B';
              /*               console.log('\nlastColor ', lastColor);
              console.log('lastWhiteIndex ', lastWhiteIndex);
              console.log('isWhiteActive ', isWhiteActive);
              console.log('lastBlackIndex ', lastBlackIndex);
              console.log('isBlackActive ', isWhiteActive); */
              return (
                <tr key={index}>
                  <td className="col-turn">{index + 1}</td>
                  <td className={`mv ${isWhiteActive ? 'active' : ''}`}>{row.W}</td>
                  <td className={`mv ${isBlackActive ? 'active' : ''}`}>{row.B}</td>
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
            <defs>
              <filter id="blur">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>
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
                      `cell-${colorIndex(id)}`,
                      isSelected && 'selected',
                      canPlaceHere && 'setup-target',
                      setupTarget === id && 'setup-selected',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    points={hexPointsFlat(x, y, size)}
                  />

                  {/* label 1..37 (optional) */}
                  <text
                    className="index"
                    x={x}
                    y={y + size * 0.75}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {id + 1}
                  </text>

                  {/* piece */}
                  {pieceCode ? (
                    <text
                      className="piece"
                      x={x}
                      y={y}
                      fontSize={size * 1.2}
                      pointerEvents="none"
                    >
                      {glyphOf(pieceCode)}
                    </text>
                  ) : null}

                  {/* legal target dot */}
                  {isLegalMove ? (
                    <circle
                      className="dot"
                      cx={x}
                      cy={y}
                      r={size * 0.25}
                      filter="url(#blur)"
                      pointerEvents="none"
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
          {this.renderSetupPanel()}
          {matchResult}
        </div>
        {this.renderSidePanel()}
      </div>
    );
  }
}
