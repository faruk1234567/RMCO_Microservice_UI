import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, OperatorFunction, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type Row = Record<string, any>;

function unwrap<T>(): OperatorFunction<any, T> {
  return map((r: any) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? r.data : r) as T);
}

/** C, D, E, F সেকশনের (Committee / Workflow / Document / Audit service) সব API call এক জায়গায় */
@Injectable({ providedIn: 'root' })
export class EngineApiService {
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private get auth(): AuthService | null {
    try { return this.injector.get(AuthService); } catch { return null; }
  }
  private committeeApi = (p: string) => `${environment.committeeUrl}${p}`;
  private workflowApi = (p: string) => `${environment.workflowUrl}${p}`;
  private documentApi = (p: string) => `${environment.documentUrl}${p}`;
  private auditApi = (p: string) => `${environment.auditUrl}${p}`;

  // ---------------- Committee service ----------------
  listCommittees(status?: string): Observable<Row[]> {
    let p = new HttpParams(); if (status) p = p.set('status', status);
    return this.http.get(this.committeeApi('/committees'), { params: p }).pipe(unwrap());
  }
  getCommittee(id: string): Observable<Row> { return this.http.get(this.committeeApi(`/committees/${id}`)).pipe(unwrap()); }
  createDraft(body: {
    typeVersionId: string;
    payload: {
      code: string;
      nameBn: string;
      nameEn?: string;
      scopeNodeId: string | null;
      termStart: string;
      termEnd: string;
      dynamicValues: Record<string, any>;
      members: any[];
      documents: any[];
    };
  }): Observable<any> {
    return this.http.post(this.committeeApi('/committees/drafts'), body).pipe(unwrap());
  }
  updateDraft(id: string, payload: Row): Observable<Row> { return this.http.put(this.committeeApi(`/committees/drafts/${id}`), payload).pipe(unwrap()); }
  submitDraft(id: string): Observable<Row> { return this.http.post(this.committeeApi(`/committees/drafts/${id}/submit`), {}).pipe(unwrap()); }

  // ---------------- Workflow service ----------------
  myPending(): Observable<Row[]> { return this.http.get(this.workflowApi('/workflow/my-pending')).pipe(unwrap()); }
  decide(requestId: string, body: { decision: 'APPROVED' | 'REJECTED'; comment?: string }): Observable<Row> {
    return this.http.post(this.workflowApi(`/workflow/requests/${requestId}/decide`), body).pipe(unwrap());
  }
  getApprovalDetailByCommittee(committeeId: string) {
    return this.http.get<any>(this.workflowApi(`/workflow/approvals/by-committee/${committeeId}/detail`));
  }

  // ---------------- Auth Context — Login করা User থেকে নিবে ----------------
  private readStorage(key: string): string {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
  }

