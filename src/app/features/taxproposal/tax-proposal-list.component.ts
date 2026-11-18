import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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

  // UUID দিয়ে খোঁজার জন্য আলাদা ইনপুট
  searchId = signal('');

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
      (p.proposalNo || '').toString().toLowerCase().includes(q) ||
      (p.titleBn || '').toLowerCase().includes(q) ||
      (p.titleEn || '').toLowerCase().includes(q)
    );
  });

  constructor(
    private service: TaxproposalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.list().subscribe({
      next: (res: any) => {
        // ব্যাকএন্ড থেকে array আসলে array, না হলে res.data
        let arr = Array.isArray(res) ? res : (res?.data || []);

        // *** এই ফিল্টারটাই আসল ঠিক ***
        // /create থেকে আসা ভুল ডাটা বাদ দাও
        // আসল প্রস্তাবের id অবশ্যই UUID হবে, proposalNo থাকবে
        arr = arr.filter((p: any) => {
          if (!p) return false;
          // 'create' নামে কোনো প্রস্তাব নাই - এইটা বাদ
          if (p.proposalNo === 'create') return false;
          if (p.id === 'create') return false;
          // UUID না হলে বাদ - create... এইটা UUID না
          if (!p.id || p.id.length < 30) return false;
          return true;
        });

        // নতুনটা উপরে দেখাও
        arr.sort((a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        this.proposals.set(arr);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'লিস্ট আনতে সমস্যা হয়েছে');
      }
    });
  }

  // সার্চ বক্সে টাইপ করলে
  onSearch(event: any) {
    this.search.set(event.target.value || '');
  }

  // UUID দিয়ে খুঁজুন বাটন
  openById() {
    const id = this.searchId().trim();
    if (!id) return;
    this.router.navigate(['/tax-proposals', id]);
  }

  onSearchId(event: any) {
    this.searchId.set(event.target.value || '');
  }

  // ডিটেইলসে যাও
  openProposal(p: any) {
    if (!p?.id) return;
    this.router.navigate(['/tax-proposals', p.id]);
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