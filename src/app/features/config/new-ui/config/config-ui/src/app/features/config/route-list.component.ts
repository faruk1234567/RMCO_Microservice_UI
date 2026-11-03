// B-07 : অনুমোদন রুটের তালিকা
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>অনুমোদন রুট</h1>
        <a routerLink="/config/routes/new" class="btn btn-primary">+ নতুন রুট</a>
      </div>
      <div class="alert alert-info">রুট একবার তৈরি হলে বদলানো যায় না। ভিন্ন ধাপ দরকার হলে নতুন রুট তৈরি করে কমিটির ধরনের নতুন সংস্করণে সেটি বাছাই করুন।</div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else if (!items().length) { <div class="empty">কোনো রুট নেই।</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>কোড</th><th>নাম</th><th>ধাপ</th><th>অবস্থা</th><th></th></tr></thead>
            <tbody>
              @for (r of items(); track r.id) {
                <tr>
                  <td>{{ r.code }}</td>
                  <td>{{ r.nameBn }}<div class="muted">{{ r.nameEn }}</div></td>
                  <td>{{ r.stepCount ?? r.steps?.length ?? '—' }}</td>
                  <td><span class="badge" [class]="r.isActive === false ? 'badge-secondary' : 'badge-success'">{{ r.isActive === false ? 'বন্ধ' : 'চালু' }}</span></td>
                  <td><a class="btn-ghost btn-sm" style="text-decoration:none" [routerLink]="['/config/routes', r.id]">বিস্তারিত</a></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div></div>
    </div>
  `,
})
export class RouteListComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  items = signal<any[]>([]); loading = signal(true); err = signal('');
  ngOnInit() {
    this.svc.listRoutes().subscribe({
      next: (l) => { this.items.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
