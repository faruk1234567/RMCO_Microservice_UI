import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommitteeService } from '../../core/services/committee.service';
import { Committee } from '../../core/models/committee.model';

@Component({
  selector: 'app-committee-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কমিটি তালিকা</h1>
        <a routerLink="/committee/create" class="btn btn-primary">+ নতুন খসড়া</a>
      </div>

      <div class="filter-bar mb-2">
        <button class="btn btn-sm" [class.btn-primary]="!filter()" [class.btn-secondary]="filter()" (click)="setFilter('')">সব</button>
        <button class="btn btn-sm" [class.btn-primary]="filter()==='DRAFT'" [class.btn-secondary]="filter()!=='DRAFT'" (click)="setFilter('DRAFT')">খসড়া</button>
        <button class="btn btn-sm" [class.btn-primary]="filter()==='IN_APPROVAL'" [class.btn-secondary]="filter()!=='IN_APPROVAL'" (click)="setFilter('IN_APPROVAL')">অনুমোদনাধীন</button>
        <button class="btn btn-sm" [class.btn-primary]="filter()==='ACTIVE'" [class.btn-secondary]="filter()!=='ACTIVE'" (click)="setFilter('ACTIVE')">সক্রিয়</button>
        <button class="btn btn-sm" [class.btn-primary]="filter()==='REJECTED'" [class.btn-secondary]="filter()!=='REJECTED'" (click)="setFilter('REJECTED')">প্রত্যাখ্যাত</button>
      </div>

      @if (loading()) { <div class="spinner"></div> }

      @if (!loading()) {
        <div class="card">
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>নাম</th><th>ধরন</th><th>অবস্থা</th><th>মেয়াদ</th><th>সদস্য</th><th>অ্যাকশন</th></tr>
              </thead>
              <tbody>
                @for (c of committees(); track c.id) {
                  <tr>
                    <td><a [routerLink]="['/committee', c.id]">{{ c.nameBn }}</a></td>
                    <td>{{ c.typeNameBn || c.typeCode }}</td>
                    <td><span class="badge" [class]="statusClass(c.status)">{{ statusLabel(c.status) }}</span></td>
                    <td>{{ c.termStart ? (c.termStart | date:'yyyy') + '–' + (c.termEnd | date:'yyyy') : '—' }}</td>
                    <td>{{ c.memberCount ?? 0 }}</td>
                    <td><a [routerLink]="['/committee', c.id]" class="btn btn-sm btn-secondary">দেখুন</a></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="text-center text-muted">কোনো কমিটি নেই</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`.filter-bar { display:flex; gap:8px; flex-wrap:wrap; }`],
})
export class CommitteeListComponent implements OnInit {
  committees = signal<Committee[]>([]);
  loading = signal(true);
  filter = signal('');

  constructor(private committeeSvc: CommitteeService) {}

  ngOnInit() { this.load(); }

  setFilter(s: string) {
    this.filter.set(s);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.committeeSvc.list(this.filter() || undefined).subscribe({
      next: (list) => { this.committees.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'খসড়া', SUBMITTED: 'জমা', IN_APPROVAL: 'অনুমোদনাধীন',
      ACTIVE: 'সক্রিয়', REJECTED: 'প্রত্যাখ্যাত', EXPIRED: 'মেয়াদোত্তীর্ণ', DISSOLVED: 'বিলুপ্ত',
    };
    return map[s] || s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-warning', IN_APPROVAL: 'badge-info', ACTIVE: 'badge-success',
      REJECTED: 'badge-danger', SUBMITTED: 'badge-info',
    };
    return map[s] || 'badge-secondary';
  }
}
