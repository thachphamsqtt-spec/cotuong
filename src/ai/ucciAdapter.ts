import { Engine, EngineBestMoveResult, EngineGoOptions, EngineInfo } from './engineInterface';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { ucciToMove } from './ucciUtils';
import { Board, Side } from '../core/types';
import { applyMove } from '../core/gameEngine';

export interface EngineTransport {
  send(command: string): void;
  onLine(callback: (line: string) => void): void;
  terminate(): void;
}

/**
 * UCCI / UCI Engine Adapter.
 * Connects any external or WebAssembly UCCI-compatible Xiangqi engine (such as Pikafish, Eleeye, Fairy-Stockfish)
 * into the unified Engine interface.
 */
export class UCCIEngineAdapter implements Engine {
  public name = 'UCCI Engine';
  public readonly protocol: 'ucci' = 'ucci';

  private transport: EngineTransport;
  private currentBoard: Board;
  private currentTurn: Side = 'red';
  private readyPromise: { resolve: () => void; reject: (err: any) => void } | null = null;
  private searchPromise: {
    resolve: (res: EngineBestMoveResult) => void;
    reject: (err: any) => void;
    onInfo?: (info: EngineInfo) => void;
  } | null = null;

  private latestInfo: EngineInfo = {};
  private startTime = 0;

  constructor(transport: EngineTransport) {
    this.transport = transport;
    const parsed = parseFEN(INITIAL_FEN);
    this.currentBoard = parsed.board;
    this.currentTurn = parsed.turn;

    this.transport.onLine(this.handleLine.bind(this));
  }

  private handleLine(rawLine: string) {
    const line = rawLine.trim();
    if (!line) return;

    if (line.startsWith('id name ')) {
      this.name = line.substring(8).trim();
      return;
    }

    if (line === 'ucciok' || line === 'readyok') {
      if (this.readyPromise) {
        this.readyPromise.resolve();
        this.readyPromise = null;
      }
      return;
    }

    if (line.startsWith('info ')) {
      const parsedInfo = this.parseInfoLine(line);
      this.latestInfo = { ...this.latestInfo, ...parsedInfo };
      if (this.searchPromise?.onInfo) {
        this.searchPromise.onInfo(this.latestInfo);
      }
      return;
    }

    if (line.startsWith('bestmove ')) {
      const parts = line.split(/\s+/);
      const bestMoveStr = parts[1] || '0000';
      const move = ucciToMove(bestMoveStr, this.currentBoard, this.currentTurn);
      const elapsed = Math.max(1, Math.round(performance.now() - this.startTime));

      if (this.searchPromise) {
        this.searchPromise.resolve({
          bestMoveStr,
          bestMove: move,
          score: this.latestInfo.score ?? 0,
          depth: this.latestInfo.depth ?? 1,
          nodes: this.latestInfo.nodes ?? 0,
          timeMs: elapsed,
        });
        this.searchPromise = null;
      }
      return;
    }
  }

  private parseInfoLine(line: string): EngineInfo {
    const tokens = line.split(/\s+/);
    const info: EngineInfo = {};

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === 'depth' && tokens[i + 1]) {
        info.depth = parseInt(tokens[++i], 10);
      } else if (token === 'seldepth' && tokens[i + 1]) {
        info.selDepth = parseInt(tokens[++i], 10);
      } else if (token === 'score') {
        const type = tokens[++i];
        const val = parseInt(tokens[++i], 10);
        if (type === 'cp') {
          info.score = val;
        } else if (type === 'mate') {
          info.score = val > 0 ? 100000 - val * 100 : -100000 - val * 100;
        }
      } else if (token === 'nodes' && tokens[i + 1]) {
        info.nodes = parseInt(tokens[++i], 10);
      } else if (token === 'nps' && tokens[i + 1]) {
        info.nps = parseInt(tokens[++i], 10);
      } else if (token === 'time' && tokens[i + 1]) {
        info.timeMs = parseInt(tokens[++i], 10);
      } else if (token === 'pv') {
        info.pv = tokens.slice(i + 1);
        if (info.pv.length > 0) {
          info.bestMove = info.pv[0];
        }
        break;
      }
    }

    return info;
  }

  public async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.readyPromise = { resolve, reject };
      this.transport.send('ucci');
      // Fallback timeout
      setTimeout(() => {
        if (this.readyPromise) {
          this.readyPromise.resolve();
          this.readyPromise = null;
        }
      }, 2000);
    });
  }

  public async isReady(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.readyPromise = {
        resolve: () => resolve(true),
        reject,
      };
      this.transport.send('isready');
      setTimeout(() => {
        if (this.readyPromise) {
          this.readyPromise.resolve();
          this.readyPromise = null;
        }
      }, 1000);
    });
  }

  public async setPosition(fen: string, moves?: string[]): Promise<void> {
    const parsed = parseFEN(fen);
    this.currentBoard = parsed.board;
    this.currentTurn = parsed.turn;

    if (moves && moves.length > 0) {
      for (const moveStr of moves) {
        const move = ucciToMove(moveStr, this.currentBoard, this.currentTurn);
        if (move) {
          this.currentBoard = applyMove(this.currentBoard, move);
          this.currentTurn = this.currentTurn === 'red' ? 'black' : 'red';
        }
      }
      this.transport.send(`position fen ${fen} moves ${moves.join(' ')}`);
    } else {
      this.transport.send(`position fen ${fen}`);
    }
  }

  public async go(
    options: EngineGoOptions = {},
    onInfo?: (info: EngineInfo) => void
  ): Promise<EngineBestMoveResult> {
    this.latestInfo = {};
    this.startTime = performance.now();

    return new Promise<EngineBestMoveResult>((resolve, reject) => {
      this.searchPromise = { resolve, reject, onInfo };

      let cmd = 'go';
      if (options.depth) {
        cmd += ` depth ${options.depth}`;
      }
      if (options.timeLimitMs) {
        cmd += ` movetime ${options.timeLimitMs}`;
      }
      if (options.infinite) {
        cmd += ' infinite';
      }

      this.transport.send(cmd);
    });
  }

  public async stop(): Promise<void> {
    this.transport.send('stop');
  }

  public async setOption(name: string, value: string | number | boolean): Promise<void> {
    this.transport.send(`setoption name ${name} value ${value}`);
  }

  public async quit(): Promise<void> {
    this.transport.send('quit');
    this.transport.terminate();
  }
}
