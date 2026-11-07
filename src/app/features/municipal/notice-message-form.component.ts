// N-02 : নতুন বার্তা (CreateMessageRequest অনুযায়ী)
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NoticeApi } from '../../core/services/municipal-api.service';
import { MUNI_STYLES, RK, Recent, clean, errMsg, isUuid, rid } from './municipal-shared';

@Component({
  selector: 'app-notice-message-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><div><a routerLink="/notices" class="muted">← নোটিশ</a><h1>নতুন বার্তা</h1></div></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (problems().length) { <div class="alert alert-warn"><ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }
      <div class="card"><div class="card-body">
        <div class="grid3">
          <div class="form-group"><label>বার্তার ধরন (kind) <span class="required">*</span></label>
            <input class="form-control" list="kinds" [(ngModel)]="f.kind" placeholder="যেমন SMS" />
            <datalist id="kinds">@for (h of kindHints; track h) { <option [value]="h"></option> }</datalist></div>
          <div class="form-group"><label>ভাষা <span class="required">*</span></label>
            <select class="form-control" [(ngModel)]="f.lang"><option value="bn">বাংলা</option><option value="en">English</option></select></div>
          <div class="form-group"><label>শিরোনাম</label><input class="form-control" [(ngModel)]="f.title" /></div>
        </div>
        <div class="form-group"><label>বার্তার লেখা <span class="required">*</span></label>
          <textarea class="form-control" rows="5" [(ngModel)]="f.bodyText"></textarea>
          <div class="muted">{{ f.bodyText.length }} অক্ষর</div></div>
        <div class="section-title">সম্পর্কিত বিষয় (ঐচ্ছিক)</div>
        <div class="grid2">
          <div class="form-group"><label>সম্পর্কিত বিষয়ের ধরন</label><input class="form-control" [(ngModel)]="f.relatedType" placeholder="যেমন TAX_PROPOSAL" /></div>
          <div class="form-group"><label>সম্পর্কিত বিষয়ের ID</label><input class="form-control" [(ngModel)]="f.relatedId" placeholder="UUID" /></div>
        </div>
        <button class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'অপেক্ষা করুন...' : 'বার্তা সংরক্ষণ' }}</button>
      </div></div>
    </div>
  `,
})
export class NoticeMessageFormComponent {
  private api = inject(NoticeApi);
  private router = inject(Router);
  kindHints = ['SMS', 'NOTICE', 'OBJECTION_NOTICE', 'HEARING_NOTICE'];   // ⚠ অনুমান
  f = { kind: '', relatedType: '', relatedId: '', title: '', bodyText: '', lang: 'bn' };
  busy = signal(false); err = signal(''); problems = signal<string[]>([]);

  submit() {
    const p: string[] = [];
    if (!this.f.kind.trim()) p.push('বার্তার ধরন দিন');
    if (!this.f.bodyText.trim()) p.push('বার্তার লেখা দিন');
    if (this.f.relatedId.trim() && !isUuid(this.f.relatedId)) p.push('সম্পর্কিত বিষয়ের ID সঠিক UUID নয়');
    this.problems.set(p); if (p.length) return;
    this.busy.set(true); this.err.set('');
    this.api.createMessage(clean(this.f)).subscribe({
      next: (r) => { this.busy.set(false); const id = rid(r); if (id) Recent.add(RK.message, id, this.f.title.trim() || this.f.kind.trim()); this.router.navigate(['/notices']); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
