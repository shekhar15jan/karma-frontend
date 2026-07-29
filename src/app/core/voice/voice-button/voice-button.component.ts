import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceCommandService } from '../voice-command.service';

@Component({
  selector: 'app-voice-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-container">
      <div class="voice-toast" *ngIf="svc.lastCommand() as cmd" [class.show]="svc.lastCommand()">
        <span class="voice-toast-icon">{{ svc.isListening() ? '🎤' : '🔇' }}</span>
        <span class="voice-toast-text">{{ cmd.display_text }}</span>
      </div>

      <div class="voice-transcript" *ngIf="svc.transcript()">
        {{ svc.transcript() }}
      </div>

      <div class="voice-error" *ngIf="svc.error()">
        {{ svc.error() }}
      </div>

      <button
        class="voice-btn"
        [class.listening]="svc.isListening()"
        (click)="svc.toggle()"
        [title]="svc.isListening() ? 'Stop voice control' : 'Start voice control'"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <span class="voice-status-dot" *ngIf="svc.isListening()"></span>
      </button>
    </div>
  `,
  styles: [`
    .voice-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .voice-btn { width: 56px; height: 56px; border-radius: 50%; border: none; background: #1a1a2e; color: #e0e0e0; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: all 0.3s; position: relative; }
    .voice-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    .voice-btn.listening { background: #ef4444; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 70% { box-shadow: 0 0 0 16px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
    .voice-status-dot { position: absolute; top: 2px; right: 2px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid #1a1a2e; }
    .voice-toast { background: #1a1a2e; color: #e0e0e0; padding: 8px 16px; border-radius: 8px; font-size: 14px; opacity: 0; transform: translateY(10px); transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 300px; }
    .voice-toast.show { opacity: 1; transform: translateY(0); }
    .voice-toast-icon { margin-right: 8px; }
    .voice-transcript { background: rgba(0,0,0,0.8); color: #94a3b8; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-style: italic; max-width: 280px; }
    .voice-error { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 6px; font-size: 12px; }
  `],
})
export class VoiceButtonComponent {
  constructor(public svc: VoiceCommandService) {}
}
