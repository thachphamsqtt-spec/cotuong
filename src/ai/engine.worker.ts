import { evaluateBoard } from './evaluation';
import { searchBestMove } from './search';
import {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  SearchProgressMessage,
  SearchResultMessage,
  EvaluateResultMessage,
  InitAckMessage,
} from './workerTypes';

let currentStopRequested = false;

self.onmessage = (e: MessageEvent<WorkerIncomingMessage>) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'INIT': {
      const ack: InitAckMessage = {
        type: 'INIT_ACK',
        engineName: 'DayCotuong Built-in AI',
        version: '2.0.0',
      };
      self.postMessage(ack);
      break;
    }

    case 'STOP_REQUEST': {
      currentStopRequested = true;
      break;
    }

    case 'EVALUATE_REQUEST': {
      try {
        const score = evaluateBoard(msg.board);
        const res: EvaluateResultMessage = {
          type: 'EVALUATE_RESULT',
          id: msg.id,
          score,
        };
        self.postMessage(res);
      } catch (err: any) {
        self.postMessage({
          type: 'ERROR',
          id: msg.id,
          message: err?.message || 'Evaluation error',
        });
      }
      break;
    }

    case 'SEARCH_REQUEST': {
      currentStopRequested = false;
      const { id, board, turn, options } = msg;

      try {
        const searchResult = searchBestMove(board, turn, {
          ...options,
          shouldStop: () => currentStopRequested,
          onProgress: (progress) => {
            const progressMsg: SearchProgressMessage = {
              type: 'SEARCH_PROGRESS',
              id,
              progress,
            };
            self.postMessage(progressMsg);
          },
        });

        const resultMsg: SearchResultMessage = {
          type: 'SEARCH_RESULT',
          id,
          result: searchResult,
        };
        self.postMessage(resultMsg);
      } catch (err: any) {
        self.postMessage({
          type: 'ERROR',
          id,
          message: err?.message || 'Search execution failed',
        });
      }
      break;
    }

    default:
      break;
  }
};
