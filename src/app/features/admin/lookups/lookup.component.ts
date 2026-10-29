import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'http://localhost:8080/identity-service/api/v1';
const NEW = '__new__';

interface Row {
  serial?: number;
  division: string;
  district: string;
  upazila: string;
  union: string;
}

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .search-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .tbl-wrap { max-height:55vh; overflow:auto; }
    .footer-bar { display:flex; justify-content:space-between; align-items:center; margin-top:14px; }
    .total { font-weight:600; }
    .backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex;
                align-items:center; justify-content:center; z-index:1000; }
    .modal { background:#fff; border-radius:10px; width:560px; max-width:95vw; padding:22px;
             max-height:90vh; overflow:auto; }
    .modal h3 { margin:0 0 16px; }
    .fld { margin-bottom:14px; }
    .fld label { display:block; margin-bottom:4px; font-size:.85rem; }
    .fld .form-control { width:100%; margin-bottom:6px; }
    .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:10px; }
    @media (max-width:800px){ .search-grid{ grid-template-columns:1fr 1fr; } }
  `],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>Lookup / মাস্টার ডাটা</h1></div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) {
        <div class="alert alert-success" style="display:flex;justify-content:space-between;align-items:center">
          <span>{{ successMsg() }}</span>
          <button type="button" (click)="successMsg.set('')"
                  style="background:none;border:none;font-size:1.2rem;cursor:pointer;line-height:1">&times;</button>
        </div>
      }

      <!-- Search -->
      <div class="card mb-2">
        <div class="card-body">
          <div class="search-grid">
            <div class="form-group"><label>ডিভিশন</label>
              <input class="form-control" placeholder="ডিভিশন খুঁজুন" [ngModel]="fDiv()" (ngModelChange)="fDiv.set($event)" /></div>
            <div class="form-group"><label>জেলা</label>
              <input class="form-control" placeholder="জেলা খুঁজুন" [ngModel]="fDis()" (ngModelChange)="fDis.set($event)" /></div>
            <div class="form-group"><label>উপজেলা</label>
              <input class="form-control" placeholder="উপজেলা খুঁজুন" [ngModel]="fUpa()" (ngModelChange)="fUpa.set($event)" /></div>
            <div class="form-group"><label>ইউনিয়ন</label>
              <input class="form-control" placeholder="ইউনিয়ন খুঁজুন" [ngModel]="fUni()" (ngModelChange)="fUni.set($event)" /></div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-body">
          <div class="tbl-wrap table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:70px">ক্রমিক</th>
                  <th>ডিভিশন</th>
                  <th>জেলা</th>
                  <th>উপজেলা</th>
                  <th>ইউনিয়ন</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filtered(); track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ r.division || '—' }}</td>
                    <td>{{ r.district || '—' }}</td>
                    <td>{{ r.upazila || '—' }}</td>
                    <td>{{ r.union || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (loading()) { <p style="padding:12px">লোড হচ্ছে...</p> }
            @if (!loading() && !filtered().length) { <p style="padding:12px">কোনো ডাটা পাওয়া যায়নি।</p> }
          </div>

          <div class="footer-bar">
            <span class="total">মোট: {{ filtered().length }}</span>
            <button class="btn btn-primary" (click)="openForm()">+ অ্যাড লুকআপ ডাটা</button>
          </div>
        </div>
      </div>

      <!-- Add form -->
      @if (showForm()) {
        <div class="backdrop" (click)="closeForm()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>নতুন লুকআপ ডাটা</h3>

            <div class="fld">
              <label>ডিভিশন</label>
              <select class="form-control" [(ngModel)]="selDiv" (ngModelChange)="selDis=''; selUpa=''">
                <option value="">-- নির্বাচন করুন --</option>
                @for (d of divisions(); track d.id) { <option [value]="d.id">{{ name(d) }}</option> }
                <option [value]="NEW">+ নতুন ডিভিশন</option>
              </select>
              @if (selDiv === NEW) {
                <input class="form-control" placeholder="নতুন ডিভিশনের নাম (বাংলা)" [(ngModel)]="nDiv" />
                <input class="form-control" placeholder="Division name (English)" [(ngModel)]="eDiv" />
              }
            </div>

            <div class="fld">
              <label>জেলা</label>
              <select class="form-control" [(ngModel)]="selDis" (ngModelChange)="selUpa=''" [disabled]="!selDiv">
                <option value="">-- নির্বাচন করুন --</option>
                @for (d of districts(); track d.id) { <option [value]="d.id">{{ name(d) }}</option> }
                @if (selDiv) { <option [value]="NEW">+ নতুন জেলা</option> }
              </select>
              @if (selDis === NEW) {
                <input class="form-control" placeholder="নতুন জেলার নাম (বাংলা)" [(ngModel)]="nDis" />
                <input class="form-control" placeholder="District name (English)" [(ngModel)]="eDis" />
              }
            </div>

            <div class="fld">
              <label>উপজেলা</label>
              <select class="form-control" [(ngModel)]="selUpa" [disabled]="!selDis">
                <option value="">-- নির্বাচন করুন --</option>
                @for (d of upazilas(); track d.id) { <option [value]="d.id">{{ name(d) }}</option> }
                @if (selDis) { <option [value]="NEW">+ নতুন উপজেলা</option> }
              </select>
              @if (selUpa === NEW) {
                <input class="form-control" placeholder="নতুন উপজেলার নাম (বাংলা)" [(ngModel)]="nUpa" />
                <input class="form-control" placeholder="Upazila name (English)" [(ngModel)]="eUpa" />
              }
            </div>

            <div class="fld">
              <label>ইউনিয়ন (ঐচ্ছিক)</label>
              <input class="form-control" placeholder="ইউনিয়নের নাম (বাংলা)" [(ngModel)]="nUni" [disabled]="!selUpa" />
              <input class="form-control" placeholder="Union name (English)" [(ngModel)]="eUni" [disabled]="!selUpa" />
            </div>

            <div class="actions">
              <button class="btn btn-secondary" (click)="closeForm()" [disabled]="saving()">বাতিল</button>
              <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'সেভ হচ্ছে...' : 'সেভ করুন' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class LookupComponent implements OnInit, OnDestroy {
  readonly NEW = NEW;

  tree = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  // search filters
  fDiv = signal(''); fDis = signal(''); fUpa = signal(''); fUni = signal('');

  // form state
  selDiv = ''; selDis = ''; selUpa = '';
  nDiv = ''; nDis = ''; nUpa = ''; nUni = '';
  eDiv = ''; eDis = ''; eUpa = ''; eUni = '';

  constructor(private http: HttpClient) {}

  private msgTimer: any;

  ngOnInit() { this.loadTree(); }

  ngOnDestroy() { clearTimeout(this.msgTimer); }

  private flashSuccess(msg: string) {
    clearTimeout(this.msgTimer);
    this.successMsg.set(msg);
    this.msgTimer = setTimeout(() => this.successMsg.set(''), 4000);
  }

  // ---------- helpers ----------
  name(n: any): string {
    return n?.nameBn || n?.name_bn || n?.name || n?.nameEn || n?.name_en || '';
  }
  private kids(n: any): any[] {
    return n?.children || n?.child || n?.items || [];
  }

  // ---------- data ----------
  loadTree() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.get<any>(`${API}/lookups/geo-tree`, { params: { _t: Date.now() } }).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || res?.items || [];
        this.tree.set(list);
        console.log('geo-tree', list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set((err?.error?.message || 'ডাটা লোড ব্যর্থ।') + ' (HTTP ' + err?.status + ')');
      },
    });
  }

  // flatten tree -> rows
  rows = computed<Row[]>(() => {
    const out: Row[] = [];
    for (const dv of this.tree()) {
      const dvN = this.name(dv);
      const dsList = this.kids(dv);
      if (!dsList.length) { out.push({ division: dvN, district: '', upazila: '', union: '' }); continue; }
      for (const ds of dsList) {
        const dsN = this.name(ds);
        const upList = this.kids(ds);
        if (!upList.length) { out.push({ division: dvN, district: dsN, upazila: '', union: '' }); continue; }
        for (const up of upList) {
          const upN = this.name(up);
          const unList = this.kids(up);
          if (!unList.length) { out.push({ division: dvN, district: dsN, upazila: upN, union: '' }); continue; }
          for (const un of unList) {
            out.push({ division: dvN, district: dsN, upazila: upN, union: this.name(un) });
          }
        }
      }
    }
    return out;
  });

  filtered = computed<Row[]>(() => {
    const m = (v: string, q: string) => !q.trim() || v.toLowerCase().includes(q.trim().toLowerCase());
    const a = this.fDiv(), b = this.fDis(), c = this.fUpa(), d = this.fUni();
    return this.rows().filter(
      (r) => m(r.division, a) && m(r.district, b) && m(r.upazila, c) && m(r.union, d)
    );
  });

  // ---------- form dropdown lists ----------
  divisions = computed(() => this.tree());
  districts() {
    const dv = this.tree().find((x) => String(x.id) === this.selDiv);
    return dv ? this.kids(dv) : [];
  }
  upazilas() {
    const dv = this.tree().find((x) => String(x.id) === this.selDiv);
    const ds = dv ? this.kids(dv).find((x: any) => String(x.id) === this.selDis) : null;
    return ds ? this.kids(ds) : [];
  }

  openForm() {
    this.selDiv = this.selDis = this.selUpa = '';
    this.nDiv = this.nDis = this.nUpa = this.nUni = '';
    this.eDiv = this.eDis = this.eUpa = this.eUni = '';
    this.errorMsg.set('');
    this.successMsg.set('');
    this.showForm.set(true);
  }
  closeForm() { if (!this.saving()) this.showForm.set(false); }

  // ---------- save ----------
  private async create(category: string, nameBn: string, nameEn: string, parentId: string | null): Promise<string> {
    // TODO: আপনার POST API অনুযায়ী URL/body মিলিয়ে নিন
    const slug = nameEn.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const code = slug || (category + '_' + Date.now().toString(36)).toUpperCase();
    const body: any = { category, code, nameBn, nameEn: nameEn.trim(), parentId, sortOrder: 0, isActive: true };
    const res: any = await firstValueFrom(this.http.post(`${API}/lookups`, body));
    return String(res?.id ?? res?.data?.id ?? '');
  }

  async save() {
    this.errorMsg.set('');
    if (!this.selDiv || (this.selDiv === NEW && !this.nDiv.trim())) {
      this.errorMsg.set('ডিভিশন দিন।'); return;
    }
    if (this.selDiv === NEW && !this.eDiv.trim()) { this.errorMsg.set('ডিভিশনের ইংরেজি নাম দিন।'); return; }
    if (!this.selDis || (this.selDis === NEW && !this.nDis.trim())) {
      this.errorMsg.set('জেলা দিন।'); return;
    }
    if (this.selDis === NEW && !this.eDis.trim()) { this.errorMsg.set('জেলার ইংরেজি নাম দিন।'); return; }
    if (!this.selUpa || (this.selUpa === NEW && !this.nUpa.trim())) {
      this.errorMsg.set('উপজেলা দিন।'); return;
    }
    if (this.selUpa === NEW && !this.eUpa.trim()) { this.errorMsg.set('উপজেলার ইংরেজি নাম দিন।'); return; }
    if (this.nUni.trim() && !this.eUni.trim()) { this.errorMsg.set('ইউনিয়নের ইংরেজি নাম দিন।'); return; }

    this.saving.set(true);
    try {
      let divId = this.selDiv;
      if (divId === NEW) divId = await this.create('DIVISION', this.nDiv.trim(), this.eDiv, null);

      let disId = this.selDis;
      if (disId === NEW) disId = await this.create('DISTRICT', this.nDis.trim(), this.eDis, divId);

      let upaId = this.selUpa;
      if (upaId === NEW) upaId = await this.create('UPAZILA', this.nUpa.trim(), this.eUpa, disId);

      if (this.nUni.trim()) await this.create('UNION', this.nUni.trim(), this.eUni, upaId);

      this.saving.set(false);
      this.showForm.set(false);
      this.flashSuccess('সফলভাবে সেভ হয়েছে।');
      this.loadTree(); // আগের পেজে আবার ডাটা লোড
    } catch (err: any) {
      this.saving.set(false);
      this.errorMsg.set(err?.error?.message || 'সেভ ব্যর্থ।');
    }
  }
}