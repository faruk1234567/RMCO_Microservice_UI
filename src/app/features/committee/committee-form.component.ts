
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigAdminService } from '../config/config-admin.service';
import { ConfigService } from '../../core/services/config.service';

import {
  CommitteeTypeRow,
  Designation,
  DynamicField,
  ScopeNode
} from '../../core/models/config-admin.model';

import { flattenTree, versionsOf } from '../config/config-shared';
import { DocumentUploaderComponent } from '../document/document-uploader.component';
import { DynamicFormComponent, validateFields } from './dynamic-form.component';
import { ENGINE_STYLES, Row, errMsg, maskMobile } from './engine-shared';

interface MemberRow {
  userId: string;
  designationId: string;
  name: string;
  mobile: string;
  fields: Record<string, any>;
}

interface NewMember {
  name: string;
  mobile: string;
  fields: Record<string, any>;
}

const MOBILE_RE = /^01[3-9]\d{8}$/;

@Component({
  selector: 'app-committee-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DynamicFormComponent,
    DocumentUploaderComponent
  ],
  styles: [ENGINE_STYLES],

  template: `
    <div class="page-container">

      <div class="page-header">
        <div>
          <a routerLink="/committee" class="muted">← কমিটির তালিকা</a>
          <h1>{{ draftId() ? 'কমিটি খসড়া সম্পাদনা' : 'নতুন কমিটি গঠন' }}</h1>
        </div>

        @if (savedAt()) {
          <span class="muted">খসড়া সংরক্ষিত: {{ savedAt() }}</span>
        }
      </div>

      @if (err()) {
        <div class="alert alert-err">{{ err() }}</div>
      }

      @if (loading()) {
        <div class="empty">লোড হচ্ছে...</div>
      } @else {

        <div class="stepper">
          @for (s of steps; track $index; let i = $index) {
            <button
              type="button"
              class="step"
              [class.active]="i === step()"
              [class.done]="i < step()"
              [disabled]="i > maxStep()"
              (click)="step.set(i)">
              <span class="no">{{ i + 1 }}</span>
              {{ s }}
            </button>
          }
        </div>

        @switch (step()) {

          @case (0) {

            <div class="card">
              <div class="card-body">

                <div class="grid2">

                  <div class="form-group">
                    <label>কমিটির ধরন <span class="required">*</span></label>

                    <select
                      class="form-control"
                      [(ngModel)]="typeId"
                      (ngModelChange)="onType()"
                      [disabled]="!!draftId()">

                      <option value="">— বাছাই করুন —</option>

                      @for (t of publishedTypes(); track t.id) {
                        <option [value]="t.id">{{ t.nameBn }}</option>
                      }

                    </select>

                    @if (!publishedTypes().length) {
                      <div class="muted">
                        কোনো প্রকাশিত ধরন নেই। আগে কনফিগারেশন থেকে ধরন প্রকাশ করুন।
                      </div>
                    }
                  </div>

                  <div class="form-group">
                    <label>নিয়মমালা <span class="required">*</span></label>

                    <select
                      class="form-control"
                      [(ngModel)]="versionId"
                      (ngModelChange)="loadVersion()"
                      [disabled]="!!draftId() || !typeId">

                      <option value="">— বাছাই করুন —</option>

                      @for (v of pubVersions(); track v.id) {
                        <option [value]="v.id">
                          নিয়মমালা{{ v.versionNo }}
                        </option>
                      }

                    </select>
                  </div>

                </div>

                @if (ver(); as v) {
                  <div class="alert alert-info">

                    <strong>{{ v['nameBn'] }}</strong> —

                    মোট সদস্য সর্বোচ্চ {{ v['maxMembers'] || 'সীমাহীন' }},
                    পদবী {{ (v['designations'] || []).length }}টি।

                    @if (rule('FORMATION')?.['approvalRequired']) {
                      গঠনের জন্য অনুমোদন লাগবে।
                    } @else {
                      অনুমোদন ছাড়াই সক্রিয় হবে।
                    }

                  </div>
                }

                <div class="form-group">
                  <label>কার্যপরিধির node <span class="required">*</span></label>

                  <select
                    class="form-control"
                    [(ngModel)]="form.scopeNodeId"
                    [disabled]="!!draftId() || !ver()">

                    <option [ngValue]="null">— বাছাই করুন —</option>

                    @for (f of allowedNodes(); track f.node.id) {
                      <option [ngValue]="f.node.id">
                        {{ '— '.repeat(f.depth) }}{{ f.node.nameBn }}
                        ({{ f.node.levelNameBn || ('স্তর ' + f.node.levelNo) }})
                      </option>
                    }

                  </select>

                  @if (ver() && !allowedNodes().length) {
                    <div class="muted bad-text">
                      এই ধরনের জন্য অনুমোদিত স্তরে কোনো node নেই।
                    </div>
                  }

                </div>

                <div class="grid2">

                  <div class="form-group">
                    <label>কমিটির নাম (বাংলা) <span class="required">*</span></label>
                    <input class="form-control" [(ngModel)]="form.nameBn" />
                  </div>

                  <div class="form-group">
                    <label>Name (English)</label>
                    <input class="form-control" [(ngModel)]="form.nameEn" />
                  </div>

                </div>

              </div>
            </div>

          }

          @case (1) {

            @if (!designationRules().length) {
              <div class="alert alert-warn">
                এই ধরনে কোনো পদবী নির্ধারিত নেই।
              </div>
            }

            @for (d of designationRules(); track d['designationId']) {

              <div class="card mb-2">

                <div class="card-header"
                     style="display:flex;justify-content:space-between;align-items:center">

                  <h3>{{ desigName(d['designationId']) }}</h3>

                  <span [class]="countClass(d)">
                    {{ countOf(d['designationId']) }} জন
                    (কমপক্ষে {{ d['minCount'] || 0 }},
                    সর্বোচ্চ {{ d['maxCount'] || 'সীমাহীন' }}
                    @if (d['mandatory']) {, বাধ্যতামূলক})
                  </span>

                </div>

                <div class="card-body">

                  @for (m of membersOf(d['designationId']); track $index) {

                    <div class="row-actions"
                         style="padding:6px 0;border-bottom:1px solid #eef1f2">

                      <strong>{{ m.name }}</strong>
                      <span class="muted">{{ mask(m.mobile) }}</span>
                      <span class="grow"></span>

                      <button
                        class="btn-ghost btn-sm"
                        (click)="removeMember(m)">
                        সরান
                      </button>

                    </div>

                  }

                  <div class="section-title" style="margin-top:12px">
                    সদস্য যোগ করুন
                  </div>

                  <div class="grid2">

                    <div class="form-group">
                      <label>নাম <span class="required">*</span></label>

                      <input
                        class="form-control"
                        [(ngModel)]="nm(d['designationId']).name" />
                    </div>

                    <div class="form-group">
                      <label>মোবাইল নম্বর <span class="required">*</span></label>

                      <input
                        class="form-control"
                        maxlength="11"
                        placeholder="01XXXXXXXXX"
                        [(ngModel)]="nm(d['designationId']).mobile" />
                    </div>

                  </div>

                  <app-dynamic-form
                    [fields]="memberFields()"
                    [values]="nm(d['designationId']).fields"
                    (valuesChange)="nm(d['designationId']).fields = $event" />

                  @if (memberError(d['designationId'])) {
                    <div class="muted bad-text" style="margin-bottom:6px">
                      {{ memberError(d['designationId']) }}
                    </div>
                  }

                  <button
                    class="btn-ghost"
                    (click)="addMember(d['designationId'])">
                    + যোগ করুন
                  </button>

                </div>

              </div>

            }

            <div class="alert alert-info">
              মোট {{ form.members.length }} জন

              @if (ver()?.['maxMembers']) {
                / সর্বোচ্চ {{ ver()!['maxMembers'] }}
              }।

              মোবাইল OTP যাচাইয়ের API এখনো নেই, তাই এই ধাপে OTP নেওয়া হচ্ছে না।
            </div>

          }

          @case (2) {

            <div class="card">
              <div class="card-body">
                <app-dynamic-form
                  [fields]="committeeFields()"
                  [values]="form.fields"
                  (valuesChange)="form.fields = $event" />
              </div>
            </div>

          }

          @case (3) {

            <div class="card">
              <div class="card-body">

                @if (!rule('FORMATION')?.['resolutionRequired']) {
                  <div class="alert alert-info">
                    এই ধরনে প্রস্তাব ঐচ্ছিক।
                  </div>
                }

                <div class="grid2">

                  <div class="form-group">
                    <label>
                      প্রস্তাব নম্বর
                      @if (rule('FORMATION')?.['resolutionRequired']) {
                        <span class="required">*</span>
                      }
                    </label>

                    <input
                      class="form-control"
                      [(ngModel)]="form.resolution.number" />
                  </div>

                  <div class="form-group">
                    <label>
                      প্রস্তাবের তারিখ
                      @if (rule('FORMATION')?.['resolutionRequired']) {
                        <span class="required">*</span>
                      }
                    </label>

                    <input
                      type="date"
                      class="form-control"
                      [(ngModel)]="form.resolution.date" />
                  </div>

                </div>

                <app-dynamic-form
                  [fields]="resolutionFields()"
                  [values]="form.resolution.fields"
                  (valuesChange)="form.resolution.fields = $event" />

                <div class="section-title" style="margin-top:12px">
                  প্রস্তাবের নথি
                </div>

                @if (form.resolution.documentId) {
                  <div class="alert alert-ok">
                    নথি সংযুক্ত হয়েছে
                    (ID: {{ form.resolution.documentId }})।
                  </div>
                }

                <app-document-uploader
                  (ready)="onDoc($event)"
                  (cleared)="form.resolution.documentId = null" />

              </div>
            </div>

          }

          @case (4) {

            <div class="card mb-2">

              <div class="card-header">
                <h3>সারসংক্ষেপ</h3>
              </div>

              <div class="card-body">

                <dl class="kv">

                  <dt>কমিটির নাম</dt>
                  <dd>{{ form.nameBn }} {{ form.nameEn }}</dd>

                  <dt>ধরন</dt>
                  <dd>
                    {{ ver()?.['nameBn'] }}
                    (নিয়মমালা{{ ver()?.['versionNo'] }})
                  </dd>

                  <dt>কার্যপরিধি</dt>
                  <dd>{{ nodeName() }}</dd>

                  <dt>সদস্য</dt>
                  <dd>{{ form.members.length }} জন</dd>

                  <dt>প্রস্তাব</dt>
                  <dd>
                    {{ form.resolution.number || '—' }}
                    · {{ form.resolution.date || '—' }}
                    · {{ form.resolution.documentId ? 'নথি আছে' : 'নথি নেই' }}
                  </dd>

                  <dt>অনুমোদন</dt>
                  <dd>
                    {{ rule('FORMATION')?.['approvalRequired'] ? 'লাগবে' : 'লাগবে না' }}
                  </dd>

                </dl>

                <div class="section-title" style="margin-top:14px">
                  সদস্য তালিকা
                </div>

                <table class="data-table">

                  <thead>
                    <tr>
                      <th>পদবী</th>
                      <th>নাম</th>
                      <th>মোবাইল</th>
                    </tr>
                  </thead>

                  <tbody>
                    @for (m of form.members; track $index) {
                      <tr>
                        <td>{{ desigName(m.designationId) }}</td>
                        <td>{{ m.name }}</td>
                        <td>{{ mask(m.mobile) }}</td>
                      </tr>
                    }
                  </tbody>

                </table>

              </div>
            </div>

            @if (problems().length) {

              <div class="alert alert-err">
                জমা দেওয়ার আগে এগুলো ঠিক করুন:

                <ul>
                  @for (p of problems(); track $index) {
                    <li>{{ p }}</li>
                  }
                </ul>
              </div>

            } @else {

              <div class="alert alert-ok">
                সব তথ্য ঠিক আছে। জমা দিতে প্রস্তুত।
              </div>

            }

          }

        }

        <div class="toolbar" style="margin-top:16px">

          <button
            class="btn-ghost"
            [disabled]="step() === 0 || busy()"
            (click)="step.set(step() - 1)">
            ← আগের ধাপ
          </button>

          <span class="grow"></span>

          @if (step() > 0) {
            <button
              class="btn-ghost"
              [disabled]="busy()"
              (click)="saveOnly()">
              খসড়া সংরক্ষণ
            </button>
          }

          @if (step() < steps.length - 1) {

            <button
              class="btn btn-primary"
              [disabled]="busy() || !!stepError()"
              (click)="next()">

              {{ busy() ? 'অপেক্ষা করুন...' : 'পরবর্তী ধাপ →' }}

            </button>

          } @else {

            <button
              class="btn btn-primary"
              [disabled]="busy() || problems().length > 0"
              (click)="submit()">

              {{ busy() ? 'জমা হচ্ছে...' : 'কমিটি জমা দিন' }}

            </button>

          }

        </div>

        @if (stepError()) {
          <div class="muted bad-text" style="text-align:right;margin-top:6px">
            {{ stepError() }}
          </div>
        }

      }

    </div>
  `
})
export class CommitteeFormComponent implements OnInit {

