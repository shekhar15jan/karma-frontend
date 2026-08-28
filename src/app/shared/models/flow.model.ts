export interface FlowDesign {
  nodes: any[];
  edges: any[];
}

export interface FlowResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  executionOrder: number;
  enabled: boolean;
  status: string;
  isSystem?: boolean;
  agentIds: string[];
  design?: FlowDesign;
  createdAt: string;
  updatedAt: string;
}

export interface FlowRunSummary {
  id: string;
  executionId: string;
  missionId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface FlowDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  status: string;
  isSystem?: boolean;
  agentIds: string[];
  design?: FlowDesign;
  runCount: number;
  recentRuns: FlowRunSummary[];
  artifacts: any[];
  createdAt: string;
  updatedAt: string;
}
