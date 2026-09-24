import { Board, Move, Side } from '../core/types';
import { applyMove, generateLegalMoves, isCheck } from '../core/gameEngine';
import { evaluateBoard, PIECE_BASE_VALUES } from './evaluation';

export interface SearchProgress {
  depth: number;
  score: number;
  bestMove: Move | null;
  nodes: number;
  timeMs: number;
  nps: number;
}

export interface SearchResult {
  bestMove: Move | null;
  score: number;
  depthReached: number;
  nodesEvaluated: number;
  timeMs: number;
}

export interface SearchOptions {
  depth?: number;
  timeLimitMs?: number;
  randomness?: number;
  blunderMargin?: number;
  shouldStop?: () => boolean;
  onProgress?: (progress: SearchProgress) => void;
  iterativeDeepening?: boolean;
}

function scoreMove(move: Move, pvMove?: Move | null): number {
  if (pvMove && move.from === pvMove.from && move.to === pvMove.to) {
    return 1000000; // PV move searched first
  }
  if (move.captured) {
    const victimVal = PIECE_BASE_VALUES[move.captured] || 100;
    const attackerVal = PIECE_BASE_VALUES[move.piece] || 100;
    // MVV-LVA: Most Valuable Victim - Least Valuable Attacker
    return 10000 + victimVal * 10 - attackerVal;
  }
  return 0;
}

export function searchBestMove(
  board: Board,
  turn: Side,
  optionsOrDepth: SearchOptions | number = 3,
  legacyRandomness: number = 0
): SearchResult {
  const options: SearchOptions =
    typeof optionsOrDepth === 'number'
      ? { depth: optionsOrDepth, randomness: legacyRandomness }
      : optionsOrDepth;

  const targetDepth = Math.max(1, options.depth ?? 3);
  const timeLimitMs = options.timeLimitMs ?? Infinity;
  const randomness = options.randomness ?? 0;
  const shouldStop = options.shouldStop;
  const onProgress = options.onProgress;
  const iterative = options.iterativeDeepening ?? (targetDepth > 1);

  const startTime = performance.now();
  let totalNodes = 0;
  let isStopped = false;

  const isRed = turn === 'red';
  const rootMoves = generateLegalMoves(board, turn);

  if (rootMoves.length === 0) {
    return {
      bestMove: null,
      score: isCheck(board, turn) ? (isRed ? -99999 : 99999) : 0,
      depthReached: 0,
      nodesEvaluated: 0,
      timeMs: 0,
    };
  }

  if (rootMoves.length === 1) {
    // Only 1 legal move, return immediately
    const evalScore = evaluateBoard(applyMove(board, rootMoves[0]));
    return {
      bestMove: rootMoves[0],
      score: evalScore,
      depthReached: 1,
      nodesEvaluated: 1,
      timeMs: Math.round(performance.now() - startTime),
    };
  }

  function checkTimeOrStop(): boolean {
    if (isStopped) return true;
    if (shouldStop && shouldStop()) {
      isStopped = true;
      return true;
    }
    if (timeLimitMs !== Infinity && performance.now() - startTime >= timeLimitMs) {
      isStopped = true;
      return true;
    }
    return false;
  }

  function alphaBeta(
    b: Board,
    d: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    totalNodes++;

    // Check stop periodically (every 128 nodes)
    if ((totalNodes & 127) === 0 && checkTimeOrStop()) {
      return isMaximizing ? -Infinity : Infinity;
    }

    const currentSide: Side = isMaximizing ? 'red' : 'black';
    const moves = generateLegalMoves(b, currentSide);

    if (moves.length === 0) {
      // Stalemate or Checkmate: In Xiangqi, player with no legal moves loses
      return isMaximizing ? -99999 + (10 - d) : 99999 - (10 - d);
    }

    if (d === 0) {
      return evaluateBoard(b);
    }

    // Move ordering: evaluate captures first
    moves.sort((a, bMove) => scoreMove(bMove) - scoreMove(a));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const nextBoard = applyMove(b, move);
        const evalScore = alphaBeta(nextBoard, d - 1, alpha, beta, false);
        if (isStopped) return maxEval;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Beta cut-off
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const nextBoard = applyMove(b, move);
        const evalScore = alphaBeta(nextBoard, d - 1, alpha, beta, true);
        if (isStopped) return minEval;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha cut-off
      }
      return minEval;
    }
  }

  let globalBestMove: Move = rootMoves[0];
  let globalBestScore: number = isRed ? -Infinity : Infinity;
  let currentDepthReached = 0;
  let candidateMoves: { move: Move; score: number }[] = [];

  const startDepth = iterative ? 1 : targetDepth;

  for (let currentDepth = startDepth; currentDepth <= targetDepth; currentDepth++) {
    if (checkTimeOrStop()) break;

    // Order root moves with previous iteration's best move first
    rootMoves.sort((a, b) => scoreMove(b, globalBestMove) - scoreMove(a, globalBestMove));

    let iterationBestScore = isRed ? -Infinity : Infinity;
    let iterationBestMove: Move = rootMoves[0];
    const iterationCandidates: { move: Move; score: number }[] = [];

    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of rootMoves) {
      if (checkTimeOrStop()) break;

      const nextBoard = applyMove(board, move);
      const score = alphaBeta(nextBoard, currentDepth - 1, alpha, beta, !isRed);

      if (isStopped) break;

      iterationCandidates.push({ move, score });

      if (isRed) {
        if (score > iterationBestScore) {
          iterationBestScore = score;
          iterationBestMove = move;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < iterationBestScore) {
          iterationBestScore = score;
          iterationBestMove = move;
        }
        beta = Math.min(beta, score);
      }
    }

    if (!isStopped && iterationCandidates.length > 0) {
      currentDepthReached = currentDepth;
      globalBestScore = iterationBestScore;
      globalBestMove = iterationBestMove;
      candidateMoves = iterationCandidates;

      const elapsed = Math.max(1, performance.now() - startTime);
      const nps = Math.round((totalNodes / elapsed) * 1000);

      if (onProgress) {
        onProgress({
          depth: currentDepthReached,
          score: globalBestScore,
          bestMove: globalBestMove,
          nodes: totalNodes,
          timeMs: Math.round(elapsed),
          nps,
        });
      }
    }
  }

  // Handle randomness / blunder model for human-like play
  let chosenMove = globalBestMove;
  if (randomness > 0 && candidateMoves.length > 1) {
    candidateMoves.sort((a, b) => (isRed ? b.score - a.score : a.score - b.score));
    if (Math.random() < randomness) {
      // Pick randomly from top 2nd to 5th move (or max candidates)
      const pool = candidateMoves.slice(1, Math.min(candidateMoves.length, 5));
      if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        chosenMove = picked.move;
        globalBestScore = picked.score;
      }
    }
  }

  const totalTime = Math.max(1, Math.round(performance.now() - startTime));

  return {
    bestMove: chosenMove,
    score: globalBestScore,
    depthReached: currentDepthReached || 1,
    nodesEvaluated: totalNodes,
    timeMs: totalTime,
  };
}
