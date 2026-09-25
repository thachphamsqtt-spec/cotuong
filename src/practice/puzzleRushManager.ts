import { Puzzle } from './types';
import { PUZZLES } from './puzzleData';
import { RushMode, RushHighScores, RushResult, RushPuzzleRecord } from './puzzleRushTypes';

const HIGH_SCORE_KEY_PREFIX = 'cotuong_rush_highscore_';

export function getRushDurationSecs(mode: RushMode): number {
  switch (mode) {
    case '1m':
      return 60;
    case '3m':
      return 180;
    case '5m':
      return 300;
    case 'survival':
      return 0; // Unlimited time
  }
}

export function loadRushHighScores(): RushHighScores {
  try {
    return {
      '1m': parseInt(localStorage.getItem(`${HIGH_SCORE_KEY_PREFIX}1m`) || '0', 10),
      '3m': parseInt(localStorage.getItem(`${HIGH_SCORE_KEY_PREFIX}3m`) || '0', 10),
      '5m': parseInt(localStorage.getItem(`${HIGH_SCORE_KEY_PREFIX}5m`) || '0', 10),
      survival: parseInt(localStorage.getItem(`${HIGH_SCORE_KEY_PREFIX}survival`) || '0', 10),
    };
  } catch {
    return { '1m': 0, '3m': 0, '5m': 0, survival: 0 };
  }
}

export function saveRushHighScore(mode: RushMode, score: number): boolean {
  try {
    const currentHigh = parseInt(localStorage.getItem(`${HIGH_SCORE_KEY_PREFIX}${mode}`) || '0', 10);
    if (score > currentHigh) {
      localStorage.setItem(`${HIGH_SCORE_KEY_PREFIX}${mode}`, score.toString());
      return true;
    }
  } catch {
    // Ignore storage errors
  }
  return false;
}

/**
 * Generates an ordered sequence of puzzles scaled by difficulty:
 * - Early puzzles (Level 1): quick 1-move checkmates
 * - Mid puzzles (Level 2): 2-move tactics & forks
 * - High puzzles (Level 3-4): multi-step combinations
 * Shuffles within each tier to make every run unique.
 */
export function generateRushQueue(): Puzzle[] {
  const byDifficulty: Record<number, Puzzle[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  PUZZLES.forEach((p) => {
    const diff = Math.min(Math.max(p.difficulty, 1), 5);
    byDifficulty[diff].push(p);
  });

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Build a 50+ question queue cycling with progressive difficulty
  const tier1 = shuffle(byDifficulty[1]);
  const tier2 = shuffle(byDifficulty[2]);
  const tier3 = shuffle(byDifficulty[3]);
  const tier4 = shuffle(byDifficulty[4].length ? byDifficulty[4] : byDifficulty[3]);

  const queue: Puzzle[] = [
    ...tier1,
    ...shuffle(tier1),
    ...tier2,
    ...shuffle(tier2),
    ...tier3,
    ...shuffle(tier3),
    ...tier4,
    ...shuffle(PUZZLES),
    ...shuffle(PUZZLES),
  ];

  return queue;
}

export function calculateRushTier(score: number, mode: RushMode): { title: string; badge: string } {
  const benchmark = mode === '1m' ? 8 : mode === '3m' ? 18 : mode === '5m' ? 25 : 20;

  if (score >= benchmark * 1.3) {
    return { title: 'Đặc Cấp Đại Sư Thần Tốc', badge: '👑' };
  }
  if (score >= benchmark) {
    return { title: 'Kiện Tướng Sát Chiêu', badge: '💎' };
  }
  if (score >= benchmark * 0.7) {
    return { title: 'Cao Thủ Phản Xạ', badge: '🥇' };
  }
  if (score >= benchmark * 0.4) {
    return { title: 'Kỳ Thủ Nhanh Nhẹn', badge: '🥈' };
  }
  return { title: 'Kỳ Tập Sự Tốc Độ', badge: '🥉' };
}

export function buildRushSummary(
  mode: RushMode,
  records: RushPuzzleRecord[],
  timeTakenSecs: number
): RushResult {
  const correctCount = records.filter((r) => r.success).length;
  const wrongCount = records.filter((r) => !r.success).length;
  const highScores = loadRushHighScores();
  const bestScore = highScores[mode];
  const isNewBest = correctCount > bestScore;

  if (isNewBest) {
    saveRushHighScore(mode, correctCount);
  }

  const { title, badge } = calculateRushTier(correctCount, mode);

  return {
    mode,
    score: correctCount,
    bestScore: Math.max(bestScore, correctCount),
    isNewBest,
    totalAnswered: records.length,
    correctCount,
    wrongCount,
    timeTakenSecs,
    tierTitle: title,
    tierBadge: badge,
    records,
  };
}
