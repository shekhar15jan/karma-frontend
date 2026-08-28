import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MissionsService } from '../../shared/services/missions.service';
import { ExecutionsService } from '../../shared/services/executions.service';
import { ExecutionResponse, ExecutionStepResponse } from '../../shared/models/execution.model';
import { SseService } from '../../shared/services/sse.service';

interface WorkerState {
  id: string;
  name: string;
  task: string;
  progress: number;
  status: 'running' | 'idle' | 'paused';
}

@Component({
  selector: 'app-mission-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mission-control.component.html',
  styleUrls: ['./mission-control.component.scss']
})
export class MissionControlComponent implements OnInit, OnDestroy {
  executions: ExecutionResponse[] = [];
  steps: ExecutionStepResponse[] = [];
  workers: WorkerState[] = [];
  logs: string[] = [];
  cpuLoad = 0;
  gpuLoad = 0;
  queueSize = 0;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  constructor(
    private readonly executionsService: ExecutionsService,
    private readonly sseService: SseService,
  ) {}

  ngOnInit(): void {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs = [
      `[SYS] ${stamp} - Mission Control online, awaiting execution data...`
    ];
    this.loadExecutions();
    
    this.sseService.connect();
    this.sseService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.event.startsWith('execution.') || msg.event.startsWith('mission.') || msg.event.startsWith('step.')) {
          this.loadExecutions();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadExecutions(): void {
    this.error = null;

    this.executionsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (executions) => {
          this.executions = executions;
          if (executions.length > 0) {
            const active = executions.find(e => e.status === 'RUNNING' || e.status === 'PENDING') || executions[0];
            this.loadSteps(active.id);
            this.workers = executions.slice(0, 6).map((ex, i) => ({
              id: ex.id.substring(0, 8),
              name: `Exec ${ex.id.substring(0, 8)}`,
              task: `Mission ${ex.missionId?.substring(0, 8) || 'N/A'}`,
              progress: ex.status === 'COMPLETED' ? 100 : ex.status === 'RUNNING' ? 50 : 0,
              status: (ex.status === 'RUNNING' ? 'running' : ex.status === 'COMPLETED' ? 'idle' : 'paused') as 'running' | 'idle' | 'paused',
            }));
            this.queueSize = executions.filter(e => e.status === 'PENDING').length;
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load executions.';
          this.loading = false;
          console.error('Failed to fetch executions', err);
        }
      });
  }

  private loadSteps(executionId: string): void {
    this.executionsService.getSteps(executionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (steps) => {
          this.steps = steps;
          const pending = steps.filter(s => s.status === 'PENDING').length;
          const running = steps.filter(s => s.status === 'RUNNING').length;
          const completed = steps.filter(s => s.status === 'COMPLETED').length;
          const total = steps.length;

          this.queueSize = pending;
          this.cpuLoad = total > 0 ? Math.min(100, Math.round(((completed + running) / total) * 100)) : 0;
          this.gpuLoad = total > 0 ? Math.min(100, Math.round((running / total) * 100) * 3) : 0;

          const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const entry = (level: string, msg: string) => `[${level}] ${stamp} - ${msg}`;
          const fresh = [
            entry('SYS', `Execution ${executionId.substring(0, 8)} sync`),
            entry('OK', `${completed} of ${total} steps completed`),
          ];
          if (running > 0) fresh.push(entry('RUN', `${running} step(s) actively executing`));
          if (pending > 0) fresh.push(entry('WARN', `${pending} step(s) waiting in queue`));
          const failed = steps.filter(s => s.status === 'FAILED').length;
          if (failed > 0) fresh.push(entry('FAIL', `${failed} step(s) failed`));
          this.logs = [...fresh.reverse(), ...this.logs].slice(0, 40);
        },
        error: (err) => {
          console.error('Failed to load steps', err);
          this.error = 'Failed to load execution steps.';
        }
      });
  }
}
