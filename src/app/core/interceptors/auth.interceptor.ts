
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  console.log('[AuthInterceptor] URL:', req.url);
  console.log('[AuthInterceptor] Token available:', !!token);
  console.log('[AuthInterceptor] Token length:', token?.length ?? 0);

  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[AuthInterceptor] Authorization header attached');
  } else {
    console.warn('[AuthInterceptor] No token available for:', req.url);
  }

  console.log('[INTERCEPTOR] Request going to:', authReq.url);

  return next(authReq).pipe(
    tap({
      next: (event) => {
        console.log('[INTERCEPTOR] Response event:', event);
      },
      error: (error) => {
        console.error('[INTERCEPTOR] HTTP ERROR:', error);
      },
    })
  );
};
