// O-03 : আপত্তির বিস্তারিত — ধাপের রেখা + "এখন আপনার কাজ"
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ObjectionApi } from '../../core/services/municipal-api.service';
import { AuthService } from '../../core/services/auth.service';
import { CommitteeSelectComponent } from './committee-select.component';
import { MUNI_STYLES, RK, Recent, Row, errMsg, fmtDate, isUuid } from './municipal-shared';

const STATUS_BN: Record<string, string> = {
  SUBMITTED: 'জমা হয়েছে',
  COMMITTEE_REVIEW: 'কমিটিতে আছে',
  WITH_DEPARTMENT: 'বিভাগে যাচাই চলছে',
  PENDING_COMMITTEE_APPROVAL: 'কমিটির অনুমোদনের অপেক্ষায়',
  APPROVED: 'গৃহীত (চূড়ান্ত)',
  REJECTED: 'বাতিল (চূড়ান্ত)',
};
const KIND_BN: Record<string, string> = {
  REGISTERED_CUSTOMER: 'নিবন্ধিত নাগরিক', HOLDING_OWNER: 'হোল্ডিং মালিক',
  CITIZEN: 'নাগরিক', ORGANIZATION: 'প্রতিষ্ঠান',
};
const STEPS = [
  { s: ['SUBMITTED'], l: 'জমা' },
  { s: ['COMMITTEE_REVIEW'], l: 'কমিটি' },
  { s: ['WITH_DEPARTMENT'], l: 'বিভাগ' },
  { s: ['PENDING_COMMITTEE_APPROVAL'], l: 'কমিটির অনুমোদন' },
  { s: ['APPROVED', 'REJECTED'], l: 'চূড়ান্ত' },
];

