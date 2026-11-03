// B-13 : কনফিগ পরিবর্তনের ইতিহাস (শুধু-পড়া)
// ⚠ backend API আপনার ডকুমেন্টে নেই; endpoint অনুমান করা
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { ConfigChangeLog } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-change-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>কনফিগ পরিবর্তনের ইতিহাস</h1></div>
      <div class="alert alert-info">এই তালিকা শুধু দেখার জন্য। কোনো রেকর্ড বদলানো বা মোছা যায় না।</div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="toolbar">
        <select class="form-control" style="max-width:220px" [(ngModel)]="entity">
          <option value="">সব ধরন</option>
          @for (e of entities; track e.v) { <option [value]="e.v">{{ e.l }}</option> }
        </select>
        <label>থেকে <input type="date" class="form-control" [(ngModel)]="from" /></label>
        <label>পর্যন্ত <input type="date" class="form-control" [(ngModel)]="to" /></label>
        <button class="btn btn-primary" (click)="search()">খুঁজুন</button>
      </div>

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>কখন</th><th>কে</th><th>কী</th><th>কাজ</th><th></th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td>{{ r.at | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ r.actorName }}</td>
                  <td>{{ r.entity }}</td>
                  <td>{{ r.action }}</td>
                  <td><button class="btn-ghost btn-sm" (click)="toggle(r.id)">{{ open() === r.id ? 'লুকান' : 'আগের ও পরের মান' }}</button></td>
                </tr>
                @if (open() === r.id) {
                  <tr><td colspan="5">
                    <div class="grid2">
                      <div><div class="muted">আগে</div><pre class="json">{{ r.before | json }}</pre></div>
                      <div><div class="muted">পরে</div><pre class="json">{{ r.after | json }}</pre></div>
                    </div>
                  </td></tr>
                }
              } @empty { <tr><td colspan="5" class="empty">কোনো ইতিহাস পাওয়া যায়নি।</td></tr> }
            </tbody>
          </table>
          <div class="toolbar" style="margin-top:12px">
            <button class="btn-ghost" [disabled]="page === 0" (click)="go(-1)">← আগের</button>
            <span class="muted">পৃষ্ঠা {{ page + 1 }}</span>
            <button class="btn-ghost" [disabled]="rows().length < size" (click)="go(1)">পরের →</button>
          </div>
        }
      </div></div>
    </div>
  `,
})
export class ChangeLogComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  entities = [
    { v: 'COMMITTEE_TYPE', l: 'কমিটির ধরন' }, { v: 'TYPE_VERSION', l: 'ধরনের সংস্করণ' },
    { v: 'APPROVAL_ROUTE', l: 'অনুমোদন রুট' }, { v: 'SCOPE', l: 'কার্যপরিধি' },
    { v: 'MASTER_ITEM', l: 'ধারণ তালিকা' }, { v: 'UPLOAD_POLICY', l: 'আপলোড নীতি' },
  ];
  rows = signal<ConfigChangeLog[]>([]);
  loading = signal(false); err = signal(''); open = signal('');
  entity = ''; from = ''; to = ''; page = 0; size = 20;

  ngOnInit() { this.load(); }
  search() { this.page = 0; this.load(); }
  go(d: number) { this.page = Math.max(0, this.page + d); this.load(); }
  toggle(id: string) { this.open.set(this.open() === id ? '' : id); }
  load() {
    this.loading.set(true); this.err.set('');
    this.svc.changeLog({ entity: this.entity, from: this.from, to: this.to, page: this.page, size: this.size }).subscribe({
      next: (r) => { this.rows.set(r ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
