import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SettingsResponse, AuditEventResponse } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly api: ApiService) {}

  getAuditLog(page = 0, size = 20): Observable<unknown> {
    return this.api.get(`/v1/audit-log?page=${page}&size=${size}`).pipe(map(r => r.data));
  }

  getSettings(workspaceId?: string, userId?: string): Observable<SettingsResponse> {
    const params = new URLSearchParams();
    if (workspaceId) params.set('workspaceId', workspaceId);
    if (userId) params.set('userId', userId);
    const qs = params.toString();
    return this.api.get<SettingsResponse>(`/v1/settings${qs ? '?' + qs : ''}`).pipe(map(r => r.data));
  }

  saveSettings(data: unknown): Observable<SettingsResponse> {
    return this.api.put<SettingsResponse>('/v1/settings', data).pipe(map(r => r.data));
  }
}
