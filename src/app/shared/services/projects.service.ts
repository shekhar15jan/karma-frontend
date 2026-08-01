import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ProjectResponse } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly endpoint = '/v1/projects';

  constructor(private readonly api: ApiService) {}

  getByWorkspace(workspaceId: string): Observable<ProjectResponse[]> {
    const params = new HttpParams().set('workspaceId', workspaceId);
    return this.api.getData<ProjectResponse[]>(this.endpoint, params);
  }

  create(workspaceId: string, name: string): Observable<ProjectResponse> {
    return this.api.postData<ProjectResponse>(this.endpoint, { workspaceId, name });
  }
}
