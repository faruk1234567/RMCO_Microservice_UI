import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-local-body-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:16px">
      <h1>পৌরসভার দায়িত্ব বরাদ্দ</h1>
      <p style="color:#6b7280;font-size:13px">কোন পদে কে আছে — এখানে সেট করবেন। সাইন এখান থেকে লোক খুঁজবে।</p>
      @if (err()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#fef2f2;border:1px solid #fecaca">{{ err() }}</div> }
      @if (okMsg()) { <div style="padding:10px;border-radius:8px;margin-bottom:12px;background:#f0fdf4;border:1px solid #bbf7d0">{{ okMsg() }}</div> }

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label>পদবী *</label>
            <select style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.designationId">
              <option value="">— পদবী বাছাই করুন —</option>
              @for (d of designations(); track d.id) { <option [value]="d.id">{{ d.designationNameBn || d.designationCode }}</option> }
            </select>
          </div>
          <div>
            <label>দায়িত্বে কে *</label>
            <select style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.userId">
              <option value="">— User বাছাই করুন —</option>
              @for (u of users(); track u.id) { <option [value]="u.id">{{ u.name }} — {{ u.mobile }}</option> }
            </select>
          </div>
        </div>
        <div style="margin-top:12px">
          <label>কবে থেকে *</label>
          <input type="date" style="width:100%;padding:9px;border:1px solid #d1d5db;border-radius:8px" [(ngModel)]="form.fromDate" />
          <small style="color:#6b7280">পৌরসভা বাছতে হবে না। আপনি {{ myMunicipalityName() }} এর এডমিন, তাই অটো ওই পৌরসভারই হবে।</small>
        </div>
        <button style="margin-top:16px;padding:10px 18px;border-radius:8px;background:#111827;color:#fff;cursor:pointer;border:none" (click)="save()">+ দায়িত্ব দিন</button>
      </div>

      <div style="border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:16px;margin-top:12px">
        <h3 style="margin:0 0 10px">বর্তমানে দায়িত্বে কে আছে</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">পদবী</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">দায়িত্বে কে</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">কবে থেকে</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">সাইন ছবি</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">অবস্থা</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            @for (a of assignments(); track a.id) {
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee"><strong>{{ a.designationNameBn || a.designationCode }}</strong></td>
                <td style="padding:10px;border-bottom:1px solid #eee">{{ getUserName(a.userId) }}</td>
                <td style="padding:10px;border-bottom:1px solid #eee">{{ a.fromDate }}</td>
                <td style="padding:10px;border-bottom:1px solid #eee">{{ a.hasSignature ? '✔ আছে' : '✘ নাই' }}</td>
                <td style="padding:10px;border-bottom:1px solid #eee">{{ a.isActive === false ? 'শেষ' : (a.status || 'সক্রিয়') }}</td>
                <td style="padding:10px;border-bottom:1px solid #eee">
                  @if (a.isActive !== false) {
                    <button style="padding:6px 10px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;cursor:pointer" (click)="endAssignment(a.id)">দায়িত্ব শেষ করুন</button>
                  } @else {
                    <span style="color:#6b7280">শেষ</span>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="6" style="padding:10px;color:#6b7280">এখনো কাউকে দায়িত্ব দেওয়া হয় নাই।</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class LocalBodyAssignmentComponent implements OnInit {
  private http = inject(HttpClient);
  // FIX: সরাসরি 8095 না, Gateway দিয়ে - Enroll এর মতোই
  private base = environment.signatureUrl; // '/signature-service'
  err = signal(''); okMsg = signal('');
  designations = signal<any[]>([]);
  users = signal<any[]>([]);
  assignments = signal<any[]>([]);
  myMunicipalityName = signal('আপনার পৌরসভা');
  myMunicipalityId = signal<number | null>(null);
  form: any = { designationId: '', userId: '', fromDate: new Date().toISOString().slice(0, 10) };

  getMyMunicipalityId(): number | null { return this.myMunicipalityId(); }

  ngOnInit(): void {
    try {
      const me = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
      const name = me.municipalityName || me.municipality?.name || me.municipalityNameBn || '';
      if (name) this.myMunicipalityName.set(name);
      const id = me.municipalityId || me.municipality_id || me.municipality?.id;
      if (id) this.myMunicipalityId.set(Number(id));
    } catch {}
    this.loadMyMunicipality();
  }

  loadMyMunicipality(): void {
    try {
      const dmsUser = JSON.parse(localStorage.getItem('dms_user') || '{}');
      if (dmsUser.municipalityId) {
        this.myMunicipalityId.set(Number(dmsUser.municipalityId));
        try {
          const cache = JSON.parse(localStorage.getItem('dms_municipalities_cache') || '{}');
          const name = cache[String(dmsUser.municipalityId)];
          if (name) this.myMunicipalityName.set(name);
        } catch {}
        this.loadDesignations(); this.loadUsers(); this.loadAssignments(); return;
      }
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.municipalityId) {
          this.myMunicipalityId.set(Number(payload.municipalityId));
          this.loadDesignations(); this.loadUsers(); this.loadAssignments(); return;
        }
      }
    } catch {}
    this.err.set('আপনার পৌরসভা পাওয়া যায় নাই। আবার লগইন করেন।');
  }

  loadDesignations(): void {
    const mid = this.getMyMunicipalityId();
    this.http.get<any>(`${this.base}/local-body/designations?municipalityId=${mid}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        const arr = Array.isArray(list) ? list : [];
        this.designations.set(arr.map((d: any) => ({
          id: d.id || d.designationId,
          designationNameBn: d.designationNameBn || d.nameBn || d.name_bn || d.name,
          designationCode: d.designationCode || d.code
        })));
      },
      error: () => this.designations.set([])
    });
  }

  loadUsers(): void {
    this.http.get<any>(`http://localhost:8081/api/v1/users`, {
      params: { municipalityId: String(this.getMyMunicipalityId() ?? ''), size: '100' }
    }).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.content ?? r?.data ?? r;
        const arr = Array.isArray(list) ? list : [];
        this.users.set(arr.map((u: any) => ({
          id: u.id || u.userId,
          name: u.name || u.nameBn || u.fullName || u.citizenName || u.displayName || u.mobile,
          mobile: u.mobile || u.phone || u.id
        })));
      },
      error: (e) => { console.error('loadUsers failed', e); this.users.set([]); }
    });
  }

  loadAssignments(): void {
    const mid = this.getMyMunicipalityId();
    this.http.get<any>(`${this.base}/local-body/assignments?municipalityId=${mid}`).subscribe({
      next: (r) => {
        const list = r?.data?.content ?? r?.data ?? r?.content ?? r;
        const arr = Array.isArray(list) ? list : [];
        // FIX: Backend signatureDocumentId পাঠায়, hasSignature বানিয়ে নিতে হবে
        this.assignments.set(arr.map((a: any) => ({
          ...a,
          hasSignature: !!a.signatureDocumentId
        })));
      },
      error: () => this.assignments.set([])
    });
  }

  save(): void {
    if (!this.form.designationId || !this.form.userId) { this.err.set('পদবী আর User ২টাই বাছুন।'); return; }
    const myMid = this.getMyMunicipalityId();
    if (!myMid) { this.err.set('আপনার নিজের কোনো পৌরসভা পাওয়া যায় নাই।'); return; }
    const alreadyActive = this.assignments().some((a: any) =>
      String(a.designationId) === String(this.form.designationId) &&
      a.isActive !== false && a.status !== 'INACTIVE' && a.status !== 'ENDED' && a.status !== 'শেষ'
    );
    if (alreadyActive) {
      const dName = this.designations().find((d: any) => String(d.id) === String(this.form.designationId))?.designationNameBn || 'এই পদবীতে';
      const existing = this.assignments().find((a: any) => String(a.designationId) === String(this.form.designationId) && a.isActive !== false);
      this.err.set(`${dName} তে ${this.getUserName(existing?.userId)} ইতিমধ্যে সক্রিয় আছেন। আগে তার দায়িত্ব শেষ করুন, তারপর নতুন জনকে দিন।`);
      this.okMsg.set(''); return;
    }
    this.err.set(''); this.okMsg.set('');
    this.http.post<any>(`${this.base}/local-body/assignments`, {
      designationId: this.form.designationId,
      userId: this.form.userId,
      fromDate: this.form.fromDate,
      municipalityId: myMid
    }, { headers: { 'X-Municipality-Id': String(myMid) } }).subscribe({
      next: () => { this.okMsg.set('দায়িত্ব দেওয়া হইছে।'); this.loadAssignments(); },
      error: (e) => this.err.set(e?.error?.message || e?.error?.error || 'সেভ হয় নাই।')
    });
  }

  getUserName(userId: any): string {
    const u = this.users().find((x: any) => String(x.id) === String(userId));
    if (u) return `${u.name} — ${u.mobile}`;
    return String(userId);
  }

  endAssignment(id: string): void {
    if (!confirm('এই দায়িত্বটা শেষ করে দিবো?')) return;
    this.http.put<any>(`${this.base}/local-body/assignments/${id}/end`, {}).subscribe({
      next: () => { this.okMsg.set('দায়িত্ব শেষ হইছে।'); this.loadAssignments(); },
      error: () => this.err.set('শেষ হয় নাই। Backend এ /end API টা আছে কিনা দেখেন।')
    });
  }
}