import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ReviewResponse } from '../models/review.model';
import { PendingStepReviewResponse } from '../models/pending-step-review.model';

export interface ReviewRequest {
  stepId?: string;
  artifactId?: string;
  decision: string;
  comments?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  constructor(private readonly api: ApiService) {}

  getPendingStepReviews(): Observable<PendingStepReviewResponse[]> {
    return this.api.getData<PendingStepReviewResponse[]>('/v1/executions/pending-step-reviews');
  }

  listByStep(stepId: string): Observable<ReviewResponse[]> {
    return this.api.getData<ReviewResponse[]>(`/v1/reviews/step/${stepId}`);
  }

  submit(request: ReviewRequest): Observable<ReviewResponse> {
    return this.api.postData<ReviewResponse>('/v1/reviews', request);
  }
}
