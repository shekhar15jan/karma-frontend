export interface WorkflowRunResponse {
  id: string;
  workflowId: string;
  projectId: string;
  executionId: string;
  missionId: string;
  workflowName: string;
  status: string;
  duration: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface WorkflowDefinition {
  id: string;
  projectId: string;
  name: string;
  nodes: object;
  edges: object;
  createdAt: string;
  updatedAt: string;
}
