// N-01 : নোটিশ — বার্তা, ক্যাম্পেইন ও ছাপার কাজের প্রবেশপথ
// ⚠ তালিকার API নেই, তাই সম্প্রতি তৈরি আইটেম এই ব্রাউজারে মনে রাখা হয়
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MUNI_STYLES, RK, Recent, UUID_RE } from './municipal-shared';

@Component({
  selector: 'app-notice-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [MUNI_STYLES],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>নোটিশ ও যোগাযোগ</h1></div>

      <div class="cards3">
        <a class="home-card" routerLink="/notices/messages/new"><h3>১. বার্তা তৈরি</h3><div class="muted">SMS, ইমেইল বা ছাপানো নোটিশের লেখা তৈরি করুন</div></a>
        <a class="home-card" routerLink="/notices/campaigns/new"><h3>২. ক্যাম্পেইন</h3><div class="muted">বার্তা বেছে কার্যপরিধি অনুযায়ী পাঠানোর ব্যবস্থা করুন</div></a>
        <a class="home-card" routerLink="/notices/print-jobs/new"><h3>৩. ছাপার কাজ</h3><div class="muted">নোটিশ বা বিল ছাপার জন্য print job তৈরি করুন</div></a>
      </div>

      <div class="grid2">
        <div class="card"><div class="card-header"><h3>সম্প্রতি তৈরি বার্তা</h3></div><div class="card-body">
          @for (m of messages; track m.id) { <div class="chip">{{ m.label }} <span class="muted">{{ m.id.slice(0, 8) }}…</span></div> }
          @empty { <div class="muted">কিছু নেই।</div> }
        </div></div>
        <div class="card"><div class="card-header"><h3>ক্যাম্পেইন</h3></div><div class="card-body">
          @for (c of campaigns; track c.id) { <a class="chip" [routerLink]="['/notices/campaigns', c.id]">{{ c.label }}</a> }
          @empty { <div class="muted">কিছু নেই।</div> }
          <div class="toolbar" style="margin:12px 0 0">
            <input class="form-control" style="flex:1" placeholder="ক্যাম্পেইন ID দিয়ে খুলুন" [(ngModel)]="lookup" (keyup.enter)="open()" />
            <button class="btn-ghost" (click)="open()">খুলুন</button>
          </div>
          @if (err()) { <div class="muted bad-text">{{ err() }}</div> }
        </div></div>
      </div>
    </div>
  `,
})
export class NoticeHomeComponent {
  private router = inject(Router);
  messages = Recent.list(RK.message);
  campaigns = Recent.list(RK.campaign);
  lookup = ''; err = signal('');
  open() {
    const id = this.lookup.trim();
    if (!UUID_RE.test(id)) { this.err.set('ID সঠিক নয়।'); return; }
    this.router.navigate(['/notices/campaigns', id]);
  }
}
