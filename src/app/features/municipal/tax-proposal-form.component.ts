// T-02 : নতুন কর প্রস্তাব (CreateTaxProposalRequest অনুযায়ী)
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TaxProposalApi } from '../../core/services/municipal-api.service';
import { CommitteeSelectComponent } from './committee-select.component';
import { MasterSelectComponent } from './master-select.component';
import { MUNI_STYLES, RK, Recent, clean, errMsg, isUuid, rid } from './municipal-shared';

interface Item { taxTypeId: string; rateBasis: string; proposedRate: number | null; proposedAnnualCollection: number | null;
  existingRate: number | null; existingAnnualCollection: number | null; rateNote: string; }
interface Fin { fiscalYear: string; incomeAmount: number | null; expenseAmount: number | null; }
const blankItem = (): Item => ({ taxTypeId: '', rateBasis: '', proposedRate: null, proposedAnnualCollection: null, existingRate: null, existingAnnualCollection: null, rateNote: '' });

@Component({
  selector: 'app-tax-proposal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommitteeSelectComponent, MasterSelectComponent],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><div><a routerLink="/tax-proposals" class="muted">← কর প্রস্তাব</a><h1>নতুন কর প্রস্তাব</h1></div></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (problems().length) { <div class="alert alert-warn">জমা দেওয়ার আগে ঠিক করুন:<ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }

      <div class="card mb-2"><div class="card-header"><h3>১. মূল তথ্য</h3></div><div class="card-body">
        <div class="grid3">
          <div class="form-group"><label>প্রস্তাব নম্বর <span class="required">*</span></label><input class="form-control" [(ngModel)]="f.proposalNo" /></div>
          <div class="form-group"><label>উৎস <span class="required">*</span></label>
            <select class="form-control" [(ngModel)]="f.sourceType">
              <option value="MUNICIPAL">পৌরসভার নিজস্ব</option><option value="GOVT_DIRECTIVE">সরকারি নির্দেশনা</option>
            </select></div>
          @if (f.sourceType === 'GOVT_DIRECTIVE') {
            <div class="form-group"><label>নির্দেশনার ID</label><input class="form-control" [(ngModel)]="f.directiveId" placeholder="UUID" /></div>
          } @else { <div></div> }
        </div>
        <div class="grid2">
          <div class="form-group"><label>শিরোনাম (বাংলা) <span class="required">*</span></label><input class="form-control" [(ngModel)]="f.titleBn" /></div>
          <div class="form-group"><label>Title (English)</label><input class="form-control" [(ngModel)]="f.titleEn" /></div>
        </div>
        <div class="grid3">
          <div class="form-group"><label>প্রস্তাবের ধরন (kind)</label><app-master-select group="PROPOSAL_KIND" [(value)]="f.proposalKindId" /></div>
          <div class="form-group"><label>উদ্দেশ্যের ধরন <span class="required">*</span></label>
            <input class="form-control" list="purposes" [(ngModel)]="f.purposeType" placeholder="যেমন NEW_TAX" />
            <datalist id="purposes">@for (h of purposeHints; track h) { <option [value]="h"></option> }</datalist></div>
          <div class="form-group"><label>প্রস্তুতকারী কমিটি</label><app-committee-select [(value)]="f.preparedByCommitteeId" /></div>
        </div>
        <div class="form-group"><label>উদ্দেশ্যের বিবরণ</label><textarea class="form-control" rows="2" [(ngModel)]="f.purposeNote"></textarea></div>
      </div></div>

      <div class="card mb-2"><div class="card-header"><h3>২. কার্যকর ও আদায়ের ব্যবস্থা</h3></div><div class="card-body">
        <div class="grid2">
          <div class="form-group"><label>প্রস্তাবিত কার্যকরের তারিখ</label><input type="date" class="form-control" [(ngModel)]="f.proposedEffectiveDate" /></div>
          <div class="form-group"><label>অতিরিক্ত আদায় ব্যয় (টাকা)</label><input type="number" min="0" class="form-control" [(ngModel)]="f.extraCollectionCost" /></div>
        </div>
        <div class="form-group"><label>কভারেজ (কাদের ওপর প্রযোজ্য)</label><textarea class="form-control" rows="2" [(ngModel)]="f.coverageNote"></textarea></div>
        <div class="form-group"><label>আদায়ের ব্যবস্থা</label><textarea class="form-control" rows="2" [(ngModel)]="f.collectionArrangement"></textarea></div>
        <div class="form-group"><label>ব্যতিক্রমী বিষয়</label><textarea class="form-control" rows="2" [(ngModel)]="f.exceptionalNote"></textarea></div>
      </div></div>

      <datalist id="bases">@for (h of basisHints; track h) { <option [value]="h"></option> }</datalist>
      <div class="card mb-2"><div class="card-header"><h3>৩. করের হার</h3></div><div class="card-body">
        @for (it of items; track $index; let i = $index) {
          <div class="sub-card">
            <div class="row-actions" style="justify-content:space-between;margin-bottom:8px">
              <strong>হার {{ i + 1 }}</strong>
              @if (items.length > 1) { <button class="btn-ghost btn-sm" (click)="items.splice(i, 1)">সরান</button> }
            </div>
            <div class="grid3">
              <div class="form-group"><label>করের ধরন <span class="required">*</span></label><app-master-select group="TAX_TYPE" [(value)]="it.taxTypeId" /></div>
              <div class="form-group"><label>হারের ভিত্তি <span class="required">*</span></label>
                <input class="form-control" list="bases" [(ngModel)]="it.rateBasis" placeholder="যেমন PERCENT" /></div>
              <div class="form-group"><label>হারের নোট</label><input class="form-control" [(ngModel)]="it.rateNote" /></div>
            </div>
            <div class="grid4">
              <div class="form-group"><label>প্রস্তাবিত হার <span class="required">*</span></label><input type="number" min="0" class="form-control" [(ngModel)]="it.proposedRate" /></div>
              <div class="form-group"><label>প্রস্তাবিত বার্ষিক আদায়</label><input type="number" min="0" class="form-control" [(ngModel)]="it.proposedAnnualCollection" /></div>
              <div class="form-group"><label>বর্তমান হার</label><input type="number" min="0" class="form-control" [(ngModel)]="it.existingRate" /></div>
              <div class="form-group"><label>বর্তমান বার্ষিক আদায়</label><input type="number" min="0" class="form-control" [(ngModel)]="it.existingAnnualCollection" /></div>
            </div>
            <div class="muted">হার পরিবর্তন: <strong>{{ change(it) }}</strong></div>
          </div>
        }
        <button class="btn-ghost" (click)="items.push(blank())">+ আরেকটি হার যোগ করুন</button>
      </div></div>

      <div class="card mb-2"><div class="card-header"><h3>৪. আর্থিক ইতিহাস (বিগত বছর)</h3></div><div class="card-body">
        @for (r of finance; track $index; let i = $index) {
          <div class="row-actions" style="margin-bottom:8px">
            <input class="form-control" style="max-width:160px" placeholder="অর্থবছর (2025-26)" [(ngModel)]="r.fiscalYear" />
            <input type="number" min="0" class="form-control" style="max-width:180px" placeholder="আয় (টাকা)" [(ngModel)]="r.incomeAmount" />
            <input type="number" min="0" class="form-control" style="max-width:180px" placeholder="ব্যয় (টাকা)" [(ngModel)]="r.expenseAmount" />
            <span class="muted">উদ্বৃত্ত: {{ surplus(r) }}</span>
            <button class="btn-ghost btn-sm" (click)="finance.splice(i, 1)">সরান</button>
          </div>
        } @empty { <div class="muted" style="margin-bottom:8px">এখনো কোনো বছর যোগ হয়নি (ঐচ্ছিক)।</div> }
        <button class="btn-ghost" (click)="finance.push({ fiscalYear: '', incomeAmount: null, expenseAmount: null })">+ বছর যোগ করুন</button>
      </div></div>

      <div class="toolbar">
        <span class="grow"></span>
        <button class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'অপেক্ষা করুন...' : 'প্রস্তাব তৈরি করুন' }}</button>
      </div>
    </div>
  `,
})
export class TaxProposalFormComponent {
  private api = inject(TaxProposalApi);
  private router = inject(Router);

  // ⚠ নিচের কোডগুলো কেবল পরামর্শ (datalist); আপনার সিস্টেমের আসল মান লিখলেও চলবে
  purposeHints = ['NEW_TAX', 'RATE_INCREASE', 'RATE_DECREASE', 'GOVT_DIRECTIVE'];
  basisHints = ['PERCENT', 'FLAT', 'PER_UNIT'];

  f = {
    proposalNo: '', sourceType: 'MUNICIPAL', directiveId: '', proposalKindId: '', titleBn: '', titleEn: '', purposeType: '', purposeNote: '',
    preparedByCommitteeId: '', coverageNote: '', collectionArrangement: '', extraCollectionCost: null as number | null,
    exceptionalNote: '', proposedEffectiveDate: '',
  };
  items: Item[] = [blankItem()];
  finance: Fin[] = [];
  busy = signal(false); err = signal(''); problems = signal<string[]>([]);
  blank = blankItem;

  change(it: Item): string {
    if (it.proposedRate == null || !it.existingRate) return '—';
    const p = ((it.proposedRate - it.existingRate) / it.existingRate) * 100;
    return (p > 0 ? '+' : '') + p.toFixed(1) + '%';
  }
  surplus(r: Fin): string { return r.incomeAmount == null || r.expenseAmount == null ? '—' : String(r.incomeAmount - r.expenseAmount); }

  private check(): string[] {
    const p: string[] = []; const f = this.f;
    if (!f.proposalNo.trim()) p.push('প্রস্তাব নম্বর দিন');
    if (!f.titleBn.trim()) p.push('বাংলা শিরোনাম দিন');
    if (!f.purposeType.trim()) p.push('উদ্দেশ্যের ধরন দিন');
    if (f.sourceType === 'GOVT_DIRECTIVE' && !f.directiveId.trim()) p.push('সরকারি নির্দেশনার ID দিন');
    ([['নির্দেশনার ID', f.directiveId], ['প্রস্তাবের ধরন', f.proposalKindId], ['প্রস্তুতকারী কমিটি', f.preparedByCommitteeId]] as [string, string][])
      .forEach(([n, v]) => { if (v.trim() && !isUuid(v)) p.push(`${n} সঠিক UUID নয়`); });
    if (!this.items.length) p.push('কমপক্ষে একটি করের হার দিন');
    this.items.forEach((it, i) => {
      if (!isUuid(it.taxTypeId)) p.push(`হার ${i + 1}: করের ধরন বাছাই করুন`);
      if (!it.rateBasis.trim()) p.push(`হার ${i + 1}: হারের ভিত্তি দিন`);
      if (it.proposedRate == null || it.proposedRate < 0) p.push(`হার ${i + 1}: প্রস্তাবিত হার দিন`);
    });
    this.finance.forEach((r, i) => {
      if (!r.fiscalYear.trim()) p.push(`আর্থিক ইতিহাস ${i + 1}: অর্থবছর দিন`);
      if (r.incomeAmount == null || r.expenseAmount == null) p.push(`আর্থিক ইতিহাস ${i + 1}: আয় ও ব্যয় দুটোই দিন`);
    });
    return p;
  }

  submit() {
    const p = this.check(); this.problems.set(p); if (p.length) return;
    const body = {
      ...clean(this.f),
      items: this.items.map(it => clean(it)),
      financeHistory: this.finance.map(r => clean(r)),
    };
   if (this.f.sourceType !== 'GOVT_DIRECTIVE') delete (body as any).directiveId;
    this.busy.set(true); this.err.set('');
    this.api.create(body).subscribe({
      next: (r) => {
        this.busy.set(false); const id = rid(r);
        if (id) { Recent.add(RK.tax, id, this.f.titleBn.trim()); this.router.navigate(['/tax-proposals', id]); } else this.router.navigate(['/tax-proposals']);
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