  private api = inject(EngineApiService);
  private cfgAdmin = inject(ConfigAdminService);
  private cfg = inject(ConfigService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  steps = [
    'ধরন ও কার্যপরিধি',
    'সদস্য নির্বাচন',
    'বাড়তি তথ্য',
    'প্রস্তাব ও নথি',
    'পর্যালোচনা ও জমা'
  ];

  step = signal(0);
  maxStep = signal(0);

  loading = signal(true);
  busy = signal(false);

  err = signal('');
  savedAt = signal('');

  draftId = signal<string | null>(null);

  types = signal<CommitteeTypeRow[]>([]);
  tree = signal<ScopeNode[]>([]);
  designations = signal<Designation[]>([]);
  ver = signal<Row | null>(null);

  typeId = '';
  versionId = '';

  form = {
    nameBn: '',
    nameEn: '',
    scopeNodeId: null as string | null,
    members: [] as MemberRow[],
    fields: {} as Record<string, any>,

    resolution: {
      number: '',
      date: '',
      documentId: null as string | null,
      fields: {} as Record<string, any>
    }
  };

  private newMembers: Record<string, NewMember> = {};
  private memberErr: Record<string, string> = {};

  mask = maskMobile;

  publishedTypes = computed(() =>
    this.types().filter(t =>
      versionsOf(t).some(v => v.status === 'PUBLISHED')
    )
  );

  pubVersions = () => {
    const t = this.types().find(x => x.id === this.typeId);

    return t
      ? versionsOf(t)
          .filter(v => v.status === 'PUBLISHED')
          .sort((a, b) => b.versionNo - a.versionNo)
      : [];
  };

  designationRules = computed<Row[]>(() =>
    this.ver()?.['designations'] ?? []
  );

  private allFields = computed<DynamicField[]>(() =>
    this.ver()?.['fields'] ?? []
  );

  committeeFields = computed(() =>
    this.allFields().filter(f => f.target === 'COMMITTEE')
  );

  memberFields = computed(() =>
    this.allFields().filter(f => f.target === 'MEMBER')
  );

  resolutionFields = computed(() =>
    this.allFields().filter(f => f.target === 'RESOLUTION')
  );

  rule = (k: string): Row | undefined =>
    this.ver()?.['rules']?.[k];

  allowedNodes = () => {
    const levels: number[] = this.ver()?.['scopeLevelNos'] ?? [];
    const flat = flattenTree(this.tree());

    return levels.length
      ? flat.filter(f => levels.includes(f.node.levelNo))
      : flat;
  };

  nodeName = () =>
    flattenTree(this.tree())
      .find(f => f.node.id === this.form.scopeNodeId)
      ?.node.nameBn ?? '—';

  // Lookup BIGINT ID দিয়ে Designation-এর নাম
  desigName = (id: string) =>
    this.designations().find(
      d => String(d.id) === String(id)
    )?.nameBn ?? id;

  membersOf = (id: string) =>
    this.form.members.filter(
      m => String(m.designationId) === String(id)
    );

  countOf = (id: string) =>
    this.membersOf(id).length;

  nm(id: string): NewMember {
    return (this.newMembers[id] ??= {
      name: '',
      mobile: '',
      fields: {}
    });
  }

  memberError = (id: string) =>
    this.memberErr[id] ?? '';

  countClass(d: Row): string {
    const n = this.countOf(String(d['designationId']));

    const bad =
      n < (d['minCount'] || (d['mandatory'] ? 1 : 0)) ||
      (!!d['maxCount'] && n > d['maxCount']);

    return bad ? 'st st-REJECTED' : 'st st-ACTIVE';
  }

  // ---------------- Load ----------------

  ngOnInit(): void {

    forkJoin({

      types: this.cfgAdmin.listTypes(true).pipe(
        catchError(() => of([] as CommitteeTypeRow[]))
      ),

      levels: this.cfgAdmin.listScopeLevels().pipe(
        catchError(() => of([] as any[]))
      ),

      tree: this.cfgAdmin.scopeTree().pipe(
        catchError(() => of([] as ScopeNode[]))
      ),

      desig: this.cfg.listDesignations().pipe(
        catchError(() => of([] as Designation[]))
      )

    }).subscribe(({ types, levels, tree, desig }) => {

      const levelMap = new Map(
        levels.map((level: any) => [
          String(level.id),
          level
        ])
      );

      const enrichTree = (nodes: ScopeNode[]): ScopeNode[] => {

        return nodes.map((node: any) => {

          const level = levelMap.get(
            String(node.levelId)
          ) as any;

          return {
            ...node,
            levelNo: level?.levelNo ?? node.levelNo,
            levelNameBn: level?.nameBn ?? node.levelNameBn,
            children: enrichTree(node.children ?? [])
          };
        });
      };

      this.types.set(types);
      this.tree.set(enrichTree(tree));
      this.designations.set(desig as Designation[]);

      const draft = this.route.snapshot.queryParamMap.get('draftId');

      if (draft) {
        this.loadDraft(draft);
      } else {
        this.loading.set(false);
      }

    });
  }

  // ---------------- Load Draft ----------------

  private loadDraft(id: string): void {

    this.api.getCommittee(id).subscribe({

      next: (r) => {

        if (r['status'] && r['status'] !== 'DRAFT') {
          this.err.set('শুধু খসড়া সম্পাদনা করা যায়।');
          this.loading.set(false);
          return;
        }

        const p: Row = r['payload'] ?? r;

        this.draftId.set(id);

        this.typeId = r['committeeTypeId'] ?? r['typeId'] ?? '';
        this.versionId = r['typeVersionId'] ?? r['versionId'] ?? '';

        this.form.nameBn = r['nameBn'] ?? p['nameBn'] ?? '';
        this.form.nameEn = r['nameEn'] ?? p['nameEn'] ?? '';

        this.form.scopeNodeId =
          r['scopeNodeId'] ?? p['scopeNodeId'] ?? null;

        this.form.members = p['members'] ?? [];
        this.form.fields = p['fields'] ?? {};

        const res = p['resolution'] ?? {};

        this.form.resolution = {
          number: res['number'] ?? '',
          date: res['date'] ?? '',
          documentId: res['documentId'] ?? null,
          fields: res['fields'] ?? {}
        };

        this.maxStep.set(this.steps.length - 1);

        if (this.versionId) {
          this.loadVersion();
        }

        this.loading.set(false);
      },

      error: (e) => {
        this.err.set(errMsg(e));
        this.loading.set(false);
      }

    });
  }

  // ---------------- Type ----------------

  onType(): void {

    this.versionId = '';
    this.ver.set(null);
    this.err.set('');

    const versions = this.pubVersions();

    if (versions.length > 0) {
      this.versionId = versions[0].id;
      this.loadVersion();
    }
  }

  // ---------------- Version ----------------

  loadVersion(): void {

    if (!this.versionId) {
      this.ver.set(null);
      return;
    }

    this.cfgAdmin.getVersion(this.versionId).subscribe({

      next: (apiVersion: any) => {

        const settings = apiVersion['settings'] ?? {};
        const composition = apiVersion['composition'] ?? {};

        const actionKeyMap: Record<string, string> = {
          FORMATION: 'FORMATION',
          ADD: 'ADD_MEMBER',
          GO_BACK: 'GO_BACK_MEMBER',
          REJECT: 'REJECT_MEMBER',
          RENEW: 'RENEW_TERM',
          DISSOLVE: 'DISSOLVE'
        };

        const rules: Record<string, any> = {};

        (apiVersion['actionRules'] ?? []).forEach((r: any) => {

          const key = actionKeyMap[r.actionCode];

          if (key) {
            rules[key] = {
              resolutionRequired: r.resolutionRule === 'REQUIRED',
              approvalRequired: r.approvalRequired === true,
              approvalRouteId: r.approvalRouteId ?? null
            };
          }

        });

        // Backend Designation Lookup ID -> Angular designationId
        const designations = (
          apiVersion['designations'] ?? []
        ).map((d: any) => {

          const lookupId =
            d.designationLookupId ?? d.designationId;

          const designation = this.designations().find(
            x => String(x.id) === String(lookupId)
          );

          return {
            ...d,

            designationId:
              lookupId != null ? String(lookupId) : '',

            designationLookupId:
              lookupId != null ? Number(lookupId) : null,

            designationNameBn:
              designation?.nameBn ?? '',

            minCount: Number(d.minCount ?? 0),
            maxCount: d.maxCount ?? null,

            mandatory:
              d.isMandatory ?? d.mandatory ?? false,

            isSingleHolder:
              d.isSingleHolder ?? false
          };

        });

        const selectedType = this.types().find(
          t => t.id === this.typeId
        );

        const normalizedVersion: Row = {

          ...apiVersion,

          nameBn: selectedType?.nameBn ?? '',
          nameEn: selectedType?.nameEn ?? '',

          maxMembers: composition.maxMembers ?? null,
          minMembers: composition.minMembers ?? null,

          designations,

          rules,

          fields: settings.fields ?? [],

          scopeLevelNos: settings.scopeLevelNos ?? [],

          termMonths: settings.termMonths ?? null

        };

        this.ver.set(normalizedVersion);
        this.err.set('');

      },

      error: e => {
        this.ver.set(null);
        this.err.set(errMsg(e));
      }

    });
  }

  // ---------------- Add Member ----------------

  addMember(desigId: string): void {

    const n = this.nm(desigId);

    const name = n.name.trim();
    const mobile = n.mobile.trim();

    // BIGINT Designation Lookup ID
    const designationId = Number(desigId);

    const d = this.designationRules().find(
      x => String(x['designationId']) === String(desigId)
    );

    let e = '';

    if (!Number.isSafeInteger(designationId) || designationId <= 0) {
      e = 'সঠিক Designation Lookup ID পাওয়া যায়নি।';
    } else if (!name) {
      e = 'নাম দিন।';
    } else if (!MOBILE_RE.test(mobile)) {
      e = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।';
    } else if (this.form.members.some(m => m.mobile === mobile)) {
      e = 'এই মোবাইল নম্বর ইতিমধ্যে যোগ করা হয়েছে।';
    } else if (
      d?.['maxCount'] &&
      this.countOf(desigId) >= d['maxCount']
    ) {
      e = 'এই পদবীর সর্বোচ্চ সংখ্যা পূর্ণ।';
    } else if (
      this.ver()?.['maxMembers'] &&
      this.form.members.length >= this.ver()!['maxMembers']
    ) {
      e = 'মোট সদস্যের সীমা পূর্ণ।';
    } else {

      const fe = validateFields(
        this.memberFields(),
        n.fields
      );

      if (fe.length) {
        e = fe[0];
      }
    }

    this.memberErr[desigId] = e;

    if (e) return;

    this.api.searchCitizenByMobile(mobile).subscribe({

      next: (users: Row[]) => {

        const citizen = users.find(u =>
          String(u['mobile'] ?? '').replace(/\D/g, '') === mobile
        );

        if (!citizen?.['id']) {
          this.memberErr[desigId] =
            'এই মোবাইল নম্বরে কোনো Citizen Account পাওয়া যায়নি। আগে Citizen Registration করুন.';
          return;
        }

        this.form.members = [
          ...this.form.members,
          {
            userId: String(citizen['id']),

            // Send BIGINT Lookup ID as string
            designationId: String(designationId),

            name: String(
              citizen['nameBn'] ||
              citizen['nameEn'] ||
              name
            ),

            mobile: String(citizen['mobile'] || mobile),

            fields: { ...n.fields }
          }
        ];

        this.newMembers[desigId] = {
          name: '',
          mobile: '',
          fields: {}
        };

        this.memberErr[desigId] = '';

      },

      error: (err) => {

        console.error('Citizen search failed:', err);

        this.memberErr[desigId] =
          'Citizen Account খুঁজতে সমস্যা হয়েছে। Identity Service এবং permission পরীক্ষা করুন।';

      }

    });
  }

  removeMember(m: MemberRow): void {
    this.form.members = this.form.members.filter(x => x !== m);
  }

  // ---------------- Document ----------------

  onDoc(d: Row): void {

    const rawId = d?.['id'] ?? d?.['documentId'];

    const documentId =
      typeof rawId === 'string' ? rawId.trim() : '';

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(documentId)) {
      this.form.resolution.documentId = null;
      this.err.set('বৈধ Document UUID পাওয়া যায়নি।');
      return;
    }

    this.form.resolution.documentId = documentId;
    this.err.set('');

    const id = this.draftId();

    if (id) {
      this.api.attachUsage(
        documentId,
        'COMMITTEE_DRAFT',
        id
      ).subscribe({
        error: e =>
          this.err.set('নথি সংযুক্ত করা যায়নি: ' + errMsg(e))
      });
    }
  }

