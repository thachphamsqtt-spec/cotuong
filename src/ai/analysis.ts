import { Move, Side } from '../core/types';

export interface AnalysisSuggestion {
  from: string;
  to: string;
  score: number;
  label: 'good' | 'neutral' | 'warning';
}

export interface AIAnalysisResult {
  score: number;
  depth: number;
  bestMove: Move | null;
  explanation: string;
  evaluationLabel: string;
  topMoves: AnalysisSuggestion[];
  predictedLines: string[][];
}

export function getEvaluationLabel(score: number, side: Side): string {
  if (Math.abs(score) < 30) {
    return 'Thế cờ đang cân bằng';
  }

  if (side === 'red') {
    return score > 0 ? 'Đỏ đang có ưu thế' : 'Đen đang có ưu thế';
  }

  // In this engine, positive score means Red is better. So when evaluating from Black's perspective,
  // a negative score means Black is currently better.
  return score < 0 ? 'Đen đang có ưu thế' : 'Đỏ đang có ưu thế';
}

export function buildAiCommentary(score: number, bestMove: Partial<Move> | null): string {
  if (!bestMove || !bestMove.from || !bestMove.to) {
    return 'Không có nước đi đáng chú ý trong thế cờ hiện tại.';
  }

  if (Math.abs(score) < 30) {
    return `Nước ${bestMove.from} → ${bestMove.to} là lựa chọn ổn định, giữ thế cờ cân bằng và không để đối phương có đòn phản công nguy hiểm.`;
  }

  if (score > 0) {
    return `Nước ${bestMove.from} → ${bestMove.to} tạo ra ưu thế rõ ràng, tăng áp lực và khiến đối phương phải bám thế cẩn thận.`;
  }

  return `Nước ${bestMove.from} → ${bestMove.to} đang bị đối thủ phản đòn mạnh; cần cân nhắc chuyển đổi hoặc tìm cách phá thế phòng ngự.`;
}

export function buildPredictedLines(bestMove: Move | null): string[][] {
  if (!bestMove) return [];

  return [
    [bestMove.from, bestMove.to],
    [bestMove.to, bestMove.from],
    [bestMove.from, bestMove.to, bestMove.from],
  ];
}
