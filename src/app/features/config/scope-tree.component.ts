
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ConfigAdminService } from './config-admin.service';
import { ScopeLevel, ScopeNode } from '../../core/models/config-admin.model';
import { CONFIG_STYLES, errMsg, flattenTree } from './config-shared';
import { ScopeNodeComponent } from './scope-node.component';


@Component({
  selector: 'app-scope-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, ScopeNodeComponent],

  styles: [
    CONFIG_STYLES,
    `
      .layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 16px;
        align-items: start;
      }

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `
  ],

  template: `
    <div class="page-container">

      <div class="page-header">
        <h1>কার্যপরিধি (Scope)</h1>
      </div>

      @if (err()) {
        <div class="alert alert-err">{{ err() }}</div>
      }

      @if (msg()) {
        <div class="alert alert-ok">{{ msg() }}</div>
      }

      <div class="layout">

        <!-- B-05 : Scope Level -->

        <div class="card">

          <div class="card-header">
            <h3>স্তর (Level)</h3>
          </div>

          <div class="card-body">

            <p class="muted">
              যেমন: ১ = কেন্দ্রীয়, ২ = সার্কেল,
              ৩ = ওয়ার্ড, ৪ = রোড।
              ক্রম নম্বর ছোট হলে স্তর উপরে।
            </p>

            <table class="data-table">

              <thead>
                <tr>
                  <th>ক্রম</th>
                  <th>নাম (বাংলা)</th>
                  <th>Name (English)</th>
                </tr>
              </thead>

              <tbody>

                @for (l of levels(); track l['id']) {
                  <tr>
                    <td>{{ l.levelNo }}</td>
                    <td>{{ l.nameBn }}</td>
                    <td>{{ l.nameEn }}</td>
                  </tr>
                }

                @empty {
                  <tr>
                    <td colspan="3" class="empty">
                      কোনো স্তর নেই
                    </td>
                  </tr>
                }

              </tbody>

            </table>

            <div class="section-title" style="margin-top:14px">
              নতুন স্তর
            </div>

            <div class="form-group">

              <label>
                ক্রম নম্বর <span class="required">*</span>
              </label>

              <input
                type="number"
                min="1"
                class="form-control"
                [(ngModel)]="lvNo"
              />

            </div>

            <div class="form-group">

              <label>
                নাম (বাংলা) <span class="required">*</span>
              </label>

              <input
                class="form-control"
                [(ngModel)]="lvBn"
              />

            </div>

            <div class="form-group">

              <label>Name (English)</label>

              <input
                class="form-control"
                [(ngModel)]="lvEn"
              />

            </div>

            <button
              class="btn btn-primary"
              [disabled]="busy() || !lvNo || lvNo < 1 || !lvBn.trim()"
              (click)="addLevel()"
            >
              স্তর যোগ করুন
            </button>

          </div>
        </div>


        <!-- B-06 : Scope Node -->

        <div>

          <div class="card mb-2">

            <div class="card-header">
              <h3>নতুন Node</h3>
            </div>

            <div class="card-body">

              <div class="grid2">

                <div class="form-group">

                  <label>
                    নাম (বাংলা) <span class="required">*</span>
                  </label>

                  <input
                    class="form-control"
                    [(ngModel)]="ndBn"
                  />

                </div>


                <div class="form-group">

                  <label>Name (English)</label>

                  <input
                    class="form-control"
                    [(ngModel)]="ndEn"
                  />

                </div>


                <div class="form-group">

                  <label>
                    Node Code <span class="required">*</span>
                  </label>

                  <input
                    class="form-control"
                    [(ngModel)]="ndCode"
                    placeholder="যেমন: CENTRAL-01"
                  />

                </div>


                <div class="form-group">

                  <label>
                    স্তর <span class="required">*</span>
                  </label>

                  <select
                    class="form-control"
                    [(ngModel)]="ndLevel"
                  >

                    <option [ngValue]="null">
                      — বাছাই করুন —
                    </option>

                    @for (l of levels(); track l['id']) {

                      <option [ngValue]="l['id']">
                        {{ l.levelNo }} -
                        {{ l.nameBn }}
                        ({{ l.nameEn }})
                      </option>

                    }

                  </select>

                </div>


                <div class="form-group">

                  <label>
                    Parent (ঐচ্ছিক – ফাঁকা রাখলে স্বাধীন)
                  </label>

                  <select
                    class="form-control"
                    [(ngModel)]="ndParent"
                  >

                    <option [ngValue]="null">
                      — কোনো parent নেই —
                    </option>

                    @for (f of flat(); track f.node.id) {

                      <option [ngValue]="f.node.id">
                        {{ '— '.repeat(f.depth) }}
                        {{ f.node.nameBn }}
                      </option>

                    }

                  </select>

                </div>

              </div>


              <button
                class="btn btn-primary"
                [disabled]="
                  busy() ||
                  !ndBn.trim() ||
                  !ndCode.trim() ||
                  !ndLevel
                "
                (click)="addNode()"
              >
                Node যোগ করুন
              </button>

            </div>
          </div>


          <!-- Scope Tree -->

          <div class="card">

            <div class="card-header">
              <h3>কার্যপরিধির গাছ</h3>
            </div>

            <div class="card-body">

              @if (loading()) {

                <div class="empty">
                  লোড হচ্ছে...
                </div>

              } @else if (!tree().length) {

                <div class="empty">
                  এখনো কোনো Node নেই।
                </div>

              } @else {

                @for (n of tree(); track n.id) {

                  <app-scope-node
                    [node]="n"
                    (addChild)="pickParent($event)"
                  />

                }

              }

              <p class="muted" style="margin-top:12px">
                Node-এর নাম বদল বা বন্ধ করার API এখনো নেই,
                তাই এখানে সেই বোতামও নেই।
              </p>

            </div>
          </div>

        </div>

      </div>

    </div>
  `
})

