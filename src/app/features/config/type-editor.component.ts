// B-02 : কমিটির ধরন তৈরি/সম্পাদনা (DRAFT সংস্করণ)  +  B-03 : যাচাই ও প্রকাশ
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';           // আপনার আগের service (পদবী)
import { ConfigAdminService } from '../../core/services/config-admin.service';
import {
  Designation, DynamicField, RuleKey, RuleSetting, ScopeLevel, TypeVersion,
} from '../../core/models/config-admin.model';
import { CONFIG_STYLES, RULE_DEFS, STATUS_LABEL, errMsg, levelsFromTree, versionsOf } from './config-shared';
import { DynamicFieldEditorComponent } from './dynamic-field-editor.component';

type Tab = 'basic' | 'desig' | 'rules' | 'fields' | 'publish';

@Component({
  selector: 'app-type-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DynamicFieldEditorComponent],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <a routerLink="/config/types" class="muted">← কমিটির ধরনের তালিকা</a>
          <h1>
            {{ v()?.nameBn || 'কমিটির ধরন' }}
            @if (v(); as ver) { <span class="muted"> — সংস্করণ {{ ver.versionNo }}</span>
              <span [class]="'st st-' + ver.status">{{ label[ver.status] }}</span> }
          </h1>
        </div>
        @if (v() && !readonly()) {
          <button class="btn btn-primary" [disabled]="busy()" (click)="save()">{{ busy() ? 'অপেক্ষা করুন...' : 'খসড়া সংরক্ষণ' }}</button>
        }
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      @if (loading()) {
        <div class="empty">লোড হচ্ছে...</div>
      }

      @if (v(); as ver) {

        @if (readonly()) {
          <div class="alert alert-warn">
            এই সংস্করণ {{ label[ver.status] }}, তাই শুধু দেখা যাবে। বদলাতে চাইলে তালিকা থেকে "+ নতুন সংস্করণ" তৈরি করুন।
          </div>
        }

        <div class="tabs-row">
          @for (t of tabs; track t.id) {
            <button class="tab-btn" [class.active]="tab() === t.id" (click)="tab.set(t.id)">{{ t.label }}</button>
          }
        </div>

        @switch (tab()) {

          @case ('basic') {
            <div class="card"><div class="card-body">
              <div class="grid2">
                <div class="form-group">
                  <label>নাম (বাংলা) <span class="required">*</span></label>
                  <input class="form-control" [(ngModel)]="ver.nameBn" [disabled]="readonly()" />
                </div>
                <div class="form-group">
                  <label>Name (English)</label>
                  <input class="form-control" [(ngModel)]="ver.nameEn" [disabled]="readonly()" />
                </div>
                <div class="form-group">
                  <label>মোট সদস্যের সর্বোচ্চ সীমা</label>
                  <input type="number" min="1" class="form-control" [(ngModel)]="ver.maxMembers" [disabled]="readonly()" />
                </div>
                <div class="form-group">
                  <label>মেয়াদ (মাস)</label>
                  <input type="number" min="1" class="form-control" [(ngModel)]="ver.termMonths" [disabled]="readonly()" />
                </div>
              </div>
              <div class="section-title">কোন কার্যপরিধির স্তরে এই ধরনের কমিটি গঠন করা যাবে</div>
              @if (!levels().length) {
                <div class="muted">কোনো স্তর পাওয়া যায়নি। আগে "কার্যপরিধি" পাতায় স্তর ও node তৈরি করুন।</div>
              }
              <div class="row-actions">
                @for (l of levels(); track l.levelNo) {
                  <label class="check">
                    <input type="checkbox" [checked]="ver.scopeLevelNos.includes(l.levelNo)" [disabled]="readonly()" (change)="toggleLevel(ver, l.levelNo)" />
                    {{ l.nameBn }}
                  </label>
                }
              </div>
            </div></div>
          }

          @case ('desig') {
            <div class="card"><div class="card-body">
              <div class="alert alert-info">
                প্রতিটি পদবীর জন্য সর্বনিম্ন ও সর্বোচ্চ সংখ্যা দিন। "বাধ্যতামূলক" মানে সেই পদ খালি রেখে কমিটি জমা দেওয়া যাবে না।
              </div>
              <table class="data-table">
                <thead><tr><th>পদবী</th><th>সর্বনিম্ন</th><th>সর্বোচ্চ</th><th>বাধ্যতামূলক</th><th></th></tr></thead>
                <tbody>
                  @for (d of ver.designations; track d.designationId; let i = $index) {
                    <tr>
                      <td>{{ desigName(d.designationId) }}</td>
                      <td><input type="number" min="0" class="form-control mini" [(ngModel)]="d.minCount" [disabled]="readonly()" /></td>
                      <td><input type="number" min="1" class="form-control mini" [(ngModel)]="d.maxCount" [disabled]="readonly()" placeholder="সীমাহীন" /></td>
                      <td><input type="checkbox" [(ngModel)]="d.mandatory" [disabled]="readonly()" /></td>
                      <td>@if (!readonly()) { <button class="btn-ghost btn-sm" (click)="removeDesig(i)">সরান</button> }</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="empty">এখনো কোনো পদবী যোগ হয়নি।</td></tr>
                  }
                </tbody>
              </table>
              @if (ver.maxMembers && minTotal() > ver.maxMembers) {
                <div class="alert alert-warn" style="margin-top:10px">
                  পদবীগুলোর সর্বনিম্ন সংখ্যার যোগফল ({{ minTotal() }}) মোট সীমার ({{ ver.maxMembers }}) চেয়ে বেশি।
                </div>
              }
              @if (!readonly()) {
                <div class="toolbar" style="margin-top:12px">
                  <select class="form-control" style="max-width:280px" [(ngModel)]="newDesigId">
                    <option value="">— পদবী বাছাই করুন —</option>
                    @for (d of availableDesigs(); track d.id) { <option [value]="d.id">{{ d.nameBn }} ({{ d.code }})</option> }
                  </select>
                  <button class="btn-ghost" [disabled]="!newDesigId" (click)="addDesig()">+ যোগ করুন</button>
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
                  @for (r of ruleDefs; track r.key) {
                    <tr>
                      <td><strong>{{ r.label }}</strong><div class="muted">{{ r.hint }}</div></td>
                      <td><input type="checkbox" [(ngModel)]="ver.rules[r.key].resolutionRequired" [disabled]="readonly()" /></td>
                      <td><input type="checkbox" [(ngModel)]="ver.rules[r.key].approvalRequired" [disabled]="readonly()" (ngModelChange)="onApprovalToggle(ver.rules[r.key])" /></td>
                      <td>
                        <select class="form-control" [(ngModel)]="ver.rules[r.key].approvalRouteId"
                                [disabled]="readonly() || !ver.rules[r.key].approvalRequired">
                          <option [ngValue]="null">— রুট বাছাই করুন —</option>
                          @for (rt of routes(); track rt.id) { <option [ngValue]="rt.id">{{ rt.nameBn || rt.code }}</option> }
                        </select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div></div>
          }

          @case ('fields') {
            <app-dynamic-field-editor [fields]="ver.fields" (fieldsChange)="ver.fields = $event" [readonly]="readonly()" />
          }

          @case ('publish') {
            <div class="card mb-2"><div class="card-header"><h3>ধাপ ১ — যাচাই</h3></div>
              <div class="card-body">
                @if (readonly()) {
                  <div class="muted">এই সংস্করণ ইতিমধ্যে {{ label[ver.status] }}।</div>
                } @else {
                  <p class="muted">যাচাইয়ের আগে খসড়া নিজে থেকে সংরক্ষণ হবে।</p>
                  <button class="btn btn-primary" [disabled]="busy()" (click)="validate()">{{ busy() ? 'যাচাই চলছে...' : 'খসড়া যাচাই করুন' }}</button>
                  @if (validation(); as errs) {
                    @if (errs.length === 0) {
                      <div class="alert alert-ok" style="margin-top:12px">কোনো ত্রুটি নেই। প্রকাশ করার জন্য প্রস্তুত।</div>
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

            <div class="card mb-2"><div class="card-header"><h3>আগের সংস্করণের সাথে তুলনা</h3></div>
              <div class="card-body">
                @if (!others().length) {
                  <div class="muted">তুলনা করার মতো অন্য সংস্করণ নেই।</div>
                } @else {
                  <div class="toolbar">
                    <select class="form-control" style="max-width:240px" [(ngModel)]="compareId" (ngModelChange)="compare()">
                      <option value="">— সংস্করণ বাছাই করুন —</option>
                      @for (o of others(); track o.id) { <option [value]="o.id">v{{ o.versionNo }} ({{ label[o.status] }})</option> }
                    </select>
                  </div>
                  @if (compareId) {
                    @if (!diff().length) { <div class="muted">কোনো পার্থক্য নেই।</div> }
                    @else {
                      <table class="data-table">
                        <thead><tr><th>অংশ</th><th>বাছাই করা সংস্করণ</th><th>এই সংস্করণ</th></tr></thead>
                        <tbody>@for (r of diff(); track r.key) { <tr><td>{{ r.key }}</td><td>{{ r.a }}</td><td>{{ r.b }}</td></tr> }</tbody>
                      </table>
                    }
                  }
                }
              </div>
            </div>

            @if (!readonly()) {
              <div class="card"><div class="card-header"><h3>ধাপ ২ — প্রকাশ</h3></div>
                <div class="card-body">
                  <div class="alert alert-warn">প্রকাশের পর এই সংস্করণ আর বদলানো যাবে না। পরিবর্তনের জন্য নতুন সংস্করণ তৈরি করতে হবে।</div>
                  <label class="check" style="margin-bottom:12px">
                    <input type="checkbox" [(ngModel)]="confirmPublish" /> আমি বুঝেছি যে প্রকাশের পর এটি অপরিবর্তনীয়
                  </label>
                  <button class="btn btn-primary" [disabled]="busy() || !confirmPublish || validation()?.length !== 0" (click)="publish()">
                    সংস্করণ {{ ver.versionNo }} প্রকাশ করুন
                  </button>
                  @if (validation() === null) { <div class="muted" style="margin-top:8px">প্রকাশের আগে ধাপ ১-এর যাচাই সম্পন্ন করুন।</div> }
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
  private svc = inject(ConfigAdminService);
  private cfg = inject(ConfigService);

  tabs: { id: Tab; label: string }[] = [
    { id: 'basic', label: '১. সাধারণ তথ্য' }, { id: 'desig', label: '২. পদবী ও সদস্য সংখ্যা' },
    { id: 'rules', label: '৩. নিয়ম ও অনুমোদন' }, { id: 'fields', label: '৪. বাড়তি field' },
    { id: 'publish', label: '৫. যাচাই ও প্রকাশ' },
  ];
  ruleDefs = RULE_DEFS;
  label = STATUS_LABEL;

  typeId = ''; versionId = '';
  tab = signal<Tab>('basic');
  v = signal<TypeVersion | null>(null);
  loading = signal(true);
  busy = signal(false);
  err = signal(''); msg = signal('');
  designations = signal<Designation[]>([]);
  routes = signal<any[]>([]);
  levels = signal<ScopeLevel[]>([]);
  validation = signal<string[] | null>(null);
  others = signal<{ id: string; versionNo: number; status: any }[]>([]);
  diff = signal<{ key: string; a: string; b: string }[]>([]);
  readonly = computed(() => this.v()?.status !== 'DRAFT');

  newDesigId = ''; compareId = ''; confirmPublish = false;

  ngOnInit() {
    this.typeId = this.route.snapshot.paramMap.get('typeId') ?? '';
    this.versionId = this.route.snapshot.paramMap.get('versionId') ?? '';
    forkJoin({
      ver: this.svc.getVersion(this.versionId),
      desigs: this.cfg.listDesignations().pipe(catchError(() => of([] as Designation[]))),
      routes: this.svc.listRoutes().pipe(catchError(() => of([]))),
      tree: this.svc.scopeTree().pipe(catchError(() => of([]))),
      types: this.svc.listTypes(true).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ ver, desigs, routes, tree, types }) => {
        this.v.set(this.normalize(ver));
        this.designations.set(desigs as Designation[]);
        this.routes.set(routes);
        this.levels.set(levelsFromTree(tree));
        const t = types.find(x => x.id === this.typeId);
        this.others.set(t ? versionsOf(t).filter(x => x.id !== this.versionId) : []);
        this.loading.set(false);
      },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

 private normalize(raw: Record<string, any>): TypeVersion {
  const settings = raw['settings'] ?? {};

  const actionRules = Array.isArray(raw['actionRules'])
    ? raw['actionRules']
    : [];

  const rules = {} as Record<RuleKey, RuleSetting>;

  for (const def of RULE_DEFS) {
    const backendRule = actionRules.find(
      (r: any) => r.actionCode === def.key
    );

    rules[def.key] = {
      resolutionRequired:
        backendRule?.resolutionRule === 'REQUIRED',

      approvalRequired:
        backendRule?.approvalRequired ?? false,

      approvalRouteId:
        backendRule?.approvalRouteId ?? null
    };
  }

  const designations = Array.isArray(raw['designations'])
    ? raw['designations'].map((d: any) => ({
        designationId: String(
          d.designationLookupId ?? d.designationId ?? ''
        ),
        minCount: d.minCount ?? 0,
        maxCount: d.maxCount ?? 1,
        mandatory: d.isMandatory ?? d.mandatory ?? false
      }))
    : [];

  return {
    id: raw['id'] ?? this.versionId,
    typeId: raw['committeeTypeId'] ?? raw['typeId'] ?? this.typeId,
    versionNo: raw['versionNo'] ?? 1,
    status: raw['status'] ?? 'DRAFT',

    nameBn: settings['nameBn'] ?? '',
    nameEn: settings['nameEn'] ?? '',
    maxMembers: raw['composition']?.maxMembers ?? null,
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
private payload(ver: TypeVersion) {
  return {
    settings: {
      nameBn: ver.nameBn,
      nameEn: ver.nameEn,
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
      minMembers: this.minTotal(),
      maxMembers: ver.maxMembers
    }
  };
}
  // ---- পদবী ----
  desigName = (id: string) => this.designations().find(d => d.id === id)?.nameBn ?? id;
  availableDesigs = computed(() => {
    const used = new Set((this.v()?.designations ?? []).map(d => d.designationId));
    return this.designations().filter(d => d.isActive && !used.has(d.id));
  });
  minTotal = () => (this.v()?.designations ?? []).reduce((s, d) => s + (+d.minCount || 0), 0);
  addDesig() {
    const ver = this.v(); if (!ver || !this.newDesigId) return;
    ver.designations = [...ver.designations, { designationId: this.newDesigId, minCount: 1, maxCount: 1, mandatory: false }];
    this.newDesigId = ''; this.v.set({ ...ver });
  }
  removeDesig(i: number) {
    const ver = this.v(); if (!ver) return;
    ver.designations = ver.designations.filter((_, idx) => idx !== i); this.v.set({ ...ver });
  }
  toggleLevel(ver: TypeVersion, no: number) {
  const updatedLevels = ver.scopeLevelNos.includes(no)
    ? ver.scopeLevelNos.filter(n => n !== no)
    : [...ver.scopeLevelNos, no];

  this.v.set({
    ...ver,
    scopeLevelNos: updatedLevels
  });

  this.validation.set(null);
}
  onApprovalToggle(r: RuleSetting) { if (!r.approvalRequired) r.approvalRouteId = null; }

  // ---- সংরক্ষণ / যাচাই / প্রকাশ ----
  save() {
  const ver = this.v();
  if (!ver) return;

  this.busy.set(true);
  this.err.set('');
  this.msg.set('');
  this.validation.set(null);

  this.svc.updateVersion(this.versionId, this.payload(ver)).subscribe({
    next: () => {
      this.busy.set(false);
      this.msg.set('খসড়া সংরক্ষিত হয়েছে।');
    },
    error: (e) => {
      this.busy.set(false);
      this.err.set(errMsg(e));
    },
  });
}

  validate() {
    const ver = this.v(); if (!ver) return;
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.svc.updateVersion(this.versionId, this.payload(ver)).pipe(
      switchMap(() => this.svc.validateVersion(this.versionId)),
    ).subscribe({
      next: (errs) => { this.busy.set(false); this.validation.set(errs ?? []); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  publish() {
  const ver = this.v();

  if (!ver || this.validation()?.length !== 0 || !this.confirmPublish) {
    return;
  }

  this.busy.set(true);
  this.err.set('');
  this.msg.set('');

  this.svc.publishVersion(this.versionId)
    .pipe(
      switchMap(() => this.svc.getVersion(this.versionId))
    )
    .subscribe({
      next: (raw) => {
        this.v.set(this.normalize(raw));
        this.busy.set(false);
        this.confirmPublish = false;
        this.validation.set(null);
        this.diff.set([]);

        this.msg.set('সংস্করণটি প্রকাশিত হয়েছে। এখন থেকে এটি আর বদলানো যাবে না।');
      },
      error: (e) => {
        this.busy.set(false);
        this.err.set(errMsg(e));
      },
    });
}
  // ---- তুলনা ----
  compare() {
    if (!this.compareId) { this.diff.set([]); return; }
    this.svc.getVersion(this.compareId).subscribe({
      next: (raw) => {
        const a = this.flat(this.payload(this.normalize(raw)));
        const b = this.flat(this.payload(this.v()!));
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
        this.diff.set(keys.filter(k => a[k] !== b[k]).map(k => ({ key: k, a: a[k] ?? '—', b: b[k] ?? '—' })));
      },
      error: (e) => this.err.set(errMsg(e)),
    });
  }
  private flat(o: any, p = '', out: Record<string, string> = {}): Record<string, string> {
    if (o && typeof o === 'object') Object.entries(o).forEach(([k, val]) => this.flat(val, p ? `${p}.${k}` : k, out));
    else out[p] = String(o);
    return out;
  }
}
