import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { WorkflowRunResponse } from '../models/workflow.model';
import { FlowDetail, FlowResponse } from '../models/flow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowsService {
  constructor(private readonly api: ApiService) {}

  getRuns(): Observable<WorkflowRunResponse[]> {
    return this.api.get<WorkflowRunResponse[]>('/v1/workflow-executions/runs').pipe(map(r => r.data));
  }

  getDefinitions(): Observable<unknown[]> {
    return this.api.get<unknown[]>('/v1/workflow-executions/definitions').pipe(map(r => r.data));
  }

  getFlows(): Observable<FlowResponse[]> {
    return this.api.get<FlowResponse[]>('/v1/flows').pipe(map(r => r.data));
  }

  getFlowDetails(id: string): Observable<FlowDetail> {
    return this.api.get<FlowDetail>(`/v1/flows/${id}/details`).pipe(map(r => r.data));
  }

  deleteFlow(id: string): Observable<any> {
    return this.api.delete<any>(`/v1/flows/${id}`).pipe(map(r => r.data));
  }

  deleteDefinition(id: string): Observable<void> {
    return this.api.delete<void>(`/v1/workflow-executions/definitions/${id}`).pipe(map(r => r.data));
  }

  getProjectRuns(projectId: string): Observable<WorkflowRunResponse[]> {
    return this.api.get<WorkflowRunResponse[]>(`/v1/workflow-executions/projects/${projectId}/runs`).pipe(map(r => r.data));
  }

  saveWorkflow(data: unknown): Observable<any> {
    return this.api.post<any>('/v1/workflow-executions', data).pipe(map(r => r.data));
  }

  runWorkflow(data: unknown): Observable<WorkflowRunResponse> {
    return this.api.post<WorkflowRunResponse>('/v1/workflow-executions/run', data).pipe(map(r => r.data));
  }
}
