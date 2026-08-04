import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AgentsService } from '../../shared/services/agents.service';
import { WorkflowsService } from '../../shared/services/workflows.service';
import { AgentResponse } from '../../shared/models/agent.model';
import { FlowResponse } from '../../shared/models/flow.model';

export interface WorkflowNode {
  id: string;
  label: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'configured' | 'ready';
  stepKind: 'AGENT' | 'VIDEO' | 'PUBLISH';
  config: Record<string, string>;
  model?: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  handoff?: boolean;
}

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.scss',
})
export class WorkflowDesignerComponent implements OnInit {
  agents: AgentResponse[] = [];
  nodes: WorkflowNode[] = [];
  edges: WorkflowEdge[] = [];
  selectedNode: WorkflowNode | null = null;
  workflowName = 'Untitled Workflow';
  workflowDescription = '';
  loading = true;
  error: string | null = null;
  saving = false;
  running = false;
  runResult: { executionId: string, missionId: string } | null = null;
  saveResult: { flowId: string } | null = null;
  savedFlows: any[] = [];
  selectedFlowId = '';
  selectedFlowDeleteId = '';

  // Drag and Connect State
  isConnecting = false;
  sourceNodeId: string | null = null;
  mouseX = 0;
  mouseY = 0;
  activeDraggingNode: WorkflowNode | null = null;
  private dragStartX = 0;
  private dragStartY = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly agentsService: AgentsService,
    private readonly workflowsService: WorkflowsService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const flowParam = this.route.snapshot.queryParamMap.get('flow');
    this.agentsService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agents) => {
          this.agents = agents;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = 'Failed to load agents.';
        }
      });
    this.loadFlows(flowParam);
  }

  loadFlows(openId?: string | null): void {
    this.workflowsService.getFlows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flows) => {
          this.savedFlows = flows;
          if (openId) {
            this.onSelectFlow(openId);
          }
        },
        error: () => {
          this.error = 'Failed to load saved workflows.';
        }
      });
  }

  onSelectFlow(id: string): void {
    const flow = this.savedFlows.find(f => f.id === id);
    if (!flow) return;
    this.workflowName = flow.name || 'Untitled Workflow';
    this.workflowDescription = flow.description || '';
    this.applyDesign(flow.design);
    this.selectedFlowId = id;
    this.selectedFlowDeleteId = id;
  }

  clearSelection(): void {
    this.selectedFlowId = '';
    this.selectedFlowDeleteId = '';
  }

  private applyDesign(design: any): void {
    if (!design) return;
    const rawNodes = Array.isArray(design.nodes) ? design.nodes : [];
    const rawEdges = Array.isArray(design.edges) ? design.edges : [];
    this.nodes = rawNodes.map(this.normalizeNode);
    this.edges = rawEdges.map(this.normalizeEdge);
    this.selectedNode = null;
  }

  private normalizeNode(n: any): WorkflowNode {
    return {
      id: n.id,
      label: n.label || '',
      agentId: n.agentId || '',
      agentName: n.agentName || '',
      status: (n.status === 'ready' || n.status === 'configured' || n.status === 'pending') ? n.status : 'pending',
      stepKind: n.stepKind === 'VIDEO' || n.stepKind === 'PUBLISH' ? n.stepKind : 'AGENT',
      config: n.config || {},
      model: n.model,
      x: Number(n.x) || 80,
      y: Number(n.y) || 80,
    };
  }

  private normalizeEdge(e: any): WorkflowEdge {
    return {
      id: e.id,
      source: e.source ?? e.from,
      target: e.target ?? e.to,
      handoff: e.handoff === undefined ? true : !!e.handoff,
    };
  }

  deleteSelectedFlow(): void {
    if (!this.selectedFlowDeleteId) return;
    if (!window.confirm('Delete this flow? This cannot be undone.')) return;
    this.workflowsService.deleteFlow(this.selectedFlowDeleteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedFlowDeleteId = '';
          this.selectedFlowId = '';
          this.loadFlows();
        },
        error: () => {
          this.error = 'Failed to delete flow.';
        }
      });
  }

  addNode(agent: AgentResponse): void {
    const id = `node-${this.nodes.length + 1}-${Date.now()}`;
    const node: WorkflowNode = {
      id,
      label: agent.name,
      agentId: agent.id,
      agentName: agent.name,
      status: 'pending',
      stepKind: 'AGENT',
      config: {
        tempLimit: '75',
        concurrency: '3'
      },
      model: 'gemini-3.5-flash',
      x: 80 + this.nodes.length * 40,
      y: 80 + this.nodes.length * 30,
    };
    this.nodes = [...this.nodes, node];
    this.selectedNode = node;
  }

  selectNode(node: WorkflowNode): void {
    this.selectedNode = node;
  }

  deselectNode(): void {
    if (this.isConnecting) {
      this.cancelConnection();
    } else {
      this.selectedNode = null;
    }
  }

  removeNode(node: WorkflowNode): void {
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.edges = this.edges.filter(e => e.source !== node.id && e.target !== node.id);
    if (this.selectedNode?.id === node.id) {
      this.selectedNode = null;
    }
  }

  updateNodeModel(model: string): void {
    if (!this.selectedNode) return;
    this.selectedNode = {
      ...this.selectedNode,
      model,
      status: 'configured',
    };
    this.nodes = this.nodes.map(n =>
      n.id === this.selectedNode!.id ? this.selectedNode! : n
    );
  }

  updateNodeConfig(key: string, value: string): void {
    if (!this.selectedNode) return;
    this.selectedNode = {
      ...this.selectedNode,
      config: { ...this.selectedNode.config, [key]: value },
      status: 'configured',
    };
    this.nodes = this.nodes.map(n =>
      n.id === this.selectedNode!.id ? this.selectedNode! : n
    );
  }

  saveWorkflow(): void {
    this.saving = true;
    this.error = null;
    this.saveResult = null;
    const payload = {
      name: this.workflowName,
      description: this.workflowDescription,
      nodes: this.nodes,
      edges: this.edges,
    };
    this.workflowsService.saveWorkflow(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flow) => {
          this.saving = false;
          this.saveResult = { flowId: flow?.id };
          this.loadFlows(flow?.id);
        },
        error: (err: any) => {
          this.error = this.extractError(err) || 'Failed to save workflow.';
          this.saving = false;
        }
      });
  }

  runWorkflow(): void {
    this.running = true;
    this.error = null;
    this.runResult = null;
    this.saveResult = null;
    const payload = {
      name: this.workflowName,
      description: this.workflowDescription,
      nodes: this.nodes,
      edges: this.edges,
    };
    this.workflowsService.runWorkflow(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.running = false;
          this.runResult = { executionId: result.executionId, missionId: result.missionId };
          this.error = null;
        },
        error: (err: any) => {
          this.error = this.extractError(err) || 'Failed to run workflow.';
          this.running = false;
        }
      });
  }

  private extractError(err: any): string | null {
    const msg = err?.error?.message || err?.message;
    return typeof msg === 'string' && msg.trim() ? msg : null;
  }

  updateNodeStepKind(kind: 'AGENT' | 'VIDEO' | 'PUBLISH'): void {
    if (!this.selectedNode) return;
    this.selectedNode = {
      ...this.selectedNode,
      stepKind: kind,
      status: 'configured',
    };
    this.nodes = this.nodes.map(n =>
      n.id === this.selectedNode!.id ? this.selectedNode! : n
    );
  }

  toggleEdgeHandoff(edge: WorkflowEdge): void {
    const updated = { ...edge, handoff: edge.handoff === false };
    this.edges = this.edges.map(e => e.id === edge.id ? updated : e);
  }

  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    const adjacency = new Map<string, string[]>();
    for (const edge of this.edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }
    const stack = [targetId];
    const visited = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (current === sourceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adjacency.get(current) || []) stack.push(next);
    }
    return false;
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

  getAgentIcon(agentId: string): string {
    const agent = this.agents.find(a => a.id === agentId);
    return this.getMappedIcon(agent?.icon || '');
  }

  get activeAgents(): AgentResponse[] {
    return this.agents.filter(a => a.status === 'ACTIVE');
  }

  getNodeX(nodeId: string): number {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.x + 72 : 0; // centered horizontally (width is 144px, half is 72px)
  }

  getNodeY(nodeId: string): number {
    const n = this.nodes.find(x => x.id === nodeId);
    // Return center Y of the node (approx 40px down)
    return n ? n.y + 40 : 0;
  }

  getEdgeMidX(sourceId: string, targetId: string): number {
    const x1 = this.getNodeX(sourceId);
    const x2 = this.getNodeX(targetId);
    return (x1 + x2) / 2;
  }

  getEdgeMidY(sourceId: string, targetId: string): number {
    const y1 = this.getNodeY(sourceId);
    const y2 = this.getNodeY(targetId);
    return (y1 + y2) / 2;
  }

  deleteEdge(edgeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.edges = this.edges.filter(e => e.id !== edgeId);
  }

  // Node Drag Handlers
  onNodeMouseDown(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isConnecting) return;
    this.activeDraggingNode = node;
    this.dragStartX = event.clientX - node.x;
    this.dragStartY = event.clientY - node.y;
  }

  onCanvasMouseMove(event: MouseEvent): void {
    const canvas = event.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();

    if (this.isConnecting && this.sourceNodeId) {
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    } else if (this.activeDraggingNode) {
      let newX = event.clientX - this.dragStartX;
      let newY = event.clientY - this.dragStartY;

      // Bound constraints
      newX = Math.max(10, Math.min(rect.width - 150, newX));
      newY = Math.max(10, Math.min(rect.height - 110, newY));

      this.activeDraggingNode.x = newX;
      this.activeDraggingNode.y = newY;
      this.nodes = this.nodes.map(n => n.id === this.activeDraggingNode!.id ? this.activeDraggingNode! : n);
    }
  }

  onCanvasMouseUp(): void {
    this.activeDraggingNode = null;
  }

  // Node Connect Handlers
  startConnection(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    this.isConnecting = true;
    this.sourceNodeId = node.id;
    this.mouseX = node.x + 72;
    this.mouseY = node.y + 40;
  }

  onNodeClick(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isConnecting && this.sourceNodeId) {
      if (this.sourceNodeId !== node.id) {
        if (this.wouldCreateCycle(this.sourceNodeId, node.id)) {
          this.error = 'Cannot connect: this would create a circular flow.';
        } else {
          this.error = null;
          const exists = this.edges.some(e => e.source === this.sourceNodeId && e.target === node.id);
          if (!exists) {
            const edgeId = `edge-${Date.now()}`;
            this.edges = [...this.edges, { id: edgeId, source: this.sourceNodeId, target: node.id, handoff: true }];
          }
        }
      }
      this.isConnecting = false;
      this.sourceNodeId = null;
    } else {
      this.selectNode(node);
    }
  }

  cancelConnection(): void {
    this.isConnecting = false;
    this.sourceNodeId = null;
  }

  getNodeLabel(nodeId: string): string {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.label : 'Unknown';
  }

  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
  }

  // Generate strict L-shaped stepped paths between nodes (orthogonal routing)
  getNodePath(sourceId: string, targetId: string): string {
    const x1 = this.getNodeX(sourceId);
    const y1 = this.getNodeY(sourceId);
    const x2 = this.getNodeX(targetId);
    const y2 = this.getNodeY(targetId);

    const x_mid = (x1 + x2) / 2;
    
    // Offset final X coordinate so arrowhead stops exactly at the target card edge (72px half-width)
    const directionOffset = x2 > x1 ? -74 : 74;
    const finalX = x2 + directionOffset;

    return `M ${x1} ${y1} H ${x_mid} V ${y2} H ${finalX}`;
  }

  getTempPath(): string {
    if (!this.sourceNodeId) return '';
    const x1 = this.getNodeX(this.sourceNodeId);
    const y1 = this.getNodeY(this.sourceNodeId);
    const x2 = this.mouseX;
    const y2 = this.mouseY;

    const x_mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${x_mid} V ${y2} H ${x2}`;
  }
}
