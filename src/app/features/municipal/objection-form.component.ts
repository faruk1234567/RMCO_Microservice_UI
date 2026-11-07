// O-02 : আপত্তি জমা (SubmitObjectionRequest অনুযায়ী)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ObjectionApi } from '../../core/services/municipal-api.service';
import { DocumentUploaderComponent } from '../document/document-uploader.component';
import { MUNI_STYLES, RK, Recent, Row, clean, errMsg, isUuid, rid } from './municipal-shared';

@Component({
  selector: 'app-objection-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocumentUploaderComponent],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><div><a routerLink="/objections" class="muted">← আপত্তি</a><h1>নতুন আপত্তি জমা</h1></div></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (problems().length) { <div class="alert alert-warn"><ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }

      <div class="card mb-2"><div class="card-header"><h3>১. কীসের বিরুদ্ধে আপত্তি</h3></div><div class="card-body">
        <div class="grid3">
          <div class="form-group"><label>বিষয়ের ধরন <span class="required">*</span></label>
            <input class="form-control" list="subjTypes" [(ngModel)]="f.subjectType" />
            <datalist id="subjTypes">@for (h of subjectHints; track h) { <option [value]="h"></option> }</datalist></div>
          <div class="form-group"><label>বিষয়ের ID (যেমন কর প্রস্তাবের ID) <span class="required">*</span></label><input class="form-control" [(ngModel)]="f.subjectId" placeholder="UUID" /></div>
          <div class="form-group"><label>হোল্ডিং ID <span class="required">*</span></label><input class="form-control" [(ngModel)]="f.holdingId" placeholder="UUID" /></div>
        </div>
      </div></div>

      <div class="card mb-2"><div class="card-header"><h3>২. আপত্তিকারী</h3></div><div class="card-body">
        <div class="grid2">
          <div class="form-group"><label>আপত্তিকারীর নাম <span class="required">*</span></label><input class="form-control" [(ngModel)]="f.objectorName" /></div>
          <div class="form-group"><label>আপত্তিকারীর ধরন <span class="required">*</span></label>
            <input class="form-control" list="kinds" [(ngModel)]="f.objectorKind" />
            <datalist id="kinds">@for (h of kindHints; track h) { <option [value]="h"></option> }</datalist></div>
        </div>
      </div></div>

      <div class="card mb-2"><div class="card-header"><h3>৩. আপত্তির বিবরণ</h3></div><div class="card-body">
        @for (r of form; track $index; let i = $index) {
          <div class="form-group">
            <div class="row-actions" style="justify-content:space-between">
              <label style="margin:0"><input class="form-control" style="max-width:220px;display:inline-block" [(ngModel)]="r.k" placeholder="শিরোনাম (key)" /></label>
              @if (form.length > 1) { <button class="btn-ghost btn-sm" (click)="form.splice(i, 1)">সরান</button> }
            </div>
            <textarea class="form-control" rows="3" [(ngModel)]="r.v" style="margin-top:6px"></textarea>
          </div>
        }
        <button class="btn-ghost btn-sm" (click)="form.push({ k: '', v: '' })">+ আরেকটি তথ্য যোগ করুন</button>
        <div class="section-title" style="margin-top:14px">সংযুক্তি (ঐচ্ছিক)</div>
        <app-document-uploader (ready)="docId.set($any($event)['id'])" (cleared)="docId.set('')" />
      </div></div>

      <div class="toolbar"><span class="grow"></span>
        <button class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'অপেক্ষা করুন...' : 'আপত্তি জমা দিন' }}</button></div>
    </div>
  `,
})
export class ObjectionFormComponent implements OnInit {
  private api = inject(ObjectionApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ⚠ এই মানগুলো কেবল পরামর্শ; আপনার সিস্টেমের আসল কোড লিখুন
  subjectHints = ['TAX_PROPOSAL'];
  kindHints = ['HOLDING_OWNER', 'CITIZEN', 'ORGANIZATION'];
  f = { subjectType: 'TAX_PROPOSAL', subjectId: '', holdingId: '', objectorName: '', objectorKind: '' };
  // ⚠ formValues-এর key-গুলো backend-এর ফর্ম-নীতি অনুযায়ী হওয়া দরকার হতে পারে; সেক্ষেত্রে key বদলান
  form: { k: string; v: string }[] = [{ k: 'reason', v: '' }, { k: 'details', v: '' }];
  docId = signal('');
  busy = signal(false); err = signal(''); problems = signal<string[]>([]);

  ngOnInit() { const pid = this.route.snapshot.queryParamMap.get('proposalId'); if (pid) this.f.subjectId = pid; }

  submit() {
    const p: string[] = [];
    if (!this.f.subjectType.trim()) p.push('বিষয়ের ধরন দিন');
    if (!isUuid(this.f.subjectId)) p.push('বিষয়ের ID সঠিক UUID নয়');
    if (!isUuid(this.f.holdingId)) p.push('হোল্ডিং ID সঠিক UUID নয়');
    if (!this.f.objectorName.trim()) p.push('আপত্তিকারীর নাম দিন');
    if (!this.f.objectorKind.trim()) p.push('আপত্তিকারীর ধরন দিন');
    const formValues: Row = {};
    this.form.filter(r => r.k.trim() && r.v.trim()).forEach(r => (formValues[r.k.trim()] = r.v.trim()));
    if (!Object.keys(formValues).length) p.push('আপত্তির বিবরণ লিখুন');
    this.problems.set(p); if (p.length) return;
    if (this.docId()) formValues['attachmentDocumentId'] = this.docId();

    this.busy.set(true); this.err.set('');
    this.api.submit({ ...clean(this.f), formValues }).subscribe({
      next: (r) => {
        this.busy.set(false); const id = rid(r);
        if (id) { Recent.add(RK.objection, id, String(r['objectionNo'] ?? this.f.objectorName)); this.router.navigate(['/objections', id]); } else this.router.navigate(['/objections']);
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
