import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex justify-center items-center h-screen bg-background relative overflow-hidden">
      <!-- Background glow effects -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08)_0%,transparent_60%)] pointer-events-none"></div>
      <div class="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(rgba(0,229,255,0.15)_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div class="glass-panel rounded-2xl p-8 w-[400px] flex flex-col gap-6 shadow-[0_0_50px_rgba(0,229,255,0.15)] relative z-10">
        <!-- Logo Header -->
        <div class="flex flex-col items-center gap-2 mb-2">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e5ff]/20 to-secondary/20 border border-[#00e5ff]/40 shadow-[0_0_20px_rgba(0,229,255,0.3)] flex items-center justify-center animate-[pulse_4s_infinite]">
            <span class="material-symbols-outlined text-3xl text-primary-container">rocket_launch</span>
          </div>
          <h2 class="text-xl font-bold tracking-widest text-on-surface uppercase mb-0">KARMA <span class="text-primary font-light">OS</span></h2>
          <span class="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider">Access Authorization Required</span>
        </div>

        <div *ngIf="error" class="p-2.5 border border-red-500/30 bg-red-500/10 text-red-400 text-xs rounded-xl text-center">
          <span class="material-symbols-outlined text-sm align-middle me-1">warning</span>{{ error }}
        </div>

        <div class="flex flex-col gap-4">
          <div *ngIf="!isLogin" class="space-y-1">
            <label class="text-[9px] font-mono text-on-surface-variant uppercase">Display Name</label>
            <input 
              class="w-full bg-white/5 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary" 
              [(ngModel)]="name" 
              placeholder="Your name" 
            />
          </div>

          <div class="space-y-1">
            <label class="text-[9px] font-mono text-on-surface-variant uppercase">Email Address</label>
            <input 
              class="w-full bg-white/5 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary" 
              type="email" 
              [(ngModel)]="email" 
              placeholder="name@example.com" 
            />
          </div>

          <div class="space-y-1">
            <label class="text-[9px] font-mono text-on-surface-variant uppercase">Access Password</label>
            <input 
              class="w-full bg-white/5 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary" 
              type="password" 
              [(ngModel)]="password" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            class="w-full mt-2 py-2 bg-gradient-to-r from-[#00e5ff]/20 to-secondary/20 hover:from-[#00e5ff]/35 hover:to-secondary/35 border border-[#00e5ff]/40 text-on-surface text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.1)]" 
            (click)="submit()" 
            [disabled]="loading"
          >
            @if (loading) {
              <span class="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              <span>Authenticating...</span>
            } @else {
              <span>{{ isLogin ? 'Establish Connection' : 'Generate Core Account' }}</span>
            }
          </button>

          <!-- Bypass button for local testing when credentials are not seeded -->
          <button 
            class="w-full mt-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-outline-variant/30 text-on-surface-variant text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5" 
            (click)="bypass()"
          >
            <span class="material-symbols-outlined text-xs">vpn_key</span>
            <span>Bypass (Local Developer Mode)</span>
          </button>

          <p class="text-center mb-0 mt-2">
            <a href="javascript:void(0)" (click)="toggleMode()" class="text-[10px] text-primary hover:text-[#00e5ff] text-decoration-none transition-colors">
              {{ isLogin ? 'Request access key (Register)' : 'Return to Authorization (Sign In)' }}
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  isLogin = true;
  email = '';
  password = '';
  name = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService) {}

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.error = '';
  }

  bypass(): void {
    this.loading = true;
    this.error = '';
    const email = this.email || 'dev@karma.local';
    const password = this.password || 'dev123';
    this.auth.devBypass(email, password).subscribe({
      next: (res) => this.auth.handleAuthResponse(res),
      error: (err) => {
        this.error = err.error?.detail || 'Bypass failed';
        this.loading = false;
      },
    });
  }

  submit(): void {
    this.loading = true;
    this.error = '';
    const action = this.isLogin
      ? this.auth.login(this.email, this.password)
      : this.auth.register(this.email, this.password, this.name);

    action.subscribe({
      next: (res) => this.auth.handleAuthResponse(res),
      error: (err) => {
        this.error = err.error?.detail || 'Authentication failed';
        this.loading = false;
      },
    });
  }
}
