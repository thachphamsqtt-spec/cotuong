import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Puzzle } from '../../practice/types';
import {
  RushMode,
  RushStatus,
  RushResult,
  RushPuzzleRecord,
  RushHighScores,
} from '../../practice/puzzleRushTypes';
import {
  getRushDurationSecs,
  loadRushHighScores,
  generateRushQueue,
  buildRushSummary,
} from '../../practice/puzzleRushManager';
import {
  createPuzzleSession,
  applyPlayerPuzzleMove,
  applyMachinePuzzleReply,
  extractFullSolution,
  PuzzleSessionState,
  SolutionStepDetail,
} from '../../practice/puzzleManager';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { Square } from '../../core/types';
import { soundEffects } from '../../audio/soundFX';
import { generateLegalMoves } from '../../core/gameEngine';

interface PuzzleRushViewProps {
  pieceSet: PieceSet;
  onBackToNormalPractice: () => void;
}

export const PuzzleRushView: React.FC<PuzzleRushViewProps> = ({
  pieceSet,
  onBackToNormalPractice,
}) => {
  const [selectedMode, setSelectedMode] = useState<RushMode>('3m');
  const [status, setStatus] = useState<RushStatus>('lobby');
  const [highScores, setHighScores] = useState<RushHighScores>(() => loadRushHighScores());

  // Countdown state before start (3 -> 2 -> 1)
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // In-game state
  const [rushQueue, setRushQueue] = useState<Puzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [session, setSession] = useState<PuzzleSessionState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);

  // Stats in current run
  const [timeRemaining, setTimeRemaining] = useState<number>(180);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [strikes, setStrikes] = useState<number>(0); // Max 3 strikes
  const [records, setRecords] = useState<RushPuzzleRecord[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [puzzleStartTime, setPuzzleStartTime] = useState<number>(0);

  // Visual effects
  const [floatScore, setFloatScore] = useState<string | null>(null);
  const [boardFlash, setBoardFlash] = useState<'correct' | 'wrong' | null>(null);

  // Result summary state
  const [rushResult, setRushResult] = useState<RushResult | null>(null);
  const [reviewPuzzle, setReviewPuzzle] = useState<Puzzle | null>(null);
  const [reviewSolutionIndex, setReviewSolutionIndex] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const isGameOverTriggered = useRef<boolean>(false);

  // Refresh high scores from localStorage
  const refreshScores = useCallback(() => {
    setHighScores(loadRushHighScores());
  }, []);

  // Handle Game Over
  const triggerGameOver = useCallback(() => {
    if (isGameOverTriggered.current) return;
    isGameOverTriggered.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    soundEffects.playDefeat();

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const summary = buildRushSummary(selectedMode, records, elapsed);
    setRushResult(summary);
    setStatus('gameover');
    refreshScores();
  }, [selectedMode, records, startTime, refreshScores]);

  // Main countdown timer tick during rush
  useEffect(() => {
    if (status !== 'playing') return;

    if (selectedMode === 'survival') {
      // Survival mode counts up elapsed seconds
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => prev + 1);
      }, 1000);
    } else {
      // Time attack modes count down
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            triggerGameOver();
            return 0;
          }
          if (prev === 10 || prev === 5 || prev === 3) {
            soundEffects.playCheck();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, selectedMode, triggerGameOver]);

  // Handle 3-2-1 Countdown before launching game
  useEffect(() => {
    if (status !== 'countdown') return;

    soundEffects.playMove();
    if (countdownNum > 1) {
      const timer = setTimeout(() => {
        setCountdownNum((prev) => prev - 1);
      }, 900);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        soundEffects.playVictory();
        setStatus('playing');
        setStartTime(Date.now());
        setPuzzleStartTime(Date.now());
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [status, countdownNum]);

  // Start new Rush run
  const handleStartRush = () => {
    const queue = generateRushQueue();
    const duration = getRushDurationSecs(selectedMode);

    setRushQueue(queue);
    setCurrentIndex(0);
    setSession(createPuzzleSession(queue[0]));
    setSelectedSquare(null);
    setIsOpponentThinking(false);
    setTimeRemaining(duration);
    setScore(0);
    setCombo(0);
    setStrikes(0);
    setRecords([]);
    setFloatScore(null);
    setBoardFlash(null);
    setRushResult(null);
    setReviewPuzzle(null);
    isGameOverTriggered.current = false;
    setCountdownNum(3);
    setStatus('countdown');
  };

  // Move to next puzzle in queue
  const nextPuzzle = (wasSuccess: boolean) => {
    const puzzle = rushQueue[currentIndex];
    const timeSpent = Math.round((Date.now() - puzzleStartTime) / 1000);

    const newRecord: RushPuzzleRecord = {
      puzzle,
      success: wasSuccess,
      timeSpentSecs: Math.max(timeSpent, 1),
    };

    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);

    // Check if max strikes reached (3 strikes)
    const newStrikes = wasSuccess ? strikes : strikes + 1;
    if (newStrikes >= 3) {
      if (timerRef.current) clearInterval(timerRef.current);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const summary = buildRushSummary(selectedMode, updatedRecords, elapsed);
      setRushResult(summary);
      setStatus('gameover');
      refreshScores();
      return;
    }

    // Advance to next puzzle
    const nextIdx = currentIndex + 1;
    if (nextIdx >= rushQueue.length) {
      // Completed all puzzles
      triggerGameOver();
      return;
    }

    setCurrentIndex(nextIdx);
    setSession(createPuzzleSession(rushQueue[nextIdx]));
    setSelectedSquare(null);
    setIsOpponentThinking(false);
    setPuzzleStartTime(Date.now());
  };

  // Handle Square Click
  const handleSquareClick = (square: Square) => {
    if (!session || session.status === 'completed' || isOpponentThinking || status !== 'playing') return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const clickedPiece = session.currentBoard.flat().find((p) => p && p.square === square);
      if (clickedPiece && clickedPiece.side === session.puzzle.side) {
        setSelectedSquare(square);
        return;
      }

      const currentLegalMoves = generateLegalMoves(session.currentBoard, session.puzzle.side).filter(
        (m) => m.from === selectedSquare
      );
      const isLegal = currentLegalMoves.some((m) => m.to === square);
      if (isLegal) {
        handleMove(selectedSquare, square);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    const piece = session.currentBoard.flat().find((p) => p && p.square === square);
    if (piece && piece.side === session.puzzle.side) {
      setSelectedSquare(square);
    }
  };

  // Handle Move execution
  const handleMove = (from: Square, to: Square) => {
    if (!session || isOpponentThinking || session.status === 'completed' || status !== 'playing') return;

    const isLegalOnBoard = generateLegalMoves(session.currentBoard, session.puzzle.side).some(
      (m) => m.from === from && m.to === to
    );
    if (!isLegalOnBoard) {
      setSelectedSquare(null);
      return;
    }

    const result = applyPlayerPuzzleMove(session, from, to);
    setSession(result.session);
    setSelectedSquare(null);

    if (!result.success) {
      // WRONG MOVE: Add strike and trigger rapid skip
      soundEffects.playDefeat();
      setStrikes((prev) => prev + 1);
      setCombo(0);
      setBoardFlash('wrong');

      setTimeout(() => {
        setBoardFlash(null);
        nextPuzzle(false);
      }, 500);
      return;
    }

    // CORRECT MOVE
    soundEffects.playMove();

    if (result.hasReply) {
      // Opponent auto reply in multi-step puzzle
      setIsOpponentThinking(true);
      setTimeout(() => {
        setSession((prevSession) => {
          if (!prevSession) return null;
          const repliedSession = applyMachinePuzzleReply(prevSession);
          soundEffects.playCapture();
          return repliedSession;
        });
        setIsOpponentThinking(false);
      }, 350);
    } else {
      // PUZZLE SOLVED!
      soundEffects.playVictory();
      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setBoardFlash('correct');
      setFloatScore(`+1 ${newCombo >= 3 ? `🔥x${newCombo}` : ''}`);

      setTimeout(() => {
        setFloatScore(null);
        setBoardFlash(null);
        nextPuzzle(true);
      }, 300);
    }
  };

  // Skip current puzzle
  const handleSkipPuzzle = () => {
    if (status !== 'playing') return;
    soundEffects.playDefeat();
    setStrikes((prev) => prev + 1);
    setCombo(0);
    nextPuzzle(false);
  };

  // Format MM:SS for countdown display
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate active legal moves
  const legalMoves =
    session && selectedSquare
      ? generateLegalMoves(session.currentBoard, session.puzzle.side).filter(
          (m) => m.from === selectedSquare
        )
      : [];

  return (
    <div className="puzzle-rush-container">
      {/* ========================================================================= */}
      {/* 1. LOBBY SCREEN */}
      {/* ========================================================================= */}
      {status === 'lobby' && (
        <div className="rush-lobby-card">
          <div className="rush-hero-header">
            <div className="rush-icon-badge">⚡</div>
            <h2 className="rush-main-title">Đố Vui Tốc Độ (Puzzle Rush)</h2>
            <p className="rush-tagline">
              Thử thách phản xạ và giải nhanh liên hoàn các thế sát chiêu Cờ Tướng trong thời gian giới hạn!
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="rush-modes-grid">
            <button
              className={`rush-mode-card ${selectedMode === '3m' ? 'active' : ''}`}
              onClick={() => setSelectedMode('3m')}
            >
              <div className="mode-badge">⏱️ 3 Phút</div>
              <h3 className="mode-name">Sát Chiêu 3 Phút</h3>
              <p className="mode-desc">Chế độ tiêu chuẩn và kịch tính nhất. Giải nhiều thế nhất có thể!</p>
              <div className="mode-best-pill">
                Kỷ lục: <strong>{highScores['3m']} câu 🏆</strong>
              </div>
            </button>

            <button
              className={`rush-mode-card ${selectedMode === '5m' ? 'active' : ''}`}
              onClick={() => setSelectedMode('5m')}
            >
              <div className="mode-badge">🔥 5 Phút</div>
              <h3 className="mode-name">Thử Thách 5 Phút</h3>
              <p className="mode-desc">Thời gian thoải mái hơn để tính toán những đòn phối hợp hiểm hóc.</p>
              <div className="mode-best-pill">
                Kỷ lục: <strong>{highScores['5m']} câu 🏆</strong>
              </div>
            </button>

            <button
              className={`rush-mode-card ${selectedMode === '1m' ? 'active' : ''}`}
              onClick={() => setSelectedMode('1m')}
            >
              <div className="mode-badge">⚡ 1 Phút</div>
              <h3 className="mode-name">Tia Chớp 60 Giây</h3>
              <p className="mode-desc">Tốc độ tối đa! Kiểm tra phản xạ nhạy bén tức thì của kỳ thủ.</p>
              <div className="mode-best-pill">
                Kỷ lục: <strong>{highScores['1m']} câu 🏆</strong>
              </div>
            </button>

            <button
              className={`rush-mode-card ${selectedMode === 'survival' ? 'active' : ''}`}
              onClick={() => setSelectedMode('survival')}
            >
              <div className="mode-badge">🛡️ Sinh Tồn</div>
              <h3 className="mode-name">Đấu Sinh Tồn (3 Mạng)</h3>
              <p className="mode-desc">Không giới hạn thời gian. Sai 3 lần sẽ kết thúc lượt chơi!</p>
              <div className="mode-best-pill">
                Kỷ lục: <strong>{highScores.survival} câu 🏆</strong>
              </div>
            </button>
          </div>

          {/* Lobby Actions */}
          <div className="rush-lobby-actions">
            <button className="btn-secondary" onClick={onBackToNormalPractice}>
              ← Trở Về Kho Thế Cờ
            </button>
            <button className="btn-primary btn-rush-start" onClick={handleStartRush}>
              🚀 Bắt Đầu Đua Tốc Độ Ngay
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COUNTDOWN OVERLAY (3 - 2 - 1) */}
      {/* ========================================================================= */}
      {status === 'countdown' && (
        <div className="rush-countdown-screen">
          <div className="countdown-pulse-box">
            <span className="countdown-num-text">{countdownNum}</span>
            <span className="countdown-sub-text">SẴN SÀNG!</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ACTIVE PLAYING VIEW */}
      {/* ========================================================================= */}
      {status === 'playing' && session && (
        <div className="rush-play-container">
          {/* Top Status Dashboard */}
          <div className="rush-top-bar">
            {/* Timer */}
            <div className={`rush-timer-pill ${timeRemaining <= 15 && selectedMode !== 'survival' ? 'hurry-pulse' : ''}`}>
              <span className="rush-timer-icon">⏱️</span>
              <span className="rush-timer-text">
                {selectedMode === 'survival' ? formatTime(timeRemaining) : formatTime(timeRemaining)}
              </span>
            </div>

            {/* Score & Combo */}
            <div className="rush-score-pill">
              <span className="rush-score-label">Điểm:</span>
              <span className="rush-score-val">{score}</span>
              {combo >= 2 && <span className="rush-combo-tag">🔥x{combo}</span>}
            </div>

            {/* Strikes (3 Strikes X) */}
            <div className="rush-strikes-pill">
              <span className={`strike-x ${strikes >= 1 ? 'active' : ''}`}>✕</span>
              <span className={`strike-x ${strikes >= 2 ? 'active' : ''}`}>✕</span>
              <span className={`strike-x ${strikes >= 3 ? 'active' : ''}`}>✕</span>
            </div>

            {/* Actions */}
            <div className="rush-top-actions">
              <button className="btn-tiny-action" onClick={handleSkipPuzzle} title="Bỏ qua câu này (+1 Lỗi)">
                ⏭️ Bỏ qua
              </button>
              <button className="btn-tiny-action btn-danger-action" onClick={triggerGameOver} title="Dừng lượt chơi">
                ✕ Dừng
              </button>
            </div>
          </div>

          {/* Main Board Area */}
          <div className="rush-board-wrapper">
            <div className={`rush-board-frame ${boardFlash ? `flash-${boardFlash}` : ''}`}>
              <XiangqiBoard
                board={session.currentBoard}
                turn={session.puzzle.side}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                pieceSet={pieceSet}
                interactive={!isOpponentThinking}
                onSquareClick={handleSquareClick}
                onMove={handleMove}
              />

              {floatScore && <div className="rush-float-score">{floatScore}</div>}
            </div>

            {/* Target Goal Reminder */}
            <div className="rush-goal-bar">
              <span className="rush-puzzle-idx">Câu #{currentIndex + 1}</span>
              <span className="rush-goal-text">🎯 {session.puzzle.goal}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GAME OVER SUMMARY MODAL & REVIEW */}
      {/* ========================================================================= */}
      {status === 'gameover' && rushResult && (
        <div className="modal-overlay">
          <div className="two-player-modal rush-summary-modal">
            {/* Header / Big Score */}
            <div className="rush-summary-header">
              <div className="rush-trophy-icon">{rushResult.tierBadge}</div>
              {rushResult.isNewBest && <div className="new-record-badge">🎉 KỶ LỤC MỚI!</div>}
              <h2 className="rush-final-score">
                {rushResult.score} <span className="score-unit">CÂU</span>
              </h2>
              <h3 className="rush-tier-title">{rushResult.tierTitle}</h3>
            </div>

            {/* Metrics Breakdown */}
            <div className="rush-stats-grid">
              <div className="stat-card">
                <span className="stat-card-label">Kỷ lục của bạn</span>
                <strong className="stat-card-val">{rushResult.bestScore} 🏆</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Số câu đúng</span>
                <strong className="stat-card-val text-success">{rushResult.correctCount} ✅</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Số câu sai</span>
                <strong className="stat-card-val text-danger">{rushResult.wrongCount} ❌</strong>
              </div>
              <div className="stat-card">
                <span className="stat-card-label">Thời gian đấu</span>
                <strong className="stat-card-val">{formatTime(rushResult.timeTakenSecs)} ⏱️</strong>
              </div>
            </div>

            {/* Solved / Failed Questions Review List */}
            <div className="rush-review-section">
              <h4 className="rush-review-heading">📜 Danh Sách Thế Cờ Trong Lượt ({rushResult.records.length} câu)</h4>
              <p className="rush-review-sub">Nhấn vào từng câu để xem lại đáp án và phân tích:</p>

              <div className="rush-review-list">
                {rushResult.records.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`rush-review-item ${rec.success ? 'item-pass' : 'item-fail'} ${
                      reviewPuzzle?.id === rec.puzzle.id ? 'active-review' : ''
                    }`}
                    onClick={() => {
                      setReviewPuzzle(rec.puzzle);
                      setReviewSolutionIndex(0);
                    }}
                  >
                    <span className="review-idx">#{idx + 1}</span>
                    <span className="review-title">{rec.puzzle.title}</span>
                    <span className="review-time">{rec.timeSpentSecs}s</span>
                    <span className="review-status">{rec.success ? '✅ Đúng' : '❌ Sai'}</span>
                  </div>
                ))}
              </div>

              {/* Interactive Mini Solution Review for Clicked Puzzle */}
              {reviewPuzzle && (
                <div className="rush-puzzle-preview-card">
                  <div className="preview-header">
                    <h4>🔍 Đáp án: {reviewPuzzle.title}</h4>
                    <button className="btn-tiny-action" onClick={() => setReviewPuzzle(null)}>
                      ✕ Đóng
                    </button>
                  </div>
                  <div className="preview-body">
                    {(() => {
                      const sol: SolutionStepDetail[] = extractFullSolution(reviewPuzzle);
                      const currentStep = sol[reviewSolutionIndex] || sol[0];
                      const boardToRender = currentStep?.boardAfterReply || currentStep?.boardAfterPlayer || session?.currentBoard;

                      return (
                        <div className="preview-board-wrap">
                          <XiangqiBoard
                            board={boardToRender!}
                            turn={undefined}
                            selectedSquare={null}
                            legalMoves={[]}
                            pieceSet={pieceSet}
                            highlights={[currentStep.playerMove.from, currentStep.playerMove.to]}
                            arrows={[[currentStep.playerMove.from, currentStep.playerMove.to]]}
                            interactive={false}
                          />
                          <div className="preview-steps-flow">
                            {sol.map((s, sIdx) => (
                              <button
                                key={sIdx}
                                className={`step-flow-pill ${reviewSolutionIndex === sIdx ? 'active' : ''}`}
                                onClick={() => setReviewSolutionIndex(sIdx)}
                              >
                                Nước {s.stepNumber}: 🔴 {s.playerMove.notation}
                                {s.replyMove && ` → ⚫ ${s.replyMove.notation}`}
                              </button>
                            ))}
                            {currentStep.commentary && (
                              <p className="preview-commentary">💬 {currentStep.commentary}</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="modal-actions-row mt-3">
              <button className="btn-secondary" onClick={() => setStatus('lobby')}>
                📋 Chọn Chế Độ Khác
              </button>
              <button className="btn-primary" onClick={handleStartRush}>
                ⚡ Chơi Lại Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
