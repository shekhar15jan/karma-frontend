import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly api: ApiService) {}

  register(data: { email: string; password: string; displayName: string }) {
    return this.api.postData<AuthResponse>('/v1/auth/register', data);
  }

  login(data: { email: string; password: string }) {
    return this.api.postData<AuthResponse>('/v1/auth/login', data);
  }

  refresh(refreshToken: string) {
    return this.api.postData<AuthResponse>('/v1/auth/refresh', { refreshToken });
  }
}
