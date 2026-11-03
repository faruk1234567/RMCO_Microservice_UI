import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, OperatorFunction, map } from 'rxjs';
// ⚠ আপনার প্রজেক্টে environment-এর পথ/নাম আলাদা হলে শুধু এই দুই লাইন ঠিক করুন
import { environment } from '../../../environments/environment';
import { CommitteeTypeRow, ApprovalRoute, ScopeNode, MasterItem, UiLabel, NotificationTemplate, UploadPolicy, ConfigChangeLog } from './config-admin.model';


/** ApiResponse { success, data } হলে data খুলে দেয়; interceptor আগেই খুলে দিলে যেমন আছে তেমন রাখে */
function unwrap<T>(): OperatorFunction<any, T> {
  return map((r: any) =>
    (r && typeof r === 'object' && 'success' in r && 'data' in r ? r.data : r) as T);
}

@Injectable({ providedIn: 'root' })
export class ConfigAdminService {
  private http = inject(HttpClient);
  private base = environment.configUrl;           // ← প্রয়োজনে বদলান
  private url = (p: string) => `${this.base}${p}`;

  // ---------------- B-01 / B-02 / B-03 : Committee type ----------------
  listTypes(active = true): Observable<CommitteeTypeRow[]> {
    return this.http.get(this.url('/config/committee-types'), { params: new HttpParams().set('active', active) }).pipe(unwrap());
  }
  createType(body: { code: string; nameBn: string; nameEn?: string }): Observable<Record<string, any>> {
    return this.http.post(this.url('/config/committee-types'), body).pipe(unwrap());
  }
  createVersion(typeId: string, body: Record<string, any> = {}): Observable<Record<string, any>> {
    return this.http.post(this.url(`/config/committee-types/${typeId}/versions`), body).pipe(unwrap());
  }
  getVersion(versionId: string): Observable<Record<string, any>> {
    return this.http.get(this.url(`/config/type-versions/${versionId}`)).pipe(unwrap());
  }
  updateVersion(versionId: string, body: Record<string, any>): Observable<Record<string, any>> {
    return this.http.put(this.url(`/config/type-versions/${versionId}`), body).pipe(unwrap());
  }
  validateVersion(versionId: string): Observable<string[]> {
    return this.http.post(this.url(`/config/type-versions/${versionId}/validate`), {}).pipe(unwrap());
  }
  publishVersion(versionId: string): Observable<Record<string, any>> {
    return this.http.post(this.url(`/config/type-versions/${versionId}/publish`), {}).pipe(unwrap());
  }

  // ---------------- B-07 / B-08 : Approval route ----------------
  listRoutes(): Observable<any[]> {
    return this.http.get(this.url('/config/approval-routes')).pipe(unwrap());
  }
  getRoute(id: string): Observable<ApprovalRoute> {
    return this.http.get(this.url(`/config/approval-routes/${id}`)).pipe(unwrap());
  }
  createRoute(body: ApprovalRoute): Observable<Record<string, any>> {
    return this.http.post(this.url('/config/approval-routes'), body).pipe(unwrap());
  }

  // ---------------- B-05 / B-06 : Scope ----------------
  scopeTree(): Observable<ScopeNode[]> {
    return this.http.get(this.url('/config/scopes/tree')).pipe(unwrap());
  }
  /** backend এখানে @RequestParam নেয় (body নয়) */
  createLevel(nameBn: string, nameEn: string, levelNo: number): Observable<Record<string, any>> {
    const params = new HttpParams().set('nameBn', nameBn).set('nameEn', nameEn).set('levelNo', levelNo);
    return this.http.post(this.url('/config/scopes/levels'), null, { params }).pipe(unwrap());
  }
  createNode(body: { nameBn: string; nameEn?: string; levelNo: number; parentId?: string | null }): Observable<Record<string, any>> {
    return this.http.post(this.url('/config/scopes/nodes'), body).pipe(unwrap());
  }

  // ---------------- B-09 : Master item ----------------
  listMasterItems(group: string): Observable<MasterItem[]> {
    return this.http.get(this.url('/config/master-items'), { params: new HttpParams().set('group', group) }).pipe(unwrap());
  }
  createMasterItem(body: { group: string; code: string; nameBn: string; nameEn?: string }): Observable<Record<string, any>> {
    return this.http.post(this.url('/config/master-items'), body).pipe(unwrap());
  }

  // ======= ⚠ নিচেরগুলোর backend API আপনার ডকুমেন্টে নেই – endpoint অনুমান করা =======
  // B-11
  listLabels(): Observable<UiLabel[]> { return this.http.get(this.url('/config/ui-labels')).pipe(unwrap()); }
  saveLabel(b: UiLabel): Observable<any> { return this.http.post(this.url('/config/ui-labels'), b).pipe(unwrap()); }
  listTemplates(): Observable<NotificationTemplate[]> { return this.http.get(this.url('/config/notification-templates')).pipe(unwrap()); }
  saveTemplate(b: NotificationTemplate): Observable<any> { return this.http.post(this.url('/config/notification-templates'), b).pipe(unwrap()); }
  // B-12
  getUploadPolicy(): Observable<UploadPolicy> { return this.http.get(this.url('/config/upload-policy')).pipe(unwrap()); }
  saveUploadPolicy(b: UploadPolicy): Observable<UploadPolicy> { return this.http.post(this.url('/config/upload-policy'), b).pipe(unwrap()); }
  // B-13
  changeLog(q: { entity?: string; from?: string; to?: string; page?: number; size?: number }): Observable<ConfigChangeLog[]> {
    let p = new HttpParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) p = p.set(k, String(v)); });
    return this.http.get(this.url('/config/change-log'), { params: p }).pipe(unwrap());
  }
}
