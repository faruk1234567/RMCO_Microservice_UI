// D-02 / D-03 : অনুরোধের বিস্তারিত ও সিদ্ধান্ত (Approve / Reject)
// ⚠ অনুরোধের আলাদা GET API নেই, তাই my-pending তালিকা থেকে অনুরোধটি খুঁজে দেখানো হয়
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, entries, errMsg, fmtDate, idOf, pick } from '../committee/engine-shared';

@Component({
  selector: 'app-workflow-decision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES],
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
            <dl class="kv">@for (e of rows(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
            @if (committeeId()) {
              <p style="margin-top:12px"><a class="btn-ghost" style="text-decoration:none" [routerLink]="['/committee', committeeId()]">কমিটির পূর্ণ বিবরণ দেখুন</a></p>
            }
          </div>
        </div>

        @if (steps().length) {
          <div class="card mb-2"><div class="card-header"><h3>অনুমোদনের ধাপ</h3></div>
            <div class="card-body table-wrapper">
              <table class="data-table">
                <thead><tr><th>ধাপ</th><th>অনুমোদনকারী</th><th>অবস্থা</th><th>তারিখ</th><th>মন্তব্য</th></tr></thead>
                <tbody>
                  @for (s of steps(); track $index) {
                    <tr>
                      <td>{{ pick(s, 'levelNo', 'stepNo') ?? $index + 1 }}</td>
                      <td>{{ pick(s, 'approverName', 'approver', 'approverRef') || '—' }}</td>
                      <td>@if (s['status']) { <span [class]="'st st-' + s['status']">{{ bn(s['status']) }}</span> } @else { — }</td>
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
              <div class="row-actions" style="margin-bottom:12px">
                <label class="check"><input type="radio" name="dec" value="APPROVED" [(ngModel)]="decision" /> অনুমোদন করুন (Approve)</label>
                <label class="check"><input type="radio" name="dec" value="REJECTED" [(ngModel)]="decision" /> প্রত্যাখ্যান করুন (Reject)</label>
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

  req = signal<Row | null>(null);
  loading = signal(true); saving = signal(false);
  err = signal(''); done = signal('');
  decision: 'APPROVED' | 'REJECTED' | '' = '';
  comment = '';
  private requestId = '';

  pick = pick; bn = (s: string) => STATUS_BN[s] ?? s; fmt = (v: any) => fmtDate(v, true);
  rows = computed(() => entries(this.req()).filter(e => e.k !== 'id'));
  steps = computed<Row[]>(() => this.req()?.['steps'] ?? []);
  committeeId = computed<string>(() => this.req()?.['committeeId'] ?? this.req()?.['refId'] ?? '');
  problem(): string {
    if (!this.decision) return 'সিদ্ধান্ত বাছাই করুন।';
    if (this.decision === 'REJECTED' && this.comment.trim().length < 5) return 'প্রত্যাখ্যানের কারণ লিখুন (কমপক্ষে ৫ অক্ষর)।';
    return '';
  }

  ngOnInit() {
    this.requestId = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.myPending().subscribe({
      next: (l) => { this.req.set((l ?? []).find(r => idOf(r) === this.requestId) ?? null); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
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
