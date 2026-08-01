import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { ProjectsService } from '../../shared/services/projects.service';
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
      },
      error: (err) => {
        console.error('Failed to load workspaces', err);
        this.workspaces = [];
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to load workspaces', icon: 'error' } }));
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
      error: (err) => {
        this.loading = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to create workspace', icon: 'error' } }));
        console.error('Failed to create workspace', err);
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
    this.creatingProject = true;
    this.projectsService.create(this.projectWorkspace.id, this.newProjectName.trim()).subscribe({
      next: (project) => {
        this.creatingProject = false;
        this.closeProjectModal();
        this.loadWorkspaces();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Project "${project.name}" created`, icon: 'check_circle' } }));
      },
      error: (err) => {
        this.creatingProject = false;
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to create project', icon: 'error' } }));
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
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to archive workspace', icon: 'error' } }));
          console.error('Failed to archive workspace', err);
        }
      });
    }
  }
}
