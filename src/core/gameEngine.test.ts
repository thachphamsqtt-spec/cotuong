import { describe, expect, it } from 'vitest';
import { INITIAL_FEN, parseFEN, boardToFEN } from './fen';
import { generateLegalMoves, isCheck, getGameStatus, XiangqiGame } from './gameEngine';
import { perft } from './perft';
import { toVietnameseNotation } from './vietnameseNotation';
import { createEmptyBoard, toSquare } from './board';

describe('Xiangqi Core Engine Verification', () => {
  it('correctly parses initial FEN and has 44 legal opening moves for Red (Perft 1 = 44)', () => {
    const { board } = parseFEN(INITIAL_FEN);
    const moves = generateLegalMoves(board, 'red');
    expect(moves.length).toBe(44);
    expect(perft(board, 'red', 1)).toBe(44);
    expect(perft(board, 'red', 2)).toBe(1920);
  });

  it('correctly blocks horse move when horse leg is occupied', () => {
    // Initial position: Red horse at b1 (row 9, col 1).
    // Leg up is b2 (row 8, col 1) which is currently empty.
    // Let's place a piece at b2 to block its forward jumps to a3 and c3.
    const { board } = parseFEN(INITIAL_FEN);
    const horseMovesBefore = generateLegalMoves(board, 'red').filter(
      (m) => m.from === 'b1'
    );
    // Initially horse at b1 can jump to a3 and c3
    expect(horseMovesBefore.map((m) => m.to)).toEqual(expect.arrayContaining(['a3', 'c3']));

    // Block the leg at b2 (row 8, col 1) with an advisor or pawn
    board[8][1] = {
      id: 'blocker',
      side: 'red',
      type: 'pawn',
      square: 'b2',
    };

    const horseMovesBlocked = generateLegalMoves(board, 'red').filter(
      (m) => m.from === 'b1'
    );
    expect(horseMovesBlocked.some((m) => m.to === 'a3' || m.to === 'c3')).toBe(false);
  });

  it('correctly blocks elephant when eye is blocked, and forbids crossing the river', () => {
    const { board } = parseFEN(INITIAL_FEN);
    // Red elephant at c1 (row 9, col 2) can move to a3 and e3
    const moves = generateLegalMoves(board, 'red').filter((m) => m.from === 'c1');
    expect(moves.map((m) => m.to)).toEqual(expect.arrayContaining(['a3', 'e3']));

    // Block eye at d2 (row 8, col 3)
    board[8][3] = {
      id: 'block_eye',
      side: 'red',
      type: 'pawn',
      square: 'd2',
    };

    const movesAfter = generateLegalMoves(board, 'red').filter((m) => m.from === 'c1');
    // c1 to e3 eye is d2 (row 8, col 3), which is now blocked
    expect(movesAfter.some((m) => m.to === 'e3')).toBe(false);
    // a3 eye is b2 (row 8, col 1) which is empty, so a3 is still available
    expect(movesAfter.some((m) => m.to === 'a3')).toBe(true);
  });

  it('prevents generals from facing each other directly (Flying General rule)', () => {
    const board = createEmptyBoard();
    // Red general at e1 (row 9, col 4)
    board[9][4] = { id: 'k1', side: 'red', type: 'general', square: 'e1' };
    // Black general at e10 (row 0, col 4)
    board[0][4] = { id: 'k2', side: 'black', type: 'general', square: 'e10' };
    // A single rook in between at e5 (row 5, col 4)
    board[5][4] = { id: 'r1', side: 'red', type: 'rook', square: 'e5' };

    // Rook at e5 can move vertically along column e without exposing the generals
    // But if rook moves HORIZONTALLY to d5, it leaves column e open and generals face each other!
    const rookMoves = generateLegalMoves(board, 'red').filter((m) => m.from === 'e5');
    expect(rookMoves.some((m) => m.to === 'd5')).toBe(false);
    expect(rookMoves.some((m) => m.to === 'f5')).toBe(false);

    // But vertical moves e5 to e4 or e6 keep the column shielded and are legal
    expect(rookMoves.some((m) => m.to === 'e4')).toBe(true);
    expect(rookMoves.some((m) => m.to === 'e6')).toBe(true);
  });

  it('detects check and checkmate accurately', () => {
    // Classic Ladder Checkmate (Chiếu bí thang Xe):
    // Black General at d10 (row 0, col 3)
    // Red Rook 1 at a10 (row 0, col 0) checking along Rank 10
    // Red Rook 2 at a9 (row 1, col 0) covering Rank 9
    const board = createEmptyBoard();
    board[0][3] = { id: 'bk', side: 'black', type: 'general', square: 'd10' };
    board[9][4] = { id: 'rk', side: 'red', type: 'general', square: 'e1' };
    board[0][0] = { id: 'rr1', side: 'red', type: 'rook', square: 'a10' };
    board[1][0] = { id: 'rr2', side: 'red', type: 'rook', square: 'a9' };

    expect(isCheck(board, 'black')).toBe(true);
    const status = getGameStatus(board, 'black');
    expect(status).toBe('checkmate');
  });

  it('detects stalemate (bị nhốt) as a defeat for the side with no legal moves', () => {
    const board = createEmptyBoard();
    // Black General trapped in corner d10 with no moves
    board[0][3] = { id: 'bk', side: 'black', type: 'general', square: 'd10' };
    // Red General at e1
    board[9][4] = { id: 'rk', side: 'red', type: 'general', square: 'e1' };
    // Place red pieces blocking all moves of black general without giving direct check
    // e10 covered by Red Rook at e5
    board[5][4] = { id: 'rr1', side: 'red', type: 'rook', square: 'e5' };
    // d9 covered by Red Rook at a9
    board[1][0] = { id: 'rr2', side: 'red', type: 'rook', square: 'a9' };

    // Black general is not in check, but has 0 legal moves!
    expect(isCheck(board, 'black')).toBe(false);
    const status = getGameStatus(board, 'black');
    expect(status).toBe('stalemate');
  });

  it('generates accurate Vietnamese notation for moves', () => {
    const game = new XiangqiGame(INITIAL_FEN);
    const board = game.getBoard();

    // Red cannon at h3 (row 7, col 7) moves to e3 (row 7, col 4) -> Pháo 2 bình 5
    const cannonMove = {
      from: 'h3' as const,
      to: 'e3' as const,
      piece: 'cannon' as const,
      side: 'red' as const,
    };
    const notationFull = toVietnameseNotation(board, cannonMove, 'full');
    const notationShort = toVietnameseNotation(board, cannonMove, 'short');

    expect(notationFull).toBe('Pháo 2 bình 5');
    expect(notationShort).toBe('P2-5');

    // Red horse at b1 (row 9, col 1 -> column 8 from Red's right) to c3 (row 7, col 2 -> column 7)
    const horseMove = {
      from: 'b1' as const,
      to: 'c3' as const,
      piece: 'horse' as const,
      side: 'red' as const,
    };
    const horseNotation = toVietnameseNotation(board, horseMove, 'full');
    expect(horseNotation).toBe('Mã 8 tiến 7');
  });
});
