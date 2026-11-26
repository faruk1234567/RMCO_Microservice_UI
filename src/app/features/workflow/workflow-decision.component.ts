// D-02 / D-03 : অনুরোধের বিস্তারিত ও সিদ্ধান্ত (Approve / Reject)
// ⚠ অনুরোধের আলাদা GET API নেই, তাই my-pending তালিকা থেকে অনুরোধটি খুঁজে দেখানো হয়
// ★ UPDATED: sourceType অনুযায়ী COMMITTEE / PROPOSAL আলাদা হ্যান্ডেল
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigService } from '../../core/services/config.service';
import { ENGINE_STYLES, Row, STATUS_BN, errMsg, fmtDate, idOf, pick } from '../committee/engine-shared';
import { MunicipalityCacheService } from '../../core/services/municipality-cache.service';
import { AuthService } from '../../core/services/auth.service';
import { TaxProposalReportComponent } from '../taxproposal/tax-proposal-report.component';

@Component({
  selector: 'app-workflow-decision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TaxProposalReportComponent],
  styles: [ENGINE_STYLES, `
    .info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .info-card .card-header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .kv { display: grid; grid-template-columns: 160px 1fr; gap: 14px 20px; }
    .kv dt { font-size: 13px; color: #64748b; font-weight: 500; }
    .kv dd { margin: 0; font-size: 14px; font-weight: 600; color: #0f172a; }
    .badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }
    .badge-primary { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .badge-success { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
    .badge-muted { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .st { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }
    .st::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .st-PENDING { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .st-APPROVED { background: #ecfdf5; color: #047857; border-color: #d1fae5; }
    .st-REJECTED { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .decision-box { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .decision-option { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: #334155; background: #fff; }
    .decision-option:has(input:checked) { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
    .decision-option.reject:has(input:checked) { border-color: #dc2626; background: #fef2f2; color: #b91c1c; }
    .report-scroll { max-height: 65vh; overflow-y: auto; overflow-x: hidden; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    @media (max-width: 640px) { .kv { grid-template-columns: 1fr; gap: 6px; } }
  `],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/workflow" class="muted">← অনুমোদনের তালিকা</a><h1>অনুমোদনের সিদ্ধান্ত</h1></div>
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
      @else if (!req()) {
        <div class="alert alert-warn">এই অনুরোধ আপনার অপেক্ষমাণ তালিকায় নেই। হয়তো আগেই সিদ্ধান্ত হয়ে গেছে বা অন্য অনুমোদনকারীর কাছে আছে।</div>
      } @else {
        @if (done()) { <div class="alert alert-ok">{{ done() }} <a routerLink="/workflow">তালিকায় ফিরুন</a></div> }
        <div class="card mb-2">
          <div class="card-header"><h3>অনুরোধের তথ্য</h3></div>
          <div class="card-body">
            <dl class="kv">
              <dt>বিষয়</dt><dd>{{ committeeName() }}</dd>
              <dt>পৌরসভা</dt><dd>{{ municipalityName() }}</dd>
              <dt>ধাপ</dt><dd>ধাপ {{ req()!['stepNo'] ?? '—' }}</dd>
              <dt>অনুমোদক</dt><dd>{{ designationName() }}</dd>
              <dt>উৎস</dt><dd>{{ sourceLabel() }}</dd>
              <dt>SLA শেষ হবে</dt><dd>{{ fmt(req()!['slaDeadline']) }}</dd>
              <dt>অবস্থা</dt><dd><span class="badge badge-primary">{{ bn(req()!['status'] ?? 'PENDING') }}</span></dd>
            </dl>
            @if (isCommittee()) {
              <p style="margin-top:12px"><a class="btn-ghost" style="text-decoration:none" [routerLink]="['/committee', sourceId()]">কমিটির পূর্ণ বিবরণ দেখুন</a></p>
            }
          </div>
        </div>
        @if (isProposal()) {
          <div class="card mb-2">
            <div class="card-header"><h3>কর প্রস্তাবের রিপোর্ট</h3></div>
            <div class="card-body">
              <div class="report-scroll"><app-tax-proposal-report [proposalId]="sourceId()" [viewOnly]="true"></app-tax-proposal-report></div>
              <p style="margin-top:8px"><a class="btn-ghost" style="text-decoration:none" [routerLink]="['/tax-proposals', sourceId(), 'report']" target="_blank">পূর্ণ পর্দায় খুলুন / প্রিন্ট করুন</a></p>
            </div>
          </div>
        }
        @if (steps().length) {
          <div class="card mb-2"><div class="card-header"><h3>অনুমোদনের ধাপ</h3></div>
            <div class="card-body table-wrapper">
              <table class="data-table">
                <thead><tr><th>ধাপ</th><th>অনুমোদনকারী</th><th>অবস্থা</th><th>তারিখ</th><th>মন্তব্য</th></tr></thead>
                <tbody>
                  @for (s of steps(); track $index) {
                    <tr>
                      <td>{{ pick(s, 'levelNo', 'stepNo') ?? $index + 1 }}</td>
                      <td>{{ stepApproverName(s) }}
                        @if (s['memberCount'] > 1) { <span class="muted">({{ s['approvedCount'] }}/{{ s['memberCount'] }} জন)</span> }
                      </td>
                      <td>@if (pick(s, 'decision', 'status'); as st) { <span [class]="'st st-' + st">{{ bn(st) }}</span> } @else { — }</td>
                      <td>{{ fmt(pick(s, 'decidedAt', 'updatedAt')) }}</td>
                      <td>{{ pick(s, 'comment', 'reason') || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div></div>
        }
        @if (!done()) {
          <div class="card"><div class="card-header"><h3>আপনার সিদ্ধান্ত</h3></div>
            <div class="card-body">
              <div class="decision-box">
                <label class="decision-option"><input type="radio" name="dec" value="APPROVED" [(ngModel)]="decision" /> অনুমোদন করুন</label>
                <label class="decision-option reject"><input type="radio" name="dec" value="REJECTED" [(ngModel)]="decision" /> প্রত্যাখ্যান করুন</label>
              </div>
              <div class="form-group">
                <label>মন্তব্য @if (decision === 'REJECTED') { <span class="required">* (প্রত্যাখ্যানে কারণ বাধ্যতামূলক)</span> }</label>
                <textarea class="form-control" rows="3" [(ngModel)]="comment" placeholder="কারণ বা মন্তব্য লিখুন"></textarea>
              </div>
              @if (problem()) { <div class="muted bad-text" style="margin-bottom:8px">{{ problem() }}</div> }
              <button class="btn btn-primary" [disabled]="saving() || !!problem()" (click)="submit()">
                {{ saving() ? 'জমা হচ্ছে...' : 'সিদ্ধান্ত জমা দিন' }}
              </button>
              <p class="muted" style="margin-top:8px">সিদ্ধান্ত জমা দেওয়ার পর বদলানো যাবে না।</p>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class WorkflowDecisionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(EngineApiService);
  private cfg = inject(ConfigService);
  private munCache = inject(MunicipalityCacheService);
  private auth = inject(AuthService);

  req = signal<Row | null>(null);
  loading = signal(true); saving = signal(false);
  err = signal(''); done = signal('');
  decision: 'APPROVED' | 'REJECTED' | '' = '';
  comment = '';
  private requestId = '';

  committeeName = signal('লোড হচ্ছে...');
  municipalityName = signal('—');
  designationName = signal('—');
  desigMap = signal<Record<string, string>>({});

  pick = pick; bn = (s: string) => STATUS_BN[s] ?? s; fmt = (v: any) => fmtDate(v, true);
  steps = computed<Row[]>(() => this.req()?.['steps'] ?? []);

  // ★ সোর্স টাইপ: COMMITTEE হলে sourceId = committeeId, PROPOSAL হলে sourceId = proposalId
  isProposal = computed(() => String(this.req()?.['sourceType'] ?? '').toUpperCase() === 'PROPOSAL');
  isCommittee = computed(() => String(this.req()?.['sourceType'] ?? '').toUpperCase() === 'COMMITTEE');
  sourceLabel = computed(() => this.isProposal() ? 'কর প্রস্তাব' : this.isCommittee() ? 'কমিটি গঠন' : 'অন্যান্য');
  sourceId = computed<string>(() => String(this.req()?.['sourceId'] ?? ''));

  problem(): string {
    if (!this.decision) return 'সিদ্ধান্ত বাছাই করুন।';
    if (this.decision === 'REJECTED' && this.comment.trim().length < 5) return 'প্রত্যাখ্যানের কারণ লিখুন (কমপক্ষে ৫ অক্ষর)।';
    return '';
  }

  stepApproverName(s: Row): string {
    if (Number(s['memberCount'] ?? 0) > 1) return 'কমিটির সদস্যগণ';
    const direct = pick(s, 'approverName', 'approver', 'approverRef', 'designationName');
    if (direct && !String(direct).includes('-') && String(direct).length < 50) return String(direct);
    const id = String(pick(s, 'approverId', 'designationId', 'approver', 'approverRef') ?? '');
    if (id && this.desigMap()[id]) return this.desigMap()[id];
    if (direct) return String(direct);
    return '—';
  }

  ngOnInit() {
    this.requestId = this.route.snapshot.paramMap.get('id') ?? '';
    this.cfg.listDesignations().subscribe({
      next: (l: any[]) => {
        const map: Record<string, string> = {};
        for (const d of (l ?? [])) map[String(d.id)] = String(d.nameBn ?? d.name ?? '');
        this.desigMap.set(map);
      },
      error: () => {},
    });
    this.api.myPending().subscribe({
      next: (l) => {
        const found = (l ?? []).find(r => idOf(r) === this.requestId) ?? null;
        this.req.set(found);
        this.loading.set(false);
        if (found) this.loadNames(found);
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  private loadNames(r: Row) {
    const type = String(r['sourceType'] ?? '').toUpperCase();
    // ★ কমিটির API শুধু COMMITTEE টাইপে
    if (type === 'COMMITTEE') {
      const cid = String(r['sourceId'] ?? '');
      this.api.getCommittee(cid).subscribe({
        next: (c: any) => {
          const name = pick(c, 'nameBn', 'name', 'committeeName') ?? pick(c?.['data'], 'nameBn', 'name') ?? pick(c?.['payload'], 'nameBn', 'name');
          this.committeeName.set(name ? String(name) : 'কমিটি');
        },
        error: () => this.committeeName.set('কমিটি'),
      });
    } else if (type === 'PROPOSAL') {
      this.committeeName.set(String(r['title'] ?? 'কর প্রস্তাব'));
    } else {
      this.committeeName.set(String(r['title'] ?? '—'));
    }
    this.loadMunicipalityFromDetail();
    const approverId = String(r['approverId'] ?? r['designationId'] ?? r['approverDesignationId'] ?? r['approverRef'] ?? '');
    if (approverId) {
      this.cfg.listDesignations().subscribe({
        next: (list: any[]) => {
          const des = (list ?? []).find((x: any) => String(x.id) === approverId);
          if (des) this.designationName.set(String(des.nameBn ?? des.name ?? '—'));
          else if (r['approverKind'] === 'DESIGNATION') this.designationName.set('পদভিত্তিক অনুমোদক');
        },
        error: () => {},
      });
    } else if (r['approverKind'] === 'DESIGNATION') {
      this.designationName.set('পদভিত্তিক অনুমোদক');
    }
  }

  private loadMunicipalityFromDetail() {
    const r = this.req();
    if (!r) return;
    this.munCache.ensureLoaded().subscribe({
      next: () => this.resolveMunicipalityName(),
      error: () => this.resolveMunicipalityName(),
    });
  }

  private resolveMunicipalityName() {
    const r = this.req();
    if (!r) return;
    const fromRowId = this.deepFind(r, ['municipalityId', 'municipality_id']);
    const fromRowName = this.deepFind(r, ['municipalityName', 'municipalityNameBn', 'municipalityNameEn']);
    if (fromRowName) { this.municipalityName.set(String(fromRowName)); this.err.set(''); return; }
    if (fromRowId) {
      const cached = this.munCache.getName(String(fromRowId));
      if (cached) { this.municipalityName.set(cached); this.err.set(''); return; }
    }
    // ★ কমিটির API শুধু COMMITTEE টাইপে (PROPOSAL এ sourceId কমিটির ID না)
    const committeeId = this.isCommittee() ? String(r['sourceId'] ?? '') : '';
    if (!committeeId) { this.showMunNotFound(fromRowId); return; }
    this.api.getCommittee(committeeId).subscribe({
      next: (c: any) => {
        const fromComName = this.deepFind(c, ['municipalityName', 'municipalityNameBn', 'municipalityNameEn']);
        const fromComId = this.deepFind(c, ['municipalityId', 'municipality_id']);
        if (fromComName) { this.municipalityName.set(String(fromComName)); this.err.set(''); return; }
        if (fromComId) {
          const cached = this.munCache.getName(String(fromComId));
          if (cached) { this.municipalityName.set(cached); this.err.set(''); return; }
        }
        this.showMunNotFound(fromComId ?? fromRowId);
      },
      error: () => this.showMunNotFound(fromRowId),
    });
  }

  private deepFind(obj: any, keys: string[]): any {
    if (!obj || typeof obj !== 'object') return null;
    for (const k of keys) if (obj[k] != null && obj[k] !== '') return obj[k];
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') {
        const found = this.deepFind(v, keys);
        if (found != null && found !== '') return found;
      }
    }
    return null;
  }

  private showMunNotFound(munId: any) {
    const id = String(munId ?? '').trim();
    if (id) {
      const cached = this.munCache.getName(id);
      if (cached) { this.municipalityName.set(cached); return; }
    }
    const userMunName = this.getCurrentUserMunicipalityName();
    if (userMunName) { this.municipalityName.set(userMunName); return; }
    this.municipalityName.set('—');
  }

  private getCurrentUserMunicipalityName(): string | null {
    try {
      const user = this.auth.currentUser();
      if (!user) return null;
      const munId = String((user as any).municipalityId ?? '').trim();
      if (!munId) return null;
      return this.munCache.getName(munId);
    } catch { return null; }
  }

  submit() {
    if (!this.decision) return;
    this.saving.set(true); this.err.set('');
    this.api.decide(this.requestId, { decision: this.decision, comment: this.comment.trim() || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.set(this.decision === 'APPROVED' ? 'অনুমোদন সম্পন্ন হয়েছে।' : 'প্রত্যাখ্যান জমা হয়েছে।');
        setTimeout(() => this.router.navigate(['/workflow']), 1500);
      },
      error: (e) => { this.saving.set(false); this.err.set(errMsg(e)); },
    });
  }
}