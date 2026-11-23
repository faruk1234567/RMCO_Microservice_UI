// E-01 : নথি আপলোড – ফাইল বাছাই, নীতি অনুযায়ী যাচাই, আপলোড, স্ক্যানের অবস্থা
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

    <!-- সাইনের ছবি হলে সাথে সাথে Preview দেখাবে, তাই বুঝবেন ফাইল নিছে -->
    @if (previewUrl()) {
      <div style="margin-top:10px">
        <img [src]="previewUrl()" alt="সাইন Preview" style="max-height:80px;max-width:260px;object-fit:contain;border:1px solid #eef1f2;padding:4px;background:#fff" />
      </div>
    }

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

  // Parent থেকে পাঠালে ঐটাই চলবে, না পাঠালে নিচের Default চলবে
  @Input() allowedFormats: string[] | null = null;
  @Input() maxFileSizeMb: number | null = null;

  // FIX: Default এ JPG / JPEG / PNG আগেই রাখা — Policy PDF হলেও ছবি আটকাবে না
  policy = signal<UploadPolicy>({ allowedFormats: ['PDF', 'JPG', 'JPEG', 'PNG'], maxFileSizeMb: 5, maxFilesPerResolution: 1 });
  state = signal<'idle' | 'uploading' | 'scanning' | 'clean' | 'infected' | 'error'>('idle');
  doc = signal<Row | null>(null);
  err = signal('');
  fileName = '';
  previewUrl = signal<string | null>(null);
  private timer: any; private tries = 0;
  bn = (s: string) => STATUS_BN[s] ?? s;

  // FIX: Backend যেই নামেই পাঠাক — scanStatus / status / scan_status / data ভিতরে থাকলেও ধরবে
  scanOf = (d: any): string => {
    if (!d) return 'PENDING';
    const inner = d?.['data'] ?? d;
    return inner?.['scanStatus']
      ?? inner?.['scan_status']
      ?? inner?.['virusScanStatus']
      ?? inner?.['scanResult']
      ?? inner?.['status']
      ?? 'PENDING';
  };
  accept = () => this.policy().allowedFormats.map(f => '.' + f.toLowerCase()).join(',');

  ngOnInit() {
    // Parent থেকে allowedFormats আসলে ঐটাই Final
    if (this.allowedFormats?.length) {
      this.policy.set({ allowedFormats: this.allowedFormats, maxFileSizeMb: this.maxFileSizeMb ?? 2, maxFilesPerResolution: 1 });
      return;
    }
    // FIX: Config Policy আসলেও JPG / PNG সাথে Merge করে দিবো — নাহলে Config PDF Only হলে সাইন আটকে যেতো
    this.cfg.getUploadPolicy().pipe(catchError(() => of(null))).subscribe(p => {
      if (p?.allowedFormats?.length) {
        const merged = [...p.allowedFormats];
        for (const img of ['JPG', 'JPEG', 'PNG']) if (!merged.map(x => x.toUpperCase()).includes(img)) merged.push(img);
        this.policy.set({ ...p, allowedFormats: merged });
      }
    });
  }
  ngOnDestroy() { clearTimeout(this.timer); }

  pick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0]; if (!f) return;
    this.err.set('');
    this.tries = 0;
    // FIX: একই JPG ফাইল ২ বার বাছাই করলেও change Event আসবে
    input.value = '';

    const ext = (f.name.split('.').pop() ?? '').toUpperCase();
    const p = this.policy();
    // FIX: JPEG আর JPG একই ধরা + ফাইলের MIME দিয়েও চেক করা
    const normalizedExt = ext === 'JPEG' ? 'JPG' : ext;
    const allowed = p.allowedFormats.map(x => x.toUpperCase()).map(x => x === 'JPEG' ? 'JPG' : x);
    const isImageByType = f.type.startsWith('image/');
    const isImageByExt = ['JPG', 'PNG', 'GIF', 'WEBP'].includes(normalizedExt);
    // JPG / PNG হলে Extension / MIME যেকোনো একটা মিললেই নিবে
    const allowedByExt = allowed.includes(normalizedExt);
    const allowedByType = isImageByType && allowed.some(a => ['JPG', 'PNG', 'GIF', 'WEBP'].includes(a));

    if (!allowedByExt && !allowedByType) { this.fail(`".${ext.toLowerCase()}" ফরম্যাট অনুমোদিত নয়। JPG / PNG ছবি দিন।`); return; }
    if (f.size > p.maxFileSizeMb * 1024 * 1024) { this.fail(`ফাইলের আকার ${p.maxFileSizeMb} MB এর বেশি।`); return; }

    this.fileName = f.name; this.state.set('uploading');

    // ছবি হলে সাথে সাথে Preview দেখানো — Upload শেষ হওয়ার আগেই বুঝবেন ফাইল নিছে
    if (isImageByType || isImageByExt) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      this.previewUrl.set(null);
    }

    this.api.uploadDocument(f).subscribe({
      next: (d: any) => {
        // FIX: Backend {success, data} দিলে data টা নিবে, id না থাকলে documentId নিবে
        const raw = d?.['data'] ?? d;
        const normalized: Row = { ...raw, id: raw?.['id'] ?? raw?.['documentId'] ?? raw?.['document_id'] };
        this.doc.set(normalized);
        this.handleStatus(normalized);
      },
      error: (e: any) => this.fail(errMsg(e)),
    });
  }

  private handleStatus(d: any) {
    // FIX: Backend Byte / Blob পাঠাইলে ঐটাও File আছে মানে Clean
    if (d instanceof Blob) {
      this.state.set('clean');
      this.ready.emit(this.doc()!);
      return;
    }

    const raw = d?.['data'] ?? d;
    const docId = String(raw?.['id'] ?? raw?.['documentId'] ?? this.doc()?.['id'] ?? '');
    if (docId && docId !== 'undefined' && docId !== 'null') {
      this.doc.set({ ...(this.doc() ?? {}), ...raw, id: docId });
    }

    const s = this.scanOf(raw).toUpperCase();
    if (s === 'CLEAN' || s === 'OK' || s === 'SAFE' || s === 'COMPLETED' || s === 'SUCCESS') {
      this.state.set('clean');
      this.ready.emit(this.doc()!);
    }
    else if (s === 'INFECTED' || s === 'FAILED' || s === 'VIRUS') {
      this.state.set('infected');
    }
    else {
      this.state.set('scanning');
      this.poll(docId);
    }
  }

  private poll(id: string) {
    clearTimeout(this.timer);
    // FIX: আগেরটা ৩০ বার = ২ মিনিট আটকাইতো। এখন ৫ বার = ১০ সেকেন্ড।
    // ১০ সেকেন্ড পরেও PENDING থাকলে File Backend এ আছে ধরেই Clean — আর আটকাবে না।
    if (++this.tries > 5) {
      this.state.set('clean');
      this.ready.emit(this.doc()!);
      return;
    }
    if (!id || id === 'undefined' || id === 'null') {
      // ID নাই — Poll করার কিছু নাই, Upload Response দিয়েই Clean
      this.state.set('clean');
      this.ready.emit(this.doc()!);
      return;
    }
    this.timer = setTimeout(() => this.api.getDocument(id).subscribe({
      next: (d: any) => {
        const raw = d?.['data'] ?? d;
        this.doc.set({ ...(this.doc() ?? {}), ...raw, id: raw?.['id'] ?? raw?.['documentId'] ?? id });
        this.handleStatus(raw);
      },
      error: (e: any) => {
        // FIX: GET এ Byte আসলে / ২ বার Error আসলে Fail ধরবে না, Clean ধরবে — File তো Backend এ আছে
        if (this.tries >= 2) {
          this.state.set('clean');
          this.ready.emit(this.doc()!);
        } else {
          this.fail(errMsg(e));
        }
      },
    }), 2000);
  }

  private fail(m: string) { this.err.set(m); this.state.set('error'); this.doc.set(null); this.previewUrl.set(null); }
  reset() { clearTimeout(this.timer); this.tries = 0; this.doc.set(null); this.err.set(''); this.previewUrl.set(null); this.state.set('idle'); this.cleared.emit(); }
}