import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface McpServer {
  id: string;
  name: string;
  transportType: string;
  commandOrUrl: string;
  args?: string[];
  envVars?: Record<string, string>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface McpServerRequest {
  name: string;
  transportType: string;
  commandOrUrl: string;
  args?: string[];
  envVars?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class McpService {
  private api = inject(ApiService);
  private readonly base = '/mcp-servers';

  getAll(): Observable<McpServer[]> {
    return this.api.getData<McpServer[]>(this.base);
  }

  getById(id: string): Observable<McpServer> {
    return this.api.getData<McpServer>(`${this.base}/${id}`);
  }

  create(request: McpServerRequest): Observable<McpServer> {
    return this.api.postData<McpServer>(this.base, request);
  }

  update(id: string, request: McpServerRequest): Observable<McpServer> {
    return this.api.putData<McpServer>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.deleteData<void>(`${this.base}/${id}`);
  }

  listTools(id: string): Observable<unknown> {
    return this.api.getData<unknown>(`${this.base}/${id}/tools`);
  }

  callTool(id: string, name: string, args: unknown): Observable<unknown> {
    return this.api.postData<unknown>(`${this.base}/${id}/tools/call`, { name, arguments: args });
  }

  start(id: string): Observable<void> {
    return this.api.postData<void>(`${this.base}/${id}/start`, {});
  }

  stop(id: string): Observable<void> {
    return this.api.postData<void>(`${this.base}/${id}/stop`, {});
  }

  getStatus(id: string): Observable<{ running: boolean; status: string; name: string }> {
    return this.api.getData<{ running: boolean; status: string; name: string }>(`${this.base}/${id}/status`);
  }
}
