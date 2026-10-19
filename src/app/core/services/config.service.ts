import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Designation,
  ApprovalRoute,
  ScopeLevel,
  ScopeNode,
  DynamicField,
  ApprovalRouteStep,
} from '../models/config.model';
import { CommitteeType, CommitteeTypeVersion } from '../models/committee.model';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private base = environment.configUrl;

  constructor(private http: HttpClient) {}

  // ---- Committee Types ----
  listTypes(): Observable<CommitteeType[]> {
    return this.http.get<CommitteeType[]>(`${this.base}/config/committee-types`).pipe(
      catchError(() =>
        of([
          { id: 't-1', code: 'EDU', nameBn: 'শিক্ষা কমিটি', nameEn: 'Education', isActive: true, latestPublishedVersionId: 'tv-1', latestVersionNo: 3 },
          { id: 't-2', code: 'HLTH', nameBn: 'স্বাস্থ্য কমিটি', nameEn: 'Health', isActive: true, latestPublishedVersionId: 'tv-2', latestVersionNo: 2 },
          { id: 't-3', code: 'DEV', nameBn: 'উন্নয়ন কমিটি', nameEn: 'Development', isActive: true, latestVersionNo: 1 },
        ])
      )
    );
  }

  // ---- Designations ----
  listDesignations(): Observable<Designation[]> {
    return this.http.get<Designation[]>(`${this.base}/config/designations`).pipe(
      catchError(() =>
        of([
          { id: 'd-1', municipalityId: 'm-001', code: 'CHAIR', nameBn: 'সভাপতি', nameEn: 'Chairperson', isActive: true },
          { id: 'd-2', municipalityId: 'm-001', code: 'SEC', nameBn: 'সদস্য সচিব', nameEn: 'Member Secretary', isActive: true },
          { id: 'd-3', municipalityId: 'm-001', code: 'MEM', nameBn: 'সদস্য', nameEn: 'Member', isActive: true },
          { id: 'd-4', municipalityId: 'm-001', code: 'VC', nameBn: 'সহ-সভাপতি', nameEn: 'Vice Chair', isActive: true },
        ])
      )
    );
  }

  createDesignation(dto: Partial<Designation>): Observable<Designation> {
    return this.http.post<Designation>(`${this.base}/config/designations`, dto).pipe(
      catchError(() => of({ id: 'd-new', municipalityId: 'm-001', code: dto.code || '', nameBn: dto.nameBn || '', isActive: true }))
    );
  }

  // ---- Approval Routes ----
  listRoutes(): Observable<ApprovalRoute[]> {
    return this.http.get<ApprovalRoute[]>(`${this.base}/config/approval-routes`).pipe(
     catchError(() =>
        of<ApprovalRoute[]>([
          {
            id: 'r-1', municipalityId: 'm-001', code: 'STD', nameBn: 'সাধারণ অনুমোদন', nameEn: 'Standard',
            isActive: true,
            steps: [
              { id: 'rs-1', stepOrder: 1, assigneeType: 'ROLE', assigneeValue: 'SECRETARY', slaHours: 48, nameBn: 'সচিব' },
              { id: 'rs-2', stepOrder: 2, assigneeType: 'ROLE', assigneeValue: 'MAYOR', slaHours: 72, nameBn: 'মেয়র' },
            ],
          },
          {
            id: 'r-2', municipalityId: 'm-001', code: 'FAST', nameBn: 'দ্রুত অনুমোদন', isActive: true,
            steps: [{ id: 'rs-3', stepOrder: 1, assigneeType: 'ROLE', assigneeValue: 'MAYOR', slaHours: 24, nameBn: 'মেয়র' }],
          },
        ])
      )
    );
  }

  // ---- Scope ----
  listScopeLevels(): Observable<ScopeLevel[]> {
    return this.http.get<ScopeLevel[]>(`${this.base}/config/scope-levels`).pipe(
      catchError(() =>
        of([
          { id: 'sl-1', municipalityId: 'm-001', code: 'MUNI', nameBn: 'পৌরসভা', sortOrder: 1 },
          { id: 'sl-2', municipalityId: 'm-001', code: 'WARD', nameBn: 'ওয়ার্ড', sortOrder: 2 },
        ])
      )
    );
  }

  getScopeTree(): Observable<ScopeNode[]> {
    return this.http.get<ScopeNode[]>(`${this.base}/config/scope-nodes/tree`).pipe(
      catchError(() =>
        of([
          {
            id: 'sn-1', levelId: 'sl-1', code: 'JHE', nameBn: 'ঝিনাইদহ পৌরসভা', isActive: true,
            children: [
              { id: 'sn-2', levelId: 'sl-2', parentId: 'sn-1', code: 'W1', nameBn: 'ওয়ার্ড ১', isActive: true },
              { id: 'sn-3', levelId: 'sl-2', parentId: 'sn-1', code: 'W2', nameBn: 'ওয়ার্ড ২', isActive: true },
              { id: 'sn-4', levelId: 'sl-2', parentId: 'sn-1', code: 'W3', nameBn: 'ওয়ার্ড ৩', isActive: true },
            ],
          },
        ])
      )
    );
  }

  // ---- Dynamic Fields ----
  listDynamicFields(entityType?: string): Observable<DynamicField[]> {
    return this.http.get<DynamicField[]>(`${this.base}/config/dynamic-fields`, {
      params: entityType ? { entityType } : {},
    }).pipe(
      catchError(() =>
        of<DynamicField[]>([
          {
            id: 'df-1', municipalityId: 'm-001', entityType: 'COMMITTEE', code: 'budget_code',
            labelBn: 'বাজেট কোড', labelEn: 'Budget Code', fieldType: 'TEXT',
            isRequired: false, sortOrder: 1, isActive: true,
          },
        ])
      )
    );
  }
}
