import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface DesignationRow { id: string; code: string; nameBn: string; nameEn: string; isActive: boolean; }
interface UserRow { id: string; nameBn?: string; nameEn?: string; mobile?: string; }
interface AssignmentRow {
  id?: string; designationId: string; designationNameBn?: string;
  userId: string; userName?: string; userMobile?: string;
  fromDate: string; toDate?: string | null; isActive: boolean;
}

@Component({
  selector: 'app-designation-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header"><div><h1>দায়িত্ব বরাদ্দ</h1><p class="muted">কোন পদবীতে কে দায়িত্বে আছে — এখানে সেট করবেন। Approval এইখান থেকে লোক খুঁজবে।</p></div></div>
      @if (!municipalityId()) { <div class="alert alert-err">Municipality Select করুন।</div>
      } @else if (!hasPermission()) { <div class="alert alert-err">Permission নাই। Platform থেকে designation.assign নিন।</div>
      } @else {
        @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
        @if (okMsg()) { <div class="alert alert-ok">{{ okMsg() }}</div> }
        <div class="card"><div class="card-body">
          <div class="grid2">
            <div class="form-group"><label>পদবী *</label>
              <select class="form-control" [(ngModel)]="form.designationId">
                <option value="">— পদবী বাছাই করুন —</option>
                @for (d of designations(); track d.id) { <option [value]="d.id">{{ d.nameBn }} ({{ d.code }})</option> }
              </select></div>
            <div class="form-group"><label>দায়িত্বে কে *</label>
              <select class="form-control" [(ngModel)]="form.userId">
                <option value="">— User বাছাই করুন —</option>
                @for (u of users(); track u.id) { <option [value]="u.id">{{ u.nameBn || u.nameEn }} — {{ u.mobile }}</option> }
              </select>
              <div class="muted">যেমন: সচিব → Arik</div></div>
          </div>
          <div class="grid2">
            <div class="form-group"><label>কবে থেকে *</label><input type="date" class="form-control" [(ngModel)]="form.fromDate" /></div>
            <div class="form-group"><label>কবে পর্যন্ত (খালি রাখলে চলমান)</label><input type="date" class="form-control" [(ngModel)]="form.toDate" /></div>
          </div>
          <button class="btn-ghost" (click)="save()" [disabled]="saving()">+ দায়িত্ব দিন</button>
        </div></div>
        <div class="card" style="margin-top:12px"><div class="card-body">
          <h3 style="margin:0 0 10px">বর্তমানে দায়িত্বে কে আছে</h3>
          <table class="data-table"><thead><tr><th>পদবী</th><th>দায়িত্বে কে</th><th>কবে থেকে</th><th>অবস্থা</th><th></th></tr></thead>
          <tbody>
            @for (a of list(); track a.id) {
              <tr><td><strong>{{ a.designationNameBn }}</strong></td><td>{{ a.userName || a.userId }}</td><td>{{ a.fromDate }}</td><td>{{ a.isActive ? 'সক্রিয়' : 'শেষ' }}</td>
              <td>@if (a.isActive) { <button class="btn-ghost btn-sm" (click)="endAssignment(a)">দায়িত্ব শেষ করুন</button> }</td></tr>
            } @empty { <tr><td colspan="5" class="muted">এখনো কাউকে দায়িত্ব দেওয়া হয় নাই। উপরে থেকে সচিব → Arik দেন।</td></tr> }
          </tbody></table>
        </div></div>
      }
    </div>
  `,
  styles: [`.page-container{max-width:900px;margin:0 auto;padding:16px}.card{border:1px solid #e5e7eb;border-radius:12px;background:#fff}.card-body{padding:16px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-group{margin-bottom:12px}.form-control{width:100%;padding:9px 10px;border:1px solid #d1d5db;border-radius:8px}.btn-ghost{padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer}.btn-sm{padding:5px 10px;font-size:13px}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{padding:10px;border-bottom:1px solid #eef1f2;text-align:left}.alert{padding:10px;border-radius:8px;margin-bottom:12px}.alert-err{background:#fef2f2;border:1px solid #fecaca}.alert-ok{background:#f0fdf4;border:1px solid #bbf7d0}.muted{color:#6b7280;font-size:13px}`]
})
export class DesignationAssignmentComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  // আপনার Config Service এর Base URL — environment.configUrl না থাকলে identityUrl এর মতো configUrl বানাবেন
  // যেমন: environment.ts এ configUrl: 'http://localhost:8082' — আপনার Config Service এর Port অনুযায়ী
  private base = (environment as any).configUrl ?? environment.identityUrl;

  designations = signal<DesignationRow[]>([]);
  users = signal<UserRow[]>([]);
  list = signal<AssignmentRow[]>([]);
  err = signal(''); okMsg = signal(''); saving = signal(false);
  municipalityId = signal<number | null>(null);
  form: AssignmentRow = { designationId: '', userId: '', fromDate: new Date().toISOString().slice(0, 10), toDate: null, isActive: true };

  ngOnInit(): void {
    const mid = this.auth.currentUser()?.municipalityId;
    this.municipalityId.set(mid ? Number(mid) : null);
    if (this.municipalityId()) { this.loadDesignations(); this.loadUsers(); this.load(); }
  }
  hasPermission(): boolean {
    return this.auth.hasPermission('designation.assign') || this.auth.hasPermission('designation.manage');
  }
  private unwrap(res: any): any { return res?.data ?? res; }

  loadDesignations(): void {
    // Config Service — আপনার আগের DesignationController: GET /config/designations
    this.http.get<any>(`${this.base}/config/designations`).subscribe({
      next: (r) => this.designations.set(this.unwrap(r) ?? []),
      error: () => {}
    });
  }
  loadUsers(): void {
    // Municipality এর User List — আপনার Identity Service এর Existing API ব্যবহার করবেন
    // যদি /municipalities/{mid}/users না থাকে, তাহলে আপনার User Search API দিয়ে Replace করবেন
    this.http.get<any>(`${this.base}/config/municipality-users`).subscribe({
      next: (r) => this.users.set(this.unwrap(r) ?? []),
      error: () => this.users.set([])
    });
  }
  load(): void {
    this.http.get<any>(`${this.base}/config/designation-assignments`).subscribe({
      next: (r) => this.list.set(this.unwrap(r) ?? []),
      error: (e) => this.err.set(e?.error?.message || 'দায়িত্ব বরাদ্দ লোড করা যায়নি।')
    });
  }
  save(): void {
    if (!this.form.designationId || !this.form.userId || !this.form.fromDate) { this.err.set('পদবী, User আর কবে থেকে — ৩টাই দিন।'); return; }
    const activeSame = this.list().find(a => a.designationId === this.form.designationId && a.isActive);
    if (activeSame) { this.err.set('এই পদবীতে একজন ইতিমধ্যে সক্রিয় আছে। আগে তার দায়িত্ব শেষ করেন।'); return; }
    this.saving.set(true);
    const payload = { designationId: this.form.designationId, userId: this.form.userId, fromDate: this.form.fromDate, toDate: this.form.toDate || null };
    this.http.post<any>(`${this.base}/config/designation-assignments`, payload).subscribe({
      next: () => { this.okMsg.set('দায়িত্ব দেওয়া হয়েছে। এখন থেকে এই পদবীর Approval এই User এর কাছে যাবে।'); this.form = { designationId: '', userId: '', fromDate: new Date().toISOString().slice(0, 10), toDate: null, isActive: true }; this.load(); this.saving.set(false); },
      error: (e) => { this.err.set(e?.error?.message || 'দায়িত্ব দেওয়া যায়নি।'); this.saving.set(false); }
    });
  }
  endAssignment(a: AssignmentRow): void {
    if (!a.id) return;
    this.http.put<any>(`${this.base}/config/designation-assignments/${a.id}/end`, {}).subscribe({
      next: () => { this.okMsg.set('দায়িত্ব শেষ করা হয়েছে।'); this.load(); },
      error: (e) => this.err.set(e?.error?.message || 'দায়িত্ব শেষ করা যায়নি।')
    });
  }
}