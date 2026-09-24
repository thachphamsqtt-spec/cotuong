import { describe, expect, it } from 'vitest';
import { parseFEN, boardToFEN, validateFEN } from './fen';
import { toVietnameseNotation } from './vietnameseNotation';
import { createEmptyBoard } from './board';
import { PUZZLES } from '../practice/puzzleData';
import { CURRICULUM } from '../learn/curriculumData';
import { TryStep } from '../learn/types';

describe('FEN Parser, Exporter & Validator', () => {
  it('correctly validates structural errors with throw Error', () => {
    // 1. Less than 10 rows
    expect(() => parseFEN('rnbakabnr/9/1c5c1/p1p1p1p1p w - - 0 1')).toThrow(/expected 10 rows/);

    // 2. Invalid piece character
    expect(() => parseFEN('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAXABNR w - - 0 1')).toThrow(/Invalid piece character/);

    // 3. Row with incorrect number of squares (e.g. 10 instead of 9)
    expect(() => parseFEN('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR1 w - - 0 1')).toThrow(/expected 9 columns/);
  });

  it('provides rule validation report (warnings/options) without breaking parser', () => {
    // Normal FEN
    const validReport = validateFEN('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');
    expect(validReport.valid).toBe(true);
    expect(validReport.ruleErrors.length).toBe(0);

    // FEN with King outside palace
    const kingOutside = validateFEN('4k4/9/9/9/9/9/9/9/9/K8 w - - 0 1');
    expect(kingOutside.ruleErrors.some((e) => e.includes('Palace') || e.includes('Cung'))).toBe(true);

    // FEN with Black Elephant across river (row 6 / rank 4)
    const elephantAcross = validateFEN('4k4/9/9/9/9/9/2b6/9/9/4K4 w - - 0 1');
    expect(elephantAcross.ruleErrors.some((e) => e.includes('Elephant') || e.includes('Tượng'))).toBe(true);

    // FEN with facing generals
    const facingGen = validateFEN('4k4/9/9/9/9/9/9/9/9/4K4 w - - 0 1');
    expect(facingGen.ruleErrors.some((e) => e.includes('Facing') || e.includes('Lộ mặt Tướng'))).toBe(true);
  });

  it('performs perfect FEN roundtrip (parse -> boardToFEN -> string match)', () => {
    const fens = [
      'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1',
      '4ka3/4a4/9/9/9/9/9/9/R8/4K4 w - - 0 1',
      '3k5/3a5/3C5/3C5/9/9/9/9/9/4K4 w - - 0 1',
      '4k4/9/4b4/2c3n2/9/9/9/9/1R7/4K4 w - - 0 1',
    ];

    fens.forEach((fen) => {
      const parsed = parseFEN(fen);
      const exported = boardToFEN(parsed.board, parsed.turn, parsed.halfMoves, parsed.fullMoves);
      expect(exported).toBe(fen);
    });
  });

  it('validates that all FENs in Curriculum and Practice are structurally valid', () => {
    // 1. All Puzzles
    PUZZLES.forEach((puz) => {
      expect(() => parseFEN(puz.fen)).not.toThrow();
    });

    // 2. All Curriculum steps
    CURRICULUM.forEach((lesson) => {
      lesson.steps.forEach((step) => {
        if ('fen' in step && step.fen) {
          expect(() => parseFEN((step as any).fen)).not.toThrow();
        }
      });
    });
  });
});

