import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-signature-enroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:16px">
      <h1>সাইন Enroll</h1>
      <p style="color:#6b7280;font-size:13px">১ বার সাইন Upload করলেই হবে। পরে কর প্রস্তাবে অটো বসবে।</p>
      @if (err()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca">{{ err() }}</div> }
      @if (okMsg()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#f0fdf4;border:1px solid #bbf7d0">{{ okMsg() }}</div> }

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>কোন পদবীর জন্য? *</label>
            <select style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.designationId">
              <option value="">— পদবী বাছাই করুন —</option>
              @for (d of myAssignments(); track d.id) {
                <option [value]="d.designationId">{{ d.designationNameBn || d.designationCode }}</option>
              }
            </select>
            <small style="color:#6b7280">শুধু আপনার দায়িত্বে থাকা পদবীগুলাই আসবে।</small>
          </div>
          <div>
            <label>তোমার User ID</label>
            <input style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb" [(ngModel)]="form.userId" readonly />
            <small style="color:#6b7280">আপনার পৌরসভা: {{ myMunicipalityName() }}</small>
          </div>
        </div>

        <div style="margin-top:16px;border:1px dashed #d1d5db;border-radius:12px;padding:16px">
          <div style="font-weight:600;margin-bottom:8px">সাইন ফাইল Upload করো</div>
          <input type="file" accept="image/*" (change)="onFile($event)" />
          @if (preview()) { <img [src]="preview()" style="width:100%;max-height:180px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;margin-top:10px;background:#fff" /> }
          @else { <div style="color:#9ca3af;font-size:12px;margin-top:10px">এখনো সাইন বাছা হয় নাই।</div> }
        </div>

        <button style="margin-top:16px;padding:10px 18px;border-radius:8px;background:#111827;color:#fff;cursor:pointer;border:none" (click)="save()">✓ সাইন Save করো</button>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px;margin-top:12px">
        <h3 style="margin:0 0 10px">আমার Enroll করা সাইন</h3>
        <table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid #eee">পদবী</th><th style="text-align:left;padding:10px;border-bottom:1px solid #eee">সাইন</th><th style="text-align:left;padding:10px;border-bottom:1px solid #eee">অবস্থা</th></tr></thead>
        <tbody>
          @for (s of mySignatures(); track s.id) {
            <tr><td style="padding:10px;border-bottom:1px solid #eee"><strong>{{ s.designationNameBn || s.designationCode }}</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee">@if (s.imageUrl) { <img [src]="s.imageUrl" style="height:40px;border:1px solid #eee;border-radius:6px" /> } @else { <span style="color:#6b7280">ছবি নাই</span> }</td>
            <td style="padding:10px;border-bottom:1px solid #eee">{{ s.status || 'ACTIVE' }}</td></tr>
          } @empty { <tr><td colspan="3" style="padding:10px;color:#6b7280">এখনো সাইন Enroll করো নাই।</td></tr> }
        </tbody></table>
      </div>
    </div>
  `
})
export class SignatureEnrollComponent implements OnInit {
  private http = inject(HttpClient);
  private base = 'http://localhost:8095/api/v1';
  err = signal(''); okMsg = signal('');
  myAssignments = signal<any[]>([]);
  mySignatures = signal<any[]>([]);
  preview = signal('');
  myMunicipalityName = signal('আপনার পৌরসভা');
  myMunicipalityId = signal<number | null>(null);
  form: any = { designationId: '', userId: '' };

  // ✅ এইটা মিসিং ছিলো - ফাইলটা এখানে রাখবো
  selectedFile: File | null = null;

  ngOnInit(): void {
    try {
      const dmsUser = JSON.parse(localStorage.getItem('dms_user') || '{}');
      if (dmsUser.id) this.form.userId = dmsUser.id;
      if (dmsUser.municipalityId) this.myMunicipalityId.set(Number(dmsUser.municipalityId));
      try {
        const cache = JSON.parse(localStorage.getItem('dms_municipalities_cache') || '{}');
        const name = cache[String(dmsUser.municipalityId)];
        if (name) this.myMunicipalityName.set(name);
      } catch {}
      if (!this.form.userId) {
        const token = localStorage.getItem('token') || '';
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.sub) this.form.userId = payload.sub;
          if (payload.municipalityId) this.myMunicipalityId.set(Number(payload.municipalityId));
        }
      }
    } catch {}
    this.loadAssignments();
    this.loadMySignatures();
  }

  loadAssignments(): void {
    this.http.get<any>(`${this.base}/local-body/assignments?userId=${this.form.userId}&municipalityId=${this.myMunicipalityId()}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        const arr = Array.isArray(list) ? list : [];
        // ✅ ডাবল থাকলেও ১টা বানাবে
        const map = new Map();
        arr.forEach((a: any) => { if (!map.has(a.designationId)) map.set(a.designationId, a); });
        this.myAssignments.set([...map.values()]);
      },
      error: () => this.myAssignments.set([])
    });
  }

  loadMySignatures(): void {
    this.http.get<any>(`${this.base}/signatures?userId=${this.form.userId}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        this.mySignatures.set(Array.isArray(list) ? list : []);
      },
      error: () => this.mySignatures.set([])
    });
  }

  // ✅ ঠিক করা - ফাইলটা selectedFile এ রাখে
  onFile(e: any): void {
    const f = e.target.files?.[0];
    if (!f) return;
    this.selectedFile = f;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(f);
  }

  save(): void {
  this.err.set(''); this.okMsg.set('');
  if (!this.form.designationId) { this.err.set('পদবী বাছাই করুন'); return; }
  if (!this.selectedFile) { this.err.set('সাইন ফাইল বাছাই করুন'); return; }

  const chosen = this.myAssignments().find((a: any) => String(a.designationId) === String(this.form.designationId));

  // ✅ এই ১১ লাইন মিসিং ছিলো - এইটাই আসল FormData
  const form = new FormData();
  form.append('file', this.selectedFile);
  form.append('userId', this.form.userId);
  form.append('ownerId', this.form.userId);
  form.append('entityId', this.form.userId);
  form.append('sourceId', this.form.userId);
  form.append('sourceService', 'SIGNATURE_ENROLL');
  form.append('designationId', String(this.form.designationId));
  form.append('designationSnapshot', chosen?.designationNameBn || chosen?.designationCode || '');
  form.append('municipalityId', String(this.myMunicipalityId() ?? ''));
  form.append('nameSnapshot', chosen?.userName || '');

  // ✅ Content-Type দিবেন না - Browser নিজে দিবে
  this.http.post(`${this.base}/signatures/enroll`, form).subscribe({
    next: () => {
      this.okMsg.set('সাইন Save হয়ে গেছে ✔');
      this.loadMySignatures();
    },
    error: (err) => {
      this.err.set('সাইন Save হয় নাই! Backend 8095 চলছে কিনা দেখো। (' + err.status + ')');
    }
  });
}
}