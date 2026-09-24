import { Board, Move, Side } from '../core/types';
import { SearchOptions, SearchProgress, SearchResult } from './search';

export type WorkerMessageType =
  | 'INIT'
  | 'INIT_ACK'
  | 'SET_POSITION'
  | 'SEARCH_REQUEST'
  | 'SEARCH_PROGRESS'
  | 'SEARCH_RESULT'
  | 'STOP_REQUEST'
  | 'SET_OPTION'
  | 'EVALUATE_REQUEST'
  | 'EVALUATE_RESULT'
  | 'ERROR';

export interface BaseWorkerMessage {
  type: WorkerMessageType;
  id?: string;
}

export interface InitMessage extends BaseWorkerMessage {
  type: 'INIT';
}

export interface InitAckMessage extends BaseWorkerMessage {
  type: 'INIT_ACK';
  engineName: string;
  version: string;
}

export interface SetPositionMessage extends BaseWorkerMessage {
  type: 'SET_POSITION';
  board: Board;
  turn: Side;
  moves?: Move[];
}

export interface SearchRequestMessage extends BaseWorkerMessage {
  type: 'SEARCH_REQUEST';
  id: string;
  board: Board;
  turn: Side;
  options: SearchOptions;
}

export interface SearchProgressMessage extends BaseWorkerMessage {
  type: 'SEARCH_PROGRESS';
  id: string;
  progress: SearchProgress;
}

export interface SearchResultMessage extends BaseWorkerMessage {
  type: 'SEARCH_RESULT';
  id: string;
  result: SearchResult;
}

export interface StopRequestMessage extends BaseWorkerMessage {
  type: 'STOP_REQUEST';
  id?: string;
}

export interface SetOptionMessage extends BaseWorkerMessage {
  type: 'SET_OPTION';
  name: string;
  value: string | number | boolean;
}

export interface EvaluateRequestMessage extends BaseWorkerMessage {
  type: 'EVALUATE_REQUEST';
  id: string;
  board: Board;
}

export interface EvaluateResultMessage extends BaseWorkerMessage {
  type: 'EVALUATE_RESULT';
  id: string;
  score: number;
}

export interface ErrorMessage extends BaseWorkerMessage {
  type: 'ERROR';
  id?: string;
  message: string;
}

export type WorkerIncomingMessage =
  | InitMessage
  | SetPositionMessage
  | SearchRequestMessage
  | StopRequestMessage
  | SetOptionMessage
  | EvaluateRequestMessage;

export type WorkerOutgoingMessage =
  | InitAckMessage
  | SearchProgressMessage
  | SearchResultMessage
  | EvaluateResultMessage
  | ErrorMessage;
