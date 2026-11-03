// B-05 : কার্যপরিধির স্তর (Scope level)  +  B-06 : কার্যপরিধির গাছ (Scope tree)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { ScopeLevel, ScopeNode } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg, flattenTree, levelsFromTree } from './config-shared';
import { ScopeNodeComponent } from './scope-node.component';

@Component({
  selector: 'app-scope-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, ScopeNodeComponent],
  styles: [CONFIG_STYLES, `.layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; } @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }`],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>কার্যপরিধি (Scope)</h1></div>

      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }

      <div class="layout">
        <!-- ===== B-05 : স্তর ===== -->
        <div class="card">
          <div class="card-header"><h3>স্তর (Level)</h3></div>
          <div class="card-body">
            <p class="muted">যেমন: ১ = কেন্দ্রীয়, ২ = সার্কেল, ৩ = ওয়ার্ড, ৪ = রোড। ক্রম নম্বর ছোট হলে স্তর উপরে।</p>
            <table class="data-table">
              <thead><tr><th>ক্রম</th><th>নাম</th></tr></thead>
              <tbody>
                @for (l of levels(); track l.levelNo) { <tr><td>{{ l.levelNo }}</td><td>{{ l.nameBn }}</td></tr> }
                @empty { <tr><td colspan="2" class="empty">কোনো স্তর নেই</td></tr> }
              </tbody>
            </table>
            <div class="section-title" style="margin-top:14px">নতুন স্তর</div>
            <div class="form-group"><label>ক্রম নম্বর <span class="required">*</span></label>
              <input type="number" min="1" class="form-control" [(ngModel)]="lvNo" /></div>
            <div class="form-group"><label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="lvBn" /></div>
            <div class="form-group"><label>Name (English)</label>
              <input class="form-control" [(ngModel)]="lvEn" /></div>
            <button class="btn btn-primary" [disabled]="busy() || !lvNo || !lvBn.trim()" (click)="addLevel()">স্তর যোগ করুন</button>
          </div>
        </div>

        <!-- ===== B-06 : গাছ ===== -->
        <div>
          <div class="card mb-2">
            <div class="card-header"><h3>নতুন node</h3></div>
            <div class="card-body">
              <div class="grid2">
                <div class="form-group"><label>নাম (বাংলা) <span class="required">*</span></label>
                  <input class="form-control" [(ngModel)]="ndBn" /></div>
                <div class="form-group"><label>Name (English)</label>
                  <input class="form-control" [(ngModel)]="ndEn" /></div>
                <div class="form-group"><label>স্তর <span class="required">*</span></label>
                  <select class="form-control" [(ngModel)]="ndLevel">
                    <option [ngValue]="null">— বাছাই করুন —</option>
                    @for (l of levels(); track l.levelNo) { <option [ngValue]="l.levelNo">{{ l.nameBn }}</option> }
                  </select></div>
                <div class="form-group"><label>Parent (ঐচ্ছিক – ফাঁকা রাখলে স্বাধীন)</label>
                  <select class="form-control" [(ngModel)]="ndParent">
                    <option [ngValue]="null">— কোনো parent নেই —</option>
                    @for (f of flat(); track f.node.id) { <option [ngValue]="f.node.id">{{ '— '.repeat(f.depth) }}{{ f.node.nameBn }}</option> }
                  </select></div>
              </div>
              <button class="btn btn-primary" [disabled]="busy() || !ndBn.trim() || ndLevel === null" (click)="addNode()">node যোগ করুন</button>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>কার্যপরিধির গাছ</h3></div>
            <div class="card-body">
              @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }
              @else if (!tree().length) { <div class="empty">এখনো কোনো node নেই।</div> }
              @else {
                @for (n of tree(); track n.id) { <app-scope-node [node]="n" (addChild)="pickParent($event)" /> }
              }
              <p class="muted" style="margin-top:12px">node-এর নাম বদল বা বন্ধ করার API এখনো নেই, তাই এখানে সেই বোতামও নেই।</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ScopeTreeComponent implements OnInit {
  private svc = inject(ConfigAdminService);

  tree = signal<ScopeNode[]>([]);
  extraLevels = signal<ScopeLevel[]>([]);     // এই session-এ তৈরি, কিন্তু এখনো কোনো node নেই এমন স্তর
  levels = computed<ScopeLevel[]>(() => {
    const m = new Map<number, ScopeLevel>();
    [...levelsFromTree(this.tree()), ...this.extraLevels()].forEach(l => m.set(l.levelNo, l));
    return [...m.values()].sort((a, b) => a.levelNo - b.levelNo);
  });
  flat = computed(() => flattenTree(this.tree()));
  loading = signal(true); busy = signal(false);
  err = signal(''); msg = signal('');

  lvNo: number | null = null; lvBn = ''; lvEn = '';
  ndBn = ''; ndEn = ''; ndLevel: number | null = null; ndParent: string | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.scopeTree().subscribe({
      next: (t) => { this.tree.set(t ?? []); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }

  addLevel() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const no = this.lvNo!, bn = this.lvBn.trim(), en = this.lvEn.trim();
    this.svc.createLevel(bn, en, no).subscribe({
      next: () => {
        this.busy.set(false); this.msg.set('স্তর যোগ হয়েছে।');
        this.extraLevels.update(l => [...l, { levelNo: no, nameBn: bn, nameEn: en }]);
        this.lvNo = null; this.lvBn = this.lvEn = '';
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  addNode() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.svc.createNode({ nameBn: this.ndBn.trim(), nameEn: this.ndEn.trim(), levelNo: this.ndLevel!, parentId: this.ndParent }).subscribe({
      next: () => {
        this.busy.set(false); this.msg.set('node যোগ হয়েছে।');
        this.ndBn = this.ndEn = ''; this.ndParent = null; this.load();
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  pickParent(n: ScopeNode) {
    this.ndParent = n.id;
    const next = this.levels().find(l => l.levelNo > n.levelNo);
    if (next) this.ndLevel = next.levelNo;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
