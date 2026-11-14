import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser } from '../models/user.model';

const TOKEN_KEY = 'dms_access_token';
const USER_KEY = 'dms_user';
const LANG_KEY = 'dms_lang';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.identityUrl;

  private currentUserSignal = signal<AppUser | null>(this.loadUser());
  private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));

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

  constructor(private http: HttpClient, private router: Router) {}

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
      .post<any>(`${this.base}/auth/login/select-municipality`, payload)
      .pipe(
        tap((res) => this.handleLoginResponse(res)),
        catchError((err) => throwError(() => err))
      );
  }

  /**
   * POST /auth/context/municipality
   * Switch Global Citizen to a Municipality Context.
   */
  selectMunicipalityContext(municipalityId: number): Observable<any> {
    return this.http
      .post<any>(`${this.base}/auth/context/municipality`, { municipalityId })
      .pipe(
        tap((res) => {
          const data = res?.data ?? res;

          const token =
            data?.accessToken ?? data?.access_token ?? data?.token;

          if (!token) {
            throw new Error('Municipality context token not found');
          }

          const currentUser = this.currentUserSignal();
          if (!currentUser) {
            throw new Error('Current user not found');
          }

          // নতুন token-এ permission এলে সেটা নেবে, না এলে আগেরটা রাখবে
          const newPerms = this.extractPermissions(data);

          const updatedUser: AppUser = {
            ...currentUser,
            municipalityId: data?.municipalityId ?? municipalityId,
            nameBn: data?.nameBn ?? currentUser.nameBn,
            nameEn: data?.nameEn ?? currentUser.nameEn,
            permissions: newPerms.length
              ? newPerms
              : currentUser.permissions ?? [],
          };

          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

          this.tokenSignal.set(token);
          this.currentUserSignal.set(updatedUser);
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

    return this.http
      .post<any>(`${this.base}/platform/auth/login`, body)
      .pipe(
        tap((res) => this.handleLoginResponse(res)),
        catchError((err) => {
          console.error('PLATFORM LOGIN ERROR:', err);
          return throwError(() => err);
        })
      );
  }

  // ─── Login response helpers ─────────────────────────────

  /** রেসপন্স থেকে permission code-এর তালিকা বের করে */
  private extractPermissions(data: any): string[] {
    const raw =
      data?.permissions ?? data?.permissionCodes ?? data?.authorities ?? [];

    if (!Array.isArray(raw)) return [];

    return raw
      .map((p: any) =>
        typeof p === 'string' ? p : p?.code ?? p?.permissionCode ?? ''
      )
      .filter((c: string) => !!c && !c.startsWith('ROLE_'));
  }

  private handleLoginResponse(res: any): void {
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

    const permissions = this.extractPermissions(data);

    if (!token || !id) {
      console.error('Login response missing token or user ID:', {
        hasToken: !!token,
        hasUserId: !!id,
        roles,
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
      permissions,
      formLanguage: 'BN',
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(mapped));

    this.tokenSignal.set(token);
    this.currentUserSignal.set(mapped);

    // ডিবাগ: লগইনের পর কয়টা role ও permission এলো
    console.log('LOGIN OK → roles:', roles, '| permissions count:', permissions.length);
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
    return this.http.post<any>(`${this.base}/register/check-mobile`, { mobile });
  }

  // ─── PATCHED: OTP Purpose Forward — COMMITTEE_MEMBER fix ───
  // আগে: purpose Parameter টা ঠিকমতো যাইতো, কিন্তু case-sensitive ছিল।
  // এখন: trim + UPPERCASE করে পাঠাই — 'committee_member' আসলেও Backend 'COMMITTEE_MEMBER' পাবে।
  // Hardcoded REGISTRATION নাই — যেই Purpose আসবে ওইটাই যাবে।
  // Committee Form থেকে 'COMMITTEE_MEMBER' আসলে ওইটাই যাবে, REGISTRATION যাবে না।
  private normalizePurpose(purpose?: string): string {
    const p = (purpose || 'REGISTRATION').trim().toUpperCase();
    return p || 'REGISTRATION';
  }

  /** POST /register/send-otp */
  requestOtp(mobile: string, purpose = 'REGISTRATION'): Observable<any> {
    const normalized = this.normalizePurpose(purpose);
    // Debug: Network → Payload এ purpose কী যাইতেছে, Console এ দেখা যাবে
    console.log('[AuthService] send-otp →', { mobile, purpose: normalized });
    return this.http.post<any>(`${this.base}/register/send-otp`, {
      mobile,
      purpose: normalized,
      language: 'BN',
    });
  }

  /** POST /register/verify-otp */
  verifyOtp(
    mobile: string,
    otp: string,
    purpose = 'REGISTRATION'
  ): Observable<any> {
    const normalized = this.normalizePurpose(purpose);
    console.log('[AuthService] verify-otp →', { mobile, purpose: normalized });
    return this.http.post<any>(`${this.base}/register/verify-otp`, {
      mobile,
      otp,
      purpose: normalized,
    });
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
    return this.http.post<any>(`${this.base}/register/complete`, payload);
  }

  // ─── Forgot Password ────────────────────────────────────

  /** POST /auth/forgot/send-otp */
  forgotSendOtp(mobile: string, municipalityId?: string): Observable<any> {
    const payload: any = { mobile };

    if (municipalityId) {
      payload.municipalityId = Number(municipalityId);
    }

    return this.http.post<any>(`${this.base}/auth/forgot/send-otp`, payload);
  }

  /** POST /auth/forgot/reset */
  forgotReset(payload: {
    municipalityId?: string;
    mobile: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/auth/forgot/reset`, payload);
  }

  // ─── Lookups ────────────────────────────────────────────

  /** GET /lookups/{category} */
  getLookup(category: string): Observable<any> {
    return this.http.get<any>(`${this.base}/lookups/${category}`);
  }

  /** GET /lookups/{category}/children?parentId= */
  getLookupChildren(category: string, parentId: string): Observable<any> {
    const params = new HttpParams().set('parentId', parentId);
    return this.http.get<any>(`${this.base}/lookups/${category}/children`, {
      params,
    });
  }

  /** GET /lookups/designations */
  getDesignations(): Observable<any> {
  return this.http.get<any>(`${this.base}/lookups/DESIGNATION`);
}
  // ─── Users ──────────────────────────────────────────────

  /** GET /users/{id}/profile */
  getUserProfile(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/users/${id}/profile`);
  }

  /** GET /users/search?q= */
  searchUsers(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get<any>(`${this.base}/users/search`, { params });
  }

  // ─── Roles / Admin ─────────────────────────────────────

  /** GET /admin/roles */
  getRoles(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/roles`);
  }

  getMunicipalitiesForRegistration(): Observable<any> {
    return this.http.get<any>(`${this.base}/public/municipalities`);
  }

  createCitizen(payload: any): Observable<any> {
    return this.http.post(`${this.base}/users/citizens`, payload);
  }

  // ─── Role & Permission checks ──────────────────────────

  hasRole(role: string): boolean {
    const roles = this.currentUserSignal()?.roles ?? [];
    return roles.some(
      (item) => item?.trim().toUpperCase() === role.trim().toUpperCase()
    );
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  hasPermission(permission: string): boolean {
    const permissions = this.currentUserSignal()?.permissions ?? [];
    return permissions.includes(permission);
  }

  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }
}
