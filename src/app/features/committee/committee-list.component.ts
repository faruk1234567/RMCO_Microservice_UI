// C-01 : কমিটির তালিকা - ধরন / কার্যপরিধি / সদস্য / সর্বশেষ পরিবর্তন FIX + Reject FIX
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, committeeName, errMsg, fmtDate, idOf, pick } from './engine-shared';

type ApprovalInfo = { approved: number; total: number; isRejected: boolean; rejectedStepNo: number | null };

@Component({
  selector: 'app-committee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES, `
    .data-table th { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 14px; white-space: nowrap; }
    .data-table td { padding: 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 14px; color: #1e293b; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .committee-name { font-weight: 600; color: #0f172a; }
    .muted-text { color: #64748b; }
    .st { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; white-space: nowrap; }
    .st::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .st-DRAFT { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .st-SUBMITTED, .st-UNDER_APPROVAL, .st-IN_APPROVAL { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .st-ACTIVE { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
    .st-REJECTED { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .progress-cell { min-width: 210px; }
    .progress-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .progress-label { font-size: 13px; font-weight: 600; color: #0f172a; }
    .progress-bar { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 8px 0 6px; }
    .progress-fill { height: 100%; background: #1d4ed8; border-radius: 999px; transition: width 0.3s ease; }
    .progress-fill.done { background: #059669; }
    .progress-fill.rejected { background: #dc2626; }
    .progress-text { font-size: 12px; color: #64748b; line-height: 1.5; }
    .badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; line-height: 1.4; border: 1px solid transparent; white-space: nowrap; }
    .badge-done { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
    .badge-progress { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .badge-waiting { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
    .badge-rejected { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .member-count { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; font-weight: 600; color: #334155; }
  `],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কমিটি</h1>
        <div class="row-actions">
          <a routerLink="/committee/hierarchy" class="btn-ghost" style="text-decoration:none">কার্যপরিধি অনুযায়ী দেখুন</a>
          <a routerLink="/committee/create" class="btn btn-primary">নতুন কমিটি গঠন</a>
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
            <thead><tr><th>নাম</th><th>ধরন</th><th>কার্যপরিধি</th><th>সদস্য</th><th>অবস্থা</th><th>অনুমোদনের অগ্রগতি</th><th>সর্বশেষ পরিবর্তন</th><th></th></tr></thead>
            <tbody>
              @for (r of pageRows(); track id(r)) {
                <tr>
                  <td><span class="committee-name">{{ name(r) }}</span></td>
                  <td>{{ typeOf(r) }}</td>
                  <td>{{ scopeOf(r) }}</td>
                  <td>
                    @if (memberCountOf(r) === '—') { <span class="muted-text">—</span> }
                    @else { <span class="member-count">{{ memberCountOf(r) }}</span> }
                  </td>
                  <td><span [class]="'st st-' + effectiveStatus(r)">{{ bn(effectiveStatus(r)) }}</span></td>
                  <td class="progress-cell">
                    @if (r['status'] === 'DRAFT') {
                      <span class="muted-text">—</span>
                    } @else {
                      @if (approval(id(r)); as a) {
                        <div class="progress-top">
                          <span class="progress-label">ধাপ {{ a.approved }} / {{ a.total }}</span>
                          @if (a.isRejected) {
                            <span class="badge badge-rejected">প্রত্যাখ্যাত</span>
                          } @else if (a.approved === a.total) {
                            <span class="badge badge-done">সম্পূর্ণ অনুমোদিত</span>
                          } @else if (a.approved === 0) {
                            <span class="badge badge-waiting">অনুমোদন শুরু হয়নি</span>
                          } @else {
                            <span class="badge badge-progress">{{ a.approved }} ধাপ সম্পন্ন</span>
                          }
                        </div>
                        <div class="progress-bar"><div class="progress-fill" [class.done]="a.approved === a.total && !a.isRejected" [class.rejected]="a.isRejected" [style.width.%]="a.approved / a.total * 100"></div></div>
                        <div class="progress-text">
                          @if (a.isRejected) { ধাপ {{ a.rejectedStepNo }} এ প্রত্যাখ্যাত — পরের ধাপ বাতিল }
                          @else if (a.approved === a.total) { সকল ধাপ অনুমোদিত }
                          @else if (a.approved === 0) { প্রথম ধাপের অপেক্ষায় }
                          @else { ধাপ {{ a.approved }} অনুমোদিত — ধাপ {{ a.approved + 1 }} চলমান }
                        </div>
                      } @else {
                        <span class="muted-text">লোড হচ্ছে...</span>
                      }
                    }
                  </td>
                  <td>{{ fmt(updatedOf(r)) }}</td>
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
            <button class="btn-ghost btn-sm" [disabled]="page() === 0" (click)="page.set(page() - 1)">আগের</button>
            <span class="muted">পৃষ্ঠা {{ page() + 1 }} / {{ pages() }}</span>
            <button class="btn-ghost btn-sm" [disabled]="page() + 1 >= pages()" (click)="page.set(page() + 1)">পরের</button>
          </div>
        }
      </div></div>
    </div>
  `,
})
export class CommitteeListComponent implements OnInit {
  private api = inject(EngineApiService);
  tabs = [
    { v: '', l: 'সব' }, { v: 'DRAFT', l: 'খসড়া' }, { v: 'IN_APPROVAL', l: 'অনুমোদনাধীন' },
    { v: 'ACTIVE', l: 'সক্রিয়' }, { v: 'REJECTED', l: 'প্রত্যাখ্যাত' },
  ];
  all = signal<Row[]>([]);
  approvals = signal<Map<string, ApprovalInfo>>(new Map());
  tab = signal('');
  q = signal('');
  page = signal(0);
  size = 10;
  loading = signal(true);
  err = signal('');

  pick = pick; id = idOf; name = committeeName; fmt = (v: any) => fmtDate(v, true);
  bn = (s: string) => STATUS_BN[s] ?? s;
  approval = (committeeId: string) => this.approvals().get(committeeId);

  filtered = computed(() => {
    const t = this.tab(), s = this.q().trim().toLowerCase();
    return this.all().filter(r => this.matches(r, t) && (!s || committeeName(r).toLowerCase().includes(s)));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size)));
  pageRows = computed(() => this.filtered().slice(this.page() * this.size, (this.page() + 1) * this.size));

  // ★ Approval Reject হলে Committee-র আসল অবস্থা REJECTED
  effectiveStatus = (r: Row): string => {
    const a = this.approvals().get(idOf(r));
    if (a?.isRejected) return 'REJECTED';
    return String(r['status'] ?? '');
  };

  matches = (r: Row, v: string): boolean =>
    !v || (v === 'IN_APPROVAL' ? ['SUBMITTED', 'UNDER_APPROVAL'].includes(r['status']) : r['status'] === v);
  count = (v: string) => this.all().filter(r => this.matches(r, v)).length;

  // ★ Detail থেকে আসা ডাটা সহ সব জায়গা থেকে খুঁজবে
  private deep = (r: Row): Row => ({ ...r, ...(r['payload'] ?? {}), ...(r['fields'] ?? {}), ...(r['body'] ?? {}), ...(r['_detail'] ?? {}) });

  // ★ ধরন - Detail এর fields / type থেকে
  typeOf = (r: Row): string => {
    const d = this.deep(r);
    const fields = (d['_detail']?.['fields'] ?? d['fields'] ?? {}) as any;
    const fromFields = fields['committeeType'] ?? fields['type'] ?? fields['typeName'] ?? fields['ধরন'];
    if (fromFields) return String(fromFields);
    return pick(d, 'typeName', 'typeNameBn', 'committeeTypeName', 'committeeType', 'type', 'typeBn', 'category', 'categoryName', 'committeeCategory') ?? '—';
  };

  // ★ কার্যপরিধি - Detail এর fields / scope থেকে
  scopeOf = (r: Row): string => {
    const d = this.deep(r);
    const fields = (d['_detail']?.['fields'] ?? d['fields'] ?? {}) as any;
    const fromFields = fields['scope'] ?? fields['scopeName'] ?? fields['কার্যপরিধি'] ?? fields['ward'] ?? fields['coverage'];
    if (fromFields) return String(fromFields);
    const scopeObj = d['_detail']?.['scope'] ?? d['scope'] as any;
    if (scopeObj && typeof scopeObj === 'object') {
      const v = scopeObj['nameBn'] ?? scopeObj['name'] ?? scopeObj['label'];
      if (v) return String(v);
    }
    return pick(d, 'scopeName', 'scopeNameBn', 'scopeNodeName', 'scope', 'scopeLabel', 'wardName', 'coverage', 'coverageName', 'areaName', 'jurisdiction') ?? '—';
  };

  // ★ সদস্য - Detail এর members array থেকে গুনবে
  memberCountOf = (r: Row): string => {
    const d = this.deep(r);
    const count = pick(d, 'memberCount', 'activeMemberCount', 'membersCount', 'totalMembers');
    if (count != null) return String(count);
    const members = (r['_detail']?.['members'] ?? r['members'] ?? d['members'] ?? []) as any[];
    if (Array.isArray(members) && members.length > 0) return String(members.length);
    return '—';
  };

  // ★ সর্বশেষ পরিবর্তন - Detail এর updatedAt / statusHistory থেকে
  updatedOf = (r: Row): any => {
    const d = this.deep(r);
    const detail = r['_detail'] as any;
    const v = detail?.['updatedAt'] ?? detail?.['modifiedAt'] ?? pick(d, 'updatedAt', 'modifiedAt', 'updated_at', 'lastModifiedAt', 'lastUpdated', 'modifiedOn');
    if (v) return v;
    const history = (detail?.['statusHistory'] ?? r['statusHistory'] ?? d['statusHistory'] ?? []) as any[];
    if (Array.isArray(history) && history.length > 0) {
      return history[history.length - 1]?.['createdAt'] ?? history[history.length - 1]?.['updatedAt'];
    }
    return pick(d, 'createdAt', 'submittedAt');
  };

  ngOnInit() {
    this.api.listCommittees().subscribe({
      next: (l) => {
        this.all.set(l ?? []);
        this.loading.set(false);
        this.loadDetails(l ?? []);
        this.loadApprovals(l ?? []);
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  // ★ আসল FIX - প্রতিটা কমিটির Detail এনে ধরন / কার্যপরিধি / সদস্য / সর্বশেষ পরিবর্তন ভরে দেওয়া
  private loadDetails(list: Row[]) {
    for (const r of list) {
      if (r['status'] === 'DRAFT') continue;
      const committeeId = idOf(r);
      this.api.getCommittee(committeeId).subscribe({
        next: (detail: any) => {
          if (!detail) return;
          this.all.update(rows => rows.map(row => {
            if (idOf(row) !== committeeId) return row;
            return { ...row, _detail: detail };
          }));
        },
        error: () => { /* Detail না আসলেও লিস্ট চলবে */ },
      });
    }
  }

  private loadApprovals(list: Row[]) {
    for (const r of list) {
      if (r['status'] === 'DRAFT') continue;
      const committeeId = idOf(r);
      if (this.approvals().has(committeeId)) continue;
      this.api.getApprovalDetailByCommittee(committeeId).subscribe({
        next: (d: any) => {
          const steps = d?.steps ?? [];
          const norm = (v: any) => String(v ?? '').trim().toUpperCase();
          const approved = steps.filter((s: any) => norm(s.decision) === 'APPROVED').length;
          const rejected = steps.find((s: any) => norm(s.decision) === 'REJECTED');
          this.approvals.update(m => {
            const next = new Map(m);
            next.set(committeeId, {
              approved,
              total: Number(d?.totalSteps ?? steps.length ?? 0),
              isRejected: !!rejected,
              rejectedStepNo: rejected ? Number(rejected.stepNo) : null,
            });
            return next;
          });
        },
        error: () => { },
      });
    }
  }

  setTab(v: string) { this.tab.set(v); this.page.set(0); }
}