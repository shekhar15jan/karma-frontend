export interface KnowledgePackResponse {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDocumentResponse {
  id: string;
  missionId: string;
  filename: string;
  format: string;
  content: string;
  createdAt: string;
}
