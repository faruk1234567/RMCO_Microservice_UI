// B-08 : অনুমোদন রুট তৈরি (id = new) / শুধু-দেখা (id = অন্য কিছু)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfigService } from '../../core/services/config.service';
import { ApprovalRoute, ApprovalStep, ApproverType, Designation } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg } from './config-shared';
import { ConfigAdminService } from './config-admin.service';

@Component({
  selector: 'app-route-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <a routerLink="/config/routes" class="muted">← রুটের তালিকা</a>
         <h1>{{ isNew() ? 'নতুন অনুমোদন রুট' : (route().nameBn || 'অনুমোদন রুট') }}</h1>
        </div>
      </div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
      @else {
        @if (!isNew()) { <div class="alert alert-warn">তৈরি হওয়া রুট বদলানো যায় না, শুধু দেখা যায়।</div> }

        <div class="card mb-2"><div class="card-body">
          <div class="grid3">
            <div class="form-group"><label>কোড <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="route().code" [disabled]="!isNew()" placeholder="WARD_TO_CIRCLE" /></div>
            <div class="form-group"><label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="route().nameBn" [disabled]="!isNew()" /></div>
            <div class="form-group"><label>Name (English)</label>
              <input class="form-control" [(ngModel)]="route().nameEn" [disabled]="!isNew()" /></div>
          </div>
        </div></div>

        <div class="section-title">অনুমোদনের ধাপ</div>
        @for (s of route().steps; track $index; let i = $index) {
          <div class="card mb-2"><div class="card-body">
            <div class="row-actions" style="justify-content:space-between;margin-bottom:8px">
              <strong>ধাপ {{ s.levelNo }}</strong>
              @if (isNew() && route().steps.length > 1) { <button class="btn-ghost btn-sm" (click)="removeStep(i)">ধাপ সরান</button> }
            </div>
            <div class="grid3">
              <div class="form-group"><label>অনুমোদনকারীর ধরন</label>
                <select class="form-control" [(ngModel)]="s.approverType" [disabled]="!isNew()" (ngModelChange)="s.approverRef = null">
                  @for (t of approverTypes; track t.v) { <option [value]="t.v">{{ t.l }}</option> }
                </select></div>
              <div class="form-group"><label>অনুমোদনকারী</label>
                @if (s.approverType === 'PARENT_COMMITTEE') { <div class="muted" style="padding-top:8px">কার্যপরিধির parent কমিটি নিজে থেকে নির্ধারিত হবে</div> }
                @else if (s.approverType === 'DESIGNATION') {
                  <select class="form-control" [(ngModel)]="s.approverRef" [disabled]="!isNew()">
                    <option [ngValue]="null">— পদবী —</option>
                    @for (d of designations(); track d.id) { <option [ngValue]="d.id">{{ d.nameBn }}</option> }
                  </select>
                } @else {
                  <input class="form-control" [(ngModel)]="s.approverRef" [disabled]="!isNew()"
                         [placeholder]="s.approverType === 'ROLE' ? 'Role কোড (যেমন MAYOR)' : 'ব্যবহারকারীর ID'" />
                }</div>
              <div class="form-group"><label>সময়সীমা (SLA, ঘণ্টা)</label>
                <input type="number" min="1" class="form-control" [(ngModel)]="s.slaHours" [disabled]="!isNew()" placeholder="৪৮" /></div>
            </div>
            <div class="grid2">
              <div class="form-group"><label>সময় পেরোলে escalate হবে (Role/ব্যবহারকারী, ঐচ্ছিক)</label>
                <input class="form-control" [(ngModel)]="s.escalateToRef" [disabled]="!isNew()" /></div>
              <div class="form-group"><label>বিকল্প অনুমোদনকারী (ঐচ্ছিক)</label>
                <input class="form-control" [(ngModel)]="s.fallbackRef" [disabled]="!isNew()" /></div>
            </div>
          </div></div>
        } @empty { <div class="empty">কোনো ধাপ নেই</div> }

        @if (isNew()) {
          <div class="toolbar">
            <button class="btn-ghost" (click)="addStep()">+ ধাপ যোগ করুন</button>
            <span class="grow"></span>
            <button class="btn btn-primary" [disabled]="saving() || !canSave()" (click)="create()">{{ saving() ? 'সংরক্ষণ হচ্ছে...' : 'রুট তৈরি করুন' }}</button>
          </div>
          @if (problems().length) {
            <div class="alert alert-warn"><ul>@for (p of problems(); track p) { <li>{{ p }}</li> }</ul></div>
          }
        }
      }
    </div>
  `,
})
export class RouteEditorComponent implements OnInit {
  private ar = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ConfigAdminService);
  private cfg = inject(ConfigService);

  approverTypes: { v: ApproverType; l: string }[] = [
    { v: 'PARENT_COMMITTEE', l: 'ঊর্ধ্বতন (parent) কমিটি' },
    { v: 'DESIGNATION', l: 'নির্দিষ্ট পদবী' },
    { v: 'ROLE', l: 'Role' },
    { v: 'USER', l: 'নির্দিষ্ট ব্যবহারকারী' },
  ];

  isNew = signal(true);
  route = signal<ApprovalRoute>({ code: '', nameBn: '', nameEn: '', steps: [this.blank(1)] });
  designations = signal<Designation[]>([]);
  loading = signal(true); saving = signal(false); err = signal('');

  problems = computed(() => {
    const r = this.route(); const p: string[] = [];
    if (!r.code.trim() || !r.nameBn.trim()) p.push('কোড ও বাংলা নাম দিন।');
    r.steps.forEach(s => {
      if (s.approverType !== 'PARENT_COMMITTEE' && !s.approverRef) p.push(`ধাপ ${s.levelNo}: অনুমোদনকারী বাছাই করুন।`);
      if (!s.slaHours || s.slaHours < 1) p.push(`ধাপ ${s.levelNo}: সময়সীমা (ঘণ্টা) দিন।`);
    });
    return p;
  });
  canSave = () => this.problems().length === 0;

  private blank(levelNo: number): ApprovalStep {
    return { levelNo, approverType: 'PARENT_COMMITTEE', approverRef: null, slaHours: 48, escalateToRef: null, fallbackRef: null };
  }

  ngOnInit() {
    const id = this.ar.snapshot.paramMap.get('id');
    this.cfg.listDesignations().subscribe({ next: (l: Designation[]) => this.designations.set(l), error: () => {} });
    if (!id || id === 'new') { this.loading.set(false); return; }
    this.isNew.set(false);
    this.svc.getRoute(id).subscribe({
      next: (r: any) => {
        // ★ FIX: Backend কখনো Array, কখনো { data: [...] }, কখনো { data: {...} }, কখনো Single Object পাঠায়
        // তাই ৪টা Case-ই Handle করতে হবে, নইলে code খালি দেখাবে আর Placeholder WARD_TO_CIRCLE দেখাবে
        const pickOne = (raw: any): any => {
          if (!raw) return null;
          // Case 1: { success: true, data: [...] } -> data Array
          // Case 2: { success: true, data: {...} } -> data Object
          const d = raw?.data ?? raw;
          if (Array.isArray(d)) {
            return d.find((x: any) => String(x?.id) === String(id)) ?? null;
          }
          return d;
        };

        const obj = pickOne(r);
        if (!obj) {
          this.err.set('রুট পাওয়া যায়নি');
          this.loading.set(false);
          return;
        }

        const rawSteps = obj.steps ?? obj.approvalSteps ?? [];
        const steps = (Array.isArray(rawSteps) ? rawSteps : [])
          .sort((a: any, b: any) => (a.stepNo ?? a.levelNo ?? 0) - (b.stepNo ?? b.levelNo ?? 0))
          .map((s: any, idx: number) => ({
            levelNo: Number(s.stepNo ?? s.levelNo ?? idx + 1),
            approverType: s.approverKind ?? s.approverType ?? 'DESIGNATION',
            approverRef: s.approverRefId ?? s.approverRef ?? s.approverId ?? null,
            slaHours: Number(s.slaHours ?? 48),
            escalateToRef: s.escalateToRefId ?? s.escalateToRef ?? null,
            fallbackRef: s.fallbacks?.[0]?.fallbackRefId ?? s.fallbackRef ?? null,
          }));

        this.route.set({
          code: String(obj.code ?? obj.routeCode ?? ''),
          nameBn: String(obj.nameBn ?? obj.name ?? ''),
          nameEn: String(obj.nameEn ?? ''),
          steps: steps.length ? steps : [this.blank(1)],
        });
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(errMsg(e));
        this.loading.set(false);
      }
    });
  }

  addStep() { const r = this.route(); this.route.set({ ...r, steps: [...r.steps, this.blank(r.steps.length + 1)] }); }
  removeStep(i: number) {
    const r = this.route();
    this.route.set({ ...r, steps: r.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, levelNo: idx + 1 })) });
  }

  create() {
    this.saving.set(true);
    this.err.set('');
    const r = this.route();
    const payload = {
      code: r.code.trim(),
      name: r.nameBn.trim(),
      nameBn: r.nameBn.trim(),
      steps: r.steps.map(s => ({
        stepNo: Number(s.levelNo),
        approverKind: s.approverType,
        approverRefId: s.approverRef ? String(s.approverRef) : null,
        slaHours: Number(s.slaHours),
        escalateToRefId: s.escalateToRef || null,
        fallbacks: []
      }))
    };
    console.log('CREATE ROUTE PAYLOAD:', JSON.stringify(payload, null, 2));
    this.svc.createRoute(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/config/routes']);
      },
      error: (e) => {
        this.saving.set(false);
        this.err.set(errMsg(e));
        console.error('CREATE ROUTE ERROR:', e);
      }
    });
  }
}