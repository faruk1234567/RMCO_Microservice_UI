
import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { MenuService, MenuItem } from '../core/services/menu.service';
import { Municipality } from '../core/models/user.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  municipalities = signal<Municipality[]>([]);
  municipalityLoading = signal(false);

  menus = signal<MenuItem[]>([]);
  menuLoading = signal(false);
  menuError = signal(false);

  openSubmenuId = signal<number | null>(null);

  userName = computed(() => {
    const user = this.auth.currentUser();
    return user?.nameBn || user?.nameEn || 'ব্যবহারকারী';
  });

  municipality = computed(() => {
    const user = this.auth.currentUser();
    const municipalityId = user?.municipalityId;

    if (municipalityId == null) {
      return 'গ্লোবাল অ্যাকাউন্ট';
    }

    const found = this.municipalities().find(
      (m: any) =>
        String(m.municipalityId ?? m.id) === String(municipalityId)
    );

    return found
      ? (found.nameBn || found.nameEn || 'পৌরসভা')
      : this.municipalityLoading()
        ? 'পৌরসভার তথ্য লোড হচ্ছে...'
        : 'পৌরসভার তথ্য পাওয়া যায়নি';
  });

  constructor(
    public auth: AuthService,
    private menuService: MenuService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMunicipalities();
    this.loadMenuTree();
  }

  reloadMenus(): void {
    this.loadMenuTree();
  }

  private loadMenuTree(): void {
    this.menuLoading.set(true);
    this.menuError.set(false);

    this.menuService
      .getMenuTree(true)
      .pipe(finalize(() => this.menuLoading.set(false)))
      .subscribe({
        next: (items) => {
          this.menus.set(this.sortMenus(items ?? []));
          console.log('Dynamic Menu Tree loaded:', this.menus());
        },
        error: (error) => {
          console.error('Failed to load dynamic menus:', error);
          this.menus.set([]);
          this.menuError.set(true);
        },
      });
  }

  private sortMenus(items: MenuItem[]): MenuItem[] {
    return [...items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        ...item,
        children: this.sortMenus(item.children ?? []),
      }));
  }

  private loadMunicipalities(): void {
    this.municipalityLoading.set(true);

    this.auth.getMunicipalitiesForRegistration()
      .pipe(finalize(() => this.municipalityLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;
          this.municipalities.set(Array.isArray(data) ? data : []);
        },
        error: (error) => {
          console.error('Failed to load municipalities:', error);
        },
      });
  }

  toggleSubmenu(id: number): void {
    this.openSubmenuId.update((current) => current === id ? null : id);
  }

  closeSubmenu(): void {
    this.openSubmenuId.set(null);
  }

  isParentActive(item: MenuItem): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];

    if (item.routePath && currentUrl === item.routePath) {
      return true;
    }

    return (item.children ?? []).some((child) =>
      child.routePath === currentUrl
    );
  }

  logout(): void {
    this.auth.logout();
  }
}
