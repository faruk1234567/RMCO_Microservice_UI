import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Committee,
  CommitteeDraftPayload,
  CommitteeMember,
  CommitteeType,
  CommitteeTypeVersion,
} from '../models/committee.model';

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  private base = environment.committeeUrl;

  constructor(private http: HttpClient) {}

  // Backend থেকে আসা response যেই shape এই আসুক, list এ convert করবে
  private toList(res: any): Committee[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }

  // আসল API - কোনো নকল ডাটা নাই
  list(status?: string): Observable<Committee[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.base}/committees`, { params }).pipe(
      map(res => this.toList(res))
    );
  }

getActiveCommittees() {
  return this.http.get<any>(`${this.base}/committees?status=ACTIVE`).pipe(
    map(res => res?.data || res || [])
  );
}

  getById(id: string): Observable<Committee> {
    return this.http.get<Committee>(`${this.base}/committees/${id}`);
  }

 getMembers(committeeId: string): Observable<CommitteeMember[]> {
  return this.http.get<any>(`${this.base}/committees/${committeeId}/members`).pipe(
    map(res => this.toList(res) as unknown as CommitteeMember[])
  );
}

 getPublishedTypes(): Observable<CommitteeType[]> {
  return this.http.get<any>(`${environment.configUrl}/config/committee-types?status=PUBLISHED`).pipe(
    map(res => this.toList(res) as unknown as CommitteeType[])
  );
}

  getTypeVersion(versionId: string): Observable<CommitteeTypeVersion> {
    return this.http.get<CommitteeTypeVersion>(`${environment.configUrl}/config/type-versions/${versionId}`);
  }

  createDraft(payload: CommitteeDraftPayload): Observable<Committee> {
    return this.http.post<Committee>(`${this.base}/committees/drafts`, payload);
  }

  updateDraft(id: string, payload: Partial<CommitteeDraftPayload>): Observable<Committee> {
    return this.http.put<Committee>(`${this.base}/committees/drafts/${id}`, payload);
  }

  submitDraft(id: string): Observable<{ approvalRequestId: string }> {
    return this.http.post<{ approvalRequestId: string }>(`${this.base}/committees/drafts/${id}/submit`, {});
  }
}