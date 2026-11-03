// B-01 : কমিটির ধরনের তালিকা
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { CommitteeTypeRow } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, STATUS_LABEL, errMsg, versionsOf } from './config-shared';

@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কমিটির ধরন</h1>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'বন্ধ' : '+ নতুন ধরন' }}</button>
      </div>

      <div class="alert alert-info">
        প্রকাশিত ধরন বা সংস্করণ মোছা বা বদলানো যায় না। পরিবর্তন করতে "নতুন সংস্করণ" তৈরি করুন; আগের সংস্করণ অপরিবর্তিত থাকবে।
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      @if (showForm()) {
        <div class="card mb-2">
          <div class="card-header"><h3>নতুন কমিটির ধরন</h3></div>
          <div class="card-body">
            <div class="grid3">
              <div class="form-group">
                <label>কোড <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="newCode" placeholder="WARD_COMMITTEE" />
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
            <button class="btn btn-primary" [disabled]="saving() || !newCode.trim() || !newNameBn.trim()" (click)="create()">
              {{ saving() ? 'সংরক্ষণ হচ্ছে...' : 'ধরন তৈরি করুন' }}
            </button>
          </div>
        </div>
      }

      <div class="toolbar">
        <label class="check">
          <input type="checkbox" [ngModel]="!onlyActive()" (ngModelChange)="toggleActive(!$event)" />
          বন্ধ (inactive) ধরনও দেখান
        </label>
        <span class="muted">মোট {{ items().length }}টি</span>
      </div>

      <div class="card">
        <div class="card-body table-wrapper">
          @if (loading()) {
            <div class="empty">লোড হচ্ছে...</div>
          } @else if (!items().length) {
            <div class="empty">কোনো কমিটির ধরন নেই। "+ নতুন ধরন" চাপুন।</div>
          } @else {
            <table class="data-table">
              <thead>
                <tr><th>কোড</th><th>নাম</th><th>সংস্করণ</th><th>অবস্থা</th><th>কাজ</th></tr>
              </thead>
              <tbody>
                @for (t of items(); track t.id) {
                  <tr>
                    <td>{{ t.code }}</td>
                    <td>{{ t.nameBn }}<div class="muted">{{ t.nameEn }}</div></td>
                    <td>
                      @for (v of versionsOf(t); track v.id) {
                        <a class="chip" [routerLink]="['/config/types', t.id, 'versions', v.id]">
                          v{{ v.versionNo }} <span class="st" [class]="'st st-' + v.status">{{ label[v.status] }}</span>
                        </a>
                      } @empty { <span class="muted">—</span> }
                    </td>
                    <td><span class="badge" [class]="t.isActive ? 'badge-success' : 'badge-secondary'">{{ t.isActive ? 'চালু' : 'বন্ধ' }}</span></td>
                    <td>
                      <button class="btn-ghost btn-sm" [disabled]="busyId() === t.id" (click)="newVersion(t)">
                        {{ busyId() === t.id ? '...' : '+ নতুন সংস্করণ' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
})
export class TypeListComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  private router = inject(Router);

  items = signal<CommitteeTypeRow[]>([]);
  loading = signal(true);
  saving = signal(false);
  busyId = signal('');
  err = signal('');
  msg = signal('');
  showForm = signal(false);
  onlyActive = signal(true);
  label = STATUS_LABEL;
  versionsOf = versionsOf;

  newCode = ''; newNameBn = ''; newNameEn = '';

  ngOnInit() { this.load(); }

  toggleActive(onlyActive: boolean) { this.onlyActive.set(onlyActive); this.load(); }

  load() {
    this.loading.set(true); this.err.set('');
    this.svc.listTypes(this.onlyActive()).subscribe({
      next: (l) => { this.items.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  create() {
    this.saving.set(true); this.err.set(''); this.msg.set('');
    this.svc.createType({ code: this.newCode.trim(), nameBn: this.newNameBn.trim(), nameEn: this.newNameEn.trim() }).subscribe({
      next: () => {
        this.saving.set(false); this.msg.set('নতুন ধরন তৈরি হয়েছে। এখন তার খসড়া সংস্করণ খুলে কনফিগার করুন।');
        this.newCode = this.newNameBn = this.newNameEn = ''; this.showForm.set(false); this.load();
      },
      error: (e) => { this.saving.set(false); this.err.set(errMsg(e)); },
    });
  }

  newVersion(t: CommitteeTypeRow) {
    this.busyId.set(t.id); this.err.set('');
    this.svc.createVersion(t.id).subscribe({
      next: (r) => {
        this.busyId.set('');
        const vid = r['id'] ?? r['versionId'];
        if (vid) this.router.navigate(['/config/types', t.id, 'versions', vid]);
        else this.load();
      },
      error: (e) => { this.busyId.set(''); this.err.set(errMsg(e)); },
    });
  }
}
