// C-13 : কার্যপরিধির গাছে কোন node-এ কোন কমিটি আছে
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { ScopeNode } from '../../core/models/config-admin.model';
import { flattenTree } from '../config/config-shared';
import { ENGINE_STYLES, Row, STATUS_BN, committeeName, errMsg, idOf } from './engine-shared';

@Component({
  selector: 'app-committee-hierarchy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [ENGINE_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/committee" class="muted">← কমিটির তালিকা</a><h1>কার্যপরিধি অনুযায়ী কমিটি</h1></div>
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
      @else {
        <div class="card mb-2"><div class="card-body">
          @for (f of flat(); track f.node.id) {
            <div [style.padding-left.px]="f.depth * 24" style="padding-top:8px;padding-bottom:8px;border-bottom:1px solid #eef1f2">
              <strong>{{ f.node.nameBn }}</strong>
              <span class="chip">{{ f.node.levelNameBn || ('স্তর ' + f.node.levelNo) }}</span>
              @for (c of committeesAt(f.node.id); track id(c)) {
                <a class="chip" [routerLink]="['/committee', id(c)]">{{ name(c) }}
                  <span [class]="'st st-' + c['status']">{{ bn(c['status']) }}</span></a>
              } @empty { <span class="muted">— কোনো কমিটি নেই</span> }
            </div>
          } @empty { <div class="empty">কার্যপরিধির গাছ খালি।</div> }
        </div></div>

        @if (unplaced().length) {
          <div class="card"><div class="card-header"><h3>কার্যপরিধি ছাড়া / অচেনা node</h3></div>
            <div class="card-body">
              @for (c of unplaced(); track id(c)) { <a class="chip" [routerLink]="['/committee', id(c)]">{{ name(c) }}</a> }
            </div></div>
        }
      }
    </div>
  `,
})
export class CommitteeHierarchyComponent implements OnInit {
  private api = inject(EngineApiService);
  private cfg = inject(ConfigAdminService);
  tree = signal<ScopeNode[]>([]);
  committees = signal<Row[]>([]);
  loading = signal(true); err = signal('');
  flat = computed(() => flattenTree(this.tree()));
  id = idOf; name = committeeName; bn = (s: string) => STATUS_BN[s] ?? s;
  private nodeOf = (c: Row) => c['scopeNodeId'] ?? c['scopeId'] ?? null;
  committeesAt = (nodeId: string) => this.committees().filter(c => this.nodeOf(c) === nodeId);
  unplaced = computed(() => {
    const ids = new Set(this.flat().map(f => f.node.id));
    return this.committees().filter(c => !ids.has(this.nodeOf(c)));
  });

  ngOnInit() {
    forkJoin({ t: this.cfg.scopeTree(), c: this.api.listCommittees() }).subscribe({
      next: ({ t, c }) => { this.tree.set(t ?? []); this.committees.set(c ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
