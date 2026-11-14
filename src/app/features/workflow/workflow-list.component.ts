// D-01 : অনুমোদনকারীর inbox (আমার অপেক্ষমাণ অনুরোধ) - UPDATED - COMPLETE - FINAL
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EngineApiService } from '../../core/services/engine-api.service';
import { MunicipalityCacheService } from '../../core/services/municipality-cache.service';
import { AuthService } from '../../core/services/auth.service';
import { ENGINE_STYLES, Row, STATUS_BN, errMsg, fmtDate, idOf, pick } from '../committee/engine-shared';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES, `
    .progress-cell { min-width: 240px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 6px 0; }
    .progress-fill { height: 100%; background: #16a34a; transition: width 0.3s; }
    .step-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; padding: 3px 9px; border-radius: 999px; font-weight: 600; border: 1px solid transparent; }
    .chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .chip-approved { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
    .chip-pending { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .chip-current { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .chip-rejected { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .approved-by { font-size: 12px; color: #475569; margin-top: 4px; }
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
            <thead><tr><th>বিষয়</th><th>পৌরসভা</th><th>ধাপ</th><th>অনুমোদনের অগ্রগতি</th><th>অবস্থা</th><th>জমার তারিখ</th><th>সময়সীমা</th><th></th></tr></thead>
            <tbody>
              @for (r of filtered(); track id(r)) {
                <tr>
                  <td><strong>{{ title(r) }}</strong></td>
                  <td>{{ municipalityName(r) }}</td>
                  <td>{{ pick(r, 'levelNo', 'stepNo', 'currentLevel', 'currentStepNo') ?? '—' }}</td>
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
                            @if (s.decision === 'APPROVED') { ধাপ {{ s.stepNo }} অনুমোদিত }
                            @else if (s.decision === 'REJECTED') { ধাপ {{ s.stepNo }} বাতিল }
                            @else if (s.isCurrentStep) { ধাপ {{ s.stepNo }} চলমান }
                            @else { ধাপ {{ s.stepNo }} অপেক্ষায় }
                          </span>
                        }
                      </div>
                      @if (lastApproved(d); as last) {
                        <div class="approved-by">{{ last.decidedByName ?? 'অনুমোদক' }} • {{ fmt(last.decidedAt) }}</div>
                      }
                    } @else { <span class="muted">লোড হচ্ছে...</span> }
                  </td>
                  <td><span [class]="'st st-' + r['status']">{{ bn(r['status']) }}</span></td>
                  <td>{{ fmt(pick(r, 'submittedAt', 'createdAt')) }}</td>
                  <td>{{ fmt(pick(r, 'dueAt', 'deadline')) }} @if (overdue(r)) { <span class="st st-REJECTED">সময় পেরিয়েছে</span> }</td>
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
  private http = inject(HttpClient);
  private munCache = inject(MunicipalityCacheService);
  private auth = inject(AuthService); // ★ List এও AuthService যোগ করা

  items = signal<Row[]>([]);
  details = signal<Map<string, any>>(new Map());
  q = signal(''); onlyOverdue = signal(false);
  loading = signal(true); err = signal('');
  id = idOf; pick = pick; fmt = (v: any) => fmtDate(v, true); bn = (s: string) => STATUS_BN[s] ?? s;

  title = (r: Row): string => pick(r, 'committeeName', 'nameBn', 'title', 'subject', 'entityName') ?? ('অনুরোধ #' + idOf(r).slice(0, 8));

  // ★ পৌরসভার নাম - Detail -> Row -> AuthService + Cache
  municipalityName = (r: Row): string => {
    const d: any = this.details().get(idOf(r));
    const direct = d ? pick(d, 'municipalityName', 'municipalityNameBn', 'municipalityNameEn', 'municipality') ?? pick(d?.['data'], 'municipalityName', 'municipalityNameBn') : null;
    if (direct) return String(direct);
    const munId = String(d?.['municipalityId'] ?? d?.['data']?.['municipalityId'] ?? r['municipalityId'] ?? '').trim();
    if (munId) {
      const cached = this.munCache.getName(munId);
      if (cached) return cached;
    }
    const rowName = pick(r, 'municipalityName', 'municipalityNameBn');
    if (rowName) return String(rowName);
    // ★ Fallback - Login User এর পৌরসভা (Header এর মতো)
    const user = this.auth.currentUser();
    const userMunId = String((user as any)?.municipalityId ?? '').trim();
    if (userMunId) {
      const cached = this.munCache.getName(userMunId);
      if (cached) return cached;
    }
    return '—';
  };

  overdue = (r: Row): boolean => { const d = pick(r, 'dueAt', 'deadline'); return !!d && new Date(d).getTime() < Date.now(); };
  overdueCount = computed(() => this.items().filter(r => this.overdue(r)).length);
  filtered = computed(() => {
    const s = this.q().trim().toLowerCase();
    return this.items().filter(r => (!s || this.title(r).toLowerCase().includes(s)) && (!this.onlyOverdue() || this.overdue(r)));
  });

  detail = (requestId: string) => this.details().get(requestId);
  approvedCount = (d: any): number => (d?.steps ?? []).filter((s: any) => s.decision === 'APPROVED').length;
  lastApproved = (d: any): any | null => {
    const approved = (d?.steps ?? []).filter((s: any) => s.decision === 'APPROVED');
    return approved.length ? approved[approved.length - 1] : null;
  };

  ngOnInit() { this.load(); }

 load() {
  this.loading.set(true); this.err.set('');
  this.loadMunicipalities(); // ★ এইটা শুধু ensureLoaded কল করবে
  this.api.myPending().subscribe({
    next: (l) => { this.items.set(l ?? []); this.loading.set(false); this.loadDetails(l ?? []); },
    error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
  });
}


 private loadMunicipalities() {
  this.munCache.ensureLoaded().subscribe({ error: () => {} });
}

  // ★ Detail - my-pending List থেকে, getApprovalDetail কল হবে না (404)
  private loadDetails(list: Row[]) {
    const next = new Map<string, any>();
    for (const r of list) {
      const requestId = idOf(r);
      const steps: any[] = (r['steps'] ?? r['approvalSteps'] ?? r['stepInstances'] ?? r['history'] ?? []) as any[];
      const totalSteps = Number(r['totalSteps'] ?? r['totalStepCount'] ?? steps.length ?? 0) || steps.length;
      next.set(requestId, {
        totalSteps,
        steps: steps.map((s: any, i: number) => ({
          stepNo: Number(s['stepNo'] ?? s['levelNo'] ?? s['step'] ?? i + 1),
          decision: String(s['decision'] ?? s['status'] ?? 'PENDING'),
          isCurrentStep: Boolean(s['isCurrentStep'] ?? s['isCurrent'] ?? String(s['stepNo'] ?? s['levelNo']) === String(r['stepNo'] ?? r['levelNo'])),
          decidedByName: s['decidedByName'] ?? s['approverName'] ?? s['decidedBy'] ?? null,
          decidedAt: s['decidedAt'] ?? s['decided_at'] ?? s['updatedAt'] ?? null,
          municipalityId: r['municipalityId'] ?? s['municipalityId'] ?? null,
          municipalityName: r['municipalityName'] ?? r['municipalityNameBn'] ?? s['municipalityName'] ?? null,
        })),
      });
    }
    this.details.set(next);
  }
}