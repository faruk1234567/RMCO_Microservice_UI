
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = environment.identityUrl;

  constructor(private http: HttpClient) {}

  // ─── Municipalities ─────────────────────────────────────

  /** GET /platform/municipalities */
  getMunicipalities(): Observable<any> {
    return this.http.get(`${this.base}/platform/municipalities`);
  }

  // ─── Roles ──────────────────────────────────────────────

  /** GET /admin/roles
   * Municipality Admin: নিজের Municipality-এর Roles
   * Platform Admin: নির্বাচিত Municipality-এর Roles
   */
  getRoles(municipalityId?: number): Observable<any> {
    let params = new HttpParams();

    if (municipalityId !== undefined && municipalityId !== null) {
      params = params.set('municipalityId', municipalityId.toString());
    }

    return this.http.get(`${this.base}/admin/roles`, { params });
  }

  /** Alias: নির্দিষ্ট Municipality-এর Roles */
  getRolesByMunicipality(municipalityId: number): Observable<any> {
    return this.getRoles(municipalityId);
  }

  /** POST /admin/roles */
  createRole(payload: {
    municipalityId?: number;
    code: string;
    nameBn: string;
    nameEn?: string;
    description?: string;
  }): Observable<any> {
    const body: any = {
      roleCode: payload.code.trim(),
      nameBn: payload.nameBn.trim(),
      nameEn: payload.nameEn?.trim()
    };

    if (payload.municipalityId !== undefined &&
        payload.municipalityId !== null) {
      body.municipalityId = payload.municipalityId;
    }

    if (payload.description) {
      body.description = payload.description.trim();
    }

    return this.http.post(`${this.base}/admin/roles`, body);
  }

  /** GET /admin/roles/{roleId}/permissions */
  
