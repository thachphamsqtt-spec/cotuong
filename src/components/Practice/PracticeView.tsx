import React, { useState, useEffect, useRef } from 'react';
import { PUZZLES, getDailyPuzzle } from '../../practice/puzzleData';
import {
  createPuzzleSession,
  applyPlayerPuzzleMove,
  applyMachinePuzzleReply,
  loadBestStreak,
  saveBestStreak,
  extractFullSolution,
  PuzzleSessionState,
  SolutionStepDetail,
} from '../../practice/puzzleManager';
import { Puzzle } from '../../practice/types';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { Square } from '../../core/types';
import { soundEffects } from '../../audio/soundFX';
import { generateLegalMoves } from '../../core/gameEngine';

interface PracticeViewProps {
  pieceSet: PieceSet;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ pieceSet }) => {
  const [mode, setMode] = useState<'puzzles' | 'streak' | 'daily'>('puzzles');
  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [session, setSession] = useState<PuzzleSessionState>(() =>
    createPuzzleSession(PUZZLES[0])
  );
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [isOpponentThinking, setIsOpponentThinking] = useState<boolean>(false);

  // Solution State
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [solutionStepIndex, setSolutionStepIndex] = useState<number>(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<any>(null);

  // Streak state
  const [streakScore, setStreakScore] = useState<number>(0);
  const [streakLives, setStreakLives] = useState<number>(3);
  const [bestStreak, setBestStreak] = useState<number>(loadBestStreak());

  // Cleanup autoplay on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let puz: Puzzle;
    if (mode === 'daily') {
      puz = getDailyPuzzle();
    } else {
      puz = PUZZLES[puzzleIndex % PUZZLES.length];
    }
    setSession(createPuzzleSession(puz));
    setSelectedSquare(null);
    setIsOpponentThinking(false);
    setShowSolution(false);
    setSolutionStepIndex(-1);
    setIsAutoPlaying(false);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
  }, [puzzleIndex, mode]);

  const fullSolution: SolutionStepDetail[] = extractFullSolution(session.puzzle);

  const handleSquareClick = (square: Square) => {
    if (session.status === 'completed' || isOpponentThinking || showSolution) return;

    if (selectedSquare) {
      // 1. Clicked same square -> Deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // 2. Clicked another piece of the same side -> Switch selection
      const clickedPiece = session.currentBoard.flat().find((p) => p && p.square === square);
      if (clickedPiece && clickedPiece.side === session.puzzle.side) {
        setSelectedSquare(square);
        return;
      }

      // 3. Clicked a legal move destination -> Execute move
      const currentLegalMoves = generateLegalMoves(session.currentBoard, session.puzzle.side).filter(
        (m) => m.from === selectedSquare
      );
      const isLegal = currentLegalMoves.some((m) => m.to === square);
      if (isLegal) {
        handleMove(selectedSquare, square);
        return;
      }

      // 4. Clicked somewhere else invalid -> Deselect
      setSelectedSquare(null);
      return;
    }

    // No piece currently selected -> Select if belongs to player
    const piece = session.currentBoard.flat().find((p) => p && p.square === square);
    if (piece && piece.side === session.puzzle.side) {
      setSelectedSquare(square);
    }
  };

  const handleMove = (from: Square, to: Square) => {
    if (isOpponentThinking || session.status === 'completed' || showSolution) return;

    // Validate move legality on current board
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
      soundEffects.playDefeat();
      if (mode === 'streak') {
        const nextLives = streakLives - 1;
        setStreakLives(nextLives);
      }
      return;
    }

    // Player made a correct puzzle move
    soundEffects.playMove();

    if (result.hasReply) {
      // Show opponent thinking, then execute opponent reply
      setIsOpponentThinking(true);
      setTimeout(() => {
        setSession((prevSession) => {
          const repliedSession = applyMachinePuzzleReply(prevSession);
          soundEffects.playCapture();
          return repliedSession;
        });
        setIsOpponentThinking(false);
      }, 500);
    } else {
      // Puzzle completed!
      soundEffects.playVictory();
      if (mode === 'streak') {
        const newScore = streakScore + 1;
        setStreakScore(newScore);
        if (newScore > bestStreak) {
          setBestStreak(newScore);
          saveBestStreak(newScore);
        }
      }
    }
  };

  const handleHint = () => {
    const nextLevel = Math.min(session.hintLevel + 1, 3) as 1 | 2 | 3;
    setSession((prev) => ({
      ...prev,
      hintLevel: nextLevel,
    }));
  };

  const handleReset = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setShowSolution(false);
    setSolutionStepIndex(-1);
    setSession(createPuzzleSession(session.puzzle));
    setSelectedSquare(null);
    setIsOpponentThinking(false);
  };

  const handleNextPuzzle = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setShowSolution(false);
    setSolutionStepIndex(-1);
    if (mode === 'streak' && streakLives <= 0) {
      // Reset streak
      setStreakScore(0);
      setStreakLives(3);
    }
    setPuzzleIndex((prev) => (prev + 1) % PUZZLES.length);
  };

  const toggleSolution = () => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    if (!showSolution) {
      setShowSolution(true);
      setSolutionStepIndex(0);
    } else {
      setShowSolution(false);
      setSolutionStepIndex(-1);
    }
    setSelectedSquare(null);
  };

  const handlePreviewStep = (stepIdx: number) => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsAutoPlaying(false);
    setShowSolution(true);
    setSolutionStepIndex(stepIdx);
  };

  const handleAutoPlaySolution = () => {
    if (isAutoPlaying) {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setIsAutoPlaying(false);
      return;
    }

    setShowSolution(true);
    setIsAutoPlaying(true);
    let cur = 0;
    setSolutionStepIndex(0);

    const runStep = (idx: number) => {
      if (idx >= fullSolution.length) {
        setIsAutoPlaying(false);
        return;
      }
      setSolutionStepIndex(idx);
      soundEffects.playMove();

      autoPlayTimerRef.current = setTimeout(() => {
        runStep(idx + 1);
      }, 1500);
    };

    autoPlayTimerRef.current = setTimeout(() => {
      runStep(1);
    }, 1500);
  };

  // Determine which board to display (Solution Demonstration vs Active Play Session)
  let displayedBoard = session.currentBoard;
  let displayedArrows: [string, string][] = [];
  let displayedHighlights: string[] = [];

  if (showSolution && solutionStepIndex >= 0 && fullSolution[solutionStepIndex]) {
    const step = fullSolution[solutionStepIndex];
    // Show board after the step's resolution (or after reply if exists)
    displayedBoard = step.boardAfterReply || step.boardAfterPlayer;
    displayedHighlights = [step.playerMove.from, step.playerMove.to];
    displayedArrows = [[step.playerMove.from, step.playerMove.to]];
    if (step.replyMove) {
      displayedArrows.push([step.replyMove.from, step.replyMove.to]);
    }
  } else {
    // Normal puzzle hint highlights
    if (session.hintLevel >= 1) {
      displayedHighlights.push(session.currentStep.move.from);
    }
    if (session.hintLevel >= 2) {
      displayedHighlights.push(session.currentStep.move.to);
    }
    if (session.hintLevel >= 3) {
      displayedArrows.push([session.currentStep.move.from, session.currentStep.move.to]);
    }
  }

  const legalMoves = (!showSolution && selectedSquare)
    ? generateLegalMoves(session.currentBoard, session.puzzle.side).filter(
        (m) => m.from === selectedSquare
      )
    : [];

  return (
    <div className="practice-container">
      {/* Mode Selector Topbar */}
      <div className="practice-tabs">
        <button
          className={`tab-btn ${mode === 'puzzles' ? 'active' : ''}`}
          onClick={() => setMode('puzzles')}
        >
          🧩 Kho Thế Cờ
        </button>
        <button
          className={`tab-btn ${mode === 'streak' ? 'active' : ''}`}
          onClick={() => setMode('streak')}
        >
          🔥 Chuỗi Thử Thách
        </button>
        <button
          className={`tab-btn ${mode === 'daily' ? 'active' : ''}`}
          onClick={() => setMode('daily')}
        >
          ⭐ Thế Cờ Trong Ngày
        </button>
      </div>

      <div className="practice-body">
        {/* Board column */}
        <div className="practice-board-col">
          <XiangqiBoard
            board={displayedBoard}
            turn={showSolution ? undefined : session.puzzle.side}
            selectedSquare={showSolution ? null : selectedSquare}
            legalMoves={legalMoves}
            pieceSet={pieceSet}
            highlights={displayedHighlights}
            arrows={displayedArrows}
            interactive={!showSolution && !isOpponentThinking}
            onSquareClick={handleSquareClick}
            onMove={handleMove}
          />
        </div>

        {/* Puzzle info column */}
        <div className="practice-info-col">
          <div className="puzzle-panel-card">
            {/* Header / Badges */}
            <div className="puzzle-header-tags">
              <span className="badge theme-badge">
                {session.puzzle.theme === 'mate_in_1' && 'Chiếu bí 1 nước'}
                {session.puzzle.theme === 'mate_in_2' && 'Chiếu bí 2 nước'}
                {session.puzzle.theme === 'mate_in_3' && 'Chiếu bí 3 nước'}
                {session.puzzle.theme === 'double_attack' && 'Bắt đôi'}
                {session.puzzle.theme === 'endgame' && 'Tàn cuộc'}
                {session.puzzle.theme === 'tactics' && 'Chiến thuật'}
              </span>
              <span className="badge diff-badge">
                Độ khó: {'★'.repeat(session.puzzle.difficulty)}
                {'☆'.repeat(5 - session.puzzle.difficulty)}
              </span>
              {showSolution && <span className="badge solution-badge">📖 Đang xem đáp án</span>}
            </div>

            {/* Streak Status if active */}
            {mode === 'streak' && (
              <div className="streak-stats-banner">
                <div className="stat-pill">
                  <span className="pill-label">Điểm hiện tại:</span>
                  <span className="pill-value">{streakScore} 🔥</span>
                </div>
                <div className="stat-pill">
                  <span className="pill-label">Kỷ lục:</span>
                  <span className="pill-value">{bestStreak} 🏆</span>
                </div>
                <div className="stat-pill">
                  <span className="pill-label">Mạng còn lại:</span>
                  <span className="pill-value">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className={i < streakLives ? 'heart active' : 'heart lost'}>
                        ❤️
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            )}

            <h2 className="puzzle-title">{session.puzzle.title}</h2>
            <div className="puzzle-goal-box">🎯 {session.puzzle.goal}</div>

            {/* Feedback alert during normal play */}
            {!showSolution && session.feedbackMessage && (
              <div
                className={`feedback-alert ${
                  session.status === 'completed'
                    ? 'success'
                    : session.status === 'wrong'
                    ? 'error'
                    : 'info'
                }`}
              >
                {session.status === 'completed' ? '🎉 ' : session.status === 'wrong' ? '❌ ' : '💡 '}
                {session.feedbackMessage}
              </div>
            )}

            {/* Hint Box (3 Tiers) during normal play */}
            {!showSolution && session.hintLevel > 0 && (
              <div className="hint-display-box">
                <div className="hint-tier-header">
                  <strong>Gợi ý tầng {session.hintLevel}/3:</strong>
                </div>
                <p className="hint-tier-text">
                  {session.hintLevel === 1 && `Quân cần đi: ${session.puzzle.hints[0]}`}
                  {session.hintLevel === 2 && `Ô đích đến: ${session.puzzle.hints[1]}`}
                  {session.hintLevel === 3 && `Lời giải: ${session.puzzle.hints[2]}`}
                </p>
              </div>
            )}

            {/* SOLUTION PANEL (ĐÁP ÁN CHI TIẾT) */}
            {showSolution && (
              <div className="solution-panel-box">
                <div className="solution-header">
                  <span className="solution-title">📋 Lời Giải & Đáp Án Chi Tiết</span>
                  <button
                    className={`btn-solution-autoplay ${isAutoPlaying ? 'playing' : ''}`}
                    onClick={handleAutoPlaySolution}
                    title="Tự động thị phạm toàn bộ nước đi đáp án"
                  >
                    {isAutoPlaying ? '⏸ Tạm dừng' : '▶ Thị phạm'}
                  </button>
                </div>

                <div className="solution-steps-list">
                  {fullSolution.map((step, idx) => {
                    const isSelected = solutionStepIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`solution-step-item ${isSelected ? 'active-step' : ''}`}
                        onClick={() => handlePreviewStep(idx)}
                      >
                        <div className="solution-step-header">
                          <span className="step-num-badge">Nước {step.stepNumber}</span>
                          <div className="step-moves-flow">
                            <span className="player-not-tag">
                              🔴 {step.playerMove.notation} ({step.playerMove.from} → {step.playerMove.to})
                            </span>
                            {step.replyMove && (
                              <span className="reply-not-tag">
                                ⚫ {step.replyMove.notation} ({step.replyMove.from} → {step.replyMove.to})
                              </span>
                            )}
                          </div>
                        </div>

                        {step.commentary && (
                          <p className="step-commentary">💬 {step.commentary}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="solution-bottom-bar">
                  <button className="btn-secondary btn-sm" onClick={handleReset}>
                    🔄 Tự luyện tập lại thế này
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="puzzle-actions">
              <button
                className="btn-secondary"
                onClick={handleHint}
                disabled={showSolution || session.hintLevel >= 3 || session.status === 'completed'}
                title="Xem gợi ý từng tầng"
              >
                💡 Gợi ý ({session.hintLevel}/3)
              </button>
              <button
                className={`btn-secondary ${showSolution ? 'btn-active-highlight' : ''}`}
                onClick={toggleSolution}
                title="Xem toàn bộ đáp án và phân tích chi tiết"
              >
                {showSolution ? '🙈 Ẩn đáp án' : '📖 Đáp án'}
              </button>
              <button className="btn-secondary" onClick={handleReset} title="Làm lại từ đầu">
                🔄 Thử lại
              </button>
              <button className="btn-primary" onClick={handleNextPuzzle} title="Chuyển thế cờ tiếp theo">
                Thế tiếp theo →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
