import { describe, it, expect } from 'vitest';
import { CURRICULUM } from './curriculumData';
import { parseFEN, validateFEN } from '../core/fen';
import { generateLegalMoves } from '../core/gameEngine';
import { TryStep, QuizStep } from './types';

describe('Curriculum Data Integrity & Validation', () => {
  it('contains structured lessons across 3 comprehensive levels', () => {
    expect(CURRICULUM.length).toBeGreaterThanOrEqual(12);

    const levels = new Set(CURRICULUM.map((l) => l.level));
    expect(levels.has(1)).toBe(true);
    expect(levels.has(2)).toBe(true);
    expect(levels.has(3)).toBe(true);
  });

  it('ensures every lesson has unique ID and valid steps with Explain/Try/Quiz patterns', () => {
    const ids = new Set<string>();

    for (const lesson of CURRICULUM) {
      expect(ids.has(lesson.id)).toBe(false);
      ids.add(lesson.id);

      expect(lesson.title.trim().length).toBeGreaterThan(0);
      expect(lesson.summary.trim().length).toBeGreaterThan(0);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('validates that all FEN strings in lessons are syntactically and structurally correct', () => {
    for (const lesson of CURRICULUM) {
      for (const step of lesson.steps) {
        if ('fen' in step && typeof step.fen === 'string') {
          const val = validateFEN(step.fen);
          expect(val.structuralErrors.length, `Lesson ${lesson.id} step ${step.id} has structural errors: ${val.structuralErrors.join(', ')}`).toBe(0);

          const parsed = parseFEN(step.fen);
          expect(parsed).not.toBeNull();
          expect(parsed.board).toHaveLength(10);
        }
      }
    }
  });

  it('verifies all TryStep expected moves are strictly legal moves according to gameEngine', () => {
    for (const lesson of CURRICULUM) {
      for (const step of lesson.steps) {
        if (step.type === 'try') {
          const tryStep = step as TryStep;
          const { board, turn } = parseFEN(tryStep.fen);
          const legalMoves = generateLegalMoves(board, turn);

          expect(tryStep.expectedMoves.length).toBeGreaterThan(0);

          for (const expMove of tryStep.expectedMoves) {
            const isLegal = legalMoves.some(
              (m) => m.from === expMove.from && m.to === expMove.to
            );
            expect(
              isLegal,
              `Lesson ${lesson.id} step ${step.id}: expected move ${expMove.from}->${expMove.to} is NOT legal in position ${tryStep.fen}`
            ).toBe(true);
          }
        }
      }
    }
  });

  it('verifies all QuizStep questions have valid options and correctIndex within bounds', () => {
    for (const lesson of CURRICULUM) {
      for (const step of lesson.steps) {
        if (step.type === 'quiz') {
          const quizStep = step as QuizStep;
          expect(quizStep.questions.length).toBeGreaterThan(0);

          for (const q of quizStep.questions) {
            expect(q.options.length).toBeGreaterThanOrEqual(2);
            expect(q.correctIndex).toBeGreaterThanOrEqual(0);
            expect(q.correctIndex).toBeLessThan(q.options.length);
            expect(q.explanation.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
