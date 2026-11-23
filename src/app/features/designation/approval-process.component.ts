import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-approval-process',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:16px">
      <h1>অনুমোদন প্রসেস সেটিংস</h1>
      <p style="color:#6b7280;font-size:13px">কমিটি গঠনের পর ফাইল কার কাছে যাবে, এখানে সেট করবেন। কোডে হাত দিতে হবে না।</p>
      @if (err()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca">{{ err() }}</div> }
      @if (okMsg()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#f0fdf4;border:1px solid #bbf7d0">{{ okMsg() }}</div> }

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label>কোন প্রসেস? *</label>
            <select style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.processKey" (change)="loadSteps()">
              <option value="COMMITTEE_FORMATION">কমিটি গঠন</option>
              <option value="PROPOSAL">প্রস্তাব</option>
            </select>
          </div>
          <div>
            <label>ধাপ নম্বর *</label>
            <input type="number" style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.stepOrder" />
            <small style="color:#6b7280">১ মানে প্রথমে যাবে</small>
          </div>
          <div>
            <label>পদবী *</label>
            <select style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.designationCode">
              <option value="">— পদবী বাছাই করুন —</option>
              @for (d of designations(); track $index) { <option [value]="d.designationCode">{{ d.designationNameBn }}</option> }
            </select>
          </div>
        </div>
        <button style="margin-top:16px;padding:10px 18px;border-radius:8px;background:#111827;color:#fff;cursor:pointer;border:none" (click)="save()">+ ধাপ যোগ করুন</button>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px;margin-top:12px">
        <h3 style="margin:0 0 10px">{{ form.processKey === 'COMMITTEE_FORMATION' ? 'কমিটি গঠন' : 'প্রস্তাব' }} - এখন কে কে আছে</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">ধাপ</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">পদবী</th>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">অ্যাকশন</th>
          </tr></thead>
          <tbody>
            @for (s of steps(); track $index) {
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee">ধাপ {{ s.step_order || s.stepOrder }}</td>
                <td style="padding:10px;border-bottom:1px solid #eee"><strong>{{ s.designation_name_bn || s.designationNameBn }}</strong> ({{ s.designation_code || s.designationCode }})</td>
                <td style="padding:10px;border-bottom:1px solid #eee">
                  <button style="padding:6px 10px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;cursor:pointer" (click)="remove(s.id)">মুছুন</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="3" style="padding:10px;color:#6b7280">এখনো কোনো ধাপ দেওয়া হয় নাই।</td></tr> }
          </tbody>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:10px">যেমন: কমিটি গঠন → ধাপ ১: মেয়র। তাহলে কমিটি বানালেই ফাইল মেয়রের কাছে যাবে।</p>
      </div>
    </div>
  `
})
export class ApprovalProcessComponent implements OnInit {
  private http = inject(HttpClient);
  private base = (environment as any).workflowUrl || ((environment as any).apiUrl || '') + '/workflow';
  private sigBase = (environment as any).signatureUrl || ((environment as any).apiUrl || '') + '/signature';
  err = signal(''); okMsg = signal('');
  steps = signal<any[]>([]);
  designations = signal<any[]>([]);
  myMunicipalityId = signal<number | null>(null);
  form: any = { processKey: 'COMMITTEE_FORMATION', stepOrder: 1, designationCode: '', designationNameBn: '' };

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('dms_user') || localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}';
      const u = JSON.parse(raw);
      const mid = u.municipalityId || u.municipality_id || u?.municipality?.id || u?.user?.municipalityId;
      if (mid) this.myMunicipalityId.set(Number(mid));
      else this.myMunicipalityId.set(15);
    } catch { this.myMunicipalityId.set(15); }
    this.loadDesignations();
    this.loadSteps();
  }

  loadDesignations(): void {
    this.http.get<any>(`${this.sigBase}/local-body/designations?municipalityId=${this.myMunicipalityId()}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        const arr = Array.isArray(list) ? list : [];
        this.designations.set(arr.map((d: any) => ({
          id: d.id || d.designationId || d.code,
          designationCode: d.designationCode || d.code || d.designation_code,
          designationNameBn: d.designationNameBn || d.nameBn || d.name_bn || d.name || d.designationCode
        })));
      },
      error: () => this.designations.set([])
    });
  }

  loadSteps(): void {
    if (!this.myMunicipalityId()) return;
    this.http.get<any>(`${this.base}/approval-process/${this.myMunicipalityId()}/${this.form.processKey}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        this.steps.set(Array.isArray(list) ? list : []);
        if (this.steps().length > 0) this.form.stepOrder = this.steps().length + 1;
        else this.form.stepOrder = 1;
      },
      error: () => this.steps.set([])
    });
  }

  save(): void {
    if (!this.form.designationCode) { this.err.set('পদবী বাছুন।'); return; }
    const found = this.designations().find((d: any) => String(d.designationCode) === String(this.form.designationCode));
    const name = found?.designationNameBn || this.form.designationCode;
    this.err.set(''); this.okMsg.set('');
    this.http.post<any>(`${this.base}/approval-process`, {
      processKey: this.form.processKey,
      stepOrder: this.form.stepOrder,
      designationCode: this.form.designationCode,
      designationNameBn: name
    }).subscribe({
      next: () => { this.okMsg.set('ধাপ যোগ হয়েছে।'); this.loadSteps(); },
      error: (e) => this.err.set(e?.error?.message || 'সেভ হয় নাই।')
    });
  }

  remove(id: string): void {
    if (!confirm('এই ধাপটা মুছে দিবো?')) return;
    this.http.delete<any>(`${this.base}/approval-process/${id}`).subscribe({
      next: () => { this.okMsg.set('ধাপ মুছে ফেলা হয়েছে।'); this.loadSteps(); },
      error: () => this.err.set('মুছা যায় নাই।')
    });
  }
}