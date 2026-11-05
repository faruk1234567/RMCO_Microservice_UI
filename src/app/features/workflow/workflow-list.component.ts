// D-01 : অনুমোদনকারীর inbox (আমার অপেক্ষমাণ অনুরোধ)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, errMsg, fmtDate, idOf, pick } from '../committee/engine-shared';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [ENGINE_STYLES],
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
            <thead><tr><th>বিষয়</th><th>ধাপ</th><th>অবস্থা</th><th>জমার তারিখ</th><th>সময়সীমা</th><th></th></tr></thead>
            <tbody>
              @for (r of filtered(); track id(r)) {
                <tr>
                  <td><strong>{{ title(r) }}</strong></td>
                  <td>{{ pick(r, 'levelNo', 'stepNo', 'currentLevel') ?? '—' }}</td>
                  <td><span [class]="'st st-' + r['status']">{{ bn(r['status']) }}</span></td>
                  <td>{{ fmt(pick(r, 'submittedAt', 'createdAt')) }}</td>
                  <td>
                    {{ fmt(pick(r, 'dueAt', 'deadline')) }}
                    @if (overdue(r)) { <span class="st st-REJECTED">সময় পেরিয়েছে</span> }
                  </td>
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
  items = signal<Row[]>([]);
  q = signal(''); onlyOverdue = signal(false);
  loading = signal(true); err = signal('');
  id = idOf; pick = pick; fmt = (v: any) => fmtDate(v, true); bn = (s: string) => STATUS_BN[s] ?? s;

  title = (r: Row): string => pick(r, 'committeeName', 'nameBn', 'title', 'subject', 'entityName') ?? ('অনুরোধ #' + idOf(r).slice(0, 8));
  overdue = (r: Row): boolean => { const d = pick(r, 'dueAt', 'deadline'); return !!d && new Date(d).getTime() < Date.now(); };
  overdueCount = computed(() => this.items().filter(r => this.overdue(r)).length);
  filtered = computed(() => {
    const s = this.q().trim().toLowerCase();
    return this.items().filter(r => (!s || this.title(r).toLowerCase().includes(s)) && (!this.onlyOverdue() || this.overdue(r)));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.err.set('');
    this.api.myPending().subscribe({
      next: (l) => { this.items.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
