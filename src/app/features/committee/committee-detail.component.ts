// C-04 : কমিটির বিস্তারিত  (সদস্যদের সময়রেখা C-08 ও প্রস্তাব C-11 এর তথ্য payload-এ থাকলে দেখায়)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigService } from '../../core/services/config.service';
import { ENGINE_STYLES, Row, STATUS_BN, committeeName, entries, errMsg, fmtDate, maskMobile, pick } from './engine-shared';

type Tab = 'summary' | 'members' | 'resolution' | 'raw';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [ENGINE_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <a routerLink="/committee" class="muted">← কমিটির তালিকা</a>
          <h1>{{ title() }} @if (c()) { <span [class]="'st st-' + c()!['status']">{{ bn(c()!['status']) }}</span> }</h1>
        </div>
        @if (c() && c()!['status'] === 'DRAFT') {
          <a class="btn btn-primary" routerLink="/committee/create" [queryParams]="{ draftId: c()!['id'] }">খসড়া সম্পাদনা</a>
        }
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
      @else if (c()) {
        @if (c()!['status'] === 'PENDING_APPROVAL') {
          <div class="alert alert-info">অনুমোদন চলছে। অনুমোদনকারীরা সিদ্ধান্ত দিলে অবস্থা নিজে থেকে বদলাবে।</div>
        }
        @if (c()!['status'] === 'REJECTED') {
          <div class="alert alert-err">এই কমিটি প্রত্যাখ্যাত হয়েছে। @if (rejectReason()) { কারণ: {{ rejectReason() }} }</div>
        }

        <div class="tabs-row">
          <button class="tab-btn" [class.active]="tab() === 'summary'" (click)="tab.set('summary')">সংক্ষেপ</button>
          <button class="tab-btn" [class.active]="tab() === 'members'" (click)="tab.set('members')">সদস্য ({{ members().length }})</button>
          <button class="tab-btn" [class.active]="tab() === 'resolution'" (click)="openResolution()">প্রস্তাব ও নথি</button>
          <button class="tab-btn" [class.active]="tab() === 'raw'" (click)="tab.set('raw')">সম্পূর্ণ তথ্য</button>
        </div>

        @switch (tab()) {
          @case ('summary') {
            <div class="card mb-2"><div class="card-body">
              <dl class="kv">
                @for (e of kv(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }
              </dl>
            </div></div>
            @if (fieldRows().length) {
              <div class="card"><div class="card-header"><h3>বাড়তি তথ্য</h3></div><div class="card-body">
                <dl class="kv">@for (f of fieldRows(); track f[0]) { <dt>{{ f[0] }}</dt><dd>{{ f[1] }}</dd> }</dl>
              </div></div>
            }
          }
          @case ('members') {
            <div class="card"><div class="card-body table-wrapper">
              <table class="data-table">
                <thead><tr><th>নাম</th><th>পদবী</th><th>মোবাইল</th><th>অবস্থা</th><th>কার্যকরের তারিখ</th></tr></thead>
                <tbody>
                  @for (m of members(); track $index) {
                    <tr>
                      <td>{{ pick(m, 'name', 'nameBn', 'memberName', 'userName') || '—' }}</td>
                      <td>{{ desigOf(m) }}</td>
                      <td>{{ mask(pick(m, 'mobile', 'mobileNo', 'phone')) }}</td>
                      <td>@if (m['status']) { <span [class]="'st st-' + m['status']">{{ bn(m['status']) }}</span> } @else { — }</td>
                      <td>{{ fmt(pick(m, 'effectiveFrom', 'joinedAt', 'startDate')) }}</td>
                    </tr>
                  } @empty { <tr><td colspan="5" class="empty">এই কমিটির তথ্যে সদস্যের তালিকা পাওয়া যায়নি।</td></tr> }
                </tbody>
              </table>
              <p class="muted" style="margin-top:10px">সদস্য যোগ / ফেরত / প্রত্যাখ্যানের জন্য আলাদা API এখনো নেই, তাই সেই বোতামও এখানে নেই।</p>
            </div></div>
          }
          @case ('resolution') {
            <div class="card"><div class="card-body">
              <dl class="kv">
                <dt>প্রস্তাব নম্বর</dt><dd>{{ resolution()['number'] ?? '—' }}</dd>
                <dt>প্রস্তাবের তারিখ</dt><dd>{{ fmt(resolution()['date']) }}</dd>
                <dt>নথি</dt>
                <dd>
                  @if (docId()) {
                    @if (doc(); as d) {
                      {{ pick(d, 'fileName', 'originalName', 'name') || docId() }}
                      <span [class]="'st st-' + docStatus(d)">{{ bn(docStatus(d)) }}</span>
                      @if (docUrl(); as u) { <a [href]="u" target="_blank" rel="noopener" class="chip">খুলুন</a> }
                    } @else { {{ docId() }} }
                  } @else { সংযুক্ত নথি নেই }
                </dd>
              </dl>
            </div></div>
          }
          @case ('raw') { <pre class="json">{{ c() | json }}</pre> }
        }
      }
    </div>
  `,
})
export class CommitteeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(EngineApiService);
  private cfg = inject(ConfigService);

  c = signal<Row | null>(null);
  doc = signal<Row | null>(null);
  desigMap = signal<Record<string, string>>({});
  tab = signal<Tab>('summary');
  loading = signal(true); err = signal('');

  pick = pick; fmt = (v: any) => fmtDate(v); mask = maskMobile; bn = (s: string) => STATUS_BN[s] ?? s;
  private body = computed<Row>(() => this.c()?.['payload'] ?? this.c() ?? {});
  title = computed(() => (this.c() ? committeeName(this.c()!) : 'কমিটি'));
  kv = computed(() => entries(this.c()).filter(e => e.k !== 'id'));
  members = computed<Row[]>(() => this.c()?.['members'] ?? this.body()['members'] ?? []);
  resolution = computed<Row>(() => this.c()?.['resolution'] ?? this.body()['resolution'] ?? {});
  docId = computed<string>(() => this.resolution()['documentId'] ?? this.c()?.['resolutionDocumentId'] ?? '');
  fieldRows = computed(() => Object.entries(this.body()['fields'] ?? this.c()?.['fields'] ?? {}).map(([k, v]) => [k, String(v)]));
  rejectReason = computed(() => pick(this.c(), 'rejectReason', 'rejectionReason', 'comment'));
  docUrl = computed(() => pick(this.doc(), 'url', 'downloadUrl', 'fileUrl'));

  docStatus = (d: Row): string => d['scanStatus'] ?? d['status'] ?? '';

  desigOf(m: Row): string {
    return pick(m, 'designationName', 'designationNameBn') ?? this.desigMap()[m['designationId']] ?? '—';
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.cfg.listDesignations().pipe(catchError(() => of([]))).subscribe((l: any[]) =>
      this.desigMap.set(Object.fromEntries(l.map(d => [d.id, d.nameBn]))));
    this.api.getCommittee(id).subscribe({
      next: (r) => { this.c.set(r); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  openResolution() {
    this.tab.set('resolution');
    const id = this.docId();
    if (id && !this.doc()) this.api.getDocument(id).subscribe({ next: d => this.doc.set(d), error: () => {} });
  }
}
