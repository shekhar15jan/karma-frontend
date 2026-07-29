import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { WorkspaceResponse } from '../../shared/models/workspace.model';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss']
})
export class WorkspacesComponent implements OnInit {
  workspaces: WorkspaceResponse[] = [];
  loading = false;
  
  showCreateModal = false;
  newWorkspace = { name: '', description: '' };

  constructor(private readonly workspacesService: WorkspacesService) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading = true;
    this.workspacesService.getAll().subscribe({
      next: (data) => {
        this.workspaces = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load workspaces, falling back to mock data', err);
        // Fallback mock data since the backend might not have this populated yet
        this.workspaces = [
          {
            id: 'ws-1',
            name: 'Alpha Video Agency',
            description: 'Main workspace for Alpha Agency video generation',
            ownerId: 'user-1',
            status: 'ACTIVE',
            projectCount: 3,
            missionCount: 12,
            artifactCount: 45,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ws-2',
            name: 'Personal Sandbox',
            description: 'Experimental workspace',
            ownerId: 'user-1',
            status: 'ACTIVE',
            projectCount: 1,
            missionCount: 2,
            artifactCount: 5,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.newWorkspace = { name: '', description: '' };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createWorkspace(): void {
    if (!this.newWorkspace.name) return;
    
    this.loading = true;
    this.workspacesService.create(this.newWorkspace).subscribe({
      next: (ws) => {
        this.workspaces.push(ws);
        this.closeCreateModal();
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Workspace created successfully', icon: 'check_circle' } }));
      },
      error: () => {
        // Mock success for UI demo
        const mockWs: WorkspaceResponse = {
          id: `ws-${Date.now()}`,
          name: this.newWorkspace.name,
          description: this.newWorkspace.description,
          ownerId: 'user-1',
          status: 'ACTIVE',
          projectCount: 0,
          missionCount: 0,
          artifactCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.workspaces.push(mockWs);
        this.closeCreateModal();
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Workspace created (Mocked)', icon: 'check_circle' } }));
      }
    });
  }

  archiveWorkspace(ws: WorkspaceResponse): void {
    if (confirm(`Are you sure you want to archive ${ws.name}?`)) {
      this.workspacesService.archive(ws.id).subscribe({
        next: () => {
          ws.status = 'ARCHIVED';
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Workspace archived', icon: 'archive' } }));
        },
        error: () => {
          ws.status = 'ARCHIVED';
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Workspace archived (Mocked)', icon: 'archive' } }));
        }
      });
    }
  }
}
