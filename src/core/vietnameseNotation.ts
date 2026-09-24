import { Board, Move, Piece, PieceType, Side } from './types';
import { parseSquare } from './board';

export const PIECE_NAMES_VI: Record<PieceType, { short: string; full: string }> = {
  general: { short: 'Tg', full: 'Tướng' },
  advisor: { short: 'S', full: 'Sĩ' },
  elephant: { short: 'T', full: 'Tượng' },
  horse: { short: 'M', full: 'Mã' },
  rook: { short: 'X', full: 'Xe' },
  cannon: { short: 'P', full: 'Pháo' },
  pawn: { short: 'B', full: 'Tốt' },
};

/**
 * Returns column number 1-9 from the active player's perspective.
 * Red: col 8 (i) is 1, col 0 (a) is 9. -> 9 - colIndex
 * Black: col 0 (a) is 1, col 8 (i) is 9. -> colIndex + 1
 */
export function getColumnNumber(col: number, side: Side): number {
  return side === 'red' ? 9 - col : col + 1;
}

export function toVietnameseNotation(
  boardBeforeMove: Board,
  move: Move,
  format: 'short' | 'full' = 'full'
): string {
  const from = parseSquare(move.from);
  const to = parseSquare(move.to);
  const side = move.side;

  const names = PIECE_NAMES_VI[move.piece];
  const fromColNum = getColumnNumber(from.col, side);
  const toColNum = getColumnNumber(to.col, side);

  // Check ambiguity: are there multiple pieces of the same type on the same column?
  let prefixShort = '';
  let prefixFull = '';
  let suffixFull = '';
  let useColNumber = true;

  const samePiecesOnCol: Piece[] = [];
  for (let r = 0; r < 10; r++) {
    const p = boardBeforeMove[r][from.col];
    if (p && p.side === side && p.type === move.piece) {
      samePiecesOnCol.push(p);
    }
  }

  // Sort pieces from front (closest to opponent side) to back (closest to own side)
  // Red: row 0 (top/opponent) to row 9 (bottom/own) -> sort ascending
  // Black: row 9 (bottom/opponent) to row 0 (top/own) -> sort descending
  samePiecesOnCol.sort((a, b) => {
    const rA = parseSquare(a.square).row;
    const rB = parseSquare(b.square).row;
    return side === 'red' ? rA - rB : rB - rA;
  });

  const pieceIndex = samePiecesOnCol.findIndex((p) => p.square === move.from);

  if (samePiecesOnCol.length === 2) {
    useColNumber = false;
    if (pieceIndex === 0) {
      prefixShort = 'Tiền ';
      suffixFull = ' trước';
    } else {
      prefixShort = 'Hậu ';
      suffixFull = ' sau';
    }
  } else if (samePiecesOnCol.length === 3) {
    useColNumber = false;
    if (pieceIndex === 0) {
      prefixShort = 'Tiền ';
      prefixFull = 'Tiền ';
    } else if (pieceIndex === 1) {
      prefixShort = 'Trung ';
      prefixFull = 'Trung ';
    } else {
      prefixShort = 'Hậu ';
      prefixFull = 'Hậu ';
    }
  } else if (samePiecesOnCol.length >= 4) {
    useColNumber = false;
    const num = pieceIndex + 1;
    prefixShort = `${names.short}${num}`;
    prefixFull = `${names.full} ${num}`;
  }

  // Determine direction: Tiến, Thoái, or Bình
  const rowDiff = side === 'red' ? from.row - to.row : to.row - from.row;
  let actionFull = '';
  let actionShort = '';
  let targetVal = 0;

  if (['horse', 'elephant', 'advisor'].includes(move.piece)) {
    // Diagonal pieces always use the destination column number
    targetVal = toColNum;
    if (rowDiff > 0) {
      actionFull = 'tiến';
      actionShort = '.';
    } else {
      actionFull = 'thoái';
      actionShort = '/';
    }
  } else {
    // Orthogonal pieces: Rook, Cannon, General, Pawn
    if (from.col === to.col) {
      // Linear advance or retreat -> count number of steps
      targetVal = Math.abs(from.row - to.row);
      if (rowDiff > 0) {
        actionFull = 'tiến';
        actionShort = '.';
      } else {
        actionFull = 'thoái';
        actionShort = '/';
      }
    } else {
      // Horizontal traverse -> destination column
      targetVal = toColNum;
      actionFull = 'bình';
      actionShort = '-';
    }
  }

  if (format === 'short') {
    if (!useColNumber) {
      if (prefixShort.endsWith(' ')) {
        return `${prefixShort}${names.short}${actionShort}${targetVal}`;
      }
      return `${prefixShort}${actionShort}${targetVal}`;
    }
    return `${names.short}${fromColNum}${actionShort}${targetVal}`;
  } else {
    if (!useColNumber) {
      if (prefixFull) {
        // If prefixFull already contains piece name (e.g. "Tiền Tốt" or "Tốt 1")
        if (prefixFull.includes(names.full)) {
          return `${prefixFull} ${actionFull} ${targetVal}`;
        }
        return `${prefixFull}${names.full} ${actionFull} ${targetVal}`;
      }
      return `${names.full}${suffixFull} ${actionFull} ${targetVal}`;
    }
    return `${names.full} ${fromColNum} ${actionFull} ${targetVal}`;
  }
}
