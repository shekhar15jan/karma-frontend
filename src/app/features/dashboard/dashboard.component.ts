import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../shared/services/api.service';

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  projects: Project[] = [];
  
  // Real Data Variables
  activeMission: any = null;
  flowsList: any[] = [];
  pendingApprovals: any[] = [];
  
  // Hardware Diagnostics State
  cpuLoad: number = 42;
  gpuLoad: number = 78;
  queueSize: number = 14;
  workers: any[] = [];
  logs: string[] = [];
  private hwInterval: any;
  
  loading = false;
  error: string | null = null;
  heardCommand = 'Say "Wake up Karma" to begin';

  // Wake Up Sequence States
  isSystemAwake = false;
  systemHealth = {
    core: 'Healthy',
    providers: 'Healthy',
    mcp: 'Healthy',
    runtime: 'Healthy',
    voice: 'Healthy'
  };
  agentStatusList: any[] = [];
  defaultAgents = [
    { name: 'Research Agent', icon: 'search', colorClass: 'text-green-400', status: 'Standby' },
    { name: 'Planner Agent', icon: 'assignment', colorClass: 'text-blue-400', status: 'Standby' },
    { name: 'Script Agent', icon: 'description', colorClass: 'text-purple-400', status: 'Standby' },
    { name: 'Blog Agent', icon: 'feed', colorClass: 'text-orange-400', status: 'Standby' },
    { name: 'Image Agent', icon: 'image', colorClass: 'text-pink-400', status: 'Standby' },
    { name: 'Thumbnail Agent', icon: 'grid_view', colorClass: 'text-teal-400', status: 'Standby' },
    { name: 'Voice Agent', icon: 'mic', colorClass: 'text-secondary', status: 'Standby' },
    { name: 'Video Agent', icon: 'videocam', colorClass: 'text-primary-container', status: 'Standby' },
    { name: 'Review Agent', icon: 'rate_review', colorClass: 'text-yellow-400', status: 'Standby' },
    { name: 'Publishing Agent', icon: 'publish', colorClass: 'text-indigo-400', status: 'Standby' }
  ];

  isKarmaSpeaking = false;

  // Floating Sidebar State
  showDiagnosticsSidebar = false;

  toggleDiagnosticsSidebar() {
    this.showDiagnosticsSidebar = !this.showDiagnosticsSidebar;
  }

  private destroy$ = new Subject<void>();
  private drawInterval: any;
  private resizeListener = () => this.drawConnections();
  private heardVoiceListener = (e: any) => {
    this.heardCommand = `Heard: "${e.detail}"`;
  };

  private systemDiagnosticStartListener = () => {
    this.isSystemAwake = true; // Show the panel immediately
    this.systemHealth = {
      core: 'Checking...',
      providers: 'Checking...',
      mcp: 'Checking...',
      runtime: 'Checking...',
      voice: 'Checking...'
    };
  };

  private systemDiagnosticCoreListener = (e: any) => {
    if (e.detail) {
      this.systemHealth = {
        ...this.systemHealth,
        core: e.detail.core || this.systemHealth.core,
        providers: e.detail.providers || this.systemHealth.providers,
        mcp: e.detail.mcp || this.systemHealth.mcp,
        voice: e.detail.voice || this.systemHealth.voice
      };
    }
  };

  showToast(message: string, icon: string = 'info') {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, icon } }));
  }

  activeModal: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads' | null = null;

  openModal(modalType: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads') {
    this.activeModal = modalType;
  }

  closeModal() {
    this.activeModal = null;
  }

  private wakeUpListener = (e: any) => {
    if (e.detail) {
      this.systemHealth = {
        ...this.systemHealth,
        runtime: e.detail.runtime || 'Healthy'
      };
    }
    

    if (e.detail && e.detail.agents) {
      this.agentStatusList = e.detail.agents.map((a: any) => {
        // Find matching default agent to retain its unique identity color
        const defaultAgent = this.defaultAgents.find(da => da.name === a.name);
        return {
          ...a,
          status: a.status || 'Standby',
          colorClass: defaultAgent ? defaultAgent.colorClass : (a.colorClass || 'text-on-surface-variant'),
          borderClass: a.status === 'Offline' ? 'border-red-400/30' : 'border-outline-variant/30',
          pulseClass: ''
        };
      });

      // Simulate lifecycle phases for all agents
      setTimeout(() => {
        this.agentStatusList.forEach(a => { if (a.status !== 'Ready') a.status = 'Context Prep...'; });
      }, 2000);
      setTimeout(() => {
        this.agentStatusList.forEach(a => { if (a.status !== 'Ready') a.status = 'Validating...'; });
      }, 3000);
    }
  };

  private agentReadyListener = (e: any) => {
    if (e.detail && e.detail.agentId) {
      const agent = this.agentStatusList.find(a => a.id === e.detail.agentId);
      if (agent) {
        agent.status = 'Ready';
        agent.borderClass = 'border-green-400/50';
        agent.pulseClass = 'animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.2)]';
      }
    }
  };

  private wakeUpFailedListener = () => {
    this.systemHealth = {
      core: 'ERROR',
      providers: 'ERROR',
      mcp: 'ERROR',
      runtime: 'ERROR',
      voice: 'ERROR'
    };
  };

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadHardwareMock();
    window.addEventListener('heard-voice-command', this.heardVoiceListener);
    window.addEventListener('system-diagnostic-start', this.systemDiagnosticStartListener);
    window.addEventListener('system-diagnostic-core', this.systemDiagnosticCoreListener);
    window.addEventListener('system-wake-up', this.wakeUpListener);
    window.addEventListener('system-wake-up-failed', this.wakeUpFailedListener);
    window.addEventListener('agent-ready', this.agentReadyListener);
    window.addEventListener('karma-speaking', (e: any) => this.isKarmaSpeaking = e.detail);
    
    // Simulate live hardware load
    this.hwInterval = setInterval(() => {
      this.cpuLoad = Math.max(10, Math.min(100, this.cpuLoad + (Math.random() * 10 - 5)));
      this.gpuLoad = Math.max(10, Math.min(100, this.gpuLoad + (Math.random() * 10 - 5)));
    }, 2000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.drawConnections(), 500);
    this.drawInterval = setInterval(() => this.drawConnections(), 150);
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.drawInterval) {
      clearInterval(this.drawInterval);
    }
    if (this.hwInterval) {
      clearInterval(this.hwInterval);
    }
    window.removeEventListener('resize', this.resizeListener);
    window.removeEventListener('heard-voice-command', this.heardVoiceListener);
    window.removeEventListener('system-diagnostic-start', this.systemDiagnosticStartListener);
    window.removeEventListener('system-diagnostic-core', this.systemDiagnosticCoreListener);
    window.removeEventListener('system-wake-up', this.wakeUpListener);
    window.removeEventListener('system-wake-up-failed', this.wakeUpFailedListener);
    window.removeEventListener('agent-ready', this.agentReadyListener);
  }

  private loadDashboard(): void {
    this.loading = true;
    
    // Fetch Active Mission (Find first with status IN_PROGRESS or fallback to latest)
    this.api.get<any[]>('/v1/missions')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const missions = response?.data || response || [];
          if (missions.length > 0) {
            this.activeMission = missions.find((m: any) => m.status === 'IN_PROGRESS' || m.status === 'ACTIVE') || missions[0];
            if (this.activeMission?.createdAt) {
              this.activeMission.formattedDate = new Date(this.activeMission.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
          } else {
            this.activeMission = this.getMockActiveMission();
          }
        },
        error: (err) => {
          console.error('Failed to fetch missions, using fallback', err);
          this.activeMission = this.getMockActiveMission();
        }
      });

    // Fetch Flows
    this.api.get<any[]>('/v1/flows')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const flows = response?.data || response || [];
          this.flowsList = flows.length > 0 ? flows : this.getMockFlows();
        },
        error: (err) => {
          console.error('Failed to fetch flows, using fallback', err);
          this.flowsList = this.getMockFlows();
        }
      });

    // Fetch Pending Approvals
    this.api.get<any[]>('/v1/artifacts/pending-review')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const approvals = response?.data || response || [];
          this.pendingApprovals = approvals.length > 0 ? approvals : this.getMockApprovals();
        },
        error: (err) => {
          console.error('Failed to fetch pending approvals, using fallback', err);
          this.pendingApprovals = this.getMockApprovals();
        }
      });

    this.loading = false;
  }

  private drawConnections(): void {
    const container = document.getElementById('connection-lines-container');
    if (!container) return;

    container.innerHTML = '';
    const nodes = document.querySelectorAll('.karma-node');
    const core = document.querySelector('.z-10.w-52.h-52');
    if (!core) return;

    const containerRect = container.getBoundingClientRect();
    const coreRect = core.getBoundingClientRect();
    const coreX = coreRect.left + coreRect.width / 2 - containerRect.left;
    const coreY = coreRect.top + coreRect.height / 2 - containerRect.top;

    nodes.forEach((node) => {
      const nodeInner = node.querySelector('.lightning-panel');
      if (!nodeInner) return;
      const nodeRect = nodeInner.getBoundingClientRect();
      const nodeX = nodeRect.left + nodeRect.width / 2 - containerRect.left;
      const nodeY = nodeRect.top + nodeRect.height / 2 - containerRect.top;

      const line = document.createElement('div');
      line.className = 'core-connection';

      const dx = nodeX - coreX;
      const dy = nodeY - coreY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      line.style.width = `${distance}px`;
      line.style.left = `${coreX}px`;
      line.style.top = `${coreY}px`;
      line.style.transform = `rotate(${angle}deg)`;
      line.style.opacity = (Math.random() * 0.3 + 0.2).toFixed(2);
      container.appendChild(line);
    });
  }

  triggerVoiceCommand(): void {
    window.dispatchEvent(new CustomEvent('trigger-operator-mic'));
  }

  // --- Mock Data Fallbacks ---
  private getMockActiveMission(): any {
    return {
      name: 'AI Product Launch Campaign',
      missionType: 'PRJ-2025-05-016',
      status: 'IN_PROGRESS',
      formattedDate: 'May 14, 10:30 AM'
    };
  }

  private getMockFlows(): any[] {
    return [
      { id: 1, name: 'Research Flow', status: 'COMPLETED', icon: 'manage_search' },
      { id: 2, name: 'Content Flow', status: 'COMPLETED', icon: 'edit_note' },
      { id: 3, name: 'Media Flow', status: 'IN_PROGRESS', icon: 'movie' },
      { id: 4, name: 'Review Flow', status: 'PENDING', icon: 'rate_review' },
      { id: 5, name: 'Publishing Flow', status: 'PENDING', icon: 'publish' }
    ];
  }

  private getMockApprovals(): any[] {
    return [
      { id: 1, title: 'YouTube Script', type: 'VIDEO_SCRIPT', formattedDate: '2m ago' },
      { id: 2, title: 'Blog Post', type: 'BLOG_POST', formattedDate: '4m ago' },
      { id: 3, title: 'LinkedIn Post', type: 'SOCIAL_POST', formattedDate: '6m ago' }
    ];
  }

  private loadHardwareMock(): void {
    this.workers = [
      { id: 1, name: 'Thread-Core-01', task: 'LLM Response Generation', status: 'running', progress: 78 },
      { id: 2, name: 'Thread-Core-02', task: 'Frame Rendering Pipeline', status: 'running', progress: 45 },
      { id: 3, name: 'Thread-Audio-01', task: 'TTS Voice Synthesis', status: 'running', progress: 92 },
      { id: 4, name: 'Thread-IO-01', task: 'Database Sync', status: 'idle', progress: 0 },
      { id: 5, name: 'Thread-Net-01', task: 'API Webhook Polling', status: 'running', progress: 15 },
    ];
    this.logs = [
      '[SYS] 14:32:01 - Initializing core sub-systems...',
      '[OK]  14:32:01 - PostgreSQL connection established',
      '[OK]  14:32:02 - Redis cache warmed up (0.4s)',
      '[SYS] 14:32:05 - Mounting Agent Runtime Engine',
      '[OK]  14:32:05 - Verified 5 local agents ready',
      '[WARN] 14:32:10 - Provider \'Ollama\' unreachable on localhost:11434',
      '[SYS] 14:32:15 - Awaiting active mission dispatch...'
    ];
  }
}
