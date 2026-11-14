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
    <!-- TOP HERO -->
    <div class="hero">
      <div class="hero-left">
        <span class="eyebrow">ADMIN &nbsp;•&nbsp; ACCESS CONTROL</span>
        <h1>রোল ও অ্যাক্সেস ব্যবস্থাপনা</h1>
        <p>কে কোন কাজ করতে পারবে — পৌরসভা বাছুন, রোল বাছুন, পারমিশন ঠিক করুন।</p>
      </div>
      <div class="hero-stats">
        <div class="hstat"><span class="hstat-num">{{ roles().length }}</span><span class="hstat-lbl">মোট রোল</span></div>
        <div class="hstat green"><span class="hstat-num">{{ activeRoles().length }}</span><span class="hstat-lbl">চালু রোল</span></div>
        <div class="hstat amber"><span class="hstat-num">{{ policyDirtyCount() }}</span><span class="hstat-lbl">অসংরক্ষিত নীতি</span></div>
      </div>
    </div>

    <!-- MUNICIPALITY DROPDOWN - LIST OF ITEMS -->
    <div class="muni-card">
      <div class="muni-top">
        <label class="field-label" for="muniSelect">পৌরসভা <span class="req">*</span></label>
        <span class="muni-count">{{ municipalities().length }} টি পৌরসভা উপলব্ধ</span>
      </div>
      @if (isPlatformAdmin) {
        <div class="dropdown-wrap">
          <span class="dropdown-icon">▦</span>
          <select id="muniSelect" class="muni-dropdown" [ngModel]="selectedMunicipalityId()" (ngModelChange)="onMunicipalityChange($event)">
            <option value="" disabled>-- পৌরসভা বাছাই করুন — তালিকা থেকে একটি বাছুন --</option>
            @for (m of municipalities(); track m.id) { <option [value]="m.id">{{ m.nameBn || m.nameEn || m.code }} — {{ m.code || '' }}</option> }
          </select>
          <span class="dropdown-arrow">▾</span>
        </div>
        <div class="muni-sub">
          <span class="dot-live"></span>
          @if (selectedMunicipalityId()) { <span>নির্বাচিত পৌরসভার রোল, পারমিশন ও ইউজার দেখা হচ্ছে</span> } @else { <span>উপরের ড্রপডাউন থেকে একটি পৌরসভা বাছুন — তালিকায় সব পৌরসভা আছে</span> }
        </div>
      } @else {
        <div class="muni-dropdown muni-fixed"><span class="dropdown-icon">▦</span><strong>{{ ownMunicipalityName }}</strong><span class="badge-fixed">আপনার পৌরসভা</span></div>
      }
    </div>

    @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}<button class="x" (click)="errorMsg.set('')">×</button></div> }
    @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}<button class="x" (click)="successMsg.set('')">×</button></div> }

    @if (!selectedMunicipalityId()) {
      <div class="empty-state big">
        <div class="empty-box">১</div>
        <h3>শুরু করতে উপরের ড্রপডাউন থেকে পৌরসভা বাছাই করুন</h3>
        <p>ড্রপডাউনে ক্লিক করলেই পৌরসভার তালিকা খুলবে। একটি বাছাই করলেই তার রোল দেখা যাবে।</p>
        <div class="empty-steps"><span>১. পৌরসভা বাছুন</span><span>→</span><span>২. রোল বাছুন</span><span>→</span><span>৩. পারমিশন দিন</span></div>
      </div>
    } @else {
      <div class="tabs">
        <button [class.active]="tab() === 'roles'" (click)="tab.set('roles')"><span class="tab-no">১</span><span class="tab-txt"><strong>রোল ও পারমিশন</strong><small>রোল তৈরি ও পারমিশন ঠিক করুন</small></span><span class="tab-badge">{{ roles().length }}</span></button>
        <button [class.active]="tab() === 'users'" (click)="tab.set('users')"><span class="tab-no">২</span><span class="tab-txt"><strong>ইউজারকে রোল দিন</strong><small>কাকে কোন রোল দেবেন</small></span><span class="tab-arrow">→</span></button>
        @if (isPlatformAdmin) {
          <button [class.active]="tab() === 'policy'" (click)="tab.set('policy')"><span class="tab-no">৩</span><span class="tab-txt"><strong>পারমিশন নীতি</strong><small>এই পৌরসভায় কী চালু থাকবে</small></span>
            @if (policyDirtyCount() > 0) { <span class="dot">{{ policyDirtyCount() }}</span> }
          </button>
        }
      </div>

      @if (tab() === 'roles') {
        <div class="split">
          <aside class="card role-pane">
            <div class="pane-head"><div><strong>রোল তালিকা</strong><small>{{ roles().length }} টি রোল • ক্লিক করে পারমিশন দেখুন</small></div><button class="btn btn-sm btn-primary" (click)="openCreate()">+ নতুন রোল</button></div>
            @if (loading()) { <div class="spinner"></div> }
            @for (r of roles(); track r.id || r.roleId) {
              <div class="role-item" [class.selected]="isSelected(r)" (click)="selectRole(r)">
                <div class="role-avatar">{{ (r.nameBn || r.name || 'র').charAt(0) }}</div>
                <div class="role-names"><div class="role-bn">{{ r.nameBn || r.name_bn || r.name }}</div><small class="text-muted">{{ r.roleCode || r.code }}</small>@if (isPlatformRole(r)) { <span class="lock">প্ল্যাটফর্ম রোল</span> }</div>
                <div class="role-right"><span class="status-dot" [class.on]="isActive(r)"></span><label class="switch" (click)="$event.stopPropagation()" title="সক্রিয়/নিষ্ক্রিয়"><input type="checkbox" [checked]="isActive(r)" [disabled]="isPlatformRole(r)" (change)="toggleActive(r, $any($event.target).checked, $event)" /><span class="slider"></span></label></div>
              </div>
            } @empty { @if (!loading()) { <div class="empty-mini"><p>কোনো রোল নেই।</p><button class="btn btn-sm btn-primary" (click)="openCreate()">+ নতুন রোল তৈরি করুন</button></div> } }
            <div class="pane-foot">টিপস: রোলে ক্লিক করলে ডান পাশে তার পারমিশন দেখা যাবে।</div>
          </aside>

          <section class="card perm-pane">
            @if (!selectedRole()) {
              <div class="empty-state small"><div class="empty-box">২</div><h3>বাঁ দিক থেকে একটি রোল বাছাই করুন</h3><p>তারপর এখানে তার পারমিশন ঠিক করুন।</p></div>
            } @else if (isPlatformRole(selectedRole())) {
              <div class="empty-state small"><div class="empty-box lock-box">!</div><h3>{{ selectedRole()!.nameBn || selectedRole()!.name }}</h3><p>এটি প্ল্যাটফর্ম-স্তরের রোল।<br />এর পারমিশন কোনো পৌরসভার আওতায় নেই, তাই এখানে বদলানো যায় না।<br />পৌরসভার জন্য <b>মিউনিসিপ্যালিটি অ্যাডমিন</b> বা নিজের তৈরি রোল বাছুন।</p></div>
            } @else {
              <div class="pane-head perm-head"><div class="perm-title"><span class="perm-avatar">{{ (selectedRole()!.nameBn || selectedRole()!.name || 'র').charAt(0) }}</span><div><strong>{{ selectedRole()!.nameBn || selectedRole()!.name }}</strong><small>{{ selectedCount() }} টি পারমিশন নির্বাচিত • {{ selectedRole()!.roleCode || selectedRole()!.code }}</small></div></div>
                <div class="head-actions">
                  <div class="search-wrap"><span>⌕</span><input class="form-control search" placeholder="পারমিশন খুঁজুন..." [ngModel]="permSearch()" (ngModelChange)="permSearch.set($event)" /></div>
                  @if (isPlatformAdmin && blockedCount() > 0) { <button class="btn btn-sm btn-secondary" [disabled]="saving()" (click)="enableAllBlocked()">সব বন্ধ permission চালু ({{ blockedCount() }})</button> }
                  <button class="btn btn-sm btn-ghost" (click)="selectAllAllowed()">সব অনুমোদিত সিলেক্ট</button>
                  <button class="btn btn-sm btn-primary" [disabled]="saving() || !permDirty()" (click)="savePermissions()">{{ saving() ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন' }}</button>
                </div>
              </div>
              @if (permLoading()) { <div class="spinner"></div> } @else {
                <div class="perm-body">
                  @for (g of groupedPermissions(); track g.group) {
                    <div class="group">
                      <div class="group-head"><label class="check-label"><input type="checkbox" [checked]="groupState(g) === 'all'" [indeterminate]="groupState(g) === 'some'" [disabled]="groupAllowed(g) === 0" (change)="toggleGroup(g, $any($event.target).checked)" /><strong>{{ g.group }}</strong><span class="group-sub">{{ groupSelected(g) }} টি চালু</span></label><span class="group-count">{{ groupSelected(g) }}/{{ groupAllowed(g) }}</span></div>
                      <div class="group-items">
                        @for (p of g.items; track getPermId(p)) {
                          <label class="check-label perm-item" [class.permission-disabled]="!isPermissionAllowed(getPermId(p))" [class.checked]="selectedPerms().includes(getPermId(p))">
                            <input type="checkbox" [checked]="selectedPerms().includes(getPermId(p))" [disabled]="!isPermissionAllowed(getPermId(p))" (change)="togglePerm(getPermId(p))" />
                            <span class="perm-txt">{{ getPermLabel(p) }}@if (!isPermissionAllowed(getPermId(p))) { <small class="text-muted"> (এই পৌরসভায় বন্ধ)</small>@if (isPlatformAdmin) { <button class="btn-enable" (click)="enablePolicy(getPermId(p), $event)">চালু করুন</button> } @else { <small class="text-muted"> — প্ল্যাটফর্ম অ্যাডমিনকে জানান</small> } }</span>
                          </label>
                        }
                      </div>
                    </div>
                  } @empty { <p class="text-muted pad">কোনো পারমিশন পাওয়া যায়নি।</p> }
                </div>
                @if (permDirty()) { <div class="save-bar"><span class="save-dot"></span>অসংরক্ষিত পরিবর্তন আছে — <button class="btn btn-sm btn-primary" (click)="savePermissions()">এখন সংরক্ষণ করুন</button></div> }
              }
            }
          </section>
        </div>
      }

      @if (tab() === 'users') {
        <div class="assign-layout">
          <div class="card assign-card"><div class="step-head"><span class="step-no">১</span><div><h3>ইউজার খুঁজুন</h3><p>নাম / মোবাইল / ID লিখে খুঁজুন</p></div></div>
            <div class="form-group"><label class="field-label">ইউজার খুঁজুন</label><input class="form-control big-input" [ngModel]="userSearchText" (ngModelChange)="onUserSearchChange($event)" placeholder="কমপক্ষে ২টি অক্ষর লিখুন — যেমন: ওমর" />
              @if (userSearchLoading()) { <small class="text-muted">খোঁজা হচ্ছে...</small> }
              @if (userResults().length > 0) { <div class="user-results">@for (u of userResults(); track u.id || u.userId) { <div class="user-row" [class.selected]="assignUserId === String(u.id || u.userId)" (click)="pickUser(u)"><div class="avatar">{{ getUserLabel(u).charAt(0) }}</div><div><div class="user-name">{{ getUserLabel(u) }}</div><small class="text-muted">{{ u.mobile || u.phone || '' }}</small></div><span class="pick">বাছাই →</span></div> } </div> }
            </div>
            @if (assignUserId) { <div class="picked"><span class="picked-check">✓</span>নির্বাচিত ইউজার: <strong>{{ pickedUserLabel }}</strong></div> }
          </div>
          <div class="card assign-card"><div class="step-head"><span class="step-no">২</span><div><h3>রোল বাছাই করুন</h3><p>এই ইউজারকে কোন রোল দেবেন</p></div></div>
            <div class="form-group"><label class="field-label">রোল — ড্রপডাউন থেকে বাছুন</label><div class="dropdown-wrap sm"><select class="form-control big-input muni-dropdown" [(ngModel)]="assignRoleId"><option value="" disabled>-- রোল বাছাই — তালিকা থেকে একটি বাছুন --</option>@for (r of activeRoles(); track r.id || r.roleId) { <option [value]="r.id || r.roleId">{{ r.nameBn || r.name }} ({{ r.roleCode || r.code }})</option> }</select><span class="dropdown-arrow">▾</span></div></div>
            <button class="btn btn-primary btn-block" [disabled]="saving() || !assignRoleId || !assignUserId" (click)="assign()">অ্যাসাইন করুন</button>
            @if (!assignUserId) { <p class="text-muted small-center">আগে বাঁ দিক থেকে ইউজার বাছাই করুন</p> }
          </div>
        </div>
      }

      @if (tab() === 'policy' && isPlatformAdmin) {
        <div class="card policy-card">
          <div class="pane-head"><div><strong>পারমিশন নীতি</strong><p class="text-muted nomargin"><b>ব্যবহার করা যাবে</b> = এই পৌরসভায় permission চালু। &nbsp; <b>অন্য রোলকে দেওয়া যাবে</b> = রোলে অ্যাসাইন করা যাবে।</p></div><button class="btn btn-sm btn-primary" [disabled]="policySaving() || policyDirtyCount() === 0" (click)="saveAllPolicies()">{{ policySaving() ? 'সংরক্ষণ...' : 'সব সংরক্ষণ (' + policyDirtyCount() + ')' }}</button></div>
          @if (policyLoading()) { <div class="spinner"></div> } @else {
            <div class="table-wrapper"><table class="data-table"><thead><tr><th>Permission</th><th>ব্যবহার করা যাবে</th><th>অন্য রোলকে দেওয়া যাবে</th></tr></thead><tbody>
              @for (p of municipalityPermissionMatrix(); track p.permissionCode || p.code) { <tr [class.dirty]="isDirty(p)"><td><strong>{{ p.labelBn || p.permissionCode || p.code }}</strong><br /><small class="text-muted">{{ p.permissionCode || p.code }}</small></td><td><label class="switch sm"><input type="checkbox" [checked]="p.canUse === true" (change)="updatePolicyValue(p.permissionCode || p.code, 'canUse', $any($event.target).checked)" /><span class="slider"></span></label></td><td><label class="switch sm"><input type="checkbox" [checked]="p.canDelegate === true" [disabled]="p.canUse !== true" (change)="updatePolicyValue(p.permissionCode || p.code, 'canDelegate', $any($event.target).checked)" /><span class="slider"></span></label></td></tr> } @empty { <tr><td colspan="3" class="text-center text-muted">কোনো Permission নীতি পাওয়া যায়নি।</td></tr> }
            </tbody></table></div>
          }
        </div>
      }
    }

    @if (showCreate()) {
      <div class="modal-overlay" (click)="showCreate.set(false)"><div class="modal-card" (click)="$event.stopPropagation()"><div class="modal-header"><h3>নতুন রোল তৈরি করুন</h3><button class="btn btn-sm btn-secondary" (click)="showCreate.set(false)">×</button></div>
        <div class="modal-body"><div class="form-group"><label>নাম (English) <span class="required">*</span></label><input class="form-control" [ngModel]="newNameEn" (ngModelChange)="onNameEnChange($event)" placeholder="Mayor" /></div><div class="form-group"><label>নাম (বাংলা) <span class="required">*</span></label><input class="form-control" [(ngModel)]="newNameBn" placeholder="মেয়র" /></div><div class="form-group"><label>কোড <small class="text-muted">(অটো তৈরি, দরকার হলে বদলান)</small></label><input class="form-control mono" [(ngModel)]="newCode" (ngModelChange)="codeTouched = true" placeholder="MAYOR" /></div><div class="modal-actions"><button class="btn btn-secondary" (click)="showCreate.set(false)">বাতিল</button><button class="btn btn-primary" [disabled]="saving()" (click)="createRole()">{{ saving() ? 'সংরক্ষণ...' : 'রোল তৈরি করুন' }}</button></div></div>
      </div></div>
    }
  </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .page { max-width: 1240px; margin: 0 auto; padding: 0 8px 48px; font-family: 'Inter', 'Hind Siliguri', system-ui, -apple-system, sans-serif; color: #0f1f16; }
    /* HERO - international */
    .hero { background: #ffffff; border: 1px solid #e2e8e5; border-left: 5px solid #0a5c36; border-radius: 14px; padding: 20px 22px; color: #0f1f16; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; box-shadow: 0 2px 10px rgba(0,0,0,.04); position: relative; overflow: hidden; }
    .hero::after { display: none; }
    .eyebrow { font-size: .72rem; letter-spacing: .14em; color: #0a5c36; font-weight: 800; }
    .hero h1 { margin: 6px 0 6px; font-size: 1.45rem; line-height: 1.2; color: #0a5c36 !important; font-weight: 800; }
    .hero p { margin: 0; color: #475569 !important; font-size: .92rem; max-width: 560px; }
    .hero-stats { display: flex; gap: 10px; align-items: flex-end; position: relative; z-index: 1; }
    .hstat { background: #f8fafc; border: 1px solid #e2e8e5; border-radius: 12px; padding: 11px 16px; min-width: 108px; }
    .hstat-num { display: block; font-size: 1.35rem; font-weight: 800; line-height: 1; color: #0f1f16; }
    .hstat-lbl { font-size: .78rem; color: #64748b; }
    .hstat.green { background: #ecfdf5; color: #0a5c36; border-color: #bbf7d0; }
    .hstat.green .hstat-lbl { color: #166534; }
    .hstat.amber { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    @media (max-width: 760px) { .hero-stats { width: 100%; } .hstat { flex: 1; } }
    /* MUNICIPALITY DROPDOWN */
    .muni-card { background: #fff; border: 1px solid #e2e8e5; border-radius: 16px; padding: 18px 20px 16px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,.04); }
    .muni-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .field-label { font-size: .86rem; font-weight: 700; color: #0f1f16; letter-spacing: .01em; }
    .req { color: #dc2626; }
    .muni-count { font-size: .78rem; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; }
    .dropdown-wrap { position: relative; display: flex; align-items: center; }
    .dropdown-wrap.sm { display: flex; }
    .dropdown-icon { position: absolute; left: 14px; z-index: 1; color: #0a5c36; font-size: 1rem; pointer-events: none; }
    .muni-dropdown { width: 100%; appearance: none; -webkit-appearance: none; padding: 13px 44px 13px 42px; font-size: .98rem; font-weight: 600; color: #0f1f16; border: 1.5px solid #cbd5e1; border-radius: 12px; background: #f8fafc; cursor: pointer; outline: none; transition: .15s; }
    .muni-dropdown:hover { border-color: #0a5c36; background: #fff; }
    .muni-dropdown:focus { border-color: #0a5c36; box-shadow: 0 0 0 4px rgba(10,92,54,.12); background: #fff; }
    .muni-dropdown option { padding: 10px; font-weight: 500; }
    .dropdown-arrow { position: absolute; right: 16px; color: #0a5c36; font-size: 1.1rem; pointer-events: none; }
    .muni-sub { display: flex; gap: 8px; align-items: center; margin-top: 10px; font-size: .85rem; color: #64748b; }
    .dot-live { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.15); flex-shrink: 0; }
    .muni-fixed { display: flex; align-items: center; gap: 10px; padding: 13px 16px 13px 42px; border: 1.5px solid #cbd5e1; border-radius: 12px; background: #f8fafc; position: relative; }
    .badge-fixed { margin-left: auto; background: #dcfce7; color: #166534; font-size: .75rem; padding: 4px 10px; border-radius: 20px; }
    .form-control { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1.5px solid #d5ddd8; border-radius: 10px; background: #fff; outline: none; }
    .form-control:focus { border-color: #0a5c36; box-shadow: 0 0 0 3px rgba(10,92,54,.10); }
    /* TABS */
    .tabs { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
    .tabs button { flex: 1; min-width: 230px; background: #fff; border: 1.5px solid #e2e8e5; border-radius: 14px; padding: 14px; cursor: pointer; display: flex; gap: 12px; align-items: center; text-align: left; position: relative; transition: .15s; }
    .tabs button:hover { border-color: #0a5c36; transform: translateY(-1px); box-shadow: none; }
    .tabs button.active { border-color: #0a5c36; background: #ecfdf5; box-shadow: none; }
    .tab-no { width: 36px; height: 36px; border-radius: 10px; background: #eef2ef; color: #0a5c36; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }
    .tabs button.active .tab-no { background: #0a5c36; color: #fff; }
    .tab-txt { flex: 1; }
    .tab-txt strong { display: block; font-size: .96rem; }
    .tab-txt small { color: #64748b; font-size: .80rem; }
    .tab-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 20px; font-size: .80rem; font-weight: 700; }
    .tab-arrow { color: #0a5c36; font-weight: 700; }
    .dot { background: #ea580c; color: #fff; border-radius: 12px; padding: 2px 8px; font-size: .75rem; position: absolute; top: 10px; right: 12px; }
    .card { background: #fff; border: 1px solid #e2e8e5; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.03); }
    .split { display: grid; grid-template-columns: 340px minmax(0,1fr); gap: 16px; align-items: start; }
    @media (max-width: 920px) { .split { grid-template-columns: 1fr; } }
    .pane-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #eef2ef; flex-wrap: wrap; }
    .pane-head strong { display: block; font-size: 1rem; }
    .pane-head small { color: #64748b; }
    .pane-foot { padding: 12px 18px; font-size: .82rem; color: #64748b; background: #f8fafc; border-top: 1px solid #eef2ef; }
    .head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-wrap > span { position: absolute; left: 10px; color: #94a3b8; }
    .search { width: 220px; padding-left: 30px; }
    .btn { padding: 10px 16px; border: 1px solid #d5ddd8; background: #f8fafc; border-radius: 10px; cursor: pointer; font-size: .90rem; font-weight: 600; }
    .btn-primary { background: #0a5c36; border-color: #0a5c36; color: #fff; box-shadow: 0 4px 12px rgba(10,92,54,.22); }
    .btn-primary:hover { background: #084d2d; }
    .btn-secondary { background: #fff; }
    .btn-ghost { background: #fff; border-color: #e2e8e5; }
    .btn-sm { padding: 7px 12px; font-size: .85rem; }
    .btn-block { width: 100%; padding: 12px; }
    .btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
    .role-item { display: flex; gap: 12px; align-items: center; padding: 13px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9; border-left: 3px solid transparent; }
    .role-item:hover { background: #f8fafc; }
    .role-item.selected { background: #ecfdf5; border-left-color: #0a5c36; }
    .role-avatar, .perm-avatar { width: 38px; height: 38px; border-radius: 10px; background: #dcfce7; color: #0a5c36; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }
    .perm-avatar { width: 40px; height: 40px; border-radius: 12px; }
    .role-names { flex: 1; min-width: 0; }
    .role-bn { font-weight: 700; }
    .lock { display: inline-block; margin-left: 6px; font-size: .72rem; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .role-right { display: flex; align-items: center; gap: 10px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
    .status-dot.on { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
    .empty-mini { text-align: center; padding: 24px 16px; }
    .perm-title { display: flex; gap: 12px; align-items: center; }
    .perm-body { padding: 16px 18px; }
    .group { border: 1px solid #e2e8e5; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
    .group-head { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 14px; }
    .group-sub { font-weight: 400; color: #64748b; font-size: .82rem; margin-left: 6px; }
    .group-count { font-size: .82rem; background: #fff; border: 1px solid #e2e8e5; padding: 3px 10px; border-radius: 20px; color: #0a5c36; font-weight: 700; }
    .group-items { padding: 12px 14px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
    .check-label { display: flex; align-items: flex-start; gap: 9px; font-size: .92rem; cursor: pointer; }
    .check-label input { margin-top: 3px; accent-color: #0a5c36; width: 16px; height: 16px; }
    .perm-item { background: #fbfcfb; border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px 11px; transition: .12s; }
    .perm-item:hover { border-color: #bbf7d0; }
    .perm-item.checked { background: #ecfdf5; border-color: #bbf7d0; }
    .permission-disabled { opacity: .75; }
    .btn-enable { margin-left: 8px; padding: 2px 9px; font-size: .75rem; border: 1px solid #0a5c36; background: #fff; color: #0a5c36; border-radius: 10px; cursor: pointer; }
    .save-bar { position: sticky; bottom: 0; background: #fffbeb; border-top: 1px solid #fde68a; padding: 11px 16px; display: flex; gap: 10px; align-items: center; justify-content: center; font-size: .90rem; }
    .save-dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; }
    .switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .switch.sm { width: 36px; height: 20px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 20px; transition: .2s; cursor: pointer; }
    .slider:before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
    .switch.sm .slider:before { height: 14px; width: 14px; }
    .switch input:checked + .slider { background: #0a5c36; }
    .switch input:checked + .slider:before { transform: translateX(18px); }
    .switch.sm input:checked + .slider:before { transform: translateX(16px); }
    .assign-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 800px) { .assign-layout { grid-template-columns: 1fr; } }
    .assign-card { padding: 22px; }
    .step-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .step-no { width: 38px; height: 38px; border-radius: 12px; background: #0a5c36; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; }
    .step-head h3 { margin: 0; font-size: 1.02rem; }
    .step-head p { margin: 2px 0 0; color: #64748b; font-size: .85rem; }
    .big-input { padding: 12px 14px; font-size: .95rem; }
    .user-results { border: 1px solid #e2e8e5; border-radius: 10px; margin-top: 8px; max-height: 260px; overflow: auto; }
    .user-row { display: flex; gap: 12px; align-items: center; padding: 11px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
    .user-row:hover { background: #f8fafc; }
    .user-row.selected { background: #ecfdf5; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: #0a5c36; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .user-name { font-weight: 600; }
    .pick { margin-left: auto; font-size: .82rem; color: #0a5c36; font-weight: 600; }
    .picked { background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 10px; padding: 11px 14px; margin: 12px 0; display: flex; gap: 8px; align-items: center; }
    .picked-check { width: 22px; height: 22px; background: #0a5c36; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .75rem; }
    .small-center { text-align: center; font-size: .85rem; margin-top: 10px; }
    .policy-card { overflow: hidden; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 13px 16px; background: #f8fafc; font-size: .86rem; }
    .data-table td { padding: 13px 16px; border-top: 1px solid #f1f5f9; }
    tr.dirty { background: #fffbeb; }
    .empty-state { text-align: center; padding: 50px 20px; color: #64748b; }
    .empty-state.big { background: #fff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 44px 20px; }
    .empty-state h3 { color: #0f1f16; margin: 12px 0 6px; }
    .empty-box { width: 52px; height: 52px; border-radius: 14px; background: #ecfdf5; color: #0a5c36; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; font-weight: 800; margin: 0 auto; }
    .lock-box { background: #fef3c7; color: #92400e; }
    .empty-steps { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 18px; font-size: .86rem; color: #0f1f16; }
    .empty-steps span { background: #f1f5f9; padding: 7px 12px; border-radius: 20px; }
    .alert { position: relative; padding: 13px 16px; border-radius: 12px; margin-bottom: 12px; font-size: .92rem; }
    .alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #ecfdf5; color: #14532d; border: 1px solid #bbf7d0; }
    .alert .x { position: absolute; right: 12px; top: 8px; background: none; border: none; font-size: 1.2rem; cursor: pointer; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-card { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; max-height: 85vh; overflow: auto; box-shadow: 0 20px 50px rgba(0,0,0,.25); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid #eef2ef; }
    .modal-header h3 { margin: 0; font-size: 1.08rem; color: #0a5c36; }
    .modal-body { padding: 20px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: .90rem; }
    .mono { font-family: monospace; }
    .pad { padding: 16px; }
    .nomargin { margin: 4px 0 0; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .required { color: #dc2626; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e2e8e5; border-top-color: #0a5c36; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class RoleListComponent implements OnInit {
  readonly String = String;
  tab = signal<Tab>('roles');
  roles = signal<any[]>([]); municipalities = signal<any[]>([]); selectedMunicipalityId = signal<string>('');
  municipalityPermissionMatrix = signal<any[]>([]); originalMatrix = signal<any[]>([]);
  loading = signal(false); saving = signal(false); policyLoading = signal(false); policySaving = signal(false); permLoading = signal(false);
  errorMsg = signal(''); successMsg = signal('');
  showCreate = signal(false); newCode = ''; newNameBn = ''; newNameEn = ''; codeTouched = false;
  selectedRole = signal<any>(null); permissions = signal<any[]>([]); selectedPerms = signal<string[]>([]); originalPerms = signal<string[]>([]); permSearch = signal('');
  assignUserId = ''; assignRoleId = ''; pickedUserLabel = ''; userSearchText = ''; userResults = signal<any[]>([]); userSearchLoading = signal(false);
  private searchTimer: any;
  activeRoles = computed(() => this.roles().filter((r) => this.isActive(r)));
  selectedCount = computed(() => this.selectedPerms().length);
  permDirty = computed(() => { const a = [...this.selectedPerms()].sort().join('|'); const b = [...this.originalPerms()].sort().join('|'); return a !== b; });
  groupedPermissions = computed(() => { const q = this.permSearch().trim().toLowerCase(); const map = new Map<string, any[]>(); for (const p of this.permissions()) { const label = (this.getPermLabel(p) + ' ' + this.getPermId(p)).toLowerCase(); if (q && !label.includes(q)) continue; const group = p.permissionGroup || this.getPermId(p).split('.')[0]?.toUpperCase() || 'OTHER'; if (!map.has(group)) map.set(group, []); map.get(group)!.push(p); } return Array.from(map.entries()).map(([group, items]) => ({ group, items })); });
  policyDirtyCount = computed(() => this.municipalityPermissionMatrix().filter((p) => this.isDirty(p)).length);
  constructor(private admin: AdminService, private auth: AuthService) {}
  get isPlatformAdmin(): boolean { return this.auth.hasRole('PLATFORM_ADMIN'); }
  get ownMunicipalityName(): string { const u: any = this.auth.currentUser(); return u?.municipalityNameBn || u?.municipalityName || 'আপনার পৌরসভা'; }
  ngOnInit() { this.loadMunicipalities(); }
  private toList(res: any): any[] { return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.content) ? res.content : Array.isArray(res?.users) ? res.users : Array.isArray(res?.permissions) ? res.permissions : []; }
  private errText(err: any, fallback: string): string { const e = err?.error; const base = e?.message || fallback; const raw = e?.errors ?? e?.details ?? e?.fieldErrors ?? e?.data; let extra = ''; if (Array.isArray(raw)) { extra = raw.map((x: any) => (typeof x === 'string' ? x : [x?.field, x?.message || x?.defaultMessage].filter(Boolean).join(': '))).filter(Boolean).join(' | '); } else if (raw && typeof raw === 'object') { extra = Object.entries(raw).map(([k, v]) => `${k}: ${v}`).join(' | '); } console.error('API ERROR:', err?.status, JSON.stringify(e)); return extra ? `${base} (${extra})` : base; }
  private muniId(): number | undefined { const v = this.selectedMunicipalityId(); return v ? Number(v) : undefined; }
  isActive(r: any): boolean { return r.isActive !== false && r.status !== 'INACTIVE'; }
  isPlatformRole(r: any): boolean { if (!r) return false; return String(r.roleCode || r.code || '').toUpperCase() === 'PLATFORM_ADMIN'; }
  isSelected(r: any): boolean { const s = this.selectedRole(); return !!s && (s.id || s.roleId) === (r.id || r.roleId); }
  loadMunicipalities() { if (!this.isPlatformAdmin) { const mid = this.auth.currentUser()?.municipalityId; this.municipalities.set([]); if (mid != null) { this.onMunicipalityChange(String(mid)); } else { this.errorMsg.set('আপনার অ্যাকাউন্টে কোনো পৌরসভা যুক্ত নেই।'); } return; } this.admin.getMunicipalities().subscribe({ next: (res: any) => { const list = this.toList(res); this.municipalities.set(list); if (list.length > 0) { this.onMunicipalityChange(String(list[0].id)); } else { this.load(); } }, error: () => { this.municipalities.set([]); this.load(); }, }); }
  onMunicipalityChange(value: string) { this.selectedMunicipalityId.set(value); this.errorMsg.set(''); this.successMsg.set(''); this.selectedRole.set(null); this.permissions.set([]); this.selectedPerms.set([]); this.originalPerms.set([]); this.resetAssign(); if (!value) { this.roles.set([]); this.municipalityPermissionMatrix.set([]); this.originalMatrix.set([]); return; } this.load();
  // A: Permission Matrix শুধু Platform Admin দেখবে।
  // Municipality User পেজে ঢুকলেই এই কল করলে আগে লাল Error আসতো।
  // এখন Municipality User এর জন্য Matrix শুধু selectRole() এ দরকার হলে লোড হবে।
  if (this.isPlatformAdmin) { this.loadMunicipalityPolicies(); }
  else { this.municipalityPermissionMatrix.set([]); this.originalMatrix.set([]); } }
  load() { this.loading.set(true); this.admin.getRoles(this.muniId()).subscribe({ next: (res: any) => { this.roles.set(this.toList(res)); this.loading.set(false); }, error: (err) => { this.loading.set(false); this.errorMsg.set(err?.error?.message || 'রোল লোড ব্যর্থ।'); }, }); }
  openCreate() { this.newCode = ''; this.newNameBn = ''; this.newNameEn = ''; this.codeTouched = false; this.showCreate.set(true); }
  onNameEnChange(v: string) { this.newNameEn = v; if (!this.codeTouched) { this.newCode = v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''); } }
  createRole() { if (!this.newCode.trim() || !this.newNameBn.trim()) { this.errorMsg.set('কোড ও বাংলা নাম আবশ্যক।'); return; } const municipalityId = this.muniId(); if (this.municipalities().length > 0 && !municipalityId) { this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।'); return; } this.saving.set(true); this.admin.createRole({ municipalityId, code: this.newCode.trim(), nameBn: this.newNameBn.trim(), nameEn: this.newNameEn.trim() || undefined, }).subscribe({ next: () => { this.saving.set(false); this.successMsg.set('রোল তৈরি হয়েছে।'); this.showCreate.set(false); this.load(); }, error: (err) => { this.saving.set(false); this.errorMsg.set(err?.error?.message || 'রোল তৈরি ব্যর্থ।'); }, }); }
  toggleActive(role: any, checked: boolean, ev: Event) { if (checked) { (ev.target as HTMLInputElement).checked = false; this.errorMsg.set('রোল পুনরায় সক্রিয় করার API এখনো যোগ করা হয়নি।'); return; } if (!confirm(`"${role.nameBn || role.name}" নিষ্ক্রিয় করবেন?`)) { (ev.target as HTMLInputElement).checked = true; return; } this.admin.deactivateRole(role.id || role.roleId).subscribe({ next: () => { this.successMsg.set('রোল নিষ্ক্রিয় করা হয়েছে।'); this.load(); }, error: (err) => { (ev.target as HTMLInputElement).checked = true; this.errorMsg.set(err?.error?.message || 'ব্যর্থ।'); }, }); }
  selectRole(role: any) { const municipalityId = this.muniId(); if (!municipalityId) { this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।'); return; } if (this.permDirty() && !confirm('অসংরক্ষিত পরিবর্তন বাতিল করে অন্য রোল খুলবেন?')) return; if (this.isPlatformRole(role)) { this.selectedRole.set(role); this.permissions.set([]); this.selectedPerms.set([]); this.originalPerms.set([]); this.permLoading.set(false); this.errorMsg.set(''); return; } const id = role.id || role.roleId; this.selectedRole.set(role); this.permLoading.set(true); this.permSearch.set(''); this.errorMsg.set('');
    // B: Platform Admin = আগের মতো ৩টা কল (Catalog + Matrix + Assigned)
    // Municipality User = Platform Catalog (/platform/permissions) কল করবে না।
    // Backend ঠিক করার পর Matrix এখন Municipality User ও দেখতে পারে (identity.role.view থাকলে),
    // তাই Matrix কেই Catalog হিসেবে ব্যবহার করবো।
    if (this.isPlatformAdmin) {
      this.admin.getPermissions().subscribe({ next: (catalogRes: any) => { const catalog = this.toList(catalogRes); this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({ next: (matrixRes: any) => { const matrix = this.toList(matrixRes); this.municipalityPermissionMatrix.set(matrix); this.originalMatrix.set(JSON.parse(JSON.stringify(matrix))); this.loadAssignedPerms(id, municipalityId, catalog); }, error: (err) => this.failPerm(err, 'Permission নীতি লোড করা যায়নি।'), }); }, error: (err) => this.failPerm(err, 'Permission তালিকা লোড করা যায়নি।'), });
    } else {
      this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({ next: (matrixRes: any) => { const matrix = this.toList(matrixRes); this.municipalityPermissionMatrix.set(matrix); this.originalMatrix.set(JSON.parse(JSON.stringify(matrix)));
        // Matrix থেকে Catalog বানাই: permissionCode -> code/label/group
        const catalog = matrix.map((m: any) => ({ permissionCode: m.permissionCode || m.code, code: m.permissionCode || m.code, labelBn: m.labelBn || m.permissionCode || m.code, labelEn: m.labelEn || m.permissionCode || m.code, permissionGroup: m.permissionGroup || (m.permissionCode || m.code || '').split('.')[0]?.toUpperCase() || 'OTHER' }));
        this.loadAssignedPerms(id, municipalityId, catalog); }, error: (err) => this.failPerm(err, 'Permission নীতি লোড করা যায়নি।'), });
    }
  }
  private loadAssignedPerms(id: any, municipalityId: number, catalog: any[]) { this.admin.getRolePermissions(id, municipalityId).subscribe({ next: (assignedRes: any) => { const codes = this.toList(assignedRes).map((p: any) => (typeof p === 'string' ? p : p.permissionCode || p.code || p.permission)).filter((c: any) => typeof c === 'string'); const selected = catalog.map((p) => this.getPermId(p)).filter((c) => codes.includes(c)); this.permissions.set(catalog); this.selectedPerms.set(selected); this.originalPerms.set([...selected]); this.permLoading.set(false); }, error: (err) => this.failPerm(err, 'Role-এর Permission লোড করা যায়নি।'), }); }
  private failPerm(err: any, fallback: string) { this.permLoading.set(false); this.errorMsg.set(err?.error?.message || fallback); }
  getPermId(p: any): string { if (typeof p === 'string') return p; return p.permissionCode || p.code || p.permission || p.id || p.name || ''; }
  getPermLabel(p: any): string { if (typeof p === 'string') return p; return p.labelBn || p.labelEn || p.code || p.permissionCode || 'Unknown permission'; }
  isPermissionAllowed(code: string): boolean { const policy = this.municipalityPermissionMatrix().find((p: any) => (p.permissionCode || p.code) === code); return policy != null && policy.canUse === true && policy.canDelegate === true; }
  togglePerm(id: string) { this.selectedPerms.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])); }
  private allowedIds(g: { items: any[] }): string[] { return g.items.map((p) => this.getPermId(p)).filter((id) => this.isPermissionAllowed(id)); }
  groupAllowed(g: any) { return this.allowedIds(g).length; }
  groupSelected(g: any) { return this.allowedIds(g).filter((id) => this.selectedPerms().includes(id)).length; }
  groupState(g: any): 'none' | 'some' | 'all' { const total = this.groupAllowed(g); const sel = this.groupSelected(g); return sel === 0 ? 'none' : sel === total ? 'all' : 'some'; }
  toggleGroup(g: any, checked: boolean) { const ids = this.allowedIds(g); this.selectedPerms.update((l) => { const rest = l.filter((x) => !ids.includes(x)); return checked ? [...rest, ...ids] : rest; }); }
  enablePolicy(code: string, ev?: Event) { ev?.preventDefault(); ev?.stopPropagation(); const municipalityId = this.muniId(); if (!municipalityId) return; this.admin.updateMunicipalityPermission(municipalityId, { permissionCode: code, canUse: true, canDelegate: true, }).subscribe({ next: () => { this.municipalityPermissionMatrix.update((list) => { const exists = list.some((p) => (p.permissionCode || p.code) === code); return exists ? list.map((p) => (p.permissionCode || p.code) === code ? { ...p, canUse: true, canDelegate: true } : p) : [...list, { permissionCode: code, canUse: true, canDelegate: true }]; }); this.originalMatrix.set(JSON.parse(JSON.stringify(this.municipalityPermissionMatrix()))); this.successMsg.set(`চালু হয়েছে: ${code}`); }, error: (err) => this.errorMsg.set(this.errText(err, 'Policy চালু করা যায়নি।')), }); }
  blockedCount(): number { return this.permissions().filter((p) => !this.isPermissionAllowed(this.getPermId(p))).length; }
  enableAllBlocked() { const municipalityId = this.muniId(); if (!municipalityId) return; const codes = this.permissions().map((p) => this.getPermId(p)).filter((c) => c && !this.isPermissionAllowed(c)); if (codes.length === 0) return; if (!confirm(`${codes.length} টি permission এই পৌরসভায় চালু করবেন?`)) return; this.saving.set(true); this.errorMsg.set(''); let pending = codes.length; let failed = 0; let firstErr = ''; codes.forEach((code) => { this.admin.updateMunicipalityPermission(municipalityId, { permissionCode: code, canUse: true, canDelegate: true, }).subscribe({ next: () => { if (--pending === 0) this.doneEnableAll(failed, firstErr); }, error: (err) => { failed++; if (!firstErr) firstErr = `${code} -> ${this.errText(err, 'ব্যর্থ')}`; if (--pending === 0) this.doneEnableAll(failed, firstErr); }, }); }); }
  private doneEnableAll(failed: number, firstErr: string) { this.saving.set(false); if (failed > 0) this.errorMsg.set(`${failed} টি চালু করা যায়নি। প্রথম এরর: ${firstErr}`); else this.successMsg.set('সব permission এই পৌরসভায় চালু হয়েছে।'); this.loadMunicipalityPolicies(); }
  selectAllAllowed() { const allowed = this.permissions().map((p) => this.getPermId(p)).filter((id) => this.isPermissionAllowed(id)); if (allowed.length === 0) { this.errorMsg.set('এই পৌরসভায় কোনো permission চালু নেই। আগে "সব বন্ধ permission চালু" চাপুন।'); return; } this.selectedPerms.update((l) => Array.from(new Set([...l, ...allowed]))); }
  savePermissions() { const role = this.selectedRole(); const municipalityId = this.muniId(); if (!role || !municipalityId) return; this.saving.set(true); this.errorMsg.set(''); const blocked = this.isPlatformAdmin ? this.selectedPerms().filter((c) => !this.isPermissionAllowed(c)) : []; const doSave = () => { this.admin.setRolePermissions(role.id || role.roleId, this.selectedPerms(), municipalityId).subscribe({ next: () => { this.saving.set(false); this.originalPerms.set([...this.selectedPerms()]); this.successMsg.set('পারমিশন সংরক্ষিত।'); }, error: (err) => { this.saving.set(false); this.errorMsg.set(this.errText(err, 'পারমিশন সংরক্ষণ ব্যর্থ।')); }, }); }; if (blocked.length === 0) { doSave(); return; } let pending = blocked.length; let failed = false; blocked.forEach((code) => { this.admin.updateMunicipalityPermission(municipalityId, { permissionCode: code, canUse: true, canDelegate: true, }).subscribe({ next: () => { if (--pending === 0 && !failed) { this.loadMunicipalityPolicies(); doSave(); } }, error: (err) => { failed = true; if (--pending === 0) { this.saving.set(false); this.errorMsg.set(this.errText(err, `Policy চালু করা যায়নি: ${code}`)); } }, }); }); }
  onUserSearchChange(value: string) { this.userSearchText = value; this.assignUserId = ''; this.pickedUserLabel = ''; this.userResults.set([]); clearTimeout(this.searchTimer); const q = value.trim(); if (q.length < 2) { this.userSearchLoading.set(false); return; } const municipalityId = this.muniId(); if (!municipalityId) { this.errorMsg.set('প্রথমে পৌরসভা নির্বাচন করুন।'); return; } this.userSearchLoading.set(true); this.searchTimer = setTimeout(() => { this.admin.searchUsers(q, municipalityId).subscribe({ next: (res: any) => { const list = this.toList(res); this.userResults.set(list); this.userSearchLoading.set(false); if (list.length === 0) this.errorMsg.set('এই পৌরসভায় কোনো ইউজার পাওয়া যায়নি।'); }, error: (err) => { this.userSearchLoading.set(false); this.errorMsg.set(err?.error?.message || 'ইউজার খোঁজা যায়নি।'); }, }); }, 350); }
  pickUser(u: any) { this.assignUserId = String(u.id || u.userId); this.pickedUserLabel = this.getUserLabel(u); this.userResults.set([]); this.userSearchText = this.pickedUserLabel; }
  getUserLabel(user: any): string { return user.nameBn || user.nameEn || user.fullName || user.name || 'নাম নেই'; }
  assign() { const municipalityId = this.selectedMunicipalityId(); if (!municipalityId || !this.assignUserId || !this.assignRoleId) { this.errorMsg.set('ইউজার ও রোল নির্বাচন করুন।'); return; } this.saving.set(true); this.admin.assignRole({ userId: this.assignUserId, roleId: this.assignRoleId, municipalityId, }).subscribe({ next: () => { this.saving.set(false); this.successMsg.set(`"${this.pickedUserLabel}"-কে রোল অ্যাসাইন হয়েছে।`); this.resetAssign(); }, error: (err) => { this.saving.set(false); this.errorMsg.set(err?.error?.message || 'রোল অ্যাসাইন ব্যর্থ।'); }, }); }
  private resetAssign() { this.assignUserId = ''; this.assignRoleId = ''; this.pickedUserLabel = ''; this.userSearchText = ''; this.userResults.set([]); }
  loadMunicipalityPolicies() { if (!this.isPlatformAdmin) { return; } const municipalityId = this.muniId(); if (!municipalityId) { this.municipalityPermissionMatrix.set([]); return; } this.policyLoading.set(true); this.admin.getMunicipalityPermissionMatrix(municipalityId).subscribe({ next: (res: any) => { const list = this.toList(res); this.municipalityPermissionMatrix.set(list); this.originalMatrix.set(JSON.parse(JSON.stringify(list))); this.policyLoading.set(false); }, error: (err) => { this.policyLoading.set(false); this.errorMsg.set(err?.error?.message || 'Permission নীতি লোড করা যায়নি।'); }, }); }
  isDirty(p: any): boolean { const code = p.permissionCode || p.code; const o = this.originalMatrix().find((x: any) => (x.permissionCode || x.code) === code); return !o || o.canUse !== p.canUse || o.canDelegate !== p.canDelegate; }
  updatePolicyValue(code: string, field: 'canUse' | 'canDelegate', value: boolean) { this.municipalityPermissionMatrix.update((list) => list.map((p) => { if ((p.permissionCode || p.code) !== code) return p; if (field === 'canUse' && !value) return { ...p, canUse: false, canDelegate: false }; if (field === 'canDelegate' && value && p.canUse !== true) return p; return { ...p, [field]: value }; })); }
  saveAllPolicies() { const municipalityId = this.muniId(); const dirty = this.municipalityPermissionMatrix().filter((p) => this.isDirty(p)); if (!municipalityId || dirty.length === 0) return; this.policySaving.set(true); let pending = dirty.length; let failed = 0; dirty.forEach((p) => { this.admin.updateMunicipalityPermission(municipalityId, { permissionCode: p.permissionCode || p.code, canUse: p.canUse === true, canDelegate: p.canDelegate === true, }).subscribe({ next: () => this.donePolicy(--pending, failed), error: () => { failed++; this.donePolicy(--pending, failed); }, }); }); }
  private donePolicy(pending: number, failed: number) { if (pending > 0) return; this.policySaving.set(false); if (failed > 0) this.errorMsg.set(`${failed} টি policy সংরক্ষণ ব্যর্থ হয়েছে।`); else this.successMsg.set('সব Permission নীতি সংরক্ষিত।'); this.loadMunicipalityPolicies(); }
}
