import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { take } from 'rxjs';
import { ArtifactsService } from '../../shared/services/artifacts.service';
import { ApiService } from '../../shared/services/api.service';
import { ArtifactResponse } from '../../shared/models/artifact.model';

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

      <div class="glass-panel p-3 rounded-xl flex items-center gap-3 shrink-0">
        <span class="text-[9px] uppercase font-mono text-on-surface-variant">Filter Vault:</span>
        <button (click)="filter = 'ALL'" [ngClass]="filter === 'ALL' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 text-on-surface-variant'" class="px-3 py-1 rounded border text-xs font-bold">All</button>
        <button (click)="filter = 'DOCUMENT'" [ngClass]="filter === 'DOCUMENT' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 text-on-surface-variant'" class="px-3 py-1 rounded border text-xs">Documents</button>
        <button (click)="filter = 'AUDIO'" [ngClass]="filter === 'AUDIO' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 text-on-surface-variant'" class="px-3 py-1 rounded border text-xs">Audio</button>
        <button (click)="filter = 'VIDEO'" [ngClass]="filter === 'VIDEO' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 text-on-surface-variant'" class="px-3 py-1 rounded border text-xs">Video</button>
        <button (click)="filter = 'IMAGE'" [ngClass]="filter === 'IMAGE' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 text-on-surface-variant'" class="px-3 py-1 rounded border text-xs">Images</button>
      </div>

      @if (loading) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading && filteredArtifacts.length === 0) {
        <div class="text-center py-16 text-on-surface-variant">
          <span class="material-symbols-outlined text-3xl">inventory_2</span>
          <p class="text-xs mt-2">No artifacts found</p>
        </div>
      }

      @if (!loading) {
        <div class="grid grid-cols-4 gap-6">
          @for (artifact of filteredArtifacts; track artifact.id) {
            <div class="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-primary transition-all shadow-[0_0_15px_rgba(0,229,255,0.05)]">
              <div class="flex items-start justify-between">
                <div class="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span class="material-symbols-outlined text-xl text-primary">{{ iconFor(artifact.artifactType) }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[8px] font-mono text-on-surface-variant uppercase">{{ artifact.artifactType }}</span>
                  <span class="w-1.5 h-1.5 rounded-full"
                        [class]="artifact.reviewStatus === 'APPROVED' ? 'bg-green-400' : artifact.reviewStatus === 'REJECTED' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'"
                        [title]="'Review: ' + artifact.reviewStatus"></span>
                </div>
              </div>

              <div class="mt-4 mb-3">
                <h4 class="text-xs font-bold text-on-surface truncate mb-1" [title]="artifact.name">{{ artifact.name }}</h4>
                <p class="text-[9px] text-on-surface-variant mb-0 font-mono">
                  {{ formatDate(artifact.createdAt) }} · {{ contentTypeLabel(artifact.contentType) }}
                </p>
              </div>

              <div class="flex gap-2 border-t border-outline-variant/20 pt-2.5">
                <button (click)="openPreview(artifact)" class="flex-grow py-1 bg-white/5 border border-outline-variant/30 text-[9px] rounded font-bold hover:bg-white/10 transition-colors">Preview</button>
                <button (click)="download(artifact)" class="px-2 py-1 bg-primary/10 border border-primary/30 text-[9px] rounded hover:bg-primary/20 transition-colors flex items-center justify-center">
                  <span class="material-symbols-outlined text-xs text-primary">download</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (selected) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div class="absolute inset-0 cursor-pointer" (click)="closePreview()"></div>
        <div class="border border-outline-variant/30 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[760px] max-w-full max-h-[85vh] flex flex-col glass-panel relative z-10 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-4 border-b border-outline-variant/30 bg-white/5 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <span class="material-symbols-outlined text-primary text-[18px]">{{ iconFor(selected.artifactType) }}</span>
              <div class="min-w-0">
                <h2 class="text-primary-container font-display tracking-widest text-[14px] uppercase glow-text mb-0 truncate">{{ selected.name }}</h2>
                <span class="text-[9px] font-mono text-on-surface-variant uppercase">{{ selected.artifactType }} · {{ selected.reviewStatus }} · v{{ selected.currentVersion || 1 }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="download(selected)" class="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/30 text-[10px] font-bold text-primary rounded hover:bg-primary/20 transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-xs">download</span> Download
              </button>
              <button (click)="closePreview()" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors bg-transparent border-0 cursor-pointer">close</button>
            </div>
          </div>
          <div class="p-6 overflow-y-auto custom-scrollbar flex-grow flex items-center justify-center">
            @if (isVideo(selected)) {
              <video controls autoplay class="max-w-full max-h-[50vh] rounded-lg" [src]="previewUrl(selected)"></video>
            } @else if (isAudio(selected)) {
              <audio controls class="w-full" [src]="previewUrl(selected)"></audio>
            } @else if (isImage(selected)) {
              <img [src]="previewUrl(selected)" class="max-w-full max-h-[50vh] rounded-lg" alt="{{ selected.name }}" />
            } @else {
              <pre class="text-[12px] font-mono text-on-surface whitespace-pre-wrap break-words leading-relaxed w-full">{{ selected.contentText || 'No content available.' }}</pre>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
})
export class ArtifactExplorerComponent implements OnInit, OnDestroy {
  artifacts: ArtifactResponse[] = [];
  selected: ArtifactResponse | null = null;
  filter: string = 'ALL';
  loading = false;
  private objectUrl: string | null = null;

  constructor(
    private readonly artifactsService: ArtifactsService,
    private readonly api: ApiService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  get filteredArtifacts(): ArtifactResponse[] {
    if (this.filter === 'ALL') return this.artifacts;
    const target = this.filter;
    return this.artifacts.filter(a => a.artifactType?.toUpperCase().includes(target));
  }

  ngOnInit(): void {
    this.loadArtifacts();
  }

  loadArtifacts(): void {
    this.loading = true;
    this.artifactsService.getAll().subscribe({
      next: (data) => {
        this.artifacts = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  iconFor(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'VIDEO' || t === 'MEDIA_ASSET') return 'videocam';
    if (t === 'AUDIO' || t === 'VOICE') return 'mic';
    if (t === 'IMAGE' || t === 'THUMBNAIL') return 'image';
    if (t === 'SCRIPT' || t === 'VIDEO_SCRIPT') return 'description';
    if (t === 'BLOG_POST' || t === 'ARTICLE') return 'article';
    return 'description';
  }

  formatDate(iso: string): string {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  contentTypeLabel(contentType?: string): string {
    if (!contentType) return 'N/A';
    return contentType.split('/').pop()?.toUpperCase() || 'N/A';
  }

  isVideo(a: ArtifactResponse): boolean {
    return a.artifactType?.toUpperCase() === 'VIDEO' || (a.contentType || '').toLowerCase().startsWith('video/');
  }

  isAudio(a: ArtifactResponse): boolean {
    return a.artifactType?.toUpperCase() === 'AUDIO' || (a.contentType || '').toLowerCase().startsWith('audio/');
  }

  isImage(a: ArtifactResponse): boolean {
    return ['IMAGE', 'THUMBNAIL', 'MEDIA_ASSET'].includes(a.artifactType?.toUpperCase()) ||
      (a.contentType || '').toLowerCase().startsWith('image/');
  }

  isMedia(a: ArtifactResponse): boolean {
    return this.isVideo(a) || this.isAudio(a) || this.isImage(a);
  }

  fileUrl(artifact: ArtifactResponse): string {
    return `${this.apiBase}/v1/artifacts/${artifact.id}/file`;
  }

  previewUrl(artifact: ArtifactResponse): SafeUrl {
    if (this.objectUrl) {
      return this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
    }
    return this.sanitizer.bypassSecurityTrustUrl(this.fileUrl(artifact));
  }

  openPreview(artifact: ArtifactResponse): void {
    this.selected = artifact;
    this.loadObjectUrl(artifact);
  }

  closePreview(): void {
    this.selected = null;
    this.revokeObjectUrl();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  private loadObjectUrl(artifact: ArtifactResponse): void {
    this.revokeObjectUrl();
    this.api.getBlob(`/v1/artifacts/${artifact.id}/file`)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          if (!this.selected || this.selected.id !== artifact.id) return;
          this.objectUrl = URL.createObjectURL(blob);
        },
        error: () => {}
      });
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  download(artifact: ArtifactResponse): void {
    this.api.getBlob(`/v1/artifacts/${artifact.id}/file`)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.filenameFor(artifact);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        error: () => {}
      });
  }

  private filenameFor(artifact: ArtifactResponse): string {
    const ext = this.extensionFor(artifact.contentType);
    const name = (artifact.name || 'artifact').trim().replace(/[^\w.-]+/g, '-');
    return name.toLowerCase().endsWith('.' + ext) ? name : `${name}.${ext}`;
  }

  private extensionFor(contentType?: string): string {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('video')) return 'mp4';
    if (ct.includes('audio')) return ct.includes('wav') ? 'wav' : 'mp3';
    if (ct.includes('image')) return ct.includes('jpeg') ? 'jpg' : ct.includes('webp') ? 'webp' : 'png';
    if (ct.includes('json')) return 'json';
    if (ct.includes('html')) return 'html';
    if (ct.includes('csv')) return 'csv';
    return 'md';
  }

  private get apiBase(): string {
    return (window as any).__KARMA_API_BASE__ || 'http://127.0.0.1:8080/api';
  }
}
