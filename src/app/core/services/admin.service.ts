import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = environment.identityUrl;

  constructor(private http: HttpClient) {}

  // ─── Roles ──────────────────────────────────────────────
  /** GET /admin/roles */
  getRoles(): Observable<any> {
    return this.http.get(`${this.base}/admin/roles`);
  }

  /** POST /admin/roles */
  createRole(payload: { code: string; nameBn: string; nameEn?: string; description?: string }): Observable<any> {
    return this.http.post(`${this.base}/admin/roles`, payload);
  }

  /** GET /admin/roles/{roleId}/permissions */
  getRolePermissions(roleId: string): Observable<any> {
    return this.http.get(`${this.base}/admin/roles/${roleId}/permissions`);
  }

  /** POST /admin/roles/{roleId}/permissions */
  setRolePermissions(roleId: string, permissions: string[]): Observable<any> {
    return this.http.post(`${this.base}/admin/roles/${roleId}/permissions`, { permissions });
  }

  /** POST /admin/roles/{roleId}/deactivate */
  deactivateRole(roleId: string): Observable<any> {
    return this.http.post(`${this.base}/admin/roles/${roleId}/deactivate`, {});
  }

  /** POST /admin/roles/assign */
  assignRole(payload: { userId: string; roleId: string; municipalityId?: string }): Observable<any> {
    return this.http.post(`${this.base}/admin/roles/assign`, payload);
  }

  /** GET /admin/roles/user/{userId} */
  getUserRoles(userId: string): Observable<any> {
    return this.http.get(`${this.base}/admin/roles/user/${userId}`);
  }

  // ─── Admin Users ────────────────────────────────────────
  /** POST /admin/users/{userId}/verify */
  verifyUser(userId: string): Observable<any> {
    return this.http.post(`${this.base}/admin/users/${userId}/verify`, {});
  }

  /** POST /admin/users/{userId}/suspend */
  suspendUser(userId: string): Observable<any> {
    return this.http.post(`${this.base}/admin/users/${userId}/suspend`, {});
  }

  /** POST /admin/users/{userId}/inactive */
  inactiveUser(userId: string): Observable<any> {
    return this.http.post(`${this.base}/admin/users/${userId}/inactive`, {});
  }

  // ─── Invites ────────────────────────────────────────────
  /** POST /admin/invites */
  sendInvite(payload: {
    mobile?: string;
    email?: string;
    municipalityId: string;
    roleId?: string;
    nameBn?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/admin/invites`, payload);
  }

  // ─── Users ──────────────────────────────────────────────
  /** GET /users/search?q= */
  searchUsers(q: string): Observable<any> {
    const params = new HttpParams().set('q', q);
    return this.http.get(`${this.base}/users/search`, { params });
  }

  /** GET /users/{id}/profile */
  getProfile(id: string): Observable<any> {
    return this.http.get(`${this.base}/users/${id}/profile`);
  }
}
