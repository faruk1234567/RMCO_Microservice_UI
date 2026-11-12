import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { catchError, of } from 'rxjs';

import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigService } from '../../core/services/config.service';

import {
  ENGINE_STYLES,
  Row,
  STATUS_BN,
  committeeName,
  errMsg,
  fmtDate,
  maskMobile,
  pick
} from './engine-shared';

type Tab = 'summary' | 'members' | 'resolution' | 'details';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],

  styles: [
    ENGINE_STYLES,

    `
      .complete-info {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .info-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
      }

      .info-card-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .info-card-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }

      .info-card-body {
        padding: 20px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 22px 30px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 7px;
        min-width: 0;
      }

      .info-label {
        color: #6b7280;
        font-size: 13px;
        font-weight: 500;
      }

      .info-value {
        color: #111827;
        font-size: 14px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .info-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .info-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 28px;
        padding: 0 10px;
        border-radius: 6px;
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 600;
        font-size: 13px;
      }

      .info-extra {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px 30px;
      }

      /* APPROVAL TIMELINE */
      .approval-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        margin-bottom: 20px;
        overflow: hidden;
      }

      .approval-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .approval-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }

      .approval-body {
        padding: 20px;
      }

      .progress-bar {
        height: 10px;
        background: #e5e7eb;
        border-radius: 5px;
        overflow: hidden;
        margin: 8px 0 16px;
      }

      .progress-fill {
        height: 100%;
        background: #22c55e;
        transition: width 0.3s;
      }

      .timeline-item {
        display: flex;
        gap: 12px;
        padding: 14px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 10px;
      }

      .timeline-item.approved {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      .timeline-item.current {
        background: #fffbeb;
        border-color: #fcd34d;
      }

      .timeline-item.pending {
        background: #f8fafc;
      }

      .timeline-item.rejected {
        background: #fef2f2;
        border-color: #fecaca;
      }

      .timeline-icon {
        font-size: 22px;
        flex-shrink: 0;
      }

      .timeline-content {
        flex: 1;
        min-width: 0;
      }

      .decision-meta {
        font-size: 13px;
        color: #475569;
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      @media (max-width: 768px) {
        .info-grid,
        .info-extra {
          grid-template-columns: 1fr;
        }

        .info-card-body {
          padding: 15px;
        }
      }
    `
  ],

  template: `
    <div class="page-container">

      <!-- HEADER -->
      <div class="page-header">

        <div>
          <a routerLink="/committee" class="muted">
            ← কমিটির তালিকা
          </a>

          <h1>
            {{ title() }}

            @if (c()) {
              <span [class]="'st st-' + c()!['status']">
                {{ bn(c()!['status']) }}
              </span>
            }
          </h1>
        </div>

        @if (c() && c()!['status'] === 'DRAFT') {
          <a
            class="btn btn-primary"
            routerLink="/committee/create"
            [queryParams]="{ draftId: c()!['id'] }"
          >
            খসড়া সম্পাদনা
          </a>
        }

      </div>

      <!-- ERROR -->
      @if (err()) {
        <div class="alert alert-err">
          {{ err() }}
        </div>
      }

      <!-- LOADING -->
      @if (loading()) {
        <div class="empty">
          লোড হচ্ছে...
        </div>
      }

      @else if (c()) {

        <!-- STATUS MESSAGES -->
        @if (
          c()!['status'] === 'SUBMITTED' ||
          c()!['status'] === 'UNDER_APPROVAL'
        ) {
          <div class="alert alert-info">
            অনুমোদন চলছে। অনুমোদনকারীরা সিদ্ধান্ত দিলে
            অবস্থা নিজে থেকে বদলাবে।
          </div>
        }

        @if (c()!['status'] === 'REJECTED') {
          <div class="alert alert-err">
            এই কমিটি প্রত্যাখ্যাত হয়েছে।

            @if (rejectReason()) {
              কারণ: {{ rejectReason() }}
            }
          </div>
        }

        <!-- APPROVAL PROGRESS -->
        @if (c()!['status'] === 'SUBMITTED' || c()!['status'] === 'UNDER_APPROVAL' || c()!['status'] === 'APPROVED' || c()!['status'] === 'REJECTED') {
          <div class="approval-card">
            <div class="approval-header">
              <h3>অনুমোদনের অগ্রগতি</h3>
              @if (approvalDetail()) {
                <span [class]="'st st-' + approvalDetail()!.status">
                  {{ bn(approvalDetail()!.status) }}
                </span>
              }
            </div>
            <div class="approval-body">
              @if (approvalLoading()) {
                <div class="muted">অনুমোদনের তথ্য লোড হচ্ছে...</div>
              } @else {
                @if (approvalDetail(); as d) {
                  <div><strong>ধাপ {{ approvedCount() }} / {{ d.totalSteps }} সম্পন্ন</strong></div>
                  <div class="progress-bar"><div class="progress-fill" [style.width.%]="approvedCount() / d.totalSteps * 100"></div></div>

                  @for (s of d.steps; track s.stepNo) {
                    <div class="timeline-item"
                      [class.approved]="s.decision === 'APPROVED'"
                      [class.current]="s.isCurrentStep"
                      [class.rejected]="s.decision === 'REJECTED'"
                      [class.pending]="s.decision === 'PENDING' && !s.isCurrentStep">
                      <div class="timeline-icon">
                        @if (s.decision === 'APPROVED') { ✅ }
                        @else if (s.decision === 'REJECTED') { ❌ }
                        @else { ⏳ }
                      </div>
                      <div class="timeline-content">
                        <div>
                          <strong>ধাপ {{ s.stepNo }}: {{ s.designationName }}</strong>
                          @if (s.isCurrentStep) {
                            <span class="st st-IN_PROGRESS" style="margin-left:8px">বর্তমান ধাপ</span>
                          }
                        </div>

                        @if (s.decision === 'APPROVED') {
                          <div class="decision-meta">
                            <span>✅ <strong>অনুমোদিত</strong></span>
                            <span>দ্বারা: {{ s.decidedByName ?? s.decidedBy ?? '—' }}</span>
                            <span>তারিখ: {{ fmt(s.decidedAt) }}</span>
                            @if (s.comment) { <span>মন্তব্য: {{ s.comment }}</span> }
                          </div>
                        } @else if (s.decision === 'REJECTED') {
                          <div class="decision-meta">
                            <span>❌ <strong>প্রত্যাখ্যাত</strong></span>
                            <span>দ্বারা: {{ s.decidedByName ?? s.decidedBy ?? '—' }}</span>
                            <span>কারণ: {{ s.comment ?? '—' }}</span>
                          </div>
                        } @else {
                          <div class="decision-meta">
                            <span>⏳ অনুমোদনের অপেক্ষায়</span>
                            @if (s.isCurrentStep) { <span>এই ধাপের অনুমোদকের কাছে এখন আছে</span> }
                          </div>
                        }
                      </div>
                    </div>
                  }
                } @else {
                  <div class="muted">এই কমিটির অনুমোদনের তথ্য পাওয়া যায়নি।</div>
                }
              }
            </div>
          </div>
        }

        <!-- TABS -->
        <div class="tabs-row">

          <button
            class="tab-btn"
            [class.active]="tab() === 'summary'"
            (click)="tab.set('summary')"
          >
            সংক্ষেপ
          </button>

          <button
            class="tab-btn"
            [class.active]="tab() === 'members'"
            (click)="tab.set('members')"
          >
            সদস্য ({{ members().length }})
          </button>

          <button
            class="tab-btn"
            [class.active]="tab() === 'resolution'"
            (click)="openResolution()"
          >
            প্রস্তাব ও নথি
          </button>

          <button
            class="tab-btn"
            [class.active]="tab() === 'details'"
            (click)="tab.set('details')"
          >
            সম্পূর্ণ তথ্য
          </button>

        </div>

        @switch (tab()) {

          @case ('summary') {

            <div class="info-card">

              <div class="info-card-header">
                <h3>কমিটির সংক্ষিপ্ত তথ্য</h3>
              </div>

              <div class="info-card-body">

                <div class="info-grid">

                  @for (item of summaryRows(); track item.label) {

                    <div class="info-item">

                      <span class="info-label">
                        {{ item.label }}
                      </span>

                      <span class="info-value">

                        @if (item.isStatus) {
                          <span [class]="'st st-' + item.status">
                            {{ item.value }}
                          </span>
                        } @else {
                          {{ item.value }}
                        }

                      </span>

                    </div>

                  }

                </div>

              </div>

            </div>

            @if (fieldRows().length) {

              <div class="card" style="margin-top:20px">

                <div class="card-header">
                  <h3>বাড়তি তথ্য</h3>
                </div>

                <div class="card-body">

                  <dl class="kv">

                    @for (f of fieldRows(); track f[0]) {
                      <dt>{{ f[0] }}</dt>
                      <dd>{{ f[1] }}</dd>
                    }

                  </dl>

                </div>

              </div>

            }

          }

          @case ('members') {

            <div class="card">

              <div class="card-body table-wrapper">

                <table class="data-table">

                  <thead>
                    <tr>
                      <th>নাম</th>
                      <th>পদবী</th>
                      <th>মোবাইল</th>
                      <th>অবস্থা</th>
                      <th>কার্যকরের তারিখ</th>
                    </tr>
                  </thead>

                  <tbody>

                    @for (m of members(); track $index) {

                      <tr>

                        <td>{{ memberName(m) }}</td>

                        <td>{{ desigOf(m) }}</td>

                        <td>{{ memberMobile(m) }}</td>

                        <td>
                          @if (m['status']) {
                            <span [class]="'st st-' + m['status']">
                              {{ bn(m['status']) }}
                            </span>
                          } @else {
                            —
                          }
                        </td>

                        <td>
                          {{
                            fmt(
                              pick(
                                m,
                                'effectiveFrom',
                                'joinedAt',
                                'startDate'
                              )
                            )
                          }}
                        </td>

                      </tr>

                    } @empty {

                      <tr>
                        <td colspan="5" class="empty">
                          এই কমিটির তথ্যে সদস্যের তালিকা পাওয়া যায়নি।
                        </td>
                      </tr>

                    }

                  </tbody>

                </table>

                <p class="muted" style="margin-top:10px">
                  সদস্য যোগ / ফেরত / প্রত্যাখ্যানের জন্য আলাদা API
                  এখনো নেই, তাই সেই বোতামও এখানে নেই।
                </p>

              </div>
            </div>

          }

          @case ('resolution') {

            <div class="card">

              <div class="card-body">

                <dl class="kv">

                  <dt>প্রস্তাব নম্বর</dt>

                  <dd>
                    {{
                      pick(
                        resolution(),
                        'number',
                        'proposalNumber',
                        'resolutionNumber'
                      ) || '—'
                    }}
                  </dd>

                  <dt>প্রস্তাবের তারিখ</dt>

                  <dd>
                    {{
                      fmt(
                        resolution()['date'] ?? submittedAt()
                      )
                    }}
                  </dd>

                  <dt>নথি</dt>

                  <dd>

                    @if (docId()) {

                      @if (doc(); as d) {

                        <strong>{{ docName(d) }}</strong>

                        <span [class]="'st st-' + docStatus(d)">
                          {{ docStatusLabel(d) }}
                        </span>

                        @if (docUrl(); as u) {

                          <a
                            [href]="u"
                            target="_blank"
                            rel="noopener"
                            class="chip"
                          >
                            খুলুন
                          </a>

                        }

                      } @else {

                        {{ docId() }}

                        @if (docLoading()) {
                          <span class="muted">
                            নথির তথ্য লোড হচ্ছে...
                          </span>
                        }

                        @if (docError()) {
                          <span class="muted">
                            {{ docError() }}
                          </span>
                        }

                      }

                    } @else {

                      সংযুক্ত নথি নেই

                    }

                  </dd>

                </dl>

              </div>
            </div>

          }

          @case ('details') {

            <div class="complete-info">

              <div class="info-card">

                <div class="info-card-header">
                  <h3>কমিটির সম্পূর্ণ তথ্য</h3>
                </div>

                <div class="info-card-body">

                  <div class="info-grid">

                    <div class="info-item">
                      <span class="info-label">
                        কমিটির নাম
                      </span>

                      <span class="info-value">
                        {{ committeeNameBn() }}
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        কমিটির নাম (ইংরেজি)
                      </span>

                      <span class="info-value">
                        {{ committeeNameEn() }}
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        কমিটি কোড
                      </span>

                      <span class="info-value">
                        {{ c()?.['code'] || '—' }}
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        কমিটির অবস্থা
                      </span>

                      <span class="info-value">
                        <span [class]="'st st-' + c()?.['status']">
                          {{ bn(c()?.['status'] ?? '') }}
                        </span>
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        মেয়াদ শুরু
                      </span>

                      <span class="info-value">
                        {{ fmt(c()?.['termStart']) }}
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        মেয়াদ শেষ
                      </span>

                      <span class="info-value">
                        {{ fmt(c()?.['termEnd']) }}
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        সদস্য সংখ্যা
                      </span>

                      <span class="info-value">
                        <span class="info-count">
                          {{ members().length }}
                        </span>
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        সংযুক্ত নথির সংখ্যা
                      </span>

                      <span class="info-value">
                        <span class="info-count">
                          {{ documents().length }}
                        </span>
                      </span>
                    </div>

                    <div class="info-item">
                      <span class="info-label">
                        দাখিলের তারিখ
                      </span>

                      <span class="info-value">
                        {{ fmt(submittedAt()) }}
                      </span>
                    </div>

                  </div>

                </div>

              </div>

              @if (fieldRows().length) {

                <div class="info-card">

                  <div class="info-card-header">
                    <h3>বাড়তি তথ্য</h3>
                  </div>

                  <div class="info-card-body">

                    <div class="info-extra">

                      @for (f of fieldRows(); track f[0]) {

                        <div class="info-item">

                          <span class="info-label">
                            {{ f[0] }}
                          </span>

                          <span class="info-value">
                            {{ f[1] }}
                          </span>

                        </div>

                      }

                    </div>

                  </div>

                </div>

              }

            </div>

          }

        }

      }

    </div>
  `
})

