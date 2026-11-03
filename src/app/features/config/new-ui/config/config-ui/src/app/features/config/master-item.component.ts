// B-09 : ধারণ তালিকা (Master item) – কারণ, সদস্যের ধরন ইত্যাদি, group অনুযায়ী
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { MasterItem } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-master-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>ধারণ তালিকা (Master item)</h1>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'বন্ধ' : '+ নতুন আইটেম' }}</button>
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      <div class="toolbar">
        <label>গ্রুপ:</label>
        <select class="form-control" style="max-width:260px" [ngModel]="group()" (ngModelChange)="setGroup($event)">
          @for (g of groups; track g.v) { <option [value]="g.v">{{ g.l }}</option> }
          <option value="__custom">অন্য গ্রুপ (নিজে লিখব)...</option>
        </select>
        @if (group() === '__custom') {
          <input class="form-control" style="max-width:220px" placeholder="GROUP_CODE" [(ngModel)]="customGroup" />
          <button class="btn-ghost" [disabled]="!customGroup.trim()" (click)="load()">দেখুন</button>
        }
      </div>

      @if (showForm()) {
        <div class="card mb-2"><div class="card-body">
          <div class="muted" style="margin-bottom:8px">গ্রুপ: <strong>{{ activeGroup() }}</strong></div>
          <div class="grid3">
            <div class="form-group"><label>কোড <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="code" placeholder="HEALTH_REASON" /></div>
            <div class="form-group"><label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="nameBn" /></div>
            <div class="form-group"><label>Name (English)</label>
              <input class="form-control" [(ngModel)]="nameEn" /></div>
          </div>
          <button class="btn btn-primary" [disabled]="saving() || !code.trim() || !nameBn.trim() || !activeGroup()" (click)="create()">সংরক্ষণ</button>
        </div></div>
      }

      <div class="card"><div class="card-body table-wrapper">
        @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
        @else {
          <table class="data-table">
            <thead><tr><th>কোড</th><th>নাম (বাংলা)</th><th>English</th><th>অবস্থা</th></tr></thead>
            <tbody>
              @for (m of items(); track m.id) {
                <tr><td>{{ m.code }}</td><td>{{ m.nameBn }}</td><td>{{ m.nameEn || '—' }}</td>
                  <td><span class="badge" [class]="m.isActive === false ? 'badge-secondary' : 'badge-success'">{{ m.isActive === false ? 'বন্ধ' : 'সক্রিয়' }}</span></td></tr>
              } @empty { <tr><td colspan="4" class="empty">এই গ্রুপে কিছু নেই।</td></tr> }
            </tbody>
          </table>
        }
      </div></div>
    </div>
  `,
})
export class MasterItemComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  // ⚠ group-এর কোডগুলো অনুমান; আপনার backend-এর সাথে মিলিয়ে নিন
  groups = [
    { v: 'GO_BACK_REASON', l: 'ফেরত পাঠানোর কারণ' },
    { v: 'REJECT_REASON', l: 'প্রত্যাখ্যানের কারণ' },
    { v: 'DISSOLVE_REASON', l: 'বিলুপ্তির কারণ' },
    { v: 'MEMBER_TYPE', l: 'সদস্যের ধরন' },
    { v: 'RESOLUTION_SUBJECT', l: 'প্রস্তাবের বিষয়' },
  ];
  group = signal('GO_BACK_REASON');
  customGroup = '';
  items = signal<MasterItem[]>([]);
  loading = signal(false); saving = signal(false); showForm = signal(false);
  err = signal(''); msg = signal('');
  code = ''; nameBn = ''; nameEn = '';

  activeGroup = () => (this.group() === '__custom' ? this.customGroup.trim() : this.group());

  ngOnInit() { this.load(); }
  setGroup(g: string) { this.group.set(g); if (g !== '__custom') this.load(); else this.items.set([]); }

  load() {
    const g = this.activeGroup(); if (!g) return;
    this.loading.set(true); this.err.set('');
    this.svc.listMasterItems(g).subscribe({
      next: (l) => { this.items.set(l ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  create() {
    this.saving.set(true); this.err.set(''); this.msg.set('');
    this.svc.createMasterItem({ group: this.activeGroup(), code: this.code.trim(), nameBn: this.nameBn.trim(), nameEn: this.nameEn.trim() }).subscribe({
      next: () => { this.saving.set(false); this.msg.set('আইটেম যোগ হয়েছে।'); this.code = this.nameBn = this.nameEn = ''; this.showForm.set(false); this.load(); },
      error: (e) => { this.saving.set(false); this.err.set(errMsg(e)); },
    });
  }
}
