// F-01 : Audit ইভেন্ট খোঁজ  +  F-02 : ইভেন্টের বিস্তারিত (সারি খুলে)  +  CSV ডাউনলোড (F-03 এর সহজ রূপ)
// ⚠ GET /audit/events এ municipalityId বাধ্যতামূলক; তাই এখানে সংখ্যা দিতে হয় (একবার দিলে session-এ মনে রাখে)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, errMsg, fmtDate, pick } from '../committee/engine-shared';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [ENGINE_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>Audit ইভেন্ট</h1>
        <button class="btn-ghost" [disabled]="!rows().length" (click)="exportCsv()">CSV ডাউনলোড (এই পৃষ্ঠা)</button></div>
      <div class="alert alert-info">এই তালিকা শুধু দেখার জন্য। কোনো ইভেন্ট বদলানো বা মোছা যায় না।</div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="toolbar">
        <label>Municipality ID <input type="number" class="form-control" style="width:130px" [(ngModel)]="muniId" /></label>
        <label>প্রতি পৃষ্ঠায়
          <select class="form-control" [(ngModel)]="size" (ngModelChange)="search()"><option [ngValue]="10">১০</option><option [ngValue]="20">২০</option><option [ngValue]="50">৫০</option></select>
        </label>
        <input class="form-control" style="max-width:240px" placeholder="এই পৃষ্ঠায় খুঁজুন (কাজ, ব্যবহারকারী...)" [ngModel]="q()" (ngModelChange)="q.set($event)" />
        <button class="btn btn-primary" [disabled]="!muniId || loading()" (click)="search()">দেখান</button>
      </div>

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else if (!searched()) { <div class="empty">Municipality ID দিয়ে "দেখান" চাপুন।</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>কখন</th><th>কে</th><th>কাজ</th><th>কীসের উপর</th><th></th></tr></thead>
            <tbody>
              @for (r of filtered(); track $index) {
                <tr>
                  <td>{{ fmt(when(r)) }}</td>
                  <td>{{ who(r) }}</td>
                  <td>{{ pick(r, 'action', 'eventType', 'type') || '—' }}</td>
                  <td>{{ pick(r, 'entityType', 'entity', 'resourceType') || '—' }} <span class="muted">{{ shortId(pick(r, 'entityId', 'resourceId')) }}</span></td>
                  <td><button class="btn-ghost btn-sm" (click)="toggle($index)">{{ open() === $index ? 'লুকান' : 'বিস্তারিত' }}</button></td>
                </tr>
                @if (open() === $index) {
                  <tr><td colspan="5">
                    <div class="grid2">
                      <div><div class="muted">আগের মান</div><pre class="json">{{ pick(r, 'before', 'oldValue', 'beforeData') | json }}</pre></div>
                      <div><div class="muted">পরের মান</div><pre class="json">{{ pick(r, 'after', 'newValue', 'afterData') | json }}</pre></div>
                    </div>
                    <div class="muted" style="margin-top:8px">সম্পূর্ণ রেকর্ড:</div><pre class="json">{{ r | json }}</pre>
                  </td></tr>
                }
              } @empty { <tr><td colspan="5" class="empty">কোনো ইভেন্ট পাওয়া যায়নি।</td></tr> }
            </tbody>
          </table>
          <div class="toolbar" style="margin-top:12px">
            <button class="btn-ghost btn-sm" [disabled]="page === 0" (click)="go(-1)">← আগের</button>
            <span class="muted">পৃষ্ঠা {{ page + 1 }}</span>
            <button class="btn-ghost btn-sm" [disabled]="rows().length < size" (click)="go(1)">পরের →</button>
          </div>
        }
      </div></div>
    </div>
  `,
})
export class AuditListComponent implements OnInit {
  private api = inject(EngineApiService);
  private KEY = 'audit.municipalityId';
  rows = signal<Row[]>([]);
  q = signal('');
  open = signal(-1);
  loading = signal(false); searched = signal(false); err = signal('');
  muniId: number | null = null; page = 0; size = 20;

  pick = pick; fmt = (v: any) => fmtDate(v, true);
  when = (r: Row) => pick(r, 'occurredAt', 'createdAt', 'at', 'timestamp');
  who = (r: Row) => pick(r, 'actorName', 'actor', 'userName', 'actorId') ?? '—';
  shortId = (v: any) => (v ? String(v).slice(0, 8) : '');
  filtered = computed(() => {
    const s = this.q().trim().toLowerCase();
    return s ? this.rows().filter(r => JSON.stringify(r).toLowerCase().includes(s)) : this.rows();
  });

  ngOnInit() {
    const saved = sessionStorage.getItem(this.KEY);
    if (saved) { this.muniId = +saved; this.load(); }
  }
  search() { this.page = 0; this.load(); }
  go(d: number) { this.page = Math.max(0, this.page + d); this.load(); }
  toggle(i: number) { this.open.set(this.open() === i ? -1 : i); }

  load() {
    if (!this.muniId) return;
    sessionStorage.setItem(this.KEY, String(this.muniId));
    this.loading.set(true); this.err.set(''); this.open.set(-1);
    this.api.auditEvents(this.muniId, this.page, this.size).subscribe({
      next: (l) => { this.rows.set(l ?? []); this.loading.set(false); this.searched.set(true); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); this.searched.set(true); },
    });
  }

  exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['সময়', 'ব্যবহারকারী', 'কাজ', 'ধরন', 'ID'];
    const lines = this.filtered().map(r => [
      fmtDate(this.when(r), true), this.who(r), pick(r, 'action', 'eventType', 'type'),
      pick(r, 'entityType', 'entity', 'resourceType'), pick(r, 'entityId', 'resourceId'),
    ].map(esc).join(','));
    const blob = new Blob(['\ufeff' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `audit-page-${this.page + 1}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }
}
