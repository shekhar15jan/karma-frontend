import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PromptTemplate {
  id: string;
  name: string;
  lastUpdated: string;
  content: string;
}

@Component({
  selector: 'app-prompt-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-6 h-[calc(100vh-100px)] overflow-hidden pb-16">
      <div class="flex justify-between items-center mb-1 shrink-0">
        <div>
          <h2 class="text-xl font-bold text-on-surface mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">terminal</span>
            Prompt Studio
          </h2>
          <p class="text-[10px] text-on-surface-variant mb-0">
            Write, version control, and test prompt templates for AI Orchestration
          </p>
        </div>
      </div>

      <div class="flex flex-grow gap-6 overflow-hidden">
        <!-- Templates List -->
        <div class="lightning-panel rounded-xl p-4 w-64 flex flex-col gap-3 shrink-0 overflow-y-auto no-scrollbar">
          <h3 class="text-xs font-semibold text-primary uppercase tracking-widest leading-none glow-text mb-2">Templates</h3>
          <div class="flex flex-col gap-2">
            @for (tpl of templates; track tpl.id) {
              <div
                class="flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border cursor-pointer transition-colors"
                [ngClass]="selectedTemplate?.id === tpl.id ? 'border-primary' : 'border-outline-variant/30'"
                (click)="selectTemplate(tpl)"
              >
                <span class="text-xs font-bold text-on-surface truncate">{{ tpl.name }}</span>
                <span class="text-[8px] font-mono text-on-surface-variant">Updated: {{ tpl.lastUpdated }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Editor Canvas -->
        <div class="flex-grow flex flex-col gap-4 overflow-hidden">
          @if (selectedTemplate) {
            <div class="lightning-panel rounded-xl p-4 flex-grow flex flex-col gap-3 overflow-hidden">
              <div class="flex justify-between items-center shrink-0">
                <span class="text-xs font-bold text-primary-container font-mono uppercase">{{ selectedTemplate.name }}</span>
                <button class="px-4 py-1 bg-primary/10 border border-primary/30 text-on-surface text-xs font-bold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1.5" (click)="saveTemplate()">
                  <span class="material-symbols-outlined text-sm">save</span>
                  <span>Save Template</span>
                </button>
              </div>

              <!-- Text editor container -->
              <div class="flex-grow relative overflow-hidden mt-1 border border-outline-variant/30 rounded-xl bg-background/40">
                <textarea
                  class="absolute inset-0 w-full h-full p-4 bg-transparent text-xs font-mono text-on-surface focus:outline-none resize-none"
                  [(ngModel)]="selectedTemplate.content"
                ></textarea>
              </div>

              <!-- Variables & Test Panel -->
              <div class="border-t border-outline-variant/20 pt-3 shrink-0 flex flex-col gap-2">
                <h4 class="text-[10px] font-mono text-on-surface-variant uppercase mb-0">Parameters & Test Input</h4>
                <div class="flex gap-4">
                  <input
                    type="text"
                    placeholder="e.g. topic='Artificial Intelligence'"
                    class="flex-grow bg-white/5 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button class="px-4 py-1.5 bg-green-600/20 border border-green-500/50 text-green-500 text-xs font-bold rounded-lg hover:bg-green-600/30 transition-all">
                    Test Pipeline Prompt
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="lightning-panel rounded-xl flex-grow flex flex-col items-center justify-center text-on-surface-variant gap-2">
              <span class="material-symbols-outlined text-4xl opacity-40">terminal</span>
              <p class="text-xs">Select a prompt template from the library to open the studio editor</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
})
export class PromptStudioComponent {
  protected readonly templates: PromptTemplate[] = [
    { id: '1', name: 'Agent Research Template', lastUpdated: '10m ago', content: 'You are the KARMA Research Agent. Perform deep search and synthesize findings on the topic: {{topic}}.' },
    { id: '2', name: 'Scriptwriter Engine', lastUpdated: '1h ago', content: 'Design a highly engaging video script outline based on this topic research overview: {{research_input}}.' },
    { id: '3', name: 'SEO Keywords Architect', lastUpdated: '1d ago', content: 'Analyze the video script and list 10 trending search terms that are low competition but high volume.' },
  ];

  protected selectedTemplate: PromptTemplate | null = null;

  selectTemplate(tpl: PromptTemplate) {
    this.selectedTemplate = { ...tpl };
  }

  saveTemplate() {
    if (!this.selectedTemplate) return;
    const idx = this.templates.findIndex(t => t.id === this.selectedTemplate!.id);
    if (idx !== -1) {
      this.templates[idx] = { ...this.selectedTemplate, lastUpdated: 'Just now' };
    }
  }
}
