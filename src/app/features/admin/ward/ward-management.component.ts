import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { Ward, WardService } from '../../../core/services/ward.service';


interface MunicipalityOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-ward-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="wm">
      <header class="wm-head">
        <h2>ওয়ার্ড ব্যবস্থাপনা</h2>
        <p class="sub">পৌরসভার ওয়ার্ড তৈরি, সম্পাদনা ও নিষ্ক্রিয় করুন। এই তালিকাই ঠিকানা ফর্মের ওয়ার্ড ড্রপডাউনে দেখাবে।</p>
      </header>

      <!-- শুধু প্ল্যাটফর্ম অ্যাডমিনের জন্য: কোন পৌরসভার ওয়ার্ড দেখবে -->
      <div class="panel" *ngIf="isPlatformAdmin">
        <label class="field">
          <span>পৌরসভা / সিটি কর্পোরেশন</span>
          <select [(ngModel)]="municipalityId" (ngModelChange)="load()">
            <option [ngValue]="null">-- পৌরসভা নির্বাচন করুন --</option>
            <option *ngFor="let m of municipalities" [ngValue]="m.id">{{ m.label }}</option>
          </select>
        </label>
      </div>

      <div class="notice" *ngIf="isPlatformAdmin && municipalityId === null">
        ওয়ার্ড দেখতে আগে একটি পৌরসভা নির্বাচন করুন।
      </div>

      <div class="msg" [class.ok]="message?.type === 'ok'" [class.err]="message?.type === 'err'"
           *ngIf="message" role="status">
        {{ message.text }}
        <button type="button" class="link" (click)="message = null">বন্ধ করুন</button>
      </div>

      <ng-container *ngIf="!isPlatformAdmin || municipalityId !== null">

        <!-- নতুন / সম্পাদনা ফর্ম -->
        <div class="panel" *ngIf="canCreate || editingId !== null">
          <h3>{{ editingId === null ? 'নতুন ওয়ার্ড' : 'ওয়ার্ড সম্পাদনা' }}</h3>
          <div class="row">
            <label class="field narrow">
              <span>ওয়ার্ড নং</span>
              <input type="number" min="1" [(ngModel)]="form.wardNo" />
            </label>
            <label class="field">
              <span>নাম (বাংলা)</span>
              <input type="text" maxlength="100" [(ngModel)]="form.nameBn" placeholder="যেমন: ১ নং ওয়ার্ড" />
            </label>
            <label class="field">
              <span>নাম (ইংরেজি)</span>
              <input type="text" maxlength="100" [(ngModel)]="form.nameEn" placeholder="Ward 1" />
            </label>
          </div>
          <div class="actions">
            <button type="button" class="btn primary" (click)="save()" [disabled]="saving">
              {{ editingId === null ? 'ওয়ার্ড তৈরি করুন' : 'পরিবর্তন সংরক্ষণ করুন' }}
            </button>
            <button type="button" class="btn" *ngIf="editingId !== null" (click)="cancelEdit()">বাতিল</button>
          </div>
        </div>

        <!-- একসাথে অনেক ওয়ার্ড -->
        <div class="panel" *ngIf="canCreate && editingId === null">
          <h3>একসাথে অনেক ওয়ার্ড তৈরি</h3>
          <div class="row">
            <label class="field narrow">
              <span>কয়টি ওয়ার্ড</span>
              <input type="number" min="1" max="200" [(ngModel)]="bulk.count" />
            </label>
            <label class="field narrow">
              <span>শুরুর নম্বর</span>
              <input type="number" min="1" [(ngModel)]="bulk.startFrom" />
            </label>
            <div class="field hint">
              যে নম্বরের ওয়ার্ড আগে থেকে আছে সেগুলো বাদ দিয়ে বাকিগুলো তৈরি হবে।
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn" (click)="bulkCreate()" [disabled]="saving">
              {{ toBn(bulk.count || 0) }}টি ওয়ার্ড তৈরি করুন
            </button>
          </div>
        </div>

        <!-- তালিকা -->
        <div class="panel">
          <div class="list-head">
            <h3>ওয়ার্ড তালিকা ({{ toBn(filtered.length) }})</h3>
            <div class="filters">
              <input type="search" [(ngModel)]="search" placeholder="নাম বা নম্বর দিয়ে খুঁজুন" />
              <label class="check">
                <input type="checkbox" [(ngModel)]="showInactive" />
                নিষ্ক্রিয় সহ
              </label>
            </div>
          </div>

          <div class="empty" *ngIf="loading">লোড হচ্ছে...</div>
          <div class="empty" *ngIf="!loading && wards.length === 0">
            এই পৌরসভায় এখনও কোনো ওয়ার্ড নেই। উপরের "একসাথে অনেক ওয়ার্ড তৈরি" থেকে শুরু করুন।
          </div>
          <div class="empty" *ngIf="!loading && wards.length > 0 && filtered.length === 0">
            খোঁজার সাথে মেলে এমন কোনো ওয়ার্ড নেই।
          </div>

          <div class="table-wrap" *ngIf="!loading && filtered.length > 0">
            <table>
              <thead>
                <tr>
                  <th>নং</th>
                  <th>নাম (বাংলা)</th>
                  <th>নাম (ইংরেজি)</th>
                  <th>অবস্থা</th>
                  <th class="end">কাজ</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let w of filtered" [class.inactive]="!w.active" [class.editing]="w.id === editingId">
                  <td class="num">{{ toBn(w.wardNo) }}</td>
                  <td>{{ w.nameBn }}</td>
                  <td>{{ w.nameEn || '—' }}</td>
                  <td>
                    <span class="badge" [class.off]="!w.active">{{ w.active ? 'সক্রিয়' : 'নিষ্ক্রিয়' }}</span>
                  </td>
                  <td class="end">
                    <button type="button" class="link" *ngIf="canUpdate" (click)="edit(w)">সম্পাদনা</button>
                    <button type="button" class="link" *ngIf="canUpdate && !w.active" (click)="reactivate(w)">সক্রিয় করুন</button>
                    <button type="button" class="link danger" *ngIf="canDelete && w.active" (click)="deactivate(w)">নিষ্ক্রিয় করুন</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .wm { --g: #0a5c36; --g-dark: #074628; --bg: #f1f5f2; --line: #d5ddd7; --ink: #1d2a22;
          --muted: #5c6b61; --danger: #b3261e; --warn-bg: #fff6df;
          color: var(--ink); max-width: 960px; }
    .wm-head h2 { margin: 0 0 4px; font-size: 20px; }
    .sub { margin: 0 0 16px; color: var(--muted); font-size: 14px; max-width: 70ch; }
    h3 { margin: 0 0 12px; font-size: 16px; }
    .panel { background: #fff; border: 1px solid var(--line); border-radius: 6px;
             padding: 16px; margin-bottom: 14px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
    .field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 200px; font-size: 13px; }
    .field.narrow { flex: 0 0 130px; }
    .field.hint { color: var(--muted); align-self: center; flex: 2 1 220px; }
    .field input, .field select, .filters input[type=search] {
      padding: 8px 10px; border: 1px solid var(--line); border-radius: 4px;
      font: inherit; background: #fff; min-height: 38px; }
    input:focus-visible, select:focus-visible, button:focus-visible {
      outline: 2px solid var(--g); outline-offset: 2px; }
    .actions { margin-top: 14px; display: flex; gap: 8px; }
    .btn { padding: 8px 16px; border: 1px solid var(--g); background: #fff; color: var(--g);
           border-radius: 4px; font: inherit; cursor: pointer; min-height: 38px; }
    .btn.primary { background: var(--g); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--g-dark); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .link { background: none; border: 0; color: var(--g); cursor: pointer; font: inherit;
            padding: 4px 6px; text-decoration: underline; }
    .link.danger { color: var(--danger); }
    .notice { background: var(--warn-bg); border: 1px solid #ecd9a0; padding: 10px 14px;
              border-radius: 6px; margin-bottom: 14px; font-size: 14px; }
    .msg { padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 14px;
           display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .msg.ok { background: #e6f4ec; border: 1px solid #b7dcc6; }
    .msg.err { background: #fdeceb; border: 1px solid #f1b9b5; color: var(--danger); }
    .list-head { display: flex; justify-content: space-between; align-items: center;
                 flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .list-head h3 { margin: 0; }
    .filters { display: flex; gap: 12px; align-items: center; }
    .check { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; background: var(--bg); padding: 8px 10px; border-bottom: 1px solid var(--line);
         font-weight: 600; }
    td { padding: 8px 10px; border-bottom: 1px solid var(--line); }
    .end { text-align: right; white-space: nowrap; }
    .num { font-weight: 600; width: 60px; }
    tr.inactive td { color: var(--muted); }
    tr.editing td { background: #eef8f2; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; background: #e6f4ec; color: var(--g-dark); }
    .badge.off { background: #eceeed; color: var(--muted); }
    .empty { padding: 18px 4px; color: var(--muted); font-size: 14px; }
  `]
})
export class WardManagementComponent implements OnInit {
  /** ঐচ্ছিক: না দিলে AuthService থেকে রোল দেখে নিজেই ঠিক করবে */
  @Input() isPlatformAdmin = false;
  /** বাটন দেখানোর জন্য মাত্র। আসল নিরাপত্তা ব্যাকএন্ডের @PreAuthorize এ আছে */
  @Input() canCreate = true;
  @Input() canUpdate = true;
  @Input() canDelete = true;

  municipalities: MunicipalityOption[] = [];
  municipalityId: number | null = null;

  wards: Ward[] = [];
  loading = false;
  saving = false;
  message: { type: 'ok' | 'err'; text: string } | null = null;

  search = '';
  showInactive = true;

  editingId: number | null = null;
  form: { wardNo: number | null; nameBn: string; nameEn: string } = this.emptyForm();
  bulk: { count: number; startFrom: number } = { count: 9, startFrom: 1 };

  constructor(
    private wardService: WardService,
    private admin: AdminService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // রুট দিয়ে খুললে @Input আসে না, তাই রোল থেকে নিজেই ঠিক করি
    this.isPlatformAdmin =
      this.isPlatformAdmin ||
      this.auth.hasRole('PLATFORM_ADMIN') ||
      this.auth.hasRole('ROLE_PLATFORM_ADMIN');

    if (this.isPlatformAdmin) {
      this.loadMunicipalities();
    } else {
      this.load();
    }
  }

  get filtered(): Ward[] {
    const q = this.search.trim().toLowerCase();
    return this.wards.filter(w => {
      if (!this.showInactive && !w.active) return false;
      if (!q) return true;
      return (
        String(w.wardNo).includes(q) ||
        this.toBn(w.wardNo).includes(q) ||
        w.nameBn.toLowerCase().includes(q) ||
        (w.nameEn ?? '').toLowerCase().includes(q)
      );
    });
  }

  // ---------- লোড ----------

  private loadMunicipalities(): void {
    // আপনার user-admin কম্পোনেন্টের মতোই AdminService.getMunicipalities() ব্যবহার করছি
    this.admin.getMunicipalities().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const items: any[] = Array.isArray(data) ? data : data?.municipalities ?? [];
        this.municipalities = items.map(m => ({
          id: m.id,
          label: m.nameBn || m.nameEn || m.name || m.code || `#${m.id}`
        }));
      },
      error: err => this.fail(err, 'পৌরসভার তালিকা আনা যায়নি')
    });
  }

  load(): void {
    if (this.isPlatformAdmin && this.municipalityId === null) {
      this.wards = [];
      return;
    }
    this.loading = true;
    this.wardService.listForManagement(this.municipalityId).subscribe({
      next: list => { this.wards = list; this.loading = false; },
      error: err => { this.loading = false; this.fail(err, 'ওয়ার্ড তালিকা আনা যায়নি'); }
    });
  }

  // ---------- তৈরি / সম্পাদনা ----------

  save(): void {
    const wardNo = Number(this.form.wardNo);
    const nameBn = this.form.nameBn.trim();
    if (!wardNo || wardNo < 1) return this.warn('ওয়ার্ড নম্বর ১ বা তার বেশি হতে হবে');
    if (!nameBn) return this.warn('বাংলা নাম লিখুন');

    const body = { wardNo, nameBn, nameEn: this.form.nameEn.trim() || null };
    this.saving = true;

    if (this.editingId === null) {
      this.wardService.create(body, this.municipalityId).subscribe({
        next: () => this.done('ওয়ার্ড তৈরি হয়েছে'),
        error: err => this.failSaving(err, 'ওয়ার্ড তৈরি করা যায়নি')
      });
    } else {
      const current = this.wards.find(w => w.id === this.editingId);
      this.wardService.update(this.editingId, { ...body, active: current?.active ?? true }, this.municipalityId).subscribe({
        next: () => this.done('ওয়ার্ড হালনাগাদ হয়েছে'),
        error: err => this.failSaving(err, 'ওয়ার্ড হালনাগাদ করা যায়নি')
      });
    }
  }

  edit(w: Ward): void {
    this.editingId = w.id;
    this.form = { wardNo: w.wardNo, nameBn: w.nameBn, nameEn: w.nameEn ?? '' };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  // ---------- বাল্ক ----------

  bulkCreate(): void {
    const count = Number(this.bulk.count);
    const startFrom = Number(this.bulk.startFrom) || 1;
    if (!count || count < 1 || count > 200) return this.warn('ওয়ার্ডের সংখ্যা ১ থেকে ২০০ এর মধ্যে দিন');

    this.saving = true;
    this.wardService.bulkCreate({ count, startFrom }, this.municipalityId).subscribe({
      next: created => {
        const skipped = count - created.length;
        const extra = skipped > 0 ? ` (${this.toBn(skipped)}টি আগে থেকেই ছিল, বাদ দেওয়া হয়েছে)` : '';
        this.done(`${this.toBn(created.length)}টি ওয়ার্ড তৈরি হয়েছে${extra}`);
      },
      error: err => this.failSaving(err, 'ওয়ার্ড তৈরি করা যায়নি')
    });
  }

  // ---------- নিষ্ক্রিয় / সক্রিয় ----------

  deactivate(w: Ward): void {
    if (!confirm(`${w.nameBn} নিষ্ক্রিয় করবেন? ড্রপডাউনে আর দেখাবে না, তবে আগের তথ্য থাকবে।`)) return;
    this.wardService.deactivate(w.id, this.municipalityId).subscribe({
      next: () => this.done('ওয়ার্ড নিষ্ক্রিয় করা হয়েছে'),
      error: err => this.fail(err, 'ওয়ার্ড নিষ্ক্রিয় করা যায়নি')
    });
  }

  reactivate(w: Ward): void {
    this.wardService.update(
      w.id,
      { wardNo: w.wardNo, nameBn: w.nameBn, nameEn: w.nameEn ?? null, active: true },
      this.municipalityId
    ).subscribe({
      next: () => this.done('ওয়ার্ড সক্রিয় করা হয়েছে'),
      error: err => this.fail(err, 'ওয়ার্ড সক্রিয় করা যায়নি')
    });
  }

  // ---------- সহায়ক ----------

  toBn(n: number | string): string {
    const d = '০১২৩৪৫৬৭৮৯';
    return String(n).replace(/\d/g, c => d[+c]);
  }

  private emptyForm() {
    return { wardNo: null as number | null, nameBn: '', nameEn: '' };
  }

  private done(text: string): void {
    this.saving = false;
    this.message = { type: 'ok', text };
    this.cancelEdit();
    this.load();
  }

  private warn(text: string): void {
    this.message = { type: 'err', text };
  }

  private fail(err: any, fallback: string): void {
    this.message = { type: 'err', text: this.errorText(err, fallback) };
  }

  private failSaving(err: any, fallback: string): void {
    this.saving = false;
    this.fail(err, fallback);
  }

  private errorText(err: any, fallback: string): string {
    if (err?.status === 403) return 'এই কাজের অনুমতি আপনার নেই। রোলে পারমিশন দিয়ে লগআউট-লগইন করুন।';
    return err?.error?.message || err?.error?.error || fallback;
  }
}