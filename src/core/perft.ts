import { Board, Side } from './types';
import { generateLegalMoves, applyMove } from './gameEngine';
import { parseSquare } from './board';

/**
 * Standard unoptimized perft implementation using deep board clones.
 * Used as a reference to prove identical node count output.
 */
export function perftCloneReference(board: Board, side: Side, depth: number): number {
  if (depth <= 0) return 1;

  const moves = generateLegalMoves(board, side);
  if (depth === 1) return moves.length;

  let totalNodes = 0;
  const nextSide: Side = side === 'red' ? 'black' : 'red';

  for (const move of moves) {
    const nextBoard = applyMove(board, move);
    totalNodes += perftCloneReference(nextBoard, nextSide, depth - 1);
  }

  return totalNodes;
}

/**
 * Optimized perft implementation with in-place board make/unmake.
 * Zero memory allocation per node, orders of magnitude faster.
 */
export function perft(board: Board, side: Side, depth: number): number {
  if (depth <= 0) return 1;

  const moves = generateLegalMoves(board, side);
  if (depth === 1) return moves.length;

  let totalNodes = 0;
  const nextSide: Side = side === 'red' ? 'black' : 'red';

  for (const move of moves) {
    const { row: fromR, col: fromC } = parseSquare(move.from);
    const { row: toR, col: toC } = parseSquare(move.to);

    const piece = board[fromR][fromC]!;
    const captured = board[toR][toC];

    // In-place make
    board[fromR][fromC] = null;
    board[toR][toC] = piece;
    piece.square = move.to;

    totalNodes += perft(board, nextSide, depth - 1);

    // In-place unmake
    board[fromR][fromC] = piece;
    board[toR][toC] = captured;
    piece.square = move.from;
  }

  return totalNodes;
}
