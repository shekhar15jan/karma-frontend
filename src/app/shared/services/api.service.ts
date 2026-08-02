import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      h = h.set('Authorization', `Bearer ${token}`);
    }
    return h;
  }

  get<T>(path: string) {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { headers: this.headers() });
  }

  getData<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { headers: this.headers(), params })
      .pipe(map(res => res.data));
  }

  getBlob(path: string): Observable<Blob> {
    const token = this.auth.getToken();
    let h = new HttpHeaders();
    if (token) {
      h = h.set('Authorization', `Bearer ${token}`);
    }
    return this.http.get(`${this.baseUrl}${path}`, { headers: h, responseType: 'blob' });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers: this.headers() });
  }

  postData<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers: this.headers() })
      .pipe(map(res => res.data));
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers: this.headers() });
  }

  putData<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers: this.headers() })
      .pipe(map(res => res.data));
  }

  patch<T = void>(path: string, body: unknown) {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body, { headers: this.headers() });
  }

  delete<T>(path: string) {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`, { headers: this.headers() });
  }

  deleteData<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`, { headers: this.headers() })
      .pipe(map(res => res.data));
  }

  upload<T>(path: string, formData: FormData): Observable<ApiResponse<T>> {
    const token = this.auth.getToken();
    let h = new HttpHeaders();
    if (token) {
      h = h.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData, { headers: h });
  }
}
