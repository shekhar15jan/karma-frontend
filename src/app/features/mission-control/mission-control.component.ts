import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';

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
  workers: WorkerState[] = [];
  logs: string[] = [];
  cpuLoad = 42;
  gpuLoad = 68;
  queueSize = 3;
  private logInterval: any;
  private progressInterval: any;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.workers = [
      { id: 'W-1', name: 'Renderer Thread 1', task: 'Stitching video tracks via FFmpeg', progress: 45, status: 'running' },
      { id: 'W-2', name: 'TTS Voice Engine', task: 'Synthesizing voiceover track', progress: 82, status: 'running' },
      { id: 'W-3', name: 'Asset Downloader', task: 'Idle', progress: 0, status: 'idle' }
    ];

    this.logs = [
      '[SYSTEM] Initializing Mission Control Worker Threads...',
      '[SYSTEM] All connections to OpenRouter API verified.',
      '[W-2] Generating audio speech track for script PRJ-01...',
      '[W-1] Parsing media source clips (4 video tracks found)...',
      '[SYSTEM] Waiting for publisher queue approvals...'
    ];

    this.startSimulation();
  }

  ngOnDestroy(): void {
    if (this.logInterval) clearInterval(this.logInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
  }

  private startSimulation(): void {
    // Simulate log outputs
    const sampleLogs = [
      '[W-1] Rendered chunk 12/64 in 1.2s (avg latency 140ms)',
      '[W-2] Speech synthesis completed for scene 3',
      '[SYSTEM] Memory garbage collection clean completed',
      '[W-3] Fetching image asset from unsplash provider...',
      '[SYSTEM] Syncing analytics dashboards...'
    ];

    this.logInterval = setInterval(() => {
      const randomLog = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
      this.logs.unshift(`[${timestamp}] ${randomLog}`);
      if (this.logs.length > 50) this.logs.pop();

      // Slightly fluctuate cpu/gpu load
      this.cpuLoad = Math.max(20, Math.min(95, this.cpuLoad + (Math.random() > 0.5 ? 4 : -4)));
      this.gpuLoad = Math.max(30, Math.min(98, this.gpuLoad + (Math.random() > 0.5 ? 5 : -5)));
    }, 3000);

    // Simulate progress updates
    this.progressInterval = setInterval(() => {
      this.workers = this.workers.map(w => {
        if (w.status === 'running') {
          let nextProgress = w.progress + Math.floor(Math.random() * 8) + 2;
          if (nextProgress >= 100) {
            nextProgress = 0;
            w.task = w.id === 'W-1' ? 'Compiling audio tracks' : 'Generating TTS';
          }
          return { ...w, progress: nextProgress };
        }
        return w;
      });
    }, 1500);
  }
}
