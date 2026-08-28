import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly pollMs = 30000;
  private version: string | null = null;

  start(): void {
    this.readVersion().then((v) => {
      this.version = v;
    });
    setInterval(() => this.check(), this.pollMs);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.check();
      }
    });
    window.addEventListener('focus', () => this.check());
  }

  private async readVersion(): Promise<string | null> {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) {
        return null;
      }
      const json = await res.json();
      return json?.version || null;
    } catch {
      return null;
    }
  }

  private async check(): Promise<void> {
    if (!this.version) {
      return;
    }
    const latest = await this.readVersion();
    if (latest && latest !== this.version) {
      window.location.reload();
    }
  }
}
