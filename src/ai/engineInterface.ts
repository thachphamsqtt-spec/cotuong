import { Board, Move, Side } from '../core/types';

export interface EngineInfo {
  depth?: number;
  selDepth?: number;
  score?: number; // In centipawns or mate score
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv?: string[]; // Principal variation as coordinate strings (e.g. ['h2e2', 'b9c7'])
  bestMove?: string;
}

export interface EngineGoOptions {
  depth?: number;
  timeLimitMs?: number;
  randomness?: number;
  infinite?: boolean;
}

export interface EngineBestMoveResult {
  bestMoveStr: string;
  bestMove?: Move | null;
  score: number;
  depth: number;
  nodes: number;
  timeMs: number;
}

export interface Engine {
  readonly name: string;
  readonly protocol: 'builtin' | 'ucci' | 'uci';
  init(): Promise<void>;
  isReady(): Promise<boolean>;
  setPosition(fen: string, moves?: string[]): Promise<void>;
  go(options: EngineGoOptions, onInfo?: (info: EngineInfo) => void): Promise<EngineBestMoveResult>;
  stop(): Promise<void>;
  setOption(name: string, value: string | number | boolean): Promise<void>;
  quit(): Promise<void>;
}
