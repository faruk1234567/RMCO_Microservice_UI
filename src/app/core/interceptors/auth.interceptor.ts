
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  console.log('[AuthInterceptor] URL:', req.url);
  console.log('[AuthInterceptor] Token available:', !!token);
  console.log('[AuthInterceptor] Token length:', token?.length ?? 0);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[AuthInterceptor] Authorization header attached');
  } else {
    console.warn('[AuthInterceptor] No token available for:', req.url);
  }

  return next(req);
};
