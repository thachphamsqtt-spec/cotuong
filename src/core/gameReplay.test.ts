import { describe, expect, it } from 'vitest';
import { XiangqiGame } from './gameEngine';
import gamesData from '../../test/fixtures/games/auto_generated_games.json';

export interface RecordedGame {
  id: string;
  source: string;
  initialFen: string;
  totalMoves: number;
  result: 'red_win' | 'black_win' | 'draw';
  finalStatus: string;
  moves: { from: string; to: string }[];
}

const games: RecordedGame[] = gamesData as RecordedGame[];

describe('Full Game Replay & Regression Verification (30 Games)', () => {

  it(`has exactly 30 recorded regression games in fixture`, () => {
    expect(games.length).toBe(30);
    games.forEach((g) => {
      expect(g.source).toContain('Tự sinh bởi AI dự án');
      expect(g.totalMoves).toBeGreaterThan(0);
      expect(g.moves.length).toBe(g.totalMoves);
    });
  });

  games.forEach((gameData, index) => {
    it(`Replays Game ${index + 1} (${gameData.id}, ${gameData.totalMoves} moves): all moves legal & final status matches`, () => {
      const game = new XiangqiGame(gameData.initialFen);

      gameData.moves.forEach((m, moveIdx) => {
        const res = game.makeMove(m.from, m.to);
        expect(
          res.success,
          `Move ${moveIdx + 1} (${m.from} -> ${m.to}) must be accepted by game engine in ${gameData.id}`
        ).toBe(true);
      });

      expect(game.getStatus()).toBe(gameData.finalStatus);
      expect(game.getHistory().length).toBe(gameData.totalMoves);
    });
  });
});
