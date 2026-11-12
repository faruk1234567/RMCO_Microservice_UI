import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, OperatorFunction, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  CommitteeTypeRow,
  ApprovalRoute,
  ScopeNode,
  ScopeLevel,
  MasterItem,
  UiLabel,
  NotificationTemplate,
  UploadPolicy,
  ConfigChangeLog
} from './config-admin.model';

/**
 * Config Designation Master
 *
 * id                  = Config database UUID
 * designationLookupId = Identity lookup_item BIGINT
 */
export interface ConfigDesignation {
  id: string;
  municipalityId?: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
  designationLookupId: number | null;
}

/**
 * Identity Service-এর lookup (DESIGNATION) আইটেম
 *
 * id = Identity lookup_item BIGINT
 */
export interface DesignationLookup {
  id: number;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
}

/**
 * ApiResponse { success, data } হলে data return করে।
 * Interceptor আগে unwrap করলে response অপরিবর্তিত থাকে।
 */
function unwrap<T>(): OperatorFunction<any, T> {
  return map((r: any) =>
    (
      r &&
      typeof r === 'object' &&
      'success' in r &&
      'data' in r
        ? r.data
        : r
    ) as T
  );
}

@Injectable({ providedIn: 'root' })
export class ConfigAdminService {

  private http = inject(HttpClient);

  private base = environment.configUrl;

  /**
   * Identity Service-এর base path (dev proxy অনুযায়ী)।
   * Network ট্যাবে দেখা URL: /identity-service/api/v1/lookups/DESIGNATION
   * environment-এ identityUrl থাকলে সেটা ব্যবহার করতে পারেন।
   */
  private identityBase = '/identity-service/api/v1';

  private url = (p: string) => `${this.base}${p}`;

  // =====================================================
  // B-01 / B-02 / B-03 : Committee Type
  // =====================================================

  listTypes(active = true): Observable<CommitteeTypeRow[]> {
    return this.http
      .get(this.url('/config/committee-types'), {
        params: new HttpParams().set('active', active)
      })
      .pipe(unwrap<CommitteeTypeRow[]>());
  }

  createType(body: {
    code: string;
    nameBn: string;
    nameEn?: string;
  }): Observable<Record<string, any>> {
    return this.http
      .post(this.url('/config/committee-types'), body)
      .pipe(unwrap<Record<string, any>>());
  }

  createVersion(
    typeId: string,
    body: Record<string, any> = {}
  ): Observable<Record<string, any>> {
    return this.http
      .post(this.url(`/config/committee-types/${typeId}/versions`), body)
      .pipe(unwrap<Record<string, any>>());
  }

  getVersion(versionId: string): Observable<Record<string, any>> {
    return this.http
      .get(this.url(`/config/type-versions/${versionId}`))
      .pipe(unwrap<Record<string, any>>());
  }

  updateVersion(
    versionId: string,
    body: Record<string, any>
  ): Observable<Record<string, any>> {
    return this.http
      .put(this.url(`/config/type-versions/${versionId}`), body)
      .pipe(unwrap<Record<string, any>>());
  }

  validateVersion(versionId: string): Observable<string[]> {
    return this.http
      .post(this.url(`/config/type-versions/${versionId}/validate`), {})
      .pipe(unwrap<string[]>());
  }

  publishVersion(versionId: string): Observable<Record<string, any>> {
    return this.http
      .post(this.url(`/config/type-versions/${versionId}/publish`), {})
      .pipe(unwrap<Record<string, any>>());
  }

  // =====================================================
  // Committee Designation Master
  // Config UUID + Identity Lookup BIGINT
  // =====================================================

  listDesignations(): Observable<ConfigDesignation[]> {
    return this.http
      .get<any>(this.url('/config/designations'))
      .pipe(
        unwrap<any>(),
        map((response: any) => {
          const rows = Array.isArray(response)
            ? response
            : response?.content ?? response?.items ?? [];

          return rows.map((d: any): ConfigDesignation => ({
            id: String(d.id ?? ''),
            municipalityId:
              d.municipalityId != null
                ? String(d.municipalityId)
                : d.municipality_id != null
                  ? String(d.municipality_id)
                  : '',
            code: d.code ?? '',
            nameBn: d.nameBn ?? d.name_bn ?? '',
            nameEn: d.nameEn ?? d.name_en ?? '',
            isActive: d.isActive ?? d.is_active ?? false,
            designationLookupId:
              d.designationLookupId != null
                ? Number(d.designationLookupId)
                : d.designation_lookup_id != null
                  ? Number(d.designation_lookup_id)
                  : null
          }));
        })
      );
  }

  /**
   * Identity Service থেকে DESIGNATION lookup তালিকা।
   * রেসপন্সের ফিল্ডের নাম আলাদা হলে নিচের map-এ মিলিয়ে নিন।
   */
  listDesignationLookups(): Observable<DesignationLookup[]> {
    return this.http
      .get<any>(`${this.identityBase}/lookups/DESIGNATION`)
      .pipe(
        unwrap<any>(),
        map((response: any) => {
          const rows = Array.isArray(response)
            ? response
            : response?.content ?? response?.items ?? [];

          return rows
            .map((d: any): DesignationLookup => ({
              id: Number(d.id ?? d.lookupItemId ?? d.lookup_item_id),
              code: d.code ?? d.itemCode ?? d.item_code ?? '',
              nameBn:
                d.nameBn ?? d.name_bn ?? d.labelBn ?? d.name ?? d.label ?? '',
              nameEn: d.nameEn ?? d.name_en ?? d.labelEn ?? '',
              isActive: d.isActive ?? d.is_active ?? true
            }))
            .filter(
              (d: DesignationLookup) => Number.isFinite(d.id) && d.isActive
            );
        })
      );
  }

