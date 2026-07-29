export interface ProviderResponse {
  id: string;
  name: string;
  providerType: string;
  apiEndpoint: string;
  models: string[];
  capabilities: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}
