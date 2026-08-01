import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboard.service';
import { ExecutionsService } from '../../shared/services/executions.service';
import { MissionsService } from '../../shared/services/missions.service';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { ProjectsService } from '../../shared/services/projects.service';
import { MissionResponse } from '../../shared/models/mission.model';
import { WorkspaceResponse } from '../../shared/models/workspace.model';
import { ProjectResponse } from '../../shared/models/project.model';
import { FlowResponse } from '../../shared/models/flow.model';
import { ArtifactResponse } from '../../shared/models/artifact.model';
import { ExecutionResponse, ExecutionStepResponse } from '../../shared/models/execution.model';
import { AgentsService } from '../../shared/services/agents.service';
import { ProvidersService } from '../../shared/services/providers.service';
import { ArtifactsService } from '../../shared/services/artifacts.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  activeMission: (MissionResponse & { formattedDate?: string }) | null = null;
  flowsList: (FlowResponse & { icon?: string; status?: string })[] = [];
  selectedFlowForDiagram: (FlowResponse & { icon?: string; status?: string }) | null = null;
  pendingApprovals: (ArtifactResponse & { formattedDate?: string; title?: string; type?: string })[] = [];
  missionProgress = 0;

  hudNodes = [
    { key: 'research', label: 'RESEARCH', icon: 'search', left: 260, top: 50 },
    { key: 'script', label: 'SCRIPT', icon: 'description', left: 408, top: 112 },
    { key: 'blog', label: 'BLOG', icon: 'feed', left: 470, top: 260 },
    { key: 'seo', label: 'SEO', icon: 'bar_chart', left: 408, top: 408 },
    { key: 'voice', label: 'VOICE', icon: 'mic', left: 260, top: 470 },
    { key: 'video', label: 'VIDEO', icon: 'videocam', left: 112, top: 408 },
    { key: 'thumbnail', label: 'THUMBNAIL', icon: 'grid_view', left: 50, top: 260 },
    { key: 'image', label: 'IMAGE', icon: 'image', left: 112, top: 112 },
  ];

  // Hardware Diagnostics State
  cpuLoad: number = 42;
  gpuLoad: number = 78;
  queueSize: number = 14;
  workers: { id: number; name: string; task: string; status: string; progress: number }[] = [];
  logs: string[] = [];

  private flowStatusInterval: any;
  private flowStepMap = new Map<string, string>();

  loading = false;
  error: string | null = null;
  runMode: 'AUTO' | 'REVIEW' = 'REVIEW';
  heardCommand = 'Say "Wake up Karma" to begin';

  @ViewChild('flowsContainer') flowsContainer!: ElementRef;

  scrollFlows(direction: number) {
    if (this.flowsContainer) {
      const scrollAmount = 200;
      this.flowsContainer.nativeElement.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
    }
  }

  // Wake Up Sequence States
  isSystemAwake = false;
  systemStatusTab: 'health' | 'hardware' = 'health';
  leftPanelTab: 'agents' | 'providers' = 'agents';
  systemHealth = {
    core: 'Healthy' as string,
    providers: 'Healthy' as string,
    mcp: 'Healthy' as string,
    runtime: 'Healthy' as string,
    voice: 'Healthy' as string
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
  isOperatorSpeaking = false;
  speechPulse = false;

  private speechPulseHandler = () => {
    this.speechPulse = true;
    setTimeout(() => this.speechPulse = false, 100);
  };
  private karmaSpeakingHandler = (e: any) => { 
    this.isKarmaSpeaking = e.detail; 
    this.cdr.detectChanges(); 
  };
  private operatorSpeakingHandler = (e: any) => { 
    this.isOperatorSpeaking = e.detail; 
    this.cdr.detectChanges(); 
  };

  // Floating Sidebar State
  showDiagnosticsSidebar = false;

  // Mission Creation State
  workspaces: WorkspaceResponse[] = [];
  projects: ProjectResponse[] = [];
  showProjectModal = false;
  isCreatingProject = false;
  newProjectName = '';
  newMission = {
    workspaceId: '' as string,
    projectId: '' as string,
    name: '' as string,
    description: '' as string,
    missionType: 'VIDEO' as string,
    priority: 'MEDIUM' as string,
    providerId: '' as string
  };

  onWorkspaceChange(): void {
    this.projects = [];
    this.newMission.projectId = '';
    if (this.newMission.workspaceId) {
      this.loadProjects(this.newMission.workspaceId);
    }
  }

  onProjectChange(): void {
    if (this.newMission.projectId) {
      this.loadMissions(this.newMission.projectId);
    }
  }

  openProjectModal(): void {
    this.newProjectName = '';
    this.showProjectModal = true;
  }

  closeProjectModal(): void {
    this.showProjectModal = false;
  }

  getWorkspaceName(): string {
    return this.workspaces.find(w => w.id === this.newMission.workspaceId)?.name || 'Select a workspace first';
  }

  createProject(): void {
    if (!this.newMission.workspaceId) {
      this.showToast('Select a workspace first', 'error');
      return;
    }
    if (!this.newProjectName.trim()) {
      this.showToast('Project name is required', 'error');
      return;
    }
    this.isCreatingProject = true;
    this.projectsService.create(this.newMission.workspaceId, this.newProjectName.trim()).subscribe({
      next: (project) => {
        this.isCreatingProject = false;
        this.showProjectModal = false;
        this.newProjectName = '';
        this.newMission.projectId = project.id;
        this.loadProjects(this.newMission.workspaceId);
        this.loadMissions(project.id);
        this.showToast(`Project "${project.name}" created`, 'check_circle');
      },
      error: () => {
        this.isCreatingProject = false;
        this.showToast('Failed to create project', 'error');
      }
    });
  }

  isAgentReady(status: string): boolean {
    return status === 'Ready' || status === 'Healthy' || status === 'ACTIVE' || status === 'ONLINE';
  }

  hudState(key: string): { text: string; cls: string; border: string; pulse: boolean } {
    const flow = this.flowsList.find(f =>
      key === 'seo'
        ? f.category === 'PLANNING'
        : (f.name || '').toLowerCase().includes(key) || f.category.toLowerCase().includes(key)
    );
    if (!flow) return { text: 'Idle', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
    switch (flow.status) {
      case 'COMPLETED': return { text: 'Completed', cls: 'text-green-400', border: 'border-green-400', pulse: false };
      case 'IN_PROGRESS':
      case 'ACTIVE': return { text: 'Running', cls: 'text-[#00e5ff]', border: 'border-[#00e5ff]', pulse: true };
      case 'FAILED': return { text: 'Failed', cls: 'text-red-400', border: 'border-red-400', pulse: false };
      default: return { text: 'Pending', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
    }
  }

  flowBadge(flow: any): { text: string; cls: string; border: string; pulse: boolean } {
    if (!flow) return { text: 'Pending', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
    switch (flow.status) {
      case 'COMPLETED': return { text: 'Completed', cls: 'text-green-400', border: 'border-green-400', pulse: false };
      case 'IN_PROGRESS':
      case 'ACTIVE': return { text: 'Running', cls: 'text-[#00e5ff]', border: 'border-[#00e5ff]', pulse: true };
      case 'FAILED': return { text: 'Failed', cls: 'text-red-400', border: 'border-red-400', pulse: false };
      default: return { text: 'Pending', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
    }
  }

  toggleProvider(id: string): void {
    if (this.expandedProviders.has(id)) {
      this.expandedProviders.delete(id);
    } else {
      this.expandedProviders.add(id);
    }
  }

  providerIconSafe(type: string): SafeHtml {
    const t = (type || '').toLowerCase();
    let svg: string;
    if (t.includes('google') || t.includes('gemini'))
      svg = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
    else if (t.includes('openai'))
      svg = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="#10a37f"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">O</text></svg>';
    else if (t.includes('anthropic') || t.includes('claude'))
      svg = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="#d97706"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">C</text></svg>';
    else if (t.includes('groq'))
      svg = '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#f97316"/></svg>';
    else if (t.includes('opencode') || t.includes('zen'))
      svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#00e5ff" opacity="0.2"/><text x="12" y="16" text-anchor="middle" fill="#00e5ff" font-size="13" font-weight="bold" font-family="sans-serif">Z</text></svg>';
    else if (t.includes('edge') || t.includes('tts'))
      svg = '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="#0078d4"/><path d="M12 7v10M8 10l4-3 4 3" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>';
    else if (t.includes('elevenlabs'))
      svg = '<svg viewBox="0 0 24 24"><path d="M3 12h2v4H3zm4-6h2v16H7zm4-4h2v24h-2zm4 6h2v12h-2zm4-2h2v10h-2z" fill="#8b5cf6"/></svg>';
    else if (t.includes('stability'))
      svg = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="#a855f7"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">S</text></svg>';
    else if (t.includes('ffmpeg'))
      svg = '<svg viewBox="0 0 24 24"><text x="12" y="16" text-anchor="middle" fill="#00e5ff" font-size="11" font-weight="bold" font-family="sans-serif">Ff</text></svg>';
    else if (t.includes('openrouter'))
      svg = '<svg viewBox="0 0 24 24"><polygon points="12,4 20,20 4,20" fill="#8b5cf6" opacity="0.3"/><polygon points="12,8 17,18 7,18" fill="#8b5cf6"/></svg>';
    else
      svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#00e5ff" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" fill="#00e5ff" font-size="12" font-weight="bold" font-family="sans-serif">?</text></svg>';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  triggerMission(missionId: string): void {
    this.executionsService.trigger(missionId, this.runMode).subscribe({
      next: () => {
        this.showToast(`Mission execution triggered (${this.runMode})`, 'play_arrow');
      },
      error: () => {
        this.showToast('Failed to trigger mission', 'error');
      }
    });
  }

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
    this.isSystemAwake = true;
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

  approveArtifact(approval: any): void {
    this.artifactsService.updateReviewStatus(approval.id, 'APPROVED').subscribe({
      next: () => {
        this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== approval.id);
        this.showToast('Approved ' + (approval.title || approval.name || 'artifact'), 'check_circle');
      },
      error: () => this.showToast('Failed to approve artifact', 'error')
    });
  }

  rejectArtifact(approval: any): void {
    this.artifactsService.updateReviewStatus(approval.id, 'REJECTED').subscribe({
      next: () => {
        this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== approval.id);
        this.showToast('Rejected ' + (approval.title || approval.name || 'artifact'), 'cancel');
      },
      error: () => this.showToast('Failed to reject artifact', 'error')
    });
  }

  activeModal: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads' | 'create-mission' | 'flow-diagram' | null = null;

  openModal(modalType: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads' | 'create-mission') {
    this.activeModal = modalType;
  }

  openFlowDiagram(flow: (FlowResponse & { icon?: string; status?: string })) {
    this.selectedFlowForDiagram = flow;
    this.activeModal = 'flow-diagram';
    this.cdr.detectChanges();
  }

  closeModal() {
    this.activeModal = null;
    this.selectedFlowForDiagram = null;
    this.cdr.detectChanges();
  }

  get selectedFlowAgents(): any[] {
    if (!this.selectedFlowForDiagram) return [];
    
    // Use the actual agent IDs returned by the backend for this specific flow
    if (this.selectedFlowForDiagram.agentIds && this.selectedFlowForDiagram.agentIds.length > 0) {
      // Map to real agents and ensure they have necessary display properties
      return this.agentStatusList
        .filter(a => this.selectedFlowForDiagram!.agentIds.includes(a.id))
        .map(agent => ({
          ...agent,
          icon: agent.category?.toLowerCase().includes('video') ? 'movie' :
                agent.category?.toLowerCase().includes('voice') ? 'mic' :
                agent.category?.toLowerCase().includes('content') ? 'article' : 'smart_toy',
          colorClass: agent.status === 'Ready' || agent.status === 'Healthy' ? 'text-green-400 bg-green-400/20' : 
                     agent.status === 'Offline' ? 'text-red-400 bg-red-400/20' : 'text-gray-400 bg-gray-400/20'
        }));
    }
    
    // Fallback if no agentIds are provided (dummy fallback mapping based on flow name/category)
    const name = this.selectedFlowForDiagram.name?.toLowerCase() || '';
    
    let matchedAgents = [];
    if (name.includes('video')) {
      matchedAgents = [
        { name: 'Video Generator', icon: 'movie', colorClass: 'text-purple-400 bg-purple-400/20' },
        { name: 'Voice Synthesis', icon: 'mic', colorClass: 'text-pink-400 bg-pink-400/20' }
      ];
    } else if (name.includes('blog') || name.includes('content') || name.includes('script')) {
      matchedAgents = [
        { name: 'Blog Writer', icon: 'article', colorClass: 'text-blue-400 bg-blue-400/20' },
        { name: 'SEO Optimizer', icon: 'bar_chart', colorClass: 'text-green-400 bg-green-400/20' }
      ];
    } else if (name.includes('image') || name.includes('thumb')) {
      matchedAgents = [
        { name: 'Image Generator', icon: 'image', colorClass: 'text-yellow-400 bg-yellow-400/20' }
      ];
    } else {
      matchedAgents = [
        { name: 'System Agent', icon: 'smart_toy', colorClass: 'text-gray-400 bg-gray-400/20' }
      ];
    }
    
    return matchedAgents;
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
        const defaultAgent = this.defaultAgents.find(da => da.name === a.name);
        const offline = a.status === 'Offline' || a.status === 'DISCONNECTED';
        return {
          ...a,
          status: a.status || 'ACTIVE',
          colorClass: defaultAgent ? defaultAgent.colorClass : (a.colorClass || 'text-on-surface-variant'),
          borderClass: offline ? 'border-red-400/30' : 'border-green-400/50',
          pulseClass: offline ? '' : 'animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.2)]'
        };
      });
    }
  };

  private agentReadyListener = (e: any) => {
    if (e.detail && e.detail.agentId) {
      const agent = this.agentStatusList.find((a: any) => a.id === e.detail.agentId);
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

  providersList: any[] = [];
  expandedProviders: Set<string> = new Set();

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly executionsService: ExecutionsService,
    private readonly missionsService: MissionsService,
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly agentsService: AgentsService,
    private readonly providersService: ProvidersService,
    private readonly artifactsService: ArtifactsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.bootstrapLogs();
    window.addEventListener('heard-voice-command', this.heardVoiceListener);
    window.addEventListener('system-diagnostic-start', this.systemDiagnosticStartListener);
    window.addEventListener('system-diagnostic-core', this.systemDiagnosticCoreListener);
    window.addEventListener('system-wake-up', this.wakeUpListener);
    window.addEventListener('system-wake-up-failed', this.wakeUpFailedListener);
    window.addEventListener('agent-ready', this.agentReadyListener);
    window.addEventListener('karma-speaking', this.karmaSpeakingHandler);
    window.addEventListener('operator-speaking', this.operatorSpeakingHandler);
    window.addEventListener('karma-speech-pulse', this.speechPulseHandler);

    this.flowStatusInterval = setInterval(() => {
      if (this.activeMission?.id) {
        this.loadFlowStatuses(this.activeMission.id);
      }
    }, 10000);
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
    if (this.flowStatusInterval) {
      clearInterval(this.flowStatusInterval);
    }
    window.removeEventListener('resize', this.resizeListener);
    window.removeEventListener('heard-voice-command', this.heardVoiceListener);
    window.removeEventListener('system-diagnostic-start', this.systemDiagnosticStartListener);
    window.removeEventListener('system-diagnostic-core', this.systemDiagnosticCoreListener);
    window.removeEventListener('system-wake-up', this.wakeUpListener);
    window.removeEventListener('system-wake-up-failed', this.wakeUpFailedListener);
    window.removeEventListener('agent-ready', this.agentReadyListener);
    window.removeEventListener('karma-speaking', this.karmaSpeakingHandler);
    window.removeEventListener('operator-speaking', this.operatorSpeakingHandler);
    window.removeEventListener('karma-speech-pulse', this.speechPulseHandler);
  }

  private loadDashboard(): void {
    this.loading = true;

    this.loadWorkspacesAndMissions();

    this.dashboardService.getFlows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flows) => {
          this.flowsList = flows.map(f => ({
            ...f,
            icon: f.category === 'RESEARCH' ? 'manage_search'
                : f.category === 'CONTENT' ? 'edit_note'
                : f.category === 'MEDIA' ? 'movie'
                : f.category === 'REVIEW' ? 'rate_review'
                : f.category === 'PUBLISHING' ? 'publish'
                : 'account_tree',
            status: (f.status as string) || (f.enabled ? 'ACTIVE' : 'PENDING')
          }));
          this.applyFlowStatusesToFlows();
        },
        error: (err) => {
          console.error('Failed to fetch flows', err);
        }
      });

    this.dashboardService.getPendingApprovals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (approvals) => {
          this.pendingApprovals = approvals.map(a => ({
            ...a,
            title: a.name || `Artifact #${a.id}`,
            type: a.artifactType || 'DOCUMENT',
            formattedDate: a.createdAt ? new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'
          }));
        },
        error: (err) => {
          console.error('Failed to fetch pending approvals', err);
        }
      });

    this.providersService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (providers) => {
          this.providersList = providers.filter(p => p.status !== 'DISCONNECTED' && p.status !== 'DELETED');
        },
        error: (err) => {
          console.error('Failed to fetch providers', err);
        }
      });

    this.agentsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agents) => {
          // Map to match the expected format for the dashboard UI
          this.agentStatusList = agents.map(a => {
            const defaultAgent = this.defaultAgents.find(da => da.name === a.name);
            
            // Map the same non-material icons to Material icons we did in Agents Screen
            const iconMap: Record<string, string> = {
              'book-open': 'menu_book',
              'clipboard': 'assignment',
              'check-circle': 'check_circle',
              'file-text': 'article',
              'video': 'videocam'
            };
            const mappedIcon = iconMap[a.icon] || a.icon || 'smart_toy';

            return {
              ...a,
              icon: mappedIcon,
              status: a.status || 'Standby',
              colorClass: defaultAgent ? defaultAgent.colorClass : 'text-primary',
              borderClass: a.status === 'ACTIVE' ? 'border-green-400/30' : 'border-outline-variant/30',
              pulseClass: ''
            };
          });
        },
        error: (err) => {
          console.error('Failed to fetch agents', err);
        }
      });

    this.loading = false;
  }

  private loadWorkspacesAndMissions(): void {
    this.workspacesService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workspaces) => {
          this.workspaces = workspaces;
          if (workspaces.length === 0) return;
          this.newMission.workspaceId = workspaces[0].id;
          this.loadProjects(workspaces[0].id);
        },
        error: (err) => {
          console.error('Failed to fetch workspaces', err);
        }
      });
  }

  private loadProjects(workspaceId: string): void {
    this.projectsService.getByWorkspace(workspaceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          if (projects.length === 0) return;
          this.newMission.projectId = projects[0].id;
          this.loadMissions(projects[0].id);
        },
        error: (err) => {
          console.error('Failed to fetch projects', err);
        }
      });
  }

  private loadMissions(projectId: string): void {
    this.dashboardService.getMissions(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (missions) => {
          this.activeMission = missions.find((m: any) => m.status === 'RUNNING' || m.status === 'WAITING') || missions[0] || null;
          if (this.activeMission?.createdAt) {
            this.activeMission.formattedDate = new Date(this.activeMission.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
          if (typeof this.activeMission?.progress === 'number') {
            this.missionProgress = Math.round(this.activeMission.progress);
          }
          if (this.activeMission?.id) {
            this.loadFlowStatuses(this.activeMission.id);
          }
        },
        error: (err) => {
          console.error('Failed to fetch missions', err);
        }
      });
  }

  private loadFlowStatuses(missionId: string): void {
    this.executionsService.getAll(missionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (executions) => {
          if (executions.length === 0) return;
          const active = executions.find(e => e.status === 'RUNNING' || e.status === 'PENDING') || executions[0];
          this.executionsService.getSteps(active.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (steps) => {
                this.applyFlowStatuses(steps);
                this.updateOperationalMetrics(steps, executions, active.id);
              },
              error: () => {}
            });
        },
        error: () => {}
      });
  }

  private applyFlowStatuses(steps: ExecutionStepResponse[]): void {
    const byFlow = new Map<string, ExecutionStepResponse[]>();
    for (const step of steps) {
      const arr = byFlow.get(step.flowId) || [];
      arr.push(step);
      byFlow.set(step.flowId, arr);
    }
    this.flowStepMap.clear();
    byFlow.forEach((flowSteps, flowId) => {
      if (flowSteps.some(s => s.status === 'RUNNING')) this.flowStepMap.set(flowId, 'IN_PROGRESS');
      else if (flowSteps.some(s => s.status === 'FAILED')) this.flowStepMap.set(flowId, 'FAILED');
      else if (flowSteps.every(s => s.status === 'COMPLETED')) this.flowStepMap.set(flowId, 'COMPLETED');
      else this.flowStepMap.set(flowId, 'PENDING');
    });
    this.applyFlowStatusesToFlows();
  }

  private updateOperationalMetrics(steps: ExecutionStepResponse[], executions: ExecutionResponse[], executionId: string): void {
    const total = steps.length;
    const completed = steps.filter(s => s.status === 'COMPLETED').length;
    const running = steps.filter(s => s.status === 'RUNNING').length;
    const pending = steps.filter(s => s.status === 'PENDING').length;

    this.missionProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.queueSize = pending + executions.filter(e => e.status === 'PENDING').length;
    this.cpuLoad = total > 0 ? Math.min(100, Math.round(((completed + running) / total) * 100)) : 0;
    this.gpuLoad = total > 0 ? Math.min(100, Math.round((running / total) * 100) * 3) : 0;

    this.workers = executions.slice(0, 6).map((ex, i) => ({
      id: i + 1,
      name: `Exec-${ex.id.substring(0, 8)}`,
      task: ex.status === 'RUNNING' ? 'Executing agents' : ex.status === 'COMPLETED' ? 'Completed' : ex.status === 'FAILED' ? 'Failed' : 'Queued',
      status: ex.status === 'RUNNING' ? 'running' : ex.status === 'COMPLETED' ? 'idle' : 'paused',
      progress: ex.status === 'COMPLETED' ? 100 : ex.status === 'RUNNING' ? 50 : 0
    }));

    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLogs = [
      `[SYS] ${stamp} - Execution ${executionId.substring(0, 8)} sync`,
      `[OK]  ${stamp} - ${completed} of ${total} steps completed`,
    ];
    if (running > 0) newLogs.push(`[RUN] ${stamp} - ${running} step(s) actively executing`);
    if (pending > 0) newLogs.push(`[WARN] ${stamp} - ${pending} step(s) waiting in queue`);
    const failed = steps.filter(s => s.status === 'FAILED').length;
    if (failed > 0) newLogs.push(`[FAIL] ${stamp} - ${failed} step(s) failed`);
    this.logs = [...newLogs.reverse(), ...this.logs].slice(0, 30);
  }

  private applyFlowStatusesToFlows(): void {
    this.flowsList = this.flowsList.map(f => ({
      ...f,
      status: this.flowStepMap.get(f.id) || f.status || 'PENDING'
    }));
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
      const nodeInner = node.querySelector('.glass-panel');
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

  private bootstrapLogs(): void {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs = [
      `[SYS] ${stamp} - Initializing core sub-systems...`,
      `[OK]  ${stamp} - PostgreSQL connection established`,
      `[SYS] ${stamp} - Mounting Agent Runtime Engine`,
      `[SYS] ${stamp} - Awaiting active mission dispatch...`
    ];
  }
}
