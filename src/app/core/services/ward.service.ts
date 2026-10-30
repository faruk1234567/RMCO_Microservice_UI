import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Ward {
  id: number;
  municipalityId: number;
  wardNo: number;
  nameBn: string;
  nameEn?: string | null;
  active: boolean;
}

export interface WardRequest {
  wardNo: number;
  nameBn: string;
  nameEn?: string | null;
  active?: boolean;
}

export interface WardBulkRequest {
  count: number;
  startFrom?: number;
}

@Injectable({ providedIn: 'root' })
export class WardService {
  // proxy.conf.json এ /api -> backend থাকলে এটাই ঠিক (আপনার স্ক্রিনশটে /api/v1/wards দেখা গেছে)
  private readonly base = '/api/v1/wards';

  constructor(private http: HttpClient) {}

  private params(municipalityId?: number | null): HttpParams {
    let p = new HttpParams();
    if (municipalityId != null) p = p.set('municipalityId', String(municipalityId));
    return p;
  }

  /** ফর্মের ড্রপডাউনের জন্য: নিজের পৌরসভার সক্রিয় ওয়ার্ড */
  listForDropdown(): Observable<Ward[]> {
    return this.http.get<ApiResponse<Ward[]>>(this.base).pipe(map(r => r.data));
  }

  /** ম্যানেজ স্ক্রিনের জন্য: নিষ্ক্রিয়সহ সব ওয়ার্ড */
  listForManagement(municipalityId?: number | null): Observable<Ward[]> {
    return this.http
      .get<ApiResponse<Ward[]>>(`${this.base}/manage`, { params: this.params(municipalityId) })
      .pipe(map(r => r.data));
  }

  create(body: WardRequest, municipalityId?: number | null): Observable<Ward> {
    return this.http
      .post<ApiResponse<Ward>>(this.base, body, { params: this.params(municipalityId) })
      .pipe(map(r => r.data));
  }

  bulkCreate(body: WardBulkRequest, municipalityId?: number | null): Observable<Ward[]> {
    return this.http
      .post<ApiResponse<Ward[]>>(`${this.base}/bulk`, body, { params: this.params(municipalityId) })
      .pipe(map(r => r.data));
  }

  update(id: number, body: WardRequest, municipalityId?: number | null): Observable<Ward> {
    return this.http
      .put<ApiResponse<Ward>>(`${this.base}/${id}`, body, { params: this.params(municipalityId) })
      .pipe(map(r => r.data));
  }

  deactivate(id: number, municipalityId?: number | null): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`, { params: this.params(municipalityId) })
      .pipe(map(() => undefined));
  }
}