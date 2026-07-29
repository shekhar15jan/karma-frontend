import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MissionResponse } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class MissionsService {
  constructor(private readonly api: ApiService) {}

  getAll(projectId?: string): Observable<MissionResponse[]> {
    return this.api.get<MissionResponse[]>('/v1/missions').pipe(map(r => r.data));
  }

  getById(id: string): Observable<MissionResponse> {
    return this.api.get<MissionResponse>(`/v1/missions/${id}`).pipe(map(r => r.data));
  }

  create(data: Partial<MissionResponse>): Observable<MissionResponse> {
    return this.api.post<MissionResponse>('/v1/missions', data).pipe(map(r => r.data));
  }

  execute(id: string): Observable<MissionResponse> {
    return this.api.post<MissionResponse>(`/v1/missions/${id}/execute`, {}).pipe(map(r => r.data));
  }
}
