import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-local-body-designation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:16px">
      <h1>পৌরসভার পদবী</h1>
      <p style="color:#6b7280;font-size:13px">মেয়র / সচিব / কর নির্ধারক — এখানে বানাবেন। কমিটির পদবীর সাথে মিশবে না।</p>
      @if (err()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca">{{ err() }}</div> }
      @if (okMsg()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#f0fdf4;border:1px solid #bbf7d0">{{ okMsg() }}</div> }
      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><label>Code * (যেমন: MAYOR)</label><input style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.code" placeholder="MAYOR" /></div>
          <div><label>নাম (বাংলা) *</label><input style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.nameBn" placeholder="মেয়র" /></div>
        </div>
        <div style="margin-top:12px"><label>নাম (English)</label><input style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.nameEn" placeholder="Mayor" /></div>
        <button style="margin-top:12px;padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer" (click)="save()">+ পদবী বানান</button>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px;margin-top:12px">
        <h3 style="margin:0 0 10px">পদবীর তালিকা</h3>
        <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #eee">Code</th><th style="text-align:left;padding:10px;border-bottom:1px solid #eee">নাম</th></tr></thead>
        <tbody>@for (d of list(); track d.id) { <tr><td style="padding:10px;border-bottom:1px solid #eee"><strong>{{ d.code }}</strong></td><td style="padding:10px;border-bottom:1px solid #eee">{{ d.nameBn }}</td></tr> } @empty { <tr><td colspan="2" style="padding:10px;color:#6b7280">এখনো পদবী বানানো হয় নাই। উপরে MAYOR বানান।</td></tr> }</tbody></table>
      </div>
    </div>
  `
})
export class LocalBodyDesignationComponent implements OnInit {
  private http = inject(HttpClient);
  // signature-service - proxy দিয়ে গেলে /api/v1 হবে, সরাসরি হলে localhost:8095
  private base = 'http://localhost:8095/api/v1';
  list = signal<any[]>([]);
  err = signal(''); okMsg = signal('');
  municipalityId: number = 15;
  form: any = { code: '', nameBn: '', nameEn: '' };

  ngOnInit(): void {
    // তোমার login থেকে municipalityId localStorage এ যেভাবে আছে, ওইটা থেকে নিবে
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}';
      const u = JSON.parse(raw);
      if (u.municipalityId) this.municipalityId = Number(u.municipalityId);
      if (u.municipality_id) this.municipalityId = Number(u.municipality_id);
    } catch {}
    this.load();
  }

  load(): void {
    this.http.get<any>(`${this.base}/local-body/designations?municipalityId=${this.municipalityId}`).subscribe({
      next: (r) => this.list.set(r?.data ?? []),
      error: (e) => this.err.set('লোড হয় নাই: ' + (e?.error?.message || e?.message || 'Backend চলতেছে কিনা দেখো (8095)'))
    });
  }

  save(): void {
    if (!this.form.code || !this.form.nameBn) { this.err.set('Code আর বাংলা নাম ২টাই দিন।'); return; }
    this.err.set(''); this.okMsg.set('');
    this.http.post<any>(`${this.base}/local-body/designations`, { municipalityId: this.municipalityId, code: this.form.code, nameBn: this.form.nameBn, nameEn: this.form.nameEn }).subscribe({
      next: () => { this.okMsg.set('পদবী বানানো হয়েছে।'); this.form = { code: '', nameBn: '', nameEn: '' }; this.load(); },
      error: (e) => this.err.set(e?.error?.message || 'পদবী বানানো যায়নি। Backend 8095 চলতেছে কিনা দেখো।')
    });
  }
}