
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  MenuService,
  MenuItem,
  MenuItemRequest,
} from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Menu ও Submenu ব্যবস্থাপনা</h1>
      </div>

      @if (!isPlatformUser()) {
        <div class="alert alert-danger">
          শুধু Platform User Menu ও Submenu তৈরি করতে পারবেন।
        </div>
      } @else {
        @if (errorMsg()) {
          <div class="alert alert-danger">{{ errorMsg() }}</div>
        }

        @if (successMsg()) {
          <div class="alert alert-success">{{ successMsg() }}</div>
        }

        <div class="card">
          <div class="card-body">
            <h3>নতুন Menu / Submenu তৈরি</h3>

            <div class="form-group">
              <label>তৈরির ধরন</label>
              <select class="form-control" [(ngModel)]="creationType">
                <option value="MENU">মূল Menu</option>
                <option value="SUBMENU">Submenu</option>
              </select>
            </div>

            @if (creationType === 'SUBMENU') {
              <div class="form-group">
                <label>Parent Menu নির্বাচন করুন *</label>
                <select
                  class="form-control"
                  [(ngModel)]="parentId"
                  name="parentId"
                >
                  <option [ngValue]="null">-- Menu নির্বাচন করুন --</option>
                  @for (menu of rootMenus(); track menu.id) {
                    <option [ngValue]="menu.id">
                      {{ menu.labelBn }} ({{ menu.code }})
                    </option>
                  }
                </select>
              </div>
            }

            <div class="form-group">
              <label>Menu Code *</label>
              <input
                class="form-control"
                [(ngModel)]="code"
                name="code"
                placeholder="যেমন: REPORT_MENU"
              />
            </div>

            <div class="form-group">
              <label>বাংলা নাম *</label>
              <input
                class="form-control"
                [(ngModel)]="labelBn"
                name="labelBn"
                placeholder="বাংলা নাম লিখুন"
              />
            </div>

            <div class="form-group">
              <label>ইংরেজি নাম *</label>
              <input
                class="form-control"
                [(ngModel)]="labelEn"
                name="labelEn"
                placeholder="English name"
              />
            </div>

            <div class="form-group">
              <label>Route Path</label>
              <input
                class="form-control"
                [(ngModel)]="routePath"
                name="routePath"
                placeholder="/reports"
              />
            </div>

            <div class="form-group">
              <label>Icon</label>
              <input
                class="form-control"
                [(ngModel)]="icon"
                name="icon"
                placeholder="bar-chart"
              />
            </div>

            <div class="form-group">
              <label>Required Permission Code</label>
              <input
                class="form-control"
                [(ngModel)]="requiredPermissionCode"
                name="requiredPermissionCode"
                placeholder="যেমন: report.view"
              />
            </div>

            <div class="form-group">
              <label>ক্রম (Sort Order)</label>
              <input
                class="form-control"
                type="number"
                [(ngModel)]="sortOrder"
                name="sortOrder"
              />
            </div>

            <div class="form-group">
              <label>
                <input
                  type="checkbox"
                  [(ngModel)]="isActive"
                  name="isActive"
                />
                সক্রিয় রাখুন
              </label>
            </div>

            <button
              class="btn btn-primary"
              [disabled]="saving()"
              (click)="create()"
            >
              {{
                saving()
                  ? 'সংরক্ষণ হচ্ছে...'
                  : creationType === 'MENU'
                    ? 'Menu তৈরি করুন'
                    : 'Submenu তৈরি করুন'
              }}
            </button>

            <button
              class="btn btn-secondary"
              style="margin-left:8px"
              (click)="resetForm()"
            >
              ফর্ম পরিষ্কার
            </button>
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-body">
            <h3>বর্তমান Menu Tree</h3>

            @if (loading()) {
              <p>Menu লোড হচ্ছে...</p>
            } @else {
              <ul class="menu-tree">
                @for (menu of rootMenus(); track menu.id) {
                  <li>
                    <strong>{{ menu.labelBn }}</strong>
                    <code>{{ menu.code }}</code>

                    @if (menu.children?.length) {
                      <ul>
                        @for (child of menu.children; track child.id) {
                          <li>
                            {{ child.labelBn }}
                            <code>{{ child.code }}</code>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                } @empty {
                  <li>কোনো Menu পাওয়া যায়নি।</li>
                }
              </ul>
            }

            <button
              class="btn btn-secondary"
              [disabled]="loading()"
              (click)="loadMenus()"
            >
              Refresh
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 14px; }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 10px;
    }
    .menu-tree, .menu-tree ul {
      padding-left: 24px;
    }
    .menu-tree li { margin: 8px 0; }
    .menu-tree code {
      margin-left: 8px;
      font-size: 0.8rem;
    }
  `],
})
export class MenuManagementComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly auth = inject(AuthService);

  readonly isPlatformUser = () =>
    this.auth.hasRole('PLATFORM_ADMIN');

  menus = signal<MenuItem[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  creationType: 'MENU' | 'SUBMENU' = 'MENU';

  code = '';
  labelBn = '';
  labelEn = '';
  parentId: number | null = null;
  routePath = '';
  icon = '';
  requiredPermissionCode = '';
  sortOrder = 0;
  isActive = true;

  rootMenus(): MenuItem[] {
    return this.menus();
  }

  ngOnInit(): void {
    if (this.isPlatformUser()) {
      this.loadMenus();
    }
  }

  loadMenus(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.menuService
      .getMenuTree(false)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.menus.set(items ?? []),
        error: (err) => {
          this.errorMsg.set(
            err?.error?.message || 'Menu লোড করা যায়নি।'
          );
        },
      });
  }

  create(): void {
    this.errorMsg.set('');
    this.successMsg.set('');

    if (!this.isPlatformUser()) {
      this.errorMsg.set('শুধু Platform User Menu তৈরি করতে পারবেন।');
      return;
    }

    if (!this.code.trim() ||
        !this.labelBn.trim() ||
        !this.labelEn.trim()) {
      this.errorMsg.set(
        'Menu Code, বাংলা নাম ও ইংরেজি নাম পূরণ করুন।'
      );
      return;
    }

    if (this.creationType === 'SUBMENU' && this.parentId == null) {
      this.errorMsg.set('Submenu তৈরির জন্য Parent Menu নির্বাচন করুন।');
      return;
    }

    const request: MenuItemRequest = {
      code: this.code.trim(),
      labelBn: this.labelBn.trim(),
      labelEn: this.labelEn.trim(),
      parentId: this.creationType === 'MENU' ? null : this.parentId,
      routePath: this.routePath.trim() || null,
      icon: this.icon.trim() || null,
      requiredPermissionCode:
        this.requiredPermissionCode.trim() || null,
      sortOrder: Number(this.sortOrder) || 0,
      isActive: this.isActive,
    };

    this.saving.set(true);

    this.menuService
      .createMenu(request)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMsg.set(
            this.creationType === 'MENU'
              ? 'Menu সফলভাবে তৈরি হয়েছে।'
              : 'Submenu সফলভাবে তৈরি হয়েছে।'
          );

          this.resetForm();
          this.loadMenus();
        },
        error: (err) => {
          this.errorMsg.set(
            err?.error?.message ||
            err?.error?.detail ||
            'Menu তৈরি করা যায়নি। Backend response পরীক্ষা করুন।'
          );
        },
      });
  }

  resetForm(): void {
    this.creationType = 'MENU';
    this.code = '';
    this.labelBn = '';
    this.labelEn = '';
    this.parentId = null;
    this.routePath = '';
    this.icon = '';
    this.requiredPermissionCode = '';
    this.sortOrder = 0;
    this.isActive = true;
  }
}
