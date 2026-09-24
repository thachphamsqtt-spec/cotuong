import React, { useState, useEffect } from 'react';
import { CURRICULUM } from '../../learn/curriculumData';
import { Lesson, LessonStep, TryStep, QuizStep } from '../../learn/types';
import { loadUserProgress, markLessonCompleted, UserProgress } from '../../learn/progressStore';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { Board, Move, Square } from '../../core/types';
import { parseFEN } from '../../core/fen';
import { generateLegalMoves, applyMove } from '../../core/gameEngine';
import { soundEffects } from '../../audio/soundFX';
import { parseSquare } from '../../core/board';

interface LearnViewProps {
  pieceSet: PieceSet;
}

export const LearnView: React.FC<LearnViewProps> = ({ pieceSet }) => {
  const [progress, setProgress] = useState<UserProgress>(loadUserProgress());
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(CURRICULUM[0]);
  const [selectedLevelTab, setSelectedLevelTab] = useState<number>(1);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [currentBoard, setCurrentBoard] = useState<Board>(parseFEN().board);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [hintIndex, setHintIndex] = useState<number>(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [exploreMode, setExploreMode] = useState<boolean>(false);

  const currentStep: LessonStep = selectedLesson.steps[stepIndex];

  // Reset step state when switching step or lesson
  useEffect(() => {
    setFeedback(null);
    setHintIndex(0);
    setQuizAnswer(null);
    setSelectedSquare(null);
    setShowSolution(false);

    if (currentStep.type === 'explain' || currentStep.type === 'try' || currentStep.type === 'demo') {
      try {
        const parsed = parseFEN(currentStep.fen);
        setCurrentBoard(parsed.board);
      } catch {
        setCurrentBoard(parseFEN().board);
      }
    }
  }, [selectedLesson.id, stepIndex]);

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedLevelTab(lesson.level);
    setStepIndex(0);
  };

  const handleResetStep = () => {
    if (currentStep.type === 'try' || currentStep.type === 'explain') {
      const parsed = parseFEN(currentStep.fen);
      setCurrentBoard(parsed.board);
      setSelectedSquare(null);
      setFeedback(null);
      setShowSolution(false);
    }
  };

  const handleShowSolution = () => {
    if (currentStep.type === 'try') {
      const tryStep = currentStep as TryStep;
      if (tryStep.expectedMoves.length > 0) {
        const sol = tryStep.expectedMoves[0];
        setShowSolution(true);
        setFeedback({
          type: 'info',
          message: `Nước đi mẫu: ${sol.from} → ${sol.to}`,
        });
      }
    }
  };

  const handleSquareClick = (square: Square) => {
    if (exploreMode) {
      const piece = currentBoard.flat().find((p) => p && p.square === square);
      if (piece) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
      return;
    }

    if (currentStep.type !== 'try') return;

    const { row, col } = parseSquare(square);
    const piece = currentBoard[row][col];

    if (selectedSquare) {
      handleMove(selectedSquare, square);
      return;
    }

    if (piece && piece.side === 'red') {
      setSelectedSquare(square);
    }
  };

  const handleMove = (from: Square, to: Square) => {
    if (currentStep.type !== 'try') return;
    const tryStep = currentStep as TryStep;

    const piece = currentBoard.flat().find((p) => p && p.square === from);
    if (!piece) return;

    // Check if move matches expected moves
    const isExpected = tryStep.expectedMoves.some((m) => m.from === from && m.to === to);

    if (isExpected) {
      const nextBoard = applyMove(currentBoard, {
        from,
        to,
        piece: piece.type,
        side: piece.side,
      });
      setCurrentBoard(nextBoard);
      setSelectedSquare(null);
      soundEffects.playVictory();
      setFeedback({
        type: 'success',
        message: 'Chính xác! Bạn đã hoàn thành tốt bài thực hành này.',
      });

      // Mark lesson completed if it's the last step
      if (stepIndex === selectedLesson.steps.length - 1) {
        const updated = markLessonCompleted(selectedLesson.id, selectedLesson.level);
        setProgress(updated);
      }
    } else {
      soundEffects.playDefeat();
      const moveKey = `${from}${to}`;
      const wrongMsg = tryStep.wrongMoves?.[moveKey] || 'Nước đi chưa đúng mục tiêu của bài học. Hãy thử lại!';
      setFeedback({
        type: 'error',
        message: wrongMsg,
      });
      setSelectedSquare(null);
    }
  };

  const handleQuizChoice = (idx: number, q: QuizStep['questions'][0]) => {
    setQuizAnswer(idx);
    if (idx === q.correctIndex) {
      soundEffects.playVictory();
      setFeedback({
        type: 'success',
        message: `Chính xác! ${q.explanation}`,
      });
      if (stepIndex === selectedLesson.steps.length - 1) {
        const updated = markLessonCompleted(selectedLesson.id, selectedLesson.level);
        setProgress(updated);
      }
    } else {
      soundEffects.playDefeat();
      setFeedback({
        type: 'error',
        message: `Chưa đúng. ${q.explanation}`,
      });
    }
  };

  const handleNextStep = () => {
    if (stepIndex < selectedLesson.steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      // Move to next lesson if available
      const currentIdx = CURRICULUM.findIndex((l) => l.id === selectedLesson.id);
      if (currentIdx < CURRICULUM.length - 1) {
        setSelectedLesson(CURRICULUM[currentIdx + 1]);
        setSelectedLevelTab(CURRICULUM[currentIdx + 1].level);
        setStepIndex(0);
      }
    }
  };

  const legalMoves = selectedSquare
    ? generateLegalMoves(currentBoard, 'red').filter((m) => m.from === selectedSquare)
    : [];

  const completedCount = progress.completedLessons.length;
  const totalCount = CURRICULUM.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Compute solution arrows if requested
  const displayArrows: [string, string][] = [...((currentStep as any).arrows || [])];
  if (showSolution && currentStep.type === 'try') {
    const tryStep = currentStep as TryStep;
    if (tryStep.expectedMoves.length > 0) {
      displayArrows.push([tryStep.expectedMoves[0].from, tryStep.expectedMoves[0].to]);
    }
  }

  return (
    <div className="learn-container">
      {/* Sidebar: Curriculum List */}
      <aside className="curriculum-sidebar">
        <div className="sidebar-header">
          <h3>Giáo Trình Cờ Tướng</h3>
          <p className="sidebar-subtitle">Học có hệ thống từ nhập môn đến căn bản</p>

          {/* Overall Course Progress */}
          <div className="overall-progress-box">
            <div className="progress-info-row">
              <span>Tiến độ toàn khóa</span>
              <strong>{completedCount}/{totalCount} ({progressPercent}%)</strong>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Level Tabs */}
        <div className="level-tabs-header">
          {Array.from(new Set(CURRICULUM.map((l) => l.level)))
            .sort((a, b) => a - b)
            .map((lvl) => {
              const levelShortNames: Record<number, string> = {
                1: 'Nhập môn',
                2: 'Khai cuộc',
                3: 'Sát pháp',
                4: 'Tàn cuộc',
              };
              return (
                <button
                  key={`tab-${lvl}`}
                  className={`level-tab-btn ${selectedLevelTab === lvl ? 'active' : ''}`}
                  onClick={() => setSelectedLevelTab(lvl)}
                  title={levelShortNames[lvl] || `Cấp ${lvl}`}
                >
                  {levelShortNames[lvl] ? `C.${lvl}: ${levelShortNames[lvl]}` : `Cấp ${lvl}`}
                </button>
              );
            })}
        </div>

        <div className="lesson-levels-list">
          {CURRICULUM.filter((l) => l.level === selectedLevelTab).map((lesson) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            const isSelected = selectedLesson.id === lesson.id;

            return (
              <button
                key={lesson.id}
                className={`lesson-item-btn ${isSelected ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => handleLessonSelect(lesson)}
                title={`Học bài: ${lesson.title}`}
              >
                <span className="lesson-badge">{isDone ? '✓' : '•'}</span>
                <div className="lesson-info">
                  <span className="lesson-title">{lesson.title}</span>
                  <span className="lesson-sub">{lesson.summary}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explore Mode Switch */}
        <div className="explore-card">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={exploreMode}
              onChange={(e) => setExploreMode(e.target.checked)}
            />
            <span>Chế độ Khám phá (Bấm quân xem đường đi)</span>
          </label>
        </div>
      </aside>

      {/* Main Lesson Content */}
      <main className="lesson-stage">
        <div className="stage-board-col">
          <XiangqiBoard
            board={currentBoard}
            turn="red"
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            pieceSet={pieceSet}
            arrows={displayArrows}
            highlights={(currentStep as any).highlights || []}
            onSquareClick={handleSquareClick}
            onMove={handleMove}
          />
        </div>

        <div className="stage-info-col">
          <div className="lesson-card">
            <div className="lesson-header-top">
              <span className="lesson-level-tag">{selectedLesson.levelTitle}</span>
              <span className="step-counter">
                Bước {stepIndex + 1} / {selectedLesson.steps.length}
              </span>
            </div>

            <h2 className="step-title">{currentStep.title}</h2>

            {/* Step text */}
            {(currentStep.type === 'explain' || currentStep.type === 'try') && (
              <p className="step-description">{currentStep.text}</p>
            )}

            {/* Try step goal */}
            {currentStep.type === 'try' && (
              <div className="goal-banner">
                🎯 <strong>Mục tiêu:</strong> {currentStep.goal}
              </div>
            )}

            {/* Quiz Step */}
            {currentStep.type === 'quiz' && (
              <div className="quiz-container">
                {currentStep.questions.map((q, qIdx) => (
                  <div key={qIdx} className="quiz-question-box">
                    <p className="quiz-question-text">
                      <strong>Câu hỏi:</strong> {q.question}
                    </p>
                    <div className="quiz-options">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          className={`quiz-option-btn ${
                            quizAnswer === oIdx
                              ? oIdx === q.correctIndex
                                ? 'correct'
                                : 'incorrect'
                              : ''
                          }`}
                          onClick={() => handleQuizChoice(oIdx, q)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback Alert */}
            {feedback && (
              <div className={`feedback-alert ${feedback.type}`}>
                {feedback.type === 'success' ? '🎉 ' : feedback.type === 'info' ? 'ℹ️ ' : '⚠️ '}
                {feedback.message}
              </div>
            )}

            {/* Hints and Solution in Try step */}
            {currentStep.type === 'try' && (
              <div className="try-tools-bar">
                {currentStep.hints.length > 0 && (
                  <div className="hint-section">
                    {hintIndex > 0 && (
                      <p className="hint-text">
                        💡 <strong>Gợi ý:</strong> {currentStep.hints[hintIndex - 1]}
                      </p>
                    )}
                    {hintIndex < currentStep.hints.length && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setHintIndex((prev) => prev + 1)}
                      >
                        Xem gợi ý ({hintIndex + 1}/{currentStep.hints.length})
                      </button>
                    )}
                  </div>
                )}

                <div className="try-action-buttons">
                  <button className="btn-secondary btn-sm" onClick={handleResetStep}>
                    ↺ Đặt lại bàn cờ
                  </button>
                  <button className="btn-secondary btn-sm" onClick={handleShowSolution}>
                    👁 Xem đáp án
                  </button>
                </div>
              </div>
            )}

            {/* Lesson Navigation Buttons */}
            <div className="lesson-nav-actions">
              {stepIndex > 0 && (
                <button
                  className="btn-secondary"
                  onClick={() => setStepIndex((prev) => prev - 1)}
                >
                  ← Quay lại
                </button>
              )}

              <button className="btn-primary" onClick={handleNextStep}>
                {stepIndex < selectedLesson.steps.length - 1 ? 'Tiếp theo →' : 'Hoàn thành bài học ✓'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
