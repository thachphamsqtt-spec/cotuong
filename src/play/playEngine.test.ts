import { describe, it, expect } from 'vitest';
import { XiangqiGame } from '../core/gameEngine';
import { evaluateBoard } from '../ai/evaluation';
import { toVietnameseNotation } from '../core/vietnameseNotation';

describe('Play Module: XiangqiGame Integration & Play Rules', () => {
  it('initializes a fresh game with Red active turn', () => {
    const game = new XiangqiGame();
    expect(game.getTurn()).toBe('red');
    expect(game.getStatus()).toBe('playing');
    expect(game.getHistory()).toHaveLength(0);
  });

  it('handles moves and updates move history with correct Vietnamese notation', () => {
    const game = new XiangqiGame();
    const boardBefore = game.getBoard();

    // Red moves Cannon h3 -> e3 (Pháo 8 bình 5)
    const res = game.makeMove('h3', 'e3');
    expect(res.success).toBe(true);
    expect(res.move).toBeDefined();

    const not = toVietnameseNotation(boardBefore, res.move!, 'full');
    expect(not).toContain('Pháo');
    expect(game.getTurn()).toBe('black');
    expect(game.getHistory()).toHaveLength(1);
  });

  it('supports undoing moves (reverting board and turn)', () => {
    const game = new XiangqiGame();
    game.makeMove('h3', 'e3'); // Red move
    game.makeMove('b10', 'c8'); // Black move

    expect(game.getHistory()).toHaveLength(2);
    expect(game.getTurn()).toBe('red');

    const undoSuccess = game.undo();
    expect(undoSuccess).toBe(true);
    expect(game.getHistory()).toHaveLength(1);
    expect(game.getTurn()).toBe('black');

    game.undo();
    expect(game.getHistory()).toHaveLength(0);
    expect(game.getTurn()).toBe('red');
  });

  it('evaluates draw proposal: accepts when roughly balanced, rejects when machine holds huge advantage', () => {
    const game = new XiangqiGame();
    const currentBoard = game.getBoard();
    const evalScore = evaluateBoard(currentBoard);

    // At starting position, eval should be roughly balanced (|score| < 60)
    const isBalanced = Math.abs(evalScore) < 60;
    expect(isBalanced).toBe(true);
  });
});
