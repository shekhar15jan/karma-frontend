import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MissionResponse } from '../models/mission.model';
import { FlowResponse } from '../models/flow.model';
import { ArtifactResponse } from '../models/artifact.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly api: ApiService) {}

  getMissions(): Observable<MissionResponse[]> {
    return this.api.get<MissionResponse[]>('/v1/missions').pipe(map(r => r.data));
  }

  getFlows(): Observable<FlowResponse[]> {
    return this.api.get<FlowResponse[]>('/v1/flows').pipe(map(r => r.data));
  }

  getPendingApprovals(): Observable<ArtifactResponse[]> {
    return this.api.get<ArtifactResponse[]>('/v1/artifacts/pending-review').pipe(map(r => r.data));
  }
}
