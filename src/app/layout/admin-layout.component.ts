import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

interface AdminGroup {
  title: string;
  items: { label: string; path: string }[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">

      <!-- ========== TOP BAR (ধূসর) ========== -->
      <header class="topbar">
        <a class="brand" routerLink="/admin">
          <span class="brand-main">Digital Municipality</span>
          <span class="brand-sub">প্রশাসন প্যানেল</span>
        </a>

        <nav class="tabs">
          @for (g of groups; track g.title) {
            <a class="tab"
               [routerLink]="g.items[0].path"
               [class.active]="isGroupActive(g)">
              {{ g.title }}
            </a>
          }
        </nav>

        <a class="exit-btn" routerLink="/dashboard">← ড্যাশবোর্ড</a>
      </header>

      <div class="body">

        <!-- ========== SIDEBAR (সাদা) ========== -->
        <aside class="sidebar">
          @for (g of groups; track g.title) {
            @if (isGroupActive(g)) {
              @for (i of g.items; track i.path) {
                <a class="side-link" [routerLink]="i.path" routerLinkActive="active">
                  {{ i.label }}
                </a>
              }
            }
          }
        </aside>

        <!-- ========== CONTENT ========== -->
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bar-bg: #7f8c8d;
      --bar-dark: #6b7778;
      --tab-active: #e3e7e8;
      --green: #0a5c36;
      --line: #e1e5e7;
      display: block;
    }

    .admin-shell { min-height: 100vh; display: flex; flex-direction: column; background: #fff; }

    /* ---------- Top bar ---------- */
    .topbar {
      display: flex;
      align-items: stretch;
      height: 78px;
      background: var(--bar-bg);
      color: #fff;
    }
    .brand {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 220px;
      padding: 0 24px;
      color: #fff;
      text-decoration: none;
    }
    .brand-main { font-size: 17px; font-weight: 700; }
    .brand-sub { margin-top: 2px; font-size: 12px; opacity: 0.85; }

    .tabs { display: flex; flex: 1; }
    .tab {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 130px;
      padding: 0 20px;
      border-left: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.15s;
    }
    .tab:last-child { border-right: 1px solid rgba(255, 255, 255, 0.18); }
    .tab:hover { background: rgba(255, 255, 255, 0.12); }
    .tab.active { background: var(--tab-active); color: #2f3b3c; font-weight: 700; }

    .exit-btn {
      display: flex;
      align-items: center;
      padding: 0 24px;
      background: var(--bar-dark);
      color: #fff;
      font-size: 13px;
      text-decoration: none;
    }
    .exit-btn:hover { background: #5d6869; }

    /* ---------- Body ---------- */
    .body { flex: 1; display: grid; grid-template-columns: 220px 1fr; }

    .sidebar {
      padding: 14px 8px;
      background: #fff;
      border-right: 1px solid var(--line);
    }
    .side-link {
      display: block;
      padding: 10px 12px;
      border-bottom: 1px solid #eef1f2;
      color: #3d4a4b;
      font-size: 14px;
      text-decoration: none;
      transition: background 0.12s, color 0.12s;
    }
    .side-link:hover { background: #f5f7f7; color: var(--green); }
    .side-link.active { color: #1a4fa0; font-weight: 600; background: #f5f8fc; }

    .content { padding: 22px 28px; min-width: 0; background: #fff; }

    /* ---------- Responsive ---------- */
    @media (max-width: 900px) {
      .topbar { flex-wrap: wrap; height: auto; }
      .brand { min-width: 100%; padding: 12px 16px; }
      .tabs { flex-wrap: wrap; width: 100%; }
      .tab { min-height: 44px; flex: 1; }
      .body { grid-template-columns: 1fr; }
      .sidebar { display: flex; flex-wrap: wrap; border-right: 0; border-bottom: 1px solid var(--line); }
      .side-link { border-bottom: 0; }
    }
  `]
})
export class AdminLayoutComponent {
  private router = inject(Router);

  // বর্তমান URL signal-এ রাখা হচ্ছে, তাই back/forward-এও tab ঠিক থাকবে
  private currentUrl = signal(this.router.url);

  groups: AdminGroup[] = [
    {
      title: 'কনফিগারেশন',
      items: [
        { label: 'Menu Management', path: '/admin/menus' },
        { label: 'Permissions', path: '/admin/permissions' },
        { label: 'Lookups', path: '/admin/lookups' },
      ],
    },
    {
      title: 'ব্যবহারকারী',
      items: [
        { label: 'Users', path: '/admin/users' },
        { label: 'Roles', path: '/admin/roles' },
        { label: 'Invites', path: '/admin/invites' },
      ],
    },
    {
      title: 'প্রতিষ্ঠান',
      items: [
        { label: 'Municipalities', path: '/admin/municipalities' },
         { label: 'Wards', path: '/admin/wards' },
      ],
    },
  ];

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.currentUrl.set(this.router.url));
  }

  isGroupActive(g: AdminGroup): boolean {
    const url = this.currentUrl();
    return g.items.some(i => url.startsWith(i.path));
  }
}