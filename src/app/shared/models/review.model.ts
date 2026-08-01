export interface ReviewResponse {
  id: string;
  artifactId: string;
  stepId: string;
  reviewerId: string;
  decision: string;
  comments: string;
  versionAtReview: number;
  createdAt: string;
}

export interface PublicationResponse {
  id: string;
  artifactId: string;
  destination: string;
  status: string;
  url: string;
  createdAt: string;
}
