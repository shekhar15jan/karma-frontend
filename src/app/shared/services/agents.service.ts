import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AgentResponse } from '../models/agent.model';
import { ExecutionStepResponse } from '../models/execution.model';

@Injectable({ providedIn: 'root' })
export class AgentsService {
  constructor(private readonly api: ApiService) {}

  getAll(): Observable<AgentResponse[]> {
    return this.api.get<AgentResponse[]>('/v1/agents').pipe(map(r => r.data));
  }

  getById(id: string): Observable<AgentResponse> {
    return this.api.get<AgentResponse>(`/v1/agents/${id}`).pipe(map(r => r.data));
  }

  getTrace(id: string): Observable<ExecutionStepResponse[]> {
    return this.api.get<ExecutionStepResponse[]>(`/v1/agents/${id}/trace`).pipe(map(r => r.data));
  }

  create(data: Partial<AgentResponse>): Observable<AgentResponse> {
    return this.api.post<AgentResponse>('/v1/agents', data).pipe(map(r => r.data));
  }

  update(id: string, data: Partial<AgentResponse>): Observable<AgentResponse> {
    return this.api.put<AgentResponse>(`/v1/agents/${id}`, data).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/v1/agents/${id}`).pipe(map(r => r.data));
  }
}
