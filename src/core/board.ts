import { Board, FileChar, Piece, PieceType, Side, Square } from './types';

export const FILES: readonly FileChar[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function parseSquare(square: Square): { row: number; col: number } {
  const file = square[0] as FileChar;
  const rank = Number(square.slice(1));
  const col = FILES.indexOf(file);
  const row = 10 - rank;
  return { row, col };
}

export function toSquare(row: number, col: number): Square {
  return `${FILES[col]}${10 - row}` as Square;
}

export function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 9;
}

export function isInPalace(row: number, col: number, side: Side): boolean {
  const inCol = col >= 3 && col <= 5;
  if (!inCol) return false;
  if (side === 'red') {
    return row >= 7 && row <= 9; // Rows 7, 8, 9 (Ranks 1, 2, 3)
  } else {
    return row >= 0 && row <= 2; // Rows 0, 1, 2 (Ranks 10, 9, 8)
  }
}

export function hasCrossedRiver(row: number, side: Side): boolean {
  // River is between row 4 and row 5.
  // Red starts at rows 5-9; crosses river if row <= 4.
  // Black starts at rows 0-4; crosses river if row >= 5.
  return side === 'red' ? row <= 4 : row >= 5;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}

export function createEmptyBoard(): Board {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

export function findGeneral(board: Board, side: Side): Piece | null {
  const startRow = side === 'red' ? 7 : 0;
  const endRow = side === 'red' ? 9 : 2;

  for (let r = startRow; r <= endRow; r++) {
    for (let c = 3; c <= 5; c++) {
      const p = board[r][c];
      if (p && p.side === side && p.type === 'general') {
        return p;
      }
    }
  }
  return null;
}

export function getAllPieces(board: Board, side?: Side): Piece[] {
  const pieces: Piece[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p) {
        if (!side || p.side === side) {
          pieces.push(p);
        }
      }
    }
  }
  return pieces;
}
