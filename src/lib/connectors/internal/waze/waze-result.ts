export interface WazeResult {
  success: boolean;
  destination: string;
  url?: string;
  message?: string;
  completedAt: Date;
}
