import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { McpService, McpServer, McpServerRequest } from '../../shared/services/mcp.service';

@Component({
  selector: 'app-mcp-servers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mcp-servers.component.html'
})
export class McpServersComponent implements OnInit {
  private mcpService = inject(McpService);
  
  servers: McpServer[] = [];
  loading = false;
  toolsMap: Record<string, unknown> = {};
  statusMap: Record<string, { running: boolean; status: string }> = {};
  toolsLoading: Record<string, boolean> = {};
  expandedServer: string | null = null;
  
  showModal = false;
  editingServer: McpServer | null = null;
  
  formData: McpServerRequest = {
    name: '',
    transportType: 'stdio',
    commandOrUrl: '',
    args: [],
    envVars: {}
  };
  
  argsString = '';
  envVarsList: { key: string, value: string }[] = [];

  ngOnInit() {
    this.loadServers();
  }

  loadServers() {
    this.loading = true;
    this.mcpService.getAll().subscribe({
      next: (data) => {
        this.servers = data;
        this.loading = false;
        data.forEach(s => this.loadStatus(s.id));
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadStatus(id: string) {
    this.mcpService.getStatus(id).subscribe({
      next: (st) => this.statusMap[id] = st,
      error: () => {}
    });
  }

  toggleTools(server: McpServer) {
    if (this.expandedServer === server.id) {
      this.expandedServer = null;
      return;
    }
    this.expandedServer = server.id;
    if (this.toolsMap[server.id]) return;
    this.toolsLoading[server.id] = true;
    this.mcpService.listTools(server.id).subscribe({
      next: (tools) => {
        this.toolsMap[server.id] = tools;
        this.toolsLoading[server.id] = false;
      },
      error: (e) => {
        this.toolsMap[server.id] = { error: e?.error?.message || 'Failed to fetch tools — is server running?' };
        this.toolsLoading[server.id] = false;
      }
    });
  }

  startServer(id: string) {
    this.mcpService.start(id).subscribe(() => {
      setTimeout(() => this.loadStatus(id), 800);
    });
  }

  stopServer(id: string) {
    this.mcpService.stop(id).subscribe(() => this.loadStatus(id));
  }

  openModal(server?: McpServer) {
    if (server) {
      this.editingServer = server;
      this.formData = {
        name: server.name,
        transportType: server.transportType,
        commandOrUrl: server.commandOrUrl,
        args: server.args || [],
        envVars: server.envVars || {}
      };
      this.argsString = (server.args || []).join(' ');
      this.envVarsList = Object.entries(server.envVars || {}).map(([key, value]) => ({ key, value }));
    } else {
      this.editingServer = null;
      this.formData = {
        name: '',
        transportType: 'stdio',
        commandOrUrl: '',
        args: [],
        envVars: {}
      };
      this.argsString = '';
      this.envVarsList = [];
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingServer = null;
  }

  addEnvVar() {
    this.envVarsList.push({ key: '', value: '' });
  }

  removeEnvVar(index: number) {
    this.envVarsList.splice(index, 1);
  }

  save() {
    this.formData.args = this.argsString.trim() ? this.argsString.split(' ') : [];
    const envObj: Record<string, string> = {};
    for (const ev of this.envVarsList) {
      if (ev.key.trim()) {
        envObj[ev.key.trim()] = ev.value.trim();
      }
    }
    this.formData.envVars = envObj;
    
    if (this.editingServer) {
      this.mcpService.update(this.editingServer.id, this.formData).subscribe(() => {
        this.loadServers();
        this.closeModal();
      });
    } else {
      this.mcpService.create(this.formData).subscribe(() => {
        this.loadServers();
        this.closeModal();
      });
    }
  }

  delete(id: string) {
    if (confirm('Are you sure you want to delete this MCP Server?')) {
      this.mcpService.delete(id).subscribe(() => {
        this.loadServers();
      });
    }
  }
}
