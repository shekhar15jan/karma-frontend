export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: ErrorDetail;
}

export interface ErrorDetail {
  code: number;
  message: string;
  details?: unknown;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
