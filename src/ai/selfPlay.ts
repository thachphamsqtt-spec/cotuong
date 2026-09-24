import { XiangqiGame } from '../core/gameEngine';
import { INITIAL_FEN } from '../core/fen';
import { searchBestMove } from './search';
import { getDifficultyConfig } from './difficulty';
import { Side } from '../core/types';

export interface MatchResult {
  winner: Side | 'draw';
  moveCount: number;
  reason: string;
}

export interface SelfPlaySummary {
  levelA: number;
  levelB: number;
  totalGames: number;
  levelAWins: number;
  levelBWins: number;
  draws: number;
  levelAWinRate: number;
}

/**
 * Plays a single game between two AI levels.
 */
export function playMatch(
  levelRed: number,
  levelBlack: number,
  initialFen: string = INITIAL_FEN,
  maxMoves: number = 100
): MatchResult {
  const game = new XiangqiGame(initialFen);
  const configRed = getDifficultyConfig(levelRed);
  const configBlack = getDifficultyConfig(levelBlack);

  while (game.getStatus() === 'playing' && game.getHistory().length < maxMoves) {
    const currentTurn = game.getTurn();
    const currentConfig = currentTurn === 'red' ? configRed : configBlack;

    const result = searchBestMove(game.getBoard(), currentTurn, {
      depth: currentConfig.depth,
      timeLimitMs: currentConfig.timeLimitMs,
      randomness: currentConfig.blunderRate,
    });

    if (!result.bestMove) {
      // No legal move
      return {
        winner: currentTurn === 'red' ? 'black' : 'red',
        moveCount: game.getHistory().length,
        reason: 'no_legal_moves',
      };
    }

    const { success } = game.makeMove(result.bestMove.from, result.bestMove.to);
    if (!success) {
      return {
        winner: currentTurn === 'red' ? 'black' : 'red',
        moveCount: game.getHistory().length,
        reason: 'illegal_move_attempted',
      };
    }
  }

  const status = game.getStatus();
  if (status === 'checkmate' || status === 'stalemate' || status === 'loss_perpetual_check') {
    // Current turn player lost
    return {
      winner: game.getTurn() === 'red' ? 'black' : 'red',
      moveCount: game.getHistory().length,
      reason: status,
    };
  }

  return {
    winner: 'draw',
    moveCount: game.getHistory().length,
    reason: status === 'playing' ? 'max_moves_reached' : status,
  };
}

/**
 * Runs a self-play benchmark between Level A and Level B with alternating colors.
 */
export function runSelfPlayBenchmark(
  levelA: number,
  levelB: number,
  numGames: number = 10
): SelfPlaySummary {
  let levelAWins = 0;
  let levelBWins = 0;
  let draws = 0;

  for (let i = 0; i < numGames; i++) {
    const aIsRed = i % 2 === 0;
    const levelRed = aIsRed ? levelA : levelB;
    const levelBlack = aIsRed ? levelB : levelA;

    const match = playMatch(levelRed, levelBlack);

    if (match.winner === 'draw') {
      draws++;
    } else if ((match.winner === 'red' && aIsRed) || (match.winner === 'black' && !aIsRed)) {
      levelAWins++;
    } else {
      levelBWins++;
    }
  }

  const levelAWinRate = (levelAWins + 0.5 * draws) / Math.max(1, numGames);

  return {
    levelA,
    levelB,
    totalGames: numGames,
    levelAWins,
    levelBWins,
    draws,
    levelAWinRate: Math.round(levelAWinRate * 100) / 100,
  };
}
