import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

interface SystemAgent {
  id: string;
  name: string;
  description: string;
  role: string;
  successRate: number;
  totalRuns: number;
  temperature: number;
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  agents: SystemAgent[] = [];
  selectedAgent: SystemAgent | null = null;
  loading = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.loading = true;
    this.api.get<SystemAgent[]>('/v1/agents/list').subscribe({
      next: (data) => {
        this.agents = data && data.length ? data : this.getMockAgents();
        this.loading = false;
      },
      error: () => {
        this.agents = this.getMockAgents();
        this.loading = false;
      }
    });
  }

  selectAgent(agent: SystemAgent): void {
    this.selectedAgent = { ...agent };
  }

  saveAgentSettings(): void {
    if (!this.selectedAgent) return;
    this.api.post(`/v1/agents/${this.selectedAgent.id}/configure`, this.selectedAgent).subscribe({
      next: () => {
        this.agents = this.agents.map(a => a.id === this.selectedAgent!.id ? this.selectedAgent! : a);
        this.selectedAgent = null;
      },
      error: () => {
        // Local fallback update
        this.agents = this.agents.map(a => a.id === this.selectedAgent!.id ? this.selectedAgent! : a);
        this.selectedAgent = null;
      }
    });
  }

  private getMockAgents(): SystemAgent[] {
    return [
      { id: 'agent-1', name: 'Project Manager', description: 'Orchestrates the entire generation pipeline and allocates resources.', role: 'Coordinator', successRate: 98, totalRuns: 1420, temperature: 0.2 },
      { id: 'agent-2', name: 'Research Agent', description: 'Gathers trending news facts, search transcripts, and analytics.', role: 'Information Gatherer', successRate: 95, totalRuns: 1105, temperature: 0.3 },
      { id: 'agent-3', name: 'Script Writer', description: 'Generates creative script dialogs, speech narration, and stage directions.', role: 'Creative Director', successRate: 92, totalRuns: 950, temperature: 0.7 },
      { id: 'agent-4', name: 'Fact Checker', description: 'Verifies script statements and parameters before rendering.', role: 'Auditor', successRate: 99, totalRuns: 820, temperature: 0.1 },
      { id: 'agent-5', name: 'Audience Analyst', description: 'Applies hook formulas to optimize the first 5 seconds for viral appeal.', role: 'Optimizer', successRate: 94, totalRuns: 730, temperature: 0.6 }
    ];
  }
}
