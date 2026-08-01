import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../shared/services/providers.service';
import { ProviderResponse } from '../../shared/models/provider.model';

@Component({
  selector: 'app-provider-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provider-center.component.html',
  styleUrls: ['./provider-center.component.scss'],
})
export class ProviderCenterComponent implements OnInit {
  providers: ProviderResponse[] = [];
  loading = false;
  selectedProvider: ProviderResponse | null = null;
  config: { api_key?: string; base_url?: string } = {};
  testing = false;
  testResult: { success: boolean; message: string } | null = null;

  // Add Provider State
  showAddProvider = false;
  newProvider: Partial<ProviderResponse> = {};
  newProviderApiKey = '';
  newProviderEndpoint = '';
  modelInputString = '';

  isAdmin = false;

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
      providerType: this.newProvider.providerType || 'openai',
      models: models.length ? models : ['gpt-4o-mini'],
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

  testConnection(provider: ProviderResponse): void {
    this.testing = true;
    this.testResult = null;
    this.providersService.testConnection(provider.id).subscribe({
      next: (result) => {
        this.testResult = result;
        this.testing = false;
      },
      error: (err) => {
        this.testResult = { success: false, message: err.error?.message || 'Connection test failed' };
        this.testing = false;
      }
    });
  }

  dismissModal(): void {
    this.selectedProvider = null;
  }
}
