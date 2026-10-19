import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>রোল ব্যবস্থাপনা</h1>
        <button class="btn btn-primary" (click)="showCreate = !showCreate">
          {{ showCreate ? 'বন্ধ' : '+ নতুন রোল' }}
        </button>
      </div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }

      @if (showCreate) {
        <div class="card mb-2">
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label>কোড <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="newCode" placeholder="MAYOR" />
              </div>
              <div class="form-group">
                <label>নাম (বাংলা) <span class="required">*</span></label>
                <input class="form-control" [(ngModel)]="newNameBn" placeholder="মেয়র" />
              </div>
            </div>
            <div class="form-group">
              <label>Name (English)</label>
              <input class="form-control" [(ngModel)]="newNameEn" placeholder="Mayor" />
            </div>
            <button class="btn btn-primary" [disabled]="saving()" (click)="createRole()">
              {{ saving() ? 'সংরক্ষণ...' : 'সংরক্ষণ' }}
            </button>
          </div>
        </div>
      }

      @if (loading()) { <div class="spinner"></div> }

      @if (!loading()) {
        <div class="card">
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>কোড</th>
                  <th>নাম</th>
                  <th>English</th>
                  <th>অবস্থা</th>
                  <th>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                @for (r of roles(); track r.id || r.roleId) {
                  <tr>
                    <td><code>{{ r.code }}</code></td>
                    <td>{{ r.nameBn || r.name_bn || r.name }}</td>
                    <td>{{ r.nameEn || r.name_en || '—' }}</td>
                    <td>
                      <span class="badge" [class]="(r.isActive !== false && r.status !== 'INACTIVE') ? 'badge-success' : 'badge-secondary'">
                        {{ (r.isActive !== false && r.status !== 'INACTIVE') ? 'সক্রিয়' : 'নিষ্ক্রিয়' }}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn btn-sm btn-secondary" (click)="viewPermissions(r)">পারমিশন</button>
                      <button class="btn btn-sm btn-danger" (click)="deactivate(r)" 
                        [disabled]="r.isActive === false || r.status === 'INACTIVE'">
                        নিষ্ক্রিয়
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-center text-muted">কোনো রোল নেই</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Permissions modal -->
      @if (selectedRole()) {
        <div class="modal-overlay" (click)="selectedRole.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>পারমিশন — {{ selectedRole()!.nameBn || selectedRole()!.name }}</h3>
              <button class="btn btn-sm btn-secondary" (click)="selectedRole.set(null)">×</button>
            </div>
            <div class="modal-body">
              @if (permLoading()) { <div class="spinner"></div> }
              @if (!permLoading()) {
                <div class="perm-list">
                  @for (p of permissions(); track p) {
                    <label class="check-label">
                      <input type="checkbox" [checked]="selectedPerms().includes(getPermId(p))"
                        (change)="togglePerm(getPermId(p))" />
                      {{ getPermLabel(p) }}
                    </label>
                  } @empty {
                    <p class="text-muted">কোনো পারমিশন পাওয়া যায়নি। Backend response চেক করুন।</p>
                  }
                </div>
                <button class="btn btn-primary mt-2" [disabled]="saving()" (click)="savePermissions()">
                  {{ saving() ? 'সংরক্ষণ...' : 'পারমিশন সংরক্ষণ' }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Assign role -->
      <div class="card mt-2">
        <div class="card-header"><h3>রোল অ্যাসাইন</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>User ID</label>
              <input class="form-control" [(ngModel)]="assignUserId" placeholder="user-uuid" />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select class="form-control" [(ngModel)]="assignRoleId">
                <option value="">-- রোল বাছাই --</option>
                @for (r of roles(); track r.id || r.roleId) {
                  <option [value]="r.id || r.roleId">{{ r.nameBn || r.name }} ({{ r.code }})</option>
                }
              </select>
            </div>
          </div>
          <button class="btn btn-primary" [disabled]="saving() || !assignUserId || !assignRoleId" (click)="assign()">
            অ্যাসাইন করুন
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000;
      display:flex; align-items:center; justify-content:center; padding:20px;
    }
    .modal-card {
      background:#fff; border-radius:12px; width:100%; max-width:480px;
      max-height:80vh; overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,0.25);
    }
    .modal-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 20px; border-bottom:1px solid #e8eee9;
    }
    .modal-header h3 { margin:0; font-size:1.05rem; color:#0a5c36; }
    .modal-body { padding:20px; }
    .perm-list { display:flex; flex-direction:column; gap:8px; max-height:300px; overflow:auto; }
    .check-label { display:flex; align-items:center; gap:8px; font-size:0.92rem; cursor:pointer; }
    .mt-2 { margin-top:16px; }
  `],
})
export class RoleListComponent implements OnInit {
  roles = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  showCreate = false;

  newCode = '';
  newNameBn = '';
  newNameEn = '';

  selectedRole = signal<any>(null);
  permissions = signal<any[]>([]);
  selectedPerms = signal<string[]>([]);
  permLoading = signal(false);

  assignUserId = '';
  assignRoleId = '';

  constructor(private admin: AdminService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.admin.getRoles().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || [];
        this.roles.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'রোল লোড ব্যর্থ।');
      },
    });
  }

  createRole() {
    if (!this.newCode || !this.newNameBn) {
      this.errorMsg.set('কোড ও নাম আবশ্যক।');
      return;
    }
    this.saving.set(true);
    this.errorMsg.set('');
    this.admin.createRole({
      code: this.newCode.trim(),
      nameBn: this.newNameBn.trim(),
      nameEn: this.newNameEn?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('রোল তৈরি হয়েছে।');
        this.showCreate = false;
        this.newCode = ''; this.newNameBn = ''; this.newNameEn = '';
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'তৈরি ব্যর্থ।');
      },
    });
  }

  viewPermissions(role: any) {
    const id = role.id || role.roleId;
    this.selectedRole.set(role);
    this.permLoading.set(true);
    this.admin.getRolePermissions(id).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.permissions || [];
        this.permissions.set(list);
        // pre-select already assigned
        const assigned = list
          .filter((p: any) => p.assigned === true || p.granted === true)
          .map((p: any) => this.getPermId(p));
        this.selectedPerms.set(assigned.length ? assigned : list.map((p: any) => this.getPermId(p)));
        this.permLoading.set(false);
      },
      error: () => {
        this.permissions.set([]);
        this.permLoading.set(false);
      },
    });
  }

  getPermId(p: any): string {
    return p.id || p.code || p.permission || p.name || String(p);
  }

  getPermLabel(p: any): string {
    if (typeof p === 'string') return p;
    return p.nameBn || p.name || p.code || p.permission || p.id;
  }

  togglePerm(id: string) {
    this.selectedPerms.update((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    );
  }

  savePermissions() {
    const role = this.selectedRole();
    if (!role) return;
    const id = role.id || role.roleId;
    this.saving.set(true);
    this.admin.setRolePermissions(id, this.selectedPerms()).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('পারমিশন সংরক্ষিত।');
        this.selectedRole.set(null);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'পারমিশন সংরক্ষণ ব্যর্থ।');
      },
    });
  }

  deactivate(role: any) {
    if (!confirm(`"${role.nameBn || role.name}" নিষ্ক্রিয় করবেন?`)) return;
    const id = role.id || role.roleId;
    this.admin.deactivateRole(id).subscribe({
      next: () => {
        this.successMsg.set('রোল নিষ্ক্রিয় করা হয়েছে।');
        this.load();
      },
      error: (err) => this.errorMsg.set(err?.error?.message || 'ব্যর্থ।'),
    });
  }

  assign() {
    this.saving.set(true);
    this.errorMsg.set('');
    this.admin.assignRole({
      userId: this.assignUserId.trim(),
      roleId: this.assignRoleId,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('রোল অ্যাসাইন হয়েছে।');
        this.assignUserId = '';
        this.assignRoleId = '';
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'অ্যাসাইন ব্যর্থ।');
      },
    });
  }
}
