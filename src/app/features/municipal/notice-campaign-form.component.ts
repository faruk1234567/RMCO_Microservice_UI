// N-03 : নতুন ক্যাম্পেইন (CreateCampaignRequest অনুযায়ী — targets তালিকা সহ)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ScopeNode } from '../../core/models/config-admin.model';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { NoticeApi } from '../../core/services/municipal-api.service';
import { flattenTree } from '../config/config-shared';
import { MUNI_STYLES, RK, Recent, errMsg, isUuid, rid } from './municipal-shared';

interface Target { selectionKind: string; scopeNodeId: string; holdingId: string; excluded: boolean; }

@Component({
  selector: 'app-notice-campaign-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><div><a routerLink="/notices" class="muted">← নোটিশ</a><h1>নতুন ক্যাম্পেইন</h1></div></div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (problems().length) { <div class="alert alert-warn"><ul>@for (p of problems(); track $index) { <li>{{ p }}</li> }</ul></div> }

      <div class="card mb-2"><div class="card-body">
        <div class="form-group"><label>বার্তা (message ID) <span class="required">*</span></label>
          <input class="form-control" list="recentMsgs" [(ngModel)]="messageId" placeholder="ID লিখুন বা সম্প্রতি তৈরি তালিকা থেকে বাছুন" />
          <datalist id="recentMsgs">@for (m of recentMsgs; track m.id) { <option [value]="m.id">{{ m.label }}</option> }</datalist></div>
        <div class="grid2">
          <div class="form-group"><label>মাধ্যম (channel) <span class="required">*</span></label>
            <input class="form-control" list="channels" [(ngModel)]="channel" placeholder="যেমন SMS" />
            <datalist id="channels">@for (h of channelHints; track h) { <option [value]="h"></option> }</datalist></div>
          <div class="form-group"><label>লক্ষ্য নির্বাচনের ধরন (targetMode) <span class="required">*</span></label>
            <input class="form-control" list="modes" [(ngModel)]="targetMode" placeholder="যেমন SELECTED" />
            <datalist id="modes">@for (h of modeHints; track h) { <option [value]="h"></option> }</datalist></div>
        </div>
      </div></div>

      <datalist id="kinds">@for (h of kindHints; track h) { <option [value]="h"></option> }</datalist>
      <div class="card mb-2"><div class="card-header"><h3>কাদের কাছে যাবে (targets)</h3></div><div class="card-body">
        @for (t of targets; track $index; let i = $index) {
          <div class="sub-card">
            <div class="grid4">
              <div class="form-group"><label>নির্বাচনের ধরন <span class="required">*</span></label>
                <input class="form-control" list="kinds" [(ngModel)]="t.selectionKind" placeholder="যেমন SCOPE" /></div>
              <div class="form-group"><label>কার্যপরিধি</label>
                <select class="form-control" [(ngModel)]="t.scopeNodeId">
                  <option value="">— নির্দিষ্ট নয় —</option>
                  @for (f of nodes(); track f.node.id) { <option [value]="f.node.id">{{ '— '.repeat(f.depth) }}{{ f.node.nameBn }}</option> }
                </select></div>
              <div class="form-group"><label>হোল্ডিং ID</label><input class="form-control" [(ngModel)]="t.holdingId" placeholder="UUID" /></div>
              <div class="form-group"><label>&nbsp;</label>
                <label class="check"><input type="checkbox" [(ngModel)]="t.excluded" /> বাদ দিন (exclude)</label></div>
            </div>
            <button class="btn-ghost btn-sm" (click)="targets.splice(i, 1)">এই সারি সরান</button>
          </div>
        } @empty { <div class="muted" style="margin-bottom:8px">কোনো লক্ষ্য যোগ করা হয়নি।</div> }
        <button class="btn-ghost" (click)="targets.push(blank())">+ লক্ষ্য যোগ করুন</button>
      </div></div>

      <div class="toolbar"><span class="grow"></span>
        <button class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'অপেক্ষা করুন...' : 'ক্যাম্পেইন তৈরি করুন' }}</button></div>
    </div>
  `,
})
export class NoticeCampaignFormComponent implements OnInit {
  private api = inject(NoticeApi);
  private cfg = inject(ConfigAdminService);
  private router = inject(Router);

  // ⚠ নিচের মানগুলো অনুমান (datalist); আপনার সিস্টেমের আসল কোড লিখুন
  channelHints = ['SMS', 'EMAIL', 'PRINT'];
  modeHints = ['ALL', 'SELECTED'];
  kindHints = ['SCOPE', 'HOLDING'];
  messageId = ''; channel = ''; targetMode = '';
  targets: Target[] = [];
  recentMsgs = Recent.list(RK.message);
  nodes = signal<{ node: ScopeNode; depth: number }[]>([]);
  busy = signal(false); err = signal(''); problems = signal<string[]>([]);
  blank = (): Target => ({ selectionKind: '', scopeNodeId: '', holdingId: '', excluded: false });

  ngOnInit() { this.cfg.scopeTree().pipe(catchError(() => of([] as ScopeNode[]))).subscribe(t => this.nodes.set(flattenTree(t))); }

  submit() {
    const p: string[] = [];
    if (!isUuid(this.messageId)) p.push('বার্তার ID সঠিক UUID নয়');
    if (!this.channel.trim()) p.push('মাধ্যম দিন');
    if (!this.targetMode.trim()) p.push('লক্ষ্য নির্বাচনের ধরন দিন');
    this.targets.forEach((t, i) => {
      if (!t.selectionKind.trim()) p.push(`লক্ষ্য ${i + 1}: নির্বাচনের ধরন দিন`);
      if (t.holdingId.trim() && !isUuid(t.holdingId)) p.push(`লক্ষ্য ${i + 1}: হোল্ডিং ID সঠিক নয়`);
    });
    this.problems.set(p); if (p.length) return;
    const body = {
      messageId: this.messageId.trim(), channel: this.channel.trim(), targetMode: this.targetMode.trim(),
      targets: this.targets.map(t => ({
        selectionKind: t.selectionKind.trim(), excluded: t.excluded,
        ...(t.scopeNodeId ? { scopeNodeId: t.scopeNodeId } : {}), ...(t.holdingId.trim() ? { holdingId: t.holdingId.trim() } : {}),
      })),
    };
    this.busy.set(true); this.err.set('');
    this.api.createCampaign(body).subscribe({
      next: (r) => {
        this.busy.set(false); const id = rid(r);
        if (id) { Recent.add(RK.campaign, id, `${this.channel.trim()} · ${this.messageId.slice(0, 8)}`); this.router.navigate(['/notices/campaigns', id]); } else this.router.navigate(['/notices']);
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
