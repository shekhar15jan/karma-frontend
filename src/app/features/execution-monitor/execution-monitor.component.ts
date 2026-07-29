import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, switchMap, takeUntil, catchError } from 'rxjs';
import { of } from 'rxjs';
import { ApiService } from '../../shared/services/api.service';

interface PipelineStage {
  id: string;
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  duration: number;
  retry_count: number;
  started_at: string | null;
  error_message: string | null;
}

interface PipelineStatus {
  id: string;
  project_id: string;
  workflow_name: string;
  overall_progress: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  stages: PipelineStage[];
  started_at: string;
  total_duration: number;
  artifacts_produced: number;
  cost: number;
}

@Component({
  selector: 'app-execution-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './execution-monitor.component.html',
  styleUrl: './execution-monitor.component.scss',
})
export class ExecutionMonitorComponent implements OnInit, OnDestroy {
  @Input() projectId = '';
  @Input() runId = '';

  pipeline: PipelineStatus | null = null;
  loading = true;
  error: string | null = null;
  autoRefresh = true;

  private destroy$ = new Subject<void>();

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.autoRefresh = false;
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startPolling(): void {
    this.fetchStatus();
    if (this.autoRefresh) {
      interval(5000)
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() => this.fetchStatusObservable()),
        )
        .subscribe();
    }
  }

  private fetchStatusObservable() {
    return this.api.get<PipelineStatus>(`/v1/projects/${this.projectId}/pipeline/status`).pipe(
      catchError(() => of(null)),
    );
  }

  private fetchStatus(): void {
    this.api.get<PipelineStatus>(`/v1/projects/${this.projectId}/pipeline/status`)
      .pipe(
        catchError(err => {
          this.error = 'Failed to load pipeline status.';
          this.loading = false;
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(data => {
        if (data) {
          this.pipeline = data;
          this.loading = false;
          this.error = null;
        }
      });
  }

  pausePipeline(): void {
    this.api.post(`/v1/projects/${this.projectId}/pipeline/${this.runId}/pause`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchStatus());
  }

  rerunStage(stageId: string): void {
    this.api.post(`/v1/projects/${this.projectId}/pipeline/${this.runId}/rerun`, { stage_id: stageId })
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchStatus());
  }

  cancelStage(stageId: string): void {
    this.api.post(`/v1/projects/${this.projectId}/pipeline/${this.runId}/cancel`, { stage_id: stageId })
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.fetchStatus());
  }

  progressPercentage(): number {
    if (!this.pipeline) return 0;
    return Math.min(100, Math.max(0, this.pipeline.overall_progress));
  }

  isComplete(): boolean {
    return this.pipeline?.status === 'completed';
  }

  isRunning(): boolean {
    return this.pipeline?.status === 'running';
  }

  isFailed(): boolean {
    return this.pipeline?.status === 'failed';
  }

  isPaused(): boolean {
    return this.pipeline?.status === 'paused';
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-secondary',
      running: 'bg-info',
      completed: 'bg-success',
      failed: 'bg-danger',
      paused: 'bg-warning',
    };
    return map[status] || 'bg-secondary';
  }

  statusIcon(status: string): string {
    const map: Record<string, string> = {
      pending: 'bi-hourglass',
      running: 'bi-arrow-repeat',
      completed: 'bi-check-circle',
      failed: 'bi-x-circle',
      paused: 'bi-pause-circle',
    };
    return map[status] || 'bi-question-circle';
  }

  progressBarClass(): string {
    if (!this.pipeline) return 'bg-primary';
    const map: Record<string, string> = {
      completed: 'bg-success',
      failed: 'bg-danger',
      paused: 'bg-warning',
      running: 'bg-info',
    };
    return map[this.pipeline.status] || 'bg-primary';
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}
