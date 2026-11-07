import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

interface PermissionItem {
  code: string;
  permissionGroup: string;
  labelBn: string;
  labelEn: string;
  isMenu: boolean;
  parentCode: string | null;
  sortOrder: number;
}
interface Row { p: PermissionItem; depth: number; }
type Kind = 'menu' | 'submenu' | 'action';

const ACTIONS = [
  { v: 'create', bn: 'তৈরি', en: 'Create' },
  { v: 'edit', bn: 'সম্পাদনা', en: 'Edit' },
  { v: 'delete', bn: 'মুছা', en: 'Delete' },
  { v: 'approve', bn: 'অনুমোদন', en: 'Approve' },
  { v: 'export', bn: 'এক্সপোর্ট', en: 'Export' },
];

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <div class="head">
      <div>
        <h2>Permission ব্যবস্থাপনা</h2>
        <p class="muted">মেনু ও অ্যাকশন permission তৈরি করুন। Code নিজে তৈরি হবে।</p>
      </div>
      <div class="head-actions">
        <button class="btn" (click)="loadPermissions()">রিফ্রেশ</button>
        <button class="btn primary" (click)="openCreate()">+ নতুন Permission</button>
      </div>
    </div>

    <div class="info">
      নতুন permission তৈরির পর <b>Roles → পারমিশন নীতি</b> ট্যাবে গিয়ে পৌরসভার জন্য চালু করুন,
      তারপর রোলে দিন।
    </div>

    @if (successMessage) { <div class="alert success">{{ successMessage }}<button class="x" (click)="successMessage=''">×</button></div> }
    @if (errorMessage && !showModal) { <div class="alert error">{{ errorMessage }}<button class="x" (click)="errorMessage=''">×</button></div> }

    <div class="panel">
      <div class="panel-head">
        <strong>সব Permission ({{ permissions.length }})</strong>
        <input class="input search" placeholder="খুঁজুন..." [(ngModel)]="search" />
      </div>

      @if (loading) { <p class="pad muted">লোড হচ্ছে...</p> }
      @else {
        <table>
          <thead><tr><th>নাম</th><th>Code</th><th>ধরন</th><th>Group</th></tr></thead>
          <tbody>
            @for (r of visibleRows(); track r.p.code) {
              <tr>
                <td [style.padding-left.px]="12 + r.depth * 24">
                  @if (r.depth > 0) { <span class="branch">└</span> }
                  <strong>{{ r.p.labelBn }}</strong>
                  <small class="muted"> {{ r.p.labelEn }}</small>
                </td>
                <td><code>{{ r.p.code }}</code></td>
                <td>
                  <span class="tag" [class.menu]="r.p.isMenu">{{ r.p.isMenu ? 'মেনু' : 'অ্যাকশন' }}</span>
                </td>
                <td>{{ r.p.permissionGroup }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="pad muted">কিছু পাওয়া যায়নি।</td></tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showModal) {
      <div class="overlay" (click)="showModal=false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>নতুন Permission</h3>
            <button class="btn sm" (click)="showModal=false">×</button>
          </div>

          <div class="modal-body">
            @if (errorMessage) { <div class="alert error">{{ errorMessage }}</div> }

            <label class="lbl">১. কী তৈরি করবেন?</label>
            <div class="kinds">
              <button [class.on]="kind==='menu'" (click)="setKind('menu')">
                <b>মেনু</b><small>সাইডবারের প্রধান মেনু</small></button>
              <button [class.on]="kind==='submenu'" (click)="setKind('submenu')">
                <b>সাবমেনু</b><small>কোনো মেনুর ভেতরের পেজ</small></button>
              <button [class.on]="kind==='action'" (click)="setKind('action')">
                <b>অ্যাকশন</b><small>তৈরি / সম্পাদনা / মুছা ইত্যাদি</small></button>
            </div>

            @if (kind !== 'menu') {
              <label class="lbl">
                ২. {{ kind==='submenu' ? 'কোন মেনুর ভেতরে?' : 'কোন মেনু/পেজের অ্যাকশন?' }}
              </label>
              <select class="input" [ngModel]="parentCode" (ngModelChange)="onParentChange($event)">
                <option value="">-- বাছাই করুন --</option>
                @for (m of parentOptions(); track m.code) {
                  <option [value]="m.code">{{ m.labelBn }} ({{ m.code }})</option>
                }
              </select>
            }

            @if (kind === 'menu') {
              <label class="lbl">২. Group</label>
              <input class="input" list="groups" [ngModel]="group"
                     (ngModelChange)="group=$event.toUpperCase().replace(' ','_')"
                     placeholder="যেমন CONFIG" />
              <datalist id="groups">
                @for (g of groups(); track g) { <option [value]="g"></option> }
              </datalist>
              <small class="muted">আগের group বাছুন অথবা নতুন নাম লিখুন।</small>
            }

            @if (kind === 'action') {
              <label class="lbl">৩. কোন অ্যাকশন?</label>
              <select class="input" [ngModel]="action" (ngModelChange)="onActionChange($event)">
                @for (a of actions; track a.v) { <option [value]="a.v">{{ a.en }} ({{ a.bn }})</option> }
                <option value="__custom">অন্য...</option>
              </select>
              @if (action === '__custom') {
                <input class="input mt" [ngModel]="customAction"
                       (ngModelChange)="customAction=cleanKey($event); autoFill()"
                       placeholder="ইংরেজিতে, যেমন print" />
              }
            } @else {
              <label class="lbl">৩. ইংরেজি Key (ছোট হাতের, স্পেস ছাড়া)</label>
              <input class="input" [ngModel]="key" (ngModelChange)="key=cleanKey($event)"
                     placeholder="ward" />
            }

            <div class="row2">
              <div>
                <label class="lbl">বাংলা নাম *</label>
                <input class="input" [(ngModel)]="labelBn" (ngModelChange)="bnTouched=true"
                       placeholder="ওয়ার্ড" />
              </div>
              <div>
                <label class="lbl">English Name *</label>
                <input class="input" [(ngModel)]="labelEn" (ngModelChange)="enTouched=true"
                       placeholder="Ward" />
              </div>
            </div>

            <div class="preview">
              <span class="muted">তৈরি হবে যে Code:</span>
              <code>{{ generatedCode() || '—' }}</code>
            </div>

            <details>
              <summary>অ্যাডভান্সড (Sort Order)</summary>
              <label class="lbl">Sort Order</label>
              <input class="input" type="number" [(ngModel)]="sortOrder" />
              <small class="muted">নিজে থেকে পরের নম্বর বসানো হয়েছে।</small>
            </details>
          </div>

          <div class="modal-foot">
            <button class="btn" (click)="showModal=false">বাতিল</button>
            <button class="btn primary" [disabled]="saving || !canSave()" (click)="save()">
              {{ saving ? 'সংরক্ষণ...' : 'তৈরি করুন' }}
            </button>
          </div>
        </div>
      </div>
    }
  </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto;padding:0 4px 40px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    .head h2{margin:0}.head-actions{display:flex;gap:8px}
    .muted{color:#6b7a71}.pad{padding:16px}
    .info{background:#eef6ff;border:1px solid #cfe3fa;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.9rem}
    .alert{position:relative;padding:10px 36px 10px 14px;border-radius:8px;margin-bottom:12px}
    .alert.success{background:#e6f4ea;color:#14532d}.alert.error{background:#fdecea;color:#7f1d1d}
    .x{position:absolute;right:10px;top:6px;background:none;border:none;font-size:1.2rem;cursor:pointer}
    .panel{background:#fff;border:1px solid #e8eee9;border-radius:12px;overflow:hidden}
    .panel-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e8eee9;gap:12px}
    .search{max-width:240px}
    table{width:100%;border-collapse:collapse}
    th{background:#f4f8f5;text-align:left;padding:10px 12px;font-size:.8rem;text-transform:uppercase;color:#5d6b63}
    td{padding:10px 12px;border-bottom:1px solid #f0f4f1}
    .branch{color:#9aa8a0;margin-right:6px}
    .tag{background:#f0f0f0;border-radius:10px;padding:2px 10px;font-size:.78rem}
    .tag.menu{background:#e3f1e8;color:#0a5c36}
    .btn{padding:8px 14px;border:1px solid #d5ddd8;background:#f6f8f7;border-radius:8px;cursor:pointer}
    .btn.primary{background:#0a5c36;border-color:#0a5c36;color:#fff}
    .btn:disabled{opacity:.5;cursor:not-allowed}.btn.sm{padding:2px 10px}
    .input{width:100%;padding:9px 12px;border:1px solid #d5ddd8;border-radius:8px;box-sizing:border-box}
    .mt{margin-top:8px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:#fff;border-radius:12px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column}
    .modal-head{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #e8eee9}
    .modal-head h3{margin:0;color:#0a5c36}
    .modal-body{padding:16px 20px;overflow:auto}
    .modal-foot{padding:12px 20px;border-top:1px solid #e8eee9;display:flex;justify-content:flex-end;gap:8px}
    .lbl{display:block;font-weight:600;margin:14px 0 6px;font-size:.9rem}
    .kinds{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .kinds button{border:1px solid #d5ddd8;background:#fff;border-radius:10px;padding:10px;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:2px}
    .kinds button small{color:#6b7a71;font-size:.75rem}
    .kinds button.on{border-color:#0a5c36;background:#eaf5ee}
    .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .preview{margin-top:16px;background:#f4f8f5;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:4px}
    .preview code{font-size:1rem;color:#0a5c36;font-weight:700}
    details{margin-top:14px}summary{cursor:pointer;color:#5d6b63}
  `],
})
export class PermissionManagementComponent implements OnInit {
  permissions: PermissionItem[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  search = '';

  showModal = false;
  actions = ACTIONS;

  kind: Kind = 'menu';
  parentCode = '';
  group = '';
  key = '';
  action = 'create';
  customAction = '';
  labelBn = '';
  labelEn = '';
  sortOrder = 0;
  bnTouched = false;
  enTouched = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void { this.loadPermissions(); }

  // ---------- load ----------
  loadPermissions(): void {
    this.loading = true;
    this.adminService.getPermissions().subscribe({
      next: (response: any) => {
        const result = response?.data ?? response?.result ?? response;
        this.permissions = Array.isArray(result) ? result : [];
        this.loading = false;
      },
      error: (e: any) => {
        this.loading = false;
        this.errorMessage = e?.error?.message || 'Permission তালিকা লোড করা যায়নি।';
      },
    });
  }

  // ---------- tree list ----------
  visibleRows(): Row[] {
    const q = this.search.trim().toLowerCase();
    const all = this.buildRows();
    if (!q) return all;
    return all.filter(r =>
      (r.p.code + r.p.labelBn + r.p.labelEn + r.p.permissionGroup).toLowerCase().includes(q));
  }

  private buildRows(): Row[] {
    const byParent = new Map<string, PermissionItem[]>();
    const codes = new Set(this.permissions.map(p => p.code));
    const roots: PermissionItem[] = [];
    for (const p of this.permissions) {
      if (p.parentCode && codes.has(p.parentCode)) {
        if (!byParent.has(p.parentCode)) byParent.set(p.parentCode, []);
        byParent.get(p.parentCode)!.push(p);
      } else roots.push(p);
    }
    const sort = (a: PermissionItem, b: PermissionItem) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    const rows: Row[] = [];
    const walk = (p: PermissionItem, depth: number) => {
      rows.push({ p, depth });
      (byParent.get(p.code) || []).sort(sort).forEach(c => walk(c, depth + 1));
    };
    roots.sort((a, b) => a.permissionGroup.localeCompare(b.permissionGroup) || sort(a, b))
         .forEach(r => walk(r, 0));
    return rows;
  }

  groups(): string[] {
    return Array.from(new Set(this.permissions.map(p => p.permissionGroup))).sort();
  }

  parentOptions(): PermissionItem[] {
    // মেনু/সাবমেনু (isMenu = true) গুলোই parent হতে পারবে
    return this.permissions.filter(p => p.isMenu);
  }

  // ---------- form ----------
  openCreate() {
    this.kind = 'menu';
    this.parentCode = ''; this.group = ''; this.key = '';
    this.action = 'create'; this.customAction = '';
    this.labelBn = ''; this.labelEn = '';
    this.bnTouched = false; this.enTouched = false;
    this.errorMessage = '';
    this.sortOrder = this.nextSort(null);
    this.showModal = true;
  }

  setKind(k: Kind) {
    this.kind = k;
    this.parentCode = '';
    this.bnTouched = false; this.enTouched = false;
    this.labelBn = ''; this.labelEn = '';
    this.sortOrder = this.nextSort(null);
  }

  onParentChange(code: string) {
    this.parentCode = code;
    this.sortOrder = this.nextSort(code || null);
    this.autoFill();
  }

  onActionChange(v: string) { this.action = v; this.autoFill(); }

  cleanKey(v: string): string {
    return (v || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  private parent(): PermissionItem | undefined {
    return this.permissions.find(p => p.code === this.parentCode);
  }

  private actionKey(): string {
    return this.action === '__custom' ? this.customAction : this.action;
  }

  // অ্যাকশনের ক্ষেত্রে নাম অটো বসে (ব্যবহারকারী বদলালে আর ছোঁয়া হয় না)
  autoFill() {
    if (this.kind !== 'action') return;
    const par = this.parent();
    const a = ACTIONS.find(x => x.v === this.action);
    if (!par || !a) return;
    if (!this.bnTouched) this.labelBn = `${par.labelBn} ${a.bn}`;
    if (!this.enTouched) this.labelEn = `${a.en} ${par.labelEn}`;
  }

  private nextSort(parent: string | null): number {
    const sib = this.permissions.filter(p => (p.parentCode || null) === parent);
    return sib.length ? Math.max(...sib.map(p => p.sortOrder ?? 0)) + 1 : 1;
  }

  generatedCode(): string {
    if (this.kind === 'menu') {
      const g = this.group.trim().toLowerCase();
      return g && this.key ? `${g}.${this.key}.view` : '';
    }
    const par = this.parent();
    if (!par) return '';
    const parts = par.code.split('.');
    if (this.kind === 'submenu') {
      return this.key ? `${par.permissionGroup.toLowerCase()}.${this.key}.view` : '';
    }
    // action: parent code-এর শেষ অংশ বদলে action বসে
    const a = this.actionKey();
    if (!a) return '';
    parts[parts.length - 1] = a;
    return parts.join('.');
  }

  private effectiveGroup(): string {
    return this.kind === 'menu' ? this.group.trim() : (this.parent()?.permissionGroup || '');
  }

  canSave(): boolean {
    return !!this.generatedCode() && !!this.labelBn.trim() && !!this.labelEn.trim()
      && !!this.effectiveGroup();
  }

  save(): void {
    this.errorMessage = '';
    const code = this.generatedCode();

    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/.test(code)) {
      this.errorMessage = 'Code-এর ফরম্যাট ঠিক নয়। Key-তে শুধু ইংরেজি ছোট হাতের অক্ষর ও সংখ্যা দিন।';
      return;
    }
    if (this.permissions.some(p => p.code === code)) {
      this.errorMessage = `"${code}" আগে থেকেই আছে। অন্য নাম/অ্যাকশন বাছুন।`;
      return;
    }

    this.saving = true;
    this.adminService.createPermission({
      code,
      permissionGroup: this.effectiveGroup(),
      labelBn: this.labelBn.trim(),
      labelEn: this.labelEn.trim(),
      isMenu: this.kind !== 'action',
      parentCode: this.kind === 'menu' ? null : this.parentCode || null,
      sortOrder: this.sortOrder ?? 0,
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.success === false) {
          this.errorMessage = res?.message || 'Permission তৈরি হয়নি।';
          return;
        }
        this.successMessage = `"${code}" তৈরি হয়েছে। এখন Roles → পারমিশন নীতি থেকে পৌরসভার জন্য চালু করুন।`;
        this.showModal = false;
        this.loadPermissions();
      },
      error: (e: any) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Permission তৈরি করা যায়নি।';
      },
    });
  }
}