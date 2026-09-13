import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CarAgentProgress {
  key: string;
  label: string;
  icon: string;
  pct: number;
  status: string; // COMPLETED, RUNNING, FAILED, Idle
}

@Component({
  selector: 'app-karma-car',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="flex flex-col items-center gap-3">
    <!-- Car silhouette with wheels as agent circles -->
    <div class="relative w-[520px] h-[260px] flex items-center justify-center">
      <!-- Car body -->
      <div class="absolute left-[90px] right-[90px] top-[70px] bottom-[70px] rounded-[32px] border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-secondary/10 shadow-[0_0_30px_rgba(0,229,255,0.15)] flex items-center justify-center">
        <div class="text-center">
          <p class="text-[10px] font-label-mono tracking-[0.3em] text-primary-container mb-1">KARMA CAR</p>
          <p class="text-2xl font-black tracking-widest text-on-surface">MISSION</p>
          <p class="text-[11px] font-mono text-primary mt-1">{{ overallPct }}% • {{ overallStatus }}</p>
          <div class="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-outline-variant/20 mx-auto mt-2">
            <div class="bg-primary h-full transition-all duration-700 shadow-[0_0_10px_#00e5ff]" [style.width.%]="overallPct"></div>
          </div>
        </div>
      </div>
      <!-- Wheels = agents -->
      <ng-container *ngFor="let w of wheelAgents; let i = index">
        <div class="absolute flex flex-col items-center" [ngStyle]="{left: w.x + 'px', top: w.y + 'px', transform: 'translate(-50%,-50%)'}">
          <div class="relative w-[84px] h-[84px] rounded-full glass-panel flex items-center justify-center border-2 transition-all duration-500"
               [ngClass]="wheelBorder(w)">
            <!-- SVG progress ring -->
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6"/>
              <circle cx="42" cy="42" r="36" fill="none" [attr.stroke]="wheelColor(w)" stroke-width="6" stroke-linecap="round"
                      [attr.stroke-dasharray]="circumference" [attr.stroke-dashoffset]="dashOffset(w.pct)"
                      class="transition-all duration-700 drop-shadow-[0_0_6px_currentColor]"/>
            </svg>
            <span class="material-symbols-outlined text-[22px] relative z-10" [ngClass]="wheelIconColor(w)">{{ w.icon }}</span>
            <span class="absolute -bottom-1 text-[8px] font-bold px-1 rounded bg-background border border-outline-variant/30" [ngClass]="wheelIconColor(w)">{{ w.pct }}%</span>
          </div>
          <p class="text-[8px] font-bold tracking-widest text-on-surface mt-1">{{ w.label }}</p>
          <span class="text-[7px] font-mono" [ngClass]="wheelStatusColor(w)">{{ w.status }}</span>
        </div>
      </ng-container>
    </div>

    <!-- Legend for remaining agents (non-wheel) -->
    <div class="flex flex-wrap gap-2 justify-center max-w-[520px]">
      <div *ngFor="let a of otherAgents" class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-outline-variant/20">
        <svg class="w-6 h-6 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
          <circle cx="16" cy="16" r="12" fill="none" [attr.stroke]="wheelColor(a)" stroke-width="3" stroke-linecap="round"
                  [attr.stroke-dasharray]="75.4" [attr.stroke-dashoffset]="dashOffsetSmall(a.pct)"/>
          <text x="16" y="19" text-anchor="middle" font-size="7" [attr.fill]="wheelColor(a)" font-weight="700">{{ a.pct }}</text>
        </svg>
        <span class="text-[8px] font-bold">{{ a.label }}</span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class KarmaCarComponent {
  @Input() agents: CarAgentProgress[] = [];
  @Input() overallPct = 0;
  @Input() overallStatus = 'Idle';

  circumference = 2 * Math.PI * 36; // 226.19

  get wheelAgents(): (CarAgentProgress & { x: number; y: number })[] {
    // Map Research/Script/Voice/Video to 4 wheels
    const order = ['research', 'script', 'voice', 'video'];
    const map: Record<string, { x: number; y: number }> = {
      research: { x: 90, y: 50 },
      script: { x: 430, y: 50 },
      voice: { x: 90, y: 210 },
      video: { x: 430, y: 210 },
    };
    return order.map(k => {
      const a = this.agents.find(x => x.key === k) || { key: k, label: k.toUpperCase(), icon: 'smart_toy', pct: 0, status: 'Idle' };
      return { ...a, ...map[k] };
    });
  }

  get otherAgents(): CarAgentProgress[] {
    const wheels = new Set(['research', 'script', 'voice', 'video']);
    return this.agents.filter(a => !wheels.has(a.key));
  }

  dashOffset(pct: number): number {
    const p = Math.max(0, Math.min(100, pct));
    return this.circumference * (1 - p / 100);
  }
  dashOffsetSmall(pct: number): number {
    const circ = 2 * Math.PI * 12;
    return circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  }
  wheelColor(a: CarAgentProgress): string {
    if (a.status === 'COMPLETED') return '#4ade80';
    if (a.status === 'FAILED') return '#f87171';
    if (a.status === 'RUNNING') return '#00e5ff';
    return 'rgba(255,255,255,0.2)';
  }
  wheelBorder(a: CarAgentProgress & { x: number; y: number }): string {
    if (a.status === 'COMPLETED') return 'border-green-400 shadow-[0_0_18px_rgba(74,222,128,0.4)]';
    if (a.status === 'FAILED') return 'border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.4)]';
    if (a.status === 'RUNNING') return 'border-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.5)] animate-pulse';
    return 'border-outline-variant/30 opacity-70';
  }
  wheelIconColor(a: CarAgentProgress): string {
    if (a.status === 'COMPLETED') return 'text-green-400';
    if (a.status === 'FAILED') return 'text-red-400';
    if (a.status === 'RUNNING') return 'text-[#00e5ff]';
    return 'text-on-surface-variant';
  }
  wheelStatusColor(a: CarAgentProgress): string {
    if (a.status === 'COMPLETED') return 'text-green-400';
    if (a.status === 'FAILED') return 'text-red-400';
    if (a.status === 'RUNNING') return 'text-[#00e5ff]';
    return 'text-on-surface-variant';
  }
}
