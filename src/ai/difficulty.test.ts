import { describe, it, expect } from 'vitest';
import { AI_DIFFICULTIES, getDifficultyConfig } from './difficulty';
import { playMatch, runSelfPlayBenchmark } from './selfPlay';

describe('AI Difficulties Configuration & Self-Play Benchmark', () => {
  it('defines 8 ascending difficulty levels with coherent metrics', () => {
    expect(AI_DIFFICULTIES).toHaveLength(8);

    for (let i = 0; i < AI_DIFFICULTIES.length; i++) {
      const current = AI_DIFFICULTIES[i];
      expect(current.level).toBe(i + 1);
      expect(current.depth).toBeGreaterThanOrEqual(1);
      expect(current.eloEstimate).toBeGreaterThan(0);

      if (i > 0) {
        const prev = AI_DIFFICULTIES[i - 1];
        expect(current.depth).toBeGreaterThanOrEqual(prev.depth);
        expect(current.blunderRate).toBeLessThanOrEqual(prev.blunderRate);
        expect(current.eloEstimate).toBeGreaterThan(prev.eloEstimate);
      }
    }
  });

  it('correctly retrieves difficulty configs with boundary clamping', () => {
    expect(getDifficultyConfig(1).level).toBe(1);
    expect(getDifficultyConfig(8).level).toBe(8);
    expect(getDifficultyConfig(0).level).toBe(1);
    expect(getDifficultyConfig(99).level).toBe(8);
  });

  it('successfully completes a self-play match between two AI instances', () => {
    const match = playMatch(2, 1, undefined, 40);
    expect(match.moveCount).toBeGreaterThan(0);
    expect(['red', 'black', 'draw']).toContain(match.winner);
  });

  it('demonstrates higher difficulty level outperforming lower level in benchmark', () => {
    // Level 3 (Depth 2, low blunder) vs Level 1 (Depth 1, high blunder 40%)
    const benchmark = runSelfPlayBenchmark(3, 1, 6);
    expect(benchmark.totalGames).toBe(6);
    // Level 3 should have a higher win rate against Level 1
    expect(benchmark.levelAWins).toBeGreaterThanOrEqual(benchmark.levelBWins);
  });
});
