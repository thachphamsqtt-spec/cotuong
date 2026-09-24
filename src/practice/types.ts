export type PuzzleTheme =
  | 'mate_in_1'
  | 'mate_in_2'
  | 'mate_in_3'
  | 'double_attack'
  | 'pin'
  | 'endgame'
  | 'tactics';

export interface PuzzleStep {
  move: { from: string; to: string };
  reply?: { from: string; to: string };
  commentary?: string;
  next?: PuzzleStep;
}

export interface Puzzle {
  id: string;
  title: string;
  theme: PuzzleTheme;
  difficulty: number; // 1 to 5
  fen: string;
  side: 'red' | 'black';
  goal: string;
  solution: PuzzleStep;
  hints: [string, string, string]; // [piece to move, destination square, full explanation]
}
