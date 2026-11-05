// E-01 : নথি আপলোড (পুনর্ব্যবহারযোগ্য অংশ) – ফাইল বাছাই, নীতি অনুযায়ী যাচাই, আপলোড, স্ক্যানের অবস্থা
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { UploadPolicy } from '../../core/models/config-admin.model';
import { ENGINE_STYLES, Row, STATUS_BN, errMsg } from '../committee/engine-shared';

@Component({
  selector: 'app-document-uploader',
  standalone: true,
  imports: [CommonModule],
  styles: [ENGINE_STYLES],
  template: `
    <div class="muted" style="margin-bottom:8px">
      অনুমোদিত ফরম্যাট: {{ policy().allowedFormats.join(', ') }} · প্রতি ফাইল সর্বোচ্চ {{ policy().maxFileSizeMb }} MB
    </div>
    @if (state() === 'idle' || state() === 'error') {
      <input type="file" class="form-control" [accept]="accept()" (change)="pick($event)" />
    }
    @if (err()) { <div class="alert alert-err" style="margin-top:10px">{{ err() }}</div> }

    @if (doc(); as d) {
      <div class="alert" [class.alert-info]="state() === 'scanning'" [class.alert-ok]="state() === 'clean'" [class.alert-err]="state() === 'infected'" style="margin-top:10px">
        <strong>{{ fileName }}</strong> —
        @switch (state()) {
          @case ('uploading') { আপলোড হচ্ছে... }
          @case ('scanning') { ভাইরাস স্ক্যান চলছে, একটু অপেক্ষা করুন... }
          @case ('clean') { স্ক্যান সম্পন্ন, ফাইল ব্যবহারযোগ্য। }
          @case ('infected') { ভাইরাস পাওয়া গেছে, এই ফাইল ব্যবহার করা যাবে না। অন্য ফাইল দিন। }
        }
        <div class="muted">নথি ID: {{ d['id'] }} · অবস্থা: {{ bn(scanOf(d)) }}</div>
      </div>
      @if (state() === 'infected') { <button class="btn-ghost btn-sm" (click)="reset()">নতুন ফাইল বাছাই</button> }
      @if (state() === 'clean') { <button class="btn-ghost btn-sm" (click)="reset()">অন্য ফাইল দিন</button> }
    }
    @if (state() === 'uploading') { <div class="muted" style="margin-top:8px">অপেক্ষা করুন...</div> }
  `,
})
export class DocumentUploaderComponent implements OnInit, OnDestroy {
  private api = inject(EngineApiService);
  private cfg = inject(ConfigAdminService);

  /** CLEAN হলে পুরো document row পাঠায় */
  @Output() ready = new EventEmitter<Row>();
  @Output() cleared = new EventEmitter<void>();

  policy = signal<UploadPolicy>({ allowedFormats: ['PDF'], maxFileSizeMb: 5, maxFilesPerResolution: 1 });
  state = signal<'idle' | 'uploading' | 'scanning' | 'clean' | 'infected' | 'error'>('idle');
  doc = signal<Row | null>(null);
  err = signal('');
  fileName = '';
  private timer: any; private tries = 0;
  bn = (s: string) => STATUS_BN[s] ?? s;
  scanOf = (d: Row): string => d['scanStatus'] ?? d['status'] ?? 'PENDING';
  accept = () => this.policy().allowedFormats.map(f => '.' + f.toLowerCase()).join(',');

  ngOnInit() {
    // B-12 এর API না থাকলে ডিফল্ট নীতি (PDF, ৫ MB) চলবে
    this.cfg.getUploadPolicy().pipe(catchError(() => of(null))).subscribe(p => { if (p?.allowedFormats?.length) this.policy.set(p); });
  }
  ngOnDestroy() { clearTimeout(this.timer); }

  pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0]; if (!f) return;
    this.err.set('');
    const ext = (f.name.split('.').pop() ?? '').toUpperCase();
    const p = this.policy();
    if (!p.allowedFormats.map(x => x.toUpperCase()).includes(ext === 'JPEG' ? 'JPG' : ext)) { this.fail(`".${ext.toLowerCase()}" ফরম্যাট অনুমোদিত নয়।`); return; }
    if (f.size > p.maxFileSizeMb * 1024 * 1024) { this.fail(`ফাইলের আকার ${p.maxFileSizeMb} MB এর বেশি।`); return; }
    this.fileName = f.name; this.state.set('uploading');
    this.api.uploadDocument(f).subscribe({
      next: (d) => { this.doc.set(d); this.handleStatus(d); },
      error: (e) => this.fail(errMsg(e)),
    });
  }

  private handleStatus(d: Row) {
    const s = this.scanOf(d).toUpperCase();
    if (s === 'CLEAN') { this.state.set('clean'); this.ready.emit(d); }
    else if (s === 'INFECTED' || s === 'FAILED') { this.state.set('infected'); }
    else { this.state.set('scanning'); this.poll(String(d['id'])); }
  }

  private poll(id: string) {
    clearTimeout(this.timer);
    if (++this.tries > 30) { this.fail('স্ক্যান শেষ হতে অনেক সময় নিচ্ছে। কিছুক্ষণ পর "নথি" পাতা থেকে অবস্থা দেখুন।'); return; }
    this.timer = setTimeout(() => this.api.getDocument(id).subscribe({
      next: (d) => { this.doc.set(d); this.handleStatus(d); },
      error: (e) => this.fail(errMsg(e)),
    }), 2000);
  }

  private fail(m: string) { this.err.set(m); this.state.set('error'); this.doc.set(null); }
  reset() { clearTimeout(this.timer); this.tries = 0; this.doc.set(null); this.err.set(''); this.state.set('idle'); this.cleared.emit(); }
}
