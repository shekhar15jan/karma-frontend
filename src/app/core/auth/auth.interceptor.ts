import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const RETRY_FLAG = 'x-auth-refreshed';
const AUTH_PATHS = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/dev-bypass', '/v1/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = AUTH_PATHS.some((p) => req.url.includes(p));
      if (isAuthEndpoint) {
        return throwError(() => error);
      }

      if (error.status === 401 || error.status === 403) {
        // 403 with a business error code (e.g. 4301 workspace limit) is not an auth failure.
        const body = error.error as { code?: number } | undefined;
        const isBusinessForbidden = error.status === 403 && body && body.code !== undefined && body.code !== 4003;
        if (isBusinessForbidden) {
          return throwError(() => error);
        }

        if (req.headers.has(RETRY_FLAG) || !auth.getRefreshToken()) {
          auth.logout(true);
          return throwError(() => error);
        }

        return auth.refreshTokens().pipe(
          switchMap((res) => {
            const retry = req.clone({
              setHeaders: {
                [RETRY_FLAG]: 'true',
                Authorization: `Bearer ${res.accessToken}`,
              },
            });
            return next(retry);
          }),
          catchError((refreshError) => {
            auth.logout(true);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
