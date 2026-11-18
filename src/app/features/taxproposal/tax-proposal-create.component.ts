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

  proposalKinds = signal<any[]>([]);
  committees = signal<any[]>([]);
  taxTypes = signal<any[]>([]);
  rateBases = signal<any[]>([]);
  purposeTypes = signal<any[]>([]);
  assessmentOptions = signal<any[]>([]);

  isGovtDirective = computed(() => this.form?.get('sourceType')?.value === 'GOVT_DIRECTIVE');

  constructor(
    private fb: FormBuilder,
    private service: TaxproposalService,
    private committeeService: CommitteeService,
    private router: Router
  ) {
    this.form = this.fb.group({
      proposalNo: ['', Validators.required],
    sourceType: ['MUNICIPAL', Validators.required],
      directiveId: [''],
      proposalKindId: [''],
      titleBn: ['', Validators.required],
      titleEn: [''],
      purposeType: ['', Validators.required],
      purposeNote: [''],
      preparedByCommitteeId: [''],
      proposedEffectiveDate: [''],
      coverageNote: [''],
      collectionArrangement: [''],
      extraCollectionCost: [0],
      exceptionalNote: [''],
      items: this.fb.array([this.createItemGroup()]),
      financeHistory: this.fb.array([]),
      assessmentMethods: this.fb.array([
        this.createAssessmentGroup('FULLY_RENTED', 'সম্পূর্ণ ভাড়া দেওয়া ইমারত — বিধি ১৮(২)(ক)'),
        this.createAssessmentGroup('FULLY_OCCUPIED', 'সম্পূর্ণ দখলকৃত ইমারত — বিধি ১৮(২)(খ)'),
        this.createAssessmentGroup('PARTIAL', 'আংশিক ভাড়া + আংশিক দখল — বিধি ১৮(২)(গ)'),
      ])
    });
  }

  ngOnInit() {
    (this.service as any).getProposalKinds?.().subscribe({ next: (res: any) => this.proposalKinds.set(this.toList(res)), error: () => this.proposalKinds.set([]) });
    this.committeeService.getActiveCommittees().subscribe({
      next: (res: any) => {
        const list = this.toList(res);
        this.committees.set(list);
        if (list.length === 1) this.form.patchValue({ preparedByCommitteeId: list[0].id });
      },
      error: () => this.committees.set([])
    });
    (this.service as any).getTaxTypes?.().subscribe({ next: (res: any) => this.taxTypes.set(this.toList(res)), error: () => this.taxTypes.set([]) });
    (this.service as any).getRateBases?.().subscribe({ next: (res: any) => this.rateBases.set(this.toList(res)), error: () => this.rateBases.set([]) });
    (this.service as any).getPurposeTypes?.().subscribe({ next: (res: any) => this.purposeTypes.set(this.toList(res)), error: () => this.purposeTypes.set([]) });
    (this.service as any).getAssessmentOptions?.().subscribe({ next: (res: any) => this.assessmentOptions.set(this.toList(res)), error: () => this.assessmentOptions.set([]) });
  }

  private toList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }

  get itemsArray(): FormArray { return this.form.get('items') as FormArray; }
  get itemsControls(): FormGroup[] { return this.itemsArray.controls as FormGroup[]; }
  createItemGroup(): FormGroup {
    return this.fb.group({
      taxTypeId: ['', Validators.required],
      rateBasis: ['', Validators.required],
      proposedRate: [null, Validators.required],
      maxRate: [null],
      proposedAnnualCollection: [null],
      existingRate: [null],
      existingAnnualCollection: [null],
      rateNote: ['']
    });
  }
  addItem() { this.itemsArray.push(this.createItemGroup()); }
  removeItem(i: number) { if (this.itemsArray.length > 1) this.itemsArray.removeAt(i); }

  get financeHistoryArray(): FormArray { return this.form.get('financeHistory') as FormArray; }
  get financeControls(): FormGroup[] { return this.financeHistoryArray.controls as FormGroup[]; }
  createFinanceGroup(): FormGroup {
    return this.fb.group({ fiscalYear: ['', Validators.required], incomeAmount: [null, Validators.required], expenseAmount: [null, Validators.required] });
  }
  addFinanceYear() { this.financeHistoryArray.push(this.createFinanceGroup()); }
  removeFinanceYear(i: number) { this.financeHistoryArray.removeAt(i); }

  get assessmentArray(): FormArray { return this.form.get('assessmentMethods') as FormArray; }
  get assessmentControls(): FormGroup[] { return this.assessmentArray.controls as FormGroup[]; }
  createAssessmentGroup(category: string, label: string): FormGroup {
    return this.fb.group({
      buildingCategory: [category],
      label: [label],
      enabled: [true],
      maintenanceDeduction: [true],
      mortgageFullDeduction: [true],
      mortgageQuarterDeduction: [true],
      comparableRent: [true],
      baseMethod: ['MIN_POSSIBLE_RENT_OR_7_5_PERCENT'],
      maintenanceSixth: [true],
      quarterAfterMaintenance: [true],
      note: ['']
    });
  }

  isOverMax(item: FormGroup): boolean {
    const p = item.get('proposedRate')?.value;
    const m = item.get('maxRate')?.value;
    if (p == null || m == null) return false;
    return Number(p) > Number(m);
  }

  submit() {
    // *** clean কে সবার আগে বানালাম, ব্যবহারের আগে ***
    const clean = (val: any) => (val === '' || val === undefined ? null : val);
    const cleanNum = (val: any) => (val === '' || val === null || val === undefined ? null : Number(val));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('প্রস্তাব নং, শিরোনাম (বাংলা), করের হার — এগুলো লাগবেই');
      return;
    }
    if (this.itemsControls.some(g => this.isOverMax(g))) {
      this.error.set('প্রস্তাবিত হার আদর্শ তফসিলের সর্বোচ্চ হারের বেশি হইছে — সেভ হবে না');
      return;
    }
    const v = this.form.value;
    if (v.sourceType === 'GOVT_DIRECTIVE' && !v.directiveId?.trim()) {
      this.error.set('GOVT_DIRECTIVE হলে Directive ID লাগবে');
      return;
    }

    // *** এইটাই আসল ঠিক ***
    // COMMITTEE_PROPOSAL হলে directive খালি রাখা যাবে না - DB চেক আটকাবে
    // তাই directive না দিলে কমিটির ID-ই directive হবে
   let finalSourceType = v.sourceType;
