// D-01 : অনুমোদনকারীর inbox (আমার অপেক্ষমাণ অনুরোধ) - UPDATED
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, errMsg, fmtDate, idOf, pick } from '../committee/engine-shared';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES, `
    .progress-cell { min-width: 220px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 4px 0; }
    .progress-fill { height: 100%; background: #22c55e; transition: width 0.3s; }
    .step-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .chip { font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .chip-approved { background: #dcfce7; color: #166534; }
    .chip-pending { background: #fef3c7; color: #92400e; }
    .chip-current { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .chip-rejected { background: #fee2e2; color: #991b1b; }
    .approved-by { font-size: 12px; color: #475569; margin-top: 2px; }
  `],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>অনুমোদনের অপেক্ষায় ({{ items().length }})</h1>
        <button class="btn-ghost" (click)="load()">রিফ্রেশ</button></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="toolbar">
        <input class="form-control" style="max-width:280px" placeholder="নাম দিয়ে খুঁজুন" [ngModel]="q()" (ngModelChange)="q.set($event)" />
        <label class="check"><input type="checkbox" [ngModel]="onlyOverdue()" (ngModelChange)="onlyOverdue.set($event)" /> শুধু সময়সীমা পেরোনো</label>
        <span class="muted">{{ overdueCount() }}টির সময়সীমা পেরিয়েছে</span>
      </div>

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else if (!filtered().length) { <div class="empty">আপনার সিদ্ধান্তের অপেক্ষায় কোনো অনুরোধ নেই।</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>বিষয়</th><th>ধাপ</th><th>অনুমোদনের অগ্রগতি</th><th>অবস্থা</th><th>জমার তারিখ</th><th>সময়সীমা</th><th></th></tr></thead>
            <tbody>
              @for (r of filtered(); track id(r)) {
                <tr>
                  <td><strong>{{ title(r) }}</strong></td>
                  <td>{{ pick(r, 'levelNo', 'stepNo', 'currentLevel', 'currentStepNo') ?? '—' }}</td>

                  <!-- ★ নতুন কলাম - Step 1 Approve হইছে কিনা এখানেই দেখাবে -->
                  <td class="progress-cell">
                    @if (detail(id(r)); as d) {
                      <div><strong>ধাপ {{ approvedCount(d) }} / {{ d.totalSteps }} সম্পন্ন</strong></div>
                      <div class="progress-bar"><div class="progress-fill" [style.width.%]="approvedCount(d) / d.totalSteps * 100"></div></div>
                      <div class="step-chips">
                        @for (s of d.steps; track s.stepNo) {
                          <span class="chip"
                            [class.chip-approved]="s.decision === 'APPROVED'"
                            [class.chip-pending]="s.decision === 'PENDING' && !s.isCurrentStep"
                            [class.chip-current]="s.isCurrentStep"
                            [class.chip-rejected]="s.decision === 'REJECTED'">
                            @if (s.decision === 'APPROVED') { ✅ ধাপ {{ s.stepNo }} অনুমোদিত }
                            @else if (s.decision === 'REJECTED') { ❌ ধাপ {{ s.stepNo }} বাতিল }
                            @else if (s.isCurrentStep) { ⏳ ধাপ {{ s.stepNo }} চলমান }
                            @else { ⏳ ধাপ {{ s.stepNo }} অপেক্ষায় }
                          </span>
                        }
                      </div>
                      @if (lastApproved(d); as last) {
                        <div class="approved-by">✅ {{ last.decidedByName ?? last.decidedBy }} • {{ fmt(last.decidedAt) }}</div>
                      }
                    } @else {
                      <span class="muted">লোড হচ্ছে...</span>
                    }
                  </td>

                  <td><span [class]="'st st-' + r['status']">{{ bn(r['status']) }}</span></td>
                  <td>{{ fmt(pick(r, 'submittedAt', 'createdAt')) }}</td>
                  <td>
                    {{ fmt(pick(r, 'dueAt', 'deadline')) }}
                    @if (overdue(r)) { <span class="st st-REJECTED">সময় পেরিয়েছে</span> }
                  </td>
                  <td><a class="btn btn-primary btn-sm" [routerLink]="['/workflow', id(r)]">দেখুন ও সিদ্ধান্ত</a></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div></div>
    </div>
  `,
})
export class WorkflowListComponent implements OnInit {
  private api = inject(EngineApiService);
  items = signal<Row[]>([]);
  // requestId -> ApprovalDetail
  details = signal<Map<string, any>>(new Map());
  q = signal(''); onlyOverdue = signal(false);
  loading = signal(true); err = signal('');
  id = idOf; pick = pick; fmt = (v: any) => fmtDate(v, true); bn = (s: string) => STATUS_BN[s] ?? s;

  title = (r: Row): string => pick(r, 'committeeName', 'nameBn', 'title', 'subject', 'entityName') ?? ('অনুরোধ #' + idOf(r).slice(0, 8));
  overdue = (r: Row): boolean => { const d = pick(r, 'dueAt', 'deadline'); return !!d && new Date(d).getTime() < Date.now(); };
  overdueCount = computed(() => this.items().filter(r => this.overdue(r)).length);
  filtered = computed(() => {
    const s = this.q().trim().toLowerCase();
    return this.items().filter(r => (!s || this.title(r).toLowerCase().includes(s)) && (!this.onlyOverdue() || this.overdue(r)));
  });

  // ★ নতুন helper - Detail থেকে হিসাব
  detail = (requestId: string) => this.details().get(requestId);
  approvedCount = (d: any): number => (d?.steps ?? []).filter((s: any) => s.decision === 'APPROVED').length;
  lastApproved = (d: any): any | null => {
    const approved = (d?.steps ?? []).filter((s: any) => s.decision === 'APPROVED');
    return approved.length ? approved[approved.length - 1] : null;
  };

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.err.set('');
    this.api.myPending().subscribe({
      next: (l) => {
        this.items.set(l ?? []);
        this.loading.set(false);
        this.loadDetails(l ?? []);
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  // ★ প্রতিটা Request এর Detail (Step সহ) লোড করা
  private loadDetails(list: Row[]) {
    for (const r of list) {
      const requestId = idOf(r);
      // আপনার EngineApiService এ getApprovalDetail থাকতে হবে
      this.api.getApprovalDetail(requestId).subscribe({
        next: (d: any) => {
          this.details.update(m => {
            const next = new Map(m);
            next.set(requestId, d);
            return next;
          });
        },
        error: () => { /* Detail না আসলেও লিস্ট চলবে */ },
      });
    }
  }
}