  private decodeToken(tokenRaw: string): { municipalityId: string; userId: string } {
    const token = String(tokenRaw || '').replace(/^Bearer\s+/i, '').trim();
    if (!token || token.split('.').length !== 3) return { municipalityId: '', userId: '' };
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)));
      return {
        municipalityId: String(payload.municipalityId ?? payload.municipality_id ?? payload.municipality ?? ''),
        userId: String(payload.userId ?? payload.user_id ?? payload.sub ?? payload.actorId ?? payload.id ?? ''),
      };
    } catch { return { municipalityId: '', userId: '' }; }
  }

  private authContext(): { municipalityId: string; uploadedBy: string } {
    // ১. Login করা User — AuthService থেকে
    const a: any = this.auth;
    if (a) {
      const user =
        (typeof a.currentUser === 'function' ? a.currentUser() : a.currentUser?.value ?? a.currentUser) ??
        (typeof a.user === 'function' ? a.user() : a.user?.value ?? a.user) ??
        (typeof a.getUser === 'function' ? a.getUser() : null) ??
        (typeof a.getCurrentUser === 'function' ? a.getCurrentUser() : null) ??
        a.userValue ?? a.currentUserValue ?? null;

      let municipalityId = String(
        (typeof a.getMunicipalityId === 'function' ? a.getMunicipalityId() : null) ??
        a.municipalityId ?? a.municipality_id ??
        user?.municipalityId ?? user?.municipality_id ?? user?.municipality ?? ''
      );
      let userId = String(
        (typeof a.getUserId === 'function' ? a.getUserId() : null) ??
        a.userId ?? a.user_id ??
        user?.id ?? user?.userId ?? user?.user_id ?? user?.actorId ?? user?.sub ?? ''
      );

      if (municipalityId && userId) return { municipalityId, uploadedBy: userId };

      // AuthService এর Token থেকে
      const token = (typeof a.getToken === 'function' ? a.getToken() : null) ?? a.token ?? a.accessToken ?? '';
      if (token) {
        const p = this.decodeToken(token);
        if (p.municipalityId) municipalityId = p.municipalityId;
        if (p.userId) userId = p.userId;
        if (municipalityId && userId) return { municipalityId, uploadedBy: userId };
      }
      if (municipalityId || userId) return { municipalityId, uploadedBy: userId };
    }

    // ২. Fallback — Storage (AuthService এ না পাইলে)
    let municipalityId =
      this.readStorage('municipalityId') ||
      this.readStorage('municipality_id') ||
      this.readStorage('municipality') || '';
    let userId =
      this.readStorage('userId') ||
      this.readStorage('user_id') ||
      this.readStorage('actorId') ||
      this.readStorage('actor_id') || '';
    if (municipalityId && userId) return { municipalityId, uploadedBy: userId };

    for (const key of ['user', 'currentUser', 'auth', 'profile', 'loginResponse']) {
      const raw = this.readStorage(key);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        const u = obj?.['user'] ?? obj?.['data'] ?? obj;
        const m = u?.['municipalityId'] ?? u?.['municipality_id'] ?? u?.['municipality'] ?? obj?.['municipalityId'] ?? '';
        const id = u?.['id'] ?? u?.['userId'] ?? u?.['user_id'] ?? u?.['actorId'] ?? obj?.['userId'] ?? '';
        if (m) municipalityId = String(m);
        if (id) userId = String(id);
        if (municipalityId && userId) return { municipalityId, uploadedBy: userId };
      } catch { /* JSON না হইলে পরের Key */ }
    }

    const tokenRaw =
      this.readStorage('token') ||
      this.readStorage('accessToken') ||
      this.readStorage('access_token') ||
      this.readStorage('jwt') ||
      this.readStorage('auth_token') || '';
    if (tokenRaw) {
      const p = this.decodeToken(tokenRaw);
      if (p.municipalityId) municipalityId = p.municipalityId;
      if (p.userId) userId = p.userId;
    }
    return { municipalityId, uploadedBy: userId };
  }

  private authOrError(): { municipalityId: string; uploadedBy: string } | null {
    const ctx = this.authContext();
    if (!ctx.municipalityId || !ctx.uploadedBy) return null;
    return ctx;
  }

  // ---------------- Document service ----------------
  uploadDocument(file: File) {
    const ctx = this.authOrError();
    if (!ctx) return throwError(() => new Error('Login থেকে municipalityId / userId পাওয়া যায়নি। আবার Login করুন।'));
    const params = new HttpParams().set('municipalityId', ctx.municipalityId).set('uploadedBy', ctx.uploadedBy);
    const form = new FormData();
    form.append('file', file);
    return this.http.post(this.documentApi('/documents/upload'), form, { params });
  }

  getDocument(id: string) {
    const ctx = this.authOrError();
    if (!ctx) return throwError(() => new Error('Login থেকে municipalityId / userId পাওয়া যায়নি। আবার Login করুন।'));
    const params = new HttpParams().set('municipalityId', ctx.municipalityId);
    return this.http.get(this.documentApi(`/documents/${id}`), { params });
  }

  downloadDocument(id: string) {
    const ctx = this.authOrError();
    if (!ctx) return throwError(() => new Error('Login থেকে municipalityId / userId পাওয়া যায়নি। আবার Login করুন।'));
    const params = new HttpParams().set('municipalityId', ctx.municipalityId);
    return this.http.get(this.documentApi(`/documents/${id}/download`), { params, responseType: 'blob' });
  }

  attachUsage(documentId: string, refType: string, refId: string) {
    const ctx = this.authOrError();
    if (!ctx) return throwError(() => new Error('Login থেকে municipalityId / userId পাওয়া যায়নি। আবার Login করুন।'));
    const params = new HttpParams()
      .set('municipalityId', ctx.municipalityId)
      .set('refType', refType)
      .set('refId', refId)
      .set('actorId', ctx.uploadedBy);
    return this.http.post(this.documentApi(`/documents/${documentId}/attach-usage`), {}, { params });
  }

  // ---------------- Audit service ----------------
  auditEvents(municipalityId: number, page = 0, size = 20): Observable<Row[]> {
    const params = new HttpParams().set('municipalityId', municipalityId).set('page', page).set('size', size);
    return this.http.get(this.auditApi('/audit/events'), { params }).pipe(unwrap());
  }

  // ---------------- Identity service ----------------
  searchCitizenByMobile(mobile: string): Observable<Row[]> {
    const params = new HttpParams().set('mobile', mobile);
    return this.http.get<any>(`${environment.identityUrl}/users/search`, { params }).pipe(unwrap());
  }
}