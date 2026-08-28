import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-v2-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-4 rounded-xl">
      <h3 class="text-sm font-bold text-primary mb-2">V2 Scene Plan — {{ scenes.length }} scenes</h3>
      <div class="flex flex-col gap-2 max-h-96 overflow-y-auto">
        @for (s of scenes; track s.sceneId) {
          <div class="p-2 rounded border border-outline-variant/20 bg-white/5 flex justify-between items-center">
            <div>
              <div class="text-xs font-bold">{{ s.sceneId }} — {{ s.intent }} — {{ s.type }}</div>
              <div class="text-[10px] text-on-surface-variant truncate">{{ s.narration?.text }}</div>
            </div>
            <div class="flex gap-1">
              <button (click)="regenerateScene(s.sceneId)" class="px-2 py-1 text-[9px] bg-primary/10 border border-primary/30 rounded">Regenerate</button>
              <button (click)="inspect(s)" class="px-2 py-1 text-[9px] bg-white/5 border rounded">Inspect</button>
            </div>
          </div>
        }
      </div>
      @if (qa) {
        <div class="mt-3 p-2 rounded bg-white/5 border text-[10px] font-mono">
          <div>Professional Score: {{ qa.professionalScore }} — {{ qa.overall }}</div>
          <div>Motion {{ qa.scores.motion }} | Realism {{ qa.scores.realism }}</div>
        </div>
      }
    </div>
  `
})
export class V2PreviewComponent {
  @Input() scenes: any[] = [];
  @Input() qa: any = null;
  regenerateScene(id: string) { console.log('regenerate scene', id); }
  inspect(s: any) { console.log('inspect', s); }
}
