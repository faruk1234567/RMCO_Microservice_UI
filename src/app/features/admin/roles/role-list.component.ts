import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

type Tab = 'roles' | 'users' | 'policy';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <!-- Sticky Municipality bar -->
    <div class="muni-bar">
      <div class="muni-title">রোল ও অ্যাক্সেস ব্যবস্থাপনা</div>
      @if (isPlatformAdmin) {
        <div class="muni-select">
          <label>পৌরসভা</label>
          <select class="form-control" [ngModel]="selectedMunicipalityId()"
                  (ngModelChange)="onMunicipalityChange($event)">
            <option value="">-- পৌরসভা বাছাই করুন --</option>
            @for (m of municipalities(); track m.id) {
              <option [value]="m.id">{{ m.nameBn || m.nameEn || m.code }}</option>
            }
          </select>
        </div>
      } @else {
        <div class="muni-select"><label>পৌরসভা</label><strong>{{ ownMunicipalityName }}</strong></div>
      }
    </div>

    @if (errorMsg()) {
      <div class="alert alert-danger">{{ errorMsg() }}
        <button class="x" (click)="errorMsg.set('')">×</button></div>
    }
    @if (successMsg()) {
      <div class="alert alert-success">{{ successMsg() }}
        <button class="x" (click)="successMsg.set('')">×</button></div>
    }

    @if (!selectedMunicipalityId()) {
      <div class="empty-state">
        <div class="empty-icon">🏛️</div>
        <p>শুরু করতে উপরে থেকে একটি পৌরসভা বাছাই করুন।</p>
      </div>
    } @else {
      <div class="tabs">
        <button [class.active]="tab() === 'roles'" (click)="tab.set('roles')">১. রোল ও পারমিশন</button>
        <button [class.active]="tab() === 'users'" (click)="tab.set('users')">২. ইউজারকে রোল দিন</button>
        @if (isPlatformAdmin) {
          <button [class.active]="tab() === 'policy'" (click)="tab.set('policy')">
            পারমিশন নীতি
            @if (policyDirtyCount() > 0) { <span class="dot">{{ policyDirtyCount() }}</span> }
          </button>
        }
      </div>

      <!-- ================= ROLES TAB ================= -->
      @if (tab() === 'roles') {
        <div class="split">
          <!-- Left: role list -->
          <aside class="card role-pane">
            <div class="pane-head">
              <strong>রোল তালিকা</strong>
              <button class="btn btn-sm btn-primary" (click)="openCreate()">+ নতুন</button>
            </div>
            @if (loading()) { <div class="spinner"></div> }
            @for (r of roles(); track r.id || r.roleId) {
              <div class="role-item" [class.selected]="isSelected(r)" (click)="selectRole(r)">
                <div class="role-names">
                  <div class="role-bn">{{ r.nameBn || r.name_bn || r.name }}</div>
                  <small class="text-muted">{{ r.roleCode || r.code }}</small>
                  @if (isPlatformRole(r)) { <small class="text-muted"> 🔒 প্ল্যাটফর্ম</small> }
                </div>
                <label class="switch" (click)="$event.stopPropagation()"
                       title="সক্রিয়/নিষ্ক্রিয়">
                  <input type="checkbox" [checked]="isActive(r)" [disabled]="isPlatformRole(r)"
                         (change)="toggleActive(r, $any($event.target).checked, $event)" />
                  <span class="slider"></span>
                </label>
              </div>
            } @empty {
              @if (!loading()) { <p class="text-muted pad">কোনো রোল নেই। "+ নতুন" চাপুন।</p> }
            }
          </aside>

          <!-- Right: permission tree -->
          <section class="card perm-pane">
            @if (!selectedRole()) {
              <div class="empty-state small">
                <p>বাঁ দিক থেকে একটি রোল বাছাই করুন, তারপর এখানে পারমিশন ঠিক করুন।</p>
              </div>
            } @else if (isPlatformRole(selectedRole())) {
              <div class="empty-state small">
                <div class="empty-icon">🔒</div>
                <p><strong>{{ selectedRole()!.nameBn || selectedRole()!.name }}</strong> একটি প্ল্যাটফর্ম-স্তরের রোল।<br />
                  এর পারমিশন কোনো পৌরসভার আওতায় নেই, তাই এখানে বদলানো যায় না।<br />
                  পৌরসভার জন্য <b>মিউনিসিপ্যালিটি অ্যাডমিন</b> বা নিজের তৈরি রোল বাছুন।</p>
              </div>
            } @else {
              <div class="pane-head">
                <div>
                  <strong>{{ selectedRole()!.nameBn || selectedRole()!.name }}</strong>
                  <small class="text-muted"> — {{ selectedCount() }} টি পারমিশন নির্বাচিত</small>
                </div>
                <div class="head-actions">
                  <input class="form-control search" placeholder="পারমিশন খুঁজুন..."
                         [ngModel]="permSearch()" (ngModelChange)="permSearch.set($event)" />
                  @if (isPlatformAdmin && blockedCount() > 0) {
                    <button class="btn btn-sm btn-secondary" [disabled]="saving()" (click)="enableAllBlocked()">
                      সব বন্ধ permission চালু ({{ blockedCount() }})
                    </button>
                  }
                  <button class="btn btn-sm btn-secondary" (click)="selectAllAllowed()">
                    সব অনুমোদিত সিলেক্ট
                  </button>
                  <button class="btn btn-sm btn-primary"
                          [disabled]="saving() || !permDirty()" (click)="savePermissions()">
                    {{ saving() ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন' }}
                  </button>
                </div>
              </div>

              @if (permLoading()) { <div class="spinner"></div> } @else {
                <div class="perm-body">
                  @for (g of groupedPermissions(); track g.group) {
                    <div class="group">
                      <div class="group-head">
                        <label class="check-label">
                          <input type="checkbox"
                                 [checked]="groupState(g) === 'all'"
                                 [indeterminate]="groupState(g) === 'some'"
                                 [disabled]="groupAllowed(g) === 0"
                                 (change)="toggleGroup(g, $any($event.target).checked)" />
                          <strong>{{ g.group }}</strong>
                        </label>
                        <small class="text-muted">{{ groupSelected(g) }}/{{ groupAllowed(g) }}</small>
                      </div>
                      <div class="group-items">
                        @for (p of g.items; track getPermId(p)) {
                          <label class="check-label" [class.permission-disabled]="!isPermissionAllowed(getPermId(p))">
                            <input type="checkbox"
                                   [checked]="selectedPerms().includes(getPermId(p))"
                                   [disabled]="!isPermissionAllowed(getPermId(p))"
                                   (change)="togglePerm(getPermId(p))" />
                            <span>
                              {{ getPermLabel(p) }}
                              @if (!isPermissionAllowed(getPermId(p))) {
                                <small class="text-muted"> (এই পৌরসভায় বন্ধ)</small>
                                @if (isPlatformAdmin) {
                                  <button class="btn-enable" (click)="enablePolicy(getPermId(p), $event)">
                                    চালু করুন
                                  </button>
                                } @else {
                                  <small class="text-muted"> — প্ল্যাটফর্ম অ্যাডমিনকে জানান</small>
                                }
                              }
                            </span>
                          </label>
                        }
                      </div>
                    </div>
                  } @empty {
                    <p class="text-muted pad">কোনো পারমিশন পাওয়া যায়নি।</p>
                  }
                </div>
              }
            }
          </section>
        </div>
      }

      <!-- ================= USERS TAB ================= -->
      @if (tab() === 'users') {
        <div class="card assign-card">
          <h3>ইউজারকে রোল দিন</h3>
          <p class="text-muted">নাম / মোবাইল / ID লিখে খুঁজুন, ইউজার বাছাই করুন, তারপর রোল দিন।</p>

          <div class="form-group">
            <label>১. ইউজার খুঁজুন</label>
            <input class="form-control" [ngModel]="userSearchText"
                   (ngModelChange)="onUserSearchChange($event)"
                   placeholder="কমপক্ষে ২টি অক্ষর লিখুন" />
            @if (userSearchLoading()) { <small class="text-muted">খোঁজা হচ্ছে...</small> }

            @if (userResults().length > 0) {
              <div class="user-results">
                @for (u of userResults(); track u.id || u.userId) {
                  <div class="user-row" [class.selected]="assignUserId === String(u.id || u.userId)"
                       (click)="pickUser(u)">
                    <div class="avatar">{{ getUserLabel(u).charAt(0) }}</div>
                    <div>
                      <div>{{ getUserLabel(u) }}</div>
                      <small class="text-muted">{{ u.mobile || u.phone || '' }}</small>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          @if (assignUserId) {
            <div class="picked">নির্বাচিত ইউজার: <strong>{{ pickedUserLabel }}</strong></div>
            <div class="form-group">
              <label>২. রোল বাছাই করুন</label>
              <select class="form-control" [(ngModel)]="assignRoleId">
                <option value="">-- রোল বাছাই --</option>
                @for (r of activeRoles(); track r.id || r.roleId) {
                  <option [value]="r.id || r.roleId">
                    {{ r.nameBn || r.name }} ({{ r.roleCode || r.code }})
                  </option>
                }
              </select>
            </div>
            <button class="btn btn-primary" [disabled]="saving() || !assignRoleId" (click)="assign()">
              অ্যাসাইন করুন
            </button>
          }
        </div>
      }

      <!-- ================= POLICY TAB ================= -->
      @if (tab() === 'policy' && isPlatformAdmin) {
        <div class="card">
          <div class="pane-head">
            <div>
              <strong>পারমিশন নীতি</strong>
              <p class="text-muted nomargin">
                <b>ব্যবহার করা যাবে</b> = এই পৌরসভায় permission চালু।
                <b>অন্য রোলকে দেওয়া যাবে</b> = রোলে অ্যাসাইন করা যাবে।
              </p>
            </div>
            <button class="btn btn-sm btn-primary"
                    [disabled]="policySaving() || policyDirtyCount() === 0"
                    (click)="saveAllPolicies()">
              {{ policySaving() ? 'সংরক্ষণ...' : 'সব সংরক্ষণ (' + policyDirtyCount() + ')' }}
            </button>
          </div>

          @if (policyLoading()) { <div class="spinner"></div> } @else {
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr><th>Permission</th><th>ব্যবহার করা যাবে</th><th>অন্য রোলকে দেওয়া যাবে</th></tr>
                </thead>
                <tbody>
                  @for (p of municipalityPermissionMatrix(); track p.permissionCode || p.code) {
                    <tr [class.dirty]="isDirty(p)">
                      <td>
                        <strong>{{ p.labelBn || p.permissionCode || p.code }}</strong><br />
                        <small class="text-muted">{{ p.permissionCode || p.code }}</small>
                      </td>
                      <td>
                        <input type="checkbox" [checked]="p.canUse === true"
                               (change)="updatePolicyValue(p.permissionCode || p.code, 'canUse', $any($event.target).checked)" />
                      </td>
                      <td>
                        <input type="checkbox" [checked]="p.canDelegate === true" [disabled]="p.canUse !== true"
                               (change)="updatePolicyValue(p.permissionCode || p.code, 'canDelegate', $any($event.target).checked)" />
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="3" class="text-center text-muted">কোনো Permission নীতি পাওয়া যায়নি।</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    }

    <!-- ================= CREATE ROLE MODAL ================= -->
    @if (showCreate()) {
      <div class="modal-overlay" (click)="showCreate.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>নতুন রোল তৈরি করুন</h3>
            <button class="btn btn-sm btn-secondary" (click)="showCreate.set(false)">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>নাম (English) <span class="required">*</span></label>
              <input class="form-control" [ngModel]="newNameEn" (ngModelChange)="onNameEnChange($event)" placeholder="Mayor" />
            </div>
            <div class="form-group">
              <label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="newNameBn" placeholder="মেয়র" />
            </div>
            <div class="form-group">
              <label>কোড <small class="text-muted">(অটো তৈরি, দরকার হলে বদলান)</small></label>
              <input class="form-control mono" [(ngModel)]="newCode" (ngModelChange)="codeTouched = true" placeholder="MAYOR" />
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="showCreate.set(false)">বাতিল</button>
              <button class="btn btn-primary" [disabled]="saving()" (click)="createRole()">
                {{ saving() ? 'সংরক্ষণ...' : 'রোল তৈরি করুন' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 0 4px 40px; }
    .muni-bar { position: sticky; top: 0; z-index: 20; background:#fff; border:1px solid #e8eee9;
      border-radius:12px; padding:14px 20px; margin-bottom:16px; display:flex; gap:20px;
      align-items:center; justify-content:space-between; flex-wrap:wrap; box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .muni-title { font-size:1.2rem; font-weight:700; color:#0a5c36; }
    .muni-select { display:flex; align-items:center; gap:10px; min-width:320px; }
    .muni-select label { font-weight:600; white-space:nowrap; margin:0; }
    .tabs { display:flex; gap:4px; border-bottom:2px solid #e8eee9; margin-bottom:16px; }
    .tabs button { background:none; border:none; padding:12px 18px; font-size:.95rem; cursor:pointer;
      color:#5d6b63; border-bottom:3px solid transparent; margin-bottom:-2px; }
    .tabs button.active { color:#0a5c36; font-weight:700; border-bottom-color:#0a5c36; }
    .dot { background:#e67e22; color:#fff; border-radius:10px; padding:1px 7px; font-size:.75rem; margin-left:6px; }
    .split { display:grid; grid-template-columns: 300px 1fr; gap:16px; align-items:start; }
    @media (max-width: 800px) { .split { grid-template-columns: 1fr; } }
    .pane-head { display:flex; justify-content:space-between; align-items:center; gap:12px;
      padding:14px 16px; border-bottom:1px solid #e8eee9; flex-wrap:wrap; }
    .head-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .search { width:200px; padding:6px 10px; }
    .role-item { display:flex; justify-content:space-between; align-items:center; padding:12px 16px;
      cursor:pointer; border-bottom:1px solid #f0f4f1; border-left:3px solid transparent; }
    .role-item:hover { background:#f7faf8; }
    .role-item.selected { background:#eaf5ee; border-left-color:#0a5c36; }
    .role-bn { font-weight:600; }
    .perm-body { padding:12px 16px; max-height:62vh; overflow:auto; }
    .group { border:1px solid #e8eee9; border-radius:10px; margin-bottom:12px; overflow:hidden; }
    .group-head { display:flex; justify-content:space-between; align-items:center; background:#f4f8f5; padding:10px 14px; }
    .group-items { padding:10px 14px; display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:8px 16px; }
    .check-label { display:flex; align-items:center; gap:8px; font-size:.92rem; cursor:pointer; }
    .permission-disabled { opacity:.7; cursor:default; }
    .permission-disabled input { cursor:not-allowed; }
    .btn-enable { margin-left:8px; padding:1px 8px; font-size:.75rem; border:1px solid #0a5c36;
      background:#fff; color:#0a5c36; border-radius:10px; cursor:pointer; }
    .btn-enable:hover { background:#eaf5ee; }
    .switch { position:relative; display:inline-block; width:38px; height:20px; }
    .switch input { opacity:0; width:0; height:0; }
    .slider { position:absolute; inset:0; background:#c5cfc8; border-radius:20px; transition:.2s; cursor:pointer; }
    .slider:before { content:''; position:absolute; height:14px; width:14px; left:3px; top:3px;
      background:#fff; border-radius:50%; transition:.2s; }
    .switch input:checked + .slider { background:#0a5c36; }
    .switch input:checked + .slider:before { transform:translateX(18px); }
    .assign-card { padding:20px; max-width:640px; }
    .user-results { border:1px solid #e8eee9; border-radius:8px; margin-top:8px; max-height:240px; overflow:auto; }
    .user-row { display:flex; gap:12px; align-items:center; padding:10px 12px; cursor:pointer; border-bottom:1px solid #f0f4f1; }
    .user-row:hover { background:#f7faf8; }
    .user-row.selected { background:#eaf5ee; }
    .avatar { width:34px; height:34px; border-radius:50%; background:#0a5c36; color:#fff;
      display:flex; align-items:center; justify-content:center; font-weight:700; }
    .picked { background:#eaf5ee; border-radius:8px; padding:10px 14px; margin:12px 0; }
    tr.dirty { background:#fff8e6; }
    .empty-state { text-align:center; padding:60px 20px; color:#5d6b63; }
    .empty-state.small { padding:40px 20px; }
    .empty-icon { font-size:2.5rem; margin-bottom:8px; }
    .alert { position:relative; }
    .alert .x { position:absolute; right:12px; top:8px; background:none; border:none; font-size:1.2rem; cursor:pointer; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000;
      display:flex; align-items:center; justify-content:center; padding:20px; }
    .modal-card { background:#fff; border-radius:12px; width:100%; max-width:480px; max-height:85vh;
      overflow:auto; box-shadow:0 12px 40px rgba(0,0,0,.25); }
    .modal-header { display:flex; justify-content:space-between; align-items:center;
      padding:16px 20px; border-bottom:1px solid #e8eee9; }
    .modal-header h3 { margin:0; font-size:1.05rem; color:#0a5c36; }
    .modal-body { padding:20px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
    .mono { font-family: monospace; }
    .pad { padding:16px; }
    .nomargin { margin:4px 0 0; }
  `],
})
export class RoleListComponent implements OnInit {
  readonly String = String;

  tab = signal<Tab>('roles');

  roles = signal<any[]>([]);
  municipalities = signal<any[]>([]);
  selectedMunicipalityId = signal<string>('');
  municipalityPermissionMatrix = signal<any[]>([]);
  originalMatrix = signal<any[]>([]);

  loading = signal(false);
  saving = signal(false);
  policyLoading = signal(false);
  policySaving = signal(false);
  permLoading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  showCreate = signal(false);
  newCode = '';
  newNameBn = '';
  newNameEn = '';
  codeTouched = false;

  selectedRole = signal<any>(null);
  permissions = signal<any[]>([]);
  selectedPerms = signal<string[]>([]);
  originalPerms = signal<string[]>([]);
  permSearch = signal('');

  assignUserId = '';
  assignRoleId = '';
  pickedUserLabel = '';
  userSearchText = '';
  userResults = signal<any[]>([]);
  userSearchLoading = signal(false);
  private searchTimer: any;

  activeRoles = computed(() => this.roles().filter((r) => this.isActive(r)));

  selectedCount = computed(() => this.selectedPerms().length);

  permDirty = computed(() => {
    const a = [...this.selectedPerms()].sort().join('|');
    const b = [...this.originalPerms()].sort().join('|');
    return a !== b;
  });

  groupedPermissions = computed(() => {
    const q = this.permSearch().trim().toLowerCase();
    const map = new Map<string, any[]>();
    for (const p of this.permissions()) {
      const label = (this.getPermLabel(p) + ' ' + this.getPermId(p)).toLowerCase();
      if (q && !label.includes(q)) continue;
      const group = p.permissionGroup || this.getPermId(p).split('.')[0]?.toUpperCase() || 'OTHER';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(p);
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  });

  policyDirtyCount = computed(
    () => this.municipalityPermissionMatrix().filter((p) => this.isDirty(p)).length
  );

  constructor(private admin: AdminService, private auth: AuthService) {}

  get isPlatformAdmin(): boolean {
    return this.auth.hasRole('PLATFORM_ADMIN');
  }

  get ownMunicipalityName(): string {
    const u: any = this.auth.currentUser();
    return u?.municipalityNameBn || u?.municipalityName || 'আপনার পৌরসভা';
  }

  ngOnInit() {
    this.loadMunicipalities();
  }

  // ---------- helpers ----------
  private toList(res: any): any[] {
    return Array.isArray(res) ? res
      : Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.content) ? res.content
      : Array.isArray(res?.users) ? res.users
      : Array.isArray(res?.permissions) ? res.permissions
      : [];
  }
  // ব্যাকএন্ডের "Validation failed"-এর ভেতরের আসল কারণ দেখায়
  private errText(err: any, fallback: string): string {
    const e = err?.error;
    const base = e?.message || fallback;
    const raw = e?.errors ?? e?.details ?? e?.fieldErrors ?? e?.data;
    let extra = '';
    if (Array.isArray(raw)) {
      extra = raw
        .map((x: any) => (typeof x === 'string' ? x : [x?.field, x?.message || x?.defaultMessage].filter(Boolean).join(': ')))
        .filter(Boolean)
        .join(' | ');
    } else if (raw && typeof raw === 'object') {
      extra = Object.entries(raw).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    console.error('API ERROR:', err?.status, JSON.stringify(e));
    return extra ? `${base} (${extra})` : base;
  }
  private muniId(): number | undefined {
    const v = this.selectedMunicipalityId();
    return v ? Number(v) : undefined;
  }
  isActive(r: any): boolean {
    return r.isActive !== false && r.status !== 'INACTIVE';
  }
  isPlatformRole(r: any): boolean {
    if (!r) return false;
    return String(r.roleCode || r.code || '').toUpperCase() === 'PLATFORM_ADMIN';
  }
  isSelected(r: any): boolean {
    const s = this.selectedRole();
    return !!s && (s.id || s.roleId) === (r.id || r.roleId);
  }

  // ---------- municipality ----------
  loadMunicipalities() {
    // পৌরসভা অ্যাডমিন: নিজের পৌরসভাই ফিক্সড, তালিকা লাগে না
    if (!this.isPlatformAdmin) {
      const mid = this.auth.currentUser()?.municipalityId;
      this.municipalities.set([]);
      if (mid != null) {
        this.onMunicipalityChange(String(mid));
      } else {
        this.errorMsg.set('আপনার অ্যাকাউন্টে কোনো পৌরসভা যুক্ত নেই।');
      }
      return;
    }

    this.admin.getMunicipalities().subscribe({
      next: (res: any) => {
        const list = this.toList(res);
        this.municipalities.set(list);
        if (list.length > 0) {
          this.onMunicipalityChange(String(list[0].id));
        } else {
          this.load();
        }
      },
      error: () => {
        this.municipalities.set([]);
        this.load();
      },
    });
  }

  onMunicipalityChange(value: string) {
    this.selectedMunicipalityId.set(value);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.selectedRole.set(null);
    this.permissions.set([]);
    this.selectedPerms.set([]);
    this.originalPerms.set([]);
    this.resetAssign();

    if (!value) {
      this.roles.set([]);
      this.municipalityPermissionMatrix.set([]);
      this.originalMatrix.set([]);
      return;
    }
    this.load();
    this.loadMunicipalityPolicies();
  }

  // ---------- roles ----------
  load() {
    this.loading.set(true);
    this.admin.getRoles(this.muniId()).subscribe({
      next: (res: any) => {
        this.roles.set(this.toList(res));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'রোল লোড ব্যর্থ।');
      },
    });
  }

  openCreate() {
    this.newCode = ''; this.newNameBn = ''; this.newNameEn = ''; this.codeTouched = false;
    this.showCreate.set(true);
  }

  onNameEnChange(v: string) {
    this.newNameEn = v;
    if (!this.codeTouched) {
      this.newCode = v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
  }

  createRole() {
    if (!this.newCode.trim() || !this.newNameBn.trim()) {
      this.errorMsg.set('কোড ও বাংলা নাম আবশ্যক।');
      return;
    }
    const municipalityId = this.muniId();
    if (this.municipalities().length > 0 && !municipalityId) {
      this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।');
      return;
    }
    this.saving.set(true);
    this.admin.createRole({
      municipalityId,
      code: this.newCode.trim(),
      nameBn: this.newNameBn.trim(),
      nameEn: this.newNameEn.trim() || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('রোল তৈরি হয়েছে।');
        this.showCreate.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'রোল তৈরি ব্যর্থ।');
      },
    });
  }

  toggleActive(role: any, checked: boolean, ev: Event) {
    if (checked) {
      // পুনরায় সক্রিয় করার API আপনার সার্ভিসে নেই, তাই আগের অবস্থায় ফেরত
      (ev.target as HTMLInputElement).checked = false;
      this.errorMsg.set('রোল পুনরায় সক্রিয় করার API এখনো যোগ করা হয়নি।');
      return;
    }
    if (!confirm(`"${role.nameBn || role.name}" নিষ্ক্রিয় করবেন?`)) {
      (ev.target as HTMLInputElement).checked = true;
      return;
    }
    this.admin.deactivateRole(role.id || role.roleId).subscribe({
      next: () => {
        this.successMsg.set('রোল নিষ্ক্রিয় করা হয়েছে।');
        this.load();
      },
      error: (err) => {
        (ev.target as HTMLInputElement).checked = true;
        this.errorMsg.set(err?.error?.message || 'ব্যর্থ।');
      },
    });
  }

  // ---------- permission tree ----------
  selectRole(role: any) {
    const municipalityId = this.muniId();
    if (!municipalityId) {
      this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।');
      return;
    }
    if (this.permDirty() && !confirm('অসংরক্ষিত পরিবর্তন বাতিল করে অন্য রোল খুলবেন?')) return;

    // প্ল্যাটফর্ম-স্তরের রোল পৌরসভার অধীনে নয়, তাই permission লোড করা হবে না
    if (this.isPlatformRole(role)) {
      this.selectedRole.set(role);
      this.permissions.set([]);
      this.selectedPerms.set([]);
      this.originalPerms.set([]);
      this.permLoading.set(false);
      this.errorMsg.set('');
      return;
    }

    const id = role.id || role.roleId;
    this.selectedRole.set(role);
    this.permLoading.set(true);
    this.permSearch.set('');
    this.errorMsg.set('');

    this.admin.getPermissions().subscribe({
      next: (catalogRes: any) => {
        const catalog = this.toList(catalogRes);
        this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({
          next: (matrixRes: any) => {
            const matrix = this.toList(matrixRes);
            this.municipalityPermissionMatrix.set(matrix);
            this.originalMatrix.set(JSON.parse(JSON.stringify(matrix)));
            this.admin.getRolePermissions(id, municipalityId).subscribe({
              next: (assignedRes: any) => {
                const codes = this.toList(assignedRes)
                  .map((p: any) => (typeof p === 'string' ? p : p.permissionCode || p.code || p.permission))
                  .filter((c: any) => typeof c === 'string');
                const selected = catalog.map((p) => this.getPermId(p)).filter((c) => codes.includes(c));
                this.permissions.set(catalog);
                this.selectedPerms.set(selected);
                this.originalPerms.set([...selected]);
                this.permLoading.set(false);
              },
              error: (err) => this.failPerm(err, 'Role-এর Permission লোড করা যায়নি।'),
            });
          },
          error: (err) => this.failPerm(err, 'Permission নীতি লোড করা যায়নি।'),
        });
      },
      error: (err) => this.failPerm(err, 'Permission তালিকা লোড করা যায়নি।'),
    });
  }
  private failPerm(err: any, fallback: string) {
    this.permLoading.set(false);
    this.errorMsg.set(err?.error?.message || fallback);
  }

  getPermId(p: any): string {
    if (typeof p === 'string') return p;
    return p.permissionCode || p.code || p.permission || p.id || p.name || '';
  }
  getPermLabel(p: any): string {
    if (typeof p === 'string') return p;
    return p.labelBn || p.labelEn || p.code || p.permissionCode || 'Unknown permission';
  }

  isPermissionAllowed(code: string): boolean {
    const policy = this.municipalityPermissionMatrix().find((p: any) => (p.permissionCode || p.code) === code);
    return policy != null && policy.canUse === true && policy.canDelegate === true;
  }

  togglePerm(id: string) {
    this.selectedPerms.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  private allowedIds(g: { items: any[] }): string[] {
    return g.items.map((p) => this.getPermId(p)).filter((id) => this.isPermissionAllowed(id));
  }
  groupAllowed(g: any) { return this.allowedIds(g).length; }
  groupSelected(g: any) { return this.allowedIds(g).filter((id) => this.selectedPerms().includes(id)).length; }
  groupState(g: any): 'none' | 'some' | 'all' {
    const total = this.groupAllowed(g);
    const sel = this.groupSelected(g);
    return sel === 0 ? 'none' : sel === total ? 'all' : 'some';
  }
  toggleGroup(g: any, checked: boolean) {
    const ids = this.allowedIds(g);
    this.selectedPerms.update((l) => {
      const rest = l.filter((x) => !ids.includes(x));
      return checked ? [...rest, ...ids] : rest;
    });
  }

  // এক ক্লিকে Policy চালু (canUse + canDelegate)
  enablePolicy(code: string, ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    const municipalityId = this.muniId();
    if (!municipalityId) return;

    this.admin.updateMunicipalityPermission(municipalityId, {
      permissionCode: code,
      canUse: true,
      canDelegate: true,
    }).subscribe({
      next: () => {
        this.municipalityPermissionMatrix.update((list) => {
          const exists = list.some((p) => (p.permissionCode || p.code) === code);
          return exists
            ? list.map((p) =>
                (p.permissionCode || p.code) === code
                  ? { ...p, canUse: true, canDelegate: true }
                  : p)
            : [...list, { permissionCode: code, canUse: true, canDelegate: true }];
        });
        this.originalMatrix.set(JSON.parse(JSON.stringify(this.municipalityPermissionMatrix())));
        this.successMsg.set(`চালু হয়েছে: ${code}`);
      },
      error: (err) => this.errorMsg.set(this.errText(err, 'Policy চালু করা যায়নি।')),
    });
  }

  blockedCount(): number {
    return this.permissions().filter((p) => !this.isPermissionAllowed(this.getPermId(p))).length;
  }

  // এই পৌরসভায় বন্ধ থাকা সব permission এক ক্লিকে চালু
  enableAllBlocked() {
    const municipalityId = this.muniId();
    if (!municipalityId) return;
    const codes = this.permissions()
      .map((p) => this.getPermId(p))
      .filter((c) => c && !this.isPermissionAllowed(c));
    if (codes.length === 0) return;
    if (!confirm(`${codes.length} টি permission এই পৌরসভায় চালু করবেন?`)) return;

    this.saving.set(true);
    this.errorMsg.set('');
    let pending = codes.length;
    let failed = 0;
    let firstErr = '';

    codes.forEach((code) => {
      this.admin.updateMunicipalityPermission(municipalityId, {
        permissionCode: code, canUse: true, canDelegate: true,
      }).subscribe({
        next: () => { if (--pending === 0) this.doneEnableAll(failed, firstErr); },
        error: (err) => {
          failed++;
          if (!firstErr) firstErr = `${code} → ${this.errText(err, 'ব্যর্থ')}`;
          if (--pending === 0) this.doneEnableAll(failed, firstErr);
        },
      });
    });
  }
  private doneEnableAll(failed: number, firstErr: string) {
    this.saving.set(false);
    if (failed > 0) this.errorMsg.set(`${failed} টি চালু করা যায়নি। প্রথম এরর: ${firstErr}`);
    else this.successMsg.set('সব permission এই পৌরসভায় চালু হয়েছে।');
    this.loadMunicipalityPolicies();
  }

  // শুধু অনুমোদিতগুলো যোগ করে, আগের টিক মুছে না
  selectAllAllowed() {
    const allowed = this.permissions()
      .map((p) => this.getPermId(p))
      .filter((id) => this.isPermissionAllowed(id));
    if (allowed.length === 0) {
      this.errorMsg.set('এই পৌরসভায় কোনো permission চালু নেই। আগে "সব বন্ধ permission চালু" চাপুন।');
      return;
    }
    this.selectedPerms.update((l) => Array.from(new Set([...l, ...allowed])));
  }

  savePermissions() {
    const role = this.selectedRole();
    const municipalityId = this.muniId();
    if (!role || !municipalityId) return;

    this.saving.set(true);
    this.errorMsg.set('');

    // যেসব permission টিক দেওয়া কিন্তু Policy-তে বন্ধ
    const blocked = this.isPlatformAdmin
      ? this.selectedPerms().filter((c) => !this.isPermissionAllowed(c))
      : [];

    const doSave = () => {
      this.admin.setRolePermissions(role.id || role.roleId, this.selectedPerms(), municipalityId)
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.originalPerms.set([...this.selectedPerms()]);
            this.successMsg.set('পারমিশন সংরক্ষিত।');
          },
          error: (err) => {
            this.saving.set(false);
            this.errorMsg.set(this.errText(err, 'পারমিশন সংরক্ষণ ব্যর্থ।'));
          },
        });
    };

    if (blocked.length === 0) { doSave(); return; }

    let pending = blocked.length;
    let failed = false;
    blocked.forEach((code) => {
      this.admin.updateMunicipalityPermission(municipalityId, {
        permissionCode: code, canUse: true, canDelegate: true,
      }).subscribe({
        next: () => {
          if (--pending === 0 && !failed) { this.loadMunicipalityPolicies(); doSave(); }
        },
        error: (err) => {
          failed = true;
          if (--pending === 0) {
            this.saving.set(false);
            this.errorMsg.set(this.errText(err, `Policy চালু করা যায়নি: ${code}`));
          }
        },
      });
    });
  }

  // ---------- users ----------
  onUserSearchChange(value: string) {
    this.userSearchText = value;
    this.assignUserId = '';
    this.pickedUserLabel = '';
    this.userResults.set([]);
    clearTimeout(this.searchTimer);

    const q = value.trim();
    if (q.length < 2) { this.userSearchLoading.set(false); return; }
    const municipalityId = this.muniId();
    if (!municipalityId) { this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।'); return; }

    this.userSearchLoading.set(true);
    this.searchTimer = setTimeout(() => {   // debounce 350ms
      this.admin.searchUsers(q, municipalityId).subscribe({
        next: (res: any) => {
          const list = this.toList(res);
          this.userResults.set(list);
          this.userSearchLoading.set(false);
          if (list.length === 0) this.errorMsg.set('এই পৌরসভায় কোনো ইউজার পাওয়া যায়নি।');
        },
        error: (err) => {
          this.userSearchLoading.set(false);
          this.errorMsg.set(err?.error?.message || 'ইউজার খোঁজা যায়নি।');
        },
      });
    }, 350);
  }

  pickUser(u: any) {
    this.assignUserId = String(u.id || u.userId);
    this.pickedUserLabel = this.getUserLabel(u);
    this.userResults.set([]);
    this.userSearchText = this.pickedUserLabel;
  }

  getUserLabel(user: any): string {
    return user.nameBn || user.nameEn || user.fullName || user.name || 'নাম নেই';
  }

  assign() {
    const municipalityId = this.selectedMunicipalityId();
    if (!municipalityId || !this.assignUserId || !this.assignRoleId) {
      this.errorMsg.set('ইউজার ও রোল নির্বাচন করুন।');
      return;
    }
    this.saving.set(true);
    this.admin.assignRole({
      userId: this.assignUserId,
      roleId: this.assignRoleId,
      municipalityId,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set(`"${this.pickedUserLabel}"-কে রোল অ্যাসাইন হয়েছে।`);
        this.resetAssign();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'রোল অ্যাসাইন ব্যর্থ।');
      },
    });
  }
  private resetAssign() {
    this.assignUserId = ''; this.assignRoleId = ''; this.pickedUserLabel = '';
    this.userSearchText = ''; this.userResults.set([]);
  }

  // ---------- policy ----------
  loadMunicipalityPolicies() {
    const municipalityId = this.muniId();
    if (!municipalityId) { this.municipalityPermissionMatrix.set([]); return; }
    this.policyLoading.set(true);
    this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({
      next: (res: any) => {
        const list = this.toList(res);
        this.municipalityPermissionMatrix.set(list);
        this.originalMatrix.set(JSON.parse(JSON.stringify(list)));
        this.policyLoading.set(false);
      },
      error: (err) => {
        this.policyLoading.set(false);
        this.errorMsg.set(err?.error?.message || 'Permission নীতি লোড করা যায়নি।');
      },
    });
  }

  isDirty(p: any): boolean {
    const code = p.permissionCode || p.code;
    const o = this.originalMatrix().find((x: any) => (x.permissionCode || x.code) === code);
    return !o || o.canUse !== p.canUse || o.canDelegate !== p.canDelegate;
  }

  updatePolicyValue(code: string, field: 'canUse' | 'canDelegate', value: boolean) {
    this.municipalityPermissionMatrix.update((list) =>
      list.map((p) => {
        if ((p.permissionCode || p.code) !== code) return p;
        if (field === 'canUse' && !value) return { ...p, canUse: false, canDelegate: false };
        if (field === 'canDelegate' && value && p.canUse !== true) return p;
        return { ...p, [field]: value };
      })
    );
  }

  saveAllPolicies() {
    const municipalityId = this.muniId();
    const dirty = this.municipalityPermissionMatrix().filter((p) => this.isDirty(p));
    if (!municipalityId || dirty.length === 0) return;

    this.policySaving.set(true);
    let pending = dirty.length;
    let failed = 0;

    dirty.forEach((p) => {
      this.admin.updateMunicipalityPermission(municipalityId, {
        permissionCode: p.permissionCode || p.code,
        canUse: p.canUse === true,
        canDelegate: p.canDelegate === true,
      }).subscribe({
        next: () => this.donePolicy(--pending, failed),
        error: () => { failed++; this.donePolicy(--pending, failed); },
      });
    });
  }
  private donePolicy(pending: number, failed: number) {
    if (pending > 0) return;
    this.policySaving.set(false);
    if (failed > 0) this.errorMsg.set(`${failed} টি policy সংরক্ষণ ব্যর্থ হয়েছে।`);
    else this.successMsg.set('সব Permission নীতি সংরক্ষিত।');
    this.loadMunicipalityPolicies();
  }
}
