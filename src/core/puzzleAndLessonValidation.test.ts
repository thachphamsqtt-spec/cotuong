import { describe, expect, it } from 'vitest';
import { PUZZLES } from '../practice/puzzleData';
import { CURRICULUM } from '../learn/curriculumData';
import { parseFEN } from './fen';
import { generateLegalMoves, applyMove, isCheck, getGameStatus } from './gameEngine';
import { TryStep } from '../learn/types';
import { createPuzzleSession, applyPlayerPuzzleMove, extractFullSolution } from '../practice/puzzleManager';

describe('Validation of All Puzzles', () => {
  PUZZLES.forEach((puz, idx) => {
    it(`Puzzle ${idx + 1}: "${puz.title}" (${puz.id}) has valid legal solution moves`, () => {
      const { board, turn } = parseFEN(puz.fen);
      expect(turn).toBe(puz.side);

      // Verify step 1
      const legalMoves1 = generateLegalMoves(board, turn);
      const isLegal1 = legalMoves1.some(
        (m) => m.from === puz.solution.move.from && m.to === puz.solution.move.to
      );
      expect(
        isLegal1,
        `Move 1 (${puz.solution.move.from}->${puz.solution.move.to}) must be legal in puzzle ${puz.id}`
      ).toBe(true);

      const movingPiece1 = board.flat().find((p) => p && p.square === puz.solution.move.from)!;
      let currentBoard = applyMove(board, {
        from: puz.solution.move.from as any,
        to: puz.solution.move.to as any,
        piece: movingPiece1.type,
        side: turn,
      });

      // If multi-step
      if (puz.solution.reply && puz.solution.next) {
        const enemySide = turn === 'red' ? 'black' : 'red';
        const enemyMoves = generateLegalMoves(currentBoard, enemySide);
        const replyLegal = enemyMoves.some(
          (m) => m.from === puz.solution.reply!.from && m.to === puz.solution.reply!.to
        );
        expect(
          replyLegal,
          `Reply move (${puz.solution.reply.from}->${puz.solution.reply.to}) must be legal for enemy in puzzle ${puz.id}`
        ).toBe(true);

        const movingPieceEnemy = currentBoard.flat().find((p) => p && p.square === puz.solution.reply!.from)!;
        currentBoard = applyMove(currentBoard, {
          from: puz.solution.reply.from as any,
          to: puz.solution.reply.to as any,
          piece: movingPieceEnemy.type,
          side: enemySide,
        });

        // Step 2 move
        const legalMoves2 = generateLegalMoves(currentBoard, turn);
        const isLegal2 = legalMoves2.some(
          (m) => m.from === puz.solution.next!.move.from && m.to === puz.solution.next!.move.to
        );
        expect(
          isLegal2,
          `Move 2 (${puz.solution.next.move.from}->${puz.solution.next.move.to}) must be legal in puzzle ${puz.id}`
        ).toBe(true);
      }
    });
  });
});

describe('Puzzle Manager Behavior & Solution Extraction', () => {
  it('allows player to make the correct move after making a wrong move', () => {
    const puzzle = PUZZLES[0]; // puz-01: a2 -> a10
    const session = createPuzzleSession(puzzle);

    // 1. Wrong move
    const wrongRes = applyPlayerPuzzleMove(session, 'a2', 'a3');
    expect(wrongRes.success).toBe(false);
    expect(wrongRes.session.status).toBe('wrong');

    // 2. Correct move from the same state
    const correctRes = applyPlayerPuzzleMove(wrongRes.session, 'a2', 'a10');
    expect(correctRes.success).toBe(true);
    expect(correctRes.session.status).toBe('completed');
  });

  it('extracts full solution correctly with notations for all puzzles', () => {
    PUZZLES.forEach((puz) => {
      const solutionSteps = extractFullSolution(puz);
      expect(solutionSteps.length).toBeGreaterThan(0);
      solutionSteps.forEach((step) => {
        expect(step.playerMove.from).toBeDefined();
        expect(step.playerMove.to).toBeDefined();
        expect(step.playerMove.notation).toBeTruthy();
        expect(step.boardAfterPlayer).toBeDefined();
      });
    });
  });
});

describe('Validation of All Curriculum Lessons', () => {
  CURRICULUM.forEach((lesson) => {
    lesson.steps.forEach((step, sIdx) => {
      if (step.type === 'try') {
        it(`Lesson "${lesson.title}" Step ${sIdx + 1} (${step.title}) has valid expected moves`, () => {
          const tryStep = step as TryStep;
          const { board, turn } = parseFEN(tryStep.fen);
          const legalMoves = generateLegalMoves(board, turn);

          expect(tryStep.expectedMoves.length).toBeGreaterThan(0);

          tryStep.expectedMoves.forEach((expMove) => {
            const isLegal = legalMoves.some(
              (m) => m.from === expMove.from && m.to === expMove.to
            );
            expect(
              isLegal,
              `Expected move (${expMove.from}->${expMove.to}) must be legal in lesson ${lesson.id} step ${step.id}`
            ).toBe(true);
          });
        });
      }
    });
  });
});
