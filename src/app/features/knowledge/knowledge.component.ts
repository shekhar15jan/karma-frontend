import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeService } from '../../shared/services/knowledge.service';
import { KnowledgePackResponse } from '../../shared/models/knowledge.model';

interface KnowledgeDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'ready' | 'processing';
  uploaded_at: string;
}

interface UploadResult {
  success: boolean;
  id?: string;
  name?: string;
  status?: string;
  message?: string;
}

@Component({
  selector: 'app-knowledge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge.component.html',
  styleUrls: ['./knowledge.component.scss']
})
export class KnowledgeComponent implements OnInit {
  docs: KnowledgeDoc[] = [];
  loading = false;
  uploading = false;
  error: string | null = null;

  constructor(private readonly knowledgeService: KnowledgeService) {}

  ngOnInit(): void {
    this.loadKnowledge();
  }

  loadKnowledge(): void {
    this.loading = true;
    this.error = null;
    this.knowledgeService.getAll().subscribe({
      next: (data) => {
        this.docs = data.map((k: KnowledgePackResponse) => ({
          id: k.id,
          name: k.name,
          type: 'txt',
          size: '1 MB',
          status: 'ready' as const,
          uploaded_at: k.createdAt
        }));
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load knowledge packs.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploading = true;
    this.knowledgeService.uploadFile(file).subscribe({
      next: (result: UploadResult) => {
        this.uploading = false;
        if (result.success) {
          this.docs.unshift({
            id: result.id || '',
            name: result.name || file.name,
            type: file.name.split('.').pop() || 'txt',
            size: this.formatSize(file.size),
            status: 'processing',
            uploaded_at: new Date().toISOString()
          });
        }
        input.value = '';
      },
      error: () => {
        this.uploading = false;
        input.value = '';
      }
    });
  }

  deleteDoc(doc: KnowledgeDoc): void {
    this.knowledgeService.delete(doc.id).subscribe({
      next: () => {
        this.docs = this.docs.filter(d => d.id !== doc.id);
      }
    });
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
