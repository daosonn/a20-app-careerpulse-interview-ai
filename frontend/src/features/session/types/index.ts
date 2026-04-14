import { InterviewTurnResult } from '../../../lib/gemini';

export interface SessionData {
  id: string;
  jobDescription: string;
  cvText: string;
  interviewType: string;
  language: string;
  status: string;
  isStressTest?: boolean;
  predictedQuestions: string[];
}

export interface InterviewTurn {
  id: string;
  turnOrder: number;
  question: string;
  answer: string;
  audioUrl?: string;
  phase?: number;
  phaseName?: string;
  evaluation?: InterviewTurnResult['evaluation'];
}

export interface SessionSummary {
  summary: string;
  keyTakeaways: string[];
}
