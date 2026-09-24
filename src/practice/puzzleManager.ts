import { Puzzle, PuzzleStep } from './types';
import { Board } from '../core/types';
import { parseFEN } from '../core/fen';
import { applyMove } from '../core/gameEngine';
import { toVietnameseNotation } from '../core/vietnameseNotation';

export interface PuzzleSessionState {
  puzzle: Puzzle;
  currentBoard: Board;
  currentStep: PuzzleStep;
  status: 'playing' | 'correct' | 'wrong' | 'completed';
  hintLevel: 0 | 1 | 2 | 3;
  feedbackMessage?: string;
}

export interface StreakState {
  currentScore: number;
  bestScore: number;
  livesRemaining: number;
  active: boolean;
}

const STREAK_KEY = 'daycotuong_streak_best';

export function loadBestStreak(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestStreak(score: number): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadBestStreak();
    if (score > prev) {
      localStorage.setItem(STREAK_KEY, score.toString());
    }
  } catch {
    // Ignore storage errors
  }
}

export function createPuzzleSession(puzzle: Puzzle): PuzzleSessionState {
  const parsed = parseFEN(puzzle.fen);
  return {
    puzzle,
    currentBoard: parsed.board,
    currentStep: puzzle.solution,
    status: 'playing',
    hintLevel: 0,
  };
}

export interface SolutionStepDetail {
  stepNumber: number;
  playerMove: { from: string; to: string; notation: string };
  replyMove?: { from: string; to: string; notation: string };
  commentary?: string;
  boardBeforePlayer: Board;
  boardAfterPlayer: Board;
  boardAfterReply?: Board;
}

export function extractFullSolution(puzzle: Puzzle): SolutionStepDetail[] {
  const steps: SolutionStepDetail[] = [];
  const parsed = parseFEN(puzzle.fen);
  let currentBoard = parsed.board;
  let currentStep: PuzzleStep | undefined = puzzle.solution;
  let stepNumber = 1;
  const enemySide = puzzle.side === 'red' ? 'black' : 'red';

  while (currentStep) {
    const boardBefore = currentBoard;
    const movingPiece = boardBefore.flat().find((p) => p && p.square === currentStep!.move.from);
    
    const playerMoveObj = {
      from: currentStep.move.from as any,
      to: currentStep.move.to as any,
      piece: movingPiece ? movingPiece.type : ('rook' as any),
      side: puzzle.side,
    };

    const playerNotation = movingPiece
      ? toVietnameseNotation(boardBefore, playerMoveObj, 'full')
      : `${currentStep.move.from} → ${currentStep.move.to}`;

    const boardAfterPlayer = movingPiece
      ? applyMove(boardBefore, playerMoveObj)
      : boardBefore;

    let boardAfterReply: Board | undefined;
    let replyNotation: string | undefined;

    if (currentStep.reply) {
      const enemyPiece = boardAfterPlayer.flat().find((p) => p && p.square === currentStep!.reply!.from);
      const replyMoveObj = {
        from: currentStep.reply.from as any,
        to: currentStep.reply.to as any,
        piece: enemyPiece ? enemyPiece.type : ('general' as any),
        side: enemySide as any,
      };

      replyNotation = enemyPiece
        ? toVietnameseNotation(boardAfterPlayer, replyMoveObj, 'full')
        : `${currentStep.reply.from} → ${currentStep.reply.to}`;

      boardAfterReply = enemyPiece
        ? applyMove(boardAfterPlayer, replyMoveObj)
        : boardAfterPlayer;
      currentBoard = boardAfterReply;
    } else {
      currentBoard = boardAfterPlayer;
    }

    steps.push({
      stepNumber,
      playerMove: {
        from: currentStep.move.from,
        to: currentStep.move.to,
        notation: playerNotation,
      },
      replyMove: currentStep.reply
        ? {
            from: currentStep.reply.from,
            to: currentStep.reply.to,
            notation: replyNotation || `${currentStep.reply.from} → ${currentStep.reply.to}`,
          }
        : undefined,
      commentary: currentStep.commentary,
      boardBeforePlayer: boardBefore,
      boardAfterPlayer,
      boardAfterReply,
    });

    stepNumber++;
    currentStep = currentStep.next;
  }

  return steps;
}

export function applyPlayerPuzzleMove(
  session: PuzzleSessionState,
  from: string,
  to: string
): {
  success: boolean;
  session: PuzzleSessionState;
  hasReply: boolean;
} {
  if (session.status === 'completed') {
    return { success: false, session, hasReply: false };
  }

  const expected = session.currentStep.move;
  const isMatch = expected.from === from && expected.to === to;

  if (!isMatch) {
    return {
      success: false,
      session: {
        ...session,
        status: 'wrong',
        feedbackMessage: 'Nước đi chưa chính xác. Hãy thử lại hoặc sử dụng gợi ý / xem đáp án!',
      },
      hasReply: false,
    };
  }

  // Player move is correct!
  const pieceAtFrom = session.currentBoard.flat().find((p) => p && p.square === from);
  if (!pieceAtFrom) return { success: false, session, hasReply: false };

  const playerMovedBoard = applyMove(session.currentBoard, {
    from: from as any,
    to: to as any,
    piece: pieceAtFrom.type,
    side: session.puzzle.side,
  });

  const hasReply = !!(session.currentStep.reply && session.currentStep.next);

  if (hasReply) {
    return {
      success: true,
      session: {
        ...session,
        currentBoard: playerMovedBoard,
        status: 'correct',
        feedbackMessage: 'Nước đi chuẩn xác! Đối phương đang đối phó...',
      },
      hasReply: true,
    };
  } else {
    // Puzzle completed
    return {
      success: true,
      session: {
        ...session,
        currentBoard: playerMovedBoard,
        status: 'completed',
        feedbackMessage: session.currentStep.commentary || 'Xuất sắc! Bạn đã giải xong thế cờ này!',
      },
      hasReply: false,
    };
  }
}

export function applyMachinePuzzleReply(session: PuzzleSessionState): PuzzleSessionState {
  if (!session.currentStep.reply || !session.currentStep.next) {
    return session;
  }

  const reply = session.currentStep.reply;
  const enemySide = session.puzzle.side === 'red' ? 'black' : 'red';
  const replyPiece = session.currentBoard.flat().find((p) => p && p.square === reply.from);

  const machineBoard = replyPiece
    ? applyMove(session.currentBoard, {
        from: reply.from as any,
        to: reply.to as any,
        piece: replyPiece.type,
        side: enemySide,
      })
    : session.currentBoard;

  return {
    ...session,
    currentBoard: machineBoard,
    currentStep: session.currentStep.next,
    status: 'correct',
    feedbackMessage: 'Đối phương đã đáp trả. Hãy đi nước tiếp theo!',
  };
}

export function handleUserPuzzleMove(
  session: PuzzleSessionState,
  from: string,
  to: string
): {
  session: PuzzleSessionState;
  machineReplied: boolean;
} {
  const playerRes = applyPlayerPuzzleMove(session, from, to);
  if (!playerRes.success) {
    return { session: playerRes.session, machineReplied: false };
  }

  if (playerRes.hasReply) {
    const finalSession = applyMachinePuzzleReply(playerRes.session);
    return { session: finalSession, machineReplied: true };
  }

  return { session: playerRes.session, machineReplied: false };
}
