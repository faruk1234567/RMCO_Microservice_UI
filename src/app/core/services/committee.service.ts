import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
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

  list(status?: string): Observable<Committee[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Committee[]>(`${this.base}/committees`, { params }).pipe(
      catchError(() =>
        of([
          {
            id: 'c-1', municipalityId: 'm-001', typeVersionId: 'tv-1', typeCode: 'EDU',
            typeNameBn: 'শিক্ষা কমিটি', nameBn: 'শিক্ষা কমিটি', nameEn: 'Education Committee',
            status: 'ACTIVE' as const, termStart: '2024-01-15', termEnd: '2026-12-31',
            memberCount: 7, createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'c-2', municipalityId: 'm-001', typeVersionId: 'tv-2', typeCode: 'HLTH',
            typeNameBn: 'স্বাস্থ্য কমিটি', nameBn: 'স্বাস্থ্য কমিটি',
            status: 'IN_APPROVAL' as const, memberCount: 5, createdAt: '2025-10-10T08:00:00Z',
          },
          {
            id: 'c-3', municipalityId: 'm-001', typeVersionId: 'tv-3', typeCode: 'DEV',
            typeNameBn: 'উন্নয়ন কমিটি', nameBn: 'উন্নয়ন কমিটি',
            status: 'DRAFT' as const, memberCount: 0, createdAt: '2025-10-18T12:00:00Z',
          },
          {
            id: 'c-4', municipalityId: 'm-001', typeVersionId: 'tv-1', typeCode: 'SPORT',
            typeNameBn: 'ক্রীড়া কমিটি', nameBn: 'ক্রীড়া কমিটি',
            status: 'REJECTED' as const, memberCount: 3, createdAt: '2025-09-01T09:00:00Z',
          },
        ])
      )
    );
  }

  getById(id: string): Observable<Committee> {
    return this.http.get<Committee>(`${this.base}/committees/${id}`).pipe(
      catchError(() =>
        of({
          id, municipalityId: 'm-001', typeVersionId: 'tv-1', typeCode: 'EDU',
          typeNameBn: 'শিক্ষা কমিটি', nameBn: 'শিক্ষা কমিটি', nameEn: 'Education Committee',
          status: 'ACTIVE' as const, termStart: '2024-01-15', termEnd: '2026-12-31',
          memberCount: 7, createdAt: '2024-01-15T10:00:00Z',
        })
      )
    );
  }

  getMembers(committeeId: string): Observable<CommitteeMember[]> {
    return this.http.get<CommitteeMember[]>(`${this.base}/committees/${committeeId}/members`).pipe(
      catchError(() =>
        of([
          {
            id: 'cm-1', committeeId, userId: 'u-1', userNameBn: 'মোঃ করিম',
            designationId: 'd-1', designationNameBn: 'সভাপতি', isPrimary: true,
            joinedAt: '2024-01-15', status: 'ACTIVE' as const,
          },
          {
            id: 'cm-2', committeeId, userId: 'u-2', userNameBn: 'ফাতেমা বেগম',
            designationId: 'd-2', designationNameBn: 'সদস্য সচিব', isPrimary: false,
            joinedAt: '2024-01-15', status: 'ACTIVE' as const,
          },
          {
            id: 'cm-3', committeeId, userId: 'u-3', userNameBn: 'রহিম উদ্দিন',
            designationId: 'd-3', designationNameBn: 'সদস্য', isPrimary: false,
            joinedAt: '2024-01-20', status: 'ACTIVE' as const,
          },
        ])
      )
    );
  }

  getPublishedTypes(): Observable<CommitteeType[]> {
    return this.http.get<CommitteeType[]>(`${environment.configUrl}/config/committee-types?status=PUBLISHED`).pipe(
      catchError(() =>
        of([
          { id: 't-1', code: 'EDU', nameBn: 'শিক্ষা কমিটি', nameEn: 'Education', isActive: true, latestPublishedVersionId: 'tv-1', latestVersionNo: 3 },
          { id: 't-2', code: 'HLTH', nameBn: 'স্বাস্থ্য কমিটি', nameEn: 'Health', isActive: true, latestPublishedVersionId: 'tv-2', latestVersionNo: 2 },
          { id: 't-3', code: 'DEV', nameBn: 'উন্নয়ন কমিটি', nameEn: 'Development', isActive: true, latestPublishedVersionId: 'tv-3', latestVersionNo: 1 },
        ])
      )
    );
  }

  getTypeVersion(versionId: string): Observable<CommitteeTypeVersion> {
    return this.http.get<CommitteeTypeVersion>(`${environment.configUrl}/config/type-versions/${versionId}`).pipe(
      catchError(() =>
        of({
          id: versionId, committeeTypeId: 't-1', versionNo: 3, status: 'PUBLISHED' as const,
          designations: [
            { id: 'td-1', designationId: 'd-1', designationNameBn: 'সভাপতি', sortOrder: 1, isMandatory: true, isSingleHolder: true, minCount: 1, maxCount: 1 },
            { id: 'td-2', designationId: 'd-2', designationNameBn: 'সদস্য সচিব', sortOrder: 2, isMandatory: true, isSingleHolder: true, minCount: 1, maxCount: 1 },
            { id: 'td-3', designationId: 'd-3', designationNameBn: 'সদস্য', sortOrder: 3, isMandatory: false, isSingleHolder: false, minCount: 3, maxCount: 7 },
          ],
          composition: { minMembers: 5, maxMembers: 9 },
        })
      )
    );
  }

  createDraft(payload: CommitteeDraftPayload): Observable<Committee> {
    return this.http.post<Committee>(`${this.base}/committees/drafts`, payload).pipe(
      catchError(() =>
        of({
          id: 'c-new', municipalityId: 'm-001', typeVersionId: payload.typeVersionId,
          nameBn: payload.nameBn, nameEn: payload.nameEn, status: 'DRAFT' as const,
          memberCount: payload.members?.length || 0, createdAt: new Date().toISOString(),
        })
      )
    );
  }

  updateDraft(id: string, payload: Partial<CommitteeDraftPayload>): Observable<Committee> {
    return this.http.put<Committee>(`${this.base}/committees/drafts/${id}`, payload).pipe(
      catchError(() => of({ id, ...payload } as Committee))
    );
  }

  submitDraft(id: string): Observable<{ approvalRequestId: string }> {
    return this.http.post<{ approvalRequestId: string }>(`${this.base}/committees/drafts/${id}/submit`, {}).pipe(
      catchError(() => of({ approvalRequestId: 'ar-mock-1' }))
    );
  }
}
