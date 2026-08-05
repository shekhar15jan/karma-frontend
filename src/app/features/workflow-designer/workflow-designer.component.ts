import { Component, OnInit, HostListener } from '@angular/core';
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
  inputs?: string[];
  outputs?: string[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
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
  sourcePort: string | null = null;
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
      sourcePort: e.sourcePort || 'right',
      targetPort: e.targetPort || 'left',
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
    const isVideo = agent.name.toLowerCase().includes('video');
    const stepKind = isVideo ? 'VIDEO' : 'AGENT';
    
    const node: WorkflowNode = {
      id,
      label: agent.name,
      agentId: agent.id,
      agentName: agent.name,
      status: 'pending',
      stepKind,
      inputs: isVideo ? ['audio', 'image', 'script'] : ['in'],
      outputs: ['out'],
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

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      
      if (!isInput && this.selectedNode) {
        this.removeNode(this.selectedNode);
      }
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
    this.updateSelectedNode();
  }

  addNodeConfig(): void {
    if (!this.selectedNode) return;
    const newKey = window.prompt('Enter new configuration key (e.g., condition):');
    if (newKey && newKey.trim() && !this.selectedNode.config[newKey.trim()]) {
      this.selectedNode = {
        ...this.selectedNode,
        config: { ...this.selectedNode.config, [newKey.trim()]: '' },
        status: 'configured',
      };
      this.updateSelectedNode();
    }
  }

  removeNodeConfig(key: string): void {
    if (!this.selectedNode) return;
    const newConfig = { ...this.selectedNode.config };
    delete newConfig[key];
    this.selectedNode = {
      ...this.selectedNode,
      config: newConfig,
      status: 'configured',
    };
    this.updateSelectedNode();
  }



  private updateSelectedNode(): void {
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

  getOutputX(nodeId: string, port?: string): number {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'bottom') return node.x + 88;
    return node.x + 176;
  }

  getOutputY(nodeId: string, port?: string): number {
    const node = this.nodes.find(x => x.id === nodeId);
    if (!node) return 0;
    if (port === 'bottom') return node.y + 84;
    return node.y + 42;
  }

  getInputX(nodeId: string, port?: string): number {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    if (port === 'top') return node.x + 88;
    return node.x;
  }

  getInputY(nodeId: string, port?: string): number {
    const node = this.nodes.find(x => x.id === nodeId);
    if (!node) return 0;
    if (port === 'top') return node.y;
    return node.y + 42;
  }

  getEdgeMidX(edge: WorkflowEdge): number {
    const x1 = this.getOutputX(edge.source, edge.sourcePort);
    const x2 = this.getInputX(edge.target, edge.targetPort);
    return (x1 + x2) / 2;
  }

  getEdgeMidY(edge: WorkflowEdge): number {
    const y1 = this.getOutputY(edge.source, edge.sourcePort);
    const y2 = this.getInputY(edge.target, edge.targetPort);
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
      newX = Math.max(10, Math.min(rect.width - 180, newX));
      newY = Math.max(10, Math.min(rect.height - 90, newY));

      this.activeDraggingNode.x = newX;
      this.activeDraggingNode.y = newY;
      this.nodes = this.nodes.map(n => n.id === this.activeDraggingNode!.id ? this.activeDraggingNode! : n);
    }
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.activeDraggingNode = null;
    if (this.isConnecting) {
      this.cancelConnection();
    }
  }

  // Node Connect Handlers
  startConnection(node: WorkflowNode, port: string, event: MouseEvent): void {
    event.stopPropagation();
    this.isConnecting = true;
    this.sourceNodeId = node.id;
    this.sourcePort = port;
    this.mouseX = this.getOutputX(node.id, port);
    this.mouseY = this.getOutputY(node.id, port);
  }

  finishConnection(node: WorkflowNode, port: string, event: MouseEvent): void {
    if (this.isConnecting && this.sourceNodeId && this.sourcePort) {
      event.stopPropagation();
      if (this.sourceNodeId !== node.id) {
        if (this.wouldCreateCycle(this.sourceNodeId, node.id)) {
          this.error = 'Cannot connect: this would create a circular flow.';
        } else {
          this.error = null;
          const exists = this.edges.some(e => e.source === this.sourceNodeId && e.target === node.id && e.sourcePort === this.sourcePort && e.targetPort === port);
          if (!exists) {
            const edgeId = `edge-${Date.now()}`;
            this.edges = [...this.edges, { id: edgeId, source: this.sourceNodeId, target: node.id, sourcePort: this.sourcePort, targetPort: port, handoff: true }];
          }
        }
      }
      this.isConnecting = false;
      this.sourceNodeId = null;
      this.sourcePort = null;
    }
  }

  onNodeClick(node: WorkflowNode, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.isConnecting) {
      this.selectNode(node);
    }
  }

  cancelConnection(): void {
    this.isConnecting = false;
    this.sourceNodeId = null;
    this.sourcePort = null;
  }

  getNodeLabel(nodeId: string): string {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.label : 'Unknown';
  }

  removeEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
  }

  // Generate smooth bezier curve between nodes
  getNodePath(edge: WorkflowEdge): string {
    const x1 = this.getOutputX(edge.source, edge.sourcePort);
    const y1 = this.getOutputY(edge.source, edge.sourcePort);
    const x2 = this.getInputX(edge.target, edge.targetPort);
    const y2 = this.getInputY(edge.target, edge.targetPort);

    let cp1x = x1 + Math.max(Math.abs(x2 - x1) * 0.5, 40);
    let cp1y = y1;
    let cp2x = x2 - Math.max(Math.abs(x2 - x1) * 0.5, 40);
    let cp2y = y2;
    let endX = x2;
    let endY = y2;

    if (edge.sourcePort === 'bottom') {
      cp1x = x1;
      cp1y = y1 + Math.max(Math.abs(y2 - y1) * 0.5, 40);
    }
    
    if (edge.targetPort === 'top') {
      cp2x = x2;
      cp2y = y2 - Math.max(Math.abs(y2 - y1) * 0.5, 40);
      endY = y2 - 4; // slight offset for the arrowhead
    } else {
      endX = x2 - 4;
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  }

  getTempPath(): string {
    if (!this.sourceNodeId || !this.sourcePort) return '';
    const x1 = this.getOutputX(this.sourceNodeId, this.sourcePort);
    const y1 = this.getOutputY(this.sourceNodeId, this.sourcePort);
    const x2 = this.mouseX;
    const y2 = this.mouseY;

    let cp1x = x1 + Math.max(Math.abs(x2 - x1) * 0.5, 40);
    let cp1y = y1;
    let cp2x = x2 - Math.max(Math.abs(x2 - x1) * 0.5, 40);
    let cp2y = y2;

    if (this.sourcePort === 'bottom') {
      cp1x = x1;
      cp1y = y1 + Math.max(Math.abs(y2 - y1) * 0.5, 40);
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }
}