describe('Vietnamese Notation with Complex & Multi-pawn scenarios', () => {
  it('correctly formats standard 1-piece moves', () => {
    const board = createEmptyBoard();
    // Red Cannon at h3 (col 7, row 7 -> Col 2 for Red). Moves to e3 (col 4, row 7 -> Col 5 for Red)
    board[7][7] = { id: 'c1', side: 'red', type: 'cannon', square: 'h3' };
    const move = { from: 'h3' as const, to: 'e3' as const, piece: 'cannon' as const, side: 'red' as const };
    
    expect(toVietnameseNotation(board, move, 'full')).toBe('Pháo 2 bình 5');
    expect(toVietnameseNotation(board, move, 'short')).toBe('P2-5');
  });

  it('correctly disambiguates 2 pieces of same type on same column (Tiền / Hậu)', () => {
    const board = createEmptyBoard();
    // Two Red Rooks on column a (col 0 -> Col 9 for Red): a2 (row 8) and a6 (row 4)
    board[4][0] = { id: 'r1', side: 'red', type: 'rook', square: 'a6' }; // Front (trước)
    board[8][0] = { id: 'r2', side: 'red', type: 'rook', square: 'a2' }; // Back (sau)

    // Move front rook forward to a7 (row 3)
    const moveFront = { from: 'a6' as const, to: 'a7' as const, piece: 'rook' as const, side: 'red' as const };
    expect(toVietnameseNotation(board, moveFront, 'full')).toBe('Xe trước tiến 1');
    expect(toVietnameseNotation(board, moveFront, 'short')).toBe('Tiền X.1');

    // Move back rook forward to a5 (row 5)
    const moveBack = { from: 'a2' as const, to: 'a5' as const, piece: 'rook' as const, side: 'red' as const };
    expect(toVietnameseNotation(board, moveBack, 'full')).toBe('Xe sau tiến 3');
    expect(toVietnameseNotation(board, moveBack, 'short')).toBe('Hậu X.3');
  });

  it('correctly disambiguates 3 Pawns on the same column (Tiền / Trung / Hậu Tốt)', () => {
    const board = createEmptyBoard();
    // 3 Red Pawns on column e (col 4 -> Col 5 for Red): e7 (row 3), e6 (row 4), e5 (row 5)
    board[3][4] = { id: 'p1', side: 'red', type: 'pawn', square: 'e7' }; // Front (Tiền)
    board[4][4] = { id: 'p2', side: 'red', type: 'pawn', square: 'e6' }; // Middle (Trung)
    board[5][4] = { id: 'p3', side: 'red', type: 'pawn', square: 'e5' }; // Rear (Hậu)

    // Move front pawn sideways to d7 (col 3 -> Col 6 for Red)
    const moveFront = { from: 'e7' as const, to: 'd7' as const, piece: 'pawn' as const, side: 'red' as const };
    expect(toVietnameseNotation(board, moveFront, 'full')).toBe('Tiền Tốt bình 6');
    expect(toVietnameseNotation(board, moveFront, 'short')).toBe('Tiền B-6');

    // Move middle pawn forward to e7 (row 3)
    // First remove front pawn to allow move
    board[3][4] = null;
    const moveMid = { from: 'e6' as const, to: 'e7' as const, piece: 'pawn' as const, side: 'red' as const };
    // Put back 3 pawns configuration: e6 (row 4), e5 (row 5), e4 (row 6)
    board[4][4] = { id: 'p2', side: 'red', type: 'pawn', square: 'e6' };
    board[5][4] = { id: 'p3', side: 'red', type: 'pawn', square: 'e5' };
    board[6][4] = { id: 'p4', side: 'red', type: 'pawn', square: 'e4' };

    const moveMiddle = { from: 'e5' as const, to: 'd5' as const, piece: 'pawn' as const, side: 'red' as const };
    expect(toVietnameseNotation(board, moveMiddle, 'full')).toBe('Trung Tốt bình 6');
    expect(toVietnameseNotation(board, moveMiddle, 'short')).toBe('Trung B-6');

    const moveRear = { from: 'e4' as const, to: 'e5' as const, piece: 'pawn' as const, side: 'red' as const };
    // board before move has e4 advancing to empty e5
    board[5][4] = null;
    // Set 3 pawns on col: e7, e6, e4
    board[3][4] = { id: 'p1', side: 'red', type: 'pawn', square: 'e7' };
    board[4][4] = { id: 'p2', side: 'red', type: 'pawn', square: 'e6' };
    board[6][4] = { id: 'p4', side: 'red', type: 'pawn', square: 'e4' };
    expect(toVietnameseNotation(board, moveRear, 'full')).toBe('Hậu Tốt tiến 1');
    expect(toVietnameseNotation(board, moveRear, 'short')).toBe('Hậu B.1');
  });

  it('correctly disambiguates 4+ Pawns on the same column with numeric ordering (Tốt 1..5)', () => {
    const board = createEmptyBoard();
    // 4 Red Pawns on column c (col 2 -> Col 7 for Red): c8 (row 2), c7 (row 3), c6 (row 4), c5 (row 5)
    board[2][2] = { id: 'p1', side: 'red', type: 'pawn', square: 'c8' }; // Pawn 1
    board[3][2] = { id: 'p2', side: 'red', type: 'pawn', square: 'c7' }; // Pawn 2
    board[4][2] = { id: 'p3', side: 'red', type: 'pawn', square: 'c6' }; // Pawn 3
    board[5][2] = { id: 'p4', side: 'red', type: 'pawn', square: 'c5' }; // Pawn 4

    const moveP3 = { from: 'c6' as const, to: 'd6' as const, piece: 'pawn' as const, side: 'red' as const };
    expect(toVietnameseNotation(board, moveP3, 'full')).toBe('Tốt 3 bình 6');
    expect(toVietnameseNotation(board, moveP3, 'short')).toBe('B3-6');
  });
});
