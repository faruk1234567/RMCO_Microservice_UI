// O-01 : আপত্তি — নাগরিকের "আমার আপত্তি" (GET /me/objections) + কর্মকর্তার জন্য ID দিয়ে খোলা
// ⚠ কর্মকর্তার inbox-এর API নেই, তাই কর্মকর্তা ID দিয়ে বা "সম্প্রতি" তালিকা থেকে আপত্তি খোলেন
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ObjectionApi } from '../../core/services/municipal-api.service';
import { MUNI_STYLES, RK, Recent, Row, UUID_RE, bnStatus, errMsg, fmtDate, pick, rid } from './municipal-shared';

@Component({
  selector: 'app-objection-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>আপত্তি</h1><a routerLink="/objections/new" class="btn btn-primary">+ নতুন আপত্তি</a></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="tabs-row">
        <button class="tab-btn" [class.active]="tab() === 'mine'" (click)="tab.set('mine')">আমার আপত্তি ({{ mine().length }})</button>
        <button class="tab-btn" [class.active]="tab() === 'officer'" (click)="tab.set('officer')">কর্মকর্তা: আপত্তি খুলুন</button>
      </div>

      @if (tab() === 'mine') {
        <div class="card"><div class="card-body table-wrapper">
          @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
          @else {
            <table class="data-table">
              <thead><tr><th>আপত্তি নম্বর</th><th>আপত্তিকারী</th><th>অবস্থা</th><th>আপত্তির শেষ তারিখ</th><th>জমার তারিখ</th><th></th></tr></thead>
              <tbody>
                @for (o of mine(); track id(o)) {
                  <tr>
                    <td><strong>{{ pick(o, 'objectionNo') || id(o).slice(0, 8) }}</strong></td>
                    <td>{{ pick(o, 'objectorName') || '—' }}</td>
                    <td><span [class]="'st st-' + o['status']">{{ bn(o['status']) }}</span></td>
                    <td>{{ fmtD(pick(o, 'windowDeadline')) }}</td>
                    <td>{{ fmt(pick(o, 'submittedAt', 'createdAt')) }}</td>
                    <td><a class="btn-ghost btn-sm" style="text-decoration:none" [routerLink]="['/objections', id(o)]">বিস্তারিত</a></td>
                  </tr>
                } @empty { <tr><td colspan="6" class="empty">আপনি এখনো কোনো আপত্তি জমা দেননি।</td></tr> }
              </tbody>
            </table>
          }
        </div></div>
      } @else {
        <div class="card mb-2"><div class="card-body">
          <div class="toolbar" style="margin:0">
            <input class="form-control" style="flex:1" placeholder="আপত্তির ID (UUID)" [(ngModel)]="lookup" (keyup.enter)="open()" />
            <button class="btn btn-primary" (click)="open()">খুলুন</button>
          </div>
        </div></div>
        <div class="card"><div class="card-header"><h3>সম্প্রতি খোলা</h3></div><div class="card-body">
          @for (r of recent; track r.id) { <a class="chip" [routerLink]="['/objections', r.id]">{{ r.label }}</a> }
          @empty { <div class="muted">কিছু নেই।</div> }
        </div></div>
      }
    </div>
  `,
})
export class ObjectionListComponent implements OnInit {
  private api = inject(ObjectionApi);
  private router = inject(Router);
  mine = signal<Row[]>([]);
  tab = signal<'mine' | 'officer'>('mine');
  loading = signal(true); err = signal('');
  lookup = '';
  recent = Recent.list(RK.objection);
  id = rid; pick = pick; bn = bnStatus; fmt = (v: any) => fmtDate(v, true); fmtD = (v: any) => fmtDate(v);

  ngOnInit() {
    this.api.mine().subscribe({
      next: (l) => { this.mine.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
  open() {
    const id = this.lookup.trim();
    if (!UUID_RE.test(id)) { this.err.set('ID সঠিক নয়।'); return; }
    this.err.set(''); this.router.navigate(['/objections', id]);
  }
}
