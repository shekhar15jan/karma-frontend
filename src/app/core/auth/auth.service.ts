import { Injectable, signal, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response';
import { ApiService } from '../../shared/services/api.service';

export interface StreamTokenResponse {
  token: string;
  expiresIn: number;
}

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
  private cachedStreamToken: { token: string; expiresAt: number } | null = null;
  private streamTokenInFlight: Observable<StreamTokenResponse> | null = null;

  user = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);
  sessionExpired = signal(false);

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

  /**
   * Short-lived (15 min), purpose-scoped token for URLs that can't carry an Authorization
   * header (SSE, review media playback). Never the long-lived session access token, so a
   * URL leaked via server logs, browser history, or a proxy exposes only a narrow window.
   * Cached until ~80% of its lifetime elapses, then transparently refetched.
   */
  ensureStreamToken(): Observable<string> {
    const now = Date.now();
    if (this.cachedStreamToken && this.cachedStreamToken.expiresAt > now) {
      return of(this.cachedStreamToken.token);
    }
    if (!this.streamTokenInFlight) {
      this.streamTokenInFlight = this.api.getData<StreamTokenResponse>('/v1/auth/stream-token').pipe(
        tap((res) => {
          this.cachedStreamToken = { token: res.token, expiresAt: now + res.expiresIn * 1000 * 0.8 };
        }),
        finalize(() => {
          this.streamTokenInFlight = null;
        }),
        shareReplay(1),
      );
    }
    return this.streamTokenInFlight.pipe(map((res) => res.token));
  }

  /** Synchronous read of whatever stream token is cached (may be empty if none fetched yet). */
  getCachedStreamToken(): string {
    return this.cachedStreamToken?.token ?? '';
  }

  private applyAuth(res: AuthLoginResponse, navigate: boolean): void {
    this.sessionExpired.set(false);
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

  logout(sessionExpired = false): void {
    if (sessionExpired) {
      this.sessionExpired.set(true);
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.refreshInFlight = null;
    this.cachedStreamToken = null;
    this.streamTokenInFlight = null;
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
