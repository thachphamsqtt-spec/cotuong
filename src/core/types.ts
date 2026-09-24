export type Side = 'red' | 'black';

export type PieceType = 'general' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn';

// Square notation: columns a-i, ranks 1-10 (e.g. 'e1', 'e10', 'a4')
export type FileChar = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i';
export type RankNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type Square = `${FileChar}${RankNum}`;

export interface Piece {
  id: string;
  side: Side;
  type: PieceType;
  square: Square;
}

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  side: Side;
  captured?: PieceType;
  isCheck?: boolean; // True if this move delivers check
  isChase?: boolean; // Reserved for future perpetual chase detection
}

export type Board = (Piece | null)[][]; // 10 rows (0 to 9), 9 columns (0 to 8)
// Row 0 is Rank 10 (Black's backline)
// Row 9 is Rank 1 (Red's backline)
// Col 0 is File 'a' (from Red's left, Black's right)
// Col 8 is File 'i' (from Red's right, Black's left)

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate' // In Xiangqi, the player with no legal moves loses!
  | 'draw_repetition'
  | 'draw_agreement'
  | 'draw_moves_limit'
  | 'loss_perpetual_check'; // Active player lost due to unilateral perpetual check

export interface RuleSet {
  name: string;
  maxHalfMovesNoCapture: number; // default 120 (60 full moves)
  repetitionThreshold: number;   // default 3
  banPerpetualCheck: boolean;    // default true (loss for checking side)
  allowPerpetualChase?: boolean; // default false (reserved for future)
}

export const DEFAULT_RULESET: RuleSet = {
  name: 'asian_simplified',
  maxHalfMovesNoCapture: 120,
  repetitionThreshold: 3,
  banPerpetualCheck: true,
  allowPerpetualChase: false,
};

export interface GameSnapshot {
  board: Board;
  turn: Side;
  status: GameStatus;
  lastMove?: Move;
  halfMovesNoCapture: number;
  fullMoveNumber: number;
  history: Move[];
  fenHistory: string[];
}
