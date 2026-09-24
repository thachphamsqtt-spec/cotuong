import { Board, DEFAULT_RULESET, GameSnapshot, GameStatus, Move, Piece, RuleSet, Side } from './types';
import { cloneBoard, findGeneral, getAllPieces, isInsideBoard, parseSquare } from './board';
import { areGeneralsFacing, generatePseudoLegalMovesForPiece } from './moveRules';
import { boardToFEN, INITIAL_FEN, parseFEN } from './fen';

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const { row: fromR, col: fromC } = parseSquare(move.from);
  const { row: toR, col: toC } = parseSquare(move.to);

  const piece = next[fromR][fromC];
  if (!piece) {
    throw new Error(`No piece at ${move.from}`);
  }

  next[fromR][fromC] = null;
  piece.square = move.to;
  next[toR][toC] = piece;

  return next;
}

export function isCheck(board: Board, side: Side): boolean {
  const general = findGeneral(board, side);
  if (!general) return false;

  const { row, col } = parseSquare(general.square);
  const enemySide: Side = side === 'red' ? 'black' : 'red';

  // 1. Check Orthogonal rays (Rook, Cannon, Enemy General)
  const directions = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1],  // Right
  ];

  for (const [dr, dc] of directions) {
    let nr = row + dr;
    let nc = col + dc;
    let hurdleCount = 0;

    while (isInsideBoard(nr, nc)) {
      const piece = board[nr][nc];
      if (piece !== null) {
        if (hurdleCount === 0) {
          // First piece encountered
          if (piece.side === enemySide) {
            if (piece.type === 'rook') return true;
            // Flying General check along column
            if (piece.type === 'general' && dc === 0) return true;
          }
          hurdleCount = 1;
        } else if (hurdleCount === 1) {
          // Second piece encountered behind 1 hurdle
          if (piece.side === enemySide && piece.type === 'cannon') {
            return true;
          }
          break; // Stop ray after 2nd piece
        }
      }
      nr += dr;
      nc += dc;
    }
  }

  // 2. Check Horse attacks (8 possible Knight jump origins attacking General)
  const horseChecks = [
    // [horseR, horseC, legR, legC]
    [row - 2, col - 1, row - 1, col - 1],
    [row - 2, col + 1, row - 1, col + 1],
    [row + 2, col - 1, row + 1, col - 1],
    [row + 2, col + 1, row + 1, col + 1],
    [row - 1, col - 2, row - 1, col - 1],
    [row + 1, col - 2, row + 1, col - 1],
    [row - 1, col + 2, row - 1, col + 1],
    [row + 1, col + 2, row + 1, col + 1],
  ];

  for (const [hr, hc, lr, lc] of horseChecks) {
    if (isInsideBoard(hr, hc) && isInsideBoard(lr, lc)) {
      const horsePiece = board[hr][hc];
      if (horsePiece && horsePiece.side === enemySide && horsePiece.type === 'horse') {
        if (board[lr][lc] === null) {
          // Horse leg is open -> Horse checks General!
          return true;
        }
      }
    }
  }

  // 3. Check Pawn attacks
  // For Red General: attacked by Black Pawn from North (row - 1), East (col + 1), West (col - 1)
  // For Black General: attacked by Red Pawn from South (row + 1), East (col + 1), West (col - 1)
  const pawnForwardRow = side === 'red' ? row - 1 : row + 1;
  const pawnCheckSquares = [
    [pawnForwardRow, col],
    [row, col - 1],
    [row, col + 1],
  ];

  for (const [pr, pc] of pawnCheckSquares) {
    if (isInsideBoard(pr, pc)) {
      const pawnPiece = board[pr][pc];
      if (pawnPiece && pawnPiece.side === enemySide && pawnPiece.type === 'pawn') {
        return true;
      }
    }
  }

  return false;
}

export function generateLegalMoves(board: Board, side: Side): Move[] {
  const legalMoves: Move[] = [];
  const friendlyPieces = getAllPieces(board, side);
  const enemySide: Side = side === 'red' ? 'black' : 'red';

  for (const piece of friendlyPieces) {
    const pseudoMoves = generatePseudoLegalMovesForPiece(board, piece);
    const { row: fromR, col: fromC } = parseSquare(piece.square);

    for (const move of pseudoMoves) {
      const { row: toR, col: toC } = parseSquare(move.to);
      const targetPiece = board[toR][toC];

      // In-place make
      board[fromR][fromC] = null;
      board[toR][toC] = piece;
      piece.square = move.to;

      const inCheckSelf = isCheck(board, side);
      const generalsFacing = areGeneralsFacing(board);

      if (!inCheckSelf && !generalsFacing) {
        move.isCheck = isCheck(board, enemySide);
        legalMoves.push(move);
      }

      // In-place unmake
      board[fromR][fromC] = piece;
      board[toR][toC] = targetPiece;
      piece.square = move.from;
    }
  }

  return legalMoves;
}

export function isLegalMove(board: Board, move: Move): boolean {
  const legalMoves = generateLegalMoves(board, move.side);
  return legalMoves.some((m) => m.from === move.from && m.to === move.to);
}

