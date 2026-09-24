import { describe, it, expect } from 'vitest';
import { exportToPGN, parsePGN } from './pgn';
import { XiangqiGame } from './gameEngine';
import { INITIAL_FEN } from './fen';

describe('Xiangqi PGN Exporter & Parser', () => {
  it('exports an initial standard game correctly with header tags', () => {
    const game = new XiangqiGame();
    // 1. Pháo 2 bình 5 (h3 -> e3) - Pháo 8 bình 5 (h8 -> e8)
    const m1 = game.makeMove('h3', 'e3').move!;
    const m2 = game.makeMove('h8', 'e8').move!;

    const pgn = exportToPGN({
      headers: {
        Event: 'Giải Vô Địch Kỳ Đạo',
        Red: 'Kỳ thủ A',
        Black: 'Kỳ thủ B',
        Result: '*',
      },
      moves: [m1, m2],
      notationFormat: 'short',
    });

    expect(pgn).toContain('[Event "Giải Vô Địch Kỳ Đạo"]');
    expect(pgn).toContain('[Red "Kỳ thủ A"]');
    expect(pgn).toContain('[Black "Kỳ thủ B"]');
    expect(pgn).toContain('1. P2-5 P8-5');
  });

  it('parses standard PGN text with headers and short Vietnamese moves', () => {
    const pgnText = `
[Event "Tập Huấn Khai Cuộc"]
[Date "2026.09.25"]
[Red "Người chơi"]
[Black "AI Kỳ Đạo"]
[Result "*"]

1. P2-5 P8-5 2. M2.3 M8.7
`;
    const parsed = parsePGN(pgnText);
    expect(parsed.headers.Event).toBe('Tập Huấn Khai Cuộc');
    expect(parsed.moves.length).toBe(4);
    expect(parsed.moves[0].from).toBe('h3');
    expect(parsed.moves[0].to).toBe('e3');
    expect(parsed.moves[1].from).toBe('h8');
    expect(parsed.moves[1].to).toBe('e8');
    expect(parsed.moves[2].from).toBe('h1');
    expect(parsed.moves[2].to).toBe('g3');
    expect(parsed.moves[3].from).toBe('h10');
    expect(parsed.moves[3].to).toBe('g8');
  });

  it('parses coordinate-based PGN moves accurately', () => {
    const pgnText = `
[Event "Test Coordinate PGN"]
1. h3e3 h8e8 2. h1g3 b10c8
`;
    const parsed = parsePGN(pgnText);
    expect(parsed.moves.length).toBe(4);
    expect(parsed.moves[0].from).toBe('h3');
    expect(parsed.moves[0].to).toBe('e3');
    expect(parsed.moves[3].from).toBe('b10');
    expect(parsed.moves[3].to).toBe('c8');
  });

  it('handles custom FEN initial positions in PGN export and import', () => {
    const customFEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1';
    const pgn = exportToPGN({
      moves: [],
      initialFEN: customFEN,
    });
    expect(pgn).toContain(`[FEN "${customFEN}"]`);

    const parsed = parsePGN(pgn);
    expect(parsed.initialFEN).toBe(customFEN);
  });
});
