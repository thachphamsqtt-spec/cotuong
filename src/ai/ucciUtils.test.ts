import { describe, it, expect } from 'vitest';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { squareToUcci, ucciToSquare, moveToUcci, ucciToMove } from './ucciUtils';

describe('UCCI Coordinate & Move Utils', () => {
  it('converts squares to UCCI coordinates correctly', () => {
    // Red King at 'e1' (row 9, col 4) -> 'e0'
    expect(squareToUcci('e1')).toBe('e0');
    expect(squareToUcci(9, 4)).toBe('e0');

    // Black King at 'e10' (row 0, col 4) -> 'e9'
    expect(squareToUcci('e10')).toBe('e9');
    expect(squareToUcci(0, 4)).toBe('e9');

    // Red Left Chariot at 'a1' (row 9, col 0) -> 'a0'
    expect(squareToUcci('a1')).toBe('a0');

    // Red Right Cannon at 'h3' (row 7, col 7) -> 'h2'
    expect(squareToUcci('h3')).toBe('h2');
  });

  it('converts UCCI coordinates to squares correctly', () => {
    expect(ucciToSquare('e0')).toBe('e1');
    expect(ucciToSquare('e9')).toBe('e10');
    expect(ucciToSquare('a0')).toBe('a1');
    expect(ucciToSquare('h2')).toBe('h3');
    expect(ucciToSquare('i9')).toBe('i10');
    expect(ucciToSquare('invalid')).toBeNull();
  });

  it('converts Move to UCCI string and back', () => {
    const { board } = parseFEN(INITIAL_FEN);
    // Red moves Cannon from 'h3' (h2) to 'e3' (e2) (Pháo 8 bình 5)
    const move = {
      from: 'h3' as const,
      to: 'e3' as const,
      piece: 'cannon' as const,
      side: 'red' as const,
    };

    const ucci = moveToUcci(move);
    expect(ucci).toBe('h2e2');

    const parsedMove = ucciToMove(ucci, board, 'red');
    expect(parsedMove).not.toBeNull();
    expect(parsedMove!.from).toBe('h3');
    expect(parsedMove!.to).toBe('e3');
    expect(parsedMove!.piece).toBe('cannon');
    expect(parsedMove!.side).toBe('red');
  });
});
