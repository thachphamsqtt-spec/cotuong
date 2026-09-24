export type StepType = 'explain' | 'demo' | 'try' | 'quiz';

export interface BaseStep {
  id: string;
  type: StepType;
  title: string;
}

export interface ExplainStep extends BaseStep {
  type: 'explain';
  text: string;
  fen: string;
  highlights?: string[];
  arrows?: [string, string][];
}

export interface DemoStep extends BaseStep {
  type: 'demo';
  text: string;
  fen: string;
  moves: { from: string; to: string }[];
  highlights?: string[];
}

export interface TryStep extends BaseStep {
  type: 'try';
  text: string;
  fen: string;
  goal: string;
  expectedMoves: { from: string; to: string }[];
  wrongMoves?: Record<string, string>; // e.g. "b2b9": "Tướng đối phương vẫn thoát được."
  hints: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizStep extends BaseStep {
  type: 'quiz';
  questions: QuizQuestion[];
}

export type LessonStep = ExplainStep | DemoStep | TryStep | QuizStep;

export interface Lesson {
  id: string;
  level: number;
  levelTitle: string;
  title: string;
  summary: string;
  steps: LessonStep[];
}
