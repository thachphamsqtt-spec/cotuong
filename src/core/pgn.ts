import { Board, Move, Side } from './types';
import { XiangqiGame, generateLegalMoves } from './gameEngine';
import { parseFEN, INITIAL_FEN } from './fen';
import { toVietnameseNotation } from './vietnameseNotation';

export interface PGNHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  Red?: string;
  Black?: string;
  Result?: string;
  FEN?: string;
  Format?: string;
  [key: string]: string | undefined;
}

export interface ExportPGNOptions {
  headers?: PGNHeaders;
  moves: Move[];
  initialFEN?: string;
  notationFormat?: 'short' | 'full';
}

export interface ParsedPGN {
  headers: PGNHeaders;
  initialFEN: string;
  moves: Move[];
  moveNotations: string[];
  finalFEN: string;
  result: string;
  error?: string;
}

/**
 * Exports a Xiangqi game to standard PGN string format with header tags and movetext.
 */
export function exportToPGN({
  headers = {},
  moves,
  initialFEN = INITIAL_FEN,
  notationFormat = 'short',
}: ExportPGNOptions): string {
  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');

  const defaultHeaders: PGNHeaders = {
    Event: 'Kỳ Đạo Trực Tuyến',
    Site: 'KyDao App',
    Date: currentDate,
    Round: '1',
    Red: 'Người chơi',
    Black: 'AI Kỳ Đạo',
    Result: '*',
    Format: 'WXF/Vietnamese',
    ...headers,
  };

  if (initialFEN && initialFEN !== INITIAL_FEN) {
    defaultHeaders.FEN = initialFEN;
  }

  // Format header tags
  const headerLines: string[] = [];
  for (const [key, value] of Object.entries(defaultHeaders)) {
    if (value !== undefined) {
      headerLines.push(`[${key} "${value}"]`);
    }
  }

  // Build movetext
  const game = new XiangqiGame(initialFEN);
  const movePairs: string[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const boardBefore = game.getBoard();
    const notation = toVietnameseNotation(boardBefore, move, notationFormat);
    game.makeMove(move.from, move.to);

    if (i % 2 === 0) {
      const moveNum = Math.floor(i / 2) + 1;
      movePairs.push(`${moveNum}. ${notation}`);
    } else {
      movePairs[movePairs.length - 1] += ` ${notation}`;
    }
  }

  const movetext = movePairs.join(' ') + (movePairs.length > 0 ? ` ${defaultHeaders.Result || '*'}` : '');

  return `${headerLines.join('\n')}\n\n${movetext}\n`;
}

/**
 * Parses a PGN string or text containing PGN headers and moves.
 * Replays moves using the engine to ensure accuracy and generate Move objects.
 */
export function parsePGN(pgnText: string): ParsedPGN {
  const headers: PGNHeaders = {};
  let text = pgnText.trim();

  // Extract header tags [Key "Value"]
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(text)) !== null) {
    headers[match[1]] = match[2];
  }

  // Remove header tags to isolate movetext
  const movetext = text.replace(/\[\w+\s+"[^"]*"\]/g, '').trim();

  const initialFEN = headers.FEN || INITIAL_FEN;
  const game = new XiangqiGame(initialFEN);
  const moves: Move[] = [];
  const moveNotations: string[] = [];

  // Remove comments { ... } or ( ... ) and strip results like 1-0, 0-1, 1/2-1/2, *
  const cleanedMovetext = movetext
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)$/, '')
    .trim();

  // Tokens can be move numbers (1., 2.) or move strings (e.g. P2-5, b2e2, Pháo 2 bình 5, etc.)
  // Let's split by tokens
  if (cleanedMovetext.length > 0) {
    // If moves are formatted as coordinate tokens like 'b2e2 h0g2'
    // Or standard algebraic / vietnamese notation
    const rawTokens = cleanedMovetext.split(/\s+/).filter(Boolean);
    let tokenIndex = 0;

    while (tokenIndex < rawTokens.length) {
      const token = rawTokens[tokenIndex];

      // Skip move numbering like "1." or "1..."
      if (/^\d+\.+$/.test(token)) {
        tokenIndex++;
        continue;
      }

      // Check if coordinate format like "b3e3" or "b10c8"
      const coordMatch = token.match(/^([a-i](?:10|[1-9]))([a-i](?:10|[1-9]))$/i);
      if (coordMatch) {
        const from = coordMatch[1].toLowerCase() as any;
        const to = coordMatch[2].toLowerCase() as any;
        const res = game.makeMove(from, to);
        if (res.success && res.move) {
          moves.push(res.move);
          moveNotations.push(token);
          tokenIndex++;
          continue;
        }
      }

      // Try multi-word Vietnamese notation (e.g. "Pháo", "2", "bình", "5") or short notation (e.g. "P2-5", "M2.3", "X1/2")
      let moveMatched = false;
      const legalMoves = generateLegalMoves(game.getBoard(), game.getTurn());

      // First check if token directly matches short Vietnamese notation
      for (const lm of legalMoves) {
        const shortVi = toVietnameseNotation(game.getBoard(), lm, 'short');
        const cleanShort = shortVi.replace(/\s+/g, '').toLowerCase();
        const cleanToken = token.replace(/\s+/g, '').toLowerCase();

        if (cleanShort === cleanToken || shortVi.toLowerCase() === token.toLowerCase()) {
          const res = game.makeMove(lm.from, lm.to);
          if (res.success && res.move) {
            moves.push(res.move);
            moveNotations.push(shortVi);
            moveMatched = true;
            tokenIndex++;
            break;
          }
        }
      }

      if (moveMatched) continue;

      // Check multi-word phrase (up to 4 tokens ahead, e.g. "Pháo 2 bình 5" or "Tiền Tốt tiến 1")
      for (let lookahead = 4; lookahead >= 2; lookahead--) {
        if (tokenIndex + lookahead <= rawTokens.length) {
          const phrase = rawTokens.slice(tokenIndex, tokenIndex + lookahead).join(' ');
          for (const lm of legalMoves) {
            const fullVi = toVietnameseNotation(game.getBoard(), lm, 'full');
            if (fullVi.toLowerCase() === phrase.toLowerCase()) {
              const res = game.makeMove(lm.from, lm.to);
              if (res.success && res.move) {
                moves.push(res.move);
                moveNotations.push(fullVi);
                moveMatched = true;
                tokenIndex += lookahead;
                break;
              }
            }
          }
          if (moveMatched) break;
        }
      }

      if (!moveMatched) {
        // If could not match, advance one token to prevent infinite loop
        tokenIndex++;
      }
    }
  }

  return {
    headers,
    initialFEN,
    moves,
    moveNotations,
    finalFEN: game.getFEN(),
    result: headers.Result || '*',
  };
}
