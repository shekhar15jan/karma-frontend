export interface ArtifactResponse {
  id: number;
  missionId: string;
  executionStepId: string;
  name: string;
  artifactType: string;
  status: string;
  contentText: string;
  contentType: string;
  reviewStatus: string;
  publicationStatus: string;
  tags: string[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}
