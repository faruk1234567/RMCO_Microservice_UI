import { Injectable, signal } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'dms_municipalities_cache';

@Injectable({ providedIn: 'root' })
export class MunicipalityCacheService {
  private map = signal<Record<string, string>>(this.loadFromStorage());
  private loading = false;
  private loaded = false;

  constructor(private auth: AuthService) {
    if (Object.keys(this.map()).length === 0) this.ensureLoaded().subscribe({ error: () => {} });
  }

  private loadFromStorage(): Record<string, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  private saveToStorage(m: Record<string, string>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch {}
  }

  // ★ /api/v1/platform/municipalities বাদ - ওইটা 403 দেয়
  // ★ /public/municipalities ব্যবহার করা - Public, 403 আসে না
  ensureLoaded(): Observable<any> {
    if (this.loaded && Object.keys(this.map()).length > 0) return of(this.map());
    if (this.loading) return of(this.map());
    this.loading = true;
    return this.auth.getMunicipalitiesForRegistration().pipe(
      tap({
        next: (res: any) => {
          const list: any[] = res?.data ?? res ?? [];
          console.log('[MunCache] public municipalities loaded:', list);
          this.setList(list);
          this.loaded = true;
          this.loading = false;
        },
        error: (e) => {
          console.error('[MunCache] public municipalities FAILED:', e);
          this.loading = false;
        },
      }),
      catchError((e) => { this.loading = false; return of(null); })
    );
  }

  setList(list: any[]) {
    const m: Record<string, string> = { ...this.map() };
    for (const item of (list ?? [])) {
      const id = String(item?.id ?? item?.municipalityId ?? item?.code ?? '').trim();
      const name = String(item?.nameBn ?? item?.nameEn ?? item?.name ?? item?.municipalityName ?? '').trim();
      if (id && name) m[id] = name;
    }
    this.map.set(m);
    this.saveToStorage(m);
    console.log('[MunCache] saved:', m);
  }

  getName(id: string | number | null | undefined): string | null {
    if (id == null || String(id).trim() === '') return null;
    let m = this.map();
    if (!m[String(id)]) {
      m = this.loadFromStorage();
      if (Object.keys(m).length) this.map.set(m);
    }
    return m[String(id)] ?? null;
  }

  hasAny(): boolean {
    return Object.keys(this.map()).length > 0;
  }
}