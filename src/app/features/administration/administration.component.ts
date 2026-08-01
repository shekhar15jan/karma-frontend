import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../shared/services/admin.service';
import { VoicePreferencesService, VoiceLanguage } from '../../shared/services/voice-preferences.service';
import { AuditEventResponse, SettingsResponse } from '../../shared/models/settings.model';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string;
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
  auditLog: AuditEventResponse[] = [];
  loading = false;
  error: string | null = null;

  newUser: Partial<AdminUser> = {};
  showAddUser = false;
  editingUser: AdminUser | null = null;

  newRole: Partial<Role> = { permissions: [] };
  showAddRole = false;

  availablePermissions = [
    'workflows:read', 'workflows:write', 'workflows:execute',
    'providers:read', 'providers:write',
    'analytics:read',
    'admin:users', 'admin:roles', 'admin:settings', 'admin:audit',
  ];

  // Voice & Language preferences
  voiceLanguages: VoiceLanguage[] = [];
  voiceOptions: string[] = [];
  selectedVoiceLanguage = 'en';
  selectedVoice = 'en-IN-NeerjaNeural';
  voiceSaving = false;
  voiceSaved = false;

  constructor(private readonly adminService: AdminService,
              private readonly voicePrefs: VoicePreferencesService) {}

  ngOnInit(): void {
    this.loadTab('users');
    this.loadVoicePreferences();
  }

  private loadVoicePreferences(): void {
    this.voicePrefs.loadCatalog().then(() => {
      this.voiceLanguages = this.voicePrefs.languages();
      this.voiceOptions = this.voicePrefs.voicesForLanguage(this.selectedVoiceLanguage);
    });
    this.voicePrefs.loadPreferences().then(() => {
      this.selectedVoiceLanguage = this.voicePrefs.language();
      this.selectedVoice = this.voicePrefs.voice();
      this.voiceOptions = this.voicePrefs.voicesForLanguage(this.selectedVoiceLanguage);
    });
  }

  onVoiceLanguageChange(): void {
    this.voiceOptions = this.voicePrefs.voicesForLanguage(this.selectedVoiceLanguage);
    if (!this.voiceOptions.includes(this.selectedVoice)) {
      this.selectedVoice = this.voicePrefs.defaultVoiceFor(this.selectedVoiceLanguage);
    }
  }

  saveVoiceSettings(): void {
    this.voiceSaving = true;
    this.voiceSaved = false;
    this.voicePrefs.save(this.selectedVoiceLanguage, this.selectedVoice).then(() => {
      this.voiceSaving = false;
      this.voiceSaved = true;
      setTimeout(() => (this.voiceSaved = false), 3000);
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  loadTab(tab: string): void {
    this.loading = true;
    this.error = null;
    switch (tab) {
      case 'users':
        this.adminService.getUsers().subscribe({
          next: (res: any) => {
            this.users = res || [];
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load users.';
            this.loading = false;
            console.error(err);
          },
        });
        break;
      case 'roles':
        this.adminService.getRoles().subscribe({
          next: (res: any) => {
            this.roles = res || [];
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load roles.';
            this.loading = false;
            console.error(err);
          },
        });
        break;
      case 'settings':
        this.adminService.getSettings().subscribe({
          next: (res: any) => {
            let raw: Record<string, unknown> = {};
            const settingsData = res?.settingsData;
            if (typeof settingsData === 'string' && settingsData.trim()) {
              try { raw = JSON.parse(settingsData); } catch { raw = {}; }
            } else if (settingsData && typeof settingsData === 'object') {
              raw = settingsData;
            }
            this.settings = Object.entries(raw).map(([key, value]) => ({
              key,
              value: String(value),
              description: '',
              category: 'General'
            }));
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load settings.';
            this.loading = false;
            console.error(err);
          },
        });
        break;
      case 'audit':
        this.adminService.getAuditLog().subscribe({
          next: (res: any) => {
            this.auditLog = res?.content || res || [];
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load audit log.';
            this.loading = false;
            console.error(err);
          },
        });
        break;
      default:
        this.loading = false;
        break;
    }
  }

  addUser(): void {
    this.showAddUser = false;
    this.newUser = {};
  }

  editUser(user: AdminUser): void {
    this.editingUser = { ...user };
  }

  saveUser(): void {
    if (!this.editingUser) return;
    this.users = this.users.map(u => u.id === this.editingUser!.id ? { ...this.editingUser! } : u);
    this.editingUser = null;
  }

  deactivateUser(user: AdminUser): void {
    this.users = this.users.map(u => u.id === user.id ? { ...u, isActive: false } : u);
  }

  addRole(): void {
    this.showAddRole = false;
    this.newRole = { permissions: [] };
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
    const data = this.settings.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    this.adminService.saveSettings({ settingsData: JSON.stringify(data) }).subscribe({
      next: () => this.loadTab('settings'),
      error: (err) => console.error('Failed to save settings', err)
    });
  }

  trackByIndex(index: number): number {
    return index;
  }
}
