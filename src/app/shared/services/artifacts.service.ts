import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ArtifactResponse } from '../models/artifact.model';

@Injectable({ providedIn: 'root' })
export class ArtifactsService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<ArtifactResponse[]> {
    return this.api.get<ArtifactResponse[]>('/v1/artifacts').pipe(map(r => r.data));
  }

  getByMission(missionId: string): Observable<ArtifactResponse[]> {
    return this.api.get<ArtifactResponse[]>(`/v1/artifacts?missionId=${missionId}`).pipe(map(r => r.data));
  }

  getPendingReview(): Observable<ArtifactResponse[]> {
    return this.api.get<ArtifactResponse[]>('/v1/artifacts/pending-review').pipe(map(r => r.data));
  }

  getById(id: number): Observable<ArtifactResponse> {
    return this.api.get<ArtifactResponse>(`/v1/artifacts/${id}`).pipe(map(r => r.data));
  }

  updateReviewStatus(id: number, status: string): Observable<ArtifactResponse> {
    return this.api.put<ArtifactResponse>(`/v1/artifacts/${id}/review?status=${status}`, {}).pipe(map(r => r.data));
  }
}
