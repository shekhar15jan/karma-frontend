export interface ProviderResponse {
  id: string;
  name: string;
  providerType: string;
  apiEndpoint: string;
  models: string[];
  capabilities: string[];
  status: string;
  apiKeyConfigured: boolean;
  keyRequired: boolean;
  createdAt: string;
  updatedAt: string;
}
