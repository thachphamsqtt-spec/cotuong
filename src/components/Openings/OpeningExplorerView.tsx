import React, { useState, useEffect, useRef } from 'react';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { Board, Move, Side, Square } from '../../core/types';
import { parseFEN, boardToFEN } from '../../core/fen';
import { generateLegalMoves, applyMove } from '../../core/gameEngine';
import { toVietnameseNotation } from '../../core/vietnameseNotation';
import { soundEffects } from '../../audio/soundFX';
import {
  OPENING_CATEGORIES,
  OPENINGS_DATABASE,
} from '../../openings/openingData';
import {
  CandidateContinuation,
  OpeningCategory,
  OpeningMove,
  OpeningTrainerState,
  OpeningVariation,
} from '../../openings/openingTypes';
import {
  findMatchingOpenings,
  getCandidateContinuations,
  getPrimaryOpening,
  replayOpeningMoves,
} from '../../openings/openingManager';

interface OpeningExplorerViewProps {
  pieceSet: PieceSet;
  onPlayWithAI?: (fen: string) => void;
  onAnalyze?: (board: Board, moves: Move[]) => void;
}

type ExplorerTab = 'explorer' | 'trainer';

export const OpeningExplorerView: React.FC<OpeningExplorerViewProps> = ({
  pieceSet,
  onPlayWithAI,
  onAnalyze,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('explorer');

  // Exploration state
  const [moveHistory, setMoveHistory] = useState<{ from: Square; to: Square; notation: string; commentary?: string }[]>([]);
  const [boardHistory, setBoardHistory] = useState<Board[]>([parseFEN().board]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Filter & Selected opening
  const [selectedCategory, setSelectedCategory] = useState<OpeningCategory | 'all'>('all');
  const [selectedSideFilter, setSelectedSideFilter] = useState<'all' | 'red' | 'black'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeOpening, setActiveOpening] = useState<OpeningVariation | null>(OPENINGS_DATABASE[0]);

  // Trainer state
  const [trainer, setTrainer] = useState<OpeningTrainerState>({
    isActive: false,
    selectedOpeningId: OPENINGS_DATABASE[0].id,
    playerSide: 'red',
    currentMoveIndex: 0,
    score: 0,
    totalKeyMoves: 0,
    mistakes: 0,
    feedback: null,
  });

  const currentBoard = boardHistory[currentStepIndex] || parseFEN().board;
  const currentSide: Side = currentStepIndex % 2 === 0 ? 'red' : 'black';

  // Candidate continuations from current position
  const candidateContinuations = getCandidateContinuations(
    currentBoard,
    moveHistory.slice(0, currentStepIndex)
  );

  // Detect deepest matching opening for current board
  const { opening: detectedOpening } = getPrimaryOpening(moveHistory.slice(0, currentStepIndex));
  const currentDisplayOpening = detectedOpening || activeOpening;

  // Cleanup auto-play on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  // Filtered opening list for directory
  const filteredOpenings = OPENINGS_DATABASE.filter((op) => {
    if (selectedCategory !== 'all' && op.category !== selectedCategory) return false;
    if (selectedSideFilter !== 'all' && op.side !== 'both' && op.side !== selectedSideFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = op.name.toLowerCase().includes(q) || op.vietnameseName.toLowerCase().includes(q);
      const matchEco = op.eco.toLowerCase().includes(q);
      const matchDesc = op.description.toLowerCase().includes(q);
      const matchGM = op.grandmasters.some((gm) => gm.toLowerCase().includes(q));
      if (!matchName && !matchEco && !matchDesc && !matchGM) return false;
    }
    return true;
  });

  // Load an opening variation into explorer
  const handleSelectOpening = (opening: OpeningVariation) => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);
    setActiveOpening(opening);

    const replay = replayOpeningMoves(opening.moves);
    setBoardHistory(replay.boards);
    setMoveHistory(replay.annotatedMoves);
    setCurrentStepIndex(replay.annotatedMoves.length);
    setSelectedSquare(null);
    soundEffects.playMove();
  };

  // Step navigation
  const handleStepTo = (index: number) => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);
    const clamped = Math.max(0, Math.min(boardHistory.length - 1, index));
    setCurrentStepIndex(clamped);
    setSelectedSquare(null);
    soundEffects.playMove();
  };

  const handleFirstStep = () => handleStepTo(0);
  const handlePrevStep = () => handleStepTo(currentStepIndex - 1);
  const handleNextStep = () => handleStepTo(currentStepIndex + 1);
  const handleLastStep = () => handleStepTo(boardHistory.length - 1);

  const handleResetToStart = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);
    setBoardHistory([parseFEN().board]);
    setMoveHistory([]);
    setCurrentStepIndex(0);
    setSelectedSquare(null);
    soundEffects.playMove();
  };

  // Auto-play through moves
  const handleToggleAutoPlay = () => {
    if (isAutoPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
      if (currentStepIndex >= boardHistory.length - 1) {
        setCurrentStepIndex(0);
      }
      autoPlayRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < boardHistory.length - 1) {
            soundEffects.playMove();
            return prev + 1;
          } else {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
            setIsAutoPlaying(false);
            return prev;
          }
        });
      }, 1200);
    }
  };

  // Apply candidate continuation move directly
  const handlePlayCandidate = (candidate: CandidateContinuation) => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);

    const movingPiece = currentBoard.flat().find((p) => p && p.square === candidate.move.from);
    if (!movingPiece) return;

    const newBoard = applyMove(currentBoard, {
      from: candidate.move.from,
      to: candidate.move.to,
      piece: movingPiece.type,
      side: movingPiece.side,
    });

    const newBoardHistory = [...boardHistory.slice(0, currentStepIndex + 1), newBoard];
    const newMoveHistory = [
      ...moveHistory.slice(0, currentStepIndex),
      {
        from: candidate.move.from,
        to: candidate.move.to,
        notation: candidate.notation,
        commentary: candidate.commentary,
      },
    ];

    setBoardHistory(newBoardHistory);
    setMoveHistory(newMoveHistory);
    setCurrentStepIndex(newBoardHistory.length - 1);
    setSelectedSquare(null);
    soundEffects.playMove();
  };

  // Making moves directly on board in Explorer or Trainer
  const handleBoardMove = (from: Square, to: Square) => {
    const movingPiece = currentBoard.flat().find((p) => p && p.square === from);
    if (!movingPiece) return;

    const gameMove: Move = {
      from,
      to,
      piece: movingPiece.type,
      side: movingPiece.side,
    };

    if (activeTab === 'trainer' && trainer.isActive) {
      handleTrainerUserMove(gameMove);
      return;
    }

    // Normal explorer move
    const newBoard = applyMove(currentBoard, gameMove);
    let notation = '';
    try {
      notation = toVietnameseNotation(currentBoard, gameMove, 'full');
    } catch {
      notation = `${gameMove.from} → ${gameMove.to}`;
    }

    const newBoardHistory = [...boardHistory.slice(0, currentStepIndex + 1), newBoard];
    const newMoveHistory = [
      ...moveHistory.slice(0, currentStepIndex),
      { from: gameMove.from, to: gameMove.to, notation },
    ];

    setBoardHistory(newBoardHistory);
    setMoveHistory(newMoveHistory);
    setCurrentStepIndex(newBoardHistory.length - 1);
    setSelectedSquare(null);
    soundEffects.playMove();
  };

  const handleSquareClick = (square: Square) => {
    const piece = currentBoard.flat().find((p) => p && p.square === square);
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      const legalMoves = generateLegalMoves(currentBoard, currentSide);
      const validMove = legalMoves.find((m) => m.from === selectedSquare && m.to === square);
      if (validMove) {
        handleBoardMove(validMove.from, validMove.to);
        return;
      }
    }
    if (piece && piece.side === currentSide) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  // ==========================================
  // OPENING TRAINER LOGIC
  // ==========================================
  const startTrainer = (opening: OpeningVariation, side: Side = 'red') => {
    setActiveOpening(opening);
    const initialBoard = parseFEN().board;
    setBoardHistory([initialBoard]);
    setMoveHistory([]);
    setCurrentStepIndex(0);
    setSelectedSquare(null);

    const playerMovesCount = opening.moves.filter((_, idx) => (side === 'red' ? idx % 2 === 0 : idx % 2 === 1)).length;

    setTrainer({
      isActive: true,
      selectedOpeningId: opening.id,
      playerSide: side,
      currentMoveIndex: 0,
      score: 0,
      totalKeyMoves: playerMovesCount,
      mistakes: 0,
      feedback: {
        status: 'correct',
        message: `Bắt đầu luyện tập thế trận: "${opening.vietnameseName}" (${side === 'red' ? 'Cầm quân Đỏ' : 'Cầm quân Đen'}). Hãy thực hiện nước đi đầu tiên!`,
      },
    });

    // If training as Black, Red makes the first move automatically
    if (side === 'black' && opening.moves.length > 0) {
      setTimeout(() => {
        playTrainerOpponentMove(0, opening, [initialBoard], []);
      }, 500);
    }
  };

  const playTrainerOpponentMove = (
    moveIdx: number,
    opening: OpeningVariation,
    currentBoards: Board[],
    currentMoves: { from: Square; to: Square; notation: string; commentary?: string }[]
  ) => {
    if (moveIdx >= opening.moves.length) return;
    const oppMove = opening.moves[moveIdx];
    const board = currentBoards[currentBoards.length - 1];
    const movingPiece = board.flat().find((p) => p && p.square === oppMove.from);
    if (!movingPiece) return;

    const newBoard = applyMove(board, {
      from: oppMove.from,
      to: oppMove.to,
      piece: movingPiece.type,
      side: movingPiece.side,
    });

    const not = oppMove.notation || toVietnameseNotation(board, { from: oppMove.from, to: oppMove.to, piece: movingPiece.type, side: movingPiece.side }, 'full');

    const nextBoards = [...currentBoards, newBoard];
    const nextMoves = [...currentMoves, { from: oppMove.from, to: oppMove.to, notation: not, commentary: oppMove.commentary }];

    setBoardHistory(nextBoards);
    setMoveHistory(nextMoves);
    setCurrentStepIndex(nextBoards.length - 1);
    soundEffects.playMove();

    setTrainer((prev) => ({
      ...prev,
      currentMoveIndex: moveIdx + 1,
      feedback: {
        status: 'correct',
        message: `Đối thủ vừa đi: ${not}. Đến lượt bạn!`,
      },
    }));
  };

  const handleTrainerUserMove = (move: Move) => {
    if (!activeOpening) return;
    const expectedMove = activeOpening.moves[trainer.currentMoveIndex];

    if (!expectedMove) {
      // Completed all moves
      return;
    }

    if (move.from === expectedMove.from && move.to === expectedMove.to) {
      // CORRECT THEORETICAL MOVE
      const newBoard = applyMove(currentBoard, move);
      const not = expectedMove.notation || toVietnameseNotation(currentBoard, move, 'full');
      const nextBoards = [...boardHistory, newBoard];
      const nextMoves = [...moveHistory, { from: move.from, to: move.to, notation: not, commentary: expectedMove.commentary }];

      setBoardHistory(nextBoards);
      setMoveHistory(nextMoves);
      setCurrentStepIndex(nextBoards.length - 1);
      setSelectedSquare(null);

      const nextMoveIdx = trainer.currentMoveIndex + 1;
      const isFinished = nextMoveIdx >= activeOpening.moves.length;

      if (isFinished) {
        soundEffects.playVictory();
        setTrainer((prev) => ({
          ...prev,
          currentMoveIndex: nextMoveIdx,
          score: prev.score + 1,
          feedback: {
            status: 'completed',
            message: `🎉 Chúc mừng! Bạn đã hoàn thành xuất sắc toàn bộ bài luyện khai cuộc "${activeOpening.vietnameseName}"!`,
          },
        }));
      } else {
        soundEffects.playMove();
        setTrainer((prev) => ({
          ...prev,
          currentMoveIndex: nextMoveIdx,
          score: prev.score + 1,
          feedback: {
            status: 'correct',
            message: `✅ Chính xác! (${not}) ${expectedMove.commentary || ''}`,
          },
        }));

        // Trigger opponent reply after 600ms
        setTimeout(() => {
          playTrainerOpponentMove(nextMoveIdx, activeOpening, nextBoards, nextMoves);
        }, 600);
      }
    } else {
      // DEVIATION / MISTAKE
      soundEffects.playError();
      const not = expectedMove.notation || `${expectedMove.from} → ${expectedMove.to}`;
      setTrainer((prev) => ({
        ...prev,
        mistakes: prev.mistakes + 1,
        feedback: {
          status: 'deviation',
          message: `⚠️ Nước đi chưa chuẩn lý thuyết! Nước đi chuẩn: ${not}. Hãy thử lại!`,
        },
      }));
    }
  };

  // Legal moves for board highlighting
  const legalMoves = selectedSquare
    ? generateLegalMoves(currentBoard, currentSide).filter((m) => m.from === selectedSquare)
    : [];

  // Arrow markers for candidate continuations on board
  const candidateArrows: [string, string][] = candidateContinuations
    .slice(0, 3)
    .map((c) => [c.move.from, c.move.to]);

  return (
    <div className="opening-explorer-root">
      {/* Top Header & Mode Tabs */}
      <div className="opening-topbar">
        <div className="opening-brand-group">
          <span className="opening-badge-icon">📖</span>
          <div>
            <h2 className="opening-main-title">Khai Cuộc Bách Khoa (Opening Explorer)</h2>
            <p className="opening-main-sub">Thư viện tra cứu biến thể, thống kê danh thủ và luyện thuộc khai cuộc chuẩn</p>
          </div>
        </div>

        <div className="opening-mode-tabs">
          <button
            className={`opening-tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            🧭 Khám Phá & Tra Cứu
          </button>
          <button
            className={`opening-tab-btn ${activeTab === 'trainer' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('trainer');
              if (activeOpening) startTrainer(activeOpening, 'red');
            }}
          >
            🎯 Luyện Thuộc Khai Cuộc
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="opening-body-layout">
        {/* Left Column: Board & Navigation */}
        <div className="opening-board-col">
          <div className="opening-board-wrapper">
            <XiangqiBoard
              board={currentBoard}
              turn={currentSide}
              flipped={isFlipped}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              pieceSet={pieceSet}
              interactive={true}
              arrows={activeTab === 'explorer' ? candidateArrows : []}
              onSquareClick={handleSquareClick}
              onMove={handleBoardMove}
            />
          </div>

          {/* Board Navigation Controls */}
          <div className="opening-controls-bar">
            <button className="ctrl-btn" onClick={handleFirstStep} title="Về nước đầu tiên">
              ⏮
            </button>
            <button className="ctrl-btn" onClick={handlePrevStep} title="Lùi 1 nước">
              ◀
            </button>
            <button
              className={`ctrl-btn play-btn ${isAutoPlaying ? 'playing' : ''}`}
              onClick={handleToggleAutoPlay}
              title={isAutoPlaying ? 'Tạm dừng' : 'Tự động phát'}
            >
              {isAutoPlaying ? '⏸' : '▶'}
            </button>
            <button className="ctrl-btn" onClick={handleNextStep} title="Tiến 1 nước">
              ▶
            </button>
            <button className="ctrl-btn" onClick={handleLastStep} title="Đến nước cuối cùng">
              ⏭
            </button>
            <button className="ctrl-btn" onClick={handleResetToStart} title="Xếp lại bàn cờ mới">
              🔄
            </button>
            <button
              className={`ctrl-btn ${isFlipped ? 'active-flip' : ''}`}
              onClick={() => setIsFlipped((prev) => !prev)}
              title="Đổi chiều bàn cờ (Đỏ / Đen)"
            >
              🔃
            </button>
          </div>

          {/* Move Sequence Tape */}
          <div className="opening-move-tape">
            <span className="tape-label">Các nước đi:</span>
            {moveHistory.length === 0 ? (
              <span className="tape-empty">Vị trí ban đầu</span>
            ) : (
              <div className="tape-scroll">
                {moveHistory.map((m, idx) => (
                  <button
                    key={idx}
                    className={`tape-move-chip ${currentStepIndex === idx + 1 ? 'active' : ''}`}
                    onClick={() => handleStepTo(idx + 1)}
                  >
                    <span className="chip-idx">{idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : '..'}</span>
                    <span className="chip-side">{idx % 2 === 0 ? '🔴' : '⚫'}</span>
                    <span className="chip-not">{m.notation}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className="opening-action-toolbar">
            {onPlayWithAI && (
              <button
                className="btn-opening-action"
                onClick={() => onPlayWithAI(boardToFEN(currentBoard, currentSide))}
                title="Tạo ván đấu với AI từ thế cờ hiện tại"
              >
                ⚔️ Đấu AI từ thế này
              </button>
            )}
            {onAnalyze && (
              <button
                className="btn-opening-action"
                onClick={() => onAnalyze(currentBoard, [])}
                title="Mở thế cờ này trong chế độ Phân tích chuyên sâu"
              >
                🔍 Phân tích ván cờ
              </button>
            )}
            <button
              className="btn-opening-action"
              onClick={() => {
                const fen = boardToFEN(currentBoard, currentSide);
                navigator.clipboard.writeText(fen);
                alert('Đã sao chép FEN vào bộ nhớ tạm:\n' + fen);
              }}
              title="Sao chép chuỗi FEN của thế cờ"
            >
              📋 Sao chép FEN
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Explorer / Trainer Sidebar */}
        <div className="opening-sidebar-col">
          {activeTab === 'explorer' ? (
            <div className="opening-explorer-panels">
              {/* Active Opening Info Card */}
              {currentDisplayOpening && (
                <div className="opening-info-card">
                  <div className="info-card-header">
                    <span className="eco-tag">{currentDisplayOpening.eco}</span>
                    <span className="side-tag">
                      {currentDisplayOpening.side === 'red' && '🔴 Đi Tiên (Đỏ)'}
                      {currentDisplayOpening.side === 'black' && '⚫ Đi Hậu (Đen)'}
                      {currentDisplayOpening.side === 'both' && '⚖️ Đối Công (Hai bên)'}
                    </span>
                    <span className="pop-tag">🔥 Độ phổ biến: {currentDisplayOpening.stats.popularity}%</span>
                  </div>

                  <h3 className="opening-card-title">{currentDisplayOpening.vietnameseName}</h3>
                  {currentDisplayOpening.chineseName && (
                    <span className="chinese-title">{currentDisplayOpening.chineseName}</span>
                  )}
                  <p className="opening-card-desc">{currentDisplayOpening.description}</p>

                  {/* Win Rates & Stats Bar */}
                  <div className="opening-stats-container">
                    <div className="stats-bar-header">
                      <span>Tỉ lệ thực chiến:</span>
                      <span className="sample-text">({currentDisplayOpening.stats.totalGamesSample?.toLocaleString()} ván mẫu)</span>
                    </div>
                    <div className="winrate-bar">
                      <div
                        className="bar-segment red-win"
                        style={{ width: `${currentDisplayOpening.stats.redWinRate}%` }}
                        title={`Đỏ thắng: ${currentDisplayOpening.stats.redWinRate}%`}
                      >
                        Đỏ {currentDisplayOpening.stats.redWinRate}%
                      </div>
                      <div
                        className="bar-segment draw"
                        style={{ width: `${currentDisplayOpening.stats.drawRate}%` }}
                        title={`Hòa: ${currentDisplayOpening.stats.drawRate}%`}
                      >
                        Hòa {currentDisplayOpening.stats.drawRate}%
                      </div>
                      <div
                        className="bar-segment black-win"
                        style={{ width: `${currentDisplayOpening.stats.blackWinRate}%` }}
                        title={`Đen thắng: ${currentDisplayOpening.stats.blackWinRate}%`}
                      >
                        Đen {currentDisplayOpening.stats.blackWinRate}%
                      </div>
                    </div>
                  </div>

                  {/* Grandmasters tag list */}
                  <div className="grandmasters-row">
                    <span className="gm-label">Danh thủ tiêu biểu:</span>
                    <div className="gm-tags">
                      {currentDisplayOpening.grandmasters.map((gm, idx) => (
                        <span key={idx} className="gm-chip">
                          👑 {gm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Key Goals & Traps */}
                  <div className="strategy-accordions">
                    <div className="strategy-box">
                      <strong>🎯 Ý đồ chiến lược:</strong>
                      <ul>
                        {currentDisplayOpening.strategicGoals.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>

                    {currentDisplayOpening.trapsAndMistakes && (
                      <div className="strategy-box trap-box">
                        <strong>⚡ Cạm bẫy & Lưu ý:</strong>
                        <ul>
                          {currentDisplayOpening.trapsAndMistakes.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Candidate Continuations from Current Position */}
              <div className="candidate-moves-panel">
                <div className="panel-title-bar">
                  <h4>💡 Nước đi lý thuyết tiếp theo ({candidateContinuations.length})</h4>
                  <span className="turn-indicator">
                    Lượt đi: {currentSide === 'red' ? '🔴 Đỏ' : '⚫ Đen'}
                  </span>
                </div>

                {candidateContinuations.length === 0 ? (
                  <div className="empty-candidates-box">
                    <span>Thế cờ này đã vượt khỏi các biến thể trong thư viện tiêu chuẩn hoặc là nước biến hiếm gặp. Bạn có thể tự do đi tiếp hoặc chọn thế trận khác từ danh mục dưới đây!</span>
                  </div>
                ) : (
                  <div className="candidates-list">
                    {candidateContinuations.map((cand, idx) => (
                      <div
                        key={idx}
                        className="candidate-card"
                        onClick={() => handlePlayCandidate(cand)}
                      >
                        <div className="candidate-header">
                          <span className="candidate-rank">#{idx + 1}</span>
                          <span className="candidate-notation">{cand.notation}</span>
                          <span className="candidate-pop-badge">🔥 {cand.stats.popularity}%</span>
                        </div>

                        {cand.commentary && (
                          <p className="candidate-commentary">{cand.commentary}</p>
                        )}

                        <div className="mini-winrate-bar">
                          <div className="mini-seg red" style={{ width: `${cand.stats.redWinRate}%` }}>
                            {cand.stats.redWinRate}%
                          </div>
                          <div className="mini-seg draw" style={{ width: `${cand.stats.drawRate}%` }}>
                            {cand.stats.drawRate}%
                          </div>
                          <div className="mini-seg black" style={{ width: `${cand.stats.blackWinRate}%` }}>
                            {cand.stats.blackWinRate}%
                          </div>
                        </div>

                        <div className="candidate-openings-tags">
                          {cand.matchingOpenings.slice(0, 2).map((mOp, mIdx) => (
                            <span key={mIdx} className="matching-op-tag">
                              {mOp.vietnameseName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Encyclopedia Directory / Search List */}
              <div className="opening-directory-panel">
                <div className="directory-header">
                  <h4>📚 Danh Mục Khai Cuộc ({filteredOpenings.length})</h4>
                </div>

                {/* Search Bar & Filters */}
                <div className="directory-filters">
                  <input
                    type="text"
                    className="opening-search-input"
                    placeholder="🔍 Tìm kiếm thế trận, danh thủ, ECO (vd: Thuận Pháo, Lại Lý Huynh)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  {/* Category Pills */}
                  <div className="category-chips-scroll">
                    <button
                      className={`cat-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('all')}
                    >
                      🌟 Tất cả
                    </button>
                    {OPENING_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        className={`cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Side Filter */}
                  <div className="side-filter-pills">
                    <button
                      className={`side-pill ${selectedSideFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedSideFilter('all')}
                    >
                      Tất cả bên
                    </button>
                    <button
                      className={`side-pill ${selectedSideFilter === 'red' ? 'active' : ''}`}
                      onClick={() => setSelectedSideFilter('red')}
                    >
                      🔴 Đi Tiên (Đỏ)
                    </button>
                    <button
                      className={`side-pill ${selectedSideFilter === 'black' ? 'active' : ''}`}
                      onClick={() => setSelectedSideFilter('black')}
                    >
                      ⚫ Đi Hậu (Đen)
                    </button>
                  </div>
                </div>

                {/* Opening items list */}
                <div className="directory-list">
                  {filteredOpenings.map((op) => {
                    const isSelected = activeOpening?.id === op.id;
                    return (
                      <div
                        key={op.id}
                        className={`directory-item-card ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSelectOpening(op)}
                      >
                        <div className="item-top">
                          <span className="item-eco">{op.eco}</span>
                          <span className="item-title">{op.vietnameseName}</span>
                        </div>
                        <p className="item-snippet">{op.description}</p>
                        <div className="item-footer">
                          <span className="item-moves-count">📜 {op.moves.length} nước chuẩn</span>
                          <span className="item-popularity">🔥 {op.stats.popularity}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* TRAINER TAB */
            <div className="opening-trainer-panel">
              <div className="trainer-header-card">
                <div className="trainer-title-row">
                  <h3>🎯 Luyện Thuộc Khai Cuộc Chuẩn</h3>
                  <div className="trainer-side-picker">
                    <button
                      className={`side-btn ${trainer.playerSide === 'red' ? 'active' : ''}`}
                      onClick={() => activeOpening && startTrainer(activeOpening, 'red')}
                    >
                      🔴 Luyện Cầm Đỏ
                    </button>
                    <button
                      className={`side-btn ${trainer.playerSide === 'black' ? 'active' : ''}`}
                      onClick={() => activeOpening && startTrainer(activeOpening, 'black')}
                    >
                      ⚫ Luyện Cầm Đen
                    </button>
                  </div>
                </div>

                {activeOpening && (
                  <div className="trainer-active-opening-info">
                    <strong>Đang luyện: {activeOpening.vietnameseName} ({activeOpening.eco})</strong>
                  </div>
                )}

                {/* Progress bar */}
                <div className="trainer-progress-bar-wrap">
                  <div className="progress-labels">
                    <span>Tiến độ ghi nhớ</span>
                    <span>
                      {trainer.score}/{trainer.totalKeyMoves} nước đúng
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${trainer.totalKeyMoves > 0 ? (trainer.score / trainer.totalKeyMoves) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Feedback Box */}
                {trainer.feedback && (
                  <div className={`trainer-feedback-alert ${trainer.feedback.status}`}>
                    {trainer.feedback.message}
                  </div>
                )}
              </div>

              {/* Opening Selector for Trainer */}
              <div className="trainer-select-opening-section">
                <h4>Chọn bài khai cuộc để luyện tập:</h4>
                <div className="trainer-openings-grid">
                  {OPENINGS_DATABASE.map((op) => (
                    <div
                      key={op.id}
                      className={`trainer-pick-card ${activeOpening?.id === op.id ? 'active' : ''}`}
                      onClick={() => startTrainer(op, trainer.playerSide)}
                    >
                      <div className="pick-card-eco">{op.eco}</div>
                      <div className="pick-card-name">{op.vietnameseName}</div>
                      <div className="pick-card-meta">{op.moves.length} nước lý thuyết</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
