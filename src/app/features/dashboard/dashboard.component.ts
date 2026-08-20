import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../shared/services/dashboard.service';
import { ExecutionsService } from '../../shared/services/executions.service';
import { Router } from '@angular/router';
import { MissionsService } from '../../shared/services/missions.service';
import { WorkspacesService } from '../../shared/services/workspaces.service';
import { ProjectsService } from '../../shared/services/projects.service';
import { SourceDocumentsService } from '../../shared/services/source-documents.service';
import { MissionResponse } from '../../shared/models/mission.model';
import { WorkspaceResponse } from '../../shared/models/workspace.model';
import { ProjectResponse } from '../../shared/models/project.model';
import { FlowResponse, FlowDetail } from '../../shared/models/flow.model';
import { ArtifactResponse } from '../../shared/models/artifact.model';
import { ExecutionResponse, ExecutionStepResponse } from '../../shared/models/execution.model';
import { AgentsService } from '../../shared/services/agents.service';
import { ProvidersService } from '../../shared/services/providers.service';
import { ArtifactsService } from '../../shared/services/artifacts.service';
import { KarmaActionService } from '../../shared/services/karma-action.service';
import { WorkflowsService } from '../../shared/services/workflows.service';
import { ReviewsService } from '../../shared/services/reviews.service';
import { SseService } from '../../shared/services/sse.service';
import { PendingStepReviewResponse } from '../../shared/models/pending-step-review.model';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../shared/services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  activeMission: (MissionResponse & { formattedDate?: string }) | null = null;
  activeStepsByAgent = new Map<string, string>(); // agentId -> status (e.g. RUNNING, COMPLETED, PENDING, FAILED)
  flowsList: (FlowResponse & { icon?: string; status?: string })[] = [];
  selectedFlowForDiagram: (FlowResponse & { icon?: string; status?: string }) | null = null;
  selectedFlowDetail: FlowDetail | null = null;
  flowDetailLoading = false;
  designNodes: any[] = [];
  designEdges: any[] = [];
  designBounds = { minX: 0, minY: 0, width: 800, height: 600 };
  pendingApprovals: (ArtifactResponse & { formattedDate?: string; title?: string; type?: string })[] = [];
  missionProgress = 0;
  missionSteps: ExecutionStepResponse[] = [];
  directReviewStep: ExecutionStepResponse | null = null;

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

  flowStepMap: Map<string, string> = new Map();
  hubStatus: Record<string, { text: string; cls: string; border: string; pulse: boolean; pct: number }> = {};
  activeMissionMode: 'AUTO' | 'REVIEW' | null = null;

  loading = false;
  error: string | null = null;
  runMode: 'AUTO' | 'REVIEW' = 'AUTO';
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
  pendingStepReviews: PendingStepReviewResponse[] = [];
  selectedReviewStep: PendingStepReviewResponse | null = null;
  reviewFeedback = '';
  reviewSubmitting = false;
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
  isCreatingMission = false;
  showProjectModal = false;
  isCreatingProject = false;
  newProjectName = '';
  selectedSourceFile: File | null = null;
  newMission = {
    workspaceId: '' as string,
    projectId: '' as string,
    name: '' as string,
    description: '' as string,
    missionType: 'VIDEO' as string,
    priority: 'MEDIUM' as string,
    providerId: '' as string,
    outputDirectory: '' as string,
    targetDurationSeconds: '' as string,
    theme: 'whiteboard' as string
  };
  selectedFlowIds: string[] = [];
  selectedFlowId: string = '';

  isFlowSelected(flowId: string): boolean {
    return this.selectedFlowIds.includes(flowId);
  }

  toggleFlow(flowId: string): void {
    const idx = this.selectedFlowIds.indexOf(flowId);
    if (idx >= 0) {
      this.selectedFlowIds.splice(idx, 1);
    } else {
      this.selectedFlowIds.push(flowId);
    }
  }

  toggleAllFlows(): void {
    this.selectedFlowIds = this.allFlowsSelected()
      ? []
      : this.flowsList.filter(f => f.enabled !== false).map(f => f.id);
  }

  allFlowsSelected(): boolean {
    const enabled = this.flowsList.filter(f => f.enabled !== false);
    return enabled.length > 0 && this.selectedFlowIds.length === enabled.length;
  }

  onWorkspaceChange(): void {
    this.projects = [];
    this.newMission.projectId = '';
    if (this.newMission.workspaceId) {
      const ws = this.workspaces.find(w => w.id === this.newMission.workspaceId);
      if (ws?.defaultOutputDirectory && !this.newMission.outputDirectory) {
        this.newMission.outputDirectory = ws.defaultOutputDirectory;
      }
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

  openMissionModal(): void {
    if (this.workspaces.length === 0) {
      this.showToast('Please create a workspace first', 'error');
      return;
    }
    this.newMission = {
      workspaceId: this.workspaces[0].id,
      projectId: '',
      name: '',
      description: '',
      missionType: 'VIDEO',
      priority: 'HIGH',
      providerId: '',
      outputDirectory: this.workspaces[0].defaultOutputDirectory || '',
      targetDurationSeconds: '',
      theme: 'whiteboard'
    };
    if (this.projects.length > 0) {
      this.newMission.projectId = this.projects[0].id;
    }
    this.selectedSourceFile = null;
    this.selectedFlowId = this.flowsList.length > 0 ? this.flowsList[0].id : '';
    this.selectedFlowIds = this.selectedFlowId ? [this.selectedFlowId] : [];
    this.activeModal = 'create-mission';
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
      error: (err) => {
        this.isCreatingProject = false;
        this.showToast('Failed to create project: ' + (err?.error?.message || err?.message || 'unknown error'), 'error');
      }
    });
  }

  createMission(runAfterCreate: boolean): void {
    if (!this.newMission.projectId || !this.newMission.name?.trim()) {
      this.showToast('Project and Mission Name are required', 'error');
      return;
    }
    this.isCreatingMission = true;
    const payload = {
      projectId: this.newMission.projectId,
      name: this.newMission.name.trim(),
      description: this.newMission.description?.trim() || undefined,
      missionType: this.newMission.missionType,
      priority: this.newMission.priority,
      providerId: this.newMission.providerId || undefined,
      selectedFlowIds: this.selectedFlowId ? [this.selectedFlowId] : (this.selectedFlowIds.length > 0 ? [...this.selectedFlowIds] : undefined),
      outputDirectory: this.newMission.outputDirectory?.trim() || undefined,
      targetDurationSeconds: this.newMission.targetDurationSeconds
        ? Math.max(30, Number(this.newMission.targetDurationSeconds))
        : undefined,
      theme: this.newMission.theme
    };
    this.missionsService.create(payload).subscribe({
      next: (created) => {
        this.isCreatingMission = false;
        this.showToast(`Mission "${created.name}" created`, 'check_circle');
        this.activeModal = null;
        this.newMission.name = '';
        this.newMission.description = '';
        this.newMission.targetDurationSeconds = '';
        this.loadMissions(this.newMission.projectId);
        
        const triggerExecution = () => {
          if (runAfterCreate) {
            this.executionsService.trigger(created.id, this.runMode).subscribe({
              next: () => {
                this.showToast('Mission execution started', 'play_arrow');
                this.router.navigate(['/executions']);
              },
              error: (err) => this.showToast('Failed to start execution: ' + (err?.error?.message || err?.message || 'missing flows or configuration'), 'error')
            });
          }
        };

        if (this.selectedSourceFile) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            this.sourceDocsService.upload({
              missionId: created.id,
              filename: this.selectedSourceFile!.name,
              format: this.selectedSourceFile!.name.split('.').pop() || 'txt',
              content: content
            }).subscribe({
              next: () => {
                this.showToast('Source document uploaded', 'check_circle');
                triggerExecution();
              },
              error: (err) => {
                this.showToast('Failed to upload source document', 'error');
                triggerExecution(); // Trigger anyway or fail? Let's trigger anyway.
              }
            });
          };
          reader.readAsText(this.selectedSourceFile);
        } else {
          triggerExecution();
        }
      },
      error: (err) => {
        this.isCreatingMission = false;
        this.showToast('Failed to create mission: ' + (err?.error?.message || 'unknown error'), 'error');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedSourceFile = file;
    }
  }

  isAgentReady(status: string): boolean {
    return status === 'Ready' || status === 'Healthy' || status === 'ACTIVE' || status === 'ONLINE';
  }

  hudState(key: string): { text: string; cls: string; border: string; pulse: boolean } {
    const s = this.hubStatus[key];
    if (s) return { text: s.text, cls: s.cls, border: s.border, pulse: s.pulse };
    return { text: 'Idle', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
  }

  hudCircleCls(key: string): string {
    const base = 'w-14 h-14 rounded-full glass-panel flex items-center justify-center';
    const s = this.hubStatus[key];
    if (!s) return `${base} border-outline-variant/50 opacity-60`;
    const glow = s.pulse
      ? ' rotating-green-light'
      : s.text === 'Completed'
        ? ' shadow-[0_0_18px_rgba(74,222,128,0.35)]'
        : s.text === 'Failed'
          ? ' shadow-[0_0_18px_rgba(239,68,68,0.35)]'
          : '';
    return `${base} ${s.border}${glow}`;
  }

  hubPct(key: string): string {
    const s = this.hubStatus[key];
    return s ? s.pct + '%' : '0%';
  }

  flowBadge(flow: any): { text: string; cls: string; border: string; pulse: boolean } {
    if (!flow) return { text: 'Pending', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false };
    switch (flow.status) {
      case 'COMPLETED': return { text: 'Completed', cls: 'text-green-400', border: 'border-green-400', pulse: false };
      case 'RUNNING':
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
    else if (t.includes('groq'))
      svg = '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#f97316"/></svg>';
    else if (t.includes('opencode') || t.includes('zen'))
      svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#00e5ff" opacity="0.2"/><text x="12" y="16" text-anchor="middle" fill="#00e5ff" font-size="13" font-weight="bold" font-family="sans-serif">Z</text></svg>';
    else if (t.includes('edge') || t.includes('tts'))
      svg = '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="#0078d4"/><path d="M12 7v10M8 10l4-3 4 3" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>';
    else if (t.includes('remotion'))
      svg = '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="14" height="12" rx="2" fill="none" stroke="#00e5ff" stroke-width="1.5"/><path d="M20 10l-3 2 3 2" stroke="#00e5ff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    else if (t.includes('openrouter'))
      svg = '<svg viewBox="0 0 24 24"><polygon points="12,4 20,20 4,20" fill="#8b5cf6" opacity="0.3"/><polygon points="12,8 17,18 7,18" fill="#8b5cf6"/></svg>';
    else
      svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#00e5ff" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" fill="#00e5ff" font-size="12" font-weight="bold" font-family="sans-serif">?</text></svg>';
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  setRunMode(mode: 'AUTO' | 'REVIEW'): void {
    this.runMode = mode;
    this.showToast(`Run mode set to ${mode}`, 'toggle_on');
  }

  triggerMission(missionId: string): void {
    this.executionsService.trigger(missionId, this.runMode).subscribe({
      next: () => {
        this.showToast(`Mission execution triggered (${this.runMode})`, 'play_arrow');
      },
      error: (err) => {
        this.showToast('Failed to trigger mission: ' + (err?.error?.message || err?.message || 'missing configuration'), 'error');
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

  activeModal: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads' | 'create-mission' | 'flow-diagram' | 'review' | 'direct-review' | null = null;

  openModal(modalType: 'agents' | 'providers' | 'flows' | 'approvals' | 'threads' | 'create-mission' | 'flow-diagram' | 'review' | 'direct-review') {
    this.activeModal = modalType;
  }

  openFlowDiagram(flow: (FlowResponse & { icon?: string; status?: string })) {
    this.selectedFlowForDiagram = flow;
    this.selectedFlowDetail = null;
    this.flowDetailLoading = true;
    this.activeModal = 'flow-diagram';
    this.cdr.detectChanges();
    this.workflowsService.getFlowDetails(flow.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.selectedFlowDetail = detail;
          this.flowDetailLoading = false;
          this.buildDesignView(detail);
          this.cdr.detectChanges();
        },
        error: () => {
          this.flowDetailLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  closeModal() {
    this.activeModal = null;
    this.selectedFlowForDiagram = null;
    this.selectedFlowDetail = null;
    this.selectedReviewStep = null;
    this.directReviewStep = null;
    this.designNodes = [];
    this.designEdges = [];
    this.cdr.detectChanges();
  }

  loadPendingReviews(): void {
    this.reviewsService.getPendingStepReviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (steps) => {
          this.pendingStepReviews = steps;
          if (this.selectedReviewStep) {
            const match = steps.find(s => s.stepId === this.selectedReviewStep!.stepId);
            this.selectedReviewStep = match ?? null;
          }
        },
        error: () => {}
      });
  }

  pendingReviewForAgent(agentId: string): PendingStepReviewResponse | null {
    return this.pendingStepReviews.find(s => s.agentId === agentId) || null;
  }

  selectReviewForDiagram(step: PendingStepReviewResponse): void {
    this.selectedReviewStep = step;
    this.reviewFeedback = '';
    this.cdr.detectChanges();
  }

  approveReviewStep(): void {
    const step = this.selectedReviewStep;
    if (!step || this.reviewSubmitting) return;
    this.reviewSubmitting = true;
    this.reviewsService.submit({ stepId: step.stepId, decision: 'APPROVED' }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.afterReviewAction(step);
      },
      error: () => {
        this.reviewSubmitting = false;
      }
    });
  }

  rejectReviewStep(): void {
    const step = this.selectedReviewStep;
    if (!step || this.reviewSubmitting) return;
    this.reviewSubmitting = true;
    this.reviewsService.submit({
      stepId: step.stepId,
      decision: 'REJECTED',
      comments: this.reviewFeedback
    }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.afterReviewAction(step);
      },
      error: () => {
        this.reviewSubmitting = false;
      }
    });
  }

  private afterReviewAction(step: PendingStepReviewResponse): void {
    this.reviewFeedback = '';
    this.loadPendingReviews();
    if (this.activeMission?.id) {
      this.loadFlowStatuses(this.activeMission.id);
    }
  }

  stepTypeLabel(type: string): string {
    switch (type) {
      case 'LLM_CALL': return 'LLM Call';
      case 'IMAGE_GENERATION': return 'Image Generation';
      case 'TTS': return 'Voiceover';
      case 'VIDEO_GENERATION': return 'Video Assembly';
      case 'MUSIC_GENERATION': return 'Music Generation';
      case 'PUBLISH': return 'Publish';
      default: return type || 'Unknown';
    }
  }

  reviewRetriesExhausted(step: PendingStepReviewResponse | null): boolean {
    return !!step && (step.retryCount ?? 0) >= (step.maxRetries || 3);
  }

  reviewOutputUrls(step: any): string[] {
    if (!step || !step.outputData) return [];
    const trimmed = step.outputData.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('http') || trimmed.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
      const apiBase = environment.apiUrl;
      const token = localStorage.getItem('karma_token') || '';
      return trimmed.split(/\r?\n/).map((u: string) => {
        let url = u.trim();
        if (/^[a-zA-Z]:[\\/]/.test(url)) {
          return `${apiBase}/v1/artifacts/stream?path=${encodeURIComponent(url)}&token=${token}`;
        }
        return url;
      }).filter((u: string) => u.length > 0);
    }
    return [];
  }

  private buildDesignView(detail: FlowDetail): void {
    const rawNodes = Array.isArray(detail.design?.nodes) ? detail.design.nodes : [];
    const rawEdges = Array.isArray(detail.design?.edges) ? detail.design.edges : [];

    const nodes = rawNodes.map((n: any) => ({
      id: String(n.id),
      label: n.label || n.agentName || 'Agent',
      agentId: n.agentId || '',
      agentName: n.agentName || '',
      status: (n.status === 'ready' || n.status === 'configured' || n.status === 'pending') ? n.status : 'pending',
      stepKind: n.stepKind === 'VIDEO' || n.stepKind === 'PUBLISH' ? n.stepKind : 'AGENT',
      x: Number(n.x) || 80,
      y: Number(n.y) || 80,
    }));

    const edges = rawEdges.map((e: any) => ({
      id: String(e.id || `edge-${Math.random()}`),
      source: String(e.source ?? e.from),
      target: String(e.target ?? e.to),
      sourcePort: e.sourcePort || 'right',
      targetPort: e.targetPort || 'left',
      handoff: e.handoff === undefined ? true : !!e.handoff,
    }));

    const incoming = new Set(edges.map(e => e.target));
    const outgoing = new Set(edges.map(e => e.source));
    const starts = nodes.filter(n => !incoming.has(n.id));
    const sinks = nodes.filter(n => !outgoing.has(n.id));

    const startSource = starts[0] || nodes[0];
    const endSink = sinks[sinks.length - 1] || nodes[nodes.length - 1];

    const startX = startSource ? (startSource.x as number) - 280 : 80;
    const startY = startSource ? (startSource.y as number) : 80;
    const endX = endSink ? (endSink.x as number) + 176 + 280 : 900;
    const endY = endSink ? (endSink.y as number) : 80;

    const allNodes: any[] = [
      { id: 'start', label: 'Start', agentId: '', agentName: 'Flow Start', status: 'ready', stepKind: 'START', x: startX, y: startY },
      ...nodes,
      { id: 'end', label: 'Finish', agentId: '', agentName: 'Flow End', status: 'ready', stepKind: 'END', x: endX, y: endY },
    ];

    const allEdges: any[] = [...edges];
    if (startSource) allEdges.push({ id: 'edge-start', source: 'start', target: startSource.id, sourcePort: 'right', targetPort: 'left', handoff: true });
    if (endSink) allEdges.push({ id: 'edge-end', source: endSink.id, target: 'end', sourcePort: 'right', targetPort: 'left', handoff: true });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of allNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 176);
      maxY = Math.max(maxY, n.y + 84);
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }

    this.designNodes = allNodes;
    this.designEdges = allEdges;
    this.designBounds = { minX, minY, width: maxX - minX, height: maxY - minY };
  }

  designNodeIcon(node: any): string {
    if (node.stepKind === 'START') return 'play_arrow';
    if (node.stepKind === 'END') return 'flag';
    const agent = this.agentStatusList.find(a => a.id === node.agentId);
    if (agent?.icon) return agent.icon;
    const def = this.defaultAgents.find(d => d.name === node.agentName);
    return def?.icon || 'smart_toy';
  }

  designNodeIconClass(node: any): string {
    if (node.stepKind === 'START') return 'text-cyan-400';
    if (node.stepKind === 'END') return 'text-green-400';
    if (node.stepKind === 'VIDEO') return 'text-purple-400';
    if (node.stepKind === 'PUBLISH') return 'text-green-400';
    return 'text-[#00e5ff]';
  }

  designNodeBorderClass(node: any): string {
    const activeStatus = this.activeStepsByAgent.get(node.agentId);
    if (activeStatus === 'RUNNING') return 'border border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.4)] animate-pulse';
    if (activeStatus === 'COMPLETED') return 'border-l-4 border-green-500';
    if (activeStatus === 'FAILED') return 'border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    
    if (node.stepKind === 'START' || node.stepKind === 'END') return 'border-l-4 border-cyan-400';
    if (node.stepKind === 'VIDEO') return 'border-l-4 border-purple-500';
    if (node.stepKind === 'PUBLISH') return 'border-l-4 border-green-500';
    return 'border-l-4 border-primary-container';
  }

  designNodeBgClass(node: any): string {
    const activeStatus = this.activeStepsByAgent.get(node.agentId);
    if (activeStatus === 'RUNNING') return 'bg-primary/10';
    if (activeStatus === 'COMPLETED') return 'bg-green-500/10';
    if (activeStatus === 'FAILED') return 'bg-red-500/10';

    if (node.stepKind === 'START') return 'bg-surface-container';
    if (node.stepKind === 'END') return 'bg-surface-container';
    return 'bg-surface-container';
  }
  
  designNodeStatus(node: any): string {
    const activeStatus = this.activeStepsByAgent.get(node.agentId);
    if (activeStatus) return activeStatus;
    return node.status;
  }

  designOutputX(nodeId: string, port?: string): number {
    const node = this.designNodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'bottom') return node.x + 88;
    return node.x + 176;
  }

  designOutputY(nodeId: string, port?: string): number {
    const node = this.designNodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'bottom') return node.y + 84;
    return node.y + 42;
  }

  designInputX(nodeId: string, port?: string): number {
    const node = this.designNodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'top') return node.x + 88;
    return node.x;
  }

  designInputY(nodeId: string, port?: string): number {
    const node = this.designNodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'top') return node.y;
    return node.y + 42;
  }

  designNodePath(edge: any): string {
    const x1 = this.designOutputX(edge.source, edge.sourcePort);
    const y1 = this.designOutputY(edge.source, edge.sourcePort);
    const x2 = this.designInputX(edge.target, edge.targetPort);
    const y2 = this.designInputY(edge.target, edge.targetPort);

    let endX = x2;
    let endY = y2;
    if (edge.targetPort === 'top') {
      endY = y2 - 4;
    } else {
      endX = x2 - 4;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    if (edge.sourcePort === 'right' && edge.targetPort === 'left') {
      return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${endX} ${endY}`;
    } else if (edge.sourcePort === 'bottom' && edge.targetPort === 'top') {
      return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${endX} ${endY}`;
    } else if (edge.sourcePort === 'right' && edge.targetPort === 'top') {
      return `M ${x1} ${y1} L ${x2} ${y1} L ${endX} ${endY}`;
    } else if (edge.sourcePort === 'bottom' && edge.targetPort === 'left') {
      return `M ${x1} ${y1} L ${x1} ${y2} L ${endX} ${endY}`;
    }
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${endX} ${endY}`;
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

  flowDetailRunStatusCls(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 border-green-500/40 bg-green-500/10';
      case 'FAILED': return 'text-red-400 border-red-500/40 bg-red-500/10';
      case 'RUNNING': return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      default: return 'text-on-surface-variant border-outline-variant/30 bg-white/5';
    }
  }

  artifactTypeIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('video')) return 'movie';
    if (t.includes('image') || t.includes('thumb')) return 'image';
    if (t.includes('audio') || t.includes('voice')) return 'music_note';
    if (t.includes('pdf')) return 'picture_as_pdf';
    return 'description';
  }

  fmtDateTime(ts: string | undefined | null): string {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
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
    private readonly router: Router,
    private readonly missionsService: MissionsService,
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly agentsService: AgentsService,
    private readonly providersService: ProvidersService,
    private readonly artifactsService: ArtifactsService,
    private readonly workflowsService: WorkflowsService,
    private readonly reviewsService: ReviewsService,
    private readonly karmaActions: KarmaActionService,
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer,
    private readonly sourceDocsService: SourceDocumentsService,
    private readonly sseService: SseService
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.bootstrapLogs();
    this.karmaActions.onAction.pipe(takeUntil(this.destroy$)).subscribe(a => this.executeKarmaAction(a));
    window.addEventListener('heard-voice-command', this.heardVoiceListener);
    window.addEventListener('system-diagnostic-start', this.systemDiagnosticStartListener);
    window.addEventListener('system-diagnostic-core', this.systemDiagnosticCoreListener);
    window.addEventListener('system-wake-up', this.wakeUpListener);
    window.addEventListener('system-wake-up-failed', this.wakeUpFailedListener);
    window.addEventListener('agent-ready', this.agentReadyListener);
    window.addEventListener('karma-speaking', this.karmaSpeakingHandler);
    window.addEventListener('operator-speaking', this.operatorSpeakingHandler);
    window.addEventListener('karma-speech-pulse', this.speechPulseHandler);

    this.sseService.connect();
    this.sseService.onMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.event.startsWith('execution.') || msg.event.startsWith('mission.') || msg.event.startsWith('step.')) {
          if (this.activeMission?.id) {
            this.loadFlowStatuses(this.activeMission.id);
          }
          this.loadPendingReviews();
        }
      });
  }

  private reportActionOutcome(action: any, success: boolean, note?: string): void {
    const eventId = action?.eventId || action?.params?.eventId;
    if (!eventId) return;
    this.api.postData('/v1/memory/feedback', { eventId, success, note }).subscribe({
      error: () => console.warn('Failed to record action feedback', eventId)
    });
  }

  private executeKarmaAction(action: any): void {
    if (!action?.type) return;
    const params = action.params || {};
    const role = (this.auth.user()?.role || 'OPERATOR').toUpperCase();

    const canOperate = (): boolean => {
      if (role === 'ADMIN') return true;
      if (role === 'OPERATOR') {
        return ['navigate', 'open_modal', 'prefill_mission', 'create_workspace', 'create_project',
                'create_mission', 'trigger_mission', 'set_run_mode', 'approve_artifact', 'reject_artifact',
                'remember_memory']
          .includes(action.type);
      }
      return false;
    };

    if (!canOperate()) {
      this.showToast(`KARMA cannot perform this — your role (${role}) does not allow it`, 'lock');
      return;
    }

    if (action.type === 'open_modal') {
      const modal = String(params.modal || '');
      if (modal === 'create-mission' || modal === 'flows' || modal === 'providers' || modal === 'agents' || modal === 'approvals') {
        this.openModal(modal as any);
        this.showToast(`KARMA opened the ${modal} view`, 'touch_app');
        this.reportActionOutcome(action, true, `opened ${modal}`);
      } else {
        this.reportActionOutcome(action, false, 'unknown modal: ' + modal);
      }
      return;
    }

    if (action.type === 'prefill_mission') {
      if (params.workspaceId && this.workspaces.some(w => w.id === params.workspaceId)) {
        this.newMission.workspaceId = params.workspaceId;
        this.newMission.projectId = '';
        this.loadProjects(this.newMission.workspaceId, params.projectId);
      }
      if (params.name) this.newMission.name = params.name;
      if (params.description) this.newMission.description = params.description;
      if (params.missionType) this.newMission.missionType = params.missionType;
      if (params.priority) this.newMission.priority = params.priority;
      if (params.providerId) this.newMission.providerId = params.providerId;
      if (params.runMode === 'AUTO' || params.runMode === 'REVIEW') this.runMode = params.runMode;
      this.openModal('create-mission');
      this.cdr.detectChanges();
      this.reportActionOutcome(action, true, 'mission form pre-filled');
      return;
    }

    if (action.type === 'set_run_mode') {
      if (params.runMode === 'AUTO' || params.runMode === 'REVIEW') {
        this.runMode = params.runMode;
        this.showToast(`KARMA set run mode to ${params.runMode}`, 'toggle_on');
        this.reportActionOutcome(action, true, `run mode ${params.runMode}`);
      } else {
        this.reportActionOutcome(action, false, 'invalid runMode');
      }
      return;
    }

    if (action.type === 'create_workspace') {
      const name = String(params.name || '').trim();
      if (!name) {
        this.showToast('KARMA could not create workspace: name missing', 'error');
        this.reportActionOutcome(action, false, 'name missing');
        return;
      }
      this.workspacesService.create({ name, description: params.description }).subscribe({
        next: (ws) => {
          this.showToast(`KARMA created workspace "${ws.name}"`, 'check_circle');
          this.loadWorkspacesAndMissions();
          this.reportActionOutcome(action, true, `workspace "${ws.name}" created`);
        },
        error: (err) => {
          this.showToast('KARMA failed to create workspace: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'create failed');
        }
      });
      return;
    }

    if (action.type === 'create_project') {
      const workspaceId = String(params.workspaceId || '');
      const name = String(params.name || '').trim();
      if (!workspaceId || !name) {
        this.showToast('KARMA could not create project: workspace or name missing', 'error');
        this.reportActionOutcome(action, false, 'workspace/name missing');
        return;
      }
      this.projectsService.create(workspaceId, name).subscribe({
        next: (project) => {
          this.showToast(`KARMA created project "${project.name}"`, 'check_circle');
          this.loadWorkspacesAndMissions();
          this.reportActionOutcome(action, true, `project "${project.name}" created`);
        },
        error: (err) => {
          this.showToast('KARMA failed to create project: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'create failed');
        }
      });
      return;
    }

    if (action.type === 'create_mission') {
      const projectId = String(params.projectId || '');
      if (!projectId || !params.name) {
        this.showToast('KARMA could not create mission: project or name missing', 'error');
        this.reportActionOutcome(action, false, 'project/name missing');
        return;
      }
      const validFlows = this.flowsList.filter(f => f.enabled !== false).map(f => f.id);
      const selectedFlowIds = Array.isArray(params.selectedFlowIds)
        ? (params.selectedFlowIds as string[]).filter(id => validFlows.includes(id))
        : [];
      const targetDurationSeconds = params.targetDurationSeconds
        ? Math.max(30, Number(params.targetDurationSeconds))
        : undefined;
      this.missionsService.create({
        projectId,
        name: String(params.name),
        description: params.description,
        missionType: params.missionType,
        priority: params.priority,
        providerId: params.providerId,
        selectedFlowIds: selectedFlowIds.length > 0 ? selectedFlowIds : undefined,
        targetDurationSeconds,
        theme: params.theme
      }).subscribe({
        next: (mission) => {
          this.showToast(`KARMA created mission "${mission.name}"`, 'check_circle');
          this.loadDashboard();
          const mode = (params.runMode === 'AUTO' || params.runMode === 'REVIEW') ? params.runMode : undefined;
          if (mode) {
            this.executionsService.trigger(mission.id, mode).subscribe({
              next: () => this.showToast(`KARMA started mission execution (${mode})`, 'play_arrow'),
              error: () => this.showToast('KARMA created mission but failed to start execution', 'error')
            });
          }
          this.reportActionOutcome(action, true, `mission "${mission.name}" created${mode ? ` and running (${mode})` : ''}`);
        },
        error: (err) => {
          this.showToast('KARMA failed to create mission: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'create failed');
        }
      });
      return;
    }

    if (action.type === 'trigger_mission') {
      const missionId = String(params.missionId || '');
      if (!missionId) {
        this.showToast('KARMA could not trigger: mission id missing', 'error');
        this.reportActionOutcome(action, false, 'missionId missing');
        return;
      }
      const mode = (params.runMode === 'AUTO' || params.runMode === 'REVIEW') ? params.runMode : this.runMode;
      this.executionsService.trigger(missionId, mode).subscribe({
        next: () => {
          this.showToast(`KARMA started mission execution (${mode})`, 'play_arrow');
          this.loadDashboard();
          this.reportActionOutcome(action, true, `triggered mission ${missionId} (${mode})`);
        },
        error: (err) => {
          this.showToast('KARMA failed to trigger mission: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'trigger failed');
        }
      });
      return;
    }

    if (action.type === 'approve_artifact' || action.type === 'reject_artifact') {
      const id = String(params.id || '');
      if (!id) {
        this.showToast('KARMA could not review: artifact id missing', 'error');
        this.reportActionOutcome(action, false, 'artifact id missing');
        return;
      }
      const status = action.type === 'approve_artifact' ? 'APPROVED' : 'REJECTED';
      this.artifactsService.updateReviewStatus(id, status).subscribe({
        next: () => {
          this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== id);
          this.showToast(`KARMA ${action.type === 'approve_artifact' ? 'approved' : 'rejected'} the artifact`, action.type === 'approve_artifact' ? 'check_circle' : 'cancel');
          this.reportActionOutcome(action, true, `${action.type} artifact ${id}`);
        },
        error: (err) => {
          this.showToast('KARMA failed to review artifact: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'review failed');
        }
      });
      return;
    }

    if (action.type === 'create_agent') {
      const name = String(params.name || '').trim();
      if (!name) {
        this.showToast('KARMA could not create agent: name missing', 'error');
        this.reportActionOutcome(action, false, 'name missing');
        return;
      }
      this.agentsService.create({
        name,
        category: params.category,
        description: params.description
      } as any).subscribe({
        next: (agent) => {
          this.showToast(`KARMA created agent "${agent.name}"`, 'check_circle');
          this.loadDashboard();
          this.reportActionOutcome(action, true, `agent "${agent.name}" created`);
        },
        error: (err) => {
          this.showToast('KARMA failed to create agent: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'create failed');
        }
      });
      return;
    }

    if (action.type === 'remember_memory') {
      const key = String(params.key || '').trim();
      const value = String(params.value || '').trim();
      if (!key || !value) {
        this.showToast('KARMA could not remember: key or value missing', 'error');
        this.reportActionOutcome(action, false, 'key/value missing');
        return;
      }
      this.api.postData('/v1/memory/remember', { key, value }).subscribe({
        next: () => {
          this.showToast('KARMA will remember that', 'lightbulb');
          this.reportActionOutcome(action, true, `remembered ${key}`);
        },
        error: (err) => {
          this.showToast('KARMA could not save that memory: ' + (err?.error?.message || 'error'), 'error');
          this.reportActionOutcome(action, false, err?.error?.message || 'remember failed');
        }
      });
      return;
    }
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
    this.loadPendingReviews();

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
          if (this.missionSteps && this.missionSteps.length > 0) {
            this.applyFlowStatuses(this.missionSteps);
          }
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

  private loadProjects(workspaceId: string, preferredProjectId?: string): void {
    this.projectsService.getByWorkspace(workspaceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          if (projects.length === 0) return;
          this.newMission.projectId = (preferredProjectId && projects.some(p => p.id === preferredProjectId))
            ? preferredProjectId
            : projects[0].id;
          this.loadMissions(this.newMission.projectId);
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
          const running = missions.find((m: any) => m.status === 'RUNNING' || m.status === 'WAITING');
          this.activeMission = running || (missions.length > 0 ? missions[0] : null);
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
    // Reset state for new mission
    this.missionProgress = 0;
    this.queueSize = 0;
    this.cpuLoad = 0;
    this.gpuLoad = 0;
    this.hubStatus = {};
    this.workers = [];
    this.activeStepsByAgent.clear();
    
    this.executionsService.getAll(missionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (executions) => {
          if (executions.length === 0) return;
          const active = executions.find(e => e.status === 'RUNNING' || e.status === 'PENDING') || executions[0];
          this.activeMissionMode = (active.mode === 'AUTO' || active.mode === 'REVIEW') ? active.mode : null;
          this.executionsService.getSteps(active.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (steps) => {
                this.missionSteps = steps;
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
    this.activeStepsByAgent.clear();

    for (const step of steps) {
      const arr = byFlow.get(step.flowId) || [];
      arr.push(step);
      byFlow.set(step.flowId, arr);
      
      // Keep track of the most recent status for each agent in this active execution
      this.activeStepsByAgent.set(step.agentId, step.status);
    }
    
    this.flowStepMap.clear();
    byFlow.forEach((flowSteps, flowId) => {
      if (flowSteps.some(s => s.status === 'RUNNING')) this.flowStepMap.set(flowId, 'IN_PROGRESS');
      else if (flowSteps.some(s => s.status === 'FAILED')) this.flowStepMap.set(flowId, 'FAILED');
      else if (flowSteps.every(s => s.status === 'COMPLETED')) this.flowStepMap.set(flowId, 'COMPLETED');
      else this.flowStepMap.set(flowId, 'PENDING');
    });
    this.applyFlowStatusesToFlows();
    this.buildHubStatus(steps);
    // Removed cdr.detectChanges() to prevent aggressive flashing
  }

  private buildHubStatus(steps: ExecutionStepResponse[]): void {
    const counts = new Map<string, { total: number; completed: number; running: number; failed: number }>();
    for (const step of steps) {
      const key = this.hubKeyForStep(step);
      if (!key) continue;
      const c = counts.get(key) || { total: 0, completed: 0, running: 0, failed: 0 };
      c.total++;
      if (step.status === 'COMPLETED' || step.status === 'SKIPPED') c.completed++;
      else if (step.status === 'RUNNING') c.running++;
      else if (step.status === 'FAILED') c.failed++;
      counts.set(key, c);
    }
    const next: Record<string, { text: string; cls: string; border: string; pulse: boolean; pct: number }> = {};
    counts.forEach((c, key) => {
      // Give running steps a 50% completion weight for visual progress
      const simulatedCompleted = c.completed + (c.running * 0.5);
      const pct = c.total > 0 ? Math.min(100, Math.round((simulatedCompleted / c.total) * 100)) : 0;
      if (c.running > 0) {
        next[key] = { text: 'Running', cls: 'text-green-500', border: 'border-green-500', pulse: true, pct };
      } else if (c.failed > 0) {
        next[key] = { text: 'Failed', cls: 'text-red-400', border: 'border-red-400', pulse: false, pct };
      } else if (c.completed === c.total) {
        next[key] = { text: 'Completed', cls: 'text-green-400', border: 'border-green-400', pulse: false, pct };
      } else {
        next[key] = { text: 'Pending', cls: 'text-on-surface-variant', border: 'border-outline-variant/50', pulse: false, pct };
      }
    });
    this.hubStatus = next;
  }

  private hubKeyForStep(step: ExecutionStepResponse): string | null {
    const agent = this.agentStatusList.find(a => a.id === step.agentId);
    if (agent) {
      const name = (agent.name || '').toLowerCase();
      const category = (agent.category || '').toLowerCase();
      const desc = (agent.description || '').toLowerCase();
      
      const check = (str: string) => name.includes(str) || category.includes(str) || desc.includes(str);

      if (check('voice') || check('audio') || check('tts') || check('speak')) return 'voice';
      if (check('research') || check('search') || check('gather')) return 'research';
      if (check('script') || check('write') || check('author') || check('plan')) return 'script';
      if (check('blog') || check('article') || check('post')) return 'blog';
      if (check('seo') || check('optimiz') || check('keyword')) return 'seo';
      if (check('thumbnail') || check('thumb')) return 'thumbnail';
      if (check('image') || check('picture') || check('visual')) return 'image';
      if (check('video') || check('edit') || check('render')) return 'video';
    }
    
    const type = (step.stepType || '').toUpperCase();
    if (type.includes('TTS') || type.includes('VOICE') || type.includes('AUDIO')) return 'voice';
    if (type.includes('VIDEO') || type.includes('ANIMATION')) return 'video';
    if (type.includes('IMAGE') || type.includes('PICTURE')) return 'image';
    if (type.includes('RESEARCH') || type.includes('SEARCH')) return 'research';
    if (type.includes('SCRIPT') || type.includes('WRITE') || type.includes('TEXT')) return 'script';
    if (type.includes('SEO')) return 'seo';
    if (type.includes('BLOG')) return 'blog';
    if (type.includes('THUMBNAIL')) return 'thumbnail';
    
    // If it's a generic LLM call and it hasn't matched anything, we could map it to script as a fallback,
    // but returning null means it won't light up any specific node (which might be technically correct for a generic node).
    // Let's map generic LLM tasks to 'script' if it's completely unmatched, just so it shows up in the Core.
    if (type === 'LLM_CALL' || type === 'GENERIC') return 'script';

    return null;
  }

  private updateOperationalMetrics(steps: ExecutionStepResponse[], executions: ExecutionResponse[], executionId: string): void {
    const total = steps.length;
    const completed = steps.filter(s => s.status === 'COMPLETED' || s.status === 'SKIPPED').length;
    const running = steps.filter(s => s.status === 'RUNNING').length;
    const pending = steps.filter(s => s.status === 'PENDING').length;

    // Give running steps a 50% completion weight for overall mission progress
    const simulatedCompleted = completed + (running * 0.5);
    this.missionProgress = total > 0 ? Math.min(100, Math.round((simulatedCompleted / total) * 100)) : 0;
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

  onNodeClick(key: string): void {
    if (!this.activeMission) return;
    
    // Find all steps for this node
    const steps = this.missionSteps.filter(s => this.hubKeyForStep(s) === key);
    
    if (steps.length > 0) {
      // Prefer the step that is PENDING_REVIEW, otherwise take the last one
      const pendingStep = steps.find(s => s.reviewStatus === 'PENDING_REVIEW' || s.reviewStatus === 'PENDING' || s.status === 'PENDING_APPROVAL');
      this.directReviewStep = pendingStep || steps[steps.length - 1];
      this.openModal('direct-review');
    } else {
      this.showToast(`No execution data available for ${key.toUpperCase()} yet`, 'info');
    }
  }

  approveDirectReview(): void {
    if (!this.directReviewStep || this.reviewSubmitting) return;
    this.reviewSubmitting = true;
    this.reviewsService.submit({ stepId: this.directReviewStep.id, decision: 'APPROVED' }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.closeModal();
        if (this.activeMission?.id) this.loadFlowStatuses(this.activeMission.id);
      },
      error: () => {
        this.reviewSubmitting = false;
        this.showToast('Failed to approve step', 'error');
      }
    });
  }

  rejectDirectReview(): void {
    if (!this.directReviewStep || this.reviewSubmitting) return;
    this.reviewSubmitting = true;
    this.reviewsService.submit({
      stepId: this.directReviewStep.id,
      decision: 'REJECTED',
      comments: this.reviewFeedback
    }).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.closeModal();
        if (this.activeMission?.id) this.loadFlowStatuses(this.activeMission.id);
      },
      error: () => {
        this.reviewSubmitting = false;
        this.showToast('Failed to reject step', 'error');
      }
    });
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

  get canDeleteFlows(): boolean {
    return (this.auth.user()?.role || 'OPERATOR').toUpperCase() === 'ADMIN';
  }

  deleteFlow(flow: any): void {
    if (flow?.isSystem) {
      this.showToast('System flow cannot be deleted', 'lock');
      return;
    }
    if (!this.canDeleteFlows) {
      this.showToast('Your role does not allow deleting flows', 'lock');
      return;
    }
    if (!window.confirm(`Delete flow "${flow?.name}"?`)) return;
    this.dashboardService.deleteFlow(flow.id).subscribe({
      next: () => {
        this.flowsList = this.flowsList.filter(f => f.id !== flow.id);
        this.showToast('Flow deleted', 'check_circle');
      },
      error: (err) => {
        const msg = err?.error?.detail || err?.message || 'Failed to delete flow';
        this.showToast(String(msg), 'error');
        this.loadFlows();
      }
    });
  }

  private loadFlows(): void {
    this.dashboardService.getFlows().pipe(takeUntil(this.destroy$)).subscribe({
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
      error: () => {}
    });
  }
}