  // ---------------- Validation ----------------

  stepError(): string {

    switch (this.step()) {

      case 0:
        if (!this.versionId || !this.ver()) {
          return 'কমিটির ধরন ও সংস্করণ বাছাই করুন।';
        }

        if (!this.form.scopeNodeId) {
          return 'কার্যপরিধির node বাছাই করুন।';
        }

        if (!this.form.nameBn.trim()) {
          return 'কমিটির নাম দিন।';
        }

        return '';

      case 1:
        return this.memberProblems()[0] ?? '';

      case 2:
        return validateFields(
          this.committeeFields(),
          this.form.fields
        )[0] ?? '';

      case 3:
        return this.resolutionProblems()[0] ?? '';

      default:
        return '';
    }
  }

  private memberProblems(): string[] {

    const p: string[] = [];

    for (const d of this.designationRules()) {

      const n = this.countOf(d['designationId']);
      const name = this.desigName(d['designationId']);

      const min =
        d['minCount'] || (d['mandatory'] ? 1 : 0);

      if (n < min) {
        p.push(
          `${name}: কমপক্ষে ${min} জন দরকার (এখন ${n})`
        );
      }

      if (d['maxCount'] && n > d['maxCount']) {
        p.push(`${name}: সর্বোচ্চ ${d['maxCount']} জন`);
      }

    }

    const max = this.ver()?.['maxMembers'];

    if (max && this.form.members.length > max) {
      p.push(`মোট সদস্য সর্বোচ্চ ${max} জন`);
    }

    return p;
  }

