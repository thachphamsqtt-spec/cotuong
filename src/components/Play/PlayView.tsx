import React, { useState, useEffect, useRef } from 'react';
import { XiangqiGame } from '../../core/gameEngine';
import { Board, Move, Side, Square } from '../../core/types';
import { AI_DIFFICULTIES, AIDifficultyConfig } from '../../ai/difficulty';
import { searchBestMove } from '../../ai/search';
import { evaluateBoard } from '../../ai/evaluation';
import { toVietnameseNotation } from '../../core/vietnameseNotation';
import { soundEffects } from '../../audio/soundFX';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { parseSquare } from '../../core/board';
import { parseFEN } from '../../core/fen';

interface PlayViewProps {
  pieceSet: PieceSet;
  notationFormat: 'short' | 'full';
  customInitialFEN?: string;
  onAnalyzeGame: (initialBoard: Board, moves: Move[]) => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  pieceSet,
  notationFormat,
  customInitialFEN,
  onAnalyzeGame,
}) => {
  const [game, setGame] = useState<XiangqiGame>(() => new XiangqiGame(customInitialFEN));
  const [playerSide, setPlayerSide] = useState<Side>(() => {
    if (customInitialFEN) {
      try {
        return parseFEN(customInitialFEN).turn;
      } catch {
        return 'red';
      }
    }
    return 'red';
  });
  const [aiConfig, setAiConfig] = useState<AIDifficultyConfig>(AI_DIFFICULTIES[2]); // Default level 3
  const [timeControl, setTimeControl] = useState<'none' | '3m' | '5m' | '10m' | '15m10s'>('10m');
  const [redTime, setRedTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [moveHistory, setMoveHistory] = useState<{ notation: string; move: Move }[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [gameOverModal, setGameOverModal] = useState<{
    show: boolean;
    title: string;
    reason: string;
  } | null>(null);

  const initialBoardRef = useRef<Board>(game.getBoard());

  useEffect(() => {
    if (customInitialFEN) {
      try {
        const newG = new XiangqiGame(customInitialFEN);
        setGame(newG);
        initialBoardRef.current = newG.getBoard();
        setPlayerSide(newG.getTurn());
        setMoveHistory([]);
        setSelectedSquare(null);
        setGameOverModal(null);
        setFeedbackMessage('Đã bắt đầu ván cờ từ thế xếp tùy biến!');
      } catch (err) {
        console.error('Failed to init game from custom FEN', err);
      }
    }
  }, [customInitialFEN]);

  // Timer interval
  useEffect(() => {
    if (timeControl === 'none' || gameOverModal?.show) return;

    const timer = setInterval(() => {
      const turn = game.getTurn();
      if (turn === 'red') {
        setRedTime((prev) => {
          if (prev <= 1) {
            handleGameOver('Hết giờ!', 'Đỏ hết thời gian. Đen thắng cuộc!');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleGameOver('Hết giờ!', 'Đen hết thời gian. Đỏ thắng cuộc!');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeControl, game.getTurn(), gameOverModal?.show]);

  const isThinkingRef = useRef<boolean>(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Turn trigger
  useEffect(() => {
    const currentTurn = game.getTurn();
    const isAiTurn = currentTurn !== playerSide;
    const status = game.getStatus();

    if (status === 'checkmate') {
      const winner = currentTurn === 'red' ? 'Đen' : 'Đỏ';
      handleGameOver('Chiếu Bí!', `${winner} đã tung đòn chiếu bí và giành thắng lợi!`);
      return;
    }

    if (status === 'stalemate') {
      const loser = currentTurn === 'red' ? 'Đỏ' : 'Đen';
      const winner = currentTurn === 'red' ? 'Đen' : 'Đỏ';
      handleGameOver('Bị Nhốt (Hết nước đi)!', `${loser} không còn nước đi hợp lệ và bị xử thua. ${winner} thắng cuộc!`);
      return;
    }

    if (status === 'draw_repetition' || status === 'draw_moves_limit') {
      handleGameOver('Hòa Cờ!', 'Ván cờ kết thúc với kết quả Hòa theo luật cờ tướng.');
      return;
    }

    if (isAiTurn && !gameOverModal?.show && !isThinkingRef.current) {
      isThinkingRef.current = true;
      setIsThinking(true);

      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

      aiTimeoutRef.current = setTimeout(() => {
        try {
          const board = game.getBoard();
          const searchRes = searchBestMove(board, currentTurn, {
            depth: aiConfig.depth,
            timeLimitMs: aiConfig.timeLimitMs,
            randomness: aiConfig.blunderRate,
          });

          if (searchRes.bestMove) {
            executeMove(searchRes.bestMove.from, searchRes.bestMove.to);
          }
        } finally {
          isThinkingRef.current = false;
          setIsThinking(false);
        }
      }, 150);
    }
  }, [moveHistory.length, playerSide, aiConfig, gameOverModal?.show]);

  const handleGameOver = (title: string, reason: string) => {
    soundEffects.playVictory();
    setGameOverModal({ show: true, title, reason });
  };

  const [, setGameVersion] = useState<number>(0);

  const executeMove = (from: Square, to: Square) => {
    const boardBefore = game.getBoard();
    const result = game.makeMove(from, to);

    if (result.success && result.move) {
      setFeedbackMessage(null);
      if (result.move.captured) {
        soundEffects.playCapture();
      } else {
        soundEffects.playMove();
      }

      const notation = toVietnameseNotation(boardBefore, result.move, notationFormat);
      setMoveHistory((prev) => [...prev, { notation, move: result.move! }]);

      // Check sound alert if move causes check
      if (result.status === 'check') {
        soundEffects.playCheck();
      }

      // Add increment if 15m10s
      if (timeControl === '15m10s') {
        if (result.move.side === 'red') setRedTime((t) => t + 10);
        else setBlackTime((t) => t + 10);
      }

      setGameVersion((v) => v + 1);
      setSelectedSquare(null);
    }
  };

  const handleSquareClick = (square: Square) => {
    if (isThinking || gameOverModal?.show) return;
    if (game.getTurn() !== playerSide) return;

    if (selectedSquare) {
      const legalMoves = game.getMovesForPiece(selectedSquare);
      const isLegal = legalMoves.some((m) => m.to === square);
      if (isLegal) {
        executeMove(selectedSquare, square);
        return;
      }
    }

    const { row, col } = parseSquare(square);
    const piece = game.getBoard()[row][col];
    if (piece && piece.side === playerSide) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleUndo = () => {
    if (isThinking || moveHistory.length === 0) return;
    // In human vs AI, undo twice to revert AI's reply and player's move
    game.undo();
    if (game.getTurn() !== playerSide && game.getHistory().length > 0) {
      game.undo();
    }
    setMoveHistory((prev) => prev.slice(0, game.getHistory().length));
    setGameVersion((v) => v + 1);
    setSelectedSquare(null);
    setFeedbackMessage('Đã hoàn tác nước cờ.');
  };

  const handleHint = () => {
    if (isThinking || game.getTurn() !== playerSide) return;
    const searchRes = searchBestMove(game.getBoard(), playerSide, 3);
    if (searchRes.bestMove) {
      setSelectedSquare(searchRes.bestMove.from);
      setFeedbackMessage(`Gợi ý: Quân tại ô ${searchRes.bestMove.from} có thể tiến về ${searchRes.bestMove.to}.`);
    }
  };

  const handleOfferDraw = () => {
    if (isThinking || gameOverModal?.show) return;
    const score = evaluateBoard(game.getBoard());
    // Score from red perspective: if machine is black, advantage is -score; if machine is red, advantage is +score
    const machineScore = playerSide === 'red' ? -score : score;

    if (machineScore > 80) {
      setFeedbackMessage('🤖 Máy: "Thế trận của tôi đang chiếm ưu thế lớn, tôi xin từ chối hòa!"');
    } else {
      handleGameOver('Hòa Cờ Thỏa Thuận', 'Máy đã đồng ý lời xin hòa của bạn vì thế trận cân bằng.');
    }
  };

  const handleResign = () => {
    const winner = playerSide === 'red' ? 'Đen' : 'Đỏ';
    handleGameOver('Xin Thua', `Bạn đã nhận thua. ${winner} thắng cuộc!`);
  };

  const handleNewGame = () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    isThinkingRef.current = false;
    setIsThinking(false);

    const newG = new XiangqiGame();
    setGame(newG);
    initialBoardRef.current = newG.getBoard();
    setMoveHistory([]);
    setSelectedSquare(null);
    setGameOverModal(null);
    setFeedbackMessage(null);

    const initialSeconds =
      timeControl === '3m'
        ? 180
        : timeControl === '5m'
        ? 300
        : timeControl === '10m'
        ? 600
        : timeControl === '15m10s'
        ? 900
        : 600;

    setRedTime(initialSeconds);
    setBlackTime(initialSeconds);
  };

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const legalMoves = selectedSquare ? game.getMovesForPiece(selectedSquare) : [];

  return (
    <div className="play-container">
      {/* Play Controls Topbar */}
      <div className="play-topbar">
        <div className="difficulty-picker">
          <label>Độ khó AI:</label>
          <select
            value={aiConfig.level}
            onChange={(e) => {
              const cfg = AI_DIFFICULTIES.find((d) => d.level === Number(e.target.value));
              if (cfg) setAiConfig(cfg);
            }}
          >
            {AI_DIFFICULTIES.map((d) => (
              <option key={d.level} value={d.level}>
                Cấp {d.level}: {d.name} (~{d.eloEstimate} Elo)
              </option>
            ))}
          </select>
        </div>

        <div className="side-picker">
          <label>Bên cầm quân:</label>
          <div className="side-btn-group">
            <button
              className={`side-btn ${playerSide === 'red' ? 'active' : ''}`}
              onClick={() => {
                setPlayerSide('red');
                handleNewGame();
              }}
            >
              🔴 Đỏ (Đi trước)
            </button>
            <button
              className={`side-btn ${playerSide === 'black' ? 'active' : ''}`}
              onClick={() => {
                setPlayerSide('black');
                handleNewGame();
              }}
            >
              ⚫ Đen (Đi sau)
            </button>
          </div>
        </div>

        <div className="timer-picker">
          <label>Thời gian:</label>
          <select
            value={timeControl}
            onChange={(e) => {
              const tc = e.target.value as any;
              setTimeControl(tc);
              const initialSeconds =
                tc === '3m'
                  ? 180
                  : tc === '5m'
                  ? 300
                  : tc === '10m'
                  ? 600
                  : tc === '15m10s'
                  ? 900
                  : 600;
              setRedTime(initialSeconds);
              setBlackTime(initialSeconds);
            }}
          >
            <option value="none">Không giới hạn</option>
            <option value="3m">3 Phút (Chớp)</option>
            <option value="5m">5 Phút</option>
            <option value="10m">10 Phút</option>
            <option value="15m10s">15 Phút + 10s</option>
          </select>
        </div>
      </div>

      <div className="play-body">
        {/* Main Board Col */}
        <div className="play-board-col">
          {/* Opponent Clock (top) */}
          {timeControl !== 'none' && (
            <div className={`player-clock top ${game.getTurn() !== playerSide ? 'active' : ''}`}>
              <span className="clock-name">
                🤖 Máy ({aiConfig.name}) - {playerSide === 'red' ? 'Đen' : 'Đỏ'}
              </span>
              <span className="clock-digits">
                {formatClock(playerSide === 'red' ? blackTime : redTime)}
              </span>
            </div>
          )}

          <XiangqiBoard
            board={game.getBoard()}
            turn={game.getTurn()}
            flipped={playerSide === 'black'}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={game.getLastMove()}
            pieceSet={pieceSet}
            onSquareClick={handleSquareClick}
            onMove={(from, to) => executeMove(from, to)}
          />

          {/* Player Clock (bottom) */}
          {timeControl !== 'none' && (
            <div className={`player-clock bottom ${game.getTurn() === playerSide ? 'active' : ''}`}>
              <span className="clock-name">
                👤 Bạn - {playerSide === 'red' ? 'Đỏ' : 'Đen'}
              </span>
              <span className="clock-digits">
                {formatClock(playerSide === 'red' ? redTime : blackTime)}
              </span>
            </div>
          )}
        </div>

        {/* Game Info & History Col */}
        <div className="play-info-col">
          <div className="game-card">
            <div className="game-status-header">
              <div className="turn-status-badge">
                {isThinking ? (
                  <span className="thinking-pulse">🤖 Máy đang suy nghĩ...</span>
                ) : (
                  <span>
                    Lượt đi: <strong>{game.getTurn() === 'red' ? 'Đỏ' : 'Đen'}</strong>
                    {game.getStatus() === 'check' && (
                      <span className="check-alert-badge"> ⚡ CHIẾU TƯỚNG!</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {feedbackMessage && (
              <div className="feedback-alert info" style={{ margin: '8px 0' }}>
                {feedbackMessage}
              </div>
            )}

            {/* Move history list */}
            <div className="move-history-container">
              <h4>Biên bản ván cờ</h4>
              <div className="move-list-scroll">
                {moveHistory.length === 0 ? (
                  <p className="empty-history-text">Chưa có nước cờ nào.</p>
                ) : (
                  <ol className="move-pairs-list">
                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                      const redM = moveHistory[i * 2];
                      const blackM = moveHistory[i * 2 + 1];

                      return (
                        <li key={i} className="move-row">
                          <span className="move-number">{i + 1}.</span>
                          <span className="move-cell red">{redM?.notation}</span>
                          <span className="move-cell black">{blackM?.notation || ''}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="play-actions-grid">
              <button
                className="btn-secondary"
                onClick={handleUndo}
                disabled={isThinking || moveHistory.length === 0}
                title="Đi lại nước cờ trước"
              >
                ↩️ Đi lại
              </button>
              <button
                className="btn-secondary"
                onClick={handleHint}
                disabled={isThinking || game.getTurn() !== playerSide}
                title="Gợi ý nước đi tối ưu"
              >
                💡 Gợi ý
              </button>
              <button
                className="btn-secondary"
                onClick={handleOfferDraw}
                disabled={isThinking || gameOverModal?.show}
                title="Đề nghị hòa ván cờ"
              >
                🤝 Xin hòa
              </button>
              <button className="btn-secondary" onClick={handleResign} title="Chấp nhận thua cuộc">
                🏳️ Xin thua
              </button>
              <button className="btn-primary" onClick={handleNewGame} title="Bắt đầu ván mới">
                🔄 Ván mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOverModal?.show && (
        <div className="modal-overlay">
          <div className="game-over-modal">
            <h2 className="modal-title">{gameOverModal.title}</h2>
            <p className="modal-reason">{gameOverModal.reason}</p>

            <div className="modal-buttons">
              <button
                className="btn-primary"
                onClick={() => {
                  onAnalyzeGame(initialBoardRef.current, game.getHistory());
                }}
              >
                🔍 Phân tích ván cờ
              </button>
              <button className="btn-secondary" onClick={handleNewGame}>
                Ván cờ mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
