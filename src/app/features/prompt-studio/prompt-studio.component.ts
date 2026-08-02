import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';

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
        <div class="glass-panel rounded-xl p-4 w-64 flex flex-col gap-3 shrink-0 overflow-y-auto no-scrollbar">
          <h3 class="text-xs font-semibold text-primary uppercase tracking-widest leading-none glow-text mb-2">Templates</h3>
          <button class="px-3 py-1.5 bg-primary/10 border border-primary/30 text-on-surface text-xs font-bold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer" (click)="newTemplate()">
            <span class="material-symbols-outlined text-sm">add</span> New Template
          </button>
          @if (loading) {
            <div class="flex items-center justify-center py-8">
              <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
          @if (!loading) {
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
          }
        </div>

        <div class="flex-grow flex flex-col gap-4 overflow-hidden">
          @if (selectedTemplate) {
            <div class="glass-panel rounded-xl p-4 flex-grow flex flex-col gap-3 overflow-hidden bg-background/40">
              <div class="flex justify-between items-center shrink-0 gap-3">
                @if (isNewTemplate) {
                  <input class="flex-grow bg-white/5 border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs font-bold text-primary-container font-mono focus:outline-none focus:border-primary" [(ngModel)]="selectedTemplate.name" placeholder="Prompt name" />
                } @else {
                  <span class="text-xs font-bold text-primary-container font-mono uppercase">{{ selectedTemplate.name }}</span>
                }
                <div class="flex items-center gap-2 shrink-0">
                  @if (!isNewTemplate) {
                    <button class="px-3 py-1 bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer" (click)="deleteTemplate()" [disabled]="deleting">
                      <span class="material-symbols-outlined text-sm">delete</span>
                      <span>Delete</span>
                    </button>
                  }
                  <button class="px-4 py-1 bg-primary/10 border border-primary/30 text-on-surface text-xs font-bold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer" (click)="saveTemplate()" [disabled]="saving">
                    <span class="material-symbols-outlined text-sm">save</span>
                    <span>{{ saving ? 'Saving...' : 'Save Template' }}</span>
                  </button>
                </div>
              </div>

              <div class="flex-grow relative overflow-hidden mt-1 border border-outline-variant/30 rounded-xl" style="backdrop-filter:blur(20px);background:rgba(255,255,255,0.06)">
                <textarea
                  class="absolute inset-0 w-full h-full p-4 bg-transparent text-xs font-mono text-on-surface focus:outline-none resize-none"
                  [(ngModel)]="selectedTemplate.content"
                ></textarea>
              </div>

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
            <div class="glass-panel rounded-xl flex-grow flex flex-col items-center justify-center text-on-surface-variant gap-2">
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
export class PromptStudioComponent implements OnInit {
  templates: PromptTemplate[] = [];
  selectedTemplate: PromptTemplate | null = null;
  loading = false;
  saving = false;
  deleting = false;
  isNewTemplate = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading = true;
    this.api.get<any[]>('/v1/prompts').subscribe({
      next: (res) => {
        const data = res?.data || res || [];
        this.templates = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          lastUpdated: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Unknown',
          content: p.content || ''
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectTemplate(tpl: PromptTemplate) {
    this.selectedTemplate = { ...tpl };
    this.isNewTemplate = false;
  }

  newTemplate() {
    this.selectedTemplate = { id: '', name: 'Untitled Prompt', lastUpdated: 'New', content: '' };
    this.isNewTemplate = true;
  }

  saveTemplate() {
    if (!this.selectedTemplate || !this.selectedTemplate.name.trim()) return;
    this.saving = true;
    const payload = {
      name: this.selectedTemplate.name,
      content: this.selectedTemplate.content
    };
    const op = this.isNewTemplate
      ? this.api.post('/v1/prompts', payload)
      : this.api.put(`/v1/prompts/${this.selectedTemplate.id}`, payload);
    op.subscribe({
      next: () => {
        this.saving = false;
        this.loadTemplates();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  deleteTemplate() {
    if (!this.selectedTemplate || this.isNewTemplate) return;
    if (!confirm(`Delete prompt "${this.selectedTemplate.name}"?`)) return;
    this.deleting = true;
    this.api.delete(`/v1/prompts/${this.selectedTemplate.id}`).subscribe({
      next: () => {
        this.deleting = false;
        const id = this.selectedTemplate!.id;
        this.selectedTemplate = null;
        this.templates = this.templates.filter(t => t.id !== id);
      },
      error: () => {
        this.deleting = false;
      }
    });
  }
}
