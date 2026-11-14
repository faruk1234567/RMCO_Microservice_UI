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
    <div class="page">
      <div class="page-head">
        <div>
          <h1>মেনু ও সাবমেনু ব্যবস্থাপনা</h1>
          <p class="sub">উপরের মেনু বারে কোন মেনু দেখা যাবে, তা এখান থেকে ঠিক করুন।</p>
        </div>
        <div class="stat"><strong>{{ menus().length }}</strong><span>টি মূল মেনু</span></div>
      </div>

      @if (!isPlatformUser()) {
        <div class="alert error">শুধু Platform User মেনু ও সাবমেনু তৈরি করতে পারবেন।</div>
      } @else {
        @if (errorMsg()) {
          <div class="alert error">{{ errorMsg() }}<button class="x" type="button" (click)="errorMsg.set('')">×</button></div>
        }
        @if (successMsg()) {
          <div class="alert success">{{ successMsg() }}<button class="x" type="button" (click)="successMsg.set('')">×</button></div>
        }

        <div class="layout">
          <!-- LEFT : FORM -->
          <section class="card form-card">
            <div class="card-head"><strong>নতুন মেনু / সাবমেনু তৈরি</strong><span class="step">ধাপ ১ → ২ → ৩</span></div>
            <div class="card-body">
              <label class="lbl">১. কোথায় তৈরি করবেন?</label>
              <div class="seg">
                <button type="button" [class.on]="creationType === 'MENU'" (click)="creationType = 'MENU'">মূল মেনু<small>উপরে সরাসরি দেখা যাবে</small></button>
                <button type="button" [class.on]="creationType === 'SUBMENU'" (click)="creationType = 'SUBMENU'">সাবমেনু<small>কোনো মেনুর ভেতরে থাকবে</small></button>
              </div>

              @if (creationType === 'SUBMENU') {
                <div class="form-group">
                  <label>কোন মেনুর ভেতরে? *</label>
                  <select class="form-control" [(ngModel)]="parentId" name="parentId">
                    <option [ngValue]="null">-- মেনু নির্বাচন করুন --</option>
                    @for (menu of rootMenus(); track menu.id) {
                      <option [ngValue]="menu.id">{{ menu.labelBn }}</option>
                    }
                  </select>
                  <small class="hint">উপরে যে মেনুটা বাছবেন, নতুন সাবমেনু তার ভেতরে যাবে।</small>
                </div>
              }

              <label class="lbl">২. নাম</label>
              <div class="form-group">
                <label>বাংলা নাম *</label>
                <input class="form-control" [(ngModel)]="labelBn" name="labelBn" placeholder="যেমন: কমিটি ব্যবস্থাপনা" />
              </div>
              <div class="form-group">
                <label>ইংরেজি নাম *</label>
                <input class="form-control" [(ngModel)]="labelEn" name="labelEn" placeholder="Committee Management" />
              </div>
              <div class="form-group">
                <label>মেনু কোড *</label>
                <input class="form-control mono" [(ngModel)]="code" name="code" placeholder="যেমন: COMMITTEE_MENU" />
                <small class="hint">কোড একবার দিলে পরে বদলাবেন না।</small>
              </div>

              <label class="lbl">৩. ক্লিক করলে কোথায় যাবে?</label>
              <div class="row2">
                <div class="form-group">
                  <label>পেজের পথ (Route)</label>
                  <input class="form-control mono" [(ngModel)]="routePath" name="routePath" placeholder="/committee" />
                </div>
                <div class="form-group">
                  <label>ক্রম (Sort Order)</label>
                  <input class="form-control" type="number" [(ngModel)]="sortOrder" name="sortOrder" />
                </div>
              </div>
              <div class="row2">
                <div class="form-group">
                  <label>আইকন (ঐচ্ছিক)</label>
                  <input class="form-control" [(ngModel)]="icon" name="icon" placeholder="bar-chart" />
                </div>
                <div class="form-group">
                  <label>লাগবে যে Permission</label>
                  <input class="form-control mono" [(ngModel)]="requiredPermissionCode" name="requiredPermissionCode" placeholder="যেমন: committee.view" />
                </div>
              </div>

              <label class="check"><input type="checkbox" [(ngModel)]="isActive" name="isActive" /> মেনুটি চালু রাখুন</label>

              <div class="preview">
                প্রিভিউ: <strong>{{ labelBn || 'নাম লিখুন' }}</strong>
                @if (creationType === 'SUBMENU') { <span>— নির্বাচিত মেনুর ভেতরে দেখা যাবে</span> }
                @else { <span>— উপরের মেনু বারে দেখা যাবে</span> }
              </div>

              <div class="actions">
                <button class="btn primary" [disabled]="saving()" (click)="create()">
                  {{ saving() ? 'সংরক্ষণ হচ্ছে...' : creationType === 'MENU' ? 'মেনু তৈরি করুন' : 'সাবমেনু তৈরি করুন' }}
                </button>
                <button class="btn" type="button" (click)="resetForm()">ফর্ম পরিষ্কার</button>
              </div>
            </div>
          </section>

          <!-- RIGHT : TREE -->
          <section class="card tree-card">
            <div class="card-head"><strong>বর্তমান মেনু কাঠামো</strong><button class="btn sm" type="button" [disabled]="loading()" (click)="loadMenus()">রিফ্রেশ</button></div>
            <div class="card-body">
              @if (loading()) {
                <p class="muted">মেনু লোড হচ্ছে...</p>
              } @else {
                <ul class="tree">
                  @for (menu of rootMenus(); track menu.id) {
                    <li class="tree-root">
                      <div class="tree-row"><span class="dot"></span><strong>{{ menu.labelBn }}</strong><span class="badge" [class.off]="!menu.isActive">{{ menu.isActive ? 'চালু' : 'বন্ধ' }}</span></div>
                      <div class="tree-meta">{{ menu.routePath || 'কোনো পেজ নেই — শুধু গ্রুপ' }} @if (menu.requiredPermissionCode) { · লাগবে: {{ menu.requiredPermissionCode }} }</div>
                      @if (menu.children?.length) {
                        <ul class="tree-sub">
                          @for (child of menu.children; track child.id) {
                            <li>
                              <div class="tree-row sub"><span class="branch">└</span>{{ child.labelBn }}<span class="badge" [class.off]="!child.isActive">{{ child.isActive ? 'চালু' : 'বন্ধ' }}</span></div>
                              <div class="tree-meta sub-meta">{{ child.routePath || '—' }}</div>
                            </li>
                          }
                        </ul>
                      }
                    </li>
                  } @empty {
                    <li class="muted">কোনো মেনু পাওয়া যায়নি। বাম থেকে প্রথম মেনু তৈরি করুন।</li>
                  }
                </ul>
              }
              <div class="note">টিপস: একই নাম বারবার দেখলে বুঝবেন — উপরেরটা মূল মেনু, নিচেরগুলো তার ভেতরের সাবমেনু।</div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1240px; margin: 0 auto; padding: 0 4px 40px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .page-head h1 { margin: 0; font-size: 1.45rem; color: #0a5c36; }
    .sub { color: #5d6b63; margin: 6px 0 0; }
    .stat { background: #fff; border: 1px solid #e8eee9; border-radius: 10px; padding: 10px 16px; display: flex; gap: 8px; align-items: baseline; }
    .stat strong { font-size: 1.3rem; color: #0a5c36; }
    .stat span { color: #5d6b63; font-size: .85rem; }
    .layout { display: grid; grid-template-columns: 1fr 420px; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .card { background: #fff; border: 1px solid #e8eee9; border-radius: 12px; overflow: hidden; }
    .card-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #e8eee9; flex-wrap: wrap; gap: 8px; }
    .card-body { padding: 18px; }
    .step { font-size: .8rem; color: #5d6b63; }
    .lbl { display: block; font-weight: 700; margin: 18px 0 8px; color: #0a5c36; font-size: .92rem; }
    .lbl:first-child { margin-top: 0; }
    .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .seg button { border: 1px solid #d5ddd8; background: #fff; border-radius: 10px; padding: 12px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 2px; font-size: .95rem; }
    .seg button small { color: #5d6b63; font-weight: 400; }
    .seg button.on { border-color: #0a5c36; background: #eaf5ee; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: .9rem; }
    .form-control { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5ddd8; border-radius: 8px; }
    .mono { font-family: monospace; }
    .hint { color: #6b7a71; font-size: .8rem; display: block; margin-top: 4px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .check { display: flex; gap: 8px; align-items: center; margin: 12px 0; cursor: pointer; font-weight: 600; }
    .preview { background: #f4f8f5; border-radius: 8px; padding: 10px 14px; font-size: .9rem; margin: 10px 0; }
    .actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
    .btn { padding: 10px 16px; border: 1px solid #d5ddd8; background: #f6f8f7; border-radius: 8px; cursor: pointer; }
    .btn.primary { background: #0a5c36; border-color: #0a5c36; color: #fff; }
    .btn.sm { padding: 6px 12px; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; position: relative; }
    .alert.error { background: #fdecea; color: #7f1d1d; }
    .alert.success { background: #e6f4ea; color: #14532d; }
    .x { position: absolute; right: 10px; top: 8px; background: none; border: none; font-size: 1.2rem; cursor: pointer; }
    .tree { list-style: none; margin: 0; padding: 0; }
    .tree-root { padding: 12px 0; border-bottom: 1px solid #f0f4f1; }
    .tree-row { display: flex; gap: 8px; align-items: center; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #0a5c36; flex-shrink: 0; }
    .branch { color: #9aa8a0; }
    .badge { margin-left: auto; font-size: .75rem; background: #e3f1e8; color: #0a5c36; padding: 2px 10px; border-radius: 10px; white-space: nowrap; }
    .badge.off { background: #f0f0f0; color: #5d6b63; }
    .tree-meta { font-size: .82rem; color: #6b7a71; margin: 4px 0 0 16px; }
    .tree-sub { list-style: none; padding-left: 16px; margin-top: 8px; }
    .tree-row.sub { font-size: .92rem; }
    .sub-meta { margin-left: 32px; }
    .note { background: #fff8e6; border: 1px solid #f5e6b8; border-radius: 8px; padding: 10px 12px; font-size: .85rem; margin-top: 14px; }
    .muted { color: #5d6b63; }
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