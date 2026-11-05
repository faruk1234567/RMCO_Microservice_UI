// E-01 / E-02 : নথি আপলোড ও নথির তথ্য দেখা
// ⚠ নথির তালিকা API নেই, তাই এখানে আপলোড + ID দিয়ে খোঁজা + এই session-এ আপলোড করা নথির তালিকা
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EngineApiService } from '../../core/services/engine-api.service';
import { ENGINE_STYLES, Row, STATUS_BN, entries, errMsg, pick } from '../committee/engine-shared';
import { DocumentUploaderComponent } from './document-uploader.component';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentUploaderComponent],
  styles: [ENGINE_STYLES, `.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; } @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }`],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>নথি</h1></div>
      <div class="layout">
        <div class="card"><div class="card-header"><h3>নতুন নথি আপলোড</h3></div>
          <div class="card-body">
            <app-document-uploader (ready)="onReady($event)" />
            @if (recent().length) {
              <div class="section-title" style="margin-top:16px">এই session-এ আপলোড করা</div>
              @for (d of recent(); track d['id']) {
                <button type="button" class="chip" (click)="show(d)">{{ name(d) }}</button>
              }
            }
          </div>
        </div>

        <div class="card"><div class="card-header"><h3>নথির তথ্য দেখুন</h3></div>
          <div class="card-body">
            <div class="toolbar">
              <input class="form-control" style="flex:1" placeholder="নথির ID (UUID)" [(ngModel)]="lookupId" />
              <button class="btn btn-primary" [disabled]="!lookupId.trim() || loading()" (click)="find()">খুঁজুন</button>
            </div>
            @if (err()) { <div class="alert alert-err">{{ err() }}</div> }
            @if (doc(); as d) {
              <div style="margin-bottom:10px">
                <span [class]="'st st-' + status(d)">{{ bn(status(d)) }}</span>
                @if (status(d) !== 'CLEAN') { <span class="muted"> — শুধু CLEAN নথি খোলা ও ব্যবহার করা যায়</span> }
              </div>
              <dl class="kv">@for (e of rows(d); track e.k) { <dt>{{ e.label }}</dt><dd>{{ e.v }}</dd> }</dl>
              @if (status(d) === 'CLEAN' && url(d); as u) {
                <p style="margin-top:12px"><a class="btn btn-primary" [href]="u" target="_blank" rel="noopener">নথি খুলুন</a></p>
              }
              <p class="muted" style="margin-top:12px">কে কখন নথি দেখেছে (E-03) তার API এখনো নেই।</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DocumentListComponent {
  private api = inject(EngineApiService);
  lookupId = '';
  doc = signal<Row | null>(null);
  recent = signal<Row[]>([]);
  loading = signal(false); err = signal('');
  bn = (s: string) => STATUS_BN[s] ?? s;
  status = (d: Row): string => d['scanStatus'] ?? d['status'] ?? '';
  name = (d: Row) => pick(d, 'fileName', 'originalName', 'name') ?? String(d['id']).slice(0, 8);
  url = (d: Row) => pick(d, 'url', 'downloadUrl', 'fileUrl');
  rows = (d: Row) => entries(d);

  onReady(d: Row) { this.recent.update(l => [d, ...l.filter(x => x['id'] !== d['id'])]); this.show(d); }
  show(d: Row) { this.doc.set(d); this.lookupId = String(d['id']); this.err.set(''); }
  find() {
    this.loading.set(true); this.err.set(''); this.doc.set(null);
    this.api.getDocument(this.lookupId.trim()).subscribe({
      next: (d) => { this.doc.set(d); this.loading.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