if (finalSourceType === 'COMMITTEE_PROPOSAL') {
  finalSourceType = 'MUNICIPAL'; // DB তে COMMITTEE_PROPOSAL নাই
}
let finalDirectiveId = clean(v.directiveId?.trim());
if (v.sourceType === 'MUNICIPAL') {
  finalDirectiveId = null;
}
    this.saving.set(true);
    this.error.set('');
    const payload: any = {
      proposalNo: v.proposalNo.trim(),
     sourceType: finalSourceType,
      directiveId: finalDirectiveId,
      proposalKindId: clean(v.proposalKindId),
      titleBn: v.titleBn.trim(),
      titleEn: clean(v.titleEn?.trim()),
      purposeType: v.purposeType,
      purposeNote: clean(v.purposeNote?.trim()),
      preparedByCommitteeId: clean(v.preparedByCommitteeId),
      proposedEffectiveDate: clean(v.proposedEffectiveDate),
      coverageNote: clean(v.coverageNote?.trim()),
      collectionArrangement: clean(v.collectionArrangement?.trim()),
      extraCollectionCost: v.extraCollectionCost ?? 0,
      exceptionalNote: clean(v.exceptionalNote?.trim()),
      items: (v.items || []).map((it: any) => ({
        taxTypeId: clean(it.taxTypeId),
        rateBasis: it.rateBasis,
        proposedRate: cleanNum(it.proposedRate),
        maxRate: cleanNum(it.maxRate),
        proposedAnnualCollection: cleanNum(it.proposedAnnualCollection),
        existingRate: cleanNum(it.existingRate),
        existingAnnualCollection: cleanNum(it.existingAnnualCollection),
        rateNote: clean(it.rateNote?.trim())
      })),
      financeHistory: (v.financeHistory || []).map((f: any) => ({
        fiscalYear: f.fiscalYear?.trim(),
        incomeAmount: cleanNum(f.incomeAmount),
        expenseAmount: cleanNum(f.expenseAmount)
      })),
      assessmentMethods: (v.assessmentMethods || []).map((a: any) => ({
        buildingCategory: a.buildingCategory,
        enabled: !!a.enabled,
        maintenanceDeduction: !!a.maintenanceDeduction,
        mortgageFullDeduction: !!a.mortgageFullDeduction,
        mortgageQuarterDeduction: !!a.mortgageQuarterDeduction,
        comparableRent: !!a.comparableRent,
        baseMethod: a.baseMethod,
        maintenanceSixth: !!a.maintenanceSixth,
        quarterAfterMaintenance: !!a.quarterAfterMaintenance,
        note: clean(a.note?.trim())
      }))
    };
    this.service.create(payload).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/tax-proposals']); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'তৈরি করতে সমস্যা হয়েছে'); }
    });
  }
}