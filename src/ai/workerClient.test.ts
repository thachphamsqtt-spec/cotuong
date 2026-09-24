import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { AIWorkerClient } from './workerClient';

describe('AIWorkerClient', () => {
  let client: AIWorkerClient;

  beforeEach(() => {
    client = new AIWorkerClient();
  });

  afterEach(() => {
    client.terminate();
  });

  it('initializes and reports ready', async () => {
    const info = await client.init();
    expect(info.engineName).toBeDefined();
    expect(info.version).toBeDefined();
  });

  it('evaluates a position', async () => {
    await client.init();
    const { board } = parseFEN(INITIAL_FEN);
    const score = await client.evaluate(board);
    expect(typeof score).toBe('number');
  });

  it('searches for best move with progress callbacks', async () => {
    await client.init();
    const { board } = parseFEN(INITIAL_FEN);
    const progressList: any[] = [];

    const result = await client.search(
      board,
      'red',
      { depth: 2 },
      (progress) => {
        progressList.push(progress);
      }
    );

    expect(result.bestMove).not.toBeNull();
    expect(result.nodesEvaluated).toBeGreaterThan(0);
    expect(progressList.length).toBeGreaterThan(0);
  });

  it('handles stop request gracefully during search', async () => {
    await client.init();
    const { board } = parseFEN(INITIAL_FEN);

    const searchPromise = client.search(board, 'red', { depth: 5 });
    // Request stop shortly after starting
    setTimeout(() => {
      client.stop();
    }, 10);

    const result = await searchPromise;
    expect(result.bestMove).not.toBeNull();
  });
});