export class CommitteeDetailComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private api = inject(EngineApiService);
  private cfg = inject(ConfigService);

  c = signal<Row | null>(null);
  doc = signal<Row | null>(null);
  desigMap = signal<Record<string, string>>({});
  tab = signal<Tab>('summary');
  loading = signal(true);
  docLoading = signal(false);
  docError = signal('');
  err = signal('');

  approvalDetail = signal<any | null>(null);
  approvalLoading = signal(false);
  approvalError = signal('');

  approvedCount = computed(() =>
    (this.approvalDetail()?.steps ?? []).filter((s: any) => s.decision === 'APPROVED').length
  );

  pick = pick;
  fmt = (v: any) => fmtDate(v);
  mask = maskMobile;
  bn = (s: string) => STATUS_BN[s] ?? s;

  body = computed<Row>(() =>
    this.c()?.['payload'] ?? this.c() ?? {}
  );

  title = computed(() =>
    this.c()
      ? committeeName(this.c()!)
      : 'কমিটি'
  );

  committeeNameBn = computed(() =>
    pick(
      this.c(),
      'nameBn',
      'name',
      'committeeName'
    ) ?? '—'
  );

  committeeNameEn = computed(() =>
    pick(
      this.c(),
      'nameEn',
      'nameEnglish'
    ) ?? '—'
  );

  members = computed<Row[]>(() =>
    this.c()?.['members'] ??
    this.body()['members'] ??
    []
  );

  resolution = computed<Row>(() =>
    this.c()?.['resolution'] ??
    this.body()['resolution'] ??
    {}
  );

  documents = computed<Row[]>(() =>
    this.c()?.['documents'] ??
    this.body()['documents'] ??
    []
  );

  summaryRows = computed(() => {

    const committee = this.c();

    if (!committee) {
      return [];
    }

    const status = String(committee['status'] ?? '');

    return [

      {
        label: 'কমিটি কোড',
        value: committee['code'] || '—'
      },

      {
        label: 'নাম (বাংলা)',
        value: this.committeeNameBn()
      },

      {
        label: 'Name (English)',
        value: this.committeeNameEn()
      },

      {
        label: 'অবস্থা',
        value: this.bn(status),
        isStatus: true,
        status
      },

      {
        label: 'মেয়াদ শুরু',
        value: this.fmt(committee['termStart'])
      },

      {
        label: 'মেয়াদ শেষ',
        value: this.fmt(committee['termEnd'])
      },

      {
        label: 'সদস্য সংখ্যা',
        value: String(this.members().length)
      },

      {
        label: 'সংযুক্ত নথির সংখ্যা',
        value: String(this.documents().length)
      }

    ];

  });

  docId = computed<string>(() => {

    const resolution = this.resolution();

    const proposal = this.documents().find(d =>
      (d['documentRole'] ?? d['role']) === 'PROPOSAL'
    );

    return String(
      resolution['documentId'] ??
      this.c()?.['resolutionDocumentId'] ??
      proposal?.['documentId'] ??
      ''
    );

  });

  submittedAt = computed(() => {

    const history = this.c()?.['statusHistory'] ?? [];

    const submitted = history.find(
      (h: Row) => h['toStatus'] === 'SUBMITTED'
    );

    return submitted?.['createdAt'] ?? null;

  });

  fieldRows = computed(() =>

    Object.entries(
      this.body()['fields'] ??
      this.c()?.['fields'] ??
      {}
    ).map(([k, v]) => [
      k,
      String(v)
    ])

  );

  rejectReason = computed(() =>
    pick(
      this.c(),
      'rejectReason',
      'rejectionReason',
      'comment'
    )
  );

  docUrl = computed(() =>
    pick(
      this.doc(),
      'url',
      'downloadUrl',
      'fileUrl'
    )
  );

  docName(d: Row): string {

    return (
      pick(
        d,
        'originalName',
        'fileName',
        'originalFilename',
        'name'
      ) ?? '—'
    );

  }

  docStatus(d: Row): string {

    return String(
      d['scanStatus'] ??
      d['status'] ??
      ''
    );

  }

  docStatusLabel(d: Row): string {

    const status = this.docStatus(d);

    if (status === 'CLEAN') {
      return 'নিরাপদ (CLEAN)';
    }

    if (status === 'INFECTED') {
      return 'ঝুঁকিপূর্ণ (INFECTED)';
    }

    if (status === 'PENDING') {
      return 'পরীক্ষাধীন (PENDING)';
    }

    return this.bn(status) || 'অজানা';

  }

  memberName(m: Row): string {

    return (
      pick(
        m,
        'name',
        'nameBn',
        'memberName',
        'userName'
      ) ??

      pick(
        m['dynamicValues'],
        '_memberName'
      ) ??

      '—'
    );

  }

  memberMobile(m: Row): string {

    const mobile =
      pick(
        m,
        'mobile',
        'mobileNo',
        'phone'
      ) ??

      pick(
        m['dynamicValues'],
        '_memberMobile'
      );

    return mobile
      ? maskMobile(mobile)
      : '—';

  }

  desigOf(m: Row): string {

    return (
      pick(
        m,
        'designationName',
        'designationNameBn'
      ) ??

      this.desigMap()[String(m['designationId'])] ??

      '—'
    );

  }

  ngOnInit(): void {

    const id =
      this.route.snapshot.paramMap.get('id') ?? '';

    this.cfg
      .listDesignations()
      .pipe(
        catchError(() => of([]))
      )
      .subscribe((l: any[]) => {

        this.desigMap.set(

          Object.fromEntries(

            l.map(d => [
              String(d.id),
              d.nameBn
            ])

          )

        );

      });

    this.api
      .getCommittee(id)
      .subscribe({

        next: (r: Row) => {

          this.c.set(r);

          this.loading.set(false);

          this.loadApprovalDetail(id);

        },

        error: (e) => {

          this.err.set(errMsg(e));

          this.loading.set(false);

        }

      });

  }

  loadApprovalDetail(committeeId: string) {
    this.approvalLoading.set(true);
    this.approvalError.set('');
    this.api.getApprovalDetailByCommittee(committeeId).subscribe({
      next: (d: any) => {
        this.approvalDetail.set(d);
        this.approvalLoading.set(false);
      },
      error: () => {
        this.approvalError.set('');
        this.approvalLoading.set(false);
      }
    });
  }

  openResolution(): void {

    this.tab.set('resolution');

    const id = this.docId();

    if (!id) {
      return;
    }

    if (this.doc()) {
      return;
    }

    if (this.docLoading()) {
      return;
    }

    this.docError.set('');

    this.docLoading.set(true);

    this.api
      .getDocument(id)
      .pipe(
        catchError((e) => {

          this.docLoading.set(false);

          this.docError.set(
            errMsg(e) || 'নথির তথ্য লোড করা যায়নি।'
          );

          return of(null);

        })
      )
      .subscribe(d => {

        if (d) {
          this.doc.set(d);
        }

        this.docLoading.set(false);

      });

  }

}