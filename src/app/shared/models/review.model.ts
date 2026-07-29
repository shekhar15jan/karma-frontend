export interface ReviewResponse {
  id: number;
  artifactId: number;
  reviewerId: string;
  decision: string;
  comments: string;
  versionAtReview: number;
  createdAt: string;
}

export interface PublicationResponse {
  id: number;
  artifactId: number;
  destination: string;
  status: string;
  url: string;
  createdAt: string;
}
