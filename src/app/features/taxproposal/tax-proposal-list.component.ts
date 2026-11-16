import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaxproposalService } from './tax-proposal.service';

@Component({
  selector: 'app-taxproposal-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tax-proposal-list.component.html',
  styleUrls: ['./tax-proposal-list.component.css']
})
export class TaxproposalListComponent implements OnInit {
  // লিস্টের ডাটা
  proposals = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  search = signal('');

  // স্ট্যাটাসের বাংলা
  statusBn: Record<string, string> = {
    DRAFT: 'খসড়া',
    PRE_PUBLISHED: 'প্রাক-প্রকাশিত',
    UNDER_OBJECTION_REVIEW: 'আপত্তি পর্যালোচনায়',
    FINALIZED: 'চূড়ান্ত',
    APPROVED: 'অনুমোদিত',
    REJECTED: 'বাতিল'
  };

  // সার্চ অনুযায়ী ফিল্টার
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.proposals();
    if (!q) return list;
    return list.filter((p: any) =>
      (p.proposalNo || '').toLowerCase().includes(q) ||
      (p.titleBn || '').toLowerCase().includes(q) ||
      (p.titleEn || '').toLowerCase().includes(q)
    );
  });

  constructor(private service: TaxproposalService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.list().subscribe({
      next: (res: any) => {
        // ব্যাকএন্ড থেকে array আসলে array, না হলে res.data
        const arr = Array.isArray(res) ? res : (res?.data || []);
        this.proposals.set(arr);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'লিস্ট আনতে সমস্যা হয়েছে');
      }
    });
  }

  // প্রাক-প্রকাশ বাটন কখন চালু থাকবে
  canPrePublish(p: any): boolean {
    return p?.status === 'DRAFT';
  }

  // চূড়ান্ত বাটন কখন চালু থাকবে
  canFinalize(p: any): boolean {
    return p?.status === 'PRE_PUBLISHED' || p?.status === 'UNDER_OBJECTION_REVIEW';
  }

  prePublish(p: any) {
    if (!this.canPrePublish(p)) return;
    if (!confirm(`প্রস্তাব ${p.proposalNo} প্রাক-প্রকাশ করবেন?`)) return;
    this.service.prePublish(p.id, {}).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'প্রাক-প্রকাশ হয়নি')
    });
  }

  finalize(p: any) {
    if (!this.canFinalize(p)) return;
    if (!confirm(`প্রস্তাব ${p.proposalNo} চূড়ান্ত করবেন?`)) return;
    this.service.finalize(p.id).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'চূড়ান্ত হয়নি')
    });
  }
}