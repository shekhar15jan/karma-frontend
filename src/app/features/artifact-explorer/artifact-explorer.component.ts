import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactsService } from '../../shared/services/artifacts.service';
import { ArtifactResponse } from '../../shared/models/artifact.model';

interface ArtifactVM {
  id: string;
  name: string;
  type: string;
  size: string;
  created: string;
  icon: string;
}

@Component({
  selector: 'app-artifact-explorer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-6 h-[calc(100vh-100px)] overflow-y-auto no-scrollbar pb-16">
      <div class="flex justify-between items-center mb-1">
        <div>
          <h2 class="text-xl font-bold text-on-surface mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">inventory_2</span>
            Artifact Explorer
          </h2>
          <p class="text-[10px] text-on-surface-variant mb-0">
            Secure workspace vault containing all generated media assets and documents
          </p>
        </div>
      </div>

      <div class="lightning-panel p-3 rounded-xl flex items-center gap-3 shrink-0">
        <span class="text-[9px] uppercase font-mono text-on-surface-variant">Filter Vault:</span>
        <button class="px-3 py-1 rounded bg-primary/10 border border-primary/30 text-xs text-primary font-bold">All</button>
        <button class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-on-surface-variant">Documents</button>
        <button class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-on-surface-variant">Audio</button>
        <button class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-on-surface-variant">Video</button>
        <button class="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-on-surface-variant">Images</button>
      </div>

      @if (loading) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading) {
        <div class="grid grid-cols-4 gap-6">
          @for (artifact of artifacts; track artifact.id) {
            <div class="lightning-panel rounded-xl p-4 flex flex-col justify-between hover:border-primary transition-all shadow-[0_0_15px_rgba(0,229,255,0.05)]">
              <div class="flex items-start justify-between">
                <div class="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span class="material-symbols-outlined text-xl text-primary">{{ artifact.icon }}</span>
                </div>
                <span class="text-[8px] font-mono text-on-surface-variant uppercase">{{ artifact.type }}</span>
              </div>
              
              <div class="mt-4 mb-3">
                <h4 class="text-xs font-bold text-on-surface truncate mb-1">{{ artifact.name }}</h4>
                <p class="text-[9px] text-on-surface-variant mb-0 font-mono">
                  {{ artifact.created }}
                </p>
              </div>

              <div class="flex gap-2 border-t border-outline-variant/20 pt-2.5">
                <button class="flex-grow py-1 bg-white/5 border border-outline-variant/30 text-[9px] rounded font-bold hover:bg-white/10 transition-colors">Preview</button>
                <button class="px-2 py-1 bg-primary/10 border border-primary/30 text-[9px] rounded hover:bg-primary/20 transition-colors flex items-center justify-center">
                  <span class="material-symbols-outlined text-xs text-primary">download</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
})
export class ArtifactExplorerComponent implements OnInit {
  artifacts: ArtifactVM[] = [];
  loading = false;

  constructor(private readonly artifactsService: ArtifactsService) {}

  ngOnInit(): void {
    this.loadArtifacts();
  }

  loadArtifacts(): void {
    this.loading = true;
    this.artifactsService.getPendingReview().subscribe({
      next: (data) => {
        this.artifacts = data.map((a: ArtifactResponse) => ({
          id: String(a.id),
          name: a.name || `Artifact #${a.id}`,
          type: a.artifactType?.toLowerCase() || 'document',
          size: '1 MB',
          created: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Unknown',
          icon: a.artifactType === 'VIDEO' ? 'videocam' : a.artifactType === 'AUDIO' ? 'mic' : a.artifactType === 'IMAGE' ? 'image' : 'description'
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
