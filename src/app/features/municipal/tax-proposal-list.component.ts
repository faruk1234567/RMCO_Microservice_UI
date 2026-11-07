// T-01 : কর প্রস্তাব — নতুন তৈরি, ID দিয়ে খোলা, সম্প্রতি দেখা
// ⚠ তালিকার API নেই, তাই "সম্প্রতি" তালিকা এই ব্রাউজারে মনে রাখা হয়
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MUNI_STYLES, RK, Recent, UUID_RE, fmtDate } from './municipal-shared';

@Component({
  selector: 'app-tax-proposal-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>কর প্রস্তাব</h1><a routerLink="/tax-proposals/new" class="btn btn-primary">+ নতুন প্রস্তাব</a></div>

      <div class="card mb-2"><div class="card-body">
        <div class="toolbar" style="margin:0">
          <input class="form-control" style="flex:1" placeholder="কর প্রস্তাবের ID (UUID) দিয়ে খুলুন" [(ngModel)]="lookup" (keyup.enter)="open()" />
          <button class="btn btn-primary" (click)="open()">খুলুন</button>
        </div>
        @if (err()) { <div class="muted bad-text" style="margin-top:6px">{{ err() }}</div> }
      </div></div>

      <div class="card"><div class="card-header"><h3>সম্প্রতি</h3></div><div class="card-body table-wrapper">
        <table class="data-table">
          <thead><tr><th>শিরোনাম</th><th>ID</th><th>কখন</th><th></th></tr></thead>
          <tbody>
            @for (r of recent; track r.id) {
              <tr><td>{{ r.label }}</td><td class="muted">{{ r.id.slice(0, 8) }}…</td><td>{{ fmt(r.at) }}</td>
                <td><a class="btn-ghost btn-sm" style="text-decoration:none" [routerLink]="['/tax-proposals', r.id]">খুলুন</a></td></tr>
            } @empty { <tr><td colspan="4" class="empty">এই ব্রাউজারে এখনো কোনো প্রস্তাব খোলা বা তৈরি হয়নি।</td></tr> }
          </tbody>
        </table>
      </div></div>
    </div>
  `,
})
export class TaxProposalListComponent {
  private router = inject(Router);
  recent = Recent.list(RK.tax);
  lookup = ''; err = signal('');
  fmt = (v: any) => fmtDate(v, true);
  open() {
    const id = this.lookup.trim();
    if (!UUID_RE.test(id)) { this.err.set('ID সঠিক নয়।'); return; }
    this.router.navigate(['/tax-proposals', id]);
  }
}