  /**
   * Identity lookup-এর পদবীর জন্য Config Master রো নিশ্চিত করে।
   * Master আগে থেকে থাকলে সেটাই ফেরত দেয়, না থাকলে নতুন বানায়।
   */
  ensureDesignation(l: DesignationLookup): Observable<Record<string, any>> {
    return this.http
      .post(this.url('/config/designations/ensure'), {
        designationLookupId: l.id,
        code: l.code,
        nameBn: l.nameBn,
        nameEn: l.nameEn
      })
      .pipe(unwrap<Record<string, any>>());
  }

  // =====================================================
  // B-07 / B-08 : Approval Route
  // =====================================================

  listRoutes(): Observable<any[]> {
    return this.http
      .get(this.url('/config/approval-routes'))
      .pipe(unwrap<any[]>());
  }

  getRoute(id: string): Observable<ApprovalRoute> {
    return this.http
      .get(this.url(`/config/approval-routes/${id}`))
      .pipe(unwrap<ApprovalRoute>());
  }

  createRoute(body: Record<string, any>): Observable<Record<string, any>> {
    return this.http
      .post(this.url('/config/approval-routes'), body)
      .pipe(unwrap<Record<string, any>>());
  }

  // =====================================================
  // B-05 / B-06 : Scope Levels & Scope Tree
  // =====================================================

  listScopeLevels(): Observable<ScopeLevel[]> {
    return this.http
      .get<any>(this.url('/config/scopes/levels'))
      .pipe(unwrap<ScopeLevel[]>());
  }

  scopeTree(): Observable<ScopeNode[]> {
    return this.http
      .get<any>(this.url('/config/scopes/tree'))
      .pipe(unwrap<ScopeNode[]>());
  }

  createLevel(
    nameBn: string,
    nameEn: string,
    levelNo: number
  ): Observable<Record<string, any>> {

    const params = new HttpParams()
      .set('nameBn', nameBn)
      .set('nameEn', nameEn)
      .set('levelNo', levelNo);

    return this.http
      .post(this.url('/config/scopes/levels'), null, { params })
      .pipe(unwrap<Record<string, any>>());
  }

  createNode(body: {
    levelId: string;
    parentId: string | null;
    code: string;
    nameBn: string;
    nameEn?: string;
  }): Observable<Record<string, any>> {
    return this.http
      .post<any>(this.url('/config/scopes/nodes'), body)
      .pipe(unwrap<Record<string, any>>());
  }

  // =====================================================
  // B-09 : Master Items
  // =====================================================

  listMasterItems(group: string): Observable<MasterItem[]> {
    return this.http
      .get(this.url('/config/master-items'), {
        params: new HttpParams().set('group', group)
      })
      .pipe(unwrap<MasterItem[]>());
  }

  createMasterItem(body: {
    group: string;
    code: string;
    nameBn: string;
    nameEn?: string;
  }): Observable<Record<string, any>> {
    return this.http
      .post(this.url('/config/master-items'), body)
      .pipe(unwrap<Record<string, any>>());
  }

  // =====================================================
  // B-11 : UI Labels & Notification Templates
  // =====================================================

  listLabels(): Observable<UiLabel[]> {
    return this.http
      .get(this.url('/config/ui-labels'))
      .pipe(unwrap<UiLabel[]>());
  }

  saveLabel(b: UiLabel): Observable<any> {
    return this.http
      .post(this.url('/config/ui-labels'), b)
      .pipe(unwrap<any>());
  }

  listTemplates(): Observable<NotificationTemplate[]> {
    return this.http
      .get(this.url('/config/notification-templates'))
      .pipe(unwrap<NotificationTemplate[]>());
  }

  saveTemplate(b: NotificationTemplate): Observable<any> {
    return this.http
      .post(this.url('/config/notification-templates'), b)
      .pipe(unwrap<any>());
  }

  // =====================================================
  // B-12 : Upload Policy
  // =====================================================

  getUploadPolicy(): Observable<UploadPolicy> {
    return this.http
      .get(this.url('/config/upload-policy'))
      .pipe(unwrap<UploadPolicy>());
  }

  saveUploadPolicy(b: UploadPolicy): Observable<UploadPolicy> {
    return this.http
      .post(this.url('/config/upload-policy'), b)
      .pipe(unwrap<UploadPolicy>());
  }

  // =====================================================
  // B-13 : Change Log
  // =====================================================

  changeLog(q: {
    entity?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<ConfigChangeLog[]> {

    let p = new HttpParams();

    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        p = p.set(k, String(v));
      }
    });

    return this.http
      .get(this.url('/config/change-log'), { params: p })
      .pipe(unwrap<ConfigChangeLog[]>());
  }
}