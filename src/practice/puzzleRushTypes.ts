import { Puzzle } from './types';

export type RushMode = '3m' | '5m' | '1m' | 'survival';

export type RushStatus = 'lobby' | 'countdown' | 'playing' | 'gameover';

export interface RushPuzzleRecord {
  puzzle: Puzzle;
  success: boolean;
  timeSpentSecs: number;
}

export interface RushResult {
  mode: RushMode;
  score: number;
  bestScore: number;
  isNewBest: boolean;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  timeTakenSecs: number;
  tierTitle: string;
  tierBadge: string;
  records: RushPuzzleRecord[];
}

export interface RushHighScores {
  '1m': number;
  '3m': number;
  '5m': number;
  'survival': number;
}
