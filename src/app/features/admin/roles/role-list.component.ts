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
      
@if (municipalities().length > 0) {
  <div class="card mb-2">
    <div class="card-body">
      <div class="form-group">
        <label>Municipality নির্বাচন করুন</label>
        <select
          class="form-control"
          [ngModel]="selectedMunicipalityId()"
          (ngModelChange)="onMunicipalityChange($event)">
          <option value="">-- Municipality বাছাই করুন --</option>
          @for (m of municipalities(); track m.id) {
            <option [value]="m.id">
              {{ m.nameBn || m.nameEn || m.code }}
            </option>
          }
        </select>
      </div>
    </div>
  </div>
}


      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }
      
<!-- Municipality Permission Policy Configuration -->
<div class="card mb-2">
  <div class="card-header">
    <h3>Municipality Permission Policy</h3>
    <p class="text-muted">
      কোন Permission ব্যবহার ও অন্য Role-কে দেওয়া যাবে তা নির্ধারণ করুন।
    </p>
  </div>

  <div class="card-body">
    @if (!selectedMunicipalityId()) {
      <p class="text-muted">প্রথমে Municipality নির্বাচন করুন।</p>
    } @else if (policyLoading()) {
      <div class="spinner"></div>
    } @else {
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Permission</th>
              <th>ব্যবহার করা যাবে</th>
              <th>অন্য Role-কে দেওয়া যাবে</th>
              <th>অ্যাকশন</th>
            </tr>
          </thead>

          <tbody>
            @for (
              p of municipalityPermissionMatrix();
              track p.permissionCode || p.code
            ) {
              <tr>
                <td>
                  <strong>{{ p.labelBn || p.permissionCode || p.code }}</strong>
                  <br />
                  <small class="text-muted">
                    {{ p.permissionCode || p.code }}
                  </small>
                </td>

                <td>
                  <input
                    type="checkbox"
                    [checked]="p.canUse === true"
                    (change)="updatePolicyValue(
                      p.permissionCode || p.code,
                      'canUse',
                      $any($event.target).checked
                    )"
                  />
                </td>

                <td>
                  <input
                    type="checkbox"
                    [checked]="p.canDelegate === true"
                    [disabled]="p.canUse !== true"
                    (change)="updatePolicyValue(
                      p.permissionCode || p.code,
                      'canDelegate',
                      $any($event.target).checked
                    )"
                  />
                </td>

                <td>
                  <button
                    class="btn btn-sm btn-primary"
                    [disabled]="policySaving()"
                    (click)="saveMunicipalityPolicy(p)"
                  >
                    {{
                      policySavingCode() === (p.permissionCode || p.code)
                        ? 'সংরক্ষণ...'
                        : 'Save'
                    }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="text-center text-muted">
                  Permission Policy পাওয়া যায়নি।
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
</div>


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
                    <td><code>{{ r.roleCode || r.code }}</code></td>
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
                 @for (p of permissions(); track getPermId(p)) {
  <label
    class="check-label"
    [class.permission-disabled]="
      !isPermissionAllowed(getPermId(p))
    "
  >
    <input
      type="checkbox"
      [checked]="selectedPerms().includes(getPermId(p))"
      [disabled]="!isPermissionAllowed(getPermId(p))"
      (change)="togglePerm(getPermId(p))"
    />

    <span>
      {{ getPermLabel(p) }}

      @if (!isPermissionAllowed(getPermId(p))) {
        <small class="text-muted">
          (Municipality-তে অনুমোদিত নয়)
        </small>
      }
    </span>
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
  <label>User খুঁজুন (নাম / মোবাইল / ID)</label>

  <input
    class="form-control"
    [ngModel]="userSearchText"
    (ngModelChange)="onUserSearchChange($event)"
    placeholder="কমপক্ষে ২টি অক্ষর লিখুন"
  />

  @if (userSearchLoading()) {
    <small>ইউজার খোঁজা হচ্ছে...</small>
  }

  <select
    class="form-control mt-2"
    [ngModel]="assignUserId"
    (ngModelChange)="onUserSelect($event)"
  >
    <option value="">-- User নির্বাচন করুন --</option>

    @for (u of userResults(); track u.id || u.userId) {
      <option [value]="u.id || u.userId">
        {{ getUserLabel(u) }}
      </option>
    }
  </select>

 
</div>
            <div class="form-group">
              <label>Role</label>
              <select class="form-control" [(ngModel)]="assignRoleId">
                <option value="">-- রোল বাছাই --</option>
                @for (r of roles(); track r.id || r.roleId) {
                  <option [value]="r.id || r.roleId">
  {{ r.nameBn || r.name }} ({{ r.roleCode || r.code }})
</option>
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
    .permission-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.permission-disabled input {
  cursor: not-allowed;
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
  municipalityPermissionMatrix = signal<any[]>([]);
  
policyLoading = signal(false);
policySavingCode = signal('');
policySaving = signal(false);

  
municipalities = signal<any[]>([]);
selectedMunicipalityId = signal<string>('');

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

  userSearchText = '';
  userResults = signal<any[]>([]);
  userSearchLoading = signal(false);
  constructor(private admin: AdminService) {}

  ngOnInit() {
  this.loadMunicipalities();
}

loadMunicipalities() {
  this.admin.getMunicipalities().subscribe({
    next: (res: any) => {
      const list = Array.isArray(res)
        ? res
        : res?.data || res?.content || [];

      this.municipalities.set(list);

      if (list.length > 0) {
        // Platform Admin: প্রথম Municipality নির্বাচন
        this.selectedMunicipalityId.set(String(list[0].id));
        this.load();
      } else {
        this.load();
      }
    },
    error: () => {
      // Municipality list access না থাকলে নিজের Roles লোডের চেষ্টা
      this.municipalities.set([]);
      this.selectedMunicipalityId.set('');
      this.load();
    }
  });
}

onMunicipalityChange(value: string) {
  this.selectedMunicipalityId.set(value);
  this.errorMsg.set('');
  this.successMsg.set('');
  this.assignUserId = '';
this.assignRoleId = '';
this.userSearchText = '';
this.userResults.set([]);

  if (!value) {
  this.roles.set([]);
  this.municipalityPermissionMatrix.set([]);
  return;
}
  this.load();
  this.loadMunicipalityPolicies();
}


  load() {
  this.loading.set(true);
  this.errorMsg.set('');

  const municipalityId = this.selectedMunicipalityId()
    ? Number(this.selectedMunicipalityId())
    : undefined;

  this.admin.getRoles(municipalityId).subscribe({
    next: (res: any) => {
      const list = Array.isArray(res)
        ? res
        : res?.data || res?.content || [];

      this.roles.set(list);
      this.loading.set(false);
    },
    error: (err) => {
      this.loading.set(false);
      this.errorMsg.set(
        err?.error?.message || 'রোল লোড ব্যর্থ।'
      );
    }
  });
}

 
createRole() {
  if (!this.newCode.trim() || !this.newNameBn.trim()) {
    this.errorMsg.set('কোড ও নাম আবশ্যক।');
    return;
  }

  const municipalityId = this.selectedMunicipalityId()
    ? Number(this.selectedMunicipalityId())
    : undefined;

  if (
    this.municipalities().length > 0 &&
    (!municipalityId || municipalityId <= 0)
  ) {
    this.errorMsg.set('প্রথমে Municipality নির্বাচন করুন।');
    return;
  }

  this.saving.set(true);
  this.errorMsg.set('');
  this.successMsg.set('');

  this.admin.createRole({
    municipalityId,
    code: this.newCode.trim(),
    nameBn: this.newNameBn.trim(),
    nameEn: this.newNameEn.trim() || undefined
  }).subscribe({
    next: () => {
      this.saving.set(false);
      this.successMsg.set('রোল তৈরি হয়েছে।');
      this.showCreate = false;
      this.newCode = '';
      this.newNameBn = '';
      this.newNameEn = '';
      this.load();
    },
    error: (err) => {
      this.saving.set(false);
      this.errorMsg.set(
        err?.error?.message || 'রোল তৈরি ব্যর্থ।'
      );
    }
  });
}


  
viewPermissions(role: any) {
  const id = role.id || role.roleId;

  const municipalityId = this.selectedMunicipalityId()
    ? Number(this.selectedMunicipalityId())
    : undefined;

  if (!municipalityId) {
    this.errorMsg.set('প্রথমে Municipality নির্বাচন করুন।');
    return;
  }

  this.selectedRole.set(role);
  this.permLoading.set(true);
  this.errorMsg.set('');
  this.permissions.set([]);
  this.selectedPerms.set([]);
  this.municipalityPermissionMatrix.set([]);

  // 1. Global Permission Catalog লোড
  this.admin.getPermissions().subscribe({
    next: (catalogRes: any) => {
      const catalog = Array.isArray(catalogRes)
        ? catalogRes
        : Array.isArray(catalogRes?.data)
          ? catalogRes.data
          : Array.isArray(catalogRes?.permissions)
            ? catalogRes.permissions
            : [];

      // 2. Municipality Permission Matrix লোড
      this.admin
        .getMunicipalityPermissionMatrix(municipalityId)
        .subscribe({
          next: (matrixRes: any) => {
            const matrix = Array.isArray(matrixRes)
              ? matrixRes
              : Array.isArray(matrixRes?.data)
                ? matrixRes.data
                : [];

            this.municipalityPermissionMatrix.set(matrix);

            // Console-এ policy value দেখাবে
            console.table(
              matrix.map((p: any) => ({
                permissionCode: p.permissionCode || p.code,
                canUse: p.canUse,
                canDelegate: p.canDelegate
              }))
            );

            // 3. Role-এর assigned permissions লোড
            this.admin
              .getRolePermissions(id, municipalityId)
              .subscribe({
                next: (assignedRes: any) => {
                  const assigned = Array.isArray(assignedRes)
                    ? assignedRes
                    : Array.isArray(assignedRes?.data)
                      ? assignedRes.data
                      : [];

                  const assignedCodes = assigned
                    .map((p: any) =>
                      typeof p === 'string'
                        ? p
                        : p.permissionCode || p.code || p.permission
                    )
                    .filter(
                      (code: any) => typeof code === 'string'
                    );

                  this.permissions.set(catalog);

                  this.selectedPerms.set(
                    catalog
                      .map((p: any) => this.getPermId(p))
                      .filter(
                        (code: string) => assignedCodes.includes(code)
                      )
                  );

                  this.permLoading.set(false);
                },
                error: (err) => {
                  this.permLoading.set(false);
                  this.errorMsg.set(
                    err?.error?.message ||
                    'Role-এর Permission লোড করা যায়নি।'
                  );
                }
              });
          },
          error: (err) => {
            this.permLoading.set(false);
            this.errorMsg.set(
              err?.error?.message ||
              'Municipality Permission Matrix লোড করা যায়নি।'
            );
          }
        });
    },
    error: (err) => {
      this.permLoading.set(false);
      this.errorMsg.set(
        err?.error?.message ||
        'Permission Catalog লোড করা যায়নি।'
      );
    }
  });
}


getPermId(p: any): string {
  if (typeof p === 'string') {
    return p;
  }

  return (
    p.permissionCode ||
    p.code ||
    p.permission ||
    p.id ||
    p.name ||
    ''
  );
}
 getPermLabel(p: any): string {
  if (typeof p === 'string') {
    return p;
  }

  return (
    p.labelBn ||
    p.labelEn ||
    p.code ||
    p.permissionCode ||
    'Unknown permission'
  );
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
    const municipalityId = this.selectedMunicipalityId()
  ? Number(this.selectedMunicipalityId())
  : undefined;

this.admin.setRolePermissions(
  id,
  this.selectedPerms(),
  municipalityId
).subscribe({
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
 
onUserSearchChange(value: string) {
  this.userSearchText = value;
  this.assignUserId = '';
  this.userResults.set([]);
  this.errorMsg.set('');

  const q = value.trim();

  if (q.length < 2) {
    this.userSearchLoading.set(false);
    return;
  }

  const municipalityId = Number(this.selectedMunicipalityId());

  if (!municipalityId) {
    this.userSearchLoading.set(false);
    this.errorMsg.set('প্রথমে Municipality নির্বাচন করুন।');
    return;
  }

  this.userSearchLoading.set(true);

  // নির্বাচিত Municipality ID-সহ User Search
  this.admin.searchUsers(q, municipalityId).subscribe({
    next: (res: any) => {
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.content)
            ? res.content
            : Array.isArray(res?.users)
              ? res.users
              : [];

      this.userResults.set(list);
      this.userSearchLoading.set(false);

      if (list.length === 0) {
        this.errorMsg.set('এই Municipality-তে কোনো User পাওয়া যায়নি।');
      }
    },
    error: (err) => {
      this.userResults.set([]);
      this.userSearchLoading.set(false);
      this.errorMsg.set(
        err?.error?.message || 'User খোঁজা যায়নি।'
      );
    }
  });
}

onUserSelect(userId: string) {
  this.assignUserId = userId;
}

getUserLabel(user: any): string {
  return (
    user.nameBn ||
    user.nameEn ||
    user.fullName ||
    user.name ||
    'নাম নেই'
  );
}

  assign() {
  const municipalityId = this.selectedMunicipalityId();

  if (!municipalityId) {
    this.errorMsg.set('প্রথমে Municipality নির্বাচন করুন।');
    return;
  }

  if (!this.assignUserId || !this.assignRoleId) {
    this.errorMsg.set('User এবং Role নির্বাচন করুন।');
    return;
  }

  this.saving.set(true);
  this.errorMsg.set('');
  this.successMsg.set('');

  this.admin.assignRole({
    userId: this.assignUserId,
    roleId: this.assignRoleId,
    municipalityId: municipalityId
  }).subscribe({
    next: () => {
      this.saving.set(false);
      this.successMsg.set('রোল অ্যাসাইন হয়েছে।');

      this.assignUserId = '';
      this.assignRoleId = '';
      this.userSearchText = '';
      this.userResults.set([]);
    },
    error: (err) => {
      this.saving.set(false);
      this.errorMsg.set(
        err?.error?.message || 'রোল অ্যাসাইন ব্যর্থ।'
      );
    }
  });
  
}
isPermissionAllowed(permissionCode: string): boolean {
  const matrix = this.municipalityPermissionMatrix();

  const policy = matrix.find((p: any) =>
    (p.permissionCode || p.code) === permissionCode
  );

  return (
    policy != null &&
    policy.canUse === true &&
    policy.canDelegate === true
  );
}

loadMunicipalityPolicies() {
  const municipalityId = Number(this.selectedMunicipalityId());

  if (!municipalityId) {
    this.municipalityPermissionMatrix.set([]);
    return;
  }

  this.policyLoading.set(true);

  this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({
    next: (res: any) => {
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];

      this.municipalityPermissionMatrix.set(list);
      this.policyLoading.set(false);
    },
    error: (err) => {
      this.policyLoading.set(false);
      this.errorMsg.set(
        err?.error?.message || 'Permission Policy লোড করা যায়নি।'
      );
    }
  });
}

updatePolicyValue(
  permissionCode: string,
  field: 'canUse' | 'canDelegate',
  value: boolean
) {
  this.municipalityPermissionMatrix.update(list =>
    list.map(p => {
      const code = p.permissionCode || p.code;

      if (code !== permissionCode) {
        return p;
      }

      if (field === 'canUse' && !value) {
        return { ...p, canUse: false, canDelegate: false };
      }

      if (field === 'canDelegate' && value && p.canUse !== true) {
        return p;
      }

      return { ...p, [field]: value };
    })
  );
}

saveMunicipalityPolicy(policy: any) {
  const municipalityId = Number(this.selectedMunicipalityId());
  const permissionCode = policy.permissionCode || policy.code;

  if (!municipalityId || !permissionCode) {
    this.errorMsg.set('Municipality ও Permission নির্বাচন যাচাই করুন।');
    return;
  }

  if (policy.canDelegate && !policy.canUse) {
    this.errorMsg.set('canDelegate চালু করতে canUse-ও চালু থাকতে হবে।');
    return;
  }

  this.policySaving.set(true);
  this.policySavingCode.set(permissionCode);
  this.errorMsg.set('');
  this.successMsg.set('');

  this.admin.updateMunicipalityPermission(municipalityId, {
    permissionCode,
    canUse: policy.canUse === true,
    canDelegate: policy.canDelegate === true
  }).subscribe({
    next: () => {
      this.policySaving.set(false);
      this.policySavingCode.set('');
      this.successMsg.set(
        `Policy সংরক্ষিত: ${permissionCode}`
      );

      // Server থেকে সর্বশেষ policy আবার আনুন
      this.loadMunicipalityPolicies();
    },
    error: (err) => {
      this.policySaving.set(false);
      this.policySavingCode.set('');
      this.errorMsg.set(
        err?.error?.message || 'Permission Policy সংরক্ষণ ব্যর্থ।'
      );

      // UI-কে server-এর state-এ ফিরিয়ে আনুন
      this.loadMunicipalityPolicies();
    }
  });
}

}
