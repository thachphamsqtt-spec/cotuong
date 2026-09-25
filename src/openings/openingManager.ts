import { Board, Move, Square } from '../core/types';
import { parseFEN, boardToFEN } from '../core/fen';
import { applyMove } from '../core/gameEngine';
import { toVietnameseNotation } from '../core/vietnameseNotation';
import { OPENINGS_DATABASE } from './openingData';
import {
  CandidateContinuation,
  OpeningMove,
  OpeningStats,
  OpeningVariation,
} from './openingTypes';

/**
 * Normalizes a move object with standard Vietnamese notation if missing
 */
export function formatOpeningMoveNotation(board: Board, move: OpeningMove): string {
  if (move.notation) return move.notation;
  const gameMove: Move = {
    from: move.from,
    to: move.to,
    side: board[0] ? (move.from.includes('1') || move.from.includes('2') || move.from.includes('3') || move.from.includes('4') || move.from.includes('5') ? 'red' : 'black') : 'red', // fallback
    piece: 'general',
  };
  return toVietnameseNotation(board, gameMove, 'full');
}

/**
 * Finds all openings that match the provided move sequence from starting position
 */
export function findMatchingOpenings(moveHistory: { from: Square; to: Square }[]): OpeningVariation[] {
  if (moveHistory.length === 0) {
    return OPENINGS_DATABASE;
  }

  return OPENINGS_DATABASE.filter((op) => {
    if (op.moves.length < moveHistory.length) return false;
    for (let i = 0; i < moveHistory.length; i++) {
      if (op.moves[i].from !== moveHistory[i].from || op.moves[i].to !== moveHistory[i].to) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Finds the most specific (deepest match) opening for current move history
 */
export function getPrimaryOpening(moveHistory: { from: Square; to: Square }[]): {
  opening: OpeningVariation | null;
  matchDepth: number;
} {
  let bestMatch: OpeningVariation | null = null;
  let maxDepth = -1;

  for (const op of OPENINGS_DATABASE) {
    let depth = 0;
    const len = Math.min(op.moves.length, moveHistory.length);
    for (let i = 0; i < len; i++) {
      if (op.moves[i].from === moveHistory[i].from && op.moves[i].to === moveHistory[i].to) {
        depth++;
      } else {
        break;
      }
    }
    if (depth > maxDepth && depth > 0) {
      maxDepth = depth;
      bestMatch = op;
    }
  }

  return { opening: bestMatch, matchDepth: maxDepth };
}

/**
 * Get all candidate next moves in the opening database given the current move history
 */
export function getCandidateContinuations(
  currentBoard: Board,
  moveHistory: { from: Square; to: Square }[]
): CandidateContinuation[] {
  const currentIndex = moveHistory.length;
  const candidateMap = new Map<
    string,
    {
      move: OpeningMove;
      matchingOpenings: OpeningVariation[];
      statsList: OpeningStats[];
      commentary?: string;
    }
  >();

  // Look through matching openings
  for (const op of OPENINGS_DATABASE) {
    // Check if this opening matches current history so far
    let matches = true;
    for (let i = 0; i < currentIndex; i++) {
      if (!op.moves[i] || op.moves[i].from !== moveHistory[i].from || op.moves[i].to !== moveHistory[i].to) {
        matches = false;
        break;
      }
    }

    if (matches && op.moves[currentIndex]) {
      const nextMove = op.moves[currentIndex];
      const key = `${nextMove.from}->${nextMove.to}`;

      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          move: nextMove,
          matchingOpenings: [op],
          statsList: [op.stats],
          commentary: nextMove.commentary,
        });
      } else {
        const item = candidateMap.get(key)!;
        item.matchingOpenings.push(op);
        item.statsList.push(op.stats);
        if (!item.commentary && nextMove.commentary) {
          item.commentary = nextMove.commentary;
        }
      }
    }
  }

  const results: CandidateContinuation[] = [];
  candidateMap.forEach(({ move, matchingOpenings, statsList, commentary }) => {
    // Average stats across matching lines
    const avgStats: OpeningStats = {
      redWinRate: Math.round(statsList.reduce((acc, s) => acc + s.redWinRate, 0) / statsList.length),
      drawRate: Math.round(statsList.reduce((acc, s) => acc + s.drawRate, 0) / statsList.length),
      blackWinRate: Math.round(statsList.reduce((acc, s) => acc + s.blackWinRate, 0) / statsList.length),
      popularity: Math.round(statsList.reduce((acc, s) => acc + s.popularity, 0) / statsList.length),
      totalGamesSample: statsList.reduce((acc, s) => acc + (s.totalGamesSample || 0), 0),
    };

    let notation = move.notation || '';
    if (!notation) {
      try {
        const movingPiece = currentBoard.flat().find((p) => p && p.square === move.from);
        if (movingPiece) {
          notation = toVietnameseNotation(
            currentBoard,
            {
              from: move.from,
              to: move.to,
              piece: movingPiece.type,
              side: movingPiece.side,
            },
            'full'
          );
        }
      } catch {
        notation = `${move.from} → ${move.to}`;
      }
    }

    results.push({
      move,
      notation,
      matchingOpenings,
      stats: avgStats,
      commentary,
    });
  });

  // Sort candidates by popularity / win rate
  results.sort((a, b) => b.stats.popularity - a.stats.popularity);
  return results;
}

/**
 * Constructs a sequence of boards from initial FEN by applying moves in order
 */
export function replayOpeningMoves(moves: OpeningMove[], initialFen?: string): {
  boards: Board[];
  fens: string[];
  annotatedMoves: { from: Square; to: Square; notation: string; commentary?: string }[];
} {
  const initial = parseFEN(initialFen);
  let currentBoard = initial.board;
  let currentSide = initial.turn;

  const boards: Board[] = [currentBoard];
  const fens: string[] = [boardToFEN(currentBoard, currentSide)];
  const annotatedMoves: { from: Square; to: Square; notation: string; commentary?: string }[] = [];

  for (const m of moves) {
    const movingPiece = currentBoard.flat().find((p) => p && p.square === m.from);
    let notation = m.notation || '';

    if (movingPiece) {
      if (!notation) {
        try {
          notation = toVietnameseNotation(
            currentBoard,
            {
              from: m.from,
              to: m.to,
              piece: movingPiece.type,
              side: movingPiece.side,
            },
            'full'
          );
        } catch {
          notation = `${m.from} → ${m.to}`;
        }
      }
      currentBoard = applyMove(currentBoard, {
        from: m.from,
        to: m.to,
        piece: movingPiece.type,
        side: movingPiece.side,
      });
      currentSide = currentSide === 'red' ? 'black' : 'red';
      boards.push(currentBoard);
      fens.push(boardToFEN(currentBoard, currentSide));
      annotatedMoves.push({
        from: m.from,
        to: m.to,
        notation,
        commentary: m.commentary,
      });
    }
  }

  return { boards, fens, annotatedMoves };
}
