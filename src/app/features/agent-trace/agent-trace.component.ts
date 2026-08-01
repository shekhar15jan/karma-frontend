import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, interval, switchMap, takeUntil } from 'rxjs';
import { AgentsService } from '../../shared/services/agents.service';
import { AgentResponse } from '../../shared/models/agent.model';
import { ExecutionStepResponse } from '../../shared/models/execution.model';

@Component({
  selector: 'app-agent-trace',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex flex-col gap-5 h-[calc(100vh-100px)] overflow-hidden">
      <div class="glass-panel p-4 rounded-xl flex justify-between items-center shrink-0">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary text-2xl">device_hub</span>
          <div>
            <h2 class="text-sm font-bold uppercase tracking-widest text-on-surface mb-0 leading-none">
              {{ agent ? agent.name : 'Agent' }} <span class="text-primary">· Trace</span>
            </h2>
            <span class="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider mt-1 block">
              {{ agent ? (agent.category + ' · ' + agent.description) : 'Execution history for a single agent' }}
            </span>
          </div>
        </div>
        <a routerLink="/agents" class="flex items-center gap-1 text-[9px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
          <span class="material-symbols-outlined text-[12px]">arrow_back</span> Back to Agents
        </a>
      </div>

      @if (loading && steps.length === 0) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading && steps.length === 0) {
        <div class="glass-panel rounded-xl flex-grow flex flex-col items-center justify-center text-center text-on-surface-variant text-xs p-6 gap-2">
          <span class="material-symbols-outlined text-3xl opacity-50">device_hub</span>
          No execution steps recorded for this agent yet.
        </div>
      }

      @if (steps.length > 0) {
        <div class="flex flex-col gap-2 overflow-y-auto no-scrollbar pr-1">
          <div class="flex items-center justify-between px-1">
            <span class="text-[9px] font-mono text-on-surface-variant uppercase">{{ steps.length }} step(s) recorded</span>
            <span class="text-[9px] font-mono text-on-surface-variant uppercase">auto-refresh 10s</span>
          </div>

          @for (step of steps; track step.id) {
            <div class="glass-panel rounded-xl overflow-hidden">
              <button (click)="toggleStep(step)" class="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-0 bg-transparent text-left">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="material-symbols-outlined text-[18px] {{ getStatusClass(step.status) }}">{{ getStatusIcon(step.status) }}</span>
                  <div class="min-w-0">
                    <div class="text-[11px] font-bold text-on-surface truncate">
                      {{ step.stepType }} <span class="text-on-surface-variant font-normal">· step {{ step.stepOrder }} · execution {{ step.executionId.substring(0, 8) }}</span>
                    </div>
                    <div class="text-[9px] font-mono text-on-surface-variant uppercase">
                      {{ step.modelUsed || 'unknown model' }} · {{ formatDate(step.createdAt) }} · {{ formatDuration(step.latencyMs || 0) }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="px-2 py-0.5 rounded text-[8px] font-bold uppercase {{ getStatusBadgeClass(step.status) }}">{{ step.status }}</span>
                  <span class="material-symbols-outlined text-[14px] text-on-surface-variant">expand_more</span>
                </div>
              </button>

              @if (expandedStepId === step.id) {
                <div class="px-4 pb-4 pt-1 space-y-2 border-t border-outline-variant/20">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <span class="text-[8px] font-mono text-on-surface-variant uppercase block mb-1">Input</span>
                      <pre class="text-[10px] font-mono text-on-surface whitespace-pre-wrap break-words leading-relaxed bg-white/5 border border-outline-variant/20 rounded-lg p-2.5 max-h-48 overflow-y-auto custom-scrollbar mb-0">{{ step.inputData || '-' }}</pre>
                    </div>
                    <div>
                      <span class="text-[8px] font-mono text-on-surface-variant uppercase block mb-1">Prompt Used</span>
                      <pre class="text-[10px] font-mono text-on-surface whitespace-pre-wrap break-words leading-relaxed bg-white/5 border border-outline-variant/20 rounded-lg p-2.5 max-h-48 overflow-y-auto custom-scrollbar mb-0">{{ step.promptUsed || '-' }}</pre>
                    </div>
                  </div>
                  <div>
                    <span class="text-[8px] font-mono text-on-surface-variant uppercase block mb-1">Output</span>
                    <pre class="text-[10px] font-mono text-on-surface whitespace-pre-wrap break-words leading-relaxed bg-white/5 border border-outline-variant/20 rounded-lg p-2.5 max-h-64 overflow-y-auto custom-scrollbar mb-0">{{ step.outputData || '-' }}</pre>
                  </div>
                  @if (step.errorMessage) {
                    <div class="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">Error: {{ step.errorMessage }}</div>
                  }
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-on-surface-variant uppercase">
                    <span>Tokens: {{ step.promptTokens || 0 }} + {{ step.completionTokens || 0 }}</span>
                    <span>Cost: {{ step.cost || 0 }}</span>
                    <span>Latency: {{ formatDuration(step.latencyMs || 0) }}</span>
                    <span>Retries: {{ step.retryCount || 0 }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
})
export class AgentTraceComponent implements OnInit, OnDestroy {
  agent: AgentResponse | null = null;
  steps: ExecutionStepResponse[] = [];
  expandedStepId: string | null = null;
  loading = false;

  private destroy$ = new Subject<void>();
  private agentId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly agentsService: AgentsService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.agentId = params.get('id');
      this.loadData();
    });

    interval(10000)
      .pipe(takeUntil(this.destroy$), switchMap(() => {
        this.loadData();
        return [];
      }))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    if (!this.agentId) return;
    this.loading = true;
    this.agentsService.getById(this.agentId).subscribe({
      next: (agent) => { this.agent = agent; },
      error: () => {}
    });
    this.agentsService.getTrace(this.agentId).subscribe({
      next: (steps) => {
        this.steps = steps;
        this.loading = false;
      },
      error: () => {
        this.steps = [];
        this.loading = false;
      }
    });
  }

  toggleStep(step: ExecutionStepResponse): void {
    this.expandedStepId = this.expandedStepId === step.id ? null : step.id;
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'schedule',
      RUNNING: 'sync',
      COMPLETED: 'check_circle',
      FAILED: 'error',
      CANCELLED: 'cancel',
      PAUSED: 'pause_circle',
    };
    return map[status] || 'help';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'text-on-surface-variant',
      RUNNING: 'text-primary animate-spin',
      COMPLETED: 'text-green-400',
      FAILED: 'text-red-400',
      CANCELLED: 'text-orange-400',
      PAUSED: 'text-yellow-400',
    };
    return map[status] || 'text-on-surface-variant';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'bg-white/5 text-on-surface-variant',
      RUNNING: 'bg-primary/10 text-primary',
      COMPLETED: 'bg-green-500/10 text-green-400',
      FAILED: 'bg-red-500/10 text-red-400',
      CANCELLED: 'bg-orange-500/10 text-orange-400',
      PAUSED: 'bg-yellow-500/10 text-yellow-400',
    };
    return map[status] || 'bg-white/5 text-on-surface-variant';
  }

  formatDuration(ms: number): string {
    if (!ms) return '-';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  formatDate(iso: string): string {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
