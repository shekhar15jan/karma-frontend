import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MissionsService } from '../../shared/services/missions.service';
import { ExecutionsService } from '../../shared/services/executions.service';
import { ExecutionResponse, ExecutionStepResponse } from '../../shared/models/execution.model';

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

  constructor(
    private readonly missionsService: MissionsService,
    private readonly executionsService: ExecutionsService,
  ) {}

  ngOnInit(): void {
    this.loadExecutions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadExecutions(): void {
    this.loading = true;
    this.error = null;

    this.executionsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (executions) => {
          this.executions = executions;
          if (executions.length > 0) {
            this.loadSteps(executions[0].id);
            this.workers = executions.slice(0, 4).map((ex, i) => ({
              id: ex.id.substring(0, 4),
              name: `Execution ${i + 1}`,
              task: `Mission ${ex.missionId?.substring(0, 8) || 'N/A'}`,
              progress: ex.status === 'COMPLETED' ? 100 : ex.status === 'RUNNING' ? 45 : 0,
              status: (ex.status === 'RUNNING' ? 'running' : ex.status === 'COMPLETED' ? 'idle' : 'paused') as 'running' | 'idle' | 'paused',
            }));
            this.cpuLoad = executions.filter(e => e.status === 'RUNNING').length * 15;
            this.gpuLoad = executions.filter(e => e.status === 'RUNNING').length * 20;
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
          this.queueSize = steps.filter(s => s.status === 'PENDING').length;
        },
        error: (err) => {
          console.error('Failed to load steps', err);
          this.error = 'Failed to load execution steps.';
        }
      });
  }
}