@Component({
  selector: 'app-objection-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommitteeSelectComponent],
  styles: [MUNI_STYLES, `
    .stepper{display:flex;gap:8px;margin:14px 0 18px;flex-wrap:wrap}
    .step{flex:1;min-width:110px;text-align:center;padding:10px 6px;border-radius:8px;background:#eef1f2;color:#6b7780;font-size:14px}
    .step.done{background:#d9efe3;color:#0b6b46}
    .step.now{background:#0b6b46;color:#fff;font-weight:600}
    .big{font-size:16px;padding:12px 22px}
    .btn-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
    .btn-danger{background:#b3261e;color:#fff;border:0;border-radius:6px;cursor:pointer}
    .todo{border-left:5px solid #0b6b46}
  `],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/objections" class="muted">← আপত্তির তালিকা</a>
          <h1>আপত্তি {{ o()?.['objectionNo'] || '' }}
            @if (o()) { <span [class]="'st st-' + o()!['status']">{{ statusBn() }}</span> }</h1></div>
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
      @if (problems().length) { <div class="alert alert-warn"><ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }

      @if (o()) {
        <div class="stepper">
          @for (st of steps; track st.l; let i = $index) {
            <div class="step" [class.done]="i < stepIndex()" [class.now]="i === stepIndex()">{{ st.l }}</div>
          }
        </div>

        <!-- এখন আপনার কাজ -->
        @switch (o()!['status']) {
          @case ('SUBMITTED') {
            @if (can('MAYOR')) {
              <div class="card mb-2 todo"><div class="card-header"><h3>এখন আপনার কাজ: কমিটিতে পাঠান</h3></div><div class="card-body">
                <div class="form-group"><label>কোন কমিটি <span class="required">*</span></label><app-committee-select [(value)]="fw.committeeId" /></div>
                <div class="form-group"><label>মন্তব্য (ঐচ্ছিক)</label><textarea class="form-control" rows="2" [(ngModel)]="fw.comment"></textarea></div>
                <button class="btn btn-primary big" [disabled]="busy()" (click)="forward()">কমিটিতে পাঠান</button>
              </div></div>
            }
          }
          @case ('COMMITTEE_REVIEW') {
            @if (can('COMMITTEE')) {
              <div class="card mb-2 todo"><div class="card-header"><h3>এখন আপনার কাজ: বিভাগে পাঠান</h3></div><div class="card-body">
                <div class="form-group"><label>কোন বিভাগ <span class="required">*</span></label><app-committee-select [(value)]="dp.departmentId" /></div>
                <div class="form-group"><label>মন্তব্য (ঐচ্ছিক)</label><textarea class="form-control" rows="2" [(ngModel)]="dp.comment"></textarea></div>
                <button class="btn btn-primary big" [disabled]="busy()" (click)="sendToDept()">বিভাগে পাঠান</button>
              </div></div>
            }
          }
          @case ('WITH_DEPARTMENT') {
            @if (can('DEPARTMENT')) {
              <div class="card mb-2 todo"><div class="card-header"><h3>এখন আপনার কাজ: যাচাই করে সুপারিশ দিন</h3></div><div class="card-body">
                <div class="btn-row">
                  <button class="btn big" [class.btn-primary]="rc.decision === 'APPROVED'" (click)="rc.decision = 'APPROVED'">✔ গৃহীত</button>
                  <button class="btn big" [class.btn-primary]="rc.decision === 'REJECTED'" (click)="rc.decision = 'REJECTED'">✖ বাতিল</button>
                </div>
                @if (rc.decision === 'APPROVED') {
                  <div class="form-group" style="margin-top:12px"><label>নতুন হার / মূল্য</label>
                    <input type="number" class="form-control" style="max-width:240px" [(ngModel)]="rc.newRate" /></div>
                }
                <div class="form-group" style="margin-top:12px"><label>কারণ <span class="required">*</span></label>
                  <textarea class="form-control" rows="3" [(ngModel)]="rc.reason"></textarea></div>
                <button class="btn btn-primary big" [disabled]="busy()" (click)="recommend()">সুপারিশ জমা দিন</button>
              </div></div>
            }
          }
          @case ('PENDING_COMMITTEE_APPROVAL') {
            @if (can('COMMITTEE')) {
              <div class="card mb-2 todo"><div class="card-header"><h3>এখন আপনার কাজ: অনুমোদন দিন</h3></div><div class="card-body">
                <p>বিভাগের সুপারিশ: <b>{{ o()!['recommendedDecision'] === 'APPROVED' ? 'গৃহীত' : 'বাতিল' }}</b></p>
                <p class="muted">কারণ: {{ o()!['recommendedReason'] }}</p>
                <label class="check" style="margin:10px 0"><input type="checkbox" [(ngModel)]="confirm" /> আমি বুঝেছি, অনুমোদনের পর বদলানো যাবে না</label>
                <div class="btn-row">
                  <button class="btn btn-primary big" [disabled]="busy() || !confirm" (click)="approve()">অনুমোদন</button>
                </div>
                <div class="form-group" style="margin-top:18px"><label>একমত না হলে ফেরত পাঠানোর কারণ</label>
                  <textarea class="form-control" rows="2" [(ngModel)]="rt.reason"></textarea></div>
                <button class="btn big" [disabled]="busy()" (click)="giveBack()">বিভাগে ফেরত পাঠান</button>
              </div></div>
            }
          }
          @default {
            @if (isFinal()) {
              <div class="alert alert-ok">এই আপত্তির সিদ্ধান্ত চূড়ান্ত: <b>{{ statusBn() }}</b></div>
            }
          }
        }

        <!-- বিবরণ -->
        <div class="card mb-2"><div class="card-header"><h3>বিবরণ</h3></div><div class="card-body">
          <dl class="kv">
            <dt>আপত্তি নম্বর</dt><dd>{{ o()!['objectionNo'] }}</dd>
            <dt>আপত্তিকারীর নাম</dt><dd>{{ o()!['objectorName'] }}</dd>
            <dt>আপত্তিকারীর ধরন</dt><dd>{{ kindBn() }}</dd>
            <dt>জমার সময়</dt><dd>{{ fmt(o()!['submittedAt']) }}</dd>
            <dt>আপত্তির শেষ তারিখ</dt><dd>{{ fmt(o()!['windowDeadline']) }}</dd>
          </dl>
          @for (e of formEntries(); track e.k) {
            <div class="form-group"><label>{{ e.k }}</label><div>{{ e.v }}</div></div>
          }
        </div></div>
      }
    </div>
  `,
})
export class ObjectionDetailComponent implements OnInit {
  private api = inject(ObjectionApi);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  steps = STEPS;
  id = '';
  o = signal<Row | null>(null);
  loading = signal(true); busy = signal(false);
  err = signal(''); msg = signal(''); problems = signal<string[]>([]);
  confirm = false;

  fw = { committeeId: '', comment: '' };
  dp = { departmentId: '', comment: '' };
  rc: { decision: string; newRate: number | null; reason: string } = { decision: '', newRate: null, reason: '' };
  rt = { reason: '' };

  fmt = fmtDate;
  statusBn = computed(() => STATUS_BN[this.o()?.['status']] ?? this.o()?.['status'] ?? '');
  kindBn = computed(() => KIND_BN[this.o()?.['objectorKind']] ?? this.o()?.['objectorKind'] ?? '');
  stepIndex = computed(() => STEPS.findIndex(s => s.s.includes(this.o()?.['status'])));
  isFinal = computed(() => ['APPROVED', 'REJECTED'].includes(this.o()?.['status']));
  formEntries = computed(() => Object.entries(this.o()?.['formValues'] ?? {}).map(([k, v]) => ({ k, v: String(v) })));

  /** ⚠ রোল চেনার অনুমান: user.roles / user.role থেকে। auth.service.ts দেখে ঠিক করব। রোল না পেলে সব বাটন দেখায় (ডেভ মোড) */
  private roles = computed<string[]>(() => {
    const u: any = this.auth.currentUser();
    const r = u?.roles ?? u?.role ?? [];
    return (Array.isArray(r) ? r : [r]).map((x: any) => String(x?.code ?? x?.name ?? x).toUpperCase());
  });
  can(kind: 'MAYOR' | 'COMMITTEE' | 'DEPARTMENT'): boolean {
    const rs = this.roles();
    return rs.length === 0 || rs.some(r => r.includes(kind));
  }

  ngOnInit() { this.id = this.route.snapshot.paramMap.get('id') ?? ''; this.load(); }

  load() {
    this.loading.set(true);
    this.api.get(this.id).subscribe({
      next: (r) => {
        this.o.set(r); this.loading.set(false);
        Recent.add(RK.objection, this.id, String(r['objectionNo'] ?? this.id.slice(0, 8)));
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  private run(call: any, okMsg: string) {
    this.busy.set(true); this.err.set(''); this.msg.set(''); this.problems.set([]);
    call.subscribe({
      next: () => { this.busy.set(false); this.msg.set(okMsg); this.confirm = false; this.load(); },
      error: (e: any) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  forward() {
    if (!isUuid(this.fw.committeeId)) { this.problems.set(['কমিটি বাছাই করুন']); return; }
    this.run(this.api.forward(this.id, { committeeId: this.fw.committeeId, comment: this.fw.comment.trim() || undefined }),
      'কমিটির কাছে পাঠানো হয়েছে।');
  }

  sendToDept() {
    if (!isUuid(this.dp.departmentId)) { this.problems.set(['বিভাগ বাছাই করুন']); return; }
    this.run(this.api.sendToDepartment(this.id, { departmentId: this.dp.departmentId, comment: this.dp.comment.trim() || undefined }),
      'বিভাগে পাঠানো হয়েছে।');
  }

  recommend() {
    const p: string[] = [];
    if (!this.rc.decision) p.push('গৃহীত বা বাতিল বাছাই করুন');
    if (!this.rc.reason.trim()) p.push('কারণ লিখুন');
    this.problems.set(p); if (p.length) return;
    const body: Row = { decision: this.rc.decision, reason: this.rc.reason.trim() };
    if (this.rc.decision === 'APPROVED' && this.rc.newRate != null) body['resultingChange'] = { newRate: this.rc.newRate };
    this.run(this.api.recommend(this.id, body), 'সুপারিশ জমা হয়েছে, কমিটির অনুমোদনের অপেক্ষায়।');
  }

  approve() { this.run(this.api.approve(this.id), 'অনুমোদিত হয়েছে। সিদ্ধান্ত চূড়ান্ত।'); }

  giveBack() {
    if (!this.rt.reason.trim()) { this.problems.set(['ফেরত পাঠানোর কারণ লিখুন']); return; }
    this.run(this.api.returnBack(this.id, this.rt.reason.trim()), 'বিভাগে ফেরত পাঠানো হয়েছে।');
  }
}