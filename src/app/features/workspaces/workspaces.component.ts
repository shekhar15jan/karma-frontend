import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { ProjectsService } from '../../shared/services/projects.service';
import { WorkspaceResponse } from '../../shared/models/workspace.model';
import { ProjectResponse } from '../../shared/models/project.model';

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

  projectsByWorkspace = new Map<string, ProjectResponse[]>();
  expandedWorkspace: string | null = null;

  showCreateModal = false;
  newWorkspace = { name: '', description: '', defaultOutputDirectory: '' };
  editingWorkspaceId: string | null = null;

  showProjectModal = false;
  creatingProject = false;
  projectWorkspace: WorkspaceResponse | null = null;
  newProjectName = '';

  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService
  ) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading = true;
    this.workspacesService.getAll().subscribe({
      next: (data) => {
        this.workspaces = data || [];
        this.loading = false;
        this.workspaces.forEach(ws => this.loadProjectsFor(ws.id));
      },
      error: (err) => {
        console.error('Failed to load workspaces', err);
        this.workspaces = [];
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to load workspaces', icon: 'error' } }));
      }
    });
  }

  loadProjectsFor(workspaceId: string): void {
    this.projectsService.getByWorkspace(workspaceId).subscribe({
      next: (projects) => {
        this.projectsByWorkspace.set(workspaceId, projects || []);
      },
      error: () => {
        this.projectsByWorkspace.set(workspaceId, []);
      }
    });
  }

  projectsOf(ws: WorkspaceResponse): ProjectResponse[] {
    return this.projectsByWorkspace.get(ws.id) || [];
  }

  toggleExpand(ws: WorkspaceResponse): void {
    this.expandedWorkspace = this.expandedWorkspace === ws.id ? null : ws.id;
  }

  isExpanded(ws: WorkspaceResponse): boolean {
    return this.expandedWorkspace === ws.id;
  }

  openCreateModal(): void {
    this.newWorkspace = { name: '', description: '', defaultOutputDirectory: '' };
    this.editingWorkspaceId = null;
    this.showCreateModal = true;
  }

  openEditModal(ws: WorkspaceResponse): void {
    this.newWorkspace = { name: ws.name, description: ws.description, defaultOutputDirectory: ws.defaultOutputDirectory || '' };
    this.editingWorkspaceId = ws.id;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.editingWorkspaceId = null;
  }

  createWorkspace(): void {
    if (!this.newWorkspace.name) return;
    
    this.loading = true;
    const req = {
      name: this.newWorkspace.name,
      description: this.newWorkspace.description,
      defaultOutputDirectory: this.newWorkspace.defaultOutputDirectory?.trim() || undefined
    };
    const op = this.editingWorkspaceId
      ? this.workspacesService.update(this.editingWorkspaceId, req)
      : this.workspacesService.create(req);
    op.subscribe({
      next: (ws) => {
        if (this.editingWorkspaceId) {
          this.workspaces = this.workspaces.map(w => w.id === ws.id ? ws : w);
        } else {
          this.workspaces.push(ws);
        }
        this.closeCreateModal();
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: this.editingWorkspaceId ? 'Workspace updated successfully' : 'Workspace created successfully', icon: 'check_circle' } }));
      },
      error: (err) => {
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to save workspace: ' + (err?.error?.message || err?.message || 'unknown error'), icon: 'error' } }));
        console.error('Failed to save workspace', err);
      }
    });
  }

  openProjectModal(ws: WorkspaceResponse): void {
    this.projectWorkspace = ws;
    this.newProjectName = '';
    this.showProjectModal = true;
  }

  closeProjectModal(): void {
    this.showProjectModal = false;
    this.projectWorkspace = null;
  }

  createProject(): void {
    if (!this.projectWorkspace || !this.newProjectName.trim()) return;
    const workspaceId = this.projectWorkspace.id;
    this.creatingProject = true;
    this.projectsService.create(workspaceId, this.newProjectName.trim()).subscribe({
      next: (project) => {
        this.creatingProject = false;
        this.closeProjectModal();
        this.loadProjectsFor(workspaceId);
        this.loadWorkspaces();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Project "${project.name}" created`, icon: 'check_circle' } }));
      },
      error: (err) => {
        this.creatingProject = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to create project: ' + (err?.error?.message || err?.message || 'unknown error'), icon: 'error' } }));
        console.error('Failed to create project', err);
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
        error: (err) => {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to archive workspace: ' + (err?.error?.message || err?.message || 'unknown error'), icon: 'error' } }));
          console.error('Failed to archive workspace', err);
        }
      });
    }
  }
}
