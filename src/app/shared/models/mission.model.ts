export interface MissionResponse {
  id: string;
  projectId: string;
  name: string;
  description: string;
  missionType: string;
  status: string;
  priority: string;
  providerId: string;
  progress: number;
  outputDirectory?: string;
  targetDurationSeconds?: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}
