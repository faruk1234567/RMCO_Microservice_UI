
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ConfigAdminService } from '../../core/services/config-admin.service';
import { CommitteeTypeRow } from '../../core/models/config-admin.model';
import {
  CONFIG_STYLES,
  STATUS_LABEL,
  errMsg,
  versionsOf
} from './config-shared';

@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [CONFIG_STYLES],
  template: `
    <div class="page-container">

      <div class="page-header">
        <h1>কমিটির ধরন</h1>

        <button class="btn btn-primary"
                (click)="showForm.set(!showForm())">
          {{ showForm() ? 'বন্ধ' : '+ নতুন কমিটির ধরন যোগ করুন' }}
        </button>
      </div>

      <div class="alert alert-info">
        প্রতিটি কমিটির ধরনের নিজস্ব নিয়মমালা থাকে (কতজন সদস্য,
        কার অনুমোদন লাগবে ইত্যাদি)। চালু হয়ে যাওয়া নিয়মমালা
        মোছা বা বদলানো যায় না। পরিবর্তন করতে "নিয়ম পরিবর্তন করুন"
        চাপুন; আগের নিয়মমালা অপরিবর্তিত থাকবে।
      </div>

      @if (err()) {
        <div class="alert alert-err">{{ err() }}</div>
      }

      @if (msg()) {
        <div class="alert alert-ok">{{ msg() }}</div>
      }

      @if (showForm()) {
        <div class="card mb-2">
          <div class="card-header">
            <h3>নতুন কমিটির ধরন</h3>
          </div>

          <div class="card-body">
            <div class="grid3">

              <div class="form-group">
                <label>কোড <span class="required">*</span></label>
                <input class="form-control"
                       [(ngModel)]="newCode"
                       placeholder="WARD_COMMITTEE" />
              </div>

              <div class="form-group">
                <label>নাম (বাংলা) <span class="required">*</span></label>
                <input class="form-control"
                       [(ngModel)]="newNameBn" />
              </div>

              <div class="form-group">
                <label>Name (English)</label>
                <input class="form-control"
                       [(ngModel)]="newNameEn" />
              </div>

            </div>

            <button class="btn btn-primary"
                    [disabled]="saving() || !newCode.trim() || !newNameBn.trim()"
                    (click)="create()">
              {{ saving() ? 'সংরক্ষণ হচ্ছে...' : 'ধরন তৈরি করুন' }}
            </button>
          </div>
        </div>
      }

      <div class="toolbar">
        <label class="check">
          <input type="checkbox"
                 [ngModel]="!onlyActive()"
                 (ngModelChange)="toggleActive(!$event)" />
          বন্ধ ধরনও দেখান
        </label>

        <span class="muted">মোট {{ items().length }}টি</span>
      </div>

      <div class="card">
        <div class="card-body table-wrapper">

          @if (loading()) {
            <div class="empty">লোড হচ্ছে...</div>

          } @else if (!items().length) {
            <div class="empty">
              কোনো কমিটির ধরন নেই।
              "+ নতুন কমিটির ধরন যোগ করুন" চাপুন।
            </div>

          } @else {

            <table class="data-table">

              <thead>
                <tr>
                  <th>কোড</th>
                  <th>নাম</th>
                  <th>নিয়মমালা</th>
                  <th>অবস্থা</th>
                  <th>কাজ</th>
                </tr>
              </thead>

              <tbody>
                @for (t of items(); track t.id) {

                  <tr>

                    <td>{{ t.code }}</td>

                    <td>
                      {{ t.nameBn }}
                      <div class="muted">{{ t.nameEn }}</div>
                    </td>

                    <td class="version-cell">

                      <!-- সর্বশেষ Draft -->
                      @if (latestDraft(t); as draft) {
                        <div class="version-row">
                         <button type="button"
        class="chip"
        style="cursor:pointer"
        (click)="openVersion(t.id, draft.id)">
  সর্বশেষ খসড়া
  {{ draft.versionNo }}
  <span class="st st-DRAFT">খসড়া</span>
</button>
                        </div>
                      }

                      <!-- সর্বশেষ Published -->
                      @if (latestPublished(t); as published) {
                        <div class="version-row">
                          <button type="button"
        class="chip"
        style="cursor:pointer"
        (click)="openVersion(t.id, published.id)">
  কার্যকর নিয়মমালা
  {{ published.versionNo }}
  <span class="st st-PUBLISHED">প্রকাশিত</span>
</button>
                        </div>
                      }

                      <!-- কোনো Version না থাকলে -->
                      @if (!versionsOf(t).length) {
                        <span class="muted">
                          এখনো কোনো নিয়ম নির্ধারণ করা হয়নি
                        </span>
                      }

                      <!-- পুরোনো Version History -->
                      @if (historyVersions(t).length > 0) {

                        <div class="version-history">

                          <button type="button"
                                  class="btn-ghost btn-sm"
                                  (click)="toggleHistory(t.id)">
                            {{ historyOpenId() === t.id
                              ? 'ইতিহাস বন্ধ করুন'
                              : 'Version History (' + historyVersions(t).length + ')' }}
                          </button>

                          @if (historyOpenId() === t.id) {

                            <div class="history-list">

                              @for (v of historyVersions(t); track v.id) {

                                <div class="history-item">

                                  <a class="chip"
                                     [routerLink]="['/config/types', t.id, 'versions', v.id]">

                                    নিয়মমালা {{ v.versionNo }}

                                    <span class="st"
                                          [class]="'st st-' + v.status">
                                      {{ label[v.status] }}
                                    </span>

                                  </a>

                                </div>

                              }

                            </div>
                          }

                        </div>
                      }

                    </td>

                    <td>
                      <span class="badge"
                            [class]="t.isActive ? 'badge-success' : 'badge-secondary'">
                        {{ t.isActive ? 'চালু' : 'বন্ধ' }}
                      </span>
                    </td>

                    <td>
                      <button class="btn-ghost btn-sm"
                              [disabled]="busyId() === t.id"
                              (click)="newVersion(t)">
                        {{ busyId() === t.id ? '...' : actionLabel(t) }}
                      </button>
                    </td>

                  </tr>
                }
              </tbody>

            </table>
          }

        </div>
      </div>

    </div>
  `
})
export class TypeListComponent implements OnInit {

