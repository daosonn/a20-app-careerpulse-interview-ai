export interface Session {
  id: string;
  jobDescription: string;
  interviewType: string;
  status: string;
  createdAt: string;
  avgScore?: number;
}

export interface ChartDataPoint {
  name: string;
  score: number;
  date: string;
}

/** Per-competency averages aggregated across all evaluated turns. */
export interface CompetencyAverages {
  relevance: number;
  structure: number;
  specificity: number;
  clarity: number;
  confidence: number;
}

/** Shape consumed by the Competency Radar chart. */
export interface RadarDataPoint {
  competency: string;
  score: number;
  fullMark: number;
}
