export interface AgentSkillInfo {
  id: string;
  name: string;
}

export interface AgentMcpServerInfo {
  id: string;
  name: string;
  transportType: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: string;
  defaultPromptId: string;
  defaultProviderId: string;
  providerName?: string;
  providerType?: string;
  model?: string;
  temperature?: number;
  memoryMode?: string;
  isSystem?: boolean;
  skills?: AgentSkillInfo[];
  skillIds?: string[];
  mcpServers?: AgentMcpServerInfo[];
  mcpServerIds?: string[];
  createdAt: string;
  updatedAt: string;
}
