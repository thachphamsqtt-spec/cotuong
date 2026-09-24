import { Engine, EngineBestMoveResult, EngineGoOptions, EngineInfo } from './engineInterface';
import { AIWorkerClient } from './workerClient';
import { parseFEN, INITIAL_FEN } from '../core/fen';
import { Board, Side } from '../core/types';
import { moveToUcci, ucciToMove } from './ucciUtils';
import { applyMove } from '../core/gameEngine';

export class BuiltinEngine implements Engine {
  public readonly name = 'DayCotuong Built-in Engine';
  public readonly protocol: 'builtin' = 'builtin';

  private workerClient: AIWorkerClient;
  private currentBoard: Board;
  private currentTurn: Side = 'red';
  private initialized = false;

  constructor() {
    this.workerClient = new AIWorkerClient();
    const parsed = parseFEN(INITIAL_FEN);
    this.currentBoard = parsed.board;
    this.currentTurn = parsed.turn;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.workerClient.init();
    this.initialized = true;
  }

  public async isReady(): Promise<boolean> {
    return true;
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
    }
  }

  public async go(
    options: EngineGoOptions = {},
    onInfo?: (info: EngineInfo) => void
  ): Promise<EngineBestMoveResult> {
    const depth = options.depth ?? 3;
    const timeLimitMs = options.timeLimitMs;
    const randomness = options.randomness ?? 0;

    const result = await this.workerClient.search(
      this.currentBoard,
      this.currentTurn,
      {
        depth,
        timeLimitMs,
        randomness,
      },
      (progress) => {
        if (onInfo) {
          onInfo({
            depth: progress.depth,
            score: progress.score,
            nodes: progress.nodes,
            nps: progress.nps,
            timeMs: progress.timeMs,
            bestMove: progress.bestMove ? moveToUcci(progress.bestMove) : undefined,
          });
        }
      }
    );

    const bestMoveStr = result.bestMove ? moveToUcci(result.bestMove) : '0000';

    return {
      bestMoveStr,
      bestMove: result.bestMove,
      score: result.score,
      depth: result.depthReached,
      nodes: result.nodesEvaluated,
      timeMs: result.timeMs,
    };
  }

  public async stop(): Promise<void> {
    this.workerClient.stop();
  }

  public async setOption(_name: string, _value: string | number | boolean): Promise<void> {
    // Builtin engine supports custom parameters if needed
  }

  public async quit(): Promise<void> {
    this.workerClient.terminate();
  }
}
