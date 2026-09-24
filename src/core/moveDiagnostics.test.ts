import { describe, it, expect } from 'vitest';
import { diagnoseIllegalMove } from './moveDiagnostics';
import { parseFEN } from './fen';

describe('Move Diagnostics Helper', () => {
  it('diagnoses horse leg blockage (cản chân Mã)', () => {
    const { board } = parseFEN();
    // In initial board: Red Horse at h1 (col 7, row 9). Legal moves: g3, i3.
    // If moving to f2 (invalid step):
    const diag = diagnoseIllegalMove(board, 'h1', 'f2', 'red');
    expect(diag).toContain('Quân Mã');
  });

  it('diagnoses elephant crossing the river (Tượng qua sông)', () => {
    const fen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/4B4/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
    const { board } = parseFEN(fen);
    // Red Elephant at e5 (row 5, col 4). If attempting to jump to c7 across the river:
    const diag = diagnoseIllegalMove(board, 'e5', 'c7', 'red');
    expect(diag).toContain('qua sông');
  });

  it('diagnoses general leaving palace', () => {
    // Custom FEN with solitary General at d3 (row 7, col 3)
    const fen = '4k4/9/9/9/9/9/9/3K5/9/9 w - - 0 1';
    const { board } = parseFEN(fen);
    // Red General at d3 (row 7, col 3). Attempting to step left to c3 (col 2, outside palace):
    const diag = diagnoseIllegalMove(board, 'd3', 'c3', 'red');
    expect(diag).toContain('Cung Cấm');
  });

  it('diagnoses pawn moving backward', () => {
    const { board } = parseFEN('rnbakabnr/9/1c5c1/p1p1p1p1p/4P4/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');
    // Red Pawn at e6 (row 4, col 4). Attempting to move backward to e5 (row 5, col 4)
    const diag = diagnoseIllegalMove(board, 'e6', 'e5', 'red');
    expect(diag).toContain('lùi');
  });
});
