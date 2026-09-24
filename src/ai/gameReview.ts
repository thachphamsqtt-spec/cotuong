import { Board, Move, Side } from '../core/types';
import { applyMove } from '../core/gameEngine';
import { evaluateBoard } from './evaluation';
import { searchBestMove } from './search';
import { toVietnameseNotation } from '../core/vietnameseNotation';

export type MoveQuality =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export interface EvaluatedMove {
  moveNumber: number;
  move: Move;
  notation: string;
  side: Side;
  evalScore: number; // in centipawns from Red's perspective
  evalDelta: number; // change for the active side
  delta: number; // alias for UI compatibility
  cpLoss: number; // centipawn loss compared to best move
  quality: MoveQuality;
  bestMoveSuggestion?: Move;
  bestMoveNotation?: string;
  explanation: string;
}

export interface ReviewStats {
  brilliant: number;
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  missedWin: number;
}

export interface GameReviewReport {
  evaluatedMoves: EvaluatedMove[];
  redAccuracy: number;
  blackAccuracy: number;
  blunderCountRed: number;
  blunderCountBlack: number;
  mistakeCountRed: number;
  mistakeCountBlack: number;
  redStats: ReviewStats;
  blackStats: ReviewStats;
}

export interface ReviewOptions {
  depth?: number; // Fixed depth for deterministic evaluation (default: 2 for speed or 3)
}

function calculateMoveAccuracy(cpLoss: number): number {
  if (cpLoss <= 0) return 100;
  // Smooth exponential decay: 0 cp loss -> 100%, 100 cp loss -> 80%, 300 cp loss -> ~50%, 600 cp loss -> ~20%
  const acc = 100 * Math.exp(-0.0035 * cpLoss);
  return Math.max(0, Math.min(100, Math.round(acc)));
}

export function reviewGame(
  initialBoard: Board,
  moves: Move[],
  options: ReviewOptions = {}
): GameReviewReport {
  const depth = options.depth ?? 2;
  let currentBoard = initialBoard;
  let previousEval = evaluateBoard(initialBoard);
  const evaluatedMoves: EvaluatedMove[] = [];

  const redStats: ReviewStats = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missedWin: 0 };
  const blackStats: ReviewStats = { brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missedWin: 0 };

  let redAccSum = 0;
  let redMoveCount = 0;
  let blackAccSum = 0;
  let blackMoveCount = 0;

  moves.forEach((move, index) => {
    const isRed = move.side === 'red';
    const notation = toVietnameseNotation(currentBoard, move, 'full');

    // 1. Search for optimal move in current position
    const bestMoveSearchResult = searchBestMove(currentBoard, move.side, { depth });
    const bestMove = bestMoveSearchResult.bestMove;
    const bestEval = bestMoveSearchResult.score; // in Red's perspective

    // 2. Play actual move and evaluate
    const nextBoard = applyMove(currentBoard, move);
    const newEval = evaluateBoard(nextBoard);

    // Delta for active side (positive means score improved)
    const evalDelta = isRed ? newEval - previousEval : previousEval - newEval;

    // CP Loss = how much worse this move is compared to the AI's best evaluated move
    let cpLoss = 0;
    if (isRed) {
      cpLoss = Math.max(0, bestEval - newEval);
    } else {
      cpLoss = Math.max(0, newEval - bestEval);
    }

    // Determine move quality based on CP loss and strategic context
    let quality: MoveQuality = 'good';
    let explanation = 'Nước đi hợp lý trong tình thế.';

    const prevSideEval = isRed ? previousEval : -previousEval;

    if (evalDelta >= 200 && move.captured) {
      quality = 'brilliant';
      explanation = 'Nước cờ xuất sắc! Đột phá chiến thuật tạo ưu thế lớn.';
    } else if (cpLoss <= 15) {
      quality = 'best';
      explanation = 'Nước đi tối ưu nhất theo đánh giá của máy.';
    } else if (cpLoss <= 45) {
      quality = 'excellent';
      explanation = 'Nước đi rất tốt, duy trì thế chủ động.';
    } else if (cpLoss <= 90) {
      quality = 'good';
      explanation = 'Nước đi ổn định, tiếp tục triển khai lực lượng.';
    } else if (prevSideEval > 500 && cpLoss > 300) {
      quality = 'missed_win';
      explanation = 'Bỏ lỡ cơ hội chiến thắng quyết định!';
    } else if (cpLoss <= 200) {
      quality = 'inaccuracy';
      explanation = 'Nước đi chưa chính xác, bỏ lỡ phương án mạnh hơn.';
    } else if (cpLoss <= 450) {
      quality = 'mistake';
      explanation = 'Sai lầm! Để mất ưu thế hoặc mở đường cho đối phương phản kích.';
    } else {
      quality = 'blunder';
      explanation = 'Sai lầm nghiêm trọng! Mất quân hoặc rơi vào thế bại.';
    }

    // Tally stats
    const targetStats = isRed ? redStats : blackStats;
    if (quality === 'missed_win') {
      targetStats.missedWin++;
    } else {
      targetStats[quality]++;
    }

    const moveAcc = calculateMoveAccuracy(cpLoss);
    if (isRed) {
      redAccSum += moveAcc;
      redMoveCount++;
    } else {
      blackAccSum += moveAcc;
      blackMoveCount++;
    }

    let bestMoveNotation: string | undefined;
    if (bestMove) {
      try {
        bestMoveNotation = toVietnameseNotation(currentBoard, bestMove, 'full');
      } catch {
        // Fallback if notation conversion fails
      }
    }

    evaluatedMoves.push({
      moveNumber: Math.floor(index / 2) + 1,
      move,
      notation,
      side: move.side,
      evalScore: newEval,
      evalDelta,
      delta: evalDelta,
      cpLoss,
      quality,
      bestMoveSuggestion: bestMove || undefined,
      bestMoveNotation,
      explanation,
    });

    currentBoard = nextBoard;
    previousEval = newEval;
  });

  return {
    evaluatedMoves,
    redAccuracy: redMoveCount ? Math.round(redAccSum / redMoveCount) : 100,
    blackAccuracy: blackMoveCount ? Math.round(blackAccSum / blackMoveCount) : 100,
    blunderCountRed: redStats.blunder,
    blunderCountBlack: blackStats.blunder,
    mistakeCountRed: redStats.mistake,
    mistakeCountBlack: blackStats.mistake,
    redStats,
    blackStats,
  };
}
