import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs';

interface AdminGroup {
  title: string;
  subtitle: string;
  items: { label: string; desc: string; path: string }[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">
      <header class="topbar">
        <a class="brand" routerLink="/admin">
          <span class="brand-main">Digital Municipality</span>
          <span class="brand-sub">প্রশাসন প্যানেল</span>
        </a>

        <nav class="tabs">
          @for (g of groups; track g.title) {
            <a
              class="tab"
              [routerLink]="g.items[0].path"
              [class.active]="isGroupActive(g)">
              <span class="tab-title">{{ g.title }}</span>
              <span class="tab-sub">{{ g.subtitle }}</span>
            </a>
          }
        </nav>

        <a class="exit-btn" routerLink="/dashboard">
          ← ড্যাশবোর্ড
        </a>
      </header>

      <div class="body">
        <aside class="sidebar">
          @for (g of groups; track g.title) {
            @if (isGroupActive(g)) {
              <div class="side-head">
                <strong>{{ g.title }}</strong>
                <span>{{ g.subtitle }}</span>
              </div>
              @for (i of g.items; track i.path) {
                <a
                  class="side-link"
                  [routerLink]="i.path"
                  routerLinkActive="active">
                  <span class="side-label">{{ i.label }}</span>
                  <span class="side-desc">{{ i.desc }}</span>
                </a>
              }
              <div class="side-help">
                কোনটা দিয়ে শুরু করবেন বুঝতে না পারলে উপরে থেকে নিচে ক্রমানুসারে যান:
                প্রথমে মেনু → তারপর পারমিশন → তারপর রোল → তারপর ইউজার।
              </div>
            }
          }
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bar-bg: #0a5c36;
      --bar-dark: #084a2c;
      --green: #0a5c36;
      --line: #e1e5e7;
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    /* FIX: পুরা shell টা 100vh তে আটকানো — body scroll হবে না, শুধু content scroll হবে */
    .admin-shell {
      height: 100vh;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #f7faf8;
      overflow: hidden;
    }

    /* FIX: header কখনো shrink হবে না, সবসময় উপরে fixed থাকবে */
    .topbar {
      flex: 0 0 auto;
      display: flex;
      align-items: stretch;
      min-height: 78px;
      background: var(--bar-bg);
      color: #fff;
    }

    .brand {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 230px;
      padding: 0 24px;
      color: #fff;
      text-decoration: none;
    }

    .brand-main {
      font-size: 17px;
      font-weight: 700;
    }

    .brand-sub {
      margin-top: 2px;
      font-size: 12px;
      opacity: 0.85;
    }

    .tabs {
      display: flex;
      flex: 1;
    }

    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 150px;
      padding: 0 20px;
      border-left: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      text-decoration: none;
      gap: 2px;
      transition: background 0.15s;
    }

    .tab:last-child {
      border-right: 1px solid rgba(255, 255, 255, 0.18);
    }

    .tab:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .tab.active {
      background: #ffffff;
      color: #1a3a2a;
    }

    .tab-title {
      font-size: 14px;
      font-weight: 600;
    }

    .tab-sub {
      font-size: 11px;
      opacity: 0.75;
    }

    .tab.active .tab-sub {
      opacity: 0.65;
    }

    .exit-btn {
      display: flex;
      align-items: center;
      padding: 0 24px;
      background: var(--bar-dark);
      color: #fff;
      font-size: 13px;
      text-decoration: none;
      white-space: nowrap;
    }

    .exit-btn:hover {
      background: #063d24;
    }

    /* FIX: body-র height বাকি জায়গাটুকুই, এর বাইরে যাবে না */
    .body {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
    }

    /* FIX: sidebar নিজে আলাদা scroll হবে, content scroll করলে sidebar নড়বে না */
    .sidebar {
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 16px 12px;
      background: #fff;
      border-right: 1px solid var(--line);
    }

    .side-head {
      padding: 0 10px 12px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .side-head strong {
      color: #0a5c36;
    }

    .side-head span {
      font-size: 12px;
      color: #5d6b63;
    }

    .side-link {
      display: block;
      padding: 11px 12px;
      border-radius: 8px;
      color: #3d4a4b;
      font-size: 14px;
      text-decoration: none;
      margin-bottom: 2px;
      transition: background 0.12s, color 0.12s;
    }

    .side-link:hover {
      background: #f5f7f7;
      color: var(--green);
    }

    .side-link.active {
      background: #eaf5ee;
      color: #0a5c36;
    }

    .side-label {
      display: block;
      font-weight: 600;
    }

    .side-desc {
      display: block;
      font-size: 12px;
      color: #5d6b63;
      margin-top: 2px;
      font-weight: 400;
    }

    .side-link.active .side-desc {
      color: #2f5a44;
    }

    .side-help {
      margin: 16px 10px 0;
      background: #f4f8f5;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.5;
      color: #5d6b63;
    }

    /* FIX: শুধু এই content টাই scroll হবে — এটাই standard */
    .content {
      min-height: 0;
      min-width: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 22px 28px;
      background: #f7faf8;
    }

    @media (max-width: 900px) {
      .topbar {
        flex-wrap: wrap;
      }

      .brand {
        min-width: 100%;
        padding: 12px 16px;
      }

      .tabs {
        flex-wrap: wrap;
        width: 100%;
      }

      .tab {
        min-height: 52px;
        flex: 1;
      }

      .body {
        grid-template-columns: 1fr;
        grid-template-rows: auto minmax(0, 1fr);
      }

      /* মোবাইলে sidebar উপরে, content নিচে — দুইটাই আলাদা scroll */
      .sidebar {
        border-right: 0;
        border-bottom: 1px solid var(--line);
        max-height: 38vh;
      }
    }
  `]
})
export class AdminLayoutComponent {
  private router = inject(Router);

  private currentUrl = signal(this.router.url);

  groups: AdminGroup[] = [
    {
      title: 'Platform Setup',
      subtitle: 'ধাপ ১ — কাঠামো',
      items: [
        { label: 'Menu Management', desc: 'মেনু ও সাবমেনু তৈরি', path: '/admin/menus' },
        { label: 'Country & Geography Setup', desc: 'দেশ, জেলা, ওয়ার্ড', path: '/admin/lookups' }
      ]
    },
    {
      title: 'Access Management',
      subtitle: 'ধাপ ২ — কে কী পারবে',
      items: [
        { label: 'Permissions', desc: 'পারমিশন তৈরি', path: '/admin/permissions' },
        { label: 'Roles', desc: 'রোল, পারমিশন নীতি, ইউজার অ্যাসাইন', path: '/admin/roles' },
        { label: 'Users', desc: 'ইউজার তালিকা', path: '/admin/users' },
        { label: 'Invites', desc: 'নতুন ইউজার আমন্ত্রণ', path: '/admin/invites' }
      ]
    },
    {
      title: 'Organization Registration',
      subtitle: 'ধাপ ৩ — পৌরসভা',
      items: [
        { label: 'Organizations', desc: 'পৌরসভা নিবন্ধন', path: '/admin/municipalities' },
        { label: 'Organization Wards', desc: 'পৌরসভার ওয়ার্ড', path: '/admin/wards' }
      ]
    }
  ];

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.currentUrl.set(this.router.url));
  }

  isGroupActive(group: AdminGroup): boolean {
    const url = this.currentUrl().split('?')[0];

    return group.items.some(item =>
      url === item.path || url.startsWith(item.path + '/')
    );
  }
}
