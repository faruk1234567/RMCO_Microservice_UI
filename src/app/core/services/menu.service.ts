
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface MenuItem {
  id: number;
  code: string;
  labelBn: string;
  labelEn: string;
  parentId: number | null;
  routePath: string | null;
  icon: string | null;
  requiredPermissionCode: string | null;
  sortOrder: number;
  isActive: boolean;
  children: MenuItem[];
}

export interface MenuItemRequest {
  code: string;
  labelBn: string;
  labelEn: string;
  parentId: number | null;
  routePath: string | null;
  icon: string | null;
  requiredPermissionCode: string | null;
  sortOrder: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8083/api/v1/menus';

  getMenuTree(activeOnly = true): Observable<MenuItem[]> {
    return this.http
      .get<MenuItem[]>(`${this.apiUrl}/tree`, {
        params: { activeOnly: String(activeOnly) },
      })
      .pipe(
        map((menus) =>
          (menus ?? []).map((menu) => this.normalizeMenu(menu))
        )
      );
  }

  createMenu(request: MenuItemRequest): Observable<MenuItem> {
    return this.http.post<MenuItem>(this.apiUrl, request);
  }

  private normalizeMenu(menu: MenuItem): MenuItem {
    return {
      ...menu,
      children: (menu.children ?? []).map((child) =>
        this.normalizeMenu(child)
      ),
    };
  }
}
