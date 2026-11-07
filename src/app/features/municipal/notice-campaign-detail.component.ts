// N-04 : ক্যাম্পেইনের বিস্তারিত ও পাঠানো (send); সারিতে থাকা অবস্থায় নিজে থেকে রিফ্রেশ হয়
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NoticeApi } from '../../core/services/municipal-api.service';
import { MUNI_STYLES, RK, Recent, Row, bnStatus, entries, errMsg, fmtDate } from './municipal-shared';

@Component({
  selector: 'app-notice-campaign-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/notices" class="muted">← নোটিশ</a>
          <h1>ক্যাম্পেইন @if (c()) { <span [class]="'st st-' + c()!['status']">{{ bn(c()!['status']) }}</span> }</h1></div>
        <button class="btn-ghost" [disabled]="loading()" (click)="load()">রিফ্রেশ</button>
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
      @if (loading() && !c()) { <div class="empty">লোড হচ্ছে...</div> }

      @if (c()) {
        <div class="card mb-2"><div class="card-body">
          <div class="row-actions">
            <span class="chip">প্রাপক: <strong>{{ c()!['recipientCount'] ?? '—' }}</strong></span>
            <span class="chip">তৈরি: {{ fmt(c()!['createdAt']) }}</span>
            <span class="chip">সারিতে: {{ fmt(c()!['queuedAt']) }}</span>
            <span class="chip">সম্পন্ন: {{ fmt(c()!['completedAt']) }}</span>
          </div>
          @if (live()) { <div class="muted" style="margin-top:8px">পাঠানো চলছে, প্রতি ৫ সেকেন্ডে নিজে থেকে হালনাগাদ হচ্ছে...</div> }
        </div></div>

        <div class="card mb-2"><div class="card-header"><h3>তথ্য</h3></div><div class="card-body">
          <dl class="kv">@for (e of rows(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
        </div></div>

        @if (canSend()) {
          <div class="card"><div class="card-header"><h3>পাঠান</h3></div><div class="card-body">
            <div class="alert alert-warn">পাঠানো শুরু হলে থামানো বা ফেরানো যাবে না।</div>
            <label class="check" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="confirm" /> আমি যাচাই করেছি, এখন পাঠাতে চাই</label>
            <button class="btn btn-primary" [disabled]="busy() || !confirm" (click)="send()">ক্যাম্পেইন পাঠান</button>
          </div></div>
        }
      }
    </div>
  `,
})
export class NoticeCampaignDetailComponent implements OnInit, OnDestroy {
  private api = inject(NoticeApi);
  private route = inject(ActivatedRoute);
  id = '';
  c = signal<Row | null>(null);
  loading = signal(true); busy = signal(false);
  err = signal(''); msg = signal('');
  confirm = false;
  private timer: any;

  bn = bnStatus; fmt = (v: any) => fmtDate(v, true);
  rows = computed(() => entries(this.c()).filter(e => !['id', 'createdAt', 'queuedAt', 'completedAt', 'recipientCount'].includes(e.k)));
  // queuedAt আছে কিন্তু completedAt নেই = পাঠানো চলছে; queuedAt নেই = এখনো পাঠানো হয়নি
  live = computed(() => !!this.c()?.['queuedAt'] && !this.c()?.['completedAt']);
  canSend = computed(() => !!this.c() && !this.c()!['queuedAt']);

  ngOnInit() { this.id = this.route.snapshot.paramMap.get('id') ?? ''; this.load(); }
  ngOnDestroy() { clearTimeout(this.timer); }

  load() {
    clearTimeout(this.timer); this.loading.set(true);
    this.api.getCampaign(this.id).subscribe({
      next: (r) => {
        this.c.set(r); this.loading.set(false);
        Recent.add(RK.campaign, this.id, `${r['channel'] ?? ''} · ${String(r['messageId'] ?? '').slice(0, 8)}`);
        if (this.live()) this.timer = setTimeout(() => this.load(), 5000);
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  send() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.api.send(this.id).subscribe({
      next: () => { this.busy.set(false); this.confirm = false; this.msg.set('ক্যাম্পেইন পাঠানোর সারিতে দেওয়া হয়েছে।'); this.load(); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
