import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExecutionResponse, ExecutionStepResponse } from '../models/execution.model';

@Injectable({ providedIn: 'root' })
export class ExecutionsService {
  constructor(private readonly api: ApiService) {}

  getAll(missionId?: string): Observable<ExecutionResponse[]> {
    return this.api.get<ExecutionResponse[]>('/v1/executions').pipe(map(r => r.data));
  }

  getById(id: string): Observable<ExecutionResponse> {
    return this.api.get<ExecutionResponse>(`/v1/executions/${id}`).pipe(map(r => r.data));
  }

  getSteps(id: string): Observable<ExecutionStepResponse[]> {
    return this.api.get<ExecutionStepResponse[]>(`/v1/executions/${id}/steps`).pipe(map(r => r.data));
  }

  trigger(missionId: string): Observable<unknown> {
    return this.api.post(`/v1/executions/trigger/${missionId}`, {}).pipe(map(r => r.data));
  }

  cancel(id: string): Observable<unknown> {
    return this.api.post(`/v1/executions/${id}/cancel`, {}).pipe(map(r => r.data));
  }

  getStatus(id: string): Observable<unknown> {
    return this.api.get(`/v1/executions/${id}/status`).pipe(map(r => r.data));
  }
}
