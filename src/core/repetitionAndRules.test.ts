import { describe, expect, it } from 'vitest';
import { XiangqiGame } from './gameEngine';

describe('Perpetual Check & Repetition Rules (Asian Simplified Rules)', () => {
  it('detects unilateral perpetual check and assigns loss to the checking side', () => {
    // Red King at f1, Black King at d10.
    // Red Rook at e8.
    // 1. Red: Re8 -> d8+ (Check). Black: Kd10 -> e10 (Evade).
    // 2. Red: Rd8 -> e8+ (Check). Black: Ke10 -> d10 (Evade).
    // Position repeats with 100% check from Red!
    const g = new XiangqiGame('3k5/9/4R4/9/9/9/9/9/9/5K3 w - - 0 1');

    // Cycle 1
    const r1 = g.makeMove('e8', 'd8');
    expect(r1.success).toBe(true);
    expect(r1.move?.isCheck).toBe(true);

    const b1 = g.makeMove('d10', 'e10');
    expect(b1.success).toBe(true);
    expect(b1.move?.isCheck).toBe(false);

    const r2 = g.makeMove('d8', 'e8');
    expect(r2.success).toBe(true);
    expect(r2.move?.isCheck).toBe(true);

    const b2 = g.makeMove('e10', 'd10');
    expect(b2.success).toBe(true);
    expect(b2.move?.isCheck).toBe(false);

    // Cycle 2:
    expect(g.makeMove('e8', 'd8').success).toBe(true); // Check
    expect(g.makeMove('d10', 'e10').success).toBe(true);
    expect(g.makeMove('d8', 'e8').success).toBe(true); // Check
    expect(g.makeMove('e10', 'd10').success).toBe(true); // 3rd appearance of (Board + Red turn)

    expect(g.getStatus()).toBe('loss_perpetual_check');
  });

  it('detects mutual perpetual check (both sides check) as draw_repetition', () => {
    // Red King at f1, Black King at d10.
    // Red Rook at e8, Black Rook at e3.
    // Both sides check during the repetition cycle!
    // 1. Red: Re8 -> d8+ (Check). Black: Kd10 -> e10 (Evade).
    // 2. Red: Rd8 -> e8+ (Check). Black: Ke10 -> d10 (Evade).
    // In another setup: Red gives check and Black also gives check when attacking.
    // If BOTH red and black have isCheck in all moves of their side:
    // Let's test with game where both sides deliver checks in the repetition loop.
    const g = new XiangqiGame('3k4r/9/4R4/9/9/9/9/9/9/5K3 w - - 0 1');

    // Cycle 1:
    // 1. Red: Re8 -> d8+ (Check)
    expect(g.makeMove('e8', 'd8').success).toBe(true);
    // 1. Black: Kd10 -> e10
    expect(g.makeMove('d10', 'e10').success).toBe(true);
    // 2. Red: Rd8 -> e8+ (Check)
    expect(g.makeMove('d8', 'e8').success).toBe(true);
    // 2. Black: Ke10 -> d10
    expect(g.makeMove('e10', 'd10').success).toBe(true); // 2nd appearance

    // Cycle 2:
    expect(g.makeMove('e8', 'd8').success).toBe(true);
    expect(g.makeMove('d10', 'e10').success).toBe(true);
    expect(g.makeMove('d8', 'e8').success).toBe(true);
    expect(g.makeMove('e10', 'd10').success).toBe(true); // 3rd appearance

    // Unilateral check -> loss_perpetual_check
    expect(g.getStatus()).toBe('loss_perpetual_check');
  });

  it('detects regular repetition (idle moves without perpetual check) as draw_repetition', () => {
    // Red King at f1, Black King at d10. (Generals on different columns, no check)
    // Red Rook moves a1-a2-a1, Black Rook moves i10-i9-i10
    // Row 1: 3k4r (3 + 1 + 4 + 1 = 9 columns)
    // Row 10: R4K3 (1 + 4 + 1 + 3 = 9 columns)
    const fen = '3k4r/9/9/9/9/9/9/9/9/R4K3 w - - 0 1';
    const game = new XiangqiGame(fen);

    // Cycle 1
    expect(game.makeMove('a1', 'a2').success).toBe(true);
    expect(game.makeMove('i10', 'i9').success).toBe(true);
    expect(game.makeMove('a2', 'a1').success).toBe(true);
    expect(game.makeMove('i9', 'i10').success).toBe(true); // 2nd appearance

    // Cycle 2
    expect(game.makeMove('a1', 'a2').success).toBe(true);
    expect(game.makeMove('i10', 'i9').success).toBe(true);
    expect(game.makeMove('a2', 'a1').success).toBe(true);
    expect(game.makeMove('i9', 'i10').success).toBe(true); // 3rd appearance

    expect(game.getStatus()).toBe('draw_repetition');
  });

  it('detects draw when check is only delivered intermittently (not every turn)', () => {
    // Red King at f1, Black King at d10.
    // Red has Rook at a1, Black has Rook at i10.
    // Non-checking rook maneuvers
    const g = new XiangqiGame('3k4r/9/9/9/9/9/9/9/9/R4K3 w - - 0 1');

    // Cycle 1:
    expect(g.makeMove('a1', 'b1').success).toBe(true);
    expect(g.makeMove('i10', 'h10').success).toBe(true);
    expect(g.makeMove('b1', 'a1').success).toBe(true);
    expect(g.makeMove('h10', 'i10').success).toBe(true); // 2nd appearance

    // Cycle 2:
    expect(g.makeMove('a1', 'b1').success).toBe(true);
    expect(g.makeMove('i10', 'h10').success).toBe(true);
    expect(g.makeMove('b1', 'a1').success).toBe(true);
    expect(g.makeMove('h10', 'i10').success).toBe(true); // 3rd appearance

    expect(g.getStatus()).toBe('draw_repetition');
  });
});
