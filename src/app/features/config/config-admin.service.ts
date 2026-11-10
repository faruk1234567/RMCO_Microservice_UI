
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
 * ApiResponse { success, data } হলে data return করে।
 * Interceptor আগে unwrap করলে response 그대로 রাখে।
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

  // Scope Level list
listScopeLevels(): Observable<ScopeLevel[]> {
  return this.http
    .get<any>(this.url('/config/scopes/levels'))
    .pipe(unwrap<ScopeLevel[]>());
}

  // Scope Tree
 scopeTree(): Observable<ScopeNode[]> {
  return this.http
    .get<any>(this.url('/config/scopes/tree'))
    .pipe(unwrap<ScopeNode[]>());
}

  // Create Scope Level
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

  // Create Scope Node

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
