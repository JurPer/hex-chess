/**
 * @file Rules constants and tiny predicates shared by Game and Board.
 * Indices are 0-based (cell label N on the board corresponds to index N-1).
 *
 * @typedef {'W'|'B'} Color
 * @typedef {'WR'|'WN'|'WB'|'WQ'|'WK'|'BR'|'BN'|'BB'|'BQ'|'BK'} SetupPieceCode
 */

/**
 * Back-rank cell indices for placement/promotion by color.
 * - White places on {4,11,17,22,28} 
 * - → indices [3,10,16,21,27].
 * - Black places on {10,16,21,27,34} 
 * - → indices [9,15,20,26,33].
 *
 * @type {{W:number[], B:number[]}}
 */
export const BACK_RANK = {
  W: [3, 10, 16, 21, 27],
  B: [9, 15, 20, 26, 33],
};

/**
 * Pawn starting indices by color. Also used for double-step eligibility.
 * - White: {5,12,18,23,29} 
 * - → indices [4,11,17,22,28].
 * - Black: {9,15,20,26,33} 
 * - → indices [8,14,19,25,32].
 *
 * @type {{W:number[], B:number[]}}
 */
export const PAWN_START = {
  W: [4, 11, 17, 22, 28],
  B: [8, 14, 19, 25, 32],
};

/**
 * Pawn capture directions (axial) by color for flat-top hexes.
 * Direction indices reference your {@link AXIAL_DIRS} table:
 * - 0: SW, 1: NW, 2: N, 3: NE, 4: SE, 5: S
 * 
 * White captures NW(1) and NE(3); Black captures SW(0) and SE(4).
 *
 * @type {{W:number[], B:number[]}}
 */
export const PAWN_CAPTURE_DIRS = { W: [1, 3], B: [0, 4] };

/**
 * Pawn forward direction (axial) by color ({@link AXIAL_DIRS} table).
 * - White moves "up" (N, index 2: [0, -1]).
 * - Black moves "down" (S, index 5: [0, 1]).
 *
 * @type {{W: number, B: number}}
 */
export const PAWN_FORWARD_DIR = { W: 2, B: 5 };  // W: (0,-1) up, B: (0,1) down

/**
 * Setup pool for White (piece codes placed during Setup phase).
 * Order is player-chosen during placement.
 *
 * @type {SetupPieceCode[]}
 */
export const SETUP_POOL_W = ['WR', 'WN', 'WB', 'WQ', 'WK'];

/**
 * Setup pool for Black (piece codes placed during Setup phase).
 * Order is player-chosen during placement.
 *
 * @type {SetupPieceCode[]}
 */
export const SETUP_POOL_B = ['BR', 'BN', 'BB', 'BQ', 'BK'];

/**
 * Predicate: Is cell at `index` on the back rank for `color`?
 *
 * @param {Color} color
 * @param {number} index
 * @returns {boolean}
 */
export const isBackRank = (color, index) => BACK_RANK[color].includes(index);

/**
 * Predicate: Is cell at `index` a pawn starting square for `color`?
 * (Used to allow the initial double-step.)
 *
 * @param {Color} color
 * @param {number} index
 * @returns {boolean}
 */
export const isPawnStart = (color, index) => PAWN_START[color].includes(index);
