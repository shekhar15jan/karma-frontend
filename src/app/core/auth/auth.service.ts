import { Injectable, signal, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response';
import { ApiService } from '../../shared/services/api.service';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role?: string;
}

export interface AuthLoginResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'karma_token';
  private readonly userKey = 'karma_user';
  private readonly refreshTokenKey = 'karma_refresh';
  private refreshInFlight: Observable<AuthLoginResponse> | null = null;

  user = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  constructor(
    private injector: Injector,
    private router: Router,
    private http: HttpClient,
  ) {
    this.loadStoredUser();
  }

  private get api(): ApiService {
    return this.injector.get(ApiService);
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userJson = localStorage.getItem(this.userKey);
    if (token && userJson) {
      this.user.set(JSON.parse(userJson));
      this.isAuthenticated.set(true);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getTokenExpiryMs(token: string): number {
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return json.exp ? json.exp * 1000 : 0;
    } catch {
      return 0;
    }
  }

  isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiryMs(token);
    return exp > 0 && exp <= Date.now();
  }

  refreshTokens(): Observable<AuthLoginResponse> {
    if (!this.refreshInFlight) {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return throwError(() => new Error('No refresh token available'));
      }
      this.refreshInFlight = this.http
        .post<ApiResponse<AuthLoginResponse>>(
          `${environment.apiUrl}/v1/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )
        .pipe(
          map((res) => res.data),
          tap((res) => this.applyAuth(res, false)),
          finalize(() => {
            this.refreshInFlight = null;
          }),
        );
    }
    return this.refreshInFlight;
  }

  login(email: string, password: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/login', { email, password });
  }

  register(email: string, password: string, displayName: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/register', { email, password, displayName });
  }

  devBypass(email: string, password: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/dev-bypass', { email, password });
  }

  private applyAuth(res: AuthLoginResponse, navigate: boolean): void {
    localStorage.setItem(this.tokenKey, res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, res.refreshToken);
    }
    const authUser: AuthUser = { id: res.userId, email: res.email, displayName: res.displayName, role: res.role };
    localStorage.setItem(this.userKey, JSON.stringify(authUser));
    this.user.set(authUser);
    this.isAuthenticated.set(true);
    if (navigate) {
      this.router.navigate(['/']);
    }
  }

  handleAuthResponse(res: AuthLoginResponse): void {
    this.applyAuth(res, true);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.refreshInFlight = null;
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
