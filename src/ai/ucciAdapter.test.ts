import { describe, it, expect } from 'vitest';
import { UCCIEngineAdapter, EngineTransport } from './ucciAdapter';
import { INITIAL_FEN } from '../core/fen';

class MockTransport implements EngineTransport {
  public sentCommands: string[] = [];
  private lineCallback: ((line: string) => void) | null = null;

  send(command: string): void {
    this.sentCommands.push(command);

    if (command === 'ucci') {
      setTimeout(() => {
        this.lineCallback?.('id name Pikafish-Mock 1.0');
        this.lineCallback?.('id copyright GPL-3.0');
        this.lineCallback?.('option name Hash type spin default 16 min 1 max 1024');
        this.lineCallback?.('ucciok');
      }, 10);
    } else if (command === 'isready') {
      setTimeout(() => {
        this.lineCallback?.('readyok');
      }, 10);
    } else if (command.startsWith('go')) {
      setTimeout(() => {
        this.lineCallback?.('info depth 3 score cp 85 nodes 15200 nps 450000 pv h2e2 b9c7');
        this.lineCallback?.('bestmove h2e2');
      }, 20);
    }
  }

  onLine(callback: (line: string) => void): void {
    this.lineCallback = callback;
  }

  terminate(): void {
    this.sentCommands.push('__TERMINATED__');
  }
}

describe('UCCIEngineAdapter', () => {
  it('initializes and reads engine name and protocol response', async () => {
    const transport = new MockTransport();
    const adapter = new UCCIEngineAdapter(transport);

    await adapter.init();
    expect(adapter.name).toBe('Pikafish-Mock 1.0');
    expect(transport.sentCommands).toContain('ucci');
  });

  it('sets position and sends search command, receiving bestmove and parsed Move object', async () => {
    const transport = new MockTransport();
    const adapter = new UCCIEngineAdapter(transport);
    await adapter.init();

    await adapter.setPosition(INITIAL_FEN);
    expect(transport.sentCommands).toContain(`position fen ${INITIAL_FEN}`);

    const result = await adapter.go({ depth: 3 });
    expect(result.bestMoveStr).toBe('h2e2');
    expect(result.score).toBe(85);
    expect(result.depth).toBe(3);
    expect(result.bestMove).not.toBeNull();
    expect(result.bestMove!.piece).toBe('cannon');
  });
});
