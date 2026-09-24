import { XiangqiGame } from '../src/core/gameEngine';
import { searchBestMove } from '../src/ai/search';
import * as fs from 'fs';
import * as path from 'path';

export interface RecordedGame {
  id: string;
  source: string;
  initialFen: string;
  totalMoves: number;
  result: 'red_win' | 'black_win' | 'draw';
  finalStatus: string;
  moves: { from: string; to: string }[];
}

function generate30Games(): RecordedGame[] {
  const games: RecordedGame[] = [];
  console.log('Generating 30 AI vs AI regression games...');

  for (let i = 1; i <= 30; i++) {
    const game = new XiangqiGame();
    const movesList: { from: string; to: string }[] = [];
    const maxMoves = 40; // cap at 40 moves per game for regression test fixtures

    // Introduce variety using randomness levels (0.1 to 0.4)
    const randomness = 0.1 + (i % 5) * 0.08;
    const depth = 2;

    for (let ply = 0; ply < maxMoves; ply++) {
      const status = game.getStatus();
      if (['checkmate', 'stalemate', 'draw_repetition', 'draw_moves_limit', 'loss_perpetual_check'].includes(status)) {
        break;
      }

      const turn = game.getTurn();
      const res = searchBestMove(game.getBoard(), turn, depth, randomness);
      if (!res.bestMove) break;

      const makeRes = game.makeMove(res.bestMove.from, res.bestMove.to);
      if (!makeRes.success) break;

      movesList.push({ from: res.bestMove.from, to: res.bestMove.to });
    }

    const finalStatus = game.getStatus();
    let result: 'red_win' | 'black_win' | 'draw' = 'draw';
    if (finalStatus === 'checkmate' || finalStatus === 'stalemate') {
      result = game.getTurn() === 'red' ? 'black_win' : 'red_win';
    } else if (finalStatus === 'loss_perpetual_check') {
      result = game.getTurn() === 'red' ? 'black_win' : 'red_win';
    }

    games.push({
      id: `auto_game_${String(i).padStart(2, '0')}`,
      source: 'Tự sinh bởi AI dự án (Minimax + Alpha-Beta) - Dùng cho kiểm thử hồi quy luật cờ (Regression Test), không phải bằng chứng độc lập từ ván đấu thực tế ngoài đời',
      initialFen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1',
      totalMoves: movesList.length,
      result,
      finalStatus,
      moves: movesList,
    });
  }

  return games;
}

const fixturesDir = path.join(__dirname, '../test/fixtures/games');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const games = generate30Games();
fs.writeFileSync(
  path.join(fixturesDir, 'auto_generated_games.json'),
  JSON.stringify(games, null, 2),
  'utf-8'
);

console.log(`Generated ${games.length} regression test games in test/fixtures/games/auto_generated_games.json`);
