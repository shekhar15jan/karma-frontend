import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { WorkspaceResponse } from '../models/workspace.model';

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspacesService {
  private readonly endpoint = '/v1/workspaces';

  constructor(private readonly api: ApiService) {}

  getAll(): Observable<WorkspaceResponse[]> {
    return this.api.getData<WorkspaceResponse[]>(this.endpoint);
  }

  getById(id: string): Observable<WorkspaceResponse> {
    return this.api.getData<WorkspaceResponse>(`${this.endpoint}/${id}`);
  }

  create(req: CreateWorkspaceRequest): Observable<WorkspaceResponse> {
    return this.api.postData<WorkspaceResponse>(this.endpoint, req);
  }

  update(id: string, req: UpdateWorkspaceRequest): Observable<WorkspaceResponse> {
    return this.api.put<WorkspaceResponse>(`${this.endpoint}/${id}`, req).pipe(map(r => r.data));
  }

  archive(id: string): Observable<void> {
    return this.api.deleteData<void>(`${this.endpoint}/${id}`);
  }
}
