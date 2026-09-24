import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XiangqiGame } from '../../core/gameEngine';
import { Board, Move, Side, Square } from '../../core/types';
import { AI_DIFFICULTIES, AIDifficultyConfig } from '../../ai/difficulty';
import { searchBestMove } from '../../ai/search';
import { evaluateBoard } from '../../ai/evaluation';
import { buildAiCommentary, getEvaluationLabel, AIAnalysisResult } from '../../ai/analysis';
import { generateCoachAdvice, CoachAdvice, CoachLevel } from '../../ai/coach';
import { toVietnameseNotation } from '../../core/vietnameseNotation';
import { soundEffects } from '../../audio/soundFX';
import { XiangqiBoard, PieceSet } from '../Board/XiangqiBoard';
import { parseSquare } from '../../core/board';
import { parseFEN, INITIAL_FEN } from '../../core/fen';
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
  saveGameToHistory,
  loadGameHistory,
  StoredGameRecord,
} from '../../play/gameStorage';
import { exportToPGN } from '../../core/pgn';
import { GameHistoryModal } from './GameHistoryModal';
import { ShortcutsModal } from './ShortcutsModal';
import { diagnoseIllegalMove } from '../../core/moveDiagnostics';

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
  const [illegalSquare, setIllegalSquare] = useState<Square | null>(null);
  const [showLegalMovesPreview, setShowLegalMovesPreview] = useState<boolean>(true);
  const [isFlipped, setIsFlipped] = useState<boolean>(() => playerSide === 'black');
  const [moveHistory, setMoveHistory] = useState<{ notation: string; move: Move }[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [gameOverModal, setGameOverModal] = useState<{
    show: boolean;
    title: string;
    reason: string;
  } | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult>({
    score: 0,
    depth: aiConfig.depth,
    bestMove: null,
    explanation: 'Đang chờ phân tích...',
    evaluationLabel: 'Thế cờ đang cân bằng',
    topMoves: [],
    predictedLines: [],
  });
  const [coachLevel, setCoachLevel] = useState<CoachLevel>('beginner');
  const [coachAdvice, setCoachAdvice] = useState<CoachAdvice[]>([
    {
      title: 'AI Coach',
      message: 'Chọn cấp độ để nhận lời khuyên phù hợp với năng lực của bạn.',
      severity: 'info',
    },
  ]);
  const [evalHistory, setEvalHistory] = useState<Array<{ move: number; score: number }>>([]);

  // Modals
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [savedHistory, setSavedHistory] = useState<StoredGameRecord[]>(() => loadGameHistory());

  const initialBoardRef = useRef<Board>(game.getBoard());
  const initialFENRef = useRef<string>(customInitialFEN || INITIAL_FEN);
  const [, setGameVersion] = useState<number>(0);

  // Synchronize board flip when player changes side
  useEffect(() => {
    setIsFlipped(playerSide === 'black');
  }, [playerSide]);

  // Auto-restore active game if present on initial mount (and not overridden by customInitialFEN)
  useEffect(() => {
    if (customInitialFEN) {
      try {
        const newG = new XiangqiGame(customInitialFEN);
        setGame(newG);
        initialBoardRef.current = newG.getBoard();
        initialFENRef.current = customInitialFEN;
        setPlayerSide(newG.getTurn());
        setMoveHistory([]);
        setSelectedSquare(null);
        setGameOverModal(null);
        setFeedbackMessage({ text: 'Đã bắt đầu ván cờ từ thế xếp tùy biến!', type: 'info' });
      } catch (err) {
        console.error('Failed to init game from custom FEN', err);
      }
      return;
    }

    // Try loading persisted active game
    const active = loadActiveGame();
    if (active && active.moves && active.moves.length > 0) {
      try {
        const restoredGame = new XiangqiGame(active.initialFEN || INITIAL_FEN);
        initialBoardRef.current = restoredGame.getBoard();
        initialFENRef.current = active.initialFEN || INITIAL_FEN;

        const restoredHistory: { notation: string; move: Move }[] = [];
        for (const m of active.moves) {
          const boardBefore = restoredGame.getBoard();
          const res = restoredGame.makeMove(m.from, m.to);
          if (res.success && res.move) {
            const notation = toVietnameseNotation(boardBefore, res.move, notationFormat);
            restoredHistory.push({ notation, move: res.move });
          }
        }

        setGame(restoredGame);
        setPlayerSide(active.playerSide || 'red');
        const foundAi = AI_DIFFICULTIES.find((d) => d.level === active.aiLevel);
        if (foundAi) setAiConfig(foundAi);
        setTimeControl(active.timeControl || '10m');
        setRedTime(active.redTime || 600);
        setBlackTime(active.blackTime || 600);
        setMoveHistory(restoredHistory);
        setFeedbackMessage({ text: '⚡ Đã tự động khôi phục ván cờ dở dang của bạn.', type: 'info' });
      } catch (err) {
        console.error('Failed to restore active game', err);
      }
    }
  }, [customInitialFEN]);

  // Auto-save active game whenever state updates
  useEffect(() => {
    if (moveHistory.length > 0 && !gameOverModal?.show) {
      saveActiveGame({
        initialFEN: initialFENRef.current,
        moves: game.getHistory(),
        moveNotations: moveHistory,
        playerSide,
        aiLevel: aiConfig.level,
        timeControl,
        redTime,
        blackTime,
        updatedAt: Date.now(),
      });
    }
  }, [moveHistory, playerSide, aiConfig, timeControl, redTime, blackTime, gameOverModal?.show]);

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

  const updateAnalysis = (board: Board, turn: Side) => {
    const score = evaluateBoard(board);
    const analysis = searchBestMove(board, turn, {
      depth: aiConfig.depth,
      timeLimitMs: aiConfig.timeLimitMs ?? 800,
      iterativeDeepening: true,
    });

    const bestMove = analysis.bestMove;
    const generatedAdvice = generateCoachAdvice(score, bestMove, turn, coachLevel);
    setAiAnalysis({
      score,
      depth: analysis.depthReached,
      bestMove,
      explanation: buildAiCommentary(score, bestMove),
      evaluationLabel: getEvaluationLabel(score, turn),
      topMoves: bestMove ? [{ from: bestMove.from, to: bestMove.to, score, label: 'good' }] : [],
      predictedLines: bestMove ? [[bestMove.from, bestMove.to]] : [],
    });
    setCoachAdvice(generatedAdvice);
  };

  const handleGameOver = (title: string, reason: string) => {
    soundEffects.playVictory();
    setGameOverModal({ show: true, title, reason });

    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (title.includes('Hòa')) {
      result = 'draw';
    } else if (reason.includes(playerSide === 'red' ? 'Đỏ thắng' : 'Đen thắng')) {
      result = 'win';
    } else {
      result = 'loss';
    }

    const record: StoredGameRecord = {
      id: `game_${Date.now()}`,
      createdAt: Date.now(),
      dateFormatted: new Date().toLocaleString('vi-VN'),
      initialFEN: initialFENRef.current,
      moves: game.getHistory(),
      moveNotations: moveHistory,
      playerSide,
      aiLevel: aiConfig.level,
      aiName: aiConfig.name,
      timeControl,
      result,
      resultTitle: title,
      resultReason: reason,
      totalMoves: moveHistory.length,
      finalFEN: game.getFEN(),
    };

    saveGameToHistory(record);
    setSavedHistory(loadGameHistory());
    clearActiveGame();
  };

  const handleSaveCurrentGame = () => {
    const record: StoredGameRecord = {
      id: `saved_${Date.now()}`,
      createdAt: Date.now(),
      dateFormatted: new Date().toLocaleString('vi-VN'),
      initialFEN: initialFENRef.current,
      moves: game.getHistory(),
      moveNotations: moveHistory,
      playerSide,
      aiLevel: aiConfig.level,
      aiName: aiConfig.name,
      timeControl,
      result: 'in_progress',
      resultTitle: 'Ván cờ lưu thủ công',
      resultReason: `Đang ở nước thứ ${moveHistory.length}`,
      totalMoves: moveHistory.length,
      finalFEN: game.getFEN(),
    };

    saveGameToHistory(record);
    setSavedHistory(loadGameHistory());
    setFeedbackMessage({ text: '💾 Đã lưu ván cờ vào Lịch sử thành công!', type: 'success' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleResumeFromHistory = (record: StoredGameRecord) => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    isThinkingRef.current = false;
    setIsThinking(false);

    try {
      const restoredGame = new XiangqiGame(record.initialFEN || INITIAL_FEN);
      initialBoardRef.current = restoredGame.getBoard();
      initialFENRef.current = record.initialFEN || INITIAL_FEN;

      const restoredHistory: { notation: string; move: Move }[] = [];
      for (const m of record.moves) {
        const boardBefore = restoredGame.getBoard();
        const res = restoredGame.makeMove(m.from, m.to);
        if (res.success && res.move) {
          const notation = toVietnameseNotation(boardBefore, res.move, notationFormat);
          restoredHistory.push({ notation, move: res.move });
        }
      }

      setGame(restoredGame);
      setPlayerSide(record.playerSide || 'red');
      const foundAi = AI_DIFFICULTIES.find((d) => d.level === record.aiLevel);
      if (foundAi) setAiConfig(foundAi);
      setMoveHistory(restoredHistory);
      setSelectedSquare(null);
      setGameOverModal(null);
      setFeedbackMessage({ text: `🔄 Đã mở lại ván cờ: ${record.dateFormatted}`, type: 'info' });
    } catch (err) {
      console.error('Failed to resume game', err);
    }
  };

  const handleImportGame = (fen: string, moves: Move[], title?: string) => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    isThinkingRef.current = false;
    setIsThinking(false);

    try {
      const newG = new XiangqiGame(fen || INITIAL_FEN);
      initialBoardRef.current = newG.getBoard();
      initialFENRef.current = fen || INITIAL_FEN;

      const importedHistory: { notation: string; move: Move }[] = [];
      for (const m of moves) {
        const boardBefore = newG.getBoard();
        const res = newG.makeMove(m.from, m.to);
        if (res.success && res.move) {
          const notation = toVietnameseNotation(boardBefore, res.move, notationFormat);
          importedHistory.push({ notation, move: res.move });
        }
      }

      setGame(newG);
      setPlayerSide(newG.getTurn());
      setMoveHistory(importedHistory);
      setSelectedSquare(null);
      setGameOverModal(null);
      setFeedbackMessage({ text: `📥 Đã nạp thành công ${title || 'ván cờ'}!`, type: 'success' });
    } catch (err) {
      console.error('Failed to import game', err);
    }
  };

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

      if (result.status === 'check') {
        soundEffects.playCheck();
      }

      if (timeControl === '15m10s') {
        if (result.move.side === 'red') setRedTime((t) => t + 10);
        else setBlackTime((t) => t + 10);
      }

      setGameVersion((v) => v + 1);
      setSelectedSquare(null);
      setIllegalSquare(null);

      const boardAfterMove = game.getBoard();
      const boardScore = evaluateBoard(boardAfterMove);
      setEvalHistory((prev) => [...prev, { move: prev.length + 1, score: boardScore }]);
      updateAnalysis(boardAfterMove, game.getTurn());
    }
  };

  const handleSquareClick = (square: Square) => {
    if (isThinking || gameOverModal?.show) return;
    if (game.getTurn() !== playerSide) {
      setFeedbackMessage({ text: '⏳ Đang là lượt đi của máy, vui lòng chờ trong giây lát!', type: 'info' });
      return;
    }

    const currentBoard = game.getBoard();
    const { row, col } = parseSquare(square);
    const clickedPiece = currentBoard[row][col];

    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect on second click
        setSelectedSquare(null);
        return;
      }

      const legalMoves = game.getMovesForPiece(selectedSquare);
      const isLegal = legalMoves.some((m) => m.to === square);

      if (isLegal) {
        executeMove(selectedSquare, square);
        return;
      } else {
        // If clicking another piece of the same side, switch selection smoothly
        if (clickedPiece && clickedPiece.side === playerSide) {
          setSelectedSquare(square);
          setIllegalSquare(null);
          setFeedbackMessage(null);
          return;
        }

        // Illegal move attempted: diagnose and explain why
        const errorReason = diagnoseIllegalMove(currentBoard, selectedSquare, square, playerSide);
        setIllegalSquare(square);
        setFeedbackMessage({ text: `❌ ${errorReason}`, type: 'error' });

        // Clear illegal shake after 600ms
        setTimeout(() => setIllegalSquare(null), 600);
        return;
      }
    }

    // No piece was selected yet
    if (clickedPiece) {
      if (clickedPiece.side === playerSide) {
        const legals = game.getMovesForPiece(square);
        if (legals.length === 0) {
          setIllegalSquare(square);
          setFeedbackMessage({
            text: `⚠️ Quân ${clickedPiece.side === 'red' ? 'Đỏ' : 'Đen'} tại ô ${square} đang bị phong tỏa, không có nước đi hợp lệ!`,
            type: 'error',
          });
          setTimeout(() => setIllegalSquare(null), 600);
        } else {
          setSelectedSquare(square);
          setFeedbackMessage(null);
        }
      } else {
        setIllegalSquare(square);
        setFeedbackMessage({
          text: `⚠️ Bạn đang cầm bên ${playerSide === 'red' ? 'Đỏ' : 'Đen'}, không thể chọn quân đối phương!`,
          type: 'error',
        });
        setTimeout(() => setIllegalSquare(null), 600);
      }
    } else {
      setSelectedSquare(null);
    }
  };

  const handleUndo = useCallback(() => {
    if (isThinking || moveHistory.length === 0) return;
    game.undo();
    if (game.getTurn() !== playerSide && game.getHistory().length > 0) {
      game.undo();
    }
    setMoveHistory((prev) => prev.slice(0, game.getHistory().length));
    setGameVersion((v) => v + 1);
    setSelectedSquare(null);
    setIllegalSquare(null);
    setFeedbackMessage({ text: '↩️ Đã hoàn tác nước cờ.', type: 'info' });
  }, [isThinking, moveHistory.length, playerSide, game]);

  const handleHint = useCallback(() => {
    if (isThinking || game.getTurn() !== playerSide) return;
    const searchRes = searchBestMove(game.getBoard(), playerSide, 3);
    if (searchRes.bestMove) {
      setSelectedSquare(searchRes.bestMove.from);
      setFeedbackMessage({
        text: `💡 Gợi ý nước cờ tối ưu: Quân tại ô ${searchRes.bestMove.from} nên tiến về ${searchRes.bestMove.to}.`,
        type: 'info',
      });
    }
  }, [isThinking, playerSide, game]);

  const handleOfferDraw = useCallback(() => {
    if (isThinking || gameOverModal?.show) return;
    const score = evaluateBoard(game.getBoard());
    const machineScore = playerSide === 'red' ? -score : score;

    if (machineScore > 80) {
      setFeedbackMessage({ text: '🤖 Máy: "Thế trận của tôi đang chiếm ưu thế lớn, tôi xin từ chối hòa!"', type: 'error' });
    } else {
      handleGameOver('Hòa Cờ Thỏa Thuận', 'Máy đã đồng ý lời xin hòa của bạn vì thế trận cân bằng.');
    }
  }, [isThinking, gameOverModal?.show, game, playerSide]);

  const handleResign = () => {
    const winner = playerSide === 'red' ? 'Đen' : 'Đỏ';
    handleGameOver('Xin Thua', `Bạn đã nhận thua. ${winner} thắng cuộc!`);
  };

  const handleNewGame = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    isThinkingRef.current = false;
    setIsThinking(false);

    if (moveHistory.length > 2 && !gameOverModal?.show) {
      saveGameToHistory({
        id: `abandoned_${Date.now()}`,
        createdAt: Date.now(),
        dateFormatted: new Date().toLocaleString('vi-VN'),
        initialFEN: initialFENRef.current,
        moves: game.getHistory(),
        moveNotations: moveHistory,
        playerSide,
        aiLevel: aiConfig.level,
        aiName: aiConfig.name,
        timeControl,
        result: 'in_progress',
        resultTitle: 'Ván cờ chưa hoàn thành',
        resultReason: 'Người chơi chuyển sang ván mới',
        totalMoves: moveHistory.length,
        finalFEN: game.getFEN(),
      });
      setSavedHistory(loadGameHistory());
    }

    clearActiveGame();

    const newG = new XiangqiGame();
    setGame(newG);
    initialBoardRef.current = newG.getBoard();
    initialFENRef.current = INITIAL_FEN;
    setMoveHistory([]);
    setSelectedSquare(null);
    setIllegalSquare(null);
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
  }, [moveHistory.length, gameOverModal?.show, playerSide, aiConfig, timeControl, game]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'u':
          handleUndo();
          break;
        case 'h':
          handleHint();
          break;
        case 'n':
          if (window.confirm('Bắt đầu ván cờ mới?')) {
            handleNewGame();
          }
          break;
        case 'f':
          setIsFlipped((prev) => !prev);
          break;
        case 'p':
          setShowLegalMovesPreview((prev) => !prev);
          break;
        case '?':
        case 'k':
          setShortcutsModalOpen(true);
          break;
        case 'escape':
          setSelectedSquare(null);
          setIllegalSquare(null);
          setShortcutsModalOpen(false);
          setHistoryModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleHint, handleNewGame]);

  const handleQuickCopyPGN = () => {
    const pgn = exportToPGN({
      headers: {
        Event: `Đấu AI (${aiConfig.name})`,
        Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        Red: playerSide === 'red' ? 'Bạn' : `AI ${aiConfig.name}`,
        Black: playerSide === 'black' ? 'Bạn' : `AI ${aiConfig.name}`,
      },
      moves: game.getHistory(),
      initialFEN: initialFENRef.current,
    });
    navigator.clipboard.writeText(pgn);
    setFeedbackMessage({ text: '📋 Đã sao chép biên bản PGN vào bộ nhớ tạm!', type: 'success' });
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  useEffect(() => {
    updateAnalysis(game.getBoard(), game.getTurn());
  }, [game, aiConfig.depth, aiConfig.timeLimitMs, coachLevel]);

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderEvalChart = () => {
    if (evalHistory.length === 0) {
      return (
        <div className="analysis-chart-empty">
          <span>Chưa có số liệu thế cờ.</span>
        </div>
      );
    }

    const min = Math.min(...evalHistory.map((item) => item.score));
    const max = Math.max(...evalHistory.map((item) => item.score));
    const range = max - min || 1;

    return (
      <svg viewBox="0 0 280 120" className="analysis-chart-svg" aria-label="Biểu đồ vị thế cờ">
        <line x1="10" y1="100" x2="270" y2="100" stroke="rgba(255,255,255,0.2)" />
        <line x1="10" y1="10" x2="10" y2="100" stroke="rgba(255,255,255,0.2)" />
        {evalHistory.map((point, index) => {
          const x = 10 + (index / Math.max(evalHistory.length - 1, 1)) * 250;
          const y = 100 - ((point.score - min) / range) * 80;
          return <circle key={`${point.move}-${index}`} cx={x} cy={y} r="3" fill="#d4af37" />;
        })}
      </svg>
    );
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

        <div className="play-topbar-history-actions">
          <button
            className={`btn-secondary btn-sm ${showLegalMovesPreview ? 'btn-active-highlight' : ''}`}
            onClick={() => setShowLegalMovesPreview((prev) => !prev)}
            title="Bật/Tắt xem trước nước đi hợp lệ trên bàn cờ (Phím tắt: P)"
          >
            {showLegalMovesPreview ? '👁️ Nước đi: Bật' : '👁️‍🗨️ Nước đi: Tắt'}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setIsFlipped((prev) => !prev)}
            title="Đảo góc nhìn bàn cờ (Phím tắt: F)"
          >
            🔄 Đảo bàn
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShortcutsModalOpen(true)}
            title="Xem danh sách phím tắt (Phím tắt: ?)"
          >
            ⌨️ Phím tắt
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setSavedHistory(loadGameHistory());
              setHistoryModalOpen(true);
            }}
            title="Xem danh sách ván cờ đã lưu & Nhập/Xuất PGN/FEN"
          >
            📚 Lịch sử ({savedHistory.length})
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={handleSaveCurrentGame}
            disabled={moveHistory.length === 0}
            title="Lưu ván cờ hiện tại vào lịch sử"
          >
            💾 Lưu ván
          </button>
        </div>
      </div>

      <div className="play-body">
        {/* Main Board Col */}
        <div className="play-board-col">
          {/* Opponent Clock (top) */}
          {timeControl !== 'none' && (
            <div className={`player-clock top ${game.getTurn() !== playerSide ? 'active' : ''} ${isThinking ? 'thinking-aura' : ''}`}>
              <div className="clock-identity">
                <span className="clock-avatar">🤖</span>
                <span className="clock-name">
                  Máy ({aiConfig.name}) - {playerSide === 'red' ? 'Đen' : 'Đỏ'}
                </span>
                {isThinking && <span className="ai-thinking-indicator">⚡ Đang tính...</span>}
              </div>
              <span className="clock-digits">
                {formatClock(playerSide === 'red' ? blackTime : redTime)}
              </span>
            </div>
          )}

          <XiangqiBoard
            board={game.getBoard()}
            turn={game.getTurn()}
            flipped={isFlipped}
            selectedSquare={selectedSquare}
            legalMoves={showLegalMovesPreview ? legalMoves : []}
            lastMove={game.getLastMove()}
            illegalSquare={illegalSquare}
            isThinking={isThinking}
            pieceSet={pieceSet}
            onSquareClick={handleSquareClick}
            onMove={(from, to) => executeMove(from, to)}
          />

          {/* Player Clock (bottom) */}
          {timeControl !== 'none' && (
            <div className={`player-clock bottom ${game.getTurn() === playerSide ? 'active' : ''}`}>
              <div className="clock-identity">
                <span className="clock-avatar">👤</span>
                <span className="clock-name">
                  Bạn - {playerSide === 'red' ? 'Đỏ' : 'Đen'}
                </span>
              </div>
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
                  <span className="thinking-pulse">
                    <span className="thinking-spinner"></span> 🤖 Máy đang suy nghĩ nước đi...
                  </span>
                ) : (
                  <span>
                    Lượt đi: <strong className={game.getTurn() === 'red' ? 'turn-red' : 'turn-black'}>{game.getTurn() === 'red' ? '🔴 Đỏ' : '⚫ Đen'}</strong>
                    {game.getStatus() === 'check' && (
                      <span className="check-alert-badge"> ⚡ CHIẾU TƯỚNG!</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {feedbackMessage && (
              <div className={`feedback-alert ${feedbackMessage.type}`} style={{ margin: '8px 0' }}>
                {feedbackMessage.text}
              </div>
            )}

            <div className="analysis-panel">
              <div className="analysis-panel-header">
                <h4>🤖 Phân tích AI</h4>
                <span className="analysis-level-badge">Sâu {aiAnalysis.depth}</span>
              </div>

              <div className="analysis-panel-metrics">
                <div>
                  <span>Điểm thế</span>
                  <strong>{aiAnalysis.score}</strong>
                </div>
                <div>
                  <span>Đánh giá</span>
                  <strong>{aiAnalysis.evaluationLabel}</strong>
                </div>
              </div>

              <div className="analysis-chart-box">
                {renderEvalChart()}
              </div>

              {aiAnalysis.bestMove && (
                <div className="analysis-best-move">
                  <span className="label">Nước mạnh nhất</span>
                  <strong>
                    {aiAnalysis.bestMove.from} → {aiAnalysis.bestMove.to}
                  </strong>
                </div>
              )}

              <div className="coach-level-picker">
                <label htmlFor="coach-level">AI Coach:</label>
                <select
                  id="coach-level"
                  value={coachLevel}
                  onChange={(e) => setCoachLevel(e.target.value as CoachLevel)}
                >
                  <option value="beginner">Người mới</option>
                  <option value="intermediate">Sơ cấp</option>
                  <option value="advanced">Trung cấp</option>
                  <option value="expert">Nâng cao</option>
                </select>
              </div>

              <div className="coach-advice-box">
                {coachAdvice.map((item, index) => (
                  <div key={index} className={`coach-advice ${item.severity}`}>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </div>
                ))}
              </div>

              <p className="analysis-explanation">{aiAnalysis.explanation}</p>

              {aiAnalysis.predictedLines.length > 0 && (
                <div className="analysis-line-box">
                  <span className="label">Dự đoán 3 nước</span>
                  {aiAnalysis.predictedLines.slice(0, 3).map((line, index) => (
                    <div key={index} className="analysis-prediction-line">
                      {line.join(' → ')}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Move history list */}
            <div className="move-history-container">
              <div className="move-history-header">
                <h4>Biên bản ván cờ ({moveHistory.length} nước)</h4>
                {moveHistory.length > 0 && (
                  <button
                    className="btn-tiny-link"
                    onClick={handleQuickCopyPGN}
                    title="Sao chép PGN"
                  >
                    📋 Copy PGN
                  </button>
                )}
              </div>
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
                title="Đi lại nước cờ trước (Phím tắt: Ctrl+Z hoặc U)"
              >
                ↩️ Đi lại <kbd className="mini-kbd">U</kbd>
              </button>
              <button
                className="btn-secondary"
                onClick={handleHint}
                disabled={isThinking || game.getTurn() !== playerSide}
                title="Gợi ý nước đi tối ưu (Phím tắt: H)"
              >
                💡 Gợi ý <kbd className="mini-kbd">H</kbd>
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
              <button className="btn-primary" onClick={handleNewGame} title="Bắt đầu ván mới (Phím tắt: N)">
                🔄 Ván mới <kbd className="mini-kbd">N</kbd>
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

      {/* Game History & PGN/FEN Manager Modal */}
      <GameHistoryModal
        isOpen={historyModalOpen}
        history={savedHistory}
        onClose={() => setHistoryModalOpen(false)}
        onResumeGame={handleResumeFromHistory}
        onAnalyzeGame={(initialFEN, moves) => {
          const g = new XiangqiGame(initialFEN);
          onAnalyzeGame(g.getBoard(), moves);
        }}
        onImportGame={handleImportGame}
        onRefreshHistory={() => setSavedHistory(loadGameHistory())}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
};
