import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { KnowledgePackResponse } from '../models/knowledge.model';

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  constructor(private readonly api: ApiService) {}

  getAll(workspaceId?: string): Observable<KnowledgePackResponse[]> {
    return this.api.get<KnowledgePackResponse[]>('/v1/knowledge').pipe(map(r => r.data));
  }

  getById(id: string): Observable<KnowledgePackResponse> {
    return this.api.get<KnowledgePackResponse>(`/v1/knowledge/${id}`).pipe(map(r => r.data));
  }

  uploadFile(file: File, workspaceId?: string): Observable<{ success: boolean; id?: string; name?: string; status?: string; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (workspaceId) formData.append('workspaceId', workspaceId);
    return this.api.upload<{ success: boolean; id?: string; name?: string; status?: string; message?: string }>('/v1/knowledge/upload', formData).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/v1/knowledge/${id}`).pipe(map(r => r.data));
  }
}
