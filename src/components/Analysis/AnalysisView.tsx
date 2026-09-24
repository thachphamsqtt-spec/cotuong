import React, { useState, useMemo } from 'react';
import { Board, Move } from '../../core/types';
import { reviewGame, EvaluatedMove } from '../../ai/gameReview';
import { applyMove } from '../../core/gameEngine';
import { parseFEN } from '../../core/fen';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';

interface AnalysisViewProps {
  initialBoard: Board;
  moves: Move[];
  pieceSet: PieceSet;
  onBackToPlay: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  initialBoard,
  moves,
  pieceSet,
  onBackToPlay,
}) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(moves.length - 1);
  const [customFenInput, setCustomFenInput] = useState<string>('');
  const [customFenError, setCustomFenError] = useState<string | null>(null);

  const [activeBoard, setActiveBoard] = useState<Board>(initialBoard);
  const [activeMoves, setActiveMoves] = useState<Move[]>(moves);

  // When initial props change
  React.useEffect(() => {
    setActiveBoard(initialBoard);
    setActiveMoves(moves);
    setCurrentMoveIndex(moves.length - 1);
  }, [initialBoard, moves]);

  const reviewReport = useMemo(() => {
    return reviewGame(activeBoard, activeMoves);
  }, [activeBoard, activeMoves]);

  // Compute board state at current move index
  const boardAtCurrentIndex = useMemo(() => {
    let b = activeBoard;
    for (let i = 0; i <= currentMoveIndex && i < activeMoves.length; i++) {
      b = applyMove(b, activeMoves[i]);
    }
    return b;
  }, [activeBoard, activeMoves, currentMoveIndex]);

  const activeEvaluatedMove: EvaluatedMove | undefined =
    reviewReport.evaluatedMoves[currentMoveIndex];

  const qualityColor: Record<string, string> = {
    brilliant: '#2ecc71',
    best: '#3498db',
    excellent: '#1abc9c',
    good: '#16a085',
    inaccuracy: '#f39c12',
    mistake: '#e67e22',
    blunder: '#e74c3c',
    missed_win: '#9b59b6',
  };

  const qualityLabel: Record<string, string> = {
    brilliant: '🌟 Đột phá tuyệt vời',
    best: '✓ Nước tối ưu',
    excellent: '★ Xuất sắc',
    good: '• Hợp lý',
    inaccuracy: '⚠️ Chưa chính xác',
    mistake: '❓ Sai lầm',
    blunder: '❌ Nước thua cờ',
    missed_win: '💔 Bỏ lỡ cơ hội thắng',
  };

  // Evaluation score and bar
  const currentEvalScore = activeEvaluatedMove?.evalScore ?? 0;
  const clampedEval = Math.max(-1500, Math.min(1500, currentEvalScore));
  const redPercentage = Math.round(((clampedEval + 1500) / 3000) * 100);

  // Compute arrows for board display
  const arrows: [string, string][] = [];
  if (activeEvaluatedMove) {
    // Red arrow for actual move
    arrows.push([activeEvaluatedMove.move.from, activeEvaluatedMove.move.to]);
    // If there is an alternate best move recommendation
    if (
      activeEvaluatedMove.bestMoveSuggestion &&
      (activeEvaluatedMove.bestMoveSuggestion.from !== activeEvaluatedMove.move.from ||
        activeEvaluatedMove.bestMoveSuggestion.to !== activeEvaluatedMove.move.to)
    ) {
      arrows.push([
        activeEvaluatedMove.bestMoveSuggestion.from,
        activeEvaluatedMove.bestMoveSuggestion.to,
      ]);
    }
  }

  const handleLoadCustomFen = () => {
    try {
      const parsed = parseFEN(customFenInput.trim());
      setActiveBoard(parsed.board);
      setActiveMoves([]);
      setCurrentMoveIndex(-1);
      setCustomFenError(null);
    } catch {
      setCustomFenError('Chuỗi FEN không hợp lệ. Vui lòng kiểm tra lại!');
    }
  };

  return (
    <div className="analysis-container">
      {/* Top Header */}
      <div className="analysis-topbar">
        <div className="topbar-title-group">
          <h2>🔍 Phân Tích Thế Trận & Nước Đi</h2>
          <p>Đánh giá khách quan từng nước cờ, độ chính xác và phát hiện các điểm sai lầm</p>
        </div>
        <div className="analysis-header-actions">
          <button className="btn-secondary" onClick={onBackToPlay}>
            ← Quay lại phòng đấu
          </button>
        </div>
      </div>

      {/* Accuracy Summary Bar */}
      <div className="accuracy-summary-card">
        <div className="accuracy-side red">
          <span className="side-title">Đỏ (Tiên)</span>
          <span className="acc-val">{reviewReport.redAccuracy}%</span>
          <span className="acc-sub">
            {reviewReport.blunderCountRed} nước thua, {reviewReport.mistakeCountRed} sai lầm
          </span>
        </div>

        <div className="eval-bar-wrapper">
          <div className="eval-bar-header">
            <span>
              Lợi thế: {currentEvalScore > 0 ? `+${(currentEvalScore / 100).toFixed(1)}` : (currentEvalScore / 100).toFixed(1)} (
              {currentEvalScore > 50 ? 'Đỏ ưu thế' : currentEvalScore < -50 ? 'Đen ưu thế' : 'Cân bằng'}
              )
            </span>
          </div>
          <div className="eval-bar-track">
            <div className="eval-bar-fill red" style={{ width: `${redPercentage}%` }} />
            <div className="eval-bar-fill black" style={{ width: `${100 - redPercentage}%` }} />
          </div>
        </div>

        <div className="accuracy-side black">
          <span className="side-title">Đen (Hậu)</span>
          <span className="acc-val">{reviewReport.blackAccuracy}%</span>
          <span className="acc-sub">
            {reviewReport.blunderCountBlack} nước thua, {reviewReport.mistakeCountBlack} sai lầm
          </span>
        </div>
      </div>

      <div className="analysis-body">
        {/* Main Board view */}
        <div className="analysis-board-col">
          <XiangqiBoard
            board={boardAtCurrentIndex}
            pieceSet={pieceSet}
            lastMove={currentMoveIndex >= 0 ? activeMoves[currentMoveIndex] : undefined}
            arrows={arrows}
            interactive={false}
          />

          {/* Stepper Navigation */}
          <div className="timeline-stepper">
            <button
              className="btn-stepper"
              onClick={() => setCurrentMoveIndex(-1)}
              disabled={currentMoveIndex < 0}
              title="Về đầu ván"
            >
              ⏮
            </button>
            <button
              className="btn-stepper"
              onClick={() => setCurrentMoveIndex((i) => Math.max(-1, i - 1))}
              disabled={currentMoveIndex < 0}
              title="Lùi 1 nước"
            >
              ◀
            </button>
            <span className="stepper-label">
              Nước {currentMoveIndex + 1} / {activeMoves.length}
            </span>
            <button
              className="btn-stepper"
              onClick={() => setCurrentMoveIndex((i) => Math.min(activeMoves.length - 1, i + 1))}
              disabled={currentMoveIndex >= activeMoves.length - 1}
              title="Tiến 1 nước"
            >
              ▶
            </button>
            <button
              className="btn-stepper"
              onClick={() => setCurrentMoveIndex(activeMoves.length - 1)}
              disabled={currentMoveIndex >= activeMoves.length - 1}
              title="Về cuối ván"
            >
              ⏭
            </button>
          </div>
        </div>

        {/* Move Review Details Col */}
        <div className="analysis-info-col">
          {activeEvaluatedMove ? (
            <div className="move-eval-card">
              <div
                className="quality-pill"
                style={{
                  backgroundColor: `${qualityColor[activeEvaluatedMove.quality] || '#3498db'}22`,
                  color: qualityColor[activeEvaluatedMove.quality] || '#3498db',
                  borderColor: qualityColor[activeEvaluatedMove.quality] || '#3498db',
                }}
              >
                {qualityLabel[activeEvaluatedMove.quality] || 'Đánh giá'}
              </div>

              <h3 className="eval-move-title">
                Nước {activeEvaluatedMove.moveNumber}: {activeEvaluatedMove.notation} (
                {activeEvaluatedMove.side === 'red' ? 'Đỏ' : 'Đen'})
              </h3>

              <p className="eval-explanation">{activeEvaluatedMove.explanation}</p>

              {activeEvaluatedMove.bestMoveNotation &&
                activeEvaluatedMove.quality !== 'best' &&
                activeEvaluatedMove.quality !== 'brilliant' && (
                  <div className="best-suggestion-banner">
                    💡 <strong>Nước cờ tối ưu:</strong> {activeEvaluatedMove.bestMoveNotation} (
                    {activeEvaluatedMove.bestMoveSuggestion?.from} →{' '}
                    {activeEvaluatedMove.bestMoveSuggestion?.to})
                  </div>
                )}

              <div className="eval-metrics">
                <div className="metric-row">
                  <span>Điểm thế trận:</span>
                  <strong>{activeEvaluatedMove.evalScore} cp</strong>
                </div>
                <div className="metric-row">
                  <span>Tổn thất điểm (CP Loss):</span>
                  <strong style={{ color: activeEvaluatedMove.cpLoss <= 45 ? '#2ecc71' : '#e74c3c' }}>
                    {activeEvaluatedMove.cpLoss} cp
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="move-eval-card">
              <h3>Thế cờ khởi đầu</h3>
              <p>Chọn bất kỳ nước cờ nào trong danh sách bên dưới để xem đánh giá chi tiết.</p>
            </div>
          )}

          {/* Full moves table */}
          <div className="analysis-moves-table-container">
            <h4>Biên bản nước cờ đã phân tích ({reviewReport.evaluatedMoves.length} nước)</h4>
            <div className="analysis-moves-list">
              {reviewReport.evaluatedMoves.length === 0 ? (
                <p className="empty-history-text" style={{ padding: '12px' }}>
                  Chưa có nước đi nào để phân tích.
                </p>
              ) : (
                reviewReport.evaluatedMoves.map((evMove, idx) => (
                  <button
                    key={idx}
                    className={`eval-move-item ${currentMoveIndex === idx ? 'active' : ''} ${evMove.quality}`}
                    onClick={() => setCurrentMoveIndex(idx)}
                  >
                    <span className="item-num">{idx + 1}.</span>
                    <span className="item-not">{evMove.notation}</span>
                    <span
                      className="item-quality"
                      style={{ color: qualityColor[evMove.quality] }}
                    >
                      {qualityLabel[evMove.quality]}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Custom FEN Import tool */}
          <div className="fen-import-card">
            <h4>Nhập thế cờ FEN tùy ý</h4>
            <div className="fen-input-row">
              <input
                type="text"
                placeholder="Dán chuỗi FEN vào đây (ví dụ: 3k5/4a4/9/9/...)"
                value={customFenInput}
                onChange={(e) => setCustomFenInput(e.target.value)}
              />
              <button className="btn-secondary btn-sm" onClick={handleLoadCustomFen}>
                Tải FEN
              </button>
            </div>
            {customFenError && <p className="fen-error-text">{customFenError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
