import { describe, it, expect } from 'vitest';
import { generateLegalMoves } from '../core/gameEngine';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { searchBestMove, SearchOptions } from './search';

describe('AI Search Engine', () => {
  it('finds a valid legal move from the initial position', () => {
    const { board } = parseFEN(INITIAL_FEN);
    const legalMoves = generateLegalMoves(board, 'red');
    const result = searchBestMove(board, 'red', { depth: 2 });

    expect(result.bestMove).not.toBeNull();
    const isLegal = legalMoves.some(
      (m) =>
        m.from === result.bestMove!.from &&
        m.to === result.bestMove!.to
    );
    expect(isLegal).toBe(true);
    expect(result.depthReached).toBe(2);
    expect(result.nodesEvaluated).toBeGreaterThan(0);
  });

  it('detects immediate checkmate in 1 move', () => {
    // Red can mate Black in 1 move with Chariot
    // Black King at e10 (0,4), Red Chariot at e9 (1,4), Red Chariot at a10 (0,0)
    const fen = '3k5/4R4/9/9/9/9/9/9/9/4K4 w - - 0 1';
    const parsed = parseFEN(fen);
    expect(parsed).not.toBeNull();
    const board = parsed!.board;

    const result = searchBestMove(board, 'red', { depth: 2 });
    expect(result.bestMove).not.toBeNull();
    expect(result.score).toBeGreaterThan(90000);
  });

  it('supports cancellation / early stop via shouldStop predicate', () => {
    const { board } = parseFEN(INITIAL_FEN);
    let stopCalled = false;
    let iterations = 0;

    const options: SearchOptions = {
      depth: 6,
      shouldStop: () => {
        iterations++;
        if (iterations > 50) {
          stopCalled = true;
          return true;
        }
        return false;
      },
    };

    const result = searchBestMove(board, 'red', options);
    expect(stopCalled).toBe(true);
    expect(result.bestMove).not.toBeNull();
  });

  it('emits progress notifications during search', () => {
    const { board } = parseFEN(INITIAL_FEN);
    const progressList: any[] = [];

    searchBestMove(board, 'red', {
      depth: 2,
      onProgress: (prog) => {
        progressList.push(prog);
      },
    });

    expect(progressList.length).toBeGreaterThan(0);
    expect(progressList[progressList.length - 1].depth).toBeGreaterThanOrEqual(1);
    expect(progressList[progressList.length - 1].nodes).toBeGreaterThan(0);
  });
});
