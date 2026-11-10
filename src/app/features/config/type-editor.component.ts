// B-02 : কমিটির ধরনের নিয়মমালা তৈরি/সম্পাদনা (খসড়া)  +  B-03 : যাচাই করে চালু করা
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';          
import { ConfigAdminService } from '../../core/services/config-admin.service';
import {
  Designation, DynamicField, RuleKey, RuleSetting, ScopeLevel, TypeVersion,
} from '../../core/models/config-admin.model';
import { CONFIG_STYLES, RULE_DEFS, STATUS_LABEL, errMsg, levelsFromTree, versionsOf } from './config-shared';
import { DynamicFieldEditorComponent } from './dynamic-field-editor.component';

type EditorTab = 'basic' | 'designations' | 'rules' | 'fields' | 'publish';

@Component({
  selector: 'app-type-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DynamicFieldEditorComponent],
  styles: [
    `
      .page-container {
        padding: 24px;
        background: #f8fafc;
        min-height: 100vh;
        font-family: 'Inter', sans-serif;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
      }
      .page-header h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 8px 0 0 0;
      }
      .muted {
        color: #64748b;
        font-size: 0.9rem;
        text-decoration: none;
      }
      .muted:hover {
        color: #0284c7;
      }
      .st {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-left: 8px;
        display: inline-block;
      }
      .st-DRAFT { background: #fef3c7; color: #d97706; }
      .st-PUBLISHED { background: #dcfce7; color: #16a34a; }
      
      .alert {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.92rem;
      }
      .alert-err { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
      .alert-ok { background: #dcfce7; color: #166534; border: 1px solid #4ade80; }
      .alert-info { background: #e0f2fe; color: #0369a1; border: 1px solid #38bdf8; }
      .alert-warn { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }

      .empty {
        text-align: center;
        padding: 32px;
        color: #64748b;
        font-style: italic;
      }

      .tabs-row {
        display: flex;
        gap: 8px;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 24px;
        overflow-x: auto;
      }
      .tab-btn {
        background: transparent;
        border: none;
        padding: 12px 18px;
        font-size: 0.95rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all 0.2s ease;
      }
      .tab-btn:hover {
        color: #0f172a;
      }
      .tab-btn.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
      }

      .card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        margin-bottom: 20px;
        border: 1px solid #e2e8f0;
      }
      .card-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      .card-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
      }
      .card-body {
        padding: 20px;
      }

      .grid2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }
      .form-group {
        margin-bottom: 16px;
      }
      .form-group label {
        display: block;
        font-weight: 500;
        font-size: 0.88rem;
        color: #334155;
        margin-bottom: 6px;
      }
      .form-control {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.95rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .form-control:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      }
      .form-control.mini {
        width: 90px;
        padding: 6px 10px;
      }

      .section-title {
        font-weight: 600;
        color: #1e293b;
        margin: 20px 0 12px 0;
        font-size: 1rem;
      }
      .row-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      .check {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.92rem;
        color: #334155;
        cursor: pointer;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.92rem;
      }
      .data-table th, .data-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #e2e8f0;
      }
      .data-table th {
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
      }
      .data-table tr:hover td {
        background: #f8fafc;
      }

      .btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.92rem;
        cursor: pointer;
        border: none;
        transition: background 0.2s;
      }
      .btn-primary {
        background: #2563eb;
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-ghost {
        background: transparent;
        color: #2563eb;
        border: 1px solid #cbd5e1;
        padding: 8px 14px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-ghost:hover:not(:disabled) {
        background: #eff6ff;
        border-color: #2563eb;
      }
      .btn-sm {
        padding: 4px 10px;
        font-size: 0.82rem;
      }
      .toolbar {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .mb-2 { margin-bottom: 16px; }
      ${CONFIG_STYLES}
    `,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <a routerLink="/config/types" class="muted">← কমিটির ধরনের তালিকা</a>
          <h1>
            {{ currentTypeName() || 'কমিটির ধরন' }}
            @if (currentVersion(); as ver) {
              <span class="muted"> — নিয়মমালা@if (ver.status !== 'DRAFT') { {{ ver.versionNo }} }</span>
              <span [class]="'st st-' + ver.status">{{ statusLabels[ver.status] }}</span>
            }
          </h1>
        </div>
        @if (currentVersion() && !isReadonly()) {
          <button class="btn btn-primary" [disabled]="isBusy()" (click)="saveVersion()">{{ isBusy() ? 'অপেক্ষা করুন...' : 'সংরক্ষণ করুন (অসম্পূর্ণ থাকবে)' }}</button>
        }
      </div>

      @if (errorMessage()) { <div class="alert alert-err">{{ errorMessage() }}</div> }
      @if (successMessage()) { <div class="alert alert-ok">{{ successMessage() }}</div> }

      @if (isLoading()) {
        <div class="empty">লোড হচ্ছে...</div>
      }

      @if (currentVersion(); as ver) {

        @if (isReadonly()) {
          <div class="alert alert-warn">
            এই নিয়মমালা {{ statusLabels[ver.status] }}, তাই শুধু দেখা যাবে। বদলাতে চাইলে তালিকা থেকে "নিয়ম পরিবর্তন করুন" চাপুন।
          </div>
        } @else {
          <div class="alert alert-info">
            এই নিয়মগুলো চালু করার আগে যত খুশি বদলাতে পারবেন। চালু করার পর বদলানো যাবে না, নতুন নিয়মমালা বানাতে হবে।
          </div>
        }

        <div class="tabs-row">
          @for (t of tabs; track t.id) {
            <button class="tab-btn" [class.active]="activeTab() === t.id" (click)="activeTab.set(t.id)">{{ t.label }}</button>
          }
        </div>

        @switch (activeTab()) {

          @case ('basic') {
            <div class="card"><div class="card-body">
              <div class="grid2">
                <div class="form-group">
                  <label>মোট সদস্যের সর্বোচ্চ সীমা</label>
                  <input type="number" min="1" class="form-control" [(ngModel)]="ver.maxMembers" [disabled]="isReadonly()" />
                </div>
                <div class="form-group">
                  <label>মেয়াদ (মাস)</label>
                  <input type="number" min="1" class="form-control" [(ngModel)]="ver.termMonths" [disabled]="isReadonly()" />
                </div>
              </div>
              <div class="section-title">কোন কার্যপরিধির স্তরে এই ধরনের কমিটি গঠন করা যাবে</div>
              @if (!scopeLevels().length) {
                <div class="muted">কোনো স্তর পাওয়া যায়নি। আগে "কার্যপরিধি" পাতায় স্তর ও node তৈরি করুন।</div>
              }
              <div class="row-actions">
                @for (l of scopeLevels(); track l.levelNo) {
                  <label class="check">
                    <input type="checkbox" [checked]="ver.scopeLevelNos.includes(l.levelNo)" [disabled]="isReadonly()" (change)="toggleScopeLevel(ver, l.levelNo)" />
                    {{ l.nameBn }}
                  </label>
                }
              </div>
            </div></div>
          }

          @case ('designations') {
            <div class="card"><div class="card-body">
              <div class="alert alert-info">
                প্রতিটি পদবীর জন্য সর্বনিম্ন ও সর্বোচ্চ সংখ্যা দিন। "বাধ্যতামূলক" মানে সেই পদ খালি রেখে কমিটি জমা দেওয়া যাবে না।
              </div>
              <table class="data-table">
                <thead><tr><th>পদবী</th><th>সর্বনিম্ন</th><th>সর্বোচ্চ</th><th>বাধ্যতামূলক</th><th></th></tr></thead>
                <tbody>
                  @for (d of ver.designations; track d.designationId; let i = $index) {
                    <tr>
                      <td>{{ getDesignationName(d.designationId) }}</td>
                      <td><input type="number" min="0" class="form-control mini" [(ngModel)]="d.minCount" [disabled]="isReadonly()" /></td>
                      <td><input type="number" min="1" class="form-control mini" [(ngModel)]="d.maxCount" [disabled]="isReadonly()" placeholder="সীমাহীন" /></td>
                      <td><input type="checkbox" [(ngModel)]="d.mandatory" [disabled]="isReadonly()" /></td>
                      <td>@if (!isReadonly()) { <button class="btn-ghost btn-sm" (click)="removeDesignation(i)">সরান</button> }</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="empty">এখনো কোনো পদবী যোগ হয়নি।</td></tr>
                  }
                </tbody>
              </table>
              @if (ver.maxMembers && calculateMinTotal() > ver.maxMembers) {
                <div class="alert alert-warn" style="margin-top:10px">
                  পদবীগুলোর সর্বনিম্ন সংখ্যার যোগফল ({{ calculateMinTotal() }}) মোট সীমার ({{ ver.maxMembers }}) চেয়ে বেশি।
                </div>
              }
              @if (!isReadonly()) {
                <div class="toolbar" style="margin-top:12px">
                  <select class="form-control" style="max-width:280px" [(ngModel)]="newDesignationId">
                    <option value="">— পদবী বাছাই করুন —</option>
                    @for (d of availableDesignations(); track d.id) { <option [value]="d.id">{{ d.nameBn }} ({{ d.code }})</option> }
                  </select>
                  <button class="btn-ghost" [disabled]="!newDesignationId" (click)="addDesignation()">+ যোগ করুন</button>
                </div>
              }
            </div></div>
          }

          @case ('rules') {
            <div class="card"><div class="card-body table-wrapper">
              <div class="alert alert-info">
                প্রতিটি কাজের জন্য ঠিক করুন প্রস্তাব (resolution) লাগবে কি না এবং অনুমোদন লাগলে কোন রুটে যাবে।
                রুট না থাকলে আগে "অনুমোদন রুট" পাতায় তৈরি করুন।
              </div>
              <table class="data-table">
                <thead><tr><th>কাজ</th><th>প্রস্তাব বাধ্যতামূলক</th><th>অনুমোদন লাগবে</th><th>অনুমোদন রুট</th></tr></thead>
                <tbody>
                  @for (r of ruleDefinitions; track r.key) {
                    <tr>
                      <td><strong>{{ r.label }}</strong><div class="muted">{{ r.hint }}</div></td>
                      <td><input type="checkbox" [(ngModel)]="ver.rules[r.key].resolutionRequired" [disabled]="isReadonly()" /></td>
                      <td><input type="checkbox" [(ngModel)]="ver.rules[r.key].approvalRequired" [disabled]="isReadonly()" (ngModelChange)="handleApprovalToggle(ver.rules[r.key])" /></td>
                      <td>
                       <select
  class="form-control"
  [(ngModel)]="ver.rules[r.key].approvalRouteId"
  [disabled]="isReadonly() || !ver.rules[r.key].approvalRequired">

  <option [ngValue]="null">— রুট বাছাই করুন —</option>

  @for (rt of approvalRoutes(); track rt.id) {
    <option [ngValue]="rt.id">
      {{ rt.code }} - {{ rt.nameBn }}
    </option>
  }
</select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div></div>
          }

          @case ('fields') {
            <app-dynamic-field-editor [fields]="ver.fields" (fieldsChange)="ver.fields = $event" [readonly]="isReadonly()" />
          }

          @case ('publish') {
            <div class="card mb-2"><div class="card-header"><h3>ধাপ ১ — যাচাই</h3></div>
              <div class="card-body">
                @if (isReadonly()) {
                  <div class="muted">এই নিয়মমালা ইতিমধ্যে {{ statusLabels[ver.status] }}।</div>
                } @else {
                  <p class="muted">যাচাইয়ের আগে নিয়মগুলো নিজে থেকে সংরক্ষণ হবে।</p>
                  <button class="btn btn-primary" [disabled]="isBusy()" (click)="validateVersion()">{{ isBusy() ? 'যাচাই চলছে...' : 'নিয়মমালা যাচাই করুন' }}</button>
                  @if (validationErrors(); as errs) {
                    @if (errs.length === 0) {
                      <div class="alert alert-ok" style="margin-top:12px">কোনো ত্রুটি নেই। চালু করার জন্য প্রস্তুত।</div>
                    } @else {
                      <div class="alert alert-err" style="margin-top:12px">
                        {{ errs.length }}টি ত্রুটি ঠিক করুন:
                        <ul>@for (e of errs; track $index) { <li>{{ e }}</li> }</ul>
                      </div>
                    }
                  }
                }
              </div>
            </div>

            <div class="card mb-2"><div class="card-header"><h3>আগের নিয়মমালার সাথে তুলনা</h3></div>
              <div class="card-body">
                @if (!otherVersions().length) {
                  <div class="muted">তুলনা করার মতো অন্য নিয়মমালা নেই।</div>
                } @else {
                  <div class="toolbar">
                    <select class="form-control" style="max-width:240px" [(ngModel)]="compareVersionId" (ngModelChange)="compareVersions()">
                      <option value="">— নিয়মমালা বাছাই করুন —</option>
                      @for (o of otherVersions(); track o.id) { <option [value]="o.id">নিয়মমালা {{ o.versionNo }} ({{ statusLabels[o.status] }})</option> }
                    </select>
                  </div>
                  @if (compareVersionId) {
                    @if (!versionDiff().length) { <div class="muted">কোনো পার্থক্য নেই।</div> }
                    @else {
                      <table class="data-table">
                        <thead><tr><th>অংশ</th><th>বাছাই করা নিয়মমালা</th><th>এই নিয়মমালা</th></tr></thead>
                        <tbody>@for (r of versionDiff(); track r.key) { <tr><td>{{ r.key }}</td><td>{{ r.a }}</td><td>{{ r.b }}</td></tr> }</tbody>
                      </table>
                    }
                  }
                }
              </div>
            </div>

            @if (!isReadonly()) {
              <div class="card"><div class="card-header"><h3>ধাপ ২ — চালু করা</h3></div>
                <div class="card-body">
                  <div class="alert alert-warn">চালু করার পর এই নিয়মমালা আর বদলানো যাবে না। পরিবর্তনের জন্য নতুন নিয়মমালা তৈরি করতে হবে।</div>
                  <label class="check" style="margin-bottom:12px">
                    <input type="checkbox" [(ngModel)]="confirmPublish" /> আমি বুঝেছি যে চালু করার পর এটি অপরিবর্তনীয়
                  </label>
                  <button class="btn btn-primary" [disabled]="isBusy() || !confirmPublish || validationErrors()?.length !== 0" (click)="publishVersion()">
                    নিয়মমালা চালু করুন
                  </button>
                  @if (validationErrors() === null) { <div class="muted" style="margin-top:8px">চালু করার আগে ধাপ ১-এর যাচাই সম্পন্ন করুন।</div> }
                </div>
              </div>
            }
          }
        }
      }
    </div>
  `,
})
export class TypeEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private adminService = inject(ConfigAdminService);
  private configService = inject(ConfigService);

  tabs: { id: EditorTab; label: string }[] = [
    { id: 'basic', label: '১. সাধারণ তথ্য' }, 
    { id: 'designations', label: '২. পদবী ও সদস্য সংখ্যা' },
    { id: 'rules', label: '৩. কাজের শর্ত ও অনুমোদন' }, 
    { id: 'fields', label: '৪. বাড়তি তথ্যের ঘর' },
    { id: 'publish', label: '৫. যাচাই করে চালু করুন' },
  ];
  
  ruleDefinitions = RULE_DEFS;
  statusLabels = STATUS_LABEL;

  typeId = ''; 
  versionId = '';
  activeTab = signal<EditorTab>('basic');
  currentVersion = signal<TypeVersion | null>(null);
  currentTypeName = signal('');
  isLoading = signal(true);
  isBusy = signal(false);
  errorMessage = signal(''); 
  successMessage = signal('');
  designationsList = signal<Designation[]>([]);
  approvalRoutes = signal<any[]>([]);
  scopeLevels = signal<ScopeLevel[]>([]);
  validationErrors = signal<string[] | null>(null);
  otherVersions = signal<{ id: string; versionNo: number; status: any }[]>([]);
  versionDiff = signal<{ key: string; a: string; b: string }[]>([]);
  
 isReadonly = computed(
  () => this.currentVersion()?.status !== 'DRAFT'
);

/**
 * শুধু DRAFT Version-এ পরিবর্তন করা যাবে।
 * Published / Retired Version-এর সব write action বন্ধ থাকবে।
 */
private ensureDraft(): boolean {
  const ver = this.currentVersion();

  if (!ver || ver.status !== 'DRAFT') {
    this.errorMessage.set(
      'এই নিয়মমালা খসড়া নয়। Published বা Retired নিয়মমালা পরিবর্তন করা যাবে না।'
    );
    return false;
  }

  return true;
}

  newDesignationId = ''; 
  compareVersionId = ''; 
  confirmPublish = false;

  ngOnInit() {
    this.typeId = this.route.snapshot.paramMap.get('typeId') ?? '';
    this.versionId = this.route.snapshot.paramMap.get('versionId') ?? '';
    
    forkJoin({
      ver: this.adminService.getVersion(this.versionId),
      desigs: this.configService.listDesignations().pipe(catchError(() => of([] as Designation[]))),
      routes: this.adminService.listRoutes().pipe(catchError(() => of([]))),
      tree: this.adminService.scopeTree().pipe(catchError(() => of([]))),
      types: this.adminService.listTypes(true).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ ver, desigs, routes, tree, types }) => {
        this.currentVersion.set(this.normalizeVersionData(ver));
        this.designationsList.set(desigs as Designation[]);
       this.approvalRoutes.set(
  (routes ?? []).map((rt: any) => ({
    ...rt,
    id: String(rt.id),
    code: rt.code ?? '',
    nameBn: rt.nameBn ?? rt.name ?? rt.nameEn ?? ''
  }))
);
        this.scopeLevels.set(levelsFromTree(tree));
        
        const matchedType = types.find(x => x.id === this.typeId);
        this.otherVersions.set(matchedType ? versionsOf(matchedType).filter(x => x.id !== this.versionId) : []);
        
        const typeAny = matchedType as any;
        this.currentTypeName.set(typeAny?.nameBn ?? typeAny?.name ?? typeAny?.nameEn ?? '');
        this.isLoading.set(false);
      },
      error: (e) => { 
        this.errorMessage.set(errMsg(e)); 
        this.isLoading.set(false); 
      },
    });
  }


private normalizeVersionData(raw: Record<string, any>): TypeVersion {
  const settings = raw['settings'] ?? {};
  const composition = raw['composition'] ?? {};

  const actionKeyMap: Record<string, RuleKey> = {
    FORMATION: 'FORMATION',
    ADD: 'ADD_MEMBER',
    GO_BACK: 'GO_BACK_MEMBER',
    REJECT: 'REJECT_MEMBER',
    RENEW: 'RENEW_TERM',
    DISSOLVE: 'DISSOLVE'
  };

  const actionRules = Array.isArray(raw['actionRules'])
    ? raw['actionRules']
    : [];

  const rules = {} as Record<RuleKey, RuleSetting>;

  for (const def of RULE_DEFS) {
    const backendCode = Object.keys(actionKeyMap)
      .find(code => actionKeyMap[code] === def.key);

    const backendRule = actionRules.find(
      (r: any) => r.actionCode === backendCode
    );

    rules[def.key] = {
      resolutionRequired: backendRule?.resolutionRule === 'REQUIRED',
      approvalRequired: backendRule?.approvalRequired === true,
      approvalRouteId: backendRule?.approvalRouteId ?? null
    };
  }

  const designations = Array.isArray(raw['designations'])
    ? raw['designations'].map((d: any) => ({
        designationId: String(
          d.designationLookupId ?? d.designationId ?? ''
        ),
        minCount: Number(d.minCount ?? 0),
        maxCount: Number(d.maxCount ?? 1),
        mandatory: d.isMandatory ?? d.mandatory ?? false
      }))
    : [];

  return {
    id: raw['id'] ?? this.versionId,
    typeId: raw['committeeTypeId'] ?? raw['typeId'] ?? this.typeId,
    versionNo: raw['versionNo'] ?? 1,
    status: raw['status'] ?? 'DRAFT',

    nameBn: raw['nameBn'] ?? '',
    nameEn: raw['nameEn'] ?? '',

    minMembers: Number(
      composition['minMembers'] ?? raw['minMembers'] ?? 1
    ),

    maxMembers: Number(
      composition['maxMembers'] ?? raw['maxMembers'] ?? 10
    ),

    termMonths: settings['termMonths'] ?? null,

    scopeLevelNos: Array.isArray(settings['scopeLevelNos'])
      ? settings['scopeLevelNos']
      : [],

    designations,
    rules,

    fields: Array.isArray(settings['fields'])
      ? settings['fields']
      : []
  };
}



  private buildPayload(ver: TypeVersion) {
    console.log('BUILD PAYLOAD INPUT:', ver.rules.FORMATION);

    return {
      settings: {
        termMonths: ver.termMonths,
        scopeLevelNos: ver.scopeLevelNos,
        fields: ver.fields
      },
      designations: ver.designations.map((d, index) => ({
        designationLookupId: Number(d.designationId),
        sortOrder: index,
        isMandatory: d.mandatory,
        isSingleHolder: false,
        minCount: d.minCount,
        maxCount: d.maxCount
      })),
      actionRules: Object.entries(ver.rules).map(([key, rule]) => {
        console.log(
  'ACTION RULES OUTPUT:',
  Object.entries(ver.rules).map(([key, rule]) => ({
    key,
    resolutionRequired: rule.resolutionRequired,
    resolutionRule: rule.resolutionRequired ? 'REQUIRED' : 'NONE'
  }))
);
        const actionCodeMap: Record<string, string> = {
          FORMATION: 'FORMATION',
          ADD_MEMBER: 'ADD',
          GO_BACK_MEMBER: 'GO_BACK',
          REJECT_MEMBER: 'REJECT',
          RENEW_TERM: 'RENEW',
          DISSOLVE: 'DISSOLVE'
        };

        return {
          actionCode: actionCodeMap[key],
          resolutionRule: rule.resolutionRequired ? 'REQUIRED' : 'NONE',
          approvalRequired: rule.approvalRequired,
          approvalRouteId: rule.approvalRouteId || null
        };
      }),
  composition: {
  minMembers: Number(ver.minMembers ?? this.calculateMinTotal() ?? 1),
  maxMembers: Number(ver.maxMembers ?? 10)
}
    };
  }

  getDesignationName = (id: string) => this.designationsList().find(d => d.id === id)?.nameBn ?? id;
  
  availableDesignations = computed(() => {
    const used = new Set((this.currentVersion()?.designations ?? []).map(d => d.designationId));
    return this.designationsList().filter(d => d.isActive && !used.has(d.id));
  });

  calculateMinTotal = () => (this.currentVersion()?.designations ?? []).reduce((sum, d) => sum + (+d.minCount || 0), 0);

 
addDesignation() {
  if (!this.ensureDraft()) return;

  const ver = this.currentVersion();

  if (!ver || !this.newDesignationId) return;

  ver.designations = [
    ...ver.designations,
    {
      designationId: this.newDesignationId,
      minCount: 1,
      maxCount: 1,
      mandatory: false
    }
  ];

  this.newDesignationId = '';

  this.currentVersion.set({ ...ver });
  this.validationErrors.set(null);
}


 removeDesignation(index: number) {
  if (!this.ensureDraft()) return;

  const ver = this.currentVersion();
  if (!ver) return;

  ver.designations = ver.designations.filter(
    (_, idx) => idx !== index
  );

  this.currentVersion.set({ ...ver });
  this.validationErrors.set(null);
}

 toggleScopeLevel(ver: TypeVersion, levelNo: number) {
  if (!this.ensureDraft()) return;

  const current = this.currentVersion();
  if (!current) return;

  const updatedLevels = current.scopeLevelNos.includes(levelNo)
    ? current.scopeLevelNos.filter(n => n !== levelNo)
    : [...current.scopeLevelNos, levelNo];

  this.currentVersion.set({
    ...current,
    scopeLevelNos: updatedLevels
  });

  this.validationErrors.set(null);
}
 handleApprovalToggle(rule: RuleSetting) {
  if (!this.ensureDraft()) return;

  if (!rule.approvalRequired) {
    rule.approvalRouteId = null;
  }

  this.validationErrors.set(null);
}
 saveVersion() {
  console.log(
  'FORMATION RULE BEFORE SAVE:',
  this.currentVersion()?.rules?.FORMATION
);
  if (!this.ensureDraft() || this.isBusy()) return;

  const ver = this.currentVersion();
  if (!ver) return;

  this.isBusy.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');
  this.validationErrors.set(null);

  this.adminService.updateVersion(
    this.versionId,
    this.buildPayload(ver)
  ).subscribe({
    next: () => {
      this.isBusy.set(false);
      this.successMessage.set(
        'নিয়মমালা অসম্পূর্ণ (খসড়া) হিসেবে সংরক্ষিত হয়েছে।'
      );
    },
    error: (e) => {
      this.isBusy.set(false);
      this.errorMessage.set(errMsg(e));
    }
  });
}

 validateVersion() {
  if (!this.ensureDraft() || this.isBusy()) return;

  const ver = this.currentVersion();
  if (!ver) return;

  this.isBusy.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');

  this.adminService.updateVersion(
    this.versionId,
    this.buildPayload(ver)
  ).pipe(
    switchMap(() =>
      this.adminService.validateVersion(this.versionId)
    )
  ).subscribe({
    next: (errs) => {
      this.isBusy.set(false);
      this.validationErrors.set(errs ?? []);
    },
    error: (e) => {
      this.isBusy.set(false);
      this.errorMessage.set(errMsg(e));
    }
  });
}

publishVersion() {
  if (!this.ensureDraft() || this.isBusy()) return;

  const ver = this.currentVersion();

  if (
    !ver ||
    this.validationErrors()?.length !== 0 ||
    !this.confirmPublish
  ) {
    return;
  }

  this.isBusy.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');

  this.adminService.publishVersion(this.versionId).pipe(
    switchMap(() =>
      this.adminService.getVersion(this.versionId)
    )
  ).subscribe({
    next: (raw) => {
      this.currentVersion.set(
        this.normalizeVersionData(raw)
      );

      this.isBusy.set(false);
      this.confirmPublish = false;
      this.validationErrors.set(null);
      this.versionDiff.set([]);

      this.successMessage.set(
        'নিয়মমালাটি চালু হয়েছে। এখন থেকে এটি আর বদলানো যাবে না।'
      );
    },
    error: (e) => {
      this.isBusy.set(false);
      this.errorMessage.set(errMsg(e));
    }
  });
}
  compareVersions() {
    if (!this.compareVersionId) { 
      this.versionDiff.set([]); 
      return; 
    }
    
    this.adminService.getVersion(this.compareVersionId).subscribe({
      next: (raw) => {
        const a = this.flattenObject(this.buildPayload(this.normalizeVersionData(raw)));
        const b = this.flattenObject(this.buildPayload(this.currentVersion()!));
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
        
        this.versionDiff.set(
          keys.filter(k => a[k] !== b[k]).map(k => ({ key: k, a: a[k] ?? '—', b: b[k] ?? '—' }))
        );
      },
      error: (e) => this.errorMessage.set(errMsg(e)),
    });
  }

  private flattenObject(obj: any, prefix = '', output: Record<string, string> = {}): Record<string, string> {
    if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([k, val]) => 
        this.flattenObject(val, prefix ? `${prefix}.${k}` : k, output)
      );
    } else {
      output[prefix] = String(obj);
    }
    return output;
  }
}