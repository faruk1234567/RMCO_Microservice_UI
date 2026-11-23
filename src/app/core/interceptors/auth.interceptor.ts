import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // MunicipalityId - AuthService থেকে, না পাইলে dms_user থেকে
  let mid: any = null;
  try {
    mid = (auth as any).getMunicipalityId ? (auth as any).getMunicipalityId() : null;
  } catch { mid = null; }
  if (!mid) {
    try {
      const u = JSON.parse(localStorage.getItem('dms_user') || '{}');
      mid = u.municipalityId || u.municipality_id || null;
    } catch { mid = null; }
  }

  console.log('[AuthInterceptor] URL:', req.url);
  console.log('[AuthInterceptor] Token available:', !!token);
  console.log('[AuthInterceptor] MunicipalityId:', mid);

  let authReq = req;
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (mid) headers['X-Municipality-Id'] = String(mid);

  if (Object.keys(headers).length > 0) {
    authReq = req.clone({ setHeaders: headers });
    console.log('[AuthInterceptor] Headers attached:', headers);
  } else {
    console.warn('[AuthInterceptor] No token/municipality for:', req.url);
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