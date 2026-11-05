// C-01 : কমিটির তালিকা ও খোঁজ  +  C-03 : আমার খসড়া (ট্যাব "খসড়া")
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, committeeName, errMsg, fmtDate, idOf, pick } from './engine-shared';

@Component({
  selector: 'app-committee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কমিটি</h1>
        <div class="row-actions">
          <a routerLink="/committee/hierarchy" class="btn-ghost" style="text-decoration:none">কার্যপরিধি অনুযায়ী দেখুন</a>
          <a routerLink="/committee/create" class="btn btn-primary">+ নতুন কমিটি গঠন</a>
        </div>
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="tabs-row">
        @for (t of tabs; track t.v) {
          <button class="tab-btn" [class.active]="tab() === t.v" (click)="setTab(t.v)">{{ t.l }} ({{ count(t.v) }})</button>
        }
      </div>

      <div class="toolbar">
        <input class="form-control" style="max-width:300px" placeholder="কমিটির নাম দিয়ে খুঁজুন" [ngModel]="q()" (ngModelChange)="q.set($event); page.set(0)" />
        <span class="muted">{{ filtered().length }}টি ফলাফল</span>
      </div>

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else if (!filtered().length) {
          <div class="empty">
            @if (tab() === 'DRAFT') { কোনো অসম্পূর্ণ খসড়া নেই। } @else { কোনো কমিটি পাওয়া যায়নি। }
          </div>
        } @else {
          <table class="data-table">
            <thead><tr><th>নাম</th><th>ধরন</th><th>কার্যপরিধি</th><th>সদস্য</th><th>অবস্থা</th><th>সর্বশেষ পরিবর্তন</th><th></th></tr></thead>
            <tbody>
              @for (r of pageRows(); track id(r)) {
                <tr>
                  <td><strong>{{ name(r) }}</strong></td>
                  <td>{{ pick(r, 'typeName', 'committeeTypeName', 'typeNameBn') || '—' }}</td>
                  <td>{{ pick(r, 'scopeName', 'scopeNodeName') || '—' }}</td>
                  <td>{{ pick(r, 'memberCount', 'activeMemberCount') ?? '—' }}</td>
                  <td><span [class]="'st st-' + r['status']">{{ bn(r['status']) }}</span></td>
                  <td>{{ fmt(pick(r, 'updatedAt', 'createdAt')) }}</td>
                  <td>
                    @if (r['status'] === 'DRAFT') {
                      <a class="btn-ghost btn-sm" style="text-decoration:none" routerLink="/committee/create" [queryParams]="{ draftId: id(r) }">চালিয়ে যান</a>
                    } @else {
                      <a class="btn-ghost btn-sm" style="text-decoration:none" [routerLink]="['/committee', id(r)]">বিস্তারিত</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="toolbar" style="margin-top:12px">
            <button class="btn-ghost btn-sm" [disabled]="page() === 0" (click)="page.set(page() - 1)">← আগের</button>
            <span class="muted">পৃষ্ঠা {{ page() + 1 }} / {{ pages() }}</span>
            <button class="btn-ghost btn-sm" [disabled]="page() + 1 >= pages()" (click)="page.set(page() + 1)">পরের →</button>
          </div>
        }
      </div></div>
    </div>
  `,
})
export class CommitteeListComponent implements OnInit {
  private api = inject(EngineApiService);
  tabs = [
    { v: '', l: 'সব' }, { v: 'DRAFT', l: 'খসড়া' }, { v: 'PENDING_APPROVAL', l: 'অনুমোদনাধীন' },
    { v: 'ACTIVE', l: 'সক্রিয়' }, { v: 'REJECTED', l: 'প্রত্যাখ্যাত' },
  ];
  all = signal<Row[]>([]);
  tab = signal('');
  q = signal('');
  page = signal(0);
  size = 10;
  loading = signal(true);
  err = signal('');

  pick = pick; id = idOf; name = committeeName; fmt = (v: any) => fmtDate(v, true);
  bn = (s: string) => STATUS_BN[s] ?? s;

  filtered = computed(() => {
    const t = this.tab(), s = this.q().trim().toLowerCase();
    return this.all().filter(r => (!t || r['status'] === t) && (!s || committeeName(r).toLowerCase().includes(s)));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size)));
  pageRows = computed(() => this.filtered().slice(this.page() * this.size, (this.page() + 1) * this.size));
  count = (v: string) => this.all().filter(r => !v || r['status'] === v).length;

  ngOnInit() {
    this.api.listCommittees().subscribe({
      next: (l) => { this.all.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
  setTab(v: string) { this.tab.set(v); this.page.set(0); }
}