export class ScopeTreeComponent implements OnInit {

  private svc = inject(ConfigAdminService);


  // =========================
  // STATE
  // =========================

  tree = signal<ScopeNode[]>([]);

  levels = signal<ScopeLevel[]>([]);

  flat = computed(() => flattenTree(this.tree()));

  loading = signal(true);

  busy = signal(false);

  err = signal('');

  msg = signal('');


  // =========================
  // LEVEL FORM
  // =========================

  lvNo: number | null = null;

  lvBn = '';

  lvEn = '';


  // =========================
  // NODE FORM
  // =========================

  ndBn = '';

  ndEn = '';

  ndCode = '';

  // Level UUID, not levelNo
  ndLevel: string | null = null;

  ndParent: string | null = null;


  ngOnInit(): void {
    this.load();
  }


  // =========================
  // LOAD LEVELS + TREE
  // =========================

 
load(): void {
  this.loading.set(true);
  this.err.set('');

  this.svc.listScopeLevels().subscribe({
    next: (data: any) => {
      this.levels.set(data ?? []);
    },
    error: (e: any) => {
      this.err.set('Level load failed: ' + errMsg(e));
    }
  });

  this.svc.scopeTree().subscribe({
    next: (data) => {
      this.tree.set(data ?? []);
      this.loading.set(false);
    },
    error: (e) => {
      this.err.set(errMsg(e));
      this.loading.set(false);
    }
  });
}


  // =========================
  // CREATE LEVEL
  // =========================

  addLevel(): void {

    if (
      !this.lvNo ||
      this.lvNo < 1 ||
      !this.lvBn.trim()
    ) {
      return;
    }

    this.busy.set(true);

    this.err.set('');

    this.msg.set('');


    this.svc.createLevel(
      this.lvBn.trim(),
      this.lvEn.trim(),
      this.lvNo
    ).subscribe({

      next: () => {

        this.busy.set(false);

        this.msg.set('স্তর যোগ হয়েছে।');

        this.lvNo = null;

        this.lvBn = '';

        this.lvEn = '';


        // Reload from database
        this.svc.listScopeLevels().subscribe({

          next: (data: any) => {

            this.levels.set(data ?? []);

          },

          error: (e: any) => {

            this.err.set(errMsg(e));

          }

        });

      },

      error: (e) => {

        this.busy.set(false);

        this.err.set(errMsg(e));

      }

    });

  }


  // =========================
  // CREATE NODE
  // =========================

 
addNode(): void {
  if (!this.ndBn.trim() || !this.ndCode.trim() || !this.ndLevel) {
    this.err.set('নাম, Node Code এবং Level নির্বাচন করুন।');
    return;
  }

  this.busy.set(true);
  this.err.set('');
  this.msg.set('');

  this.svc.createNode({
    levelId: this.ndLevel,
    parentId: this.ndParent,
    code: this.ndCode.trim(),
    nameBn: this.ndBn.trim(),
    nameEn: this.ndEn.trim()
  }).subscribe({
    next: () => {
      this.busy.set(false);
      this.msg.set('Node যোগ হয়েছে।');

      this.ndBn = '';
      this.ndEn = '';
      this.ndCode = '';
      this.ndParent = null;
      this.ndLevel = null;

      this.load();
    },
    error: (e) => {
      this.busy.set(false);
      this.err.set(errMsg(e));
    }
  });
}



  // =========================
  // ADD CHILD NODE
  // =========================

  pickParent(n: ScopeNode): void {

    this.ndParent = n.id;

    // Find next level after selected parent
    const next = this.levels().find(
      l => l.levelNo > n.levelNo
    );

    if (next) {

      // Assign UUID, not levelNo
      this.ndLevel = next['id'];

    } else {

      this.ndLevel = null;

      this.err.set(
        'এই Parent-এর পরবর্তী কোনো Level পাওয়া যায়নি।'
      );

    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }

}
