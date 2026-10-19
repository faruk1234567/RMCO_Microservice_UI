import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>ইনভাইট পাঠান</h1>
      </div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }

      <div class="card">
        <div class="card-body">
          <div class="form-group">
            <label>পৌরসভা ID <span class="required">*</span></label>
            <input class="form-control" [(ngModel)]="municipalityId"
              [placeholder]="defaultMuni || 'municipality-uuid'" />
            <span class="hint">আপনার municipality ID অটো ভর্তি হতে পারে</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>মোবাইল</label>
              <input class="form-control" [(ngModel)]="mobile" placeholder="01XXXXXXXXX" maxlength="11" />
            </div>
            <div class="form-group">
              <label>ইমেইল</label>
              <input class="form-control" type="email" [(ngModel)]="email" placeholder="user@example.com" />
            </div>
          </div>
          <div class="form-group">
            <label>নাম (বাংলা)</label>
            <input class="form-control" [(ngModel)]="nameBn" />
          </div>
          <div class="form-group">
            <label>রোল (ঐচ্ছিক)</label>
            <select class="form-control" [(ngModel)]="roleId">
              <option value="">-- রোল বাছাই --</option>
              @for (r of roles(); track r.id || r.roleId) {
                <option [value]="r.id || r.roleId">{{ r.nameBn || r.name }} ({{ r.code }})</option>
              }
            </select>
          </div>
          <button class="btn btn-primary" [disabled]="sending()" (click)="send()">
            {{ sending() ? 'পাঠানো হচ্ছে...' : 'ইনভাইট পাঠান' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class InviteComponent implements OnInit {
  municipalityId = '';
  defaultMuni = '';
  mobile = '';
  email = '';
  nameBn = '';
  roleId = '';
  roles = signal<any[]>([]);
  sending = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  constructor(private admin: AdminService, private auth: AuthService) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u?.municipalityId) {
      this.municipalityId = u.municipalityId;
      this.defaultMuni = u.municipalityId;
    }
    this.admin.getRoles().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || [];
        this.roles.set(list);
      },
    });
  }

  send() {
    this.errorMsg.set('');
    this.successMsg.set('');
    if (!this.municipalityId) {
      this.errorMsg.set('পৌরসভা ID আবশ্যক।');
      return;
    }
    if (!this.mobile && !this.email) {
      this.errorMsg.set('মোবাইল অথবা ইমেইল দিতে হবে।');
      return;
    }
    this.sending.set(true);
    this.admin.sendInvite({
      municipalityId: this.municipalityId,
      mobile: this.mobile || undefined,
      email: this.email || undefined,
      nameBn: this.nameBn || undefined,
      roleId: this.roleId || undefined,
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.successMsg.set('ইনভাইট পাঠানো হয়েছে।');
        this.mobile = ''; this.email = ''; this.nameBn = ''; this.roleId = '';
      },
      error: (err) => {
        this.sending.set(false);
        this.errorMsg.set(err?.error?.message || 'ইনভাইট পাঠাতে ব্যর্থ।');
      },
    });
  }
}
