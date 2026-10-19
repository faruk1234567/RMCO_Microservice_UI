import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../core/services/config.service';
import { CommitteeType } from '../../core/models/committee.model';

@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কমিটির ধরন (Config)</h1>
        <button class="btn btn-primary" (click)="alertDemo()">+ নতুন ধরন</button>
      </div>
      @if (loading()) { <div class="spinner"></div> }
      @if (!loading()) {
        <div class="card">
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr><th>কোড</th><th>নাম (বাংলা)</th><th>সংস্করণ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr>
              </thead>
              <tbody>
                @for (t of types(); track t.id) {
                  <tr>
                    <td>{{ t.code }}</td>
                    <td>{{ t.nameBn }}</td>
                    <td>v{{ t.latestVersionNo || '—' }}</td>
                    <td>
                      <span class="badge" [class]="t.latestPublishedVersionId ? 'badge-success' : 'badge-warning'">
                        {{ t.latestPublishedVersionId ? 'প্রকাশিত' : 'খসড়া' }}
                      </span>
                    </td>
                    <td><button class="btn btn-sm btn-secondary" (click)="alertDemo()">সম্পাদনা</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class TypeListComponent implements OnInit {
  types = signal<CommitteeType[]>([]);
  loading = signal(true);
  constructor(private cfg: ConfigService) {}
  ngOnInit() {
    this.cfg.listTypes().subscribe({ next: (t) => { this.types.set(t); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  alertDemo() { alert('Config CRUD API কানেক্ট হলে এখানে মডাল খুলবে।'); }
}
