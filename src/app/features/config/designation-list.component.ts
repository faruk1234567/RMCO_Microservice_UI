// B-04 : পদবীর তালিকা (আপনার আগের কোড ভিত্তি করে উন্নত – একই ConfigService ব্যবহার করে)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/services/config.service';
import { Designation } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-designation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>পদবী (Designation)</h1>
        <button class="btn btn-primary" (click)="showForm = !showForm">{{ showForm ? 'বন্ধ' : '+ নতুন পদবী' }}</button>
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      @if (showForm) {
        <div class="card mb-2"><div class="card-body">
          <div class="grid3">
            <div class="form-group">
              <label>কোড <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="newCode" placeholder="CHAIR" />
            </div>
            <div class="form-group">
              <label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="newNameBn" />
            </div>
            <div class="form-group">
              <label>Name (English)</label>
              <input class="form-control" [(ngModel)]="newNameEn" />
            </div>
          </div>
          <button class="btn btn-primary" [disabled]="saving() || !newCode.trim() || !newNameBn.trim()" (click)="create()">সংরক্ষণ</button>
        </div></div>
      }

      <div class="toolbar">
        <input class="form-control" style="max-width:280px" placeholder="কোড বা নাম দিয়ে খুঁজুন" [ngModel]="q()" (ngModelChange)="q.set($event)" />
        <span class="muted">{{ filtered().length }} / {{ items().length }}টি</span>
      </div>

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>কোড</th><th>নাম (বাংলা)</th><th>English</th><th>অবস্থা</th></tr></thead>
            <tbody>
              @for (d of filtered(); track d.id) {
                <tr>
                  <td>{{ d.code }}</td><td>{{ d.nameBn }}</td><td>{{ d.nameEn || '—' }}</td>
                  <td><span class="badge" [class]="d.isActive ? 'badge-success' : 'badge-secondary'">{{ d.isActive ? 'সক্রিয়' : 'বন্ধ' }}</span></td>
                </tr>
              } @empty { <tr><td colspan="4" class="empty">কিছু পাওয়া যায়নি।</td></tr> }
            </tbody>
          </table>
        }
      </div></div>
    </div>
  `,
})
export class DesignationListComponent implements OnInit {
  private cfg = inject(ConfigService);
  items = signal<Designation[]>([]);
  q = signal('');
  filtered = computed(() => {
    const s = this.q().trim().toLowerCase();
    return s ? this.items().filter(d => (d.code + d.nameBn + (d.nameEn ?? '')).toLowerCase().includes(s)) : this.items();
  });
  showForm = false;
  loading = signal(true); saving = signal(false);
  msg = signal(''); err = signal('');
  newCode = ''; newNameBn = ''; newNameEn = '';

  ngOnInit() {
    this.cfg.listDesignations().subscribe({
      next: (l: Designation[]) => { this.items.set(l); this.loading.set(false); },
      error: (e: any) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  create() {
    this.saving.set(true); this.err.set(''); this.msg.set('');
    this.cfg.createDesignation({ code: this.newCode.trim(), nameBn: this.newNameBn.trim(), nameEn: this.newNameEn.trim() }).subscribe({
      next: (d: Designation) => {
        this.items.update(list => [...list, d]); this.saving.set(false); this.msg.set('পদবী যোগ হয়েছে।');
        this.newCode = this.newNameBn = this.newNameEn = ''; this.showForm = false;
      },
      error: (e: any) => { this.saving.set(false); this.err.set(errMsg(e)); },
    });
  }
}
