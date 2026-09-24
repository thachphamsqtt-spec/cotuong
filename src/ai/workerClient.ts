import { Board, Side } from '../core/types';
import { SearchOptions, SearchProgress, SearchResult, searchBestMove } from './search';
import { evaluateBoard } from './evaluation';
import {
  InitAckMessage,
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  SearchProgressMessage,
  SearchResultMessage,
  EvaluateResultMessage,
} from './workerTypes';

export class AIWorkerClient {
  private worker: Worker | null = null;
  private isFallbackMode = false;
  private pendingRequests = new Map<
    string,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
      onProgress?: (progress: SearchProgress) => void;
    }
  >();
  private activeSearchId: string | null = null;
  private fallbackStopFlag = false;
  private idCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (err) => {
          console.warn('[AIWorkerClient] Worker error, switching to fallback:', err);
          this.isFallbackMode = true;
          this.worker?.terminate();
          this.worker = null;
        };
      } catch {
        this.isFallbackMode = true;
      }
    } else {
      this.isFallbackMode = true;
    }
  }

  private handleWorkerMessage(e: MessageEvent<WorkerOutgoingMessage>) {
    const msg = e.data;
    if (!msg) return;

    if (msg.type === 'INIT_ACK') {
      const pending = this.pendingRequests.get('__INIT__');
      if (pending) {
        pending.resolve(msg);
        this.pendingRequests.delete('__INIT__');
      }
      return;
    }

    if (msg.type === 'SEARCH_PROGRESS') {
      const progressMsg = msg as SearchProgressMessage;
      const pending = this.pendingRequests.get(progressMsg.id);
      if (pending?.onProgress) {
        pending.onProgress(progressMsg.progress);
      }
      return;
    }

    if (msg.type === 'SEARCH_RESULT') {
      const resultMsg = msg as SearchResultMessage;
      const pending = this.pendingRequests.get(resultMsg.id);
      if (pending) {
        pending.resolve(resultMsg.result);
        this.pendingRequests.delete(resultMsg.id);
      }
      if (this.activeSearchId === resultMsg.id) {
        this.activeSearchId = null;
      }
      return;
    }

    if (msg.type === 'EVALUATE_RESULT') {
      const evalMsg = msg as EvaluateResultMessage;
      const pending = this.pendingRequests.get(evalMsg.id);
      if (pending) {
        pending.resolve(evalMsg.score);
        this.pendingRequests.delete(evalMsg.id);
      }
      return;
    }

    if (msg.type === 'ERROR') {
      if (msg.id) {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          pending.reject(new Error(msg.message));
          this.pendingRequests.delete(msg.id);
        }
      }
    }
  }

  public async init(): Promise<InitAckMessage> {
    if (this.isFallbackMode || !this.worker) {
      return {
        type: 'INIT_ACK',
        engineName: 'DayCotuong Built-in AI (Main Thread Fallback)',
        version: '2.0.0',
      };
    }

    return new Promise<InitAckMessage>((resolve, reject) => {
      this.pendingRequests.set('__INIT__', { resolve, reject });
      this.worker!.postMessage({ type: 'INIT' });

      // Safety timeout
      setTimeout(() => {
        if (this.pendingRequests.has('__INIT__')) {
          this.pendingRequests.delete('__INIT__');
          this.isFallbackMode = true;
          resolve({
            type: 'INIT_ACK',
            engineName: 'DayCotuong Built-in AI (Fallback)',
            version: '2.0.0',
          });
        }
      }, 1000);
    });
  }

  public async evaluate(board: Board): Promise<number> {
    if (this.isFallbackMode || !this.worker) {
      return evaluateBoard(board);
    }

    const id = `eval_${++this.idCounter}`;
    return new Promise<number>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({
        type: 'EVALUATE_REQUEST',
        id,
        board,
      });
    });
  }

  public async search(
    board: Board,
    turn: Side,
    options: SearchOptions,
    onProgress?: (progress: SearchProgress) => void
  ): Promise<SearchResult> {
    const id = `search_${++this.idCounter}`;
    this.activeSearchId = id;
    this.fallbackStopFlag = false;

    if (this.isFallbackMode || !this.worker) {
      // Run async on main thread
      return new Promise<SearchResult>((resolve) => {
        setTimeout(() => {
          const result = searchBestMove(board, turn, {
            ...options,
            shouldStop: () => this.fallbackStopFlag,
            onProgress,
          });
          resolve(result);
        }, 0);
      });
    }

    return new Promise<SearchResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve,
        reject,
        onProgress,
      });

      const req: WorkerIncomingMessage = {
        type: 'SEARCH_REQUEST',
        id,
        board,
        turn,
        options,
      };
      this.worker!.postMessage(req);
    });
  }

  public stop(): void {
    this.fallbackStopFlag = true;
    if (this.worker && this.activeSearchId) {
      this.worker.postMessage({
        type: 'STOP_REQUEST',
        id: this.activeSearchId,
      });
    }
  }

  public terminate(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}
