import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
//import { Observable, of, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Observable, of, catchError, map, forkJoin } from 'rxjs';
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
  return this.http.get<any>(
    `${environment.identityUrl}/lookups/DESIGNATION`
  ).pipe(
    map(response => {
      const data = response?.data ?? response;

      return (Array.isArray(data) ? data : []).map((d: any) => ({
        id: String(d.id),
       municipalityId: String(d.municipalityId ?? ''),
        code: d.code,
        nameBn: d.nameBn,
        nameEn: d.nameEn,
        isActive: d.isActive
      }));
    })
  );
}
  createDesignation(dto: Partial<Designation>): Observable<Designation> {
  return this.http.post<any>(
    `${environment.identityUrl}/lookups`,
    {
      category: 'DESIGNATION',
      code: dto.code,
      nameBn: dto.nameBn,
      nameEn: dto.nameEn,
      isActive: true
    }
  ).pipe(
    map(response => {
      const d = response?.data ?? response;

      return {
        id: String(d.id),
       municipalityId: String(d.municipalityId ?? ''),
        code: d.code,
        nameBn: d.nameBn,
        nameEn: d.nameEn,
        isActive: d.isActive
      };
    })
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
    return this.http.get<any>(
      `${this.base}/config/scopes/levels`
    ).pipe(
      map(response => {
        const data = response?.data ?? response;

        return Array.isArray(data) ? data : [];
      })
    );
  }

  getScopeTree(): Observable<ScopeNode[]> {
    return this.http.get<any>(
      `${this.base}/config/scopes/tree`
    ).pipe(
      map(response => {
        const data = response?.data ?? response;

        return Array.isArray(data) ? data : [];
      })
    );
  }

  /**
   * Scope Node-এর levelId দিয়ে Level-এর নাম ও ক্রম নম্বর যুক্ত করে।
   */
  getScopeTreeWithLevels(): Observable<ScopeNode[]> {
    return forkJoin({
      levels: this.listScopeLevels(),
      nodes: this.getScopeTree()
    }).pipe(
      map(({ levels, nodes }) => {

        const levelMap = new Map(
          levels.map(level => [level.id, level])
        );

        const enrichNodes = (
          items: ScopeNode[]
        ): ScopeNode[] => {

          return items.map(node => {

            const level = levelMap.get(node.levelId);

            return {
              ...node,

              levelNo: level?.levelNo ?? node.levelNo,

              levelNameBn:
                level?.nameBn ?? node.levelNameBn,

              children: enrichNodes(node.children ?? [])
            };
          });
        };

        return enrichNodes(nodes);
      })
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
