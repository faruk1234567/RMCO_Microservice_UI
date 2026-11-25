import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TaxProposalService } from './tax-proposal.service';
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

  // ---- শাখা - নতুন ----
  departments = signal<any[]>([]);
  branches = signal<any[]>([]);
  subBranches = signal<any[]>([]);
  private allBranches: any[] = [];

  isGovtDirective = computed(() => this.form?.get('sourceType')?.value === 'GOVT_DIRECTIVE');

  constructor(
    private fb: FormBuilder,
    private service: TaxProposalService,
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
      // ---- শাখা - নতুন ----
      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      subBranchId: [''],
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

    // ---- শাখা Load - নতুন ----
    this.loadBranches();
  }

  // ---- শাখা Methods - নতুন ----
    private loadBranches() {
    (this.service as any).listBranches?.().subscribe({
      next: (res: any) => {
        this.allBranches = this.toList(res);
        this.departments.set(this.allBranches.filter((b: any) => this.isDepartment(b)));
      },
      error: () => this.departments.set([])
    });
  }

  private isDepartment(b: any): boolean {
    const level = String(b.level ?? b.levelName ?? '').toUpperCase();
    return level === 'DEPARTMENT' || level === 'DIVISION' || level === 'বিভাগ' || !b.parentId;
  }

  private getParentId(b: any): any {
    return b.parentId ?? b.parent?.id ?? b.parentBranchId ?? null;
  }

  onDepartmentChange() {
    const deptId = this.form.get('departmentId')?.value;
    this.form.patchValue({ branchId: '', subBranchId: '' });
    this.subBranches.set([]);
    if (!deptId) { this.branches.set([]); return; }
    const filtered = this.allBranches.filter((b: any) => String(this.getParentId(b)) === String(deptId));
    if (filtered.length) { this.branches.set(filtered); return; }
    // allBranches এ না পাইলে parentId দিয়ে আবার Load
    (this.service as any).listBranches?.(deptId)?.subscribe({
      next: (res: any) => this.branches.set(this.toList(res)),
      error: () => this.branches.set([])
    });
  }

  onBranchChange() {
    const branchId = this.form.get('branchId')?.value;
    this.form.patchValue({ subBranchId: '' });
    if (!branchId) { this.subBranches.set([]); return; }
    const filtered = this.allBranches.filter((b: any) => String(this.getParentId(b)) === String(branchId));
    if (filtered.length) { this.subBranches.set(filtered); return; }
    // *** এখানে ঠিক করা হইছে - deptId -> branchId ***
    (this.service as any).listBranches?.(branchId)?.subscribe({
      next: (res: any) => this.subBranches.set(this.toList(res)),
      error: () => this.subBranches.set([])
    });
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
    const clean = (val: any) => (val === '' || val === undefined ? null : val);
    const cleanNum = (val: any) => (val === '' || val === null || val === undefined ? null : Number(val));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('প্রস্তাব নং, শিরোনাম (বাংলা), করের হার, বিভাগ + শাখা — এগুলো লাগবেই');
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
    // ---- শাখা Validation - নতুন ----
    if (!v.departmentId || !v.branchId) {
      this.error.set('বিভাগ + শাখা Select করেন');
      return;
    }

    let finalSourceType = v.sourceType;
    if (finalSourceType === 'COMMITTEE_PROPOSAL') {
      finalSourceType = 'MUNICIPAL';
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
      // ---- শাখা Payload - নতুন ----
      departmentId: clean(v.departmentId),
      branchId: clean(v.branchId),
      subBranchId: clean(v.subBranchId),
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
        methodCode: a.buildingCategory,
        enabled: !!a.enabled,
        basisType: a.baseMethod,
        deductMaintenance: !!a.maintenanceDeduction,
        deductMortgageNonCommercial: !!a.mortgageFullDeduction,
        deductMortgageCommercialOneThird: !!a.mortgageQuarterDeduction,
        compareWithMarketRent: !!a.comparableRent,
        note: clean(a.note?.trim())
      }))
    };
    this.service.create(payload).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/tax-proposals']); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'তৈরি করতে সমস্যা হয়েছে'); }
    });
  }
}