  private resolutionProblems(): string[] {

    const p: string[] = [];

    if (this.rule('FORMATION')?.['resolutionRequired']) {

      if (!this.form.resolution.number.trim()) {
        p.push('প্রস্তাব নম্বর দিন');
      }

      if (!this.form.resolution.date) {
        p.push('প্রস্তাবের তারিখ দিন');
      }

      if (!this.form.resolution.documentId) {
        p.push(
          'প্রস্তাবের নথি আপলোড করুন (স্ক্যান শেষ হওয়া পর্যন্ত অপেক্ষা করুন)'
        );
      }

    }

    return [
      ...p,
      ...validateFields(
        this.resolutionFields(),
        this.form.resolution.fields,
        'প্রস্তাব: '
      )
    ];
  }

  problems = (): string[] => {

    const p: string[] = [];

    if (!this.ver()) {
      return ['কমিটির ধরন বাছাই করুন'];
    }

    if (!this.form.scopeNodeId) {
      p.push('কার্যপরিধির node বাছাই করুন');
    }

    if (!this.form.nameBn.trim()) {
      p.push('কমিটির নাম দিন');
    }

    p.push(...this.memberProblems());

    for (const m of this.form.members) {
      p.push(
        ...validateFields(
          this.memberFields(),
          m.fields,
          `${m.name}: `
        )
      );
    }

    p.push(
      ...validateFields(
        this.committeeFields(),
        this.form.fields
      )
    );

    p.push(...this.resolutionProblems());

    return p;
  };

