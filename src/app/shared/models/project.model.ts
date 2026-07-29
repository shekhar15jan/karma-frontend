export interface ProjectResponse {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  brandProfile: string;
  defaultProviderId: string;
  status: string;
  missionCount: number;
  createdAt: string;
  updatedAt: string;
}
