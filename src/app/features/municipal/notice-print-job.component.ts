// N-05 : ছাপার কাজ (print job) তৈরি
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ScopeNode } from '../../core/models/config-admin.model';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { NoticeApi } from '../../core/services/municipal-api.service';
import { flattenTree } from '../config/config-shared';
import { MUNI_STYLES, RK, Recent, Row, UUID_RE, bnStatus, entries, errMsg } from './municipal-shared';

@Component({
  selector: 'app-notice-print-job',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><div><a routerLink="/notices" class="muted">← নোটিশ</a><h1>ছাপার কাজ তৈরি</h1></div></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }

      <div class="card mb-2"><div class="card-body">
        <div class="grid2">
          <div class="form-group">
            <label>কাজের ধরন (kind) <span class="required">*</span></label>
            <input class="form-control" list="kinds" [(ngModel)]="kind" placeholder="যেমন NOTICE" />
            <datalist id="kinds">@for (k of kindHints; track k) { <option [value]="k"></option> }</datalist>
          </div>
          <div class="form-group">
            <label>বার্তা (ঐচ্ছিক)</label>
            <input class="form-control" list="msgs" [(ngModel)]="messageId" placeholder="message ID" />
            <datalist id="msgs">@for (m of recentMsgs; track m.id) { <option [value]="m.id">{{ m.label }}</option> }</datalist>
          </div>
        </div>
        <div class="form-group">
          <label>কার্যপরিধি (ঐচ্ছিক)</label>
          <select class="form-control" [(ngModel)]="scopeNodeId">
            <option value="">— নির্দিষ্ট নয় —</option>
            @for (f of nodes(); track f.node.id) { <option [value]="f.node.id">{{ '— '.repeat(f.depth) }}{{ f.node.nameBn }}</option> }
          </select>
        </div>

        <div class="section-title">অতিরিক্ত প্যারামিটার</div>
        @for (p of params; track $index; let i = $index) {
          <div class="row-actions" style="margin-bottom:6px">
            <input class="form-control" style="max-width:220px" placeholder="নাম (key)" [(ngModel)]="p.k" />
            <input class="form-control" style="flex:1" placeholder="মান" [(ngModel)]="p.v" />
            <button class="btn-ghost btn-sm" (click)="params.splice(i, 1)">সরান</button>
          </div>
        }
        <button class="btn-ghost btn-sm" (click)="params.push({ k: '', v: '' })">+ প্যারামিটার</button>

        <div style="margin-top:14px">
          <button class="btn btn-primary" [disabled]="busy() || !kind.trim()" (click)="submit()">{{ busy() ? 'অপেক্ষা করুন...' : 'ছাপার কাজ তৈরি করুন' }}</button>
        </div>
      </div></div>

      @if (job(); as j) {
        <div class="card"><div class="card-header"><h3>তৈরি হয়েছে</h3></div><div class="card-body">
          <div style="margin-bottom:8px"><span [class]="'st st-' + j['status']">{{ bn(j['status']) }}</span></div>
          <dl class="kv">@for (e of rows(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
        </div></div>
      }
    </div>
  `,
})
export class NoticePrintJobComponent implements OnInit {
  private api = inject(NoticeApi);
  private cfg = inject(ConfigAdminService);
  // ⚠ kind-এর সম্ভাব্য মান অনুমান; আপনার backend-এর মান দিয়ে বদলান
  kindHints = ['NOTICE', 'DEMAND_BILL', 'OBJECTION_NOTICE', 'HEARING_NOTICE'];
  kind = ''; messageId = ''; scopeNodeId = '';
  params: { k: string; v: string }[] = [];
  recentMsgs = Recent.list(RK.message);
  nodes = signal<{ node: ScopeNode; depth: number }[]>([]);
  job = signal<Row | null>(null);
  busy = signal(false); err = signal('');
  bn = bnStatus;
  rows = () => entries(this.job());

  ngOnInit() { this.cfg.scopeTree().pipe(catchError(() => of([] as ScopeNode[]))).subscribe(t => this.nodes.set(flattenTree(t))); }

  submit() {
    if (this.messageId.trim() && !UUID_RE.test(this.messageId.trim())) { this.err.set('বার্তার ID সঠিক নয়।'); return; }
    const parameters: Row = {};
    this.params.filter(p => p.k.trim()).forEach(p => (parameters[p.k.trim()] = p.v));
    const body: any = { kind: this.kind.trim() };
    if (this.messageId.trim()) body.messageId = this.messageId.trim();
    if (this.scopeNodeId) body.scopeNodeId = this.scopeNodeId;
    if (Object.keys(parameters).length) body.parameters = parameters;
    this.busy.set(true); this.err.set(''); this.job.set(null);
    this.api.createPrintJob(body).subscribe({
      next: (r) => { this.busy.set(false); this.job.set(r); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
