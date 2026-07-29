export interface ExecutionResponse {
  id: string;
  missionId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  providerId: string;
  modelUsed: string;
  totalCost: number;
  errorMessage: string;
  createdAt: string;
}

export interface ExecutionStepResponse {
  id: string;
  executionId: string;
  flowId: string;
  agentId: string;
  stepOrder: number;
  stepType: string;
  status: string;
  inputData: string;
  outputData: string;
  promptUsed: string;
  promptVersion: number;
  providerId: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  errorMessage: string;
  retryCount: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}
