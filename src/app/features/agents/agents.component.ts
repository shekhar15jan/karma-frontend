import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentsService } from '../../shared/services/agents.service';
import { AgentResponse } from '../../shared/models/agent.model';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  agents: AgentResponse[] = [];
  selectedAgent: AgentResponse | null = null;
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
    this.agentsService.update(this.selectedAgent.id, this.selectedAgent).subscribe({
      next: () => {
        this.agents = this.agents.map(a => a.id === this.selectedAgent!.id ? this.selectedAgent! : a);
        this.selectedAgent = null;
      },
      error: (err) => {
        console.error('Failed to save agent settings', err);
      }
    });
  }
}
