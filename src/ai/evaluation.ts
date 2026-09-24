import { Board, Piece, PieceType, Side } from '../core/types';
import { getAllPieces, parseSquare } from '../core/board';

export const PIECE_BASE_VALUES: Record<PieceType, number> = {
  general: 10000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  pawn: 100,
};

// Piece Square Tables (from Red's perspective, row 0..9, col 0..8)
// Row 0 is Rank 10 (Black's edge), Row 9 is Rank 1 (Red's edge)
const HORSE_PST = [
  [0, -10, 0, 0, 0, 0, 0, -10, 0],
  [0, 10, 20, 20, 20, 20, 20, 10, 0],
  [4, 20, 30, 40, 40, 40, 30, 20, 4],
  [8, 24, 34, 44, 44, 44, 34, 24, 8],
  [6, 16, 24, 32, 32, 32, 24, 16, 6],
  [4, 12, 16, 24, 24, 24, 16, 12, 4],
  [2, 8, 10, 12, 12, 12, 10, 8, 2],
  [2, 4, 6, 8, 8, 8, 6, 4, 2],
  [0, 2, 4, 4, -4, 4, 4, 2, 0],
  [0, -4, 0, 0, 0, 0, 0, -4, 0],
];

const ROOK_PST = [
  [14, 14, 14, 14, 16, 14, 14, 14, 14],
  [16, 24, 18, 24, 26, 24, 18, 24, 16],
  [10, 18, 14, 20, 22, 20, 14, 18, 10],
  [14, 20, 18, 24, 26, 24, 18, 20, 14],
  [12, 18, 16, 22, 24, 22, 16, 18, 12],
  [10, 16, 14, 18, 20, 18, 14, 16, 10],
  [6, 10, 8, 14, 14, 14, 8, 10, 6],
  [4, 8, 6, 14, 12, 14, 6, 8, 4],
  [8, 4, 8, 16, 8, 16, 8, 4, 8],
  [-2, 10, 6, 14, 12, 14, 6, 10, -2],
];

const CANNON_PST = [
  [6, 4, 0, -10, -12, -10, 0, 4, 6],
  [2, 2, 0, -4, -14, -4, 0, 2, 2],
  [2, 2, 0, -10, -8, -10, 0, 2, 2],
  [0, 0, -2, 4, 10, 4, -2, 0, 0],
  [0, 0, 0, 2, 8, 2, 0, 0, 0],
  [-2, 0, 4, 0, 0, 0, 4, 0, -2],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 10, 4, 0, -2, 0, 4, 10, 4],
  [0, 2, 0, 0, 0, 0, 0, 2, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
];

const PAWN_PST = [
  [0, 3, 6, 9, 12, 9, 6, 3, 0],
  [18, 36, 56, 80, 120, 80, 56, 36, 18],
  [14, 26, 42, 60, 80, 60, 42, 26, 14],
  [10, 20, 30, 34, 40, 34, 30, 20, 10],
  [6, 12, 18, 18, 20, 18, 18, 12, 6],
  [2, 0, 8, 0, 8, 0, 8, 0, 2],
  [0, 0, -2, 0, 4, 0, -2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

function getPiecePST(type: PieceType, row: number, col: number, side: Side): number {
  // If Black, mirror row (row 9 - row)
  const evalRow = side === 'red' ? row : 9 - row;
  const evalCol = col;

  switch (type) {
    case 'horse':
      return HORSE_PST[evalRow]?.[evalCol] ?? 0;
    case 'rook':
      return ROOK_PST[evalRow]?.[evalCol] ?? 0;
    case 'cannon':
      return CANNON_PST[evalRow]?.[evalCol] ?? 0;
    case 'pawn':
      return PAWN_PST[evalRow]?.[evalCol] ?? 0;
    default:
      return 0;
  }
}

/**
 * Returns positional evaluation in centipawns from RED's perspective.
 * Positive = Red is leading, Negative = Black is leading.
 */
export function evaluateBoard(board: Board): number {
  let redScore = 0;
  let blackScore = 0;

  const pieces = getAllPieces(board);

  for (const piece of pieces) {
    const { row, col } = parseSquare(piece.square);
    const baseVal = PIECE_BASE_VALUES[piece.type];
    const pstVal = getPiecePST(piece.type, row, col, piece.side);
    const totalPieceVal = baseVal + pstVal;

    if (piece.side === 'red') {
      redScore += totalPieceVal;
    } else {
      blackScore += totalPieceVal;
    }
  }

  return redScore - blackScore;
}
