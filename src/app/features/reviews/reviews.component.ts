import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import { ArtifactsService } from '../../shared/services/artifacts.service';
import { ReviewsService } from '../../shared/services/reviews.service';
import { ArtifactResponse } from '../../shared/models/artifact.model';
import { PendingStepReviewResponse } from '../../shared/models/pending-step-review.model';

interface VideoDraft {
  id: string;
  title: string;
  duration: string;
  scriptSnippet: string;
  fullContent: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit, OnDestroy {
  drafts: VideoDraft[] = [];
  selectedDraft: VideoDraft | null = null;
  loadingDrafts = false;
  loadingContent = false;

  stepReviews: PendingStepReviewResponse[] = [];
  selectedStep: PendingStepReviewResponse | null = null;
  loadingStepReviews = false;

  feedback = '';
  stepFeedback = '';
  submitting = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly artifactsService: ArtifactsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  ngOnInit(): void {
    this.loadDrafts();
    this.loadStepReviews();
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDrafts(false);
        this.loadStepReviews(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDrafts(showSpinner = true): void {
    if (showSpinner) this.loadingDrafts = true;
    this.artifactsService.getPendingReview().subscribe({
      next: (artifacts) => {
        this.drafts = artifacts.map((a: ArtifactResponse) => ({
          id: String(a.id),
          title: a.name || 'Untitled Artifact',
          duration: '00:30',
          scriptSnippet: a.contentText?.substring(0, 120) || '',
          fullContent: a.contentText || '',
          status: (a.reviewStatus === 'APPROVED' ? 'approved' : a.reviewStatus === 'REJECTED' ? 'rejected' : 'pending_review') as 'pending_review' | 'approved' | 'rejected'
        }));
        if (!this.selectedDraft && this.drafts.length > 0) {
          this.selectedDraft = this.drafts[0];
        } else if (this.selectedDraft) {
          const match = this.drafts.find(d => d.id === this.selectedDraft!.id);
          this.selectedDraft = match ?? (this.drafts.length > 0 ? this.drafts[0] : null);
        }
        this.loadingDrafts = false;
      },
      error: () => {
        this.loadingDrafts = false;
      }
    });
  }

  loadStepReviews(showSpinner = true): void {
    if (showSpinner) this.loadingStepReviews = true;
    this.reviewsService.getPendingStepReviews().subscribe({
      next: (steps) => {
        this.stepReviews = steps;
        if (this.selectedStep) {
          const match = steps.find(s => s.stepId === this.selectedStep!.stepId);
          this.selectedStep = match ?? (steps.length > 0 ? steps[0] : null);
        } else if (steps.length > 0) {
          this.selectedStep = steps[0];
        }
        this.loadingStepReviews = false;
      },
      error: () => {
        this.loadingStepReviews = false;
      }
    });
  }

  selectDraft(draft: VideoDraft): void {
    this.selectedDraft = draft;
    if (!draft.fullContent) {
      this.loadingContent = true;
      this.artifactsService.getById(draft.id).subscribe({
        next: (a) => {
          draft.fullContent = a.contentText || '';
          this.loadingContent = false;
        },
        error: () => {
          this.loadingContent = false;
        }
      });
    }
  }

  selectStep(step: PendingStepReviewResponse): void {
    this.selectedStep = step;
    this.stepFeedback = '';
  }

  approveDraft(draft: VideoDraft): void {
    draft.status = 'approved';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
    this.artifactsService.updateReviewStatus(draft.id, 'APPROVED').subscribe();
  }

  rejectDraft(draft: VideoDraft): void {
    draft.status = 'rejected';
    this.drafts = this.drafts.map(d => d.id === draft.id ? { ...draft } : d);
    this.reviewsService.submit({
      artifactId: draft.id,
      decision: 'REJECTED',
      comments: this.feedback
    }).subscribe(() => {
      this.feedback = '';
    });
  }

  approveStep(step: PendingStepReviewResponse): void {
    this.submitting = true;
    this.reviewsService.submit({ stepId: step.stepId, decision: 'APPROVED' }).subscribe({
      next: () => {
        this.submitting = false;
        this.removeStep(step);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  rejectStep(step: PendingStepReviewResponse): void {
    this.submitting = true;
    this.reviewsService.submit({
      stepId: step.stepId,
      decision: 'REJECTED',
      comments: this.stepFeedback
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.stepFeedback = '';
        this.removeStep(step);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  private removeStep(step: PendingStepReviewResponse): void {
    this.stepReviews = this.stepReviews.filter(s => s.stepId !== step.stepId);
    this.selectedStep = this.stepReviews.length > 0 ? this.stepReviews[0] : null;
  }

  stepTypeLabel(type: string): string {
    switch (type) {
      case 'LLM_CALL': return 'LLM Call';
      case 'IMAGE_GENERATION': return 'Image Generation';
      case 'TTS': return 'Voiceover';
      case 'VIDEO_GENERATION': return 'Video Assembly';
      case 'PUBLISH': return 'Publish';
      default: return type || 'Unknown';
    }
  }
}
