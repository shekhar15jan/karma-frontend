export interface PromptResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: string[];
  tags: string[];
  currentVersion: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
