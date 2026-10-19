import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommitteeService } from '../../core/services/committee.service';
import { CommitteeType, CommitteeTypeVersion, TypeDesignation } from '../../core/models/committee.model';

interface MemberRow {
  designationId: string;
  designationName: string;
  userId: string;
  userName: string;
  isPrimary: boolean;
}

@Component({
  selector: 'app-committee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>নতুন কমিটি খসড়া</h1>
        <a routerLink="/committee" class="btn btn-secondary">বাতিল</a>
      </div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }
      @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }

      <div class="card">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>কমিটির ধরন <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="selectedTypeId" (ngModelChange)="onTypeChange($event)">
                <option value="">-- বাছাই করুন --</option>
                @for (t of types(); track t.id) {
                  <option [value]="t.latestPublishedVersionId">{{ t.nameBn }} (v{{ t.latestVersionNo }})</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>নাম (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="nameBn" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Name (English)</label>
              <input class="form-control" [(ngModel)]="nameEn" />
            </div>
            <div class="form-group">
              <label>মেয়াদ শুরু</label>
              <input type="date" class="form-control" [(ngModel)]="termStart" />
            </div>
          </div>
          <div class="form-group">
            <label>বিবরণ</label>
            <textarea class="form-control" [(ngModel)]="description" rows="3"></textarea>
          </div>

          @if (version()) {
            <h4 style="margin:20px 0 12px">
              সদস্য তালিকা
              <small class="text-muted">
                (সর্বনিম্ন {{ version()!.composition?.minMembers }} –
                সর্বোচ্চ {{ version()!.composition?.maxMembers }})
              </small>
            </h4>

            <div class="card mb-2" style="border:1px dashed var(--border)">
              <div class="card-body">
                <div class="form-row">
                  <div class="form-group">
                    <label>পদবী</label>
                    <select class="form-control" [(ngModel)]="addDesignationId">
                      <option value="">-- পদবী --</option>
                      @for (d of version()!.designations || []; track d.id) {
                        <option [value]="d.designationId">
                          {{ d.designationNameBn }}
                          @if (d.isMandatory) { (আবশ্যক) }
                          ({{ d.minCount }}–{{ d.maxCount }})
                        </option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label>সদস্যের নাম / User ID</label>
                    <input class="form-control" [(ngModel)]="addUserName" placeholder="নাম লিখুন" />
                  </div>
                </div>
                <button class="btn btn-sm btn-secondary" (click)="addMember()" [disabled]="!addDesignationId || !addUserName">
                  + সদস্য যোগ
                </button>
              </div>
            </div>

            @if (members().length) {
              <table class="data-table">
                <thead><tr><th>পদবী</th><th>নাম</th><th>প্রাথমিক</th><th></th></tr></thead>
                <tbody>
                  @for (m of members(); track $index) {
                    <tr>
                      <td>{{ m.designationName }}</td>
                      <td>{{ m.userName }}</td>
                      <td>{{ m.isPrimary ? 'হ্যাঁ' : 'না' }}</td>
                      <td><button class="btn btn-sm btn-danger" (click)="removeMember($index)">×</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          }

          <div style="display:flex;gap:10px;margin-top:24px">
            <button class="btn btn-secondary" [disabled]="saving()" (click)="saveDraft()">
              {{ saving() ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ' }}
            </button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="saveAndSubmit()">
              {{ saving() ? 'জমা হচ্ছে...' : 'জমা দিন (অনুমোদনের জন্য)' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CommitteeFormComponent implements OnInit {
  types = signal<CommitteeType[]>([]);
  version = signal<CommitteeTypeVersion | null>(null);
  members = signal<MemberRow[]>([]);
  saving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  selectedTypeId = '';
  nameBn = '';
  nameEn = '';
  termStart = '';
  description = '';
  addDesignationId = '';
  addUserName = '';

  constructor(private committeeSvc: CommitteeService, private router: Router) {}

  ngOnInit() {
    this.committeeSvc.getPublishedTypes().subscribe((t) => this.types.set(t));
  }

  onTypeChange(versionId: string) {
    if (!versionId) { this.version.set(null); return; }
    this.committeeSvc.getTypeVersion(versionId).subscribe((v) => this.version.set(v));
  }

  addMember() {
    const des = this.version()?.designations?.find((d) => d.designationId === this.addDesignationId);
    if (!des) return;
    this.members.update((list) => [
      ...list,
      {
        designationId: des.designationId,
        designationName: des.designationNameBn || '',
        userId: 'u-temp-' + Date.now(),
        userName: this.addUserName,
        isPrimary: des.isSingleHolder,
      },
    ]);
    this.addUserName = '';
    this.addDesignationId = '';
  }

  removeMember(idx: number) {
    this.members.update((list) => list.filter((_, i) => i !== idx));
  }

  private buildPayload() {
    return {
      typeVersionId: this.selectedTypeId,
      nameBn: this.nameBn,
      nameEn: this.nameEn || undefined,
      termStart: this.termStart || undefined,
      description: this.description || undefined,
      members: this.members().map((m) => ({
        userId: m.userId,
        designationId: m.designationId,
        isPrimary: m.isPrimary,
      })),
    };
  }

  saveDraft() {
    if (!this.selectedTypeId || !this.nameBn.trim()) {
      this.errorMsg.set('ধরন এবং নাম আবশ্যক।');
      return;
    }
    this.saving.set(true);
    this.errorMsg.set('');
    this.committeeSvc.createDraft(this.buildPayload()).subscribe({
      next: (c) => {
        this.saving.set(false);
        this.successMsg.set('খসড়া সংরক্ষিত হয়েছে।');
        setTimeout(() => this.router.navigate(['/committee', c.id]), 800);
      },
      error: () => { this.saving.set(false); this.errorMsg.set('সংরক্ষণ ব্যর্থ।'); },
    });
  }

  saveAndSubmit() {
    if (!this.selectedTypeId || !this.nameBn.trim()) {
      this.errorMsg.set('ধরন এবং নাম আবশ্যক।');
      return;
    }
    this.saving.set(true);
    this.errorMsg.set('');
    this.committeeSvc.createDraft(this.buildPayload()).subscribe({
      next: (c) => {
        this.committeeSvc.submitDraft(c.id).subscribe({
          next: () => {
            this.saving.set(false);
            this.successMsg.set('জমা দেওয়া হয়েছে। অনুমোদনের জন্য পাঠানো হয়েছে।');
            setTimeout(() => this.router.navigate(['/committee']), 1000);
          },
          error: () => { this.saving.set(false); this.errorMsg.set('জমা ব্যর্থ।'); },
        });
      },
      error: () => { this.saving.set(false); this.errorMsg.set('সংরক্ষণ ব্যর্থ।'); },
    });
  }
}
