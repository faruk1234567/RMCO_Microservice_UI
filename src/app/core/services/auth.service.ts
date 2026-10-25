
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AppUser,
  LoginRequest,
  LoginResponse,
  Municipality,
} from '../models/user.model';

const TOKEN_KEY = 'dms_access_token';
const USER_KEY = 'dms_user';
const LANG_KEY = 'dms_lang';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.identityUrl;

  private currentUserSignal = signal<AppUser | null>(this.loadUser());
  private tokenSignal = signal<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );

  readonly currentUser = this.currentUserSignal.asReadonly();

  readonly isLoggedIn = computed(
    () => !!this.tokenSignal() && !!this.currentUserSignal()
  );

  readonly formLanguage = computed<'BN' | 'EN'>(() => {
    const user = this.currentUserSignal();
    return (
      user?.formLanguage ||
      localStorage.getItem(LANG_KEY) ||
      'BN'
    ) as 'BN' | 'EN';
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private loadUser(): AppUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  // ─── Auth ───────────────────────────────────────────────

  /** POST /auth/login */
  login(req: { loginId: string; password: string }): Observable<any> {
    return this.http
      .post<any>(`${this.base}/auth/login`, {
        identifier: req.loginId,
        password: req.password,
      })
      .pipe(
        tap((res) => this.handleLoginResponse(res)),
        catchError((err) => throwError(() => err))
      );
  }

  /** POST /auth/login/select-municipality */
  selectMunicipality(payload: {
    loginToken: string;
    municipalityId: string;
  }): Observable<any> {
    return this.http
      .post<any>(
        `${this.base}/auth/login/select-municipality`,
        payload
      )
      .pipe(
       tap((res) => {
  const data = res?.data ?? res;

  console.log('FULL PLATFORM LOGIN RESPONSE:', res);
  console.log('RESPONSE DATA:', data);
  console.log('ROLES:', data?.roles);
  console.log('ROLE NAMES:', data?.roleNames);

  this.handleLoginResponse(res);

  console.log('SAVED USER:', this.currentUserSignal());
  console.log(
    'IS PLATFORM ADMIN:',
    this.hasRole('PLATFORM_ADMIN')
  );
}),
        catchError((err) => throwError(() => err))
      );
  }

  /** POST /platform/auth/login */

platformLogin(req: {
  loginId: string;
  password: string;
  deviceLabel?: string;
}): Observable<any> {
  const body = {
    identifier: req.loginId,
    password: req.password,
    deviceLabel: req.deviceLabel || 'web',
  };

  console.log('PLATFORM LOGIN URL:', `${this.base}/platform/auth/login`);

  return this.http
    .post<any>(`${this.base}/platform/auth/login`, body)
    .pipe(
     tap((res) => {
  console.log('PLATFORM LOGIN FULL RESPONSE:', res);

  const data = res?.data ?? res;

  console.log('PLATFORM LOGIN DATA:', data);
  console.log('RAW RESPONSE:', JSON.stringify(res, null, 2));
  console.log('DATA ROLES:', data?.roles);
  console.log('DATA KEYS:', Object.keys(data ?? {}));

  this.handleLoginResponse(res);

  console.log(
    'USER AFTER HANDLE:',
    this.currentUserSignal()
  );

  console.log(
    'SAVED ROLES:',
    this.currentUserSignal()?.roles
  );
}),
      catchError((err) => {
        console.error('PLATFORM LOGIN ERROR:', err);
        return throwError(() => err);
      })
    );
}

 
private handleLoginResponse(res: any): void {
  console.log('FULL RES JSON:', JSON.stringify(res, null, 2));
console.log('RES TYPE:', typeof res);
console.log('RES KEYS:', Object.keys(res ?? {}));
  const data = res?.data ?? res;

  const token =
    data?.accessToken ??
    data?.access_token ??
    data?.token ??
    res?.accessToken ??
    res?.access_token ??
    res?.token;

  const id = data?.userId ?? data?.user_id ?? data?.id;

  const rolesRaw = data?.roles ?? data?.roleNames ?? [];

  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw.map((role: any) =>
        typeof role === 'string'
          ? role
          : role?.code ?? role?.name ?? String(role)
      )
    : typeof rolesRaw === 'string'
      ? [rolesRaw]
      : [];

  if (!token || !id) {
    console.error('Login response missing token or user ID:', {
      hasToken: !!token,
      hasUserId: !!id,
      roles
    });
    return;
  }

  const mapped: AppUser = {
    id: String(id),
    municipalityId: data?.municipalityId ?? null,
    mobileNormalized: data?.mobile ?? '',
    emailNormalized: data?.email ?? '',
    nameBn: data?.nameBn ?? 'Admin',
    nameEn: data?.nameEn ?? 'Admin',
    status: data?.status ?? 'ACTIVE',
    roles,
    formLanguage: 'BN',
  };

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(mapped));

  this.tokenSignal.set(token);
  this.currentUserSignal.set(mapped);

  console.log('Saved login roles:', mapped.roles);
}
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);

    this.router.navigate(['/login']);
  }

  // ─── Registration: Global Citizen ───────────────────────

  /** POST /register/check-mobile */
  checkMobileDuplicate(mobile: string): Observable<any> {
    return this.http.post<any>(
      `${this.base}/register/check-mobile`,
      { mobile }
    );
  }

  /** POST /register/send-otp */
  requestOtp(
    mobile: string,
    purpose = 'REGISTRATION'
  ): Observable<any> {
    return this.http.post<any>(
      `${this.base}/register/send-otp`,
      {
        mobile,
        purpose,
        language: 'BN',
      }
    );
  }

  /** POST /register/verify-otp */
  verifyOtp(
    mobile: string,
    otp: string,
    purpose = 'REGISTRATION'
  ): Observable<any> {
    return this.http.post<any>(
      `${this.base}/register/verify-otp`,
      {
        mobile,
        otp,
        purpose,
      }
    );
  }

  /** POST /register/complete */
  register(payload: {
    mobile: string;
    registrationToken: string;
    password: string;
    confirmPassword: string;
    policyAccepted: boolean;
    nameBn: string;
    nameEn?: string;
    email?: string;
    [key: string]: any;
  }): Observable<any> {
    // Citizen registration intentionally does not send municipalityId.
    return this.http.post<any>(
      `${this.base}/register/complete`,
      payload
    );
  }

  // ─── Forgot Password ────────────────────────────────────

  /** POST /auth/forgot/send-otp */
  forgotSendOtp(
    mobile: string,
    municipalityId?: string
  ): Observable<any> {
    const payload: any = { mobile };

    if (municipalityId) {
      payload.municipalityId = Number(municipalityId);
    }

    return this.http.post<any>(
      `${this.base}/auth/forgot/send-otp`,
      payload
    );
  }

  /** POST /auth/forgot/reset */
  forgotReset(payload: {
    municipalityId?: string;
    mobile: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.base}/auth/forgot/reset`,
      payload
    );
  }

  // ─── Lookups ────────────────────────────────────────────

  /** GET /lookups/{category} */
  getLookup(category: string): Observable<any> {
    return this.http.get<any>(
      `${this.base}/lookups/${category}`
    );
  }

  /** GET /lookups/{category}/children?parentId= */
  getLookupChildren(
    category: string,
    parentId: string
  ): Observable<any> {
    const params = new HttpParams().set('parentId', parentId);

    return this.http.get<any>(
      `${this.base}/lookups/${category}/children`,
      { params }
    );
  }

  /** GET /lookups/designations */
  getDesignations(): Observable<any> {
    return this.http.get<any>(
      `${this.base}/lookups/designations`
    );
  }

  // ─── Users ──────────────────────────────────────────────

  /** GET /users/{id}/profile */
  getUserProfile(id: string): Observable<any> {
    return this.http.get<any>(
      `${this.base}/users/${id}/profile`
    );
  }

  /** GET /users/search?q= */
  searchUsers(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);

    return this.http.get<any>(
      `${this.base}/users/search`,
      { params }
    );
  }

  // ─── Roles / Admin ─────────────────────────────────────

  /** GET /admin/roles */
  getRoles(): Observable<any> {
    return this.http.get<any>(
      `${this.base}/admin/roles`
    );
  }
  getMunicipalitiesForRegistration(): Observable<any> {
  return this.http.get<any>(
    `${this.base}/public/municipalities`
  );
}

  hasRole(role: string): boolean {
  const roles = this.currentUserSignal()?.roles ?? [];

  return roles.some(
    (item) => item?.trim().toUpperCase() === role.trim().toUpperCase()
  );
}

  hasAnyRole(...roles: string[]): boolean {
    const userRoles = this.currentUserSignal()?.roles || [];
    return roles.some((role) => userRoles.includes(role));
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserSignal();
    const permissions = (user as any)?.permissions || [];

    return permissions.includes(permission);
  }

  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((permission) =>
      this.hasPermission(permission)
    );
  }
}
