// T-03 : কর প্রস্তাবের বিস্তারিত, আপত্তির সময়সীমা, প্রাক-প্রকাশ (pre-publish) ও চূড়ান্তকরণ (finalize)
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TaxProposalApi } from '../../core/services/municipal-api.service';
import { DocumentUploaderComponent } from '../document/document-uploader.component';
import { MUNI_STYLES, RK, Recent, Row, bnStatus, endOfDay, entries, errMsg, fmtDate } from './municipal-shared';

@Component({
  selector: 'app-tax-proposal-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocumentUploaderComponent],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div><a routerLink="/tax-proposals" class="muted">← কর প্রস্তাব</a>
          <h1>{{ p()?.['titleBn'] || 'কর প্রস্তাব' }} @if (p()) { <span [class]="'st st-' + p()!['status']">{{ bn(p()!['status']) }}</span> }</h1></div>
        @if (p() && p()!['prePublishedOn']) {
          <a class="btn-ghost" style="text-decoration:none" routerLink="/objections/new" [queryParams]="{ proposalId: id }">এই প্রস্তাবে আপত্তি জমা দিন</a>
        }
      </div>
      @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
      @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
      @if (loading()) { <div class="empty">লোড হচ্ছে...</div> }

      @if (p()) {
        <div class="card mb-2"><div class="card-header"><h3>আপত্তির সময়সীমা</h3></div><div class="card-body">
          @if (deadline()) {
            <p>প্রাক-প্রকাশ: <strong>{{ fmtD(p()!['prePublishedOn']) }}</strong> · আপত্তির শেষ তারিখ: <strong>{{ fmtD(deadline()) }}</strong>
              @if (isOpen()) { <span class="st st-ACTIVE">চলছে — আর {{ daysLeft() }} দিন</span> } @else { <span class="st st-EXPIRED">শেষ হয়েছে</span> }
            </p>
          } @else { <p class="muted">আপত্তির সময় এখনো শুরু হয়নি। প্রাক-প্রকাশ করলে সময় নির্ধারিত হবে।</p> }
        </div></div>

        <div class="card mb-2"><div class="card-header"><h3>প্রস্তাবের তথ্য</h3></div><div class="card-body">
          <dl class="kv">@for (e of rows(); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
        </div></div>

        @if (canPre()) {
          <div class="card mb-2"><div class="card-header"><h3>প্রাক-প্রকাশ (Pre-publish)</h3></div><div class="card-body">
            <div class="alert alert-info">প্রাক-প্রকাশ করলে জনসাধারণ আপত্তি জমা দিতে পারবে এবং আপত্তির সময় শুরু হবে।</div>
            <div class="grid2">
              <div class="form-group"><label>প্রকাশের স্থান / মাধ্যম</label><input class="form-control" [(ngModel)]="place" /></div>
              <div class="form-group"><label>আপত্তির সময় (মাস)</label><input type="number" min="1" max="12" class="form-control" [(ngModel)]="months" /></div>
            </div>
            <label class="check" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="publicNotice" /> জনসাধারণের জন্য নোটিশ চালু করুন</label>
            <div class="section-title">নোটিশের নথি (ঐচ্ছিক)</div>
            <app-document-uploader (ready)="noticeDoc.set($any($event)['id'])" (cleared)="noticeDoc.set('')" />
            <button class="btn btn-primary" style="margin-top:10px" [disabled]="busy() || !months || months < 1" (click)="prePublish()">প্রাক-প্রকাশ করুন</button>
          </div></div>
        }

        @if (canFinalize()) {
          <div class="card"><div class="card-header"><h3>চূড়ান্তকরণ (Finalize)</h3></div><div class="card-body">
            @if (isOpen()) { <div class="alert alert-warn">আপত্তির সময় এখনো চলছে। এখন চূড়ান্ত করলে বাকি আপত্তি নিষ্পত্তির সুযোগ কমে যেতে পারে।</div> }
            <label class="check" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="confirmFinal" /> আমি বুঝেছি, চূড়ান্ত করার পর এটি বদলানো যাবে না</label>
            <button class="btn btn-primary" [disabled]="busy() || !confirmFinal" (click)="finalize()">প্রস্তাব চূড়ান্ত করুন</button>
          </div></div>
        }
      }
    </div>
  `,
})
export class TaxProposalDetailComponent implements OnInit {
  private api = inject(TaxProposalApi);
  private route = inject(ActivatedRoute);
  id = '';
  p = signal<Row | null>(null); win = signal<Row | null>(null);
  loading = signal(true); busy = signal(false);
  err = signal(''); msg = signal('');
  place = 'Municipal Office Notice Board'; months = 1; publicNotice = true; confirmFinal = false;
  noticeDoc = signal('');

  bn = bnStatus; fmtD = (v: any) => fmtDate(v);
  rows = computed(() => entries(this.p()).filter(e => e.k !== 'id'));
  deadline = computed<string>(() => this.win()?.['objectionDeadline'] ?? this.p()?.['objectionDeadline'] ?? '');
  isOpen = computed<boolean>(() => {
    const w = this.win()?.['isOpen'];
    if (typeof w === 'boolean') return w;
    const d = this.deadline(); return !!d && endOfDay(d) >= Date.now();
  });
  daysLeft = computed(() => { const d = this.deadline(); return d ? Math.max(0, Math.ceil((endOfDay(d) - Date.now()) / 86400000)) : 0; });
  // প্রাক-প্রকাশের তারিখ (prePublishedOn) থাকলে আর প্রাক-প্রকাশ করা যাবে না; থাকলে তবেই চূড়ান্ত করা যাবে
  canPre = computed(() => !!this.p() && !this.p()!['prePublishedOn']);
  canFinalize = computed(() => !!this.p()?.['prePublishedOn'] && !/FINAL/i.test(String(this.p()?.['status'] ?? '')));

  ngOnInit() { this.id = this.route.snapshot.paramMap.get('id') ?? ''; this.load(); }

  load() {
    this.loading.set(true);
    this.api.get(this.id).subscribe({
      next: (r) => { this.p.set(r); this.loading.set(false); Recent.add(RK.tax, this.id, String(r['titleBn'] ?? r['proposalNo'] ?? this.id.slice(0, 8))); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
    this.api.objectionWindow(this.id).pipe(catchError(() => of(null))).subscribe(w => this.win.set(w));
  }

  prePublish() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    const body: Row = { placeOrMethod: this.place.trim() || 'Municipal Office Notice Board', publicNoticeEnabled: this.publicNotice, objectionWindowMonths: this.months };
    if (this.noticeDoc()) body['noticeDocumentId'] = this.noticeDoc();
    this.api.prePublish(this.id, body).subscribe({
      next: () => { this.busy.set(false); this.msg.set('প্রাক-প্রকাশ সম্পন্ন হয়েছে।'); this.load(); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }

  finalize() {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.api.finalize(this.id).subscribe({
      next: () => { this.busy.set(false); this.confirmFinal = false; this.msg.set('প্রস্তাব চূড়ান্ত করা হয়েছে।'); this.load(); },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}
