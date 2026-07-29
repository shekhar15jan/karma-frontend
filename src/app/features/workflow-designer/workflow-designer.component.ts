import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AgentsService } from '../../shared/services/agents.service';
import { WorkflowsService } from '../../shared/services/workflows.service';
import { AgentResponse } from '../../shared/models/agent.model';

export interface WorkflowNode {
  id: string;
  label: string;
  agentId: string;
  agentName: string;
  status: 'pending' | 'configured' | 'ready';
  config: Record<string, string>;
  model?: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
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
  loading = true;
  error: string | null = null;
  saving = false;
  running = false;

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
  ) {}

  ngOnInit(): void {
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
  }

  addNode(agent: AgentResponse): void {
    const id = `node-${this.nodes.length + 1}-${Date.now()}`;
    const node: WorkflowNode = {
      id,
      label: agent.name,
      agentId: agent.id,
      agentName: agent.name,
      status: 'pending',
      config: {
        tempLimit: '75',
        concurrency: '3'
      },
      model: 'gpt-4o',
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
    const payload = {
      name: this.workflowName,
      nodes: this.nodes,
      edges: this.edges,
    };
    this.workflowsService.saveWorkflow(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
        },
        error: () => {
          this.error = 'Failed to save workflow.';
          this.saving = false;
        }
      });
  }

  runWorkflow(): void {
    this.running = true;
    this.error = null;
    const payload = {
      name: this.workflowName,
      nodes: this.nodes,
      edges: this.edges,
    };
    this.workflowsService.runWorkflow(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.running = false;
        },
        error: () => {
          this.error = 'Failed to run workflow.';
          this.running = false;
        }
      });
  }

  getAgentIcon(agentId: string): string {
    const agent = this.agents.find(a => a.id === agentId);
    return agent?.icon || 'smart_toy';
  }

  getNodeX(nodeId: string): number {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.x + 72 : 0; // centered horizontally (width is 144px, half is 72px)
  }

  getNodeY(nodeId: string): number {
    const node = this.nodes.find(n => n.id === nodeId);
    return node ? node.y + 40 : 0; // centered vertically (height is ~80px, half is 40px)
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
        const exists = this.edges.some(e => e.source === this.sourceNodeId && e.target === node.id);
        if (!exists) {
          const edgeId = `edge-${Date.now()}`;
          this.edges = [...this.edges, { id: edgeId, source: this.sourceNodeId, target: node.id }];
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
