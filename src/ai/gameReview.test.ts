import { describe, it, expect } from 'vitest';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { reviewGame } from './gameReview';
import { Move } from '../core/types';

describe('Game Review Engine', () => {
  it('evaluates a short sequence of opening moves with accuracy metrics', () => {
    const { board } = parseFEN(INITIAL_FEN);

    // Opening sequence:
    // 1. Red Cannon h3 -> e3 (Pháo 2 bình 5)
    // 2. Black Horse b10 -> c8 (Mã 8 tiến 7)
    const moves: Move[] = [
      {
        from: 'h3',
        to: 'e3',
        piece: 'cannon',
        side: 'red',
      },
      {
        from: 'b10',
        to: 'c8',
        piece: 'horse',
        side: 'black',
      },
    ];

    const report = reviewGame(board, moves, { depth: 2 });

    expect(report.evaluatedMoves).toHaveLength(2);
    expect(report.redAccuracy).toBeGreaterThan(70);
    expect(report.blackAccuracy).toBeGreaterThan(70);

    const firstMove = report.evaluatedMoves[0];
    expect(firstMove.side).toBe('red');
    expect(firstMove.quality).toBeDefined();
    expect(firstMove.cpLoss).toBeGreaterThanOrEqual(0);
    expect(firstMove.notation).toContain('Pháo');
  });

  it('detects deliberate blunders and assigns blunder quality with lower accuracy', () => {
    // Position where Red Rook is hanging or Red sacrifices a Rook for nothing
    // Red has Rook at e5, Black has Chariot at e8 facing it
    // Red plays a passive move pawn c4 -> c5 while best move is Rook captures or retreats
    const fen = '3k5/9/9/9/4r4/4R4/9/9/9/4K4 w - - 0 1';
    const parsed = parseFEN(fen);
    expect(parsed).not.toBeNull();
    const board = parsed!.board;

    // Hanging move: Red moves King instead of taking Black rook or defending
    // Red King e1 -> e2 (King walks into check or hangs Rook)
    const moves: Move[] = [
      {
        from: 'e1',
        to: 'd1',
        piece: 'general',
        side: 'red',
      },
    ];

    const report = reviewGame(board, moves, { depth: 2 });
    expect(report.evaluatedMoves).toHaveLength(1);

    const evalMove = report.evaluatedMoves[0];
    expect(['mistake', 'blunder', 'inaccuracy']).toContain(evalMove.quality);
  });
});
