import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommitteeService } from '../../core/services/committee.service';
import { Committee, CommitteeMember } from '../../core/models/committee.model';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      @if (loading()) { <div class="spinner"></div> }

      @if (committee(); as c) {
        <div class="page-header">
          <h1>{{ c.nameBn }}</h1>
          <div class="d-flex gap-1 align-center">
            <span class="badge" [class]="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
            <a routerLink="/committee" class="btn btn-sm btn-secondary">ফিরে যান</a>
          </div>
        </div>

        <div class="card mb-2">
          <div class="card-header"><h3>মূল তথ্য</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div><strong>ধরন:</strong> {{ c.typeNameBn || c.typeCode }}</div>
              <div><strong>মেয়াদ:</strong>
                {{ c.termStart ? (c.termStart | date:'dd MMM yyyy') : '—' }}
                –
                {{ c.termEnd ? (c.termEnd | date:'dd MMM yyyy') : '—' }}
              </div>
              <div><strong>সদস্য সংখ্যা:</strong> {{ c.memberCount ?? members().length }}</div>
              <div><strong>তৈরি:</strong> {{ c.createdAt | date:'dd MMM yyyy' }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>সদস্য তালিকা</h3></div>
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead><tr><th>নাম</th><th>পদবী</th><th>যোগদান</th><th>অবস্থা</th></tr></thead>
              <tbody>
                @for (m of members(); track m.id) {
                  <tr>
                    <td>{{ m.userNameBn }}</td>
                    <td>{{ m.designationNameBn }}</td>
                    <td>{{ m.joinedAt | date:'dd-MM-yyyy' }}</td>
                    <td><span class="badge" [class]="m.status==='ACTIVE' ? 'badge-success' : 'badge-secondary'">{{ m.status === 'ACTIVE' ? 'সক্রিয়' : 'অপসারিত' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="text-center text-muted">কোনো সদস্য নেই</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class CommitteeDetailComponent implements OnInit {
  committee = signal<Committee | null>(null);
  members = signal<CommitteeMember[]>([]);
  loading = signal(true);

  constructor(private route: ActivatedRoute, private committeeSvc: CommitteeService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.committeeSvc.getById(id).subscribe({
      next: (c) => {
        this.committee.set(c);
        this.committeeSvc.getMembers(id).subscribe((m) => {
          this.members.set(m);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'খসড়া', IN_APPROVAL: 'অনুমোদনাধীন', ACTIVE: 'সক্রিয়', REJECTED: 'প্রত্যাখ্যাত',
    };
    return map[s] || s;
  }
  statusClass(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-warning', IN_APPROVAL: 'badge-info', ACTIVE: 'badge-success', REJECTED: 'badge-danger',
    };
    return map[s] || 'badge-secondary';
  }
}
