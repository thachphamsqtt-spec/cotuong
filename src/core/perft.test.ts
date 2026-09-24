import { describe, expect, it } from 'vitest';
import { parseFEN, INITIAL_FEN } from './fen';
import { perft, perftCloneReference } from './perft';

describe('Xiangqi Perft Verification (Standard & Midgame Positions)', () => {
  // 1. Proof of identical node count before and after optimization
  it('proves that optimized in-place perft produces IDENTICAL node counts as reference clone perft', () => {
    const { board: b1 } = parseFEN(INITIAL_FEN);
    const { board: b2 } = parseFEN(INITIAL_FEN);

    // Depth 1 comparison
    const nodeOpt1 = perft(b1, 'red', 1);
    const nodeRef1 = perftCloneReference(b2, 'red', 1);
    expect(nodeOpt1).toBe(nodeRef1);
    expect(nodeOpt1).toBe(44);

    // Depth 2 comparison
    const nodeOpt2 = perft(b1, 'red', 2);
    const nodeRef2 = perftCloneReference(b2, 'red', 2);
    expect(nodeOpt2).toBe(nodeRef2);
    expect(nodeOpt2).toBe(1920);

    // Depth 3 comparison
    const nodeOpt3 = perft(b1, 'red', 3);
    const nodeRef3 = perftCloneReference(b2, 'red', 3);
    expect(nodeOpt3).toBe(nodeRef3);
    expect(nodeOpt3).toBe(79666);
  });

  // 2. Initial position perft up to Depth 4
  // Reference values from standard Xiangqi perft benchmarks (Pikafish / Fairy-Stockfish standard perft suite):
  // Depth 1: 44
  // Depth 2: 1,920
  // Depth 3: 79,666
  // Depth 4: 3,290,240
  it('computes initial position perft depth 4 accurately with 3,290,240 nodes', () => {
    const { board } = parseFEN(INITIAL_FEN);

    const start4 = performance.now();
    const d4 = perft(board, 'red', 4);
    const time4 = performance.now() - start4;

    console.log(`Perft(4) completed: ${d4.toLocaleString()} nodes in ${time4.toFixed(1)}ms`);
    expect(d4).toBe(3290240);
  }, 30000); // 30s timeout for depth 4

  // 3. Test 5 specific midgame positions
  describe('Perft for 5 Special Tactical Positions', () => {
    // Position 1: Cannons with hurdles (Pháo và ngòi)
    // FEN: 3k5/3a5/3C5/3C5/9/9/9/9/9/4K4 w - - 0 1
    // Nguồn: Lõi luật cờ Tướng tính toán (chưa có fixture độc lập từ engine ngoài)
    it('Position 1 - Cannon and hurdles', () => {
      const { board } = parseFEN('3k5/3a5/3C5/3C5/9/9/9/9/9/4K4 w - - 0 1');
      const d1 = perft(board, 'red', 1);
      const d2 = perft(board, 'red', 2);
      expect(d1).toBe(27);
      expect(d2).toBe(39);
    });

    // Position 2: Blocked horse leg (Mã bị cản chân)
    // FEN: 4k4/9/4r4/4N4/4p4/9/9/9/9/4K4 w - - 0 1
    // Nguồn: Lõi luật cờ Tướng tính toán (chưa có fixture độc lập từ engine ngoài)
    it('Position 2 - Blocked horse leg', () => {
      const { board } = parseFEN('4k4/9/4r4/4N4/4p4/9/9/9/9/4K4 w - - 0 1');
      const d1 = perft(board, 'red', 1);
      const d2 = perft(board, 'red', 2);
      expect(d1).toBe(7);
      expect(d2).toBe(88);
    });

    // Position 3: Blocked elephant eye (Tượng bị cản mắt)
    // FEN: 4k4/9/9/9/9/9/9/3p5/9/2B1K1B2 w - - 0 1
    // Nguồn: Lõi luật cờ Tướng tính toán (chưa có fixture độc lập từ engine ngoài)
    it('Position 3 - Blocked elephant eye', () => {
      const { board } = parseFEN('4k4/9/9/9/9/9/9/3p5/9/2B1K1B2 w - - 0 1');
      const d1 = perft(board, 'red', 1);
      const d2 = perft(board, 'red', 2);
      expect(d1).toBe(4);
      expect(d2).toBe(23);
    });

    // Position 4: Flying Generals shielding column (Hai Tướng gần đối mặt)
    // FEN: 4k4/9/9/9/4R4/9/9/9/9/4K4 w - - 0 1
    // Nguồn: Lõi luật cờ Tướng tính toán (chưa có fixture độc lập từ engine ngoài)
    it('Position 4 - Flying generals shielding', () => {
      const { board } = parseFEN('4k4/9/9/9/4R4/9/9/9/9/4K4 w - - 0 1');
      const d1 = perft(board, 'red', 1);
      expect(d1).toBe(11);
    });

    // Position 5: King currently in check (Tướng đang bị chiếu)
    // FEN: 4k4/9/9/9/9/9/9/9/4r4/4K4 w - - 0 1
    // Nguồn: Lõi luật cờ Tướng tính toán (chưa có fixture độc lập từ engine ngoài)
    it('Position 5 - In-check evasion', () => {
      const { board } = parseFEN('4k4/9/9/9/9/9/9/9/4r4/4K4 w - - 0 1');
      const d1 = perft(board, 'red', 1);
      expect(d1).toBe(2);
    });
  });
});
