import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { MenuItem, MenuRequest } from './menu.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private base = `${environment.configUrl}/menus`;

  /** Header navbar er jonno (shudhu active menu). Manager theke change hole abar loadNav() call korben. */
  navTree = signal<MenuItem[]>([]);

  loadNav() {
    this.tree(true).subscribe({ next: t => this.navTree.set(t), error: () => this.navTree.set([]) });
  }

  tree(activeOnly = false) {
    return this.http.get<MenuItem[]>(`${this.base}/tree`, { params: { activeOnly } });
  }
  create(body: MenuRequest) { return this.http.post<MenuItem>(this.base, body); }
  update(id: number, body: MenuRequest) { return this.http.put<MenuItem>(`${this.base}/${id}`, body); }
  setStatus(id: number, isActive: boolean) {
    return this.http.patch<MenuItem>(`${this.base}/${id}/status`, { isActive });
  }
  remove(id: number) { return this.http.delete<void>(`${this.base}/${id}`); }
}
