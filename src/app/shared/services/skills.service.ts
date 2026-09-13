import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SkillResponse } from '../models/skill.model';

export interface SkillRequest {
  name: string;
  description?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class SkillsService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<SkillResponse[]> {
    return this.api.get<SkillResponse[]>('/v1/skills').pipe(map(r => r.data));
  }

  getById(id: string): Observable<SkillResponse> {
    return this.api.get<SkillResponse>(`/v1/skills/${id}`).pipe(map(r => r.data));
  }

  create(data: SkillRequest): Observable<SkillResponse> {
    return this.api.post<SkillResponse>('/v1/skills', data).pipe(map(r => r.data));
  }

  update(id: string, data: SkillRequest): Observable<SkillResponse> {
    return this.api.put<SkillResponse>(`/v1/skills/${id}`, data).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/v1/skills/${id}`).pipe(map(r => r.data));
  }

  activate(id: string): Observable<void> {
    return this.api.post<void>(`/v1/skills/${id}/activate`, {}).pipe(map(r => r.data));
  }

  deactivate(id: string): Observable<void> {
    return this.api.post<void>(`/v1/skills/${id}/deactivate`, {}).pipe(map(r => r.data));
  }
}
