import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadUserProgress,
  saveUserProgress,
  markLessonCompleted,
  UserProgress,
} from './progressStore';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) {
    delete mockStorage[k];
  }

  // Setup global window and localStorage mock for tests
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) {
        delete mockStorage[k];
      }
    },
  });
});

describe('Learn Progress Store', () => {
  it('loads default progress when storage is empty', () => {
    const progress = loadUserProgress();
    expect(progress.completedLessons).toEqual([]);
    expect(progress.unlockedLevel).toBe(1);
    expect(progress.currentLessonId).toBeDefined();
  });

  it('saves and reloads progress correctly', () => {
    const custom: UserProgress = {
      completedLessons: ['l1-01-ban-co', 'l1-02-tuong-si'],
      currentLessonId: 'l1-03-tuong-ma',
      quizScores: { 'l1-01-ban-co': 100 },
      unlockedLevel: 2,
    };

    saveUserProgress(custom);
    const loaded = loadUserProgress();
    expect(loaded.completedLessons).toHaveLength(2);
    expect(loaded.unlockedLevel).toBe(2);
    expect(loaded.quizScores['l1-01-ban-co']).toBe(100);
  });

  it('marks lesson as completed and unlocks next level', () => {
    const res = markLessonCompleted('l1-01-ban-co', 1);
    expect(res.completedLessons).toContain('l1-01-ban-co');
    expect(res.unlockedLevel).toBeGreaterThanOrEqual(2);

    const reloaded = loadUserProgress();
    expect(reloaded.completedLessons).toContain('l1-01-ban-co');
  });
});
