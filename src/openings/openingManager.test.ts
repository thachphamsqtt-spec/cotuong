import { describe, it, expect } from 'vitest';
import { OPENINGS_DATABASE, OPENING_CATEGORIES } from './openingData';
import {
  findMatchingOpenings,
  getCandidateContinuations,
  getPrimaryOpening,
  replayOpeningMoves,
} from './openingManager';
import { parseFEN } from '../core/fen';
import { generateLegalMoves, applyMove } from '../core/gameEngine';

describe('Opening Explorer & Encyclopedia Data Integrity', () => {
  it('has valid categories with existing openings assigned', () => {
    expect(OPENING_CATEGORIES.length).toBeGreaterThan(5);
    expect(OPENINGS_DATABASE.length).toBeGreaterThan(15);

    const categoryIds = new Set(OPENING_CATEGORIES.map((c) => c.id));
    for (const op of OPENINGS_DATABASE) {
      expect(categoryIds.has(op.category)).toBe(true);
      expect(op.moves.length).toBeGreaterThanOrEqual(4);
      expect(op.strategicGoals.length).toBeGreaterThan(0);
      expect(op.stats.popularity).toBeGreaterThan(0);
    }
  });

  it('verifies that every move in all opening variations is strictly legal', () => {
    for (const op of OPENINGS_DATABASE) {
      const initial = parseFEN();
      let currentBoard = initial.board;
      let currentTurn = initial.turn;

      for (let i = 0; i < op.moves.length; i++) {
        const m = op.moves[i];
        const legalMoves = generateLegalMoves(currentBoard, currentTurn);
        const isLegal = legalMoves.some((lm) => lm.from === m.from && lm.to === m.to);

        expect(
          isLegal,
          `Opening "${op.name}" (${op.id}) step ${i + 1} (${m.from} -> ${m.to}, ${m.notation}) must be legal for ${currentTurn}`
        ).toBe(true);

        const movingPiece = currentBoard.flat().find((p) => p && p.square === m.from)!;
        expect(movingPiece).toBeDefined();
        expect(movingPiece.side).toBe(currentTurn);

        currentBoard = applyMove(currentBoard, {
          from: m.from,
          to: m.to,
          piece: movingPiece.type,
          side: movingPiece.side,
        });
        currentTurn = currentTurn === 'red' ? 'black' : 'red';
      }
    }
  });

  it('correctly matches openings by move sequence and finds candidate continuations', () => {
    // Start from scratch (no moves made)
    const initialBoard = parseFEN().board;
    const rootCandidates = getCandidateContinuations(initialBoard, []);
    expect(rootCandidates.length).toBeGreaterThan(3);

    // After Red plays Trung Pháo (h3 -> e3)
    const move1 = { from: 'h3' as const, to: 'e3' as const };
    const matchingAfter1 = findMatchingOpenings([move1]);
    expect(matchingAfter1.length).toBeGreaterThan(5);

    const primaryAfter1 = getPrimaryOpening([move1]);
    expect(primaryAfter1.opening).not.toBeNull();

    // Replay move helper test
    const targetOpening = OPENINGS_DATABASE[0];
    const replayResult = replayOpeningMoves(targetOpening.moves);
    expect(replayResult.boards.length).toBe(targetOpening.moves.length + 1);
    expect(replayResult.annotatedMoves.length).toBe(targetOpening.moves.length);
  });
});
