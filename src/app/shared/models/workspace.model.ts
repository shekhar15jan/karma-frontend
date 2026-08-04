export interface WorkspaceResponse {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: string;
  defaultOutputDirectory?: string;
  projectCount: number;
  missionCount: number;
  artifactCount: number;
  createdAt: string;
  updatedAt: string;
}
