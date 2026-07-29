import { Injectable, signal, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../shared/services/api.service';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
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
  private readonly tokenKey = 'aurora_token';
  private readonly userKey = 'aurora_user';

  user = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  constructor(
    private injector: Injector,
    private router: Router,
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

  login(email: string, password: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/login', { email, password });
  }

  register(email: string, password: string, displayName: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/register', { email, password, displayName });
  }

  devBypass(email: string, password: string): Observable<AuthLoginResponse> {
    return this.api.postData<AuthLoginResponse>('/v1/auth/dev-bypass', { email, password });
  }

  handleAuthResponse(res: AuthLoginResponse): void {
    localStorage.setItem(this.tokenKey, res.accessToken);
    const authUser: AuthUser = { id: res.userId, email: res.email, displayName: res.displayName };
    localStorage.setItem(this.userKey, JSON.stringify(authUser));
    this.user.set(authUser);
    this.isAuthenticated.set(true);
    this.router.navigate(['/']);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.user.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
