import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MissionResponse } from '../models/mission.model';
import { FlowResponse } from '../models/flow.model';
import { ArtifactResponse } from '../models/artifact.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly api: ApiService) {}

  getMissions(projectId?: string): Observable<MissionResponse[]> {
    const params = projectId ? new HttpParams().set('projectId', projectId) : undefined;
    return this.api.getData<MissionResponse[]>('/v1/missions', params);
  }

  getFlows(): Observable<FlowResponse[]> {
    return this.api.getData<FlowResponse[]>('/v1/flows');
  }

  getPendingApprovals(): Observable<ArtifactResponse[]> {
    return this.api.getData<ArtifactResponse[]>('/v1/artifacts/pending-review');
  }
}
