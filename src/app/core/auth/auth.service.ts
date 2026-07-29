import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly tokenKey = 'aurora_token';
  private readonly userKey = 'aurora_user';

  user = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadStoredUser();
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

  login(email: string, password: string) {
    return this.http.post<{ access_token: string; user_id: string; display_name: string }>(
      `${this.apiUrl}/auth/login`,
      { email, password },
    );
  }

  register(email: string, password: string, display_name: string) {
    return this.http.post<{ access_token: string; user_id: string; display_name: string }>(
      `${this.apiUrl}/auth/register`,
      { email, password, display_name },
    );
  }

  handleAuthResponse(res: { access_token: string; user_id: string; display_name: string }): void {
    localStorage.setItem(this.tokenKey, res.access_token);
    const authUser: AuthUser = { id: res.user_id, email: '', display_name: res.display_name };
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
