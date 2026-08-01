export interface FlowResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  executionOrder: number;
  enabled: boolean;
  status: string;
  agentIds: string[];
  createdAt: string;
  updatedAt: string;
}
