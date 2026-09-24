import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
  saveGameToHistory,
  loadGameHistory,
  deleteGameFromHistory,
  clearAllGameHistory,
  ActiveGameState,
  StoredGameRecord,
} from './gameStorage';
import { INITIAL_FEN } from '../core/fen';

describe('Game Storage & Persistence', () => {
  const memoryStore = new Map<string, string>();

  beforeAll(() => {
    // Provide a mocked localStorage for node environment testing
    const mockStorage = {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStore.set(key, String(value));
      },
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
      clear: () => {
        memoryStore.clear();
      },
      key: (_i: number) => null,
      length: 0,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    memoryStore.clear();
  });

  it('saves, loads, and clears active game state', () => {
    expect(loadActiveGame()).toBeNull();

    const activeState: ActiveGameState = {
      initialFEN: INITIAL_FEN,
      moves: [{ from: 'b3', to: 'e3', piece: 'cannon', side: 'red' }],
      moveNotations: [{ notation: 'Pháo 2 bình 5', move: { from: 'b3', to: 'e3', piece: 'cannon', side: 'red' } }],
      playerSide: 'red',
      aiLevel: 3,
      timeControl: '10m',
      redTime: 590,
      blackTime: 600,
      updatedAt: Date.now(),
    };

    saveActiveGame(activeState);
    const loaded = loadActiveGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.moves.length).toBe(1);
    expect(loaded?.moves[0].from).toBe('b3');
    expect(loaded?.aiLevel).toBe(3);

    clearActiveGame();
    expect(loadActiveGame()).toBeNull();
  });

  it('saves and manages history games list', () => {
    expect(loadGameHistory()).toEqual([]);

    const record1: StoredGameRecord = {
      id: 'game_1',
      createdAt: 1000,
      dateFormatted: '25/09/2026, 01:00',
      initialFEN: INITIAL_FEN,
      moves: [],
      moveNotations: [],
      playerSide: 'red',
      aiLevel: 2,
      aiName: 'Kỳ Thủ Tập Sự',
      timeControl: '5m',
      result: 'win',
      resultTitle: 'Chiếu Bí!',
      resultReason: 'Đỏ thắng cuộc',
      totalMoves: 24,
      finalFEN: INITIAL_FEN,
    };

    const record2: StoredGameRecord = {
      id: 'game_2',
      createdAt: 2000,
      dateFormatted: '25/09/2026, 01:30',
      initialFEN: INITIAL_FEN,
      moves: [],
      moveNotations: [],
      playerSide: 'black',
      aiLevel: 4,
      aiName: 'Kỳ Thủ Trúc Đạo',
      timeControl: '10m',
      result: 'loss',
      resultTitle: 'Xin Thua',
      resultReason: 'Đỏ thắng cuộc',
      totalMoves: 36,
      finalFEN: INITIAL_FEN,
    };

    saveGameToHistory(record1);
    saveGameToHistory(record2);

    const history = loadGameHistory();
    expect(history.length).toBe(2);
    expect(history[0].id).toBe('game_2'); // Most recent first

    deleteGameFromHistory('game_1');
    const afterDelete = loadGameHistory();
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe('game_2');

    clearAllGameHistory();
    expect(loadGameHistory()).toEqual([]);
  });
});
