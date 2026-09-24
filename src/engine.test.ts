import { describe, expect, it } from 'vitest';
import { parseFEN, INITIAL_FEN } from './core/fen';
import { parseSquare } from './core/board';
import { applyMove } from './core/gameEngine';
import { generatePseudoLegalMovesForPiece } from './core/moveRules';

describe('Xiangqi core engine basics (Migrated from legacy engine.test.ts)', () => {
  it('starts from a valid initial position', () => {
    const { board } = parseFEN(INITIAL_FEN);
    expect(board[0][0]).not.toBeNull();
    expect(board[9][8]).not.toBeNull();
  });

  it('allows a rook to move forward along a file', () => {
    const { board } = parseFEN(INITIAL_FEN);
    const rook = board[9][0]!;
    const moves = generatePseudoLegalMovesForPiece(board, rook);
    expect(moves.some((move) => move.from === 'a1' && move.to === 'a2')).toBe(true);
  });

  it('blocks a horse when the adjacent cell is occupied', () => {
    const fen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
    const { board } = parseFEN(fen);
    const horse = board[9][1]!;
    const moves = generatePseudoLegalMovesForPiece(board, horse);
    expect(moves.some((move) => move.from === 'b1' && move.to === 'a3')).toBe(true);
  });

  it('applies a move and updates the target square', () => {
    const { board } = parseFEN(INITIAL_FEN);
    const move = { from: 'a1' as const, to: 'a2' as const, piece: 'rook' as const, side: 'black' as const };
    const next = applyMove(board, move);
    expect(next[8][0]).not.toBeNull();
    expect(next[9][0]).toBeNull();
  });

  it('computes squares correctly', () => {
    expect(parseSquare('a1')).toEqual({ row: 9, col: 0 });
    expect(parseSquare('i9')).toEqual({ row: 1, col: 8 });
  });
});
