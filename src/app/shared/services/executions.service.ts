import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExecutionResponse, ExecutionStepResponse } from '../models/execution.model';

@Injectable({ providedIn: 'root' })
export class ExecutionsService {
  constructor(private readonly api: ApiService) {}

  getAll(missionId?: string): Observable<ExecutionResponse[]> {
    const params = missionId ? new HttpParams().set('missionId', missionId) : undefined;
    return this.api.getData<ExecutionResponse[]>('/v1/executions', params);
  }

  getById(id: string): Observable<ExecutionResponse> {
    return this.api.getData<ExecutionResponse>(`/v1/executions/${id}`);
  }

  getSteps(id: string): Observable<ExecutionStepResponse[]> {
    return this.api.getData<ExecutionStepResponse[]>(`/v1/executions/${id}/steps`);
  }

  trigger(missionId: string, mode: string = 'AUTO'): Observable<unknown> {
    return this.api.postData(`/v1/executions/trigger/${missionId}?mode=${mode}`, {});
  }

  cancel(id: string): Observable<unknown> {
    return this.api.postData(`/v1/executions/${id}/cancel`, {});
  }

  getStatus(id: string): Observable<unknown> {
    return this.api.getData(`/v1/executions/${id}/status`);
  }
}
