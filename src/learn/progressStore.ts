export interface UserProgress {
  completedLessons: string[];
  currentLessonId: string;
  quizScores: Record<string, number>;
  unlockedLevel: number;
}

const STORAGE_KEY = 'daycotuong_user_progress';

const DEFAULT_PROGRESS: UserProgress = {
  completedLessons: [],
  currentLessonId: 'l1-01-ban-co',
  quizScores: {},
  unlockedLevel: 1,
};

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save user progress', err);
  }
}

export function markLessonCompleted(lessonId: string, level: number): UserProgress {
  const current = loadUserProgress();
  const completed = new Set(current.completedLessons);
  completed.add(lessonId);

  // If user completed lessons in current level, unlock next level
  const nextUnlocked = Math.max(current.unlockedLevel, level + 1);

  const updated: UserProgress = {
    ...current,
    completedLessons: Array.from(completed),
    unlockedLevel: nextUnlocked,
  };
  saveUserProgress(updated);
  return updated;
}
