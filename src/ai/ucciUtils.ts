import { Board, Move, Side, Square } from '../core/types';
import { generateLegalMoves } from '../core/gameEngine';
import { parseSquare, toSquare } from '../core/board';

/**
 * Converts DayCotuong Square (e.g. 'e1', 'e10', 'a4') or { row, col }
 * to standard UCCI coordinate (e.g. 'e0', 'e9', 'a3').
 */
export function squareToUcci(squareOrRow: Square | number, col?: number): string {
  if (typeof squareOrRow === 'number' && typeof col === 'number') {
    const sq = toSquare(squareOrRow, col);
    const file = sq[0];
    const rankNum = Number(sq.slice(1));
    return `${file}${rankNum - 1}`;
  }

  const sq = squareOrRow as Square;
  if (!sq || typeof sq !== 'string') return '';
  const file = sq[0];
  const rankNum = Number(sq.slice(1));
  return `${file}${rankNum - 1}`;
}

/**
 * Converts standard UCCI coordinate (e.g. 'e0' or 'a9') to DayCotuong Square (e.g. 'e1' or 'a10')
 */
export function ucciToSquare(coord: string): Square | null {
  if (!coord || coord.length < 2) return null;
  const file = coord.charAt(0).toLowerCase();
  const ucciRank = parseInt(coord.slice(1), 10);

  if (isNaN(ucciRank) || ucciRank < 0 || ucciRank > 9) {
    return null;
  }

  const rankNum = ucciRank + 1;
  return `${file}${rankNum}` as Square;
}

/**
 * Converts a Move object to standard UCCI move string (e.g. 'h2e2', 'b0c2')
 */
export function moveToUcci(move: Move): string {
  const from = squareToUcci(move.from);
  const to = squareToUcci(move.to);
  return `${from}${to}`;
}

/**
 * Parses a UCCI move string (e.g. 'h2e2') against a board and active side
 * to return the full Move object.
 */
export function ucciToMove(ucciStr: string, board: Board, turn: Side): Move | null {
  if (!ucciStr || ucciStr.length < 4) return null;
  const fromSquare = ucciToSquare(ucciStr.slice(0, 2));
  const toSquare = ucciToSquare(ucciStr.slice(2, 4));

  if (!fromSquare || !toSquare) return null;

  const legalMoves = generateLegalMoves(board, turn);
  const matched = legalMoves.find(
    (m) => m.from === fromSquare && m.to === toSquare
  );

  if (matched) return matched;

  // Fallback construction if searching raw moves
  const { row: fromR, col: fromC } = parseSquare(fromSquare);
  const { row: toR, col: toC } = parseSquare(toSquare);
  const piece = board[fromR]?.[fromC];
  if (!piece) return null;

  return {
    from: fromSquare,
    to: toSquare,
    piece: piece.type,
    side: piece.side,
    captured: board[toR]?.[toC]?.type,
  };
}
