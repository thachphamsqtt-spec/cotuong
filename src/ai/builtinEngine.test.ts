import { describe, it, expect, afterEach } from 'vitest';
import { BuiltinEngine } from './builtinEngine';
import { INITIAL_FEN } from '../core/fen';

describe('BuiltinEngine', () => {
  let engine: BuiltinEngine;

  afterEach(async () => {
    if (engine) {
      await engine.quit();
    }
  });

  it('implements Engine interface and finds valid moves', async () => {
    engine = new BuiltinEngine();
    await engine.init();
    expect(await engine.isReady()).toBe(true);

    await engine.setPosition(INITIAL_FEN);
    const result = await engine.go({ depth: 2 });

    expect(result.bestMove).not.toBeNull();
    expect(result.bestMoveStr.length).toBe(4);
    expect(result.depth).toBe(2);
    expect(result.nodes).toBeGreaterThan(0);
  });
});
