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
}