  private svc = inject(ConfigAdminService);
  private router = inject(Router);

  items = signal<CommitteeTypeRow[]>([]);

  loading = signal(true);
  saving = signal(false);
  busyId = signal('');

  err = signal('');
  msg = signal('');

  showForm = signal(false);
  onlyActive = signal(true);

  historyOpenId = signal<string | null>(null);

  label = STATUS_LABEL;

  versionsOf = versionsOf;

  newCode = '';
  newNameBn = '';
  newNameEn = '';

  ngOnInit() {
    this.load();
  }

  toggleActive(onlyActive: boolean) {
    this.onlyActive.set(onlyActive);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.err.set('');

    this.svc.listTypes(this.onlyActive()).subscribe({
      next: (l) => {
        this.items.set(l ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.err.set(errMsg(e));
        this.loading.set(false);
      }
    });
  }

  // সর্বশেষ Draft Version
  latestDraft(t: CommitteeTypeRow) {
    return versionsOf(t)
      .filter(v => v.status === 'DRAFT')
      .sort((a, b) => b.versionNo - a.versionNo)[0];
  }

  // সর্বশেষ Published Version
  latestPublished(t: CommitteeTypeRow) {
    return versionsOf(t)
      .filter(v => v.status === 'PUBLISHED')
      .sort((a, b) => b.versionNo - a.versionNo)[0];
  }

  // সর্বশেষ Draft এবং Published বাদে পুরোনো Version
  historyVersions(t: CommitteeTypeRow) {

    const latestDraft = this.latestDraft(t);
    const latestPublished = this.latestPublished(t);

    return versionsOf(t)
      .filter(v =>
        v.id !== latestDraft?.id &&
        v.id !== latestPublished?.id
      )
      .sort((a, b) => b.versionNo - a.versionNo);
  }

  // Version History খোলা / বন্ধ
  toggleHistory(typeId: string) {
    this.historyOpenId.set(
      this.historyOpenId() === typeId ? null : typeId
    );
  }
  openVersion(typeId: string, versionId: string) {
  this.err.set('');

  this.router.navigate([
    '/config/types',
    typeId,
    'versions',
    versionId
  ]).then(success => {
    if (!success) {
      this.err.set('নিয়মমালার পৃষ্ঠা খোলা যায়নি।');
    }
  });
}

  create() {
    this.saving.set(true);
    this.err.set('');
    this.msg.set('');

    this.svc.createType({
      code: this.newCode.trim(),
      nameBn: this.newNameBn.trim(),
      nameEn: this.newNameEn.trim()
    }).subscribe({

      next: () => {
        this.saving.set(false);

        this.msg.set(
          'নতুন কমিটির ধরন তৈরি হয়েছে। এখন "নিয়ম নির্ধারণ করুন" চেপে এর নিয়মগুলো ঠিক করুন।'
        );

        this.newCode = '';
        this.newNameBn = '';
        this.newNameEn = '';

        this.showForm.set(false);
        this.load();
      },

      error: (e) => {
        this.saving.set(false);
        this.err.set(errMsg(e));
      }
    });
  }

  // বোতামের লেখা
  actionLabel(t: CommitteeTypeRow): string {

    if (this.latestDraft(t)) {
      return 'খসড়া চালিয়ে যান';
    }

    if (this.latestPublished(t)) {
      return 'নিয়ম পরিবর্তন করুন';
    }

    return 'নিয়ম নির্ধারণ করুন';
  }

  newVersion(t: CommitteeTypeRow) {

    // সর্বশেষ Draft থাকলে সেটিই খুলবে
    const existingDraft = this.latestDraft(t);

    if (existingDraft) {
      this.router.navigate([
        '/config/types',
        t.id,
        'versions',
        existingDraft.id
      ]);
      return;
    }

    // Draft না থাকলে নতুন Version তৈরি
    this.busyId.set(t.id);
    this.err.set('');

    this.svc.createVersion(t.id).subscribe({

      next: (r) => {
        this.busyId.set('');

        const vid = r['id'] ?? r['versionId'];

        if (vid) {
          this.router.navigate([
            '/config/types',
            t.id,
            'versions',
            vid
          ]);
        } else {
          this.load();
        }
      },

      error: (e) => {
        this.busyId.set('');
        this.err.set(errMsg(e));
      }
    });
  }
}
