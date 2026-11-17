import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TaxproposalService } from './tax-proposal.service';
import { CommitteeService } from '../../core/services/committee.service';

@Component({
  selector: 'app-taxproposal-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './tax-proposal-create.component.html',
  styleUrls: ['./tax-proposal-create.component.css']
})
export class TaxproposalCreateComponent implements OnInit {
  form: FormGroup;
  saving = signal(false);
  error = signal('');

  // ড্রপডাউনের ডাটা
  proposalKinds = signal<any[]>([]);
  committees = signal<any[]>([]);
  taxTypes = signal<any[]>([]);

  isGovtDirective = computed(() => this.form?.get('sourceType')?.value === 'GOVT_DIRECTIVE');

  constructor(
    private fb: FormBuilder,
    private service: TaxproposalService,
    private committeeService: CommitteeService,
    private router: Router
  ) {
    this.form = this.fb.group({
      proposalNo: ['', Validators.required],
      sourceType: ['COMMITTEE_PROPOSAL', Validators.required],
      directiveId: [''],
      proposalKindId: [''],
      titleBn: ['', Validators.required],
      titleEn: [''],
      purposeType: ['NEW_TAX', Validators.required],
      purposeNote: [''],
      preparedByCommitteeId: [''],
      proposedEffectiveDate: [''],
      coverageNote: [''],
      collectionArrangement: [''],
      extraCollectionCost: [0],
      exceptionalNote: [''],
      items: this.fb.array([this.createItemGroup()]),
      financeHistory: this.fb.array([])
    });
  }

  ngOnInit() {
    // প্রস্তাবের ধরন
    (this.service as any).getProposalKinds?.().subscribe({
      next: (res: any) => this.proposalKinds.set(this.toList(res)),
      error: () => this.proposalKinds.set([])
    });

    // ✅ কমিটি - CommitteeService থেকে শুধু ACTIVE কমিটি আসবে
    this.committeeService.getActiveCommittees().subscribe({
      next: (res: any) => {
        const list = this.toList(res);
        this.committees.set(list);
        // যদি ১টাই সক্রিয় কমিটি থাকে, অটো সিলেক্ট হয়ে যাবে
        if (list.length === 1) {
          this.form.patchValue({ preparedByCommitteeId: list[0].id });
        }
      },
      error: () => this.committees.set([])
    });

    // করের ধরন
    (this.service as any).getTaxTypes?.().subscribe({
      next: (res: any) => this.taxTypes.set(this.toList(res)),
      error: () => this.taxTypes.set([])
    });
  }

  // Backend [] দিক বা {data: []} দিক - দুইটাই চলবে
  private toList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }

  // ---- করের হার - FormArray ----

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get itemsControls(): FormGroup[] {
    return this.itemsArray.controls as FormGroup[];
  }

  createItemGroup(): FormGroup {
    return this.fb.group({
      taxTypeId: ['', Validators.required],
      rateBasis: ['PERCENT', Validators.required],
      proposedRate: [null, Validators.required],
      proposedAnnualCollection: [null],
      existingRate: [null],
      existingAnnualCollection: [null],
      rateNote: ['']
    });
  }

  addItem() {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  // ---- আর্থিক ইতিহাস - FormArray ----

  get financeHistoryArray(): FormArray {
    return this.form.get('financeHistory') as FormArray;
  }

  get financeControls(): FormGroup[] {
    return this.financeHistoryArray.controls as FormGroup[];
  }

  createFinanceGroup(): FormGroup {
    return this.fb.group({
      fiscalYear: ['', Validators.required],
      incomeAmount: [null, Validators.required],
      expenseAmount: [null, Validators.required]
    });
  }

  addFinanceYear() {
    this.financeHistoryArray.push(this.createFinanceGroup());
  }

  removeFinanceYear(index: number) {
    this.financeHistoryArray.removeAt(index);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('প্রস্তাব নং, শিরোনাম (বাংলা), করের হার — এগুলো লাগবেই');
      return;
    }

    const v = this.form.value;

    if (v.sourceType === 'GOVT_DIRECTIVE' && !v.directiveId?.trim()) {
      this.error.set('GOVT_DIRECTIVE হলে Directive ID লাগবে');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const clean = (val: any) => (val === '' || val === undefined ? null : val);
    const cleanNum = (val: any) => (val === '' || val === null || val === undefined ? null : Number(val));

    const payload: any = {
      proposalNo: v.proposalNo.trim(),
      sourceType: v.sourceType,
      directiveId: clean(v.directiveId?.trim()),
      proposalKindId: clean(v.proposalKindId?.trim()),
      titleBn: v.titleBn.trim(),
      titleEn: clean(v.titleEn?.trim()),
      purposeType: v.purposeType,
      purposeNote: clean(v.purposeNote?.trim()),
      preparedByCommitteeId: clean(v.preparedByCommitteeId?.trim()),
      proposedEffectiveDate: clean(v.proposedEffectiveDate),
      coverageNote: clean(v.coverageNote?.trim()),
      collectionArrangement: clean(v.collectionArrangement?.trim()),
      extraCollectionCost: v.extraCollectionCost ?? 0,
      exceptionalNote: clean(v.exceptionalNote?.trim()),
      items: (v.items || []).map((it: any) => ({
        taxTypeId: clean(it.taxTypeId?.trim()),
        rateBasis: it.rateBasis,
        proposedRate: cleanNum(it.proposedRate),
        proposedAnnualCollection: cleanNum(it.proposedAnnualCollection),
        existingRate: cleanNum(it.existingRate),
        existingAnnualCollection: cleanNum(it.existingAnnualCollection),
        rateNote: clean(it.rateNote?.trim())
      })),
      financeHistory: (v.financeHistory || []).map((f: any) => ({
        fiscalYear: f.fiscalYear?.trim(),
        incomeAmount: cleanNum(f.incomeAmount),
        expenseAmount: cleanNum(f.expenseAmount)
      }))
    };

    this.service.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
       this.router.navigate(['/tax-proposals']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'তৈরি করতে সমস্যা হয়েছে');
      }
    });
  }
}