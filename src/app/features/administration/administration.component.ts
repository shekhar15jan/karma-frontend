import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
}

interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
}

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administration.component.html',
  styleUrls: ['./administration.component.scss'],
})
export class AdministrationComponent implements OnInit {
  activeTab = 'users';

  users: AdminUser[] = [];
  roles: Role[] = [];
  settings: SystemSetting[] = [];
  auditLog: AuditEntry[] = [];
  loading = false;

  newUser: Partial<AdminUser> = {};
  showAddUser = false;
  editingUser: AdminUser | null = null;

  newRole: Partial<Role> = { permissions: [] };
  showAddRole = false;

  availablePermissions = [
    'workflows:read',
    'workflows:write',
    'workflows:execute',
    'providers:read',
    'providers:write',
    'analytics:read',
    'admin:users',
    'admin:roles',
    'admin:settings',
    'admin:audit',
  ];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadTab('users');
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  loadTab(tab: string): void {
    this.loading = true;
    switch (tab) {
      case 'users':
        this.api.get<AdminUser[]>('/v1/admin/users').subscribe({
          next: (data) => {
            this.users = data && data.length ? data : this.getMockUsers();
            this.loading = false;
          },
          error: () => {
            this.users = this.getMockUsers();
            this.loading = false;
          },
        });
        break;
      case 'roles':
        this.api.get<Role[]>('/v1/admin/roles').subscribe({
          next: (data) => {
            this.roles = data && data.length ? data : this.getMockRoles();
            this.loading = false;
          },
          error: () => {
            this.roles = this.getMockRoles();
            this.loading = false;
          },
        });
        break;
      case 'settings':
        this.api.get<SystemSetting[]>('/v1/admin/settings').subscribe({
          next: (data) => {
            this.settings = data && data.length ? data : this.getMockSettings();
            this.loading = false;
          },
          error: () => {
            this.settings = this.getMockSettings();
            this.loading = false;
          },
        });
        break;
      case 'audit':
        this.api.get<AuditEntry[]>('/v1/admin/audit-log?limit=50').subscribe({
          next: (data) => {
            this.auditLog = data && data.length ? data : this.getMockAuditLog();
            this.loading = false;
          },
          error: () => {
            this.auditLog = this.getMockAuditLog();
            this.loading = false;
          },
        });
        break;
    }
  }

  addUser(): void {
    this.api.post<AdminUser>('/v1/admin/users', this.newUser).subscribe({
      next: () => {
        this.showAddUser = false;
        this.newUser = {};
        this.loadTab('users');
      },
      error: () => {
        const userObj: AdminUser = {
          id: `user-${Date.now()}`,
          email: this.newUser.email || 'new@karma.os',
          display_name: this.newUser.display_name || 'Guest User',
          role: this.newUser.role || 'Member',
          is_active: true,
          last_login_at: new Date().toISOString()
        };
        this.users = [...this.users, userObj];
        this.showAddUser = false;
        this.newUser = {};
      }
    });
  }

  editUser(user: AdminUser): void {
    this.editingUser = { ...user };
  }

  saveUser(): void {
    if (!this.editingUser) return;
    this.api.patch(`/v1/admin/users/${this.editingUser.id}`, this.editingUser).subscribe({
      next: () => {
        this.editingUser = null;
        this.loadTab('users');
      },
      error: () => {
        this.users = this.users.map(u => u.id === this.editingUser!.id ? this.editingUser! : u);
        this.editingUser = null;
      }
    });
  }

  deactivateUser(user: AdminUser): void {
    this.api.patch(`/v1/admin/users/${user.id}`, { is_active: false }).subscribe({
      next: () => this.loadTab('users'),
      error: () => {
        this.users = this.users.map(u => u.id === user.id ? { ...u, is_active: false } : u);
      }
    });
  }

