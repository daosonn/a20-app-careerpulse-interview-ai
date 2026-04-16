export interface InterviewTurnResult {
  evaluation: {
    scores: {
      relevance: number;
      structure: number;
      specificity: number;
      clarity: number;
      confidence: number;
    };
    starAnalysis: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
    feedback: string;
    betterVersion: string;
  };
}

export interface SessionData {
  id: string;
  jobDescription: string;
  cvText: string;
  interviewType: string;
  language: string;
  status: string;
  isStressTest?: boolean;
  predictedQuestions: string[];
  /** Populated once the session is completed and summarized by the backend. */
  summary?: string;
  /** Populated once the session is completed. */
  keyTakeaways?: string[];
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
