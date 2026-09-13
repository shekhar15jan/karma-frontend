import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../shared/services/providers.service';
import { ProviderResponse } from '../../shared/models/provider.model';
import { StatusToggleComponent } from '../../shared/components/status-toggle/status-toggle.component';

@Component({
  selector: 'app-provider-center',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusToggleComponent],
  templateUrl: './provider-center.component.html',
  styleUrls: ['./provider-center.component.scss'],
})
export class ProviderCenterComponent implements OnInit {
  providers: ProviderResponse[] = [];
  loading = false;
  selectedProvider: ProviderResponse | null = null;
  config: { api_key?: string; base_url?: string } = {};
  testing = false;
  testResult: { success: boolean; message: string; modelCount?: number } | null = null;

  // Add Provider State
  showAddProvider = false;
  newProvider: Partial<ProviderResponse> = {};
  newProviderApiKey = '';
  newProviderEndpoint = '';
  modelInputString = '';

  isAdmin = false;

  private readonly togglingIds = new Set<string>();

  constructor(private readonly providersService: ProvidersService) {}

  ngOnInit(): void {
    this.isAdmin = this.isAdminUser();
    this.loadProviders();
  }

  isAdminUser(): boolean {
    const token = localStorage.getItem('karma_token');
    if (!token) return false;
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      const roles: string[] = json?.roles ?? [];
      return roles.includes('ROLE_ADMIN');
    } catch {
      return false;
    }
  }

  addProvider(): void {
    const models = this.modelInputString.split(',').map(m => m.trim()).filter(m => m.length > 0);
    const body: any = {
      name: this.newProvider.name || 'Custom Provider',
      providerType: this.newProvider.providerType || 'google',
      models: models.length ? models : ['gemini-3.5-flash'],
      apiKey: this.newProviderApiKey || undefined,
      apiEndpoint: this.newProviderEndpoint || undefined,
    };

    this.providersService.create(body).subscribe({
      next: () => {
        this.showAddProvider = false;
        this.newProvider = {};
        this.newProviderApiKey = '';
        this.newProviderEndpoint = '';
        this.modelInputString = '';
        this.loadProviders();
      },
      error: (err) => {
        console.error('Failed to add provider', err);
      }
    });
  }

  loadProviders(): void {
    this.loading = true;
    this.providersService.getAll().subscribe({
      next: (data) => {
        this.providers = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load providers', err);
        this.loading = false;
      },
    });
  }

  openConfig(provider: ProviderResponse): void {
    this.selectedProvider = provider;
    this.config = { base_url: provider.apiEndpoint || '' };
    this.testResult = null;
  }

  saveConfig(): void {
    if (!this.selectedProvider) return;
    const body: any = {
      name: this.selectedProvider.name,
      providerType: this.selectedProvider.providerType,
      apiEndpoint: this.config.base_url || undefined,
      apiKey: this.config.api_key || undefined,
    };
    this.providersService.update(this.selectedProvider.id, body).subscribe({
      next: () => {
        this.selectedProvider = null;
        this.config = {};
        this.loadProviders();
      },
      error: (err) => {
        console.error('Failed to save config', err);
      }
    });
  }

  deleteProvider(provider: ProviderResponse): void {
    if (!confirm(`Delete provider "${provider.name}"? This cannot be undone.`)) return;
    this.providersService.delete(provider.id).subscribe({
      next: () => {
        this.loadProviders();
      },
      error: (err) => {
        console.error('Failed to delete provider', err);
      }
    });
  }

  toggleProvider(provider: ProviderResponse): void {
    if (this.togglingIds.has(provider.id)) return;
    const target = provider.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
    if (target === 'CONNECTED' && !this.canConnect(provider)) {
      this.showToast(`Configure an API key before connecting ${provider.name}`, 'lock');
      return;
    }
    this.togglingIds.add(provider.id);
    const original = provider.status;
    this.providers = this.providers.map(p => p.id === provider.id ? { ...p, status: target } : p);
    const op = target === 'CONNECTED'
      ? this.providersService.activate(provider.id)
      : this.providersService.deactivate(provider.id);
    op.subscribe({
      next: () => {
        this.togglingIds.delete(provider.id);
        this.showToast(target === 'CONNECTED' ? `Activated ${provider.name}` : `Deactivated ${provider.name}`, target === 'CONNECTED' ? 'check_circle' : 'toggle_off');
      },
      error: (err) => {
        this.togglingIds.delete(provider.id);
        this.providers = this.providers.map(p => p.id === provider.id ? { ...p, status: original } : p);
        this.showToast(`Failed to update provider: ${err?.error?.message || err?.message || 'unknown error'}`, 'error');
        console.error('Failed to toggle provider', err);
      }
    });
  }

  canConnect(provider: ProviderResponse): boolean {
    return !provider.keyRequired || provider.apiKeyConfigured;
  }

  testConnection(provider: ProviderResponse, apiKey?: string, apiEndpoint?: string): void {
    this.testing = true;
    this.testResult = null;
    this.providersService.testConnection(provider.id, {
      apiKey: apiKey || undefined,
      apiEndpoint: apiEndpoint || undefined,
    }).subscribe({
      next: (result) => {
        this.testResult = result;
        this.testing = false;
        this.applyStatus(provider, result.status || (result.success ? 'CONNECTED' : 'ERROR'));
        this.loadProviders();
        const synced = result.success && result.modelCount != null
          ? ` · synced ${result.modelCount} model${result.modelCount === 1 ? '' : 's'}`
          : '';
        this.showToast((result.success ? 'Connection successful' : result.message) + synced, result.success ? 'check_circle' : 'error');
      },
      error: (err) => {
        this.testResult = { success: false, message: err.error?.message || 'Connection test failed' };
        this.testing = false;
        this.applyStatus(provider, 'ERROR');
        this.showToast(this.testResult.message, 'error');
      }
    });
  }

  applyStatus(provider: ProviderResponse, status: string): void {
    const idx = this.providers.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      this.providers[idx].status = status;
    }
  }

  showToast(message: string, icon: string = 'info'): void {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, icon } }));
  }

  dismissModal(): void {
    this.selectedProvider = null;
  }
}
