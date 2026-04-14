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