export function getGameStatus(
  board: Board,
  turn: Side,
  fenHistory: string[] = [],
  halfMovesNoCapture: number = 0,
  history: Move[] = [],
  ruleSet: RuleSet = DEFAULT_RULESET
): GameStatus {
  const inCheck = isCheck(board, turn);
  const legalMoves = generateLegalMoves(board, turn);

  if (legalMoves.length === 0) {
    // In Xiangqi:
    // If in check and no legal moves -> Checkmate (chiếu bí)
    // If NOT in check but no legal moves -> Stalemate (bị nhốt), active player LOSES!
    return inCheck ? 'checkmate' : 'stalemate';
  }

  // Check 60-move rule without capture (120 half-moves by default)
  if (halfMovesNoCapture >= ruleSet.maxHalfMovesNoCapture) {
    return 'draw_moves_limit';
  }

  // Check repetition: matching (board + active turn)
  if (fenHistory.length >= 6) {
    const currentFenParts = boardToFEN(board, turn).split(' ');
    const currentStateKey = `${currentFenParts[0]} ${currentFenParts[1]}`;

    const matchIndices: number[] = [];
    fenHistory.forEach((f, idx) => {
      const parts = f.split(' ');
      if (`${parts[0]} ${parts[1]}` === currentStateKey) {
        matchIndices.push(idx);
      }
    });

    if (matchIndices.length >= ruleSet.repetitionThreshold) {
      if (ruleSet.banPerpetualCheck && history.length > 0) {
        // Cycle of moves between first and last occurrence
        const firstIdx = matchIndices[0];
        const lastIdx = matchIndices[matchIndices.length - 1];

        // Moves in the cycle
        const cycleMoves = history.slice(firstIdx, lastIdx);

        const redMoves = cycleMoves.filter((m) => m.side === 'red');
        const blackMoves = cycleMoves.filter((m) => m.side === 'black');

        const redPerpetual = redMoves.length > 0 && redMoves.every((m) => m.isCheck === true);
        const blackPerpetual = blackMoves.length > 0 && blackMoves.every((m) => m.isCheck === true);

        if (redPerpetual && !blackPerpetual) {
          return 'loss_perpetual_check';
        }
        if (blackPerpetual && !redPerpetual) {
          return 'loss_perpetual_check';
        }
      }

      return 'draw_repetition';
    }
  }

  return inCheck ? 'check' : 'playing';
}

export class XiangqiGame {
  private board: Board;
  private turn: Side;
  private status: GameStatus;
  private history: Move[] = [];
  private fenHistory: string[] = [];
  private halfMovesNoCapture = 0;
  private fullMoveNumber = 1;
  private ruleSet: RuleSet;

  constructor(fen: string = INITIAL_FEN, ruleSet: RuleSet = DEFAULT_RULESET) {
    const parsed = parseFEN(fen);
    this.board = parsed.board;
    this.turn = parsed.turn;
    this.halfMovesNoCapture = parsed.halfMoves;
    this.fullMoveNumber = parsed.fullMoves;
    this.ruleSet = ruleSet;
    this.fenHistory.push(boardToFEN(this.board, this.turn));
    this.status = getGameStatus(
      this.board,
      this.turn,
      this.fenHistory,
      this.halfMovesNoCapture,
      this.history,
      this.ruleSet
    );
  }

  getBoard(): Board {
    return this.board;
  }

  getTurn(): Side {
    return this.turn;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getHistory(): Move[] {
    return [...this.history];
  }

  getLastMove(): Move | undefined {
    return this.history[this.history.length - 1];
  }

  getLegalMoves(): Move[] {
    return generateLegalMoves(this.board, this.turn);
  }

  getMovesForPiece(square: string): Move[] {
    return this.getLegalMoves().filter((m) => m.from === square);
  }

  makeMove(from: string, to: string): { success: boolean; move?: Move; status: GameStatus } {
    const legalMoves = this.getLegalMoves();
    const chosen = legalMoves.find((m) => m.from === from && m.to === to);

    if (!chosen) {
      return { success: false, status: this.status };
    }

    this.board = applyMove(this.board, chosen);
    
    // Tag isCheck on the move
    const opponentSide: Side = chosen.side === 'red' ? 'black' : 'red';
    chosen.isCheck = isCheck(this.board, opponentSide);
    
    this.history.push(chosen);

    if (chosen.captured) {
      this.halfMovesNoCapture = 0;
    } else {
      this.halfMovesNoCapture++;
    }

    if (this.turn === 'black') {
      this.fullMoveNumber++;
      this.turn = 'red';
    } else {
      this.turn = 'black';
    }

    const currentFen = boardToFEN(this.board, this.turn, this.halfMovesNoCapture, this.fullMoveNumber);
    this.fenHistory.push(currentFen);
    this.status = getGameStatus(
      this.board,
      this.turn,
      this.fenHistory,
      this.halfMovesNoCapture,
      this.history,
      this.ruleSet
    );

    return { success: true, move: chosen, status: this.status };
  }

  undo(): boolean {
    if (this.history.length === 0) return false;

    this.history.pop();
    this.fenHistory.pop();

    if (this.fenHistory.length === 0) {
      const parsed = parseFEN(INITIAL_FEN);
      this.board = parsed.board;
      this.turn = parsed.turn;
    } else {
      const lastFen = this.fenHistory[this.fenHistory.length - 1];
      const parsed = parseFEN(lastFen);
      this.board = parsed.board;
      this.turn = parsed.turn;
    }

    this.status = getGameStatus(
      this.board,
      this.turn,
      this.fenHistory,
      this.halfMovesNoCapture,
      this.history,
      this.ruleSet
    );
    return true;
  }

  getFEN(): string {
    return boardToFEN(this.board, this.turn, this.halfMovesNoCapture, this.fullMoveNumber);
  }

  getSnapshot(): GameSnapshot {
    return {
      board: cloneBoard(this.board),
      turn: this.turn,
      status: this.status,
      lastMove: this.getLastMove(),
      halfMovesNoCapture: this.halfMovesNoCapture,
      fullMoveNumber: this.fullMoveNumber,
      history: [...this.history],
      fenHistory: [...this.fenHistory],
    };
  }
}
