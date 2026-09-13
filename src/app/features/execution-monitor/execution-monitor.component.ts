import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ExecutionsService } from '../../shared/services/executions.service';
import { WorkflowsService } from '../../shared/services/workflows.service';
import { SseService } from '../../shared/services/sse.service';
import { ExecutionResponse, ExecutionStepResponse } from '../../shared/models/execution.model';
import { WorkflowRunResponse } from '../../shared/models/workflow.model';

@Component({
  selector: 'app-execution-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './execution-monitor.component.html',
  styleUrl: './execution-monitor.component.scss',
})
export class ExecutionMonitorComponent implements OnInit, OnDestroy {
  executions: ExecutionResponse[] = [];
  selectedExecution: ExecutionResponse | null = null;
  steps: ExecutionStepResponse[] = [];
  expandedStepId: string | null = null;
  workflowRuns: WorkflowRunResponse[] = [];
  loading = true;
  error: string | null = null;
  autoRefresh = true;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly executionsService: ExecutionsService,
    private readonly workflowsService: WorkflowsService,
    private readonly sseService: SseService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.sseService.connect();
    this.sseService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.event.startsWith('execution.') || msg.event === 'step.completed') {
          this.loadData(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.error = null;

    this.executionsService.getAll().subscribe({
      next: (executions) => {
        this.executions = executions;
        this.loading = false;
        if (executions.length > 0 && !this.selectedExecution) {
          this.selectExecution(executions[0]);
        }
      },
      error: (err) => {
        this.error = 'Failed to load executions.';
        this.loading = false;
        console.error(err);
      }
    });

    this.workflowsService.getRuns().subscribe({
      next: (runs) => {
        this.workflowRuns = runs;
      },
      error: () => {}
    });
  }

  selectExecution(execution: ExecutionResponse): void {
    this.selectedExecution = execution;
    this.expandedStepId = null;
    this.executionsService.getSteps(execution.id).subscribe({
      next: (steps) => {
        this.steps = steps;
      },
      error: () => {
        this.steps = [];
      }
    });
  }

  cancelExecution(id: string): void {
    this.executionsService.cancel(id).subscribe(() => {
      this.loadData();
    });
  }

  resumeExecution(exec: ExecutionResponse): void {
    this.executionsService.getSteps(exec.id).subscribe({
      next: (steps) => {
        const failed = steps.find(s => s.status === 'FAILED');
        const isVideo = failed?.stepType?.toUpperCase().includes('VIDEO');
        const obs = isVideo ? this.executionsService.retryVideo(exec.id) : this.executionsService.retryScript(exec.id);
        obs.subscribe({
          next: () => this.loadData(),
          error: () => this.loadData()
        });
      },
      error: () => {
        this.executionsService.retryScript(exec.id).subscribe(() => this.loadData());
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
      WAITING: 'rate_review',
      RESTARTED: 'restart_alt',
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
      WAITING: 'text-yellow-400',
      RESTARTED: 'text-amber-400',
      PAUSED: 'text-yellow-400',
    };
    return map[status] || 'text-on-surface-variant';
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

  formatCost(cost: number): string {
    if (cost == null) return '0';
    return cost.toFixed(6);
  }
}
