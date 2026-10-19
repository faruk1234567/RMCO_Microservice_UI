import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { ApprovalRequest } from '../../core/models/workflow.model';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>অনুমোদন অনুরোধ</h1></div>
      @if (loading()) { <div class="spinner"></div> }
      @if (!loading()) {
        <div class="card">
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>বিষয়</th><th>ধরন</th><th>বর্তমান ধাপ</th><th>জমাদান</th><th>অবস্থা</th><th>অ্যাকশন</th></tr>
              </thead>
              <tbody>
                @for (w of items(); track w.id) {
                  <tr>
                    <td>{{ w.subjectTitleBn }}</td>
                    <td>{{ w.actionCode }}</td>
                    <td>{{ w.currentStepName || '—' }}</td>
                    <td>{{ w.submittedAt | date:'dd MMM yyyy' }}</td>
                    <td><span class="badge" [class]="statusClass(w.status)">{{ statusLabel(w.status) }}</span></td>
                    <td>
                      @if (w.status === 'PENDING' || w.status === 'IN_PROGRESS') {
                        <a [routerLink]="['/workflow', w.id]" class="btn btn-sm btn-primary">সিদ্ধান্ত নিন</a>
                      } @else {
                        <a [routerLink]="['/workflow', w.id]" class="btn btn-sm btn-secondary">দেখুন</a>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="text-center text-muted">কোনো অনুরোধ নেই</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class WorkflowListComponent implements OnInit {
  items = signal<ApprovalRequest[]>([]);
  loading = signal(true);

  constructor(private wf: WorkflowService) {}

  ngOnInit() {
    this.wf.listPending().subscribe({
      next: (list) => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string) {
    const m: Record<string, string> = { PENDING: 'অপেক্ষমাণ', IN_PROGRESS: 'চলমান', APPROVED: 'অনুমোদিত', REJECTED: 'প্রত্যাখ্যাত', CANCELLED: 'বাতিল' };
    return m[s] || s;
  }
  statusClass(s: string) {
    const m: Record<string, string> = { PENDING: 'badge-warning', IN_PROGRESS: 'badge-info', APPROVED: 'badge-success', REJECTED: 'badge-danger' };
    return m[s] || 'badge-secondary';
  }
}
