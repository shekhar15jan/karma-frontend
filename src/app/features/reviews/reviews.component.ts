import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../shared/services/api.service';
import { ArtifactsService } from '../../shared/services/artifacts.service';
import { ArtifactResponse } from '../../shared/models/artifact.model';

interface VideoDraft {
  id: string;
  title: string;
  duration: string;
  scriptSnippet: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
  drafts: VideoDraft[] = [];
  selectedDraft: VideoDraft | null = null;
  loading = false;

  constructor(
    private readonly api: ApiService,
    private readonly artifactsService: ArtifactsService,
  ) {}

  ngOnInit(): void {
    this.loadDrafts();
  }

  loadDrafts(): void {
    this.loading = true;
    this.artifactsService.getPendingReview().subscribe({
      next: (artifacts) => {
        this.drafts = artifacts.map((a: ArtifactResponse) => ({
          id: String(a.id),
          title: a.name || 'Untitled Artifact',
          duration: '00:30',
          scriptSnippet: a.contentText?.substring(0, 120) || '',
          status: (a.reviewStatus === 'APPROVED' ? 'approved' : a.reviewStatus === 'REJECTED' ? 'rejected' : 'pending_review') as 'pending_review' | 'approved' | 'rejected'
        }));
        this.selectedDraft = this.drafts.length > 0 ? this.drafts[0] : null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectDraft(draft: VideoDraft): void {
    this.selectedDraft = draft;
  }

  approveDraft(draft: VideoDraft): void {
    draft.status = 'approved';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
  }

  rejectDraft(draft: VideoDraft): void {
    draft.status = 'rejected';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
  }
}
