import { Board, Move, Side, Square } from '../core/types';

export type OpeningCategory =
  | 'trung-phao'
  | 'binh-phong-ma'
  | 'nghich-phao'
  | 'phan-cung-ma'
  | 'don-de-ma'
  | 'tien-nhan'
  | 'khoi-ma'
  | 'phi-tuong'
  | 'qua-cung-si-giac'
  | 'cam-bay-ky-tran';

export interface OpeningMove {
  from: Square;
  to: Square;
  notation?: string;
  commentary?: string;
  isKeyMove?: boolean;
}

export interface OpeningStats {
  redWinRate: number; // 0 - 100
  drawRate: number;   // 0 - 100
  blackWinRate: number; // 0 - 100
  popularity: number; // 1 - 100
  totalGamesSample?: number;
}

export interface OpeningVariation {
  id: string;
  name: string;
  vietnameseName: string;
  chineseName?: string;
  category: OpeningCategory;
  side: 'red' | 'black' | 'both';
  eco: string;
  description: string;
  strategicGoals: string[];
  strengths: string[];
  weaknesses: string[];
  grandmasters: string[];
  stats: OpeningStats;
  moves: OpeningMove[];
  trapsAndMistakes?: string[];
}

export interface CandidateContinuation {
  move: OpeningMove;
  notation: string;
  matchingOpenings: OpeningVariation[];
  stats: OpeningStats;
  commentary?: string;
}

export interface OpeningTrainerState {
  isActive: boolean;
  selectedOpeningId: string | null;
  playerSide: Side;
  currentMoveIndex: number;
  score: number;
  totalKeyMoves: number;
  mistakes: number;
  feedback: {
    status: 'correct' | 'deviation' | 'completed';
    message: string;
  } | null;
}
