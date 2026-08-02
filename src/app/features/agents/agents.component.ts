import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgentsService } from '../../shared/services/agents.service';
import { AgentResponse } from '../../shared/models/agent.model';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  agents: AgentResponse[] = [];
  selectedAgent: AgentResponse | null = null;
  isNewAgent = false;
  loading = false;
  error: string | null = null;

  constructor(private readonly agentsService: AgentsService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.loading = true;
    this.error = null;
    this.agentsService.getAll().subscribe({
      next: (data) => {
        this.agents = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load agents.';
        this.loading = false;
        console.error('Failed to fetch agents', err);
      }
    });
  }

  getMappedIcon(icon: string): string {
    const iconMap: Record<string, string> = {
      'book-open': 'menu_book',
      'clipboard': 'assignment',
      'check-circle': 'check_circle',
      'file-text': 'article',
      'video': 'videocam'
    };
    return iconMap[icon] || icon || 'smart_toy';
  }

  selectAgent(agent: AgentResponse): void {
    this.selectedAgent = { ...agent };
    this.isNewAgent = false;
  }

  newAgent(): void {
    this.selectedAgent = {
      id: '',
      name: '',
      description: '',
      category: 'CONTENT',
      icon: 'smart_toy',
      status: 'ACTIVE',
      defaultPromptId: '',
      defaultProviderId: '',
      createdAt: '',
      updatedAt: '',
    };
    this.isNewAgent = true;
  }

  deleteAgent(agent: AgentResponse): void {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;
    this.agentsService.delete(agent.id).subscribe({
      next: () => {
        this.agents = this.agents.filter(a => a.id !== agent.id);
      },
      error: (err) => {
        console.error('Failed to delete agent', err);
      }
    });
  }

  saveAgentSettings(): void {
    if (!this.selectedAgent) return;
    const payload = {
      name: this.selectedAgent.name,
      description: this.selectedAgent.description,
      category: this.selectedAgent.category,
      status: this.selectedAgent.status,
    };
    const op = this.isNewAgent
      ? this.agentsService.create(payload)
      : this.agentsService.update(this.selectedAgent.id, payload);
    op.subscribe({
      next: (saved) => {
        if (this.isNewAgent) {
          this.agents = [...this.agents, saved];
        } else {
          this.agents = this.agents.map(a => a.id === saved.id ? saved : a);
        }
        this.selectedAgent = null;
      },
      error: (err) => {
        console.error('Failed to save agent settings', err);
      }
    });
  }
}
