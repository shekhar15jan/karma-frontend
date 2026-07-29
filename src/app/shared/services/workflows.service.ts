import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { WorkflowRunResponse } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowsService {
  constructor(private readonly api: ApiService) {}

  getRuns(): Observable<WorkflowRunResponse[]> {
    return this.api.get<WorkflowRunResponse[]>('/v1/workflow-executions/runs').pipe(map(r => r.data));
  }

  getProjectRuns(projectId: string): Observable<WorkflowRunResponse[]> {
    return this.api.get<WorkflowRunResponse[]>(`/v1/workflow-executions/projects/${projectId}/runs`).pipe(map(r => r.data));
  }

  saveWorkflow(data: unknown): Observable<unknown> {
    return this.api.post('/v1/workflow-executions', data).pipe(map(r => r.data));
  }

  runWorkflow(data: unknown): Observable<WorkflowRunResponse> {
    return this.api.post<WorkflowRunResponse>('/v1/workflow-executions/run', data).pipe(map(r => r.data));
  }
}
