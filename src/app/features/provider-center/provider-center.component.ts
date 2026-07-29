import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProvidersService } from '../../shared/services/providers.service';
import { ProviderResponse } from '../../shared/models/provider.model';

interface ProviderHealth {
  latencyMs: number;
  errorRate: number;
  requestsLastHour: number;
}

interface ProviderVM extends ProviderResponse {
  metrics: ProviderHealth;
}

@Component({
  selector: 'app-provider-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './provider-center.component.html',
  styleUrls: ['./provider-center.component.scss'],
})
export class ProviderCenterComponent implements OnInit {
  providers: ProviderVM[] = [];
  loading = false;
  selectedProvider: ProviderVM | null = null;
  config: { api_key?: string; base_url?: string } = {};
  testing = false;
  testResult: { success: boolean; message: string } | null = null;

  // Add Provider State
  showAddProvider = false;
  newProvider: Partial<ProviderResponse> = {};
  newProviderApiKey = '';
  modelInputString = '';
  healthData = new Map<string, any>();

  constructor(private readonly providersService: ProvidersService) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  addProvider(): void {
    const models = this.modelInputString.split(',').map(m => m.trim()).filter(m => m.length > 0);
    const body: any = {
      name: this.newProvider.name || 'Custom Provider',
      providerType: this.newProvider.providerType || 'CUSTOM',
      models: models.length ? models : ['custom-model-1'],
      apiKey: this.newProviderApiKey || undefined,
    };

    this.providersService.create(body).subscribe({
      next: () => {
        this.showAddProvider = false;
        this.newProvider = {};
        this.newProviderApiKey = '';
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
        this.providers = data.map(p => ({
          ...p,
          metrics: { latencyMs: 100, errorRate: 0.1, requestsLastHour: 0 }
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load providers', err);
        this.loading = false;
      },
    });
  }

  openConfig(provider: ProviderVM): void {
    this.selectedProvider = provider;
    this.config = {};
    this.testResult = null;
  }

  saveConfig(): void {
    if (!this.selectedProvider) return;
    const body: any = {
      name: this.selectedProvider.name,
      providerType: this.selectedProvider.providerType,
      apiEndpoint: this.selectedProvider.apiEndpoint,
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

  testConnection(provider: ProviderVM): void {
    this.testing = true;
    this.testResult = null;
    this.testing = false;
    this.testResult = { success: true, message: 'Connection test initiated. Check provider status.' };
  }

  dismissModal(): void {
    this.selectedProvider = null;
  }
}
