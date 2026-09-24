import { Board, Piece, PieceType, Side } from './types';
import { createEmptyBoard, toSquare } from './board';

export const INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

const FEN_CHAR_TO_TYPE: Record<string, PieceType> = {
  r: 'rook',
  n: 'horse',
  b: 'elephant',
  a: 'advisor',
  k: 'general',
  c: 'cannon',
  p: 'pawn',
};

const TYPE_TO_FEN_CHAR: Record<PieceType, string> = {
  rook: 'r',
  horse: 'n',
  elephant: 'b',
  advisor: 'a',
  general: 'k',
  cannon: 'c',
  pawn: 'p',
};

export interface ParsedFEN {
  board: Board;
  turn: Side;
  halfMoves: number;
  fullMoves: number;
}

export interface FENValidationReport {
  valid: boolean;
  structuralErrors: string[];
  ruleErrors: string[];
  warnings: string[];
}

export function validateFEN(fen: string): FENValidationReport {
  const structuralErrors: string[] = [];
  const ruleErrors: string[] = [];
  const warnings: string[] = [];

  const parts = fen.trim().split(/\s+/);
  const boardPart = parts[0];

  if (!boardPart) {
    return {
      valid: false,
      structuralErrors: ['FEN string is empty or missing board part'],
      ruleErrors: [],
      warnings: [],
    };
  }

  const rows = boardPart.split('/');
  if (rows.length !== 10) {
    structuralErrors.push(`Expected 10 rows in board part, got ${rows.length}`);
  }

  let redGenerals = 0;
  let blackGenerals = 0;
  let redGeneralPos: { row: number; col: number } | null = null;
  let blackGeneralPos: { row: number; col: number } | null = null;

  rows.forEach((rowStr, r) => {
    let colCount = 0;
    for (const ch of rowStr) {
      if (/\d/.test(ch)) {
        colCount += parseInt(ch, 10);
      } else {
        const lower = ch.toLowerCase();
        const type = FEN_CHAR_TO_TYPE[lower];
        if (!type) {
          structuralErrors.push(`Invalid piece character '${ch}' at row ${r + 1}`);
        } else {
          const side: Side = /[A-Z]/.test(ch) ? 'red' : 'black';
          const col = colCount;

          if (type === 'general') {
            if (side === 'red') {
              redGenerals++;
              redGeneralPos = { row: r, col };
            } else {
              blackGenerals++;
              blackGeneralPos = { row: r, col };
            }

            // Check General in palace: Red row 7..9, Black row 0..2, col 3..5
            const inPalaceCol = col >= 3 && col <= 5;
            const inPalaceRow = side === 'red' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
            if (!inPalaceCol || !inPalaceRow) {
              ruleErrors.push(`${side === 'red' ? 'Red' : 'Black'} General is outside Palace at ${toSquare(r, col)}`);
            }
          }

          if (type === 'advisor') {
            // Advisor in palace
            const inPalaceCol = col >= 3 && col <= 5;
            const inPalaceRow = side === 'red' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
            if (!inPalaceCol || !inPalaceRow) {
              ruleErrors.push(`${side === 'red' ? 'Red' : 'Black'} Advisor is outside Palace at ${toSquare(r, col)}`);
            }
          }

          if (type === 'elephant') {
            // Elephant across river: Red row >= 5, Black row <= 4
            const crossed = side === 'red' ? r < 5 : r > 4;
            if (crossed) {
              ruleErrors.push(`${side === 'red' ? 'Red' : 'Black'} Elephant crossed the river at ${toSquare(r, col)}`);
            }
          }

          colCount++;
        }
      }
    }

    if (colCount !== 9) {
      structuralErrors.push(`Row ${r + 1} has ${colCount} columns (expected 9)`);
    }
  });

  // Check general counts
  if (redGenerals !== 1) {
    ruleErrors.push(`Expected exactly 1 Red General, found ${redGenerals}`);
  }
  if (blackGenerals !== 1) {
    ruleErrors.push(`Expected exactly 1 Black General, found ${blackGenerals}`);
  }

  // Check facing generals if both generals exist
  if (redGeneralPos && blackGeneralPos && (redGeneralPos as any).col === (blackGeneralPos as any).col) {
    const col = (redGeneralPos as any).col;
    const startR = Math.min((redGeneralPos as any).row, (blackGeneralPos as any).row) + 1;
    const endR = Math.max((redGeneralPos as any).row, (blackGeneralPos as any).row);
    
    // Parse board temporarily to check line of sight
    try {
      const { board } = parseFEN(fen);
      let blocked = false;
      for (let r = startR; r < endR; r++) {
        if (board[r][col] !== null) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        ruleErrors.push('Facing Generals (Lộ mặt Tướng) without intervening pieces');
      }
    } catch {
      // Ignore if parse failed structurally
    }
  }

  const valid = structuralErrors.length === 0 && ruleErrors.length === 0;
  return {
    valid,
    structuralErrors,
    ruleErrors,
    warnings,
  };
}

export function parseFEN(fen: string = INITIAL_FEN): ParsedFEN {
  const parts = fen.trim().split(/\s+/);
  const boardPart = parts[0];
  const turnPart = parts[1] || 'w';
  const halfMoves = parseInt(parts[4] || '0', 10) || 0;
  const fullMoves = parseInt(parts[5] || '1', 10) || 1;

  const board = createEmptyBoard();
  const rows = boardPart.split('/');

  if (rows.length !== 10) {
    throw new Error(`Invalid FEN: expected 10 rows, got ${rows.length}`);
  }

  let idCounter = 1;
  rows.forEach((rowStr, rowIndex) => {
    let colIndex = 0;
    for (const ch of rowStr) {
      if (/\d/.test(ch)) {
        colIndex += parseInt(ch, 10);
      } else {
        const side: Side = /[A-Z]/.test(ch) ? 'red' : 'black';
        const type = FEN_CHAR_TO_TYPE[ch.toLowerCase()];
        if (!type) {
          throw new Error(`Invalid piece character in FEN: ${ch}`);
        }
        if (colIndex >= 9) {
          throw new Error(`Invalid FEN: row ${rowIndex + 1} expected 9 columns, but exceeds boundary`);
        }
        board[rowIndex][colIndex] = {
          id: `${side}_${type}_${idCounter++}`,
          side,
          type,
          square: toSquare(rowIndex, colIndex),
        };
        colIndex++;
      }
    }
    if (colIndex !== 9) {
      throw new Error(`Invalid FEN: row ${rowIndex + 1} expected 9 columns, got ${colIndex}`);
    }
  });

  return {
    board,
    turn: turnPart === 'b' ? 'black' : 'red',
    halfMoves,
    fullMoves,
  };
}

export function boardToFEN(
  board: Board,
  turn: Side = 'red',
  halfMoves: number = 0,
  fullMoves: number = 1
): string {
  const rows: string[] = [];

  for (let r = 0; r < 10; r++) {
    let emptyCount = 0;
    let rowStr = '';
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount.toString();
          emptyCount = 0;
        }
        const char = TYPE_TO_FEN_CHAR[piece.type];
        rowStr += piece.side === 'red' ? char.toUpperCase() : char.toLowerCase();
      }
    }
    if (emptyCount > 0) {
      rowStr += emptyCount.toString();
    }
    rows.push(rowStr);
  }

  const turnStr = turn === 'red' ? 'w' : 'b';
  return `${rows.join('/')} ${turnStr} - - ${halfMoves} ${fullMoves}`;
}
