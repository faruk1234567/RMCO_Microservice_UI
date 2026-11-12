import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, OperatorFunction, map } from 'rxjs';
// ⚠ ConfigAdminService-এ যে environment path দিয়েছেন, এখানেও সেটাই দিন
import { environment } from '../../../environments/environment';

export type Row = Record<string, any>;

function unwrap<T>(): OperatorFunction<any, T> {
  return map((r: any) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? r.data : r) as T);
}

/** C, D, E, F সেকশনের (Committee / Workflow / Document / Audit service) সব API call এক জায়গায় */
@Injectable({ providedIn: 'root' })
export class EngineApiService {
  private http = inject(HttpClient);
  // ⚠ প্রতিটি service-এর নিজস্ব base URL। environment.ts-এ এই চারটি key থাকতে হবে:
  //   committeeUrl, workflowUrl, documentUrl, auditUrl
  // (সব যদি একই gateway-র পেছনে থাকে, চারটির মান একই দিলেই চলবে)
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
  /** ⚠ CreateDraftRequest-এর field-নাম অনুমান */
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
  return this.http
    .post(this.committeeApi('/committees/drafts'), body)
    .pipe(unwrap());
}
  updateDraft(id: string, payload: Row): Observable<Row> { return this.http.put(this.committeeApi(`/committees/drafts/${id}`), payload).pipe(unwrap()); }
  submitDraft(id: string): Observable<Row> { return this.http.post(this.committeeApi(`/committees/drafts/${id}/submit`), {}).pipe(unwrap()); }

  // ---------------- Workflow service ----------------
  myPending(): Observable<Row[]> { return this.http.get(this.workflowApi('/workflow/my-pending')).pipe(unwrap()); }
  /** ⚠ DecideRequest-এর field-নাম অনুমান: decision (APPROVED|REJECTED), comment */
  decide(requestId: string, body: { decision: 'APPROVED' | 'REJECTED'; comment?: string }): Observable<Row> {
    return this.http.post(this.workflowApi(`/workflow/requests/${requestId}/decide`), body).pipe(unwrap());
  }
  // core/services/engine-api.service.ts
// core/services/engine-api.service.ts
getApprovalDetailByCommittee(committeeId: string) {
  return this.http.get<any>(
    this.workflowApi(`/workflow/approvals/by-committee/${committeeId}/detail`)
  );
}

getApprovalDetail(requestId: string) {
  return this.http.get<any>(
    this.workflowApi(`/workflow/approvals/${requestId}/detail`)
  );
}

  // ---------------- Document service ----------------
  uploadDocument(file: File): Observable<Row> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post(this.documentApi('/documents'), fd).pipe(unwrap());
  }
  getDocument(id: string): Observable<Row> { return this.http.get(this.documentApi(`/documents/${id}`)).pipe(unwrap()); }
  attachUsage(id: string, refType: string, refId: string): Observable<Row> {
    const params = new HttpParams().set('refType', refType).set('refId', refId);
    return this.http.post(this.documentApi(`/documents/${id}/usage`), null, { params }).pipe(unwrap());
  }

  // ---------------- Audit service ----------------
  auditEvents(municipalityId: number, page = 0, size = 20): Observable<Row[]> {
    const params = new HttpParams().set('municipalityId', municipalityId).set('page', page).set('size', size);
    return this.http.get(this.auditApi('/audit/events'), { params }).pipe(unwrap());
  }
  // ---------------- Identity service ----------------
searchCitizenByMobile(mobile: string): Observable<Row[]> {
  const params = new HttpParams().set('mobile', mobile);

  return this.http
    .get<any>(`${environment.identityUrl}/users/search`, { params })
    .pipe(unwrap());
}

}
