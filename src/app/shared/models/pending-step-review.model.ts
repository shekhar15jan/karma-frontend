export interface PendingStepReviewResponse {
  stepId: string;
  executionId: string;
  missionId: string;
  missionName: string;
  flowId: string;
  flowName: string;
  agentId: string;
  agentName: string;
  stepOrder: number;
  stepType: string;
  status: string;
  reviewStatus: string;
  inputData: string;
  outputData: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}
