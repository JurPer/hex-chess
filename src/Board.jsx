import React from 'react';
import './board.css';
import { axialToPixelFlat, hexPointsFlat, GRID } from './shared/hexGrid';
import { legalMovesFromCells, isBackRank, colorOf, glyphOf } from './shared/rules';
import { spriteOf } from './sprites';
import { sfx, soundForMove } from './sfx';

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
    selectedIndex: null,
    legalTargets: [],
    lastColor: null,
    lastWhiteIndex: null,
    lastBlackIndex: null,
  };

  /* ****** Helpers ****** */
  onAnyUserGesture = () => sfx.unlock();

  isSetupPhase() {
    return this.props.ctx?.phase === 'setup';
  }

  getCurrentColor() {
    return this.props.ctx?.currentPlayer === '0' ? 'W' : 'B';
  }

  getLastMoveString(movesLog) {
    for (let i = movesLog.length - 1; i >= 0; i--) {
      const row = movesLog[i];
      if (row?.B) return row.B;
      if (row?.W) return row.W;
    }
    return null;
  }

  setLastMove(color) {
    const movesLog = this.props.G.movesLog;
    const index = movesLog.findLastIndex((row) => row?.[color] != null);

    this.setState({ lastColor: color });
    if (color === 'W') {
      this.setState({ lastWhiteIndex: index });
    } else {
      this.setState({ lastBlackIndex: index });
    }
  }

  componentDidUpdate(prevProps) {
    // Clear setup target when the pool changes (placement done)
    if (
      prevProps.G?.setupPool !== this.props.G?.setupPool &&
      this.state.selectedIndex != null
    ) {
      this.setState({ selectedIndex: null });
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
    }
    // Detect new move, update last move, play sound
    const previousString = this.getLastMoveString(prevProps.G?.movesLog);
    const currentString = this.getLastMoveString(this.props.G?.movesLog);
    // TODO this does not work when one player has bulk placed
    if (currentString !== previousString) {
      this.setLastMove(prevProps.ctx?.currentPlayer === '0' ? 'W' : 'B');
      sfx.play(soundForMove(currentString));
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
        this.setState({ selectedIndex: id });
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
      return;
    }

    // 3) otherwise clear selection
    this.setState({ selectedIndex: null, legalTargets: [] });
  };

  renderSetupPanel() {
    if (!this.isSetupPhase()) return null;
    const color = this.getCurrentColor();
    const setupPool = this.props.G.setupPool[color];
    const { selectedIndex } = this.state;

    const canBulkPlace = setupPool.length > 0;

    return (
      <div className="setup-panel">
        <div className="setup-hint">Setup: {color === 'W' ? 'White' : 'Black'}</div>
        <div className="setup-hint">
          {selectedIndex == null
            ? 'Click an empty back-rank hex'
            : `Selected: ${selectedIndex + 1}`}
        </div>
        <div className="setup-pieces">
          {setupPool.map((pieceCode) => (
            <button
              key={pieceCode}
              disabled={selectedIndex == null}
              onClick={() => {
                this.props.moves.placePiece(selectedIndex, pieceCode);
              }}
              title={pieceCode}
              className="setup-piece-btn"
            >
              {spriteOf(pieceCode) ? (
                <img
                  src={spriteOf(pieceCode)}
                  alt={pieceCode}
                  disabled={selectedIndex == null}
                  width={50}
                  height={50}
                  style={{ pointerEvents: 'none' }}
                />
              ) : (
                glyphOf(pieceCode)
              )}
            </button>
          ))}
        </div>
        <div className="setup-actions">
          <button
            disabled={!canBulkPlace}
            onClick={() => {
              this.props.moves.placeAllFixed();
            }}
            title="Place all remaining pieces in a fixed layout"
          >
            Place All (Fixed)
          </button>
          <button
            disabled={!canBulkPlace}
            onClick={() => {
              this.props.moves.placeAllRandom();
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
        <label className="mute-toggle">
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => sfx.setEnabled(e.target.checked)}
            onClick={this.onAnyUserGesture}
          />
          Sounds
        </label>
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

    const { selectedIndex, legalTargets } = this.state;

    const selectionColor =
      this.getCurrentColor() === 'W' ? 'var(--selection-light)' : 'var(--selection-dark)';

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
              const sprite = pieceCode && spriteOf(pieceCode);
              const spriteSize = 1.3 * size;

              const canPlaceHere =
                this.isSetupPhase() &&
                isBackRank(this.getCurrentColor(), id) &&
                this.props.G.cells[id] == null;

              const isLegalMove = legalTargets.includes(id);

              return (
                <g key={id} onClick={() => this.onHexClick(id)}>
                  {/* cell */}
                  <polygon
                    className={[`cell-${colorIndex(id)}`, canPlaceHere && 'setup-target']
                      .filter(Boolean)
                      .join(' ')}
                    points={hexPointsFlat(x, y, size)}
                  />

                  {/* label 1..37 (optional) */}
                  <text className="index" x={x} y={y + size * 0.75}>
                    {id + 1}
                  </text>

                  {/* piece */}
                  {sprite ? (
                    <image
                      key={`piece-${id}`}
                      className="piece"
                      href={sprite}
                      x={x - spriteSize / 2}
                      y={y - spriteSize / 2 - 5}
                      width={spriteSize}
                      height={spriteSize}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : pieceCode ? (
                    <text
                      key={`piece-${id}`}
                      className="piece"
                      x={x}
                      y={y}
                      fontSize={size * 1.2}
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
                    />
                  ) : null}
                </g>
              );
            })}

            {/* Selection highlight */}
            {selectedIndex != null && (
              <polygon
                className="selected"
                points={hexPointsFlat(
                  centers[selectedIndex].x,
                  centers[selectedIndex].y,
                  size
                )}
                style={{
                  stroke: selectionColor,
                  filter: `drop-shadow(0 0 5px ${selectionColor})`,
                }}
              />
            )}
          </svg>
          {this.renderSetupPanel()}
          {matchResult}
        </div>
        {this.renderSidePanel()}
      </div>
    );
  }
}
