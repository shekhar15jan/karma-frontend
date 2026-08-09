import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MissionResponse } from '../models/mission.model';

export interface CreateMissionRequest {
  projectId: string;
  name: string;
  description?: string;
  missionType?: string;
  priority?: string;
  providerId?: string;
  sourceDocumentIds?: string[];
  selectedFlowIds?: string[];
  outputDirectory?: string;
  targetDurationSeconds?: number;
}

@Injectable({ providedIn: 'root' })
export class MissionsService {
  constructor(private readonly api: ApiService) {}

  getAll(projectId?: string): Observable<MissionResponse[]> {
    const params = projectId ? new HttpParams().set('projectId', projectId) : undefined;
    return this.api.getData<MissionResponse[]>('/v1/missions', params);
  }

  getById(id: string): Observable<MissionResponse> {
    return this.api.getData<MissionResponse>(`/v1/missions/${id}`);
  }

  create(data: CreateMissionRequest): Observable<MissionResponse> {
    return this.api.postData<MissionResponse>('/v1/missions', data);
  }

  execute(id: string): Observable<MissionResponse> {
    return this.api.postData<MissionResponse>(`/v1/missions/${id}/execute`, {});
  }
}