getRolePermissions(
  roleId: string | number,
  municipalityId?: number
): Observable<any> {
  let params = new HttpParams();

  if (municipalityId != null) {
    params = params.set('municipalityId', municipalityId.toString());
  }

  return this.http.get(
    `${this.base}/admin/roles/${roleId}/permissions`,
    { params }
  );
}


  /** GET /platform/permissions */
  getPermissions(): Observable<any> {
    return this.http.get(`${this.base}/platform/permissions`);
  }
  
  /** POST /platform/permissions */
  createPermission(payload: {
    code: string;
    permissionGroup: string;
    labelBn: string;
    labelEn: string;
    isMenu?: boolean;
    parentCode?: string | null;
    sortOrder?: number;
  }): Observable<any> {
    return this.http.post(
      `${this.base}/platform/permissions`,
      {
        code: payload.code.trim(),
        permissionGroup: payload.permissionGroup.trim(),
        labelBn: payload.labelBn.trim(),
        labelEn: payload.labelEn.trim(),
        isMenu: payload.isMenu ?? false,
        parentCode: payload.parentCode || null,
        sortOrder: payload.sortOrder ?? 0
      }
    );
  }


  /** POST /admin/roles/{roleId}/permissions */
   setRolePermissions(
    roleId: string | number,
    permissionCodes: string[],
    municipalityId?: number
  ): Observable<any> {
    let params = new HttpParams();

    if (municipalityId !== undefined && municipalityId !== null) {
      params = params.set(
        'selectedMunicipalityId',
        municipalityId.toString()
      );
    }

    return this.http.post(
      `${this.base}/admin/roles/${roleId}/permissions`,
      { permissionCodes },
      { params }
    );
  }

  /** POST /admin/roles/{roleId}/deactivate */
  deactivateRole(roleId: string | number): Observable<any> {
    return this.http.post(
      `${this.base}/admin/roles/${roleId}/deactivate`,
      {}
    );
  }

  /** POST /admin/roles/assign */
  assignRole(payload: {
    userId: string;
    roleId: string;
    municipalityId?: string;
  }): Observable<any> {
    return this.http.post(
      `${this.base}/admin/roles/assign`,
      payload
    );
  }

  /** GET /admin/roles/user/{userId} */
  getUserRoles(userId: string): Observable<any> {
    return this.http.get(
      `${this.base}/admin/roles/user/${userId}`
    );
  }

  // ─── Admin Users ────────────────────────────────────────

  /** POST /admin/users/{userId}/verify */
  verifyUser(userId: string): Observable<any> {
    return this.http.post(
      `${this.base}/admin/users/${userId}/verify`,
      {}
    );
  }

  /** POST /admin/users/{userId}/suspend */
  suspendUser(userId: string): Observable<any> {
    return this.http.post(
      `${this.base}/admin/users/${userId}/suspend`,
      {}
    );
  }

  /** POST /admin/users/{userId}/inactive */
  inactiveUser(userId: string): Observable<any> {
    return this.http.post(
      `${this.base}/admin/users/${userId}/inactive`,
      {}
    );
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
    return this.http.post(
      `${this.base}/admin/invites`,
      payload
    );
  }

  // ─── Users ──────────────────────────────────────────────

  /** GET /users/search?q= */
 searchUsers(
  q: string,
  municipalityId: number
): Observable<any> {
  const params = new HttpParams()
    .set('q', q)
    .set('municipalityId', municipalityId.toString());

  return this.http.get(
    `${this.base}/users/search`,
    { params }
  );
}

  /** GET /users/{id}/profile */
  getProfile(id: string): Observable<any> {
    return this.http.get(
      `${this.base}/users/${id}/profile`
    );
  }
 
  /** GET /users/search
   *
   * Municipality user:
   *   municipalityId না পাঠালে backend login context ব্যবহার করবে।
   *
   * Platform Admin:
   *   নির্বাচিত municipalityId পাঠাতে হবে।
   */
  searchCitizens(filters: {
    mobile?: string;
    name?: string;
    verificationStatus?: string;
    municipalityId?: number | null;
  }): Observable<any> {
    let params = new HttpParams();

    const mobile = filters.mobile?.trim();
    const name = filters.name?.trim();
    const verificationStatus = filters.verificationStatus?.trim();

    if (mobile) {
      params = params.set('mobile', mobile);
    }

    if (name) {
      params = params.set('name', name);
    }

    if (verificationStatus) {
      params = params.set(
        'verificationStatus',
        verificationStatus
      );
    }

    if (filters.municipalityId != null) {
      params = params.set(
        'municipalityId',
        filters.municipalityId.toString()
      );
    }

    return this.http.get(`${this.base}/users/search`, { params });
  }
  /** GET Municipality Permission Matrix */
getMunicipalityPermissionMatrix(
  municipalityId: number
): Observable<any> {
  return this.http.get(
    `${this.base}/admin/roles/municipalities/${municipalityId}/permission-matrix`
  );
}

/** PUT /admin/roles/municipalities/{municipalityId}/permissions */
updateMunicipalityPermission(
  municipalityId: number,
  payload: {
    permissionCode: string;
    canUse: boolean;
    canDelegate: boolean;
  }
): Observable<any> {
  return this.http.put(
    `${this.base}/admin/roles/municipalities/${municipalityId}/permissions`,
    payload
  );
}

createCitizen(payload: any): Observable<any> {
  return this.http.post(
    `${this.base}/users/citizens`,
    payload
  );
}


getLookup(type: 'DIVISION' | 'DISTRICT' | 'UPAZILA' | 'UNION') {
  return this.http.get<any>(`${this.base}/lookups/${type}`);
}

getLookupChildren(parentId: number | string) {
  return this.http.get<any>(
    `${this.base}/lookups/children/${parentId}`
  );
}


getWards(unionId?: number | string) {
  let url = `${this.base}/wards`;
  if (unionId != null && unionId !== '') {
    url += `?unionId=${unionId}`;
  }
  return this.http.get<any>(url);
}

// already thakle skip korun


}
