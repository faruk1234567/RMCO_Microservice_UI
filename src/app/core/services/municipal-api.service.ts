import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, OperatorFunction, map } from 'rxjs';
// ⚠ আগের মতোই environment path ঠিক করুন
import { environment } from '../../../environments/environment';

export type Row = Record<string, any>;

function unwrap<T>(): OperatorFunction<any, T> {
  return map((r: any) => (r && typeof r === 'object' && 'success' in r && 'data' in r ? r.data : r) as T);
}

/*
 * environment.ts-এ তিনটি key লাগবে (আপনার বাকি key-এর মতো, শেষে /api/v1 সহ):
 *    taxProposalUrl: '/tax-proposal-service/api/v1',
 *    objectionUrl:   '/objection-service/api/v1',
 *    noticeUrl:      '/notice-service/api/v1',
 * তাই path-এ আলাদা করে /api/v1 যোগ করা হয়নি।
 */

// ---------------- Tax Proposal service ----------------
@Injectable({ providedIn: 'root' })
export class TaxProposalApi {
  private http = inject(HttpClient);
  private u = (p: string) => `${environment.taxProposalUrl}${p}`;

  create(body: Row): Observable<Row> { return this.http.post(this.u('/tax-proposals'), body).pipe(unwrap()); }
  get(id: string): Observable<Row> { return this.http.get(this.u(`/tax-proposals/${id}`)).pipe(unwrap()); }
  /** body: placeOrMethod, publicNoticeEnabled, objectionWindowMonths, noticeDocumentId */
  prePublish(id: string, body: Row): Observable<Row> { return this.http.post(this.u(`/tax-proposals/${id}/pre-publish`), body).pipe(unwrap()); }
  finalize(id: string): Observable<Row> { return this.http.post(this.u(`/tax-proposals/${id}/finalize`), {}).pipe(unwrap()); }
  /** { proposalId, objectionDeadline, isOpen, status } */
  objectionWindow(id: string): Observable<Row> { return this.http.get(this.u(`/tax-proposals/${id}/objection-window`)).pipe(unwrap()); }
}

// ---------------- Objection service ----------------
@Injectable({ providedIn: 'root' })
export class ObjectionApi {
  private http = inject(HttpClient);
  private u = (p: string) => `${environment.objectionUrl}${p}`;

  submit(body: Row): Observable<Row> { return this.http.post(this.u('/objections'), body).pipe(unwrap()); }
  get(id: string): Observable<Row> { return this.http.get(this.u(`/objections/${id}`)).pipe(unwrap()); }
  mine(): Observable<Row[]> { return this.http.get(this.u('/me/objections')).pipe(unwrap()); }
  receive(id: string): Observable<Row> { return this.http.post(this.u(`/objections/${id}/receive`), {}).pipe(unwrap()); }
  /** body: committeeId (বাধ্যতামূলক), comment, role (ডিফল্ট MAYOR) */
  forward(id: string, body: { committeeId: string; comment?: string; role?: string }): Observable<Row> {
    return this.http.post(this.u(`/objections/${id}/forward`), body).pipe(unwrap());
  }
  scheduleHearing(id: string, body: Row): Observable<Row> { return this.http.post(this.u(`/objections/${id}/hearings`), body).pipe(unwrap()); }
  decide(id: string, body: Row): Observable<Row> { return this.http.post(this.u(`/objections/${id}/decision`), body).pipe(unwrap()); }
}

// ---------------- Notice service ----------------
@Injectable({ providedIn: 'root' })
export class NoticeApi {
  private http = inject(HttpClient);
  private u = (p: string) => `${environment.noticeUrl}/notices${p}`;

  createMessage(body: Row): Observable<Row> { return this.http.post(this.u('/messages'), body).pipe(unwrap()); }
  createCampaign(body: Row): Observable<Row> { return this.http.post(this.u('/campaigns'), body).pipe(unwrap()); }
  getCampaign(id: string): Observable<Row> { return this.http.get(this.u(`/campaigns/${id}`)).pipe(unwrap()); }
  send(id: string): Observable<Row> { return this.http.post(this.u(`/campaigns/${id}/send`), {}).pipe(unwrap()); }
  /** body: kind (বাধ্যতামূলক), messageId, scopeNodeId, parameters{} */
  createPrintJob(body: { kind: string; messageId?: string; scopeNodeId?: string; parameters?: Row }): Observable<Row> {
    return this.http.post(this.u('/print-jobs'), body).pipe(unwrap());
  }
}
