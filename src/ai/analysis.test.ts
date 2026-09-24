import { describe, expect, it } from 'vitest';
import { buildAiCommentary, getEvaluationLabel } from './analysis';

describe('AI analysis helpers', () => {
  it('formats advantage clearly for red and black', () => {
    expect(getEvaluationLabel(120, 'red')).toBe('Đỏ đang có ưu thế');
    expect(getEvaluationLabel(-80, 'black')).toBe('Đen đang có ưu thế');
    expect(getEvaluationLabel(0, 'red')).toBe('Thế cờ đang cân bằng');
  });

  it('builds a readable explanation for the best move', () => {
    const commentary = buildAiCommentary(120, {
      from: 'e2',
      to: 'e3',
      piece: 'pawn',
      side: 'red',
    });

    expect(commentary).toContain('ưu thế');
    expect(commentary).toContain('e2');
    expect(commentary).toContain('e3');
  });
});