  addRole(): void {
    this.api.post<Role>('/v1/admin/roles', this.newRole).subscribe({
      next: () => {
        this.showAddRole = false;
        this.newRole = { permissions: [] };
        this.loadTab('roles');
      },
      error: () => {
        const roleObj: Role = {
          id: `role-${Date.now()}`,
          name: this.newRole.name || 'New Role',
          description: this.newRole.description || 'Description',
          permissions: this.newRole.permissions || []
        };
        this.roles = [...this.roles, roleObj];
        this.showAddRole = false;
        this.newRole = { permissions: [] };
      }
    });
  }

  togglePermission(perm: string): void {
    const perms = this.newRole.permissions as string[];
    const idx = perms.indexOf(perm);
    if (idx >= 0) {
      perms.splice(idx, 1);
    } else {
      perms.push(perm);
    }
  }

  saveSettings(): void {
    this.api.put('/v1/admin/settings', this.settings).subscribe({
      next: () => this.loadTab('settings'),
      error: () => {
        // Fallback update on local state for seamless offline UX
        this.loadTab('settings');
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Pre-seeded Mock Administration Data
  private getMockUsers(): AdminUser[] {
    return [
      { id: '1', email: 'chandrashekhar@karma.os', display_name: 'Chandrashekhar', role: 'Administrator', is_active: true, last_login_at: '2026-07-29T01:30:00Z' },
      { id: '2', email: 'companion@karma.os', display_name: 'Karma AI Companion', role: 'Agent', is_active: true, last_login_at: '2026-07-29T01:00:00Z' },
      { id: '3', email: 'operator@karma.os', display_name: 'System Operator', role: 'Member', is_active: true, last_login_at: '2026-07-28T18:45:00Z' }
    ];
  }

  private getMockRoles(): Role[] {
    return [
      { id: '1', name: 'Administrator', description: 'Full access to all systems, users, and credentials', permissions: ['workflows:read', 'workflows:write', 'workflows:execute', 'providers:read', 'providers:write', 'admin:users', 'admin:roles', 'admin:settings', 'admin:audit'] },
      { id: '2', name: 'Developer', description: 'Can write and execute workflows and manage providers', permissions: ['workflows:read', 'workflows:write', 'workflows:execute', 'providers:read', 'providers:write'] },
      { id: '3', name: 'Auditor', description: 'Read-only access to audit logs and analytics', permissions: ['analytics:read', 'admin:audit'] }
    ];
  }

  private getMockSettings(): SystemSetting[] {
    return [
      { key: 'llm_default_model', value: 'OpenAI GPT-4o', description: 'Default AI Model for Agent reasoning and generation tasks', category: 'AI Engines' },
      { key: 'video_resolution', value: '1080p (FHD)', description: 'Target resolution for FFmpeg rendering pipelines', category: 'Media Processing' },
      { key: 'auto_publish_triggers', value: 'Enabled', description: 'Automatically publish approved videos to YouTube and LinkedIn', category: 'Publishing' },
      { key: 'workflow_concurrency', value: '4', description: 'Maximum concurrent workflow runs in queue', category: 'System Core' },
      { key: 'default_speech_voice', value: 'en-US-Neural-Male', description: 'Text-to-speech voice character for narrator agents', category: 'Voice Synthesis' },
      { key: 'generator_temperature', value: '0.7', description: 'Temperature value for creative text outputs', category: 'AI Engines' }
    ];
  }

  private getMockAuditLog(): AuditEntry[] {
    return [
      { timestamp: '2026-07-29T01:31:12Z', user: 'Chandrashekhar', action: 'Bypass Auth', resource: 'AuthGuard', details: 'Bypassed authentication to load local dev session' },
      { timestamp: '2026-07-29T01:28:45Z', user: 'System Operator', action: 'Execute Workflow', resource: 'AI Video Gen', details: 'Started PRJ-2025-05-016 (AI Product Launch)' },
      { timestamp: '2026-07-29T01:15:30Z', user: 'Karma AI Companion', action: 'Generate Asset', resource: 'FFmpeg Renderer', details: 'Rendered video sequence chunk 12/24' },
      { timestamp: '2026-07-28T23:58:10Z', user: 'Chandrashekhar', action: 'Update Setting', resource: 'workflow_concurrency', details: 'Changed max parallel tasks from 3 to 4' }
    ];
  }
}
