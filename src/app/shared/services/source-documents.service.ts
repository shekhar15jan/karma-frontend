import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface SourceDocumentResponse {
  id: string;
  missionId: string;
  filename: string;
  format: string;
  content: string;
  createdAt: string;
}

export interface UploadSourceDocumentRequest {
  missionId: string;
  filename: string;
  format: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class SourceDocumentsService {
  constructor(private readonly api: ApiService) {}

  upload(req: UploadSourceDocumentRequest): Observable<SourceDocumentResponse> {
    return this.api.postData<SourceDocumentResponse>('/v1/source-documents', req);
  }
}
