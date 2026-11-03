// B-12 : ফাইল আপলোড নীতি
// ⚠ backend API আপনার ডকুমেন্টে নেই; endpoint অনুমান করা
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { UploadPolicy } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';

@Component({
  selector: 'app-upload-policy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>ফাইল আপলোড নীতি</h1></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
      @else {
        <div class="card"><div class="card-body">
          <div class="alert alert-info">
            প্রস্তাবের (resolution) নথি এই নীতি অনুযায়ী যাচাই হবে। সংরক্ষণ করলে নীতির নতুন সংস্করণ তৈরি হয়।
            @if (p().version) { বর্তমান সংস্করণ: {{ p().version }} }
          </div>
          <div class="section-title">অনুমোদিত ফরম্যাট</div>
          <div class="row-actions" style="margin-bottom:14px">
            @for (f of formats; track f) {
              <label class="check"><input type="checkbox" [checked]="p().allowedFormats.includes(f)" (change)="toggle(f)" /> {{ f }}</label>
            }
          </div>
          <div class="grid2">
            <div class="form-group"><label>প্রতি ফাইলের সর্বোচ্চ আকার (MB)</label>
              <input type="number" min="1" class="form-control" [(ngModel)]="p().maxFileSizeMb" /></div>
            <div class="form-group"><label>প্রতি প্রস্তাবে সর্বোচ্চ ফাইল সংখ্যা</label>
              <input type="number" min="1" class="form-control" [(ngModel)]="p().maxFilesPerResolution" /></div>
          </div>
          <button class="btn btn-primary" [disabled]="saving() || !p().allowedFormats.length || !p().maxFileSizeMb || !p().maxFilesPerResolution" (click)="save()">
            {{ saving() ? 'সংরক্ষণ হচ্ছে...' : 'নতুন সংস্করণ হিসেবে সংরক্ষণ' }}
          </button>
        </div></div>
      }
    </div>
  `,
})
export class UploadPolicyComponent implements OnInit {
  private svc = inject(ConfigAdminService);
  formats = ['PDF', 'JPG', 'PNG', 'DOCX', 'XLSX'];
  p = signal<UploadPolicy>({ allowedFormats: ['PDF'], maxFileSizeMb: 5, maxFilesPerResolution: 3 });
  loading = signal(true); saving = signal(false); err = signal(''); msg = signal('');

  ngOnInit() {
    this.svc.getUploadPolicy().subscribe({
      next: (r) => { if (r) this.p.set({ ...r, allowedFormats: r.allowedFormats ?? [] }); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
  toggle(f: string) {
    const cur = this.p();
    this.p.set({ ...cur, allowedFormats: cur.allowedFormats.includes(f) ? cur.allowedFormats.filter(x => x !== f) : [...cur.allowedFormats, f] });
  }
  save() {
    this.saving.set(true); this.err.set(''); this.msg.set('');
    const { version, createdAt, ...body } = this.p();
    this.svc.saveUploadPolicy(body as UploadPolicy).subscribe({
      next: (r) => { this.saving.set(false); if (r) this.p.set({ ...r }); this.msg.set('আপলোড নীতির নতুন সংস্করণ সংরক্ষিত হয়েছে।'); },
      error: (e) => { this.saving.set(false); this.err.set(errMsg(e)); },
    });
  }
}
