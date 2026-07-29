export interface SettingsResponse {
  id: string;
  workspaceId: string;
  userId: string;
  settingsData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEventResponse {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  action: string;
  changes: Record<string, unknown>;
  correlationId: string;
  ipAddress: string;
  createdAt: string;
}
