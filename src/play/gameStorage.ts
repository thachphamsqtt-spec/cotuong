import { Board, Move, Side } from '../core/types';
import { INITIAL_FEN } from '../core/fen';

export interface StoredGameRecord {
  id: string;
  createdAt: number;
  dateFormatted: string;
  initialFEN: string;
  moves: Move[];
  moveNotations: { notation: string; move: Move }[];
  playerSide: Side;
  aiLevel: number;
  aiName: string;
  timeControl: string;
  result: 'win' | 'loss' | 'draw' | 'in_progress';
  resultTitle: string;
  resultReason: string;
  totalMoves: number;
  finalFEN: string;
}

export interface ActiveGameState {
  initialFEN: string;
  moves: Move[];
  moveNotations: { notation: string; move: Move }[];
  playerSide: Side;
  aiLevel: number;
  timeControl: 'none' | '3m' | '5m' | '10m' | '15m10s';
  redTime: number;
  blackTime: number;
  updatedAt: number;
}

const ACTIVE_GAME_KEY = 'kydao_active_game_state';
const HISTORY_GAMES_KEY = 'kydao_saved_games_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Saves currently playing game state to localStorage
 */
export function saveActiveGame(state: ActiveGameState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save active game state to localStorage', err);
  }
}

/**
 * Loads the active game state from localStorage
 */
export function loadActiveGame(): ActiveGameState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.moves)) {
      return parsed as ActiveGameState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears the active game state from localStorage
 */
export function clearActiveGame(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (err) {
    console.error('Failed to clear active game state', err);
  }
}

/**
 * Saves a completed or archived game into the History Library
 */
export function saveGameToHistory(record: StoredGameRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const history = loadGameHistory();
    // Prevent exact duplicate ID
    const filtered = history.filter((g) => g.id !== record.id);
    const updated = [record, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_GAMES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save game to history library', err);
  }
}

/**
 * Loads the list of saved game records from localStorage
 */
export function loadGameHistory(): StoredGameRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredGameRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Deletes a single game from the History Library by ID
 */
export function deleteGameFromHistory(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const history = loadGameHistory();
    const filtered = history.filter((g) => g.id !== id);
    localStorage.setItem(HISTORY_GAMES_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete game from history', err);
  }
}

/**
 * Clears all saved games from History
 */
export function clearAllGameHistory(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_GAMES_KEY);
  } catch (err) {
    console.error('Failed to clear all history', err);
  }
}
