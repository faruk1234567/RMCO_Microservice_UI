import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>ব্যবহারকারী ব্যবস্থাপনা</h1>
      </div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }

      <div class="card mb-2">
        <div class="card-body">
          <div class="form-row" style="align-items:flex-end">
            <div class="form-group grow">
              <label>সার্চ (নাম / মোবাইল / ইমেইল)</label>
              <input class="form-control" [(ngModel)]="query" placeholder="খুঁজুন..."
                (keyup.enter)="search()" />
            </div>
            <button class="btn btn-primary" [disabled]="searching()" (click)="search()">
              {{ searching() ? 'খুঁজছে...' : 'সার্চ' }}
            </button>
          </div>
        </div>
      </div>

      @if (users().length) {
        <div class="card">
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>নাম</th>
                  <th>মোবাইল</th>
                  <th>ইমেইল</th>
                  <th>অবস্থা</th>
                  <th>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id || u.userId) {
                  <tr>
                    <td>{{ u.nameBn || u.name_bn || u.fullName || u.name || '—' }}</td>
                    <td>{{ u.mobile || u.mobileNormalized || '—' }}</td>
                    <td>{{ u.email || u.emailNormalized || '—' }}</td>
                    <td>
                      <span class="badge" [class]="statusClass(u.status)">
                        {{ statusLabel(u.status) }}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" (click)="viewProfile(u)">প্রোফাইল</button>
                      <button class="btn btn-sm btn-secondary" (click)="viewRoles(u)">রোল</button>
                      <button class="btn btn-sm btn-primary" (click)="verify(u)"
                        [disabled]="u.status === 'ACTIVE' || u.status === 'VERIFIED'">যাচাই</button>
                      <button class="btn btn-sm btn-warning" (click)="suspend(u)"
                        [disabled]="u.status === 'SUSPENDED'">সাসপেন্ড</button>
                      <button class="btn btn-sm btn-danger" (click)="inactive(u)"
                        [disabled]="u.status === 'INACTIVE'">নিষ্ক্রিয়</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (profile()) {
        <div class="modal-overlay" (click)="profile.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>প্রোফাইল</h3>
              <button class="btn btn-sm btn-secondary" (click)="profile.set(null)">×</button>
            </div>
            <div class="modal-body">
              <pre class="profile-json">{{ profile() | json }}</pre>
            </div>
          </div>
        </div>
      }

      @if (userRoles()) {
        <div class="modal-overlay" (click)="userRoles.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>ইউজারের রোল</h3>
              <button class="btn btn-sm btn-secondary" (click)="userRoles.set(null)">×</button>
            </div>
            <div class="modal-body">
              @if (rolesLoading()) { <div class="spinner"></div> }
              @if (!rolesLoading()) {
                <ul class="role-list">
                  @for (r of userRoles()!; track r.id || r.roleId || r.code || $index) {
                    <li>
                      <strong>{{ r.nameBn || r.name || r.code }}</strong>
                      @if (r.code) { <code>{{ r.code }}</code> }
                    </li>
                  } @empty {
                    <li class="text-muted">কোনো রোল নেই</li>
                  }
                </ul>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grow { flex:1; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .btn-warning { background:#f0b429; color:#1a1a1a; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.82rem; }
    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000;
      display:flex; align-items:center; justify-content:center; padding:20px;
    }
    .modal-card {
      background:#fff; border-radius:12px; width:100%; max-width:560px;
      max-height:80vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);
    }
    .modal-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 20px; border-bottom:1px solid #e8eee9;
    }
    .modal-header h3 { margin:0; color:#0a5c36; }
    .modal-body { padding:20px; }
    .profile-json {
      background:#f5f9f6; padding:12px; border-radius:8px;
      font-size:0.82rem; overflow:auto; max-height:400px;
    }
    .role-list { list-style:none; padding:0; margin:0; }
    .role-list li {
      padding:10px 12px; border-bottom:1px solid #e8eee9;
      display:flex; justify-content:space-between; align-items:center;
    }
    .role-list code { font-size:0.8rem; background:#f0f4f1; padding:2px 6px; border-radius:4px; }
  `],
})
export class UserAdminComponent {
  query = '';
  users = signal<any[]>([]);
  searching = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  profile = signal<any>(null);
  userRoles = signal<any[] | null>(null);
  rolesLoading = signal(false);

  constructor(private admin: AdminService) {}

  search() {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.errorMsg.set('');
    this.admin.searchUsers(this.query.trim()).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || res?.users || [];
        this.users.set(list);
        this.searching.set(false);
        if (!list.length) this.errorMsg.set('কোনো ব্যবহারকারী পাওয়া যায়নি।');
      },
      error: (err) => {
        this.searching.set(false);
        this.errorMsg.set(err?.error?.message || 'সার্চ ব্যর্থ।');
      },
    });
  }

  viewProfile(u: any) {
    const id = u.id || u.userId;
    this.admin.getProfile(id).subscribe({
      next: (res) => this.profile.set(res?.data || res),
      error: (err) => this.errorMsg.set(err?.error?.message || 'প্রোফাইল লোড ব্যর্থ।'),
    });
  }

  viewRoles(u: any) {
    const id = u.id || u.userId;
    this.rolesLoading.set(true);
    this.userRoles.set([]);
    this.admin.getUserRoles(id).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.roles || [];
        this.userRoles.set(list);
        this.rolesLoading.set(false);
      },
      error: (err) => {
        this.rolesLoading.set(false);
        this.userRoles.set(null);
        this.errorMsg.set(err?.error?.message || 'রোল লোড ব্যর্থ।');
      },
    });
  }

  verify(u: any) {
    const id = u.id || u.userId;
    this.admin.verifyUser(id).subscribe({
      next: () => { this.successMsg.set('যাচাই সম্পন্ন।'); this.search(); },
      error: (err) => this.errorMsg.set(err?.error?.message || 'যাচাই ব্যর্থ।'),
    });
  }

  suspend(u: any) {
    if (!confirm('এই ব্যবহারকারীকে সাসপেন্ড করবেন?')) return;
    const id = u.id || u.userId;
    this.admin.suspendUser(id).subscribe({
      next: () => { this.successMsg.set('সাসপেন্ড করা হয়েছে।'); this.search(); },
      error: (err) => this.errorMsg.set(err?.error?.message || 'সাসপেন্ড ব্যর্থ।'),
    });
  }

  inactive(u: any) {
    if (!confirm('এই ব্যবহারকারীকে নিষ্ক্রিয় করবেন?')) return;
    const id = u.id || u.userId;
    this.admin.inactiveUser(id).subscribe({
      next: () => { this.successMsg.set('নিষ্ক্রিয় করা হয়েছে।'); this.search(); },
      error: (err) => this.errorMsg.set(err?.error?.message || 'নিষ্ক্রিয় ব্যর্থ।'),
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      ACTIVE: 'সক্রিয়', VERIFIED: 'যাচাইকৃত', PENDING: 'অপেক্ষমাণ',
      SUSPENDED: 'সাসপেন্ড', INACTIVE: 'নিষ্ক্রিয়',
    };
    return m[s] || s || '—';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      ACTIVE: 'badge-success', VERIFIED: 'badge-success', PENDING: 'badge-warning',
      SUSPENDED: 'badge-warning', INACTIVE: 'badge-secondary',
    };
    return m[s] || 'badge-secondary';
  }
}
