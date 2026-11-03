// B-11 : Label ও বার্তার (SMS) টেমপ্লেট
// ⚠ এর backend API আপনার ডকুমেন্টে নেই; endpoint অনুমান করা (config-admin.service.ts দেখুন)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { NotificationTemplate, UiLabel } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-label-template',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>Label ও বার্তার টেমপ্লেট</h1></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      <div class="tabs-row">
        <button class="tab-btn" [class.active]="tab() === 'label'" (click)="tab.set('label')">পর্দার Label</button>
        <button class="tab-btn" [class.active]="tab() === 'tpl'" (click)="tab.set('tpl')">SMS / বার্তার টেমপ্লেট</button>
      </div>

      @if (tab() === 'label') {
        <div class="card mb-2"><div class="card-body">
          <div class="grid3">
            <div class="form-group"><label>Key <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="lKey" placeholder="committee.create.title" /></div>
            <div class="form-group"><label>বাংলা <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="lBn" /></div>
            <div class="form-group"><label>English</label>
              <input class="form-control" [(ngModel)]="lEn" /></div>
          </div>
          <button class="btn btn-primary" [disabled]="busy() || !lKey.trim() || !lBn.trim()" (click)="saveLabel()">সংরক্ষণ</button>
          <span class="muted" style="margin-left:10px">একই key আবার সংরক্ষণ করলে নতুন মান কার্যকর হবে, পুরনোটি ইতিহাসে থাকবে।</span>
        </div></div>
        <div class="card"><div class="card-body table-wrapper">
          <table class="data-table">
            <thead><tr><th>Key</th><th>বাংলা</th><th>English</th></tr></thead>
            <tbody>
              @for (l of labels(); track l.key) { <tr><td>{{ l.key }}</td><td>{{ l.labelBn }}</td><td>{{ l.labelEn || '—' }}</td></tr> }
              @empty { <tr><td colspan="3" class="empty">কোনো label নেই</td></tr> }
            </tbody>
          </table>
        </div></div>
      } @else {
        <div class="card mb-2"><div class="card-body">
          <div class="grid2">
            <div class="form-group"><label>টেমপ্লেট কোড <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="tCode" placeholder="OTP_MEMBER_VERIFY" /></div>
            <div class="form-group"><label>মাধ্যম</label>
              <select class="form-control" [(ngModel)]="tChannel"><option value="SMS">SMS</option><option value="EMAIL">ইমেইল</option></select></div>
          </div>
          <div class="form-group"><label>বার্তা (বাংলা) <span class="required">*</span></label>
            <textarea class="form-control" rows="3" [(ngModel)]="tBn" placeholder="আপনার যাচাইকরণ কোড (OTP) পাঠানো হয়েছে"></textarea></div>
          <div class="form-group"><label>Message (English)</label>
            <textarea class="form-control" rows="3" [(ngModel)]="tEn"></textarea></div>
          <div class="muted" style="margin-bottom:10px">পরিবর্তনশীল অংশ ডাবল curly bracket-এর ভেতরে লিখুন, যেমন otp, committeeName।</div>
          <button class="btn btn-primary" [disabled]="busy() || !tCode.trim() || !tBn.trim()" (click)="saveTpl()">সংরক্ষণ</button>
        </div></div>
        <div class="card"><div class="card-body table-wrapper">
          <table class="data-table">
            <thead><tr><th>কোড</th><th>মাধ্যম</th><th>বার্তা (বাংলা)</th></tr></thead>
            <tbody>
              @for (t of templates(); track t.code) { <tr><td>{{ t.code }}</td><td>{{ t.channel }}</td><td>{{ t.bodyBn }}</td></tr> }
              @empty { <tr><td colspan="3" class="empty">কোনো টেমপ্লেট নেই</td></tr> }
            </tbody>
          </table>
        </div></div>
      }
    </div>
  `,
})
export class LabelTemplateComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  tab = signal<'label' | 'tpl'>('label');
  labels = signal<UiLabel[]>([]); templates = signal<NotificationTemplate[]>([]);
  busy = signal(false); err = signal(''); msg = signal('');
  lKey = ''; lBn = ''; lEn = '';
  tCode = ''; tChannel: 'SMS' | 'EMAIL' = 'SMS'; tBn = ''; tEn = '';

  ngOnInit() { this.load(); }
  load() {
    this.svc.listLabels().subscribe({ next: l => this.labels.set(l ?? []), error: e => this.err.set(errMsg(e)) });
    this.svc.listTemplates().subscribe({ next: l => this.templates.set(l ?? []), error: e => this.err.set(errMsg(e)) });
  }
  saveLabel() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.svc.saveLabel({ key: this.lKey.trim(), labelBn: this.lBn.trim(), labelEn: this.lEn.trim() }).subscribe({
      next: () => { this.busy.set(false); this.msg.set('Label সংরক্ষিত হয়েছে।'); this.lKey = this.lBn = this.lEn = ''; this.load(); },
      error: e => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
  saveTpl() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.svc.saveTemplate({ code: this.tCode.trim(), channel: this.tChannel, bodyBn: this.tBn.trim(), bodyEn: this.tEn.trim() }).subscribe({
      next: () => { this.busy.set(false); this.msg.set('টেমপ্লেট সংরক্ষিত হয়েছে।'); this.tCode = this.tBn = this.tEn = ''; this.load(); },
      error: e => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
