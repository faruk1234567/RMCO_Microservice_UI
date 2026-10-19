import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { ApprovalRequest } from '../../core/models/workflow.model';

@Component({
  selector: 'app-workflow-decision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container">
      @if (loading()) { <div class="spinner"></div> }

      @if (request(); as r) {
        <div class="page-header">
          <h1>{{ r.subjectTitleBn }}</h1>
          <a routerLink="/workflow" class="btn btn-secondary">ফিরে যান</a>
        </div>

        @if (msg()) { <div class="alert" [class.alert-success]="msgType()==='ok'" [class.alert-danger]="msgType()==='err'">{{ msg() }}</div> }

        <div class="card mb-2">
          <div class="card-header"><h3>অনুরোধের তথ্য</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div><strong>অ্যাকশন:</strong> {{ r.actionCode }}</div>
              <div><strong>অবস্থা:</strong> {{ r.status }}</div>
              <div><strong>জমা:</strong> {{ r.submittedAt | date:'dd MMM yyyy HH:mm' }}</div>
              <div><strong>বর্তমান ধাপ:</strong> {{ r.currentStepName }}</div>
            </div>
          </div>
        </div>

        <div class="card mb-2">
          <div class="card-header"><h3>অনুমোদন ধাপসমূহ</h3></div>
          <div class="card-body">
            <div class="steps-timeline">
              @for (s of r.steps || []; track s.id) {
                <div class="step-item" [class.done]="s.status==='APPROVED'" [class.rejected]="s.status==='REJECTED'" [class.current]="s.status==='PENDING'">
                  <div class="step-num">{{ s.stepOrder }}</div>
                  <div class="step-body">
                    <strong>{{ s.nameBn }}</strong>
                    <span class="badge" [class]="stepBadge(s.status)">{{ s.status }}</span>
                    @if (s.decidedAt) {
                      <div class="text-muted" style="font-size:0.82rem">{{ s.decidedAt | date:'dd MMM yyyy HH:mm' }}</div>
                    }
                    @if (s.comment) {
                      <div style="font-size:0.88rem;margin-top:4px">মন্তব্য: {{ s.comment }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        @if (r.status === 'PENDING' || r.status === 'IN_PROGRESS') {
          <div class="card">
            <div class="card-header"><h3>সিদ্ধান্ত নিন</h3></div>
            <div class="card-body">
              <div class="form-group">
                <label>মন্তব্য</label>
                <textarea class="form-control" [(ngModel)]="comment" rows="3" placeholder="ঐচ্ছিক মন্তব্য..."></textarea>
              </div>
              <div class="form-group" *ngIf="showDelegate">
                <label>কাউকে অর্পণ (Delegate) — User ID</label>
                <input class="form-control" [(ngModel)]="delegateTo" placeholder="user-uuid" />
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn btn-primary" [disabled]="submitting()" (click)="decide('APPROVE')">
                  {{ submitting() ? '...' : '✓ অনুমোদন' }}
                </button>
                <button class="btn btn-danger" [disabled]="submitting()" (click)="decide('REJECT')">
                  {{ submitting() ? '...' : '✗ প্রত্যাখ্যান' }}
                </button>
                <button class="btn btn-secondary" [disabled]="submitting()" (click)="showDelegate = !showDelegate">
                  অর্পণ (Delegate)
                </button>
                @if (showDelegate) {
                  <button class="btn btn-outline" [disabled]="submitting() || !delegateTo" (click)="decide('DELEGATE')">
                    অর্পণ নিশ্চিত
                  </button>
                }
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .steps-timeline { display:flex; flex-direction:column; gap:12px; }
    .step-item { display:flex; gap:14px; align-items:flex-start; padding:12px; border-radius:8px; background:#f8fbf9; }
    .step-item.done { background:#d4edda; }
    .step-item.rejected { background:#f8d7da; }
    .step-item.current { background:#fff3cd; border:1.5px solid #f0b429; }
    .step-num {
      width:32px; height:32px; border-radius:50%; background:var(--primary); color:#fff;
      display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;
    }
    .step-body { flex:1; }
  `],
})
export class WorkflowDecisionComponent implements OnInit {
  request = signal<ApprovalRequest | null>(null);
  loading = signal(true);
  submitting = signal(false);
  msg = signal('');
  msgType = signal<'ok' | 'err'>('ok');
  comment = '';
  delegateTo = '';
  showDelegate = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wf: WorkflowService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.wf.getById(id).subscribe({
      next: (r) => { this.request.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  decide(decision: 'APPROVE' | 'REJECT' | 'DELEGATE') {
    const r = this.request();
    if (!r) return;
    this.submitting.set(true);
    this.msg.set('');
    this.wf.decide(r.id, {
      decision,
      comment: this.comment || undefined,
      delegateToUserId: decision === 'DELEGATE' ? this.delegateTo : undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.msgType.set('ok');
        this.msg.set(
          decision === 'APPROVE' ? 'অনুমোদন সম্পন্ন।' :
          decision === 'REJECT' ? 'প্রত্যাখ্যান করা হয়েছে।' : 'অর্পণ সম্পন্ন।'
        );
        setTimeout(() => this.router.navigate(['/workflow']), 1200);
      },
      error: () => {
        this.submitting.set(false);
        this.msgType.set('err');
        this.msg.set('সিদ্ধান্ত সংরক্ষণ ব্যর্থ।');
      },
    });
  }

  stepBadge(s: string) {
    const m: Record<string, string> = { APPROVED: 'badge-success', REJECTED: 'badge-danger', PENDING: 'badge-warning', DELEGATED: 'badge-info' };
    return m[s] || 'badge-secondary';
  }
}