  // ---------------- Payload ----------------

  private payload(): {
    code: string;
    nameBn: string;
    nameEn?: string;
    scopeNodeId: string | null;
    termStart: string;
    termEnd: string;
    dynamicValues: Record<string, any>;
    members: any[];
    documents: any[];
  } {

    return {

      code: `COM-${Date.now()}`,

      nameBn: this.form.nameBn.trim(),

      nameEn: this.form.nameEn.trim(),

      scopeNodeId: this.form.scopeNodeId,

      termStart: new Date().toISOString(),

      termEnd: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),

      dynamicValues: this.form.fields,

      members: this.form.members.map(m => ({

        userId: m.userId,

        designationId: String(Number(m.designationId)),

        name: m.name,

        mobile: m.mobile,

        isPrimary: false,

        dynamicValues: m.fields

      })),

      documents: this.form.resolution.documentId
        ? [{
            documentId: this.form.resolution.documentId,
            role: 'PROPOSAL'
          }]
        : []

    };
  }

  // ---------------- Save ----------------

  private save$(): Observable<Row> {

    const id = this.draftId();
    const payload = this.payload();

    if (id) {
      return this.api.updateDraft(id, payload);
    }

    return new Observable<Row>(sub => {

      this.api.createDraft({

        typeVersionId: this.versionId,

        payload: payload

      }).subscribe({

        next: (r) => {

          const draftId = r['draftId'];

          if (!draftId) {
            sub.error(
              new Error('Backend response-এ draftId পাওয়া যায়নি।')
            );
            return;
          }

          this.draftId.set(String(draftId));

          sub.next(r);
          sub.complete();

        },

        error: (e) => sub.error(e)

      });

    });
  }

  private stamp(): void {
    this.savedAt.set(
      new Date().toLocaleTimeString('bn-BD')
    );
  }

  next(): void {

    this.busy.set(true);
    this.err.set('');

    this.save$().subscribe({

      next: () => {

        this.busy.set(false);
        this.stamp();

        const n = this.step() + 1;

        this.step.set(n);

        this.maxStep.set(
          Math.max(this.maxStep(), n)
        );

      },

      error: (e) => {

        this.busy.set(false);
        this.err.set(errMsg(e));

      }

    });
  }

  saveOnly(): void {

    this.busy.set(true);
    this.err.set('');

    this.save$().subscribe({

      next: () => {
        this.busy.set(false);
        this.stamp();
      },

      error: (e) => {
        this.busy.set(false);
        this.err.set(errMsg(e));
      }

    });
  }

 submit(): void {
  this.busy.set(true);
  this.err.set('');

  this.save$().subscribe({
    next: () => {
      this.api.submitDraft(this.draftId()!).subscribe({
        next: (r: any) => {
          console.log('SUBMIT RESPONSE:', r);

          this.busy.set(false);

          const committeeId =
            r?.committeeId ??
            r?.id ??
            r?.data?.committeeId ??
            r?.data?.id;

          if (!committeeId) {
            this.err.set(
              'Committee তৈরি হয়েছে, কিন্তু response থেকে Committee ID পাওয়া যায়নি।'
            );
            return;
          }

          this.router.navigate([
            '/committee',
            committeeId
          ]);
        },
        error: (e) => {
          this.busy.set(false);
          this.err.set(errMsg(e));
        }
      });
    },
    error: (e) => {
      this.busy.set(false);
      this.err.set(errMsg(e));
    }
  });
}

}
