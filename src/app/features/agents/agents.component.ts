import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgentsService } from '../../shared/services/agents.service';
import { ProvidersService } from '../../shared/services/providers.service';
import { SkillsService } from '../../shared/services/skills.service';
import { AgentResponse } from '../../shared/models/agent.model';
import { ProviderResponse } from '../../shared/models/provider.model';
import { SkillResponse } from '../../shared/models/skill.model';
import { McpServer, McpService } from '../../shared/services/mcp.service';
import { StatusToggleComponent } from '../../shared/components/status-toggle/status-toggle.component';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StatusToggleComponent],
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.scss']
})
export class AgentsComponent implements OnInit {
  agents: AgentResponse[] = [];
  providers: ProviderResponse[] = [];
  skills: SkillResponse[] = [];
  mcpServers: McpServer[] = [];
  selectedAgent: AgentResponse | null = null;
  selectedSkillIds: string[] = [];
  selectedMcpServerIds: string[] = [];
  isNewAgent = false;
  loading = false;
  private readonly togglingIds = new Set<string>();
  error: string | null = null;

  constructor(
    private readonly agentsService: AgentsService,
    private readonly providersService: ProvidersService,
    private readonly skillsService: SkillsService,
    private readonly mcpService: McpService
  ) {}

  ngOnInit(): void {
    this.loadAgents();
    this.loadProviders();
    this.loadSkills();
    this.loadMcpServers();
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

  loadProviders(): void {
    this.providersService.getAll().subscribe({
      next: (data) => this.providers = data,
      error: (err) => console.error('Failed to load providers', err)
    });
  }

  loadSkills(): void {
    this.skillsService.getAll().subscribe({
      next: (data) => this.skills = data.filter(s => s.status === 'ACTIVE' || s.status === 'INSTALLED'),
      error: (err) => console.error('Failed to load skills', err)
    });
  }

  loadMcpServers(): void {
    this.mcpService.getAll().subscribe({
      next: (data) => this.mcpServers = data,
      error: (err) => console.error('Failed to load MCP servers', err)
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

  getProviderLabel(agent: AgentResponse): string {
    if (agent.providerName) return agent.providerName;
    return agent.defaultProviderId ? 'Custom' : 'Default';
  }

  getModelLabel(agent: AgentResponse): string {
    return agent.model || 'Provider default';
  }

  get selectedProvider(): ProviderResponse | null {
    if (!this.selectedAgent || !this.selectedAgent.defaultProviderId) return null;
    return this.providers.find(p => p.id === this.selectedAgent!.defaultProviderId) ?? null;
  }

  get availableModels(): string[] {
    return this.selectedProvider && this.selectedProvider.models ? this.selectedProvider.models : [];
  }

  onProviderChange(): void {
    const models = this.availableModels;
    if (this.selectedAgent && this.selectedAgent.model && models.length && !models.includes(this.selectedAgent.model)) {
      this.selectedAgent.model = '';
    }
  }

  isSkillSelected(skillId: string): boolean {
    return this.selectedSkillIds.includes(skillId);
  }

  toggleSkill(skillId: string): void {
    const idx = this.selectedSkillIds.indexOf(skillId);
    if (idx >= 0) {
      this.selectedSkillIds.splice(idx, 1);
    } else {
      this.selectedSkillIds.push(skillId);
    }
  }

  isMcpSelected(serverId: string): boolean {
    return this.selectedMcpServerIds.includes(serverId);
  }

  toggleMcpServer(serverId: string): void {
    const idx = this.selectedMcpServerIds.indexOf(serverId);
    if (idx >= 0) {
      this.selectedMcpServerIds.splice(idx, 1);
    } else {
      this.selectedMcpServerIds.push(serverId);
    }
  }

  selectAgent(agent: AgentResponse): void {
    this.selectedAgent = { ...agent };
    this.selectedSkillIds = (agent.skills || []).map(s => s.id);
    this.selectedMcpServerIds = (agent.mcpServers || []).map(s => s.id);
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
      providerName: '',
      providerType: '',
      model: '',
      temperature: 0.7,
      memoryMode: 'OFF',
      skills: [],
      mcpServers: [],
      createdAt: '',
      updatedAt: '',
    };
    this.selectedSkillIds = [];
    this.selectedMcpServerIds = [];
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

  toggleAgent(agent: AgentResponse): void {
    if (this.togglingIds.has(agent.id)) return;
    this.togglingIds.add(agent.id);
    const original = agent.status;
    const target = original === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.agents = this.agents.map(a => a.id === agent.id ? { ...a, status: target } : a);
    const op = target === 'ACTIVE'
      ? this.agentsService.activate(agent.id)
      : this.agentsService.deactivate(agent.id);
    op.subscribe({
      next: () => {
        this.togglingIds.delete(agent.id);
        this.showToast(target === 'ACTIVE' ? `Agent "${agent.name}" activated` : `Agent "${agent.name}" deactivated`, target === 'ACTIVE' ? 'check_circle' : 'toggle_off');
      },
      error: (err) => {
        this.togglingIds.delete(agent.id);
        this.agents = this.agents.map(a => a.id === agent.id ? { ...a, status: original } : a);
        this.showToast(`Failed to update agent: ${err?.error?.message || err?.message || 'unknown error'}`, 'error');
        console.error('Failed to toggle agent', err);
      }
    });
  }

  saveAgentSettings(): void {
    if (!this.selectedAgent) return;
    const payload: Partial<AgentResponse> = {
      name: this.selectedAgent.name,
      description: this.selectedAgent.description,
      category: this.selectedAgent.category,
      status: this.selectedAgent.status,
      icon: this.selectedAgent.icon || 'smart_toy',
      defaultProviderId: this.selectedAgent.defaultProviderId || '',
      model: this.selectedAgent.model || '',
      temperature: this.selectedAgent.temperature ?? 0.7,
      memoryMode: this.selectedAgent.memoryMode || 'OFF',
      skillIds: this.selectedSkillIds,
      mcpServerIds: this.selectedMcpServerIds,
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

  showToast(message: string, icon: string = 'info'): void {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, icon } }));
  }
}
