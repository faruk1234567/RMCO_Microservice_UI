import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../core/services/config.service';
import { ApprovalRoute } from '../../core/models/config.model';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>অনুমোদন রুট</h1>
        <button class="btn btn-primary" (click)="alert('নতুন রুট')">+ নতুন রুট</button>
      </div>
      @for (r of routes(); track r.id) {
        <div class="card mb-2">
          <div class="card-header">
            <h3>{{ r.nameBn }} <small class="text-muted">({{ r.code }})</small></h3>
            <span class="badge" [class]="r.isActive ? 'badge-success' : 'badge-secondary'">{{ r.isActive ? 'সক্রিয়' : 'বন্ধ' }}</span>
          </div>
          <div class="card-body">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              @for (s of r.steps || []; track s.id; let last = $last) {
                <div style="background:#f0f7f3;padding:8px 14px;border-radius:8px;font-size:0.9rem">
                  <strong>{{ s.stepOrder }}. {{ s.nameBn }}</strong>
                  <div class="text-muted" style="font-size:0.8rem">{{ s.assigneeType }}: {{ s.assigneeValue }} · SLA {{ s.slaHours }}ঘণ্টা</div>
                </div>
                @if (!last) { <span style="color:var(--primary);font-weight:700">→</span> }
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RouteListComponent implements OnInit {
  routes = signal<ApprovalRoute[]>([]);
  constructor(private cfg: ConfigService) {}
  ngOnInit() { this.cfg.listRoutes().subscribe((r) => this.routes.set(r)); }
  alert(m: string) { window.alert(m + ' — API কানেক্ট হলে মডাল খুলবে।'); }
}
