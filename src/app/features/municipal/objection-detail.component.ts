// O-03 : আপত্তির বিস্তারিত + কর্মকর্তার পদক্ষেপ: গ্রহণ → ফরোয়ার্ড → শুনানি → সিদ্ধান্ত
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ObjectionApi } from '../../core/services/municipal-api.service';
import { CommitteeSelectComponent } from './committee-select.component';
import { MUNI_STYLES, RK, Recent, Row, bnStatus, clean, entries, errMsg, fmtDate, isUuid } from './municipal-shared';

type Tab = 'info' | 'receive' | 'forward' | 'hearing' | 'decision';

@Component({
  selector: 'app-objection-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommitteeSelectComponent],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/objections" class="muted">← আপত্তির তালিকা</a>
          <h1>আপত্তি {{ o()?.['objectionNo'] || '' }} @if (o()) { <span [class]="'st st-' + o()!['status']">{{ bn(o()!['status']) }}</span> }</h1></div>
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
      @if (problems().length) { <div class="alert alert-warn"><ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }

      @if (o()) {
        <div class="tabs-row">
          @for (t of tabs; track t.id) { <button class="tab-btn" [class.active]="tab() === t.id" (click)="tab.set(t.id); problems.set([])">{{ t.l }}</button> }
        </div>

        @switch (tab()) {
          @case ('info') {
            <div class="card mb-2"><div class="card-body">
              <dl class="kv">@for (e of rows(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
            </div></div>
            @if (hearings().length) {
              <div class="card"><div class="card-header"><h3>শুনানি</h3></div><div class="card-body">
                @for (h of hearings(); track $index) { <div style="padding:6px 0;border-bottom:1px solid #eef1f2">@for (e of rowsOf(h); track e.k) { <span class="chip">{{ e.label }}: {{ e.v }}</span> }</div> }
              </div></div>
            }
          }
          @case ('receive') {
            <div class="card"><div class="card-body">
              <p>আপত্তিটি গ্রহণ (receive) করলে এটি আপনার দায়িত্বে নথিভুক্ত হবে।</p>
              <button class="btn btn-primary" [disabled]="busy()" (click)="receive()">আপত্তি গ্রহণ করুন</button>
            </div></div>
          }
          @case ('forward') {
            <div class="card"><div class="card-body">
              <div class="grid2">
                <div class="form-group"><label>কোন কমিটির কাছে পাঠাবেন <span class="required">*</span></label><app-committee-select [(value)]="fw.committeeId" /></div>
                <div class="form-group"><label>আপনার ভূমিকা (role)</label><input class="form-control" [(ngModel)]="fw.role" /></div>
              </div>
              <div class="form-group"><label>মন্তব্য</label><textarea class="form-control" rows="3" [(ngModel)]="fw.comment"></textarea></div>
              <button class="btn btn-primary" [disabled]="busy()" (click)="forward()">ফরোয়ার্ড করুন</button>
            </div></div>
          }
          @case ('hearing') {
            <div class="card"><div class="card-body">
              <div class="form-group"><label>শুনানি গ্রহণকারী কমিটি <span class="required">*</span></label><app-committee-select [(value)]="hr.committeeId" /></div>
              <div class="grid3">
                <div class="form-group"><label>তারিখ <span class="required">*</span></label><input type="date" class="form-control" [(ngModel)]="hr.scheduledDate" /></div>
                <div class="form-group"><label>সময় <span class="required">*</span></label><input type="time" class="form-control" [(ngModel)]="hr.scheduledTime" /></div>
                <div class="form-group"><label>স্থান <span class="required">*</span></label><input class="form-control" [(ngModel)]="hr.venue" /></div>
              </div>
              <button class="btn btn-primary" [disabled]="busy()" (click)="schedule()">শুনানি নির্ধারণ করুন</button>
            </div></div>
          }
          @case ('decision') {
            <div class="card"><div class="card-body">
              <div class="grid2">
                <div class="form-group"><label>সিদ্ধান্ত <span class="required">*</span></label>
                  <input class="form-control" list="decisions" [(ngModel)]="dc.decision" placeholder="যেমন ACCEPTED" />
                  <datalist id="decisions">@for (h of decisionHints; track h) { <option [value]="h"></option> }</datalist></div>
                <div class="form-group"><label>সিদ্ধান্ত গ্রহণকারী কমিটি <span class="required">*</span></label><app-committee-select [(value)]="dc.decidedByCommitteeId" /></div>
              </div>
              <div class="form-group"><label>কারণ <span class="required">*</span></label><textarea class="form-control" rows="3" [(ngModel)]="dc.reason"></textarea></div>
              <div class="form-group"><label>ফলস্বরূপ পরিবর্তন (ঐচ্ছিক, JSON)</label>
                <textarea class="form-control" rows="3" [(ngModel)]="dc.resultingChange" placeholder='{"newRate": 12}'></textarea></div>
              <label class="check" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="confirm" /> আমি বুঝেছি, সিদ্ধান্ত জমা দেওয়ার পর বদলানো যাবে না</label>
              <button class="btn btn-primary" [disabled]="busy() || !confirm" (click)="decide()">সিদ্ধান্ত জমা দিন</button>
            </div></div>
          }
        }
      }
    </div>
  `,
})
export class ObjectionDetailComponent implements OnInit {
  private api = inject(ObjectionApi);
  private route = inject(ActivatedRoute);

  tabs: { id: Tab; l: string }[] = [
    { id: 'info', l: 'বিবরণ' }, { id: 'receive', l: 'গ্রহণ' }, { id: 'forward', l: 'ফরোয়ার্ড' },
    { id: 'hearing', l: 'শুনানি' }, { id: 'decision', l: 'সিদ্ধান্ত' },
  ];
  // ⚠ সিদ্ধান্তের মান (decision) অনুমান; আপনার backend-এর মান লিখুন
  decisionHints = ['ACCEPTED', 'REJECTED', 'PARTIALLY_ACCEPTED'];
  id = '';
  o = signal<Row | null>(null);
  tab = signal<Tab>('info');
  loading = signal(true); busy = signal(false);
  err = signal(''); msg = signal(''); problems = signal<string[]>([]);
  fw = { committeeId: '', role: 'MAYOR', comment: '' };
  hr = { committeeId: '', scheduledDate: '', scheduledTime: '', venue: '' };
  dc = { decision: '', reason: '', decidedByCommitteeId: '', resultingChange: '' };
  confirm = false;

  bn = bnStatus;
  rows = computed(() => entries(this.o()).filter(e => e.k !== 'id'));
  rowsOf = (r: Row) => entries(r);
  hearings = computed<Row[]>(() => this.o()?.['hearings'] ?? []);

  ngOnInit() { this.id = this.route.snapshot.paramMap.get('id') ?? ''; this.load(); }

  load() {
    this.loading.set(true);
    this.api.get(this.id).subscribe({
      next: (r) => {
        this.o.set(r); this.loading.set(false);
        Recent.add(RK.objection, this.id, String(r['objectionNo'] ?? r['objectorName'] ?? this.id.slice(0, 8)));
        const c = r['committeeId'];   // ফরোয়ার্ড হয়ে থাকলে সেই কমিটিই শুনানি ও সিদ্ধান্তে আগে থেকে বসানো
        if (c) { this.hr.committeeId = this.hr.committeeId || c; this.dc.decidedByCommitteeId = this.dc.decidedByCommitteeId || c; }
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  private run(call: any, okMsg: string, after?: () => void) {
    this.busy.set(true); this.err.set(''); this.msg.set(''); this.problems.set([]);
    call.subscribe({
      next: () => { this.busy.set(false); this.msg.set(okMsg); after?.(); this.load(); this.tab.set('info'); },
      error: (e: any) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  receive() { this.run(this.api.receive(this.id), 'আপত্তি গ্রহণ করা হয়েছে।'); }

  forward() {
    if (!isUuid(this.fw.committeeId)) { this.problems.set(['কমিটি বাছাই করুন']); return; }
    this.run(this.api.forward(this.id, { committeeId: this.fw.committeeId.trim(), role: this.fw.role.trim() || 'MAYOR', comment: this.fw.comment.trim() || undefined }),
      'আপত্তি কমিটির কাছে ফরোয়ার্ড করা হয়েছে।', () => { this.fw.comment = ''; });
  }

  schedule() {
    const p: string[] = [];
    if (!isUuid(this.hr.committeeId)) p.push('কমিটি বাছাই করুন');
    if (!this.hr.scheduledDate) p.push('শুনানির তারিখ দিন');
    if (!this.hr.scheduledTime) p.push('শুনানির সময় দিন');
    if (!this.hr.venue.trim()) p.push('শুনানির স্থান দিন');
    this.problems.set(p); if (p.length) return;
    this.run(this.api.scheduleHearing(this.id, clean(this.hr)), 'শুনানি নির্ধারিত হয়েছে।', () => { this.hr.scheduledDate = ''; this.hr.scheduledTime = ''; this.hr.venue = ''; });
  }

  decide() {
    const p: string[] = [];
    if (!this.dc.decision.trim()) p.push('সিদ্ধান্ত লিখুন');
    if (!this.dc.reason.trim()) p.push('কারণ লিখুন');
    if (!isUuid(this.dc.decidedByCommitteeId)) p.push('সিদ্ধান্ত গ্রহণকারী কমিটি বাছাই করুন');
    let resultingChange: any;
    if (this.dc.resultingChange.trim()) {
      try { resultingChange = JSON.parse(this.dc.resultingChange); } catch { p.push('"ফলস্বরূপ পরিবর্তন" সঠিক JSON নয়'); }
    }
    this.problems.set(p); if (p.length) return;
    const body: Row = { decision: this.dc.decision.trim(), reason: this.dc.reason.trim(), decidedByCommitteeId: this.dc.decidedByCommitteeId.trim() };
    if (resultingChange) body['resultingChange'] = resultingChange;
    this.run(this.api.decide(this.id, body), 'সিদ্ধান্ত জমা হয়েছে।', () => { this.dc.reason = ''; this.dc.resultingChange = ''; this.confirm = false; });
  }
}
