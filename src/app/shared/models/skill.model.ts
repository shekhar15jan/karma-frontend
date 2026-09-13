export interface SkillResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  assignedAgentCount?: number;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}
