import { Board, Move, Piece, Side } from './types';
import { hasCrossedRiver, isInsideBoard, isInPalace, parseSquare, toSquare } from './board';

export function generatePseudoLegalMovesForPiece(board: Board, piece: Piece): Move[] {
  const { row, col } = parseSquare(piece.square);
  const moves: Move[] = [];
  const enemySide: Side = piece.side === 'red' ? 'black' : 'red';

  const tryAdd = (tr: number, tc: number): boolean => {
    if (!isInsideBoard(tr, tc)) return false;
    const target = board[tr][tc];
    if (target) {
      if (target.side === enemySide) {
        moves.push({
          from: piece.square,
          to: toSquare(tr, tc),
          piece: piece.type,
          side: piece.side,
          captured: target.type,
        });
      }
      return false; // Square occupied, ray stops
    } else {
      moves.push({
        from: piece.square,
        to: toSquare(tr, tc),
        piece: piece.type,
        side: piece.side,
      });
      return true; // Square empty, ray can continue
    }
  };

  switch (piece.type) {
    case 'general': {
      // 1 step orthogonal in palace
      const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (isInPalace(nr, nc, piece.side)) {
          tryAdd(nr, nc);
        }
      }
      break;
    }

    case 'advisor': {
      // 1 step diagonal in palace
      const deltas = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (isInPalace(nr, nc, piece.side)) {
          tryAdd(nr, nc);
        }
      }
      break;
    }

    case 'elephant': {
      // 2 steps diagonal, eye cannot be blocked, cannot cross river
      const deltas = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (!isInsideBoard(nr, nc)) continue;

        // River boundary: Red cannot go to row <= 4, Black cannot go to row >= 5
        if (piece.side === 'red' && nr < 5) continue;
        if (piece.side === 'black' && nr > 4) continue;

        // Elephant eye check
        const eyeR = row + dr / 2;
        const eyeC = col + dc / 2;
        if (board[eyeR][eyeC] !== null) continue; // Eye is blocked

        tryAdd(nr, nc);
      }
      break;
    }

    case 'horse': {
      // 8 directions, horse leg check
      const jumps = [
        // dr, dc, legDr, legDc
        [-2, -1, -1, 0],
        [-2, 1, -1, 0],
        [2, -1, 1, 0],
        [2, 1, 1, 0],
        [-1, -2, 0, -1],
        [1, -2, 0, -1],
        [-1, 2, 0, 1],
        [1, 2, 0, 1],
      ];

      for (const [dr, dc, legDr, legDc] of jumps) {
        const nr = row + dr;
        const nc = col + dc;
        if (!isInsideBoard(nr, nc)) continue;

        const legR = row + legDr;
        const legC = col + legDc;
        if (board[legR][legC] !== null) continue; // Horse leg blocked

        tryAdd(nr, nc);
      }
      break;
    }

    case 'rook': {
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        while (isInsideBoard(nr, nc)) {
          const continued = tryAdd(nr, nc);
          if (!continued) break;
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'cannon': {
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        let hurdleFound = false;

        while (isInsideBoard(nr, nc)) {
          const target = board[nr][nc];
          if (!hurdleFound) {
            if (target === null) {
              // Non-capturing move
              moves.push({
                from: piece.square,
                to: toSquare(nr, nc),
                piece: piece.type,
                side: piece.side,
              });
            } else {
              // Found hurdle (ngòi)
              hurdleFound = true;
            }
          } else {
            // Looking for target to capture behind hurdle
            if (target !== null) {
              if (target.side === enemySide) {
                moves.push({
                  from: piece.square,
                  to: toSquare(nr, nc),
                  piece: piece.type,
                  side: piece.side,
                  captured: target.type,
                });
              }
              break; // Ray stops at first piece after hurdle
            }
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'pawn': {
      const forwardDr = piece.side === 'red' ? -1 : 1;
      const fRow = row + forwardDr;
      if (isInsideBoard(fRow, col)) {
        tryAdd(fRow, col);
      }

      // If crossed river, can move horizontally left & right
      if (hasCrossedRiver(row, piece.side)) {
        if (isInsideBoard(row, col - 1)) tryAdd(row, col - 1);
        if (isInsideBoard(row, col + 1)) tryAdd(row, col + 1);
      }
      break;
    }
  }

  return moves;
}

export function areGeneralsFacing(board: Board): boolean {
  // Find red and black generals
  let redGen: { r: number; c: number } | null = null;
  let blackGen: { r: number; c: number } | null = null;

  for (let r = 0; r < 10; r++) {
    for (let c = 3; c <= 5; c++) {
      const p = board[r][c];
      if (p && p.type === 'general') {
        if (p.side === 'red') redGen = { r, c };
        else blackGen = { r, c };
      }
    }
  }

  if (!redGen || !blackGen) return false;
  // If not on the same column, they are not facing
  if (redGen.c !== blackGen.c) return false;

  // Check if there are any intervening pieces between them on the column
  const startR = Math.min(redGen.r, blackGen.r) + 1;
  const endR = Math.max(redGen.r, blackGen.r);
  const col = redGen.c;

  for (let r = startR; r < endR; r++) {
    if (board[r][col] !== null) {
      return false; // Intervening piece found
    }
  }

  return true; // No intervening pieces: Flying General!
}
