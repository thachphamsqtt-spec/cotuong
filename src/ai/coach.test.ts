import { describe, expect, it } from 'vitest';
import { generateCoachAdvice } from './coach';

describe('AI coach', () => {
  it('returns beginner-friendly guidance for a clear advantage', () => {
    const advice = generateCoachAdvice(200, { from: 'e2', to: 'e3', piece: 'pawn', side: 'red' }, 'red', 'beginner');

    expect(advice.length).toBeGreaterThan(0);
    expect(advice[0].message).toContain('ưu thế');
  });

  it('returns more advanced tactical guidance for expert mode', () => {
    const advice = generateCoachAdvice(-120, { from: 'd7', to: 'd6', piece: 'pawn', side: 'black' }, 'black', 'expert');

    expect(advice.length).toBeGreaterThan(0);
    expect(advice[0].message).toContain('chiến lược');
  });
});
