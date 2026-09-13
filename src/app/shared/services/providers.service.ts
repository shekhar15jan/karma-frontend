import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ProviderResponse } from '../models/provider.model';

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<ProviderResponse[]> {
    return this.api.get<ProviderResponse[]>('/v1/providers').pipe(map(r => r.data));
  }

  getById(id: string): Observable<ProviderResponse> {
    return this.api.get<ProviderResponse>(`/v1/providers/${id}`).pipe(map(r => r.data));
  }

  create(data: Partial<ProviderResponse>): Observable<ProviderResponse> {
    return this.api.post<ProviderResponse>('/v1/providers', data).pipe(map(r => r.data));
  }

  update(id: string, data: Partial<ProviderResponse>): Observable<ProviderResponse> {
    return this.api.put<ProviderResponse>(`/v1/providers/${id}`, data).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/v1/providers/${id}`).pipe(map(r => r.data));
  }

  activate(id: string): Observable<void> {
    return this.api.post<void>(`/v1/providers/${id}/activate`, {}).pipe(map(r => r.data));
  }

  deactivate(id: string): Observable<void> {
    return this.api.post<void>(`/v1/providers/${id}/deactivate`, {}).pipe(map(r => r.data));
  }

  testConnection(id: string, body?: { apiKey?: string; apiEndpoint?: string }): Observable<{ success: boolean; message: string; status?: string; modelCount?: number }> {
    return this.api.post<{ success: boolean; message: string; status?: string; modelCount?: number }>(`/v1/providers/${id}/test`, body || {}).pipe(map(r => r.data));
  }
}
