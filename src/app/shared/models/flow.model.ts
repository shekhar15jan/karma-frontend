export interface FlowResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  executionOrder: number;
  enabled: boolean;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}
