import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/services/config.service';
import { Designation } from '../../core/models/config.model';

@Component({
  selector: 'app-designation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>পদবী (Designation)</h1>
        <button class="btn btn-primary" (click)="showForm = !showForm">{{ showForm ? 'বন্ধ' : '+ নতুন পদবী' }}</button>
      </div>

      @if (showForm) {
        <div class="card mb-2">
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label>কোড <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="newCode" placeholder="CHAIR" />
              </div>
              <div class="form-group">
                <label>নাম (বাংলা) <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="newNameBn" />
              </div>
            </div>
            <div class="form-group">
              <label>Name (English)</label>
              <input class="form-control" [(ngModel)]="newNameEn" />
            </div>
            <button class="btn btn-primary" [disabled]="saving()" (click)="create()">সংরক্ষণ</button>
            @if (msg()) { <span class="text-success" style="margin-left:12px">{{ msg() }}</span> }
          </div>
        </div>
      }

      <div class="card">
        <div class="card-body table-wrapper">
          <table class="data-table">
            <thead><tr><th>কোড</th><th>নাম (বাংলা)</th><th>English</th><th>অবস্থা</th></tr></thead>
            <tbody>
              @for (d of items(); track d.id) {
                <tr>
                  <td>{{ d.code }}</td>
                  <td>{{ d.nameBn }}</td>
                  <td>{{ d.nameEn || '—' }}</td>
                  <td><span class="badge" [class]="d.isActive ? 'badge-success' : 'badge-secondary'">{{ d.isActive ? 'সক্রিয়' : 'বন্ধ' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class DesignationListComponent implements OnInit {
  items = signal<Designation[]>([]);
  showForm = false;
  saving = signal(false);
  msg = signal('');
  newCode = '';
  newNameBn = '';
  newNameEn = '';

  constructor(private cfg: ConfigService) {}

  ngOnInit() {
    this.cfg.listDesignations().subscribe((list) => this.items.set(list));
  }

  create() {
    if (!this.newCode || !this.newNameBn) return;
    this.saving.set(true);
    this.cfg.createDesignation({ code: this.newCode, nameBn: this.newNameBn, nameEn: this.newNameEn }).subscribe({
      next: (d) => {
        this.items.update((list) => [...list, d]);
        this.saving.set(false);
        this.msg.set('যোগ হয়েছে।');
        this.newCode = ''; this.newNameBn = ''; this.newNameEn = '';
        this.showForm = false;
      },
      error: () => this.saving.set(false),
    });
  }
}
