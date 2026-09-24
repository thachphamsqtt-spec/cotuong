import { describe, it, expect } from 'vitest';
import { PUZZLES, getDailyPuzzle } from './puzzleData';
import { parseFEN, validateFEN } from '../core/fen';
import { generateLegalMoves, applyMove } from '../core/gameEngine';
import {
  createPuzzleSession,
  applyPlayerPuzzleMove,
  extractFullSolution,
} from './puzzleManager';
import { PuzzleStep } from './types';

describe('Practice Module: Puzzles & Session Management', () => {
  it('contains a rich collection of puzzles covering all required themes and difficulties', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(8);

    const themes = new Set(PUZZLES.map((p) => p.theme));
    expect(themes.has('mate_in_1')).toBe(true);
    expect(themes.has('mate_in_2')).toBe(true);
    expect(themes.has('double_attack')).toBe(true);

    for (const p of PUZZLES) {
      expect(p.difficulty).toBeGreaterThanOrEqual(1);
      expect(p.difficulty).toBeLessThanOrEqual(5);
      expect(p.hints).toHaveLength(3);
      expect(p.hints[0].trim().length).toBeGreaterThan(0);
      expect(p.hints[1].trim().length).toBeGreaterThan(0);
      expect(p.hints[2].trim().length).toBeGreaterThan(0);
    }
  });

  it('validates that all puzzle FEN strings are syntactically and structurally correct', () => {
    for (const p of PUZZLES) {
      const report = validateFEN(p.fen);
      expect(
        report.structuralErrors.length,
        `Puzzle ${p.id} (${p.title}) has FEN structural errors: ${report.structuralErrors.join(', ')}`
      ).toBe(0);

      const parsed = parseFEN(p.fen);
      expect(parsed).not.toBeNull();
      expect(parsed.board).toHaveLength(10);
    }
  });

  it('verifies that every solution move and subsequent reply in all puzzles are legal moves', () => {
    for (const p of PUZZLES) {
      const parsed = parseFEN(p.fen);
      let currentBoard = parsed.board;
      let step: PuzzleStep | undefined = p.solution;
      let stepNum = 1;

      while (step) {
        // Check player move
        const playerLegals = generateLegalMoves(currentBoard, p.side);
        const playerMoveLegal = playerLegals.some(
          (m) => m.from === step!.move.from && m.to === step!.move.to
        );

        expect(
          playerMoveLegal,
          `Puzzle ${p.id} step ${stepNum}: Player move ${step.move.from}->${step.move.to} is NOT legal in position ${p.fen}`
        ).toBe(true);

        const movingPiece = currentBoard.flat().find((piece) => piece && piece.square === step!.move.from);
        expect(movingPiece).toBeDefined();

        currentBoard = applyMove(currentBoard, {
          from: step.move.from as any,
          to: step.move.to as any,
          piece: movingPiece!.type,
          side: p.side,
        });

        // Check machine reply if exists
        if (step.reply) {
          const enemySide = p.side === 'red' ? 'black' : 'red';
          const replyLegals = generateLegalMoves(currentBoard, enemySide);
          const replyLegal = replyLegals.some(
            (m) => m.from === step!.reply!.from && m.to === step!.reply!.to
          );

          expect(
            replyLegal,
            `Puzzle ${p.id} step ${stepNum}: Enemy reply ${step.reply.from}->${step.reply.to} is NOT legal`
          ).toBe(true);

          const enemyPiece = currentBoard.flat().find((piece) => piece && piece.square === step!.reply!.from);
          expect(enemyPiece).toBeDefined();

          currentBoard = applyMove(currentBoard, {
            from: step.reply.from as any,
            to: step.reply.to as any,
            piece: enemyPiece!.type,
            side: enemySide,
          });
        }

        step = step.next;
        stepNum++;
      }
    }
  });

  it('executes a puzzle session lifecycle correctly (wrong move, correct move, completion)', () => {
    const puzzle = PUZZLES[0]; // Mate in 1 puzzle
    const session = createPuzzleSession(puzzle);
    expect(session.status).toBe('playing');
    expect(session.hintLevel).toBe(0);

    // Try a wrong move
    const wrongRes = applyPlayerPuzzleMove(session, 'e1', 'e2');
    expect(wrongRes.session.status).toBe('wrong');

    // Make the correct move
    const correctRes = applyPlayerPuzzleMove(session, puzzle.solution.move.from, puzzle.solution.move.to);
    expect(['correct', 'completed']).toContain(correctRes.session.status);
  });

  it('deterministically selects daily puzzle based on date', () => {
    const daily1 = getDailyPuzzle(new Date('2026-09-24T05:00:00Z'));
    const daily2 = getDailyPuzzle(new Date('2026-09-24T18:00:00Z'));
    expect(daily1.id).toBe(daily2.id);

    const nextDay = getDailyPuzzle(new Date('2026-09-25T12:00:00Z'));
    expect(nextDay).toBeDefined();
  });

  it('extracts full solution steps with Vietnamese notation for review', () => {
    const puzzle = PUZZLES[0];
    const details = extractFullSolution(puzzle);
    expect(details.length).toBeGreaterThanOrEqual(1);
    expect(details[0].playerMove.notation).toBeDefined();
    expect(details[0].boardAfterPlayer).toBeDefined();
  });
